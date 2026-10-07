import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("clientIpFrom", () => {
  it("préfère l'en-tête posé par la plateforme à x-forwarded-for", async () => {
    const { clientIpFrom } = await import("./rate-limit");
    const headers = new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "6.6.6.6, 1.1.1.1" });
    expect(clientIpFrom(headers)).toBe("1.1.1.1");
    expect(clientIpFrom(new Headers({ "x-vercel-forwarded-for": "2.2.2.2", "x-forwarded-for": "6.6.6.6" }))).toBe(
      "2.2.2.2"
    );
    expect(clientIpFrom(new Headers({ "x-forwarded-for": " 3.3.3.3 , 4.4.4.4" }))).toBe("3.3.3.3");
    expect(clientIpFrom(new Headers())).toBe("unknown");
  });
});

describe("repli en mémoire", () => {
  it("prévient une seule fois en production sans Upstash", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { checkRateLimit } = await import("./rate-limit");
    expect(await checkRateLimit("test", "k", "1 m", 1)).toBe(true);
    expect(await checkRateLimit("test", "k", "1 m", 1)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("une limite sur 24 h survit à l'élagage de la table pleine", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
      const { checkRateLimit, MAX_MEMORY_KEYS } = await import("./rate-limit");
      expect(await checkRateLimit("daily", "org", "24 h", 1)).toBe(true);

      // Deux heures plus tard, des milliers de clés courtes remplissent la table.
      vi.advanceTimersByTime(2 * 3_600_000);
      for (let i = 0; i < MAX_MEMORY_KEYS; i++) await checkRateLimit("short", `k${i}`, "1 m", 5);
      vi.advanceTimersByTime(2 * 60_000);
      await checkRateLimit("short", "trigger", "1 m", 5);

      expect(await checkRateLimit("daily", "org", "24 h", 1)).toBe(false);
      vi.advanceTimersByTime(22 * 3_600_000);
      expect(await checkRateLimit("daily", "org", "24 h", 1)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("au plafond dur, évince d'abord les entrées qui expirent le plus tôt", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
      const { checkRateLimit, MAX_MEMORY_KEYS } = await import("./rate-limit");
      expect(await checkRateLimit("daily", "org", "24 h", 1)).toBe(true);
      // Table pleine d'entrées encore actives, toutes plus courtes que 24 h.
      for (let i = 0; i < MAX_MEMORY_KEYS; i++) await checkRateLimit("hourly", `k${i}`, "1 h", 1);
      // La première clé horaire a été évincée (elle expirait le plus tôt)…
      expect(await checkRateLimit("hourly", "k0", "1 h", 1)).toBe(true);
      // … mais pas la limite quotidienne.
      expect(await checkRateLimit("daily", "org", "24 h", 1)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ne prévient pas en développement", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { checkRateLimit } = await import("./rate-limit");
    await checkRateLimit("test", "k", "1 m", 1);
    expect(warn).not.toHaveBeenCalled();
  });
});
