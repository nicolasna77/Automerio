import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FEATURES,
  REQUIRED,
  checkEnvAtBoot,
  inspectEnv,
  isGoogleSignInConfigured,
} from "./env";

function validEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    DATABASE_URL: "postgresql://automerio:secret@localhost:5432/automerio",
    BETTER_AUTH_SECRET: "x".repeat(32),
    NEXT_PUBLIC_APP_URL: "https://automerio.fr",
    STRIPE_SECRET_KEY: "sk_test_abc",
    STRIPE_WEBHOOK_SECRET: "whsec_abc",
    ...overrides,
  };
}

describe("variables requises", () => {
  it("ne signale rien quand tout est en place", () => {
    expect(inspectEnv(validEnv()).problems).toEqual([]);
  });

  it("signale une variable absente", () => {
    const { problems } = inspectEnv(validEnv({ DATABASE_URL: undefined }));
    expect(problems).toEqual(["DATABASE_URL est manquante"]);
  });

  it("traite une valeur vide comme absente", () => {
    expect(inspectEnv(validEnv({ DATABASE_URL: "   " })).problems).toEqual([
      "DATABASE_URL est manquante",
    ]);
  });

  it("refuse une URL de base de données qui n'est pas PostgreSQL", () => {
    const { problems } = inspectEnv(validEnv({ DATABASE_URL: "mysql://localhost/db" }));
    expect(problems[0]).toContain("DATABASE_URL");
    expect(problems[0]).toContain("PostgreSQL");
  });

  it("refuse un secret d'authentification trop court", () => {
    const { problems } = inspectEnv(validEnv({ BETTER_AUTH_SECRET: "trop-court" }));
    expect(problems[0]).toContain("BETTER_AUTH_SECRET");
    expect(problems[0]).toContain("10 caractères");
  });

  it("refuse une URL d'application terminée par un slash", () => {
    const { problems } = inspectEnv(validEnv({ NEXT_PUBLIC_APP_URL: "https://automerio.fr/" }));
    expect(problems).toEqual(["NEXT_PUBLIC_APP_URL ne doit pas se terminer par un slash"]);
  });

  it("refuse une URL d'application sans protocole", () => {
    const { problems } = inspectEnv(validEnv({ NEXT_PUBLIC_APP_URL: "automerio.fr" }));
    expect(problems[0]).toContain("http://");
  });

  it("refuse une clé Stripe qui n'en est pas une", () => {
    const { problems } = inspectEnv(validEnv({ STRIPE_SECRET_KEY: "pk_test_abc" }));
    expect(problems).toEqual([
      "STRIPE_SECRET_KEY doit commencer par rk_ (clé restreinte, recommandée) ou sk_",
    ]);
  });

  it("accepte une clé Stripe restreinte", () => {
    expect(inspectEnv(validEnv({ STRIPE_SECRET_KEY: "rk_test_abc" })).problems).toEqual([]);
  });

  it("rapporte tous les problèmes d'un coup, pas seulement le premier", () => {
    const { problems } = inspectEnv({});
    expect(problems).toHaveLength(5);
  });
});

describe("groupes par fonctionnalité", () => {
  const messagerie = "Messagerie Instagram";
  const instagram = {
    INSTAGRAM_APP_ID: "id",
    INSTAGRAM_APP_SECRET: "secret",
    INSTAGRAM_OAUTH_REDIRECT_URI: "https://automerio.fr/api/instagram/callback",
    INSTAGRAM_OAUTH_STATE_SECRET: "state",
  };

  it("considère active une intégration entièrement configurée", () => {
    const report = inspectEnv(validEnv(instagram));
    expect(report.enabled).toContain(messagerie);
    expect(report.disabled).not.toContain(messagerie);
  });

  it("considère simplement non branchée une intégration entièrement vide", () => {
    const report = inspectEnv(validEnv());
    expect(report.disabled).toContain(messagerie);
    expect(report.incomplete).toEqual([]);
  });

  it("distingue une configuration commencée puis laissée en plan", () => {
    const report = inspectEnv(
      validEnv({ ...instagram, INSTAGRAM_APP_SECRET: undefined })
    );
    expect(report.enabled).not.toContain(messagerie);
    expect(report.disabled).not.toContain(messagerie);
    expect(report.incomplete).toEqual([
      { feature: messagerie, missing: ["INSTAGRAM_APP_SECRET"] },
    ]);
  });

  it("n'interrompt jamais le démarrage sur une intégration absente", () => {
    expect(() => checkEnvAtBoot(validEnv())).not.toThrow();
  });
});

