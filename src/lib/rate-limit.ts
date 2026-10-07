import { headers } from "next/headers";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

type Window = `${number} ${"s" | "m" | "h"}`;

const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000 } as const;

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

let redisClient: Redis | null = null;
function getRedis(): Redis {
  if (!redisClient) redisClient = Redis.fromEnv();
  return redisClient;
}

let warnedMemoryFallback = false;

// En production, la mémoire du serveur est propre à chaque instance : la limite
// réelle est multipliée par le nombre d'instances. Prévenu une seule fois.
export function warnIfMemoryFallbackInProduction(): void {
  if (warnedMemoryFallback || process.env.NODE_ENV !== "production") return;
  warnedMemoryFallback = true;
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN absents en production : limites tenues en mémoire, par instance."
  );
}

function firstEntry(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

// Sur Vercel, x-real-ip et x-vercel-forwarded-for sont posés par la plateforme ;
// la première entrée de x-forwarded-for peut venir du client lui-même.
export function clientIpFrom(headersList: Pick<Headers, "get">): string {
  return (
    firstEntry(headersList.get("x-real-ip")) ??
    firstEntry(headersList.get("x-vercel-forwarded-for")) ??
    firstEntry(headersList.get("x-forwarded-for")) ??
    "unknown"
  );
}

export async function getClientIp(): Promise<string> {
  return clientIpFrom(await headers());
}

function windowToMs(window: Window): number {
  const [amount, unit] = window.split(" ") as [string, keyof typeof UNIT_MS];
  return Number(amount) * UNIT_MS[unit];
}

export const MAX_MEMORY_KEYS = 10_000;

// Chaque clé garde sa propre fenêtre : une entrée n'expire qu'une fois son
// dernier passage sorti de SA fenêtre (24 h pour un plafond quotidien), pas
// au bout d'une durée fixe commune à toutes les limites.
type MemoryEntry = { hits: number[]; windowMs: number };
const memoryHits = new Map<string, MemoryEntry>();

function expiresAt(entry: MemoryEntry): number {
  return (entry.hits[entry.hits.length - 1] ?? 0) + entry.windowMs;
}

function pruneMemory(now: number) {
  if (memoryHits.size < MAX_MEMORY_KEYS) return;
  for (const [key, entry] of memoryHits) {
    if (expiresAt(entry) <= now) memoryHits.delete(key);
  }
  if (memoryHits.size < MAX_MEMORY_KEYS) return;
  // Plafond dur : on évince d'abord les entrées qui expirent le plus tôt, et
  // on descend à 90 % pour ne pas retrier la table à chaque appel.
  const target = Math.floor(MAX_MEMORY_KEYS * 0.9);
  const byExpiry = [...memoryHits].sort(([, a], [, b]) => expiresAt(a) - expiresAt(b));
  for (const [key] of byExpiry.slice(0, memoryHits.size - target)) memoryHits.delete(key);
}

export function memoryRateLimit(key: string, windowMs: number, max: number, now = Date.now()): boolean {
  pruneMemory(now);
  const hits = (memoryHits.get(key)?.hits ?? []).filter((t) => now - t < windowMs);
  const allowed = hits.length < max;
  if (allowed) hits.push(now);
  if (hits.length > 0) memoryHits.set(key, { hits, windowMs });
  else memoryHits.delete(key);
  return allowed;
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(id: string, window: Window, max: number): Ratelimit {
  const cacheKey = `${id}:${window}:${max}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(max, window),
      prefix: `ratelimit:${id}`,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

export async function checkRateLimit(
  id: string,
  key: string,
  window: Window,
  max: number
): Promise<boolean> {
  const memoryKey = `${id}:${key}`;
  if (!isRedisConfigured()) {
    warnIfMemoryFallbackInProduction();
    return memoryRateLimit(memoryKey, windowToMs(window), max);
  }

  try {
    const { success } = await getLimiter(id, window, max).limit(key);
    return success;
  } catch (err) {
    console.error(`[rate-limit] Redis indisponible pour "${id}", repli sur la mémoire du serveur :`, err);
    return memoryRateLimit(memoryKey, windowToMs(window), max);
  }
}

type StoredRateLimit = { key: string; count: number; lastRequest: number };

const memoryRecords = new Map<string, { value: StoredRateLimit; expiresAt: number }>();
const memoryCounters = new Map<string, { count: number; expiresAt: number }>();

const memoryStorage = {
  async get(key: string) {
    const record = memoryRecords.get(key);
    if (!record || record.expiresAt < Date.now()) return null;
    return record.value;
  },
  async set(key: string, value: StoredRateLimit) {
    memoryRecords.set(key, { value, expiresAt: Date.now() + UNIT_MS.h });
  },
  async consume(key: string, rule: { window: number; max: number }) {
    const now = Date.now();
    let counter = memoryCounters.get(key);
    if (!counter || counter.expiresAt < now) {
      counter = { count: 0, expiresAt: now + rule.window * 1000 };
      memoryCounters.set(key, counter);
    }
    counter.count += 1;
    if (counter.count <= rule.max) return { allowed: true, retryAfter: null };
    return { allowed: false, retryAfter: Math.ceil((counter.expiresAt - now) / 1000) };
  },
};

export const redisRateLimitStorage = {
  async get(key: string) {
    if (!isRedisConfigured()) return memoryStorage.get(key);
    try {
      const value = await getRedis().get<StoredRateLimit>(key);
      return value ?? null;
    } catch (err) {
      console.error("[rate-limit] Redis get indisponible, repli sur la mémoire :", err);
      return memoryStorage.get(key);
    }
  },
  async set(key: string, value: StoredRateLimit) {
    if (!isRedisConfigured()) return memoryStorage.set(key, value);
    try {
      await getRedis().set(key, value, { ex: 3600 });
    } catch (err) {
      console.error("[rate-limit] Redis set indisponible, repli sur la mémoire :", err);
      await memoryStorage.set(key, value);
    }
  },
  async consume(key: string, rule: { window: number; max: number }) {
    if (!isRedisConfigured()) {
      warnIfMemoryFallbackInProduction();
      return memoryStorage.consume(key, rule);
    }
    try {
      const count = await getRedis().incr(key);
      if (count === 1) await getRedis().expire(key, rule.window);
      if (count <= rule.max) return { allowed: true, retryAfter: null };
      const ttl = await getRedis().ttl(key);
      return { allowed: false, retryAfter: ttl > 0 ? ttl : rule.window };
    } catch (err) {
      console.error("[rate-limit] Redis indisponible pour l'authentification, repli sur la mémoire :", err);
      return memoryStorage.consume(key, rule);
    }
  },
};
