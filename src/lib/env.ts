import { toOrigin } from "@/lib/trusted-origins";

type Rule = {
  name: string;
  validate?: (value: string) => string | null;
};

export const REQUIRED: Rule[] = [
  {
    name: "DATABASE_URL",
    validate: (v) =>
      /^postgres(ql)?:\/\//.test(v)
        ? null
        : "doit être une URL PostgreSQL (postgres:// ou postgresql://)",
  },
  {
    name: "BETTER_AUTH_SECRET",
    validate: (v) =>
      v.length < 32
        ? `fait ${v.length} caractères, il en faut au moins 32 — une clé courte affaiblit la signature des sessions`
        : null,
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    validate: (v) => {
      if (!/^https?:\/\//.test(v)) return "doit commencer par http:// ou https://";
      if (v.endsWith("/")) return "ne doit pas se terminer par un slash";
      return null;
    },
  },
  {
    name: "STRIPE_SECRET_KEY",
    validate: (v) =>
      /^(rk|sk)_/.test(v)
        ? null
        : "doit commencer par rk_ (clé restreinte, recommandée) ou sk_",
  },
  { name: "STRIPE_WEBHOOK_SECRET" },
];

export const PRODUCTION_REQUIRED: { name: string; reason: string }[] = [
  {
    name: "RESEND_API_KEY",
    reason:
      "l'e-mail de vérification ne partirait pas, et plus personne ne pourrait s'inscrire",
  },
];

export type FeatureGroup = {
  feature: string;
  vars: string[];
};

export const FEATURES: FeatureGroup[] = [
  {
    feature: "Agent vocal IA (standard téléphonique)",
    vars: ["OPENAI_API_KEY", "OPENAI_SIP_URI", "OPENAI_WEBHOOK_SECRET"],
  },
  {
    feature: "Téléphonie Twilio (achat et routage des numéros)",
    vars: [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_API_KEY_SID",
      "TWILIO_API_KEY_SECRET",
    ],
  },
  {
    feature: "Appel d'essai depuis le site public",
    vars: ["DEMO_CALLER_NUMBER"],
  },
  {
    feature: "Bilan hebdomadaire (tâche planifiée Vercel)",
    vars: ["CRON_SECRET"],
  },
  {
    feature: "Agenda Google (prise de rendez-vous)",
    vars: [
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_OAUTH_REDIRECT_URI",
      "GOOGLE_OAUTH_STATE_SECRET",
    ],
  },
  {
    feature: "Messagerie Meta (WhatsApp et Messenger)",
    vars: [
      "WHATSAPP_APP_SECRET",
      "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
      "NEXT_PUBLIC_META_APP_ID",
      "NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID",
      "NEXT_PUBLIC_META_MESSENGER_CONFIG_ID",
    ],
  },
  {
    feature: "Messagerie Instagram",
    vars: [
      "INSTAGRAM_APP_ID",
      "INSTAGRAM_APP_SECRET",
      "INSTAGRAM_OAUTH_REDIRECT_URI",
      "INSTAGRAM_OAUTH_STATE_SECRET",
    ],
  },
  {
    feature: "E-mails transactionnels (Resend)",
    vars: ["RESEND_API_KEY"],
  },
  {
    feature: "Limitation de débit répartie (Upstash Redis)",
    vars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  },
  {
    feature: "Relevé d'usage des prestations",
    vars: ["USAGE_EVENTS_API_KEY"],
  },
];

export type EnvReport = {
  problems: string[];
  warnings: string[];
  enabled: string[];
  disabled: string[];
  incomplete: { feature: string; missing: string[] }[];
};

type Source = Record<string, string | undefined>;

function read(source: Source, name: string): string | null {
  const value = source[name];
  return value && value.trim() !== "" ? value : null;
}

export function isGoogleSignInConfigured(source: Source = process.env): boolean {
  return (
    read(source, "GOOGLE_CLIENT_ID") !== null &&
    read(source, "GOOGLE_CLIENT_SECRET") !== null
  );
}

export function isProduction(source: Source): boolean {
  return source.VERCEL_ENV === "production";
}

export function inspectEnv(source: Source): EnvReport {
  const problems: string[] = [];
  for (const rule of REQUIRED) {
    const value = read(source, rule.name);
    if (value === null) {
      problems.push(`${rule.name} est manquante`);
      continue;
    }
    const invalid = rule.validate?.(value);
    if (invalid) problems.push(`${rule.name} ${invalid}`);
  }

  const tokenKey = read(source, "TOKEN_ENCRYPTION_KEY");
  if (tokenKey !== null && Buffer.from(tokenKey.trim(), "base64").length !== 32) {
    problems.push(
      "TOKEN_ENCRYPTION_KEY doit faire 32 octets encodés en base64 : `openssl rand -base64 32`"
    );
  }

  const warnings: string[] = [];
  if (isProduction(source)) {
    for (const { name, reason } of PRODUCTION_REQUIRED) {
      if (read(source, name) === null) {
        problems.push(`${name} est manquante en production : ${reason}`);
      }
    }
    if (read(source, "STRIPE_SECRET_KEY")?.startsWith("sk_")) {
      warnings.push(
        "STRIPE_SECRET_KEY est une clé secrète complète : préférez une clé restreinte (rk_) limitée aux ressources utilisées."
      );
    }
    const productionHost = read(source, "VERCEL_PROJECT_PRODUCTION_URL");
    const appUrl = read(source, "NEXT_PUBLIC_APP_URL");
    if (productionHost && appUrl && toOrigin(appUrl) !== toOrigin(productionHost)) {
      warnings.push(
        `NEXT_PUBLIC_APP_URL (${appUrl}) ne correspond pas au domaine de production (${productionHost}) : les liens des e-mails et les retours de paiement pointent vers une autre adresse.`
      );
    }
    if (tokenKey === null) {
      warnings.push(
        "TOKEN_ENCRYPTION_KEY est manquante : toute lecture ou écriture d'un jeton d'intégration (WhatsApp, Messenger, Instagram, Google) échouera. Générez-la avec `openssl rand -base64 32`."
      );
    }
    if (read(source, "UPSTASH_REDIS_REST_URL") === null) {
      warnings.push(
        "Upstash Redis n'est pas configuré : la limitation de débit ne vaut que par instance de serveur."
      );
    }
  }

  const enabled: string[] = [];
  const disabled: string[] = [];
  const incomplete: { feature: string; missing: string[] }[] = [];

  for (const group of FEATURES) {
    const missing = group.vars.filter((name) => read(source, name) === null);
    if (missing.length === 0) enabled.push(group.feature);
    else if (missing.length === group.vars.length) disabled.push(group.feature);
    else incomplete.push({ feature: group.feature, missing });
  }

  return { problems, warnings, enabled, disabled, incomplete };
}

export function formatProblems(report: EnvReport): string {
  return [
    `Configuration incomplète : ${report.problems.length} variable(s) d'environnement requise(s) inutilisable(s).`,
    ...report.problems.map((p) => `  - ${p}`),
    "",
    "Renseignez-les dans .env en local, ou dans Settings > Environment Variables sur Vercel.",
  ].join("\n");
}

export function checkEnvAtBoot(source: Source = process.env): void {
  const report = inspectEnv(source);

  for (const { feature, missing } of report.incomplete) {
    console.warn(
      `[env] ${feature} : configuration incomplète, il manque ${missing.join(", ")}. ` +
        `L'intégration se croira active et échouera à l'usage.`
    );
  }

  for (const warning of report.warnings) console.warn(`[env] ${warning}`);

  if (report.disabled.length > 0) {
    console.info(`[env] Intégrations non configurées : ${report.disabled.join(" · ")}`);
  }

  if (report.problems.length > 0) {
    throw new Error(formatProblems(report));
  }
}

export function requireEnv(name: string, feature?: string): string {
  const value = read(process.env, name);
  if (value === null) {
    throw new Error(
      feature
        ? `${name} manquante — ${feature} ne peut pas fonctionner sans elle.`
        : `${name} manquante.`
    );
  }
  return value;
}

// Serveur de production en service : `next start` ou Vercel, mais pas
// `next build`, qui évalue les modules sans forcément disposer des secrets.
export function isProductionRuntime(source: Source = process.env): boolean {
  return source.NODE_ENV === "production" && source.NEXT_PHASE !== "phase-production-build";
}

// Première variable renseignée parmi `names` ; à défaut, `devFallback` en
// développement et en test, une erreur explicite en production plutôt qu'une
// valeur factice qui casserait les paiements ou les liens en silence.
export function envWithDevFallback(
  names: string[],
  devFallback: string,
  source: Source = process.env
): string {
  for (const name of names) {
    const value = read(source, name);
    if (value !== null) return value;
  }
  if (isProductionRuntime(source)) {
    throw new Error(
      `${names.join(" ou ")} manquante en production. Renseignez-la dans Settings > Environment Variables sur Vercel.`
    );
  }
  return devFallback;
}