describe("production", () => {
  const production = (overrides: Record<string, string | undefined> = {}) =>
    validEnv({ VERCEL_ENV: "production", RESEND_API_KEY: "re_abc", ...overrides });

  it("exige Resend, sans quoi personne ne peut vérifier son e-mail", () => {
    const { problems } = inspectEnv(production({ RESEND_API_KEY: undefined }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("RESEND_API_KEY");
  });

  it("n'exige pas Resend hors production", () => {
    expect(inspectEnv(validEnv({ VERCEL_ENV: "preview" })).problems).toEqual([]);
  });

  it("recommande une clé Stripe restreinte", () => {
    expect(inspectEnv(production()).warnings.join(" ")).toContain("rk_");
    expect(
      inspectEnv(production({ STRIPE_SECRET_KEY: "rk_live_abc" })).warnings.join(" ")
    ).not.toContain("rk_");
  });

  it("signale une URL d'application qui n'est pas le domaine de production", () => {
    expect(
      inspectEnv(production({ VERCEL_PROJECT_PRODUCTION_URL: "automerio-equipe.vercel.app" })).warnings.join(" ")
    ).toContain("NEXT_PUBLIC_APP_URL");
    expect(
      inspectEnv(production({ VERCEL_PROJECT_PRODUCTION_URL: "automerio.fr" })).warnings.join(" ")
    ).not.toContain("NEXT_PUBLIC_APP_URL");
  });

  it("signale une limitation de débit limitée à une instance sans Upstash", () => {
    expect(inspectEnv(production()).warnings.join(" ")).toContain("Upstash");
  });
});

describe("connexion Google", () => {
  it("est configurée quand les deux identifiants sont là", () => {
    expect(
      isGoogleSignInConfigured({
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
      })
    ).toBe(true);
  });

  it("ne l'est pas s'il manque le secret", () => {
    expect(isGoogleSignInConfigured({ GOOGLE_CLIENT_ID: "id" })).toBe(false);
  });

  it("ne l'est pas quand une valeur est vide", () => {
    expect(
      isGoogleSignInConfigured({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "  " })
    ).toBe(false);
  });

  it("ne l'est pas sur un environnement nu", () => {
    expect(isGoogleSignInConfigured({})).toBe(false);
  });
});

describe(".env.example", () => {
  const example = readFileSync(new URL("../../.env.example", import.meta.url), "utf-8");
  const declared = [...REQUIRED.map((r) => r.name), ...FEATURES.flatMap((f) => f.vars)];

  it.each(declared)("déclare %s", (name) => {
    expect(example).toMatch(new RegExp(`^${name}=`, "m"));
  });
});

describe("checkEnvAtBoot", () => {
  it("interrompt le démarrage en nommant chaque variable fautive", () => {
    expect(() => checkEnvAtBoot({ DATABASE_URL: "postgresql://localhost/db" })).toThrow(
      /BETTER_AUTH_SECRET[\s\S]*NEXT_PUBLIC_APP_URL[\s\S]*STRIPE_SECRET_KEY/
    );
  });

  it("indique où corriger", () => {
    expect(() => checkEnvAtBoot({})).toThrow(/\.env|Vercel/);
  });
});
