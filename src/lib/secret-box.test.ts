import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSecret, sealSecret } from "./secret-box";

describe("secret-box", () => {
  const previous = process.env.BETTER_AUTH_SECRET;
  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = "secret-de-test";
  });
  afterEach(() => {
    process.env.BETTER_AUTH_SECRET = previous;
  });

  it("rend le secret d'origine, sans le laisser lisible", () => {
    const sealed = sealSecret("cal_live_abc123");
    expect(sealed).not.toContain("cal_live_abc123");
    expect(openSecret(sealed)).toBe("cal_live_abc123");
  });

  it("chiffre différemment deux fois le même secret", () => {
    expect(sealSecret("x")).not.toBe(sealSecret("x"));
  });

  it("refuse un contenu modifié", () => {
    const sealed = sealSecret("jeton");
    const [version, iv, tag, data] = sealed.split(":");
    const tampered = [version, iv, tag, Buffer.from("autre").toString("base64url") + data].join(":");
    expect(() => openSecret(tampered)).toThrow();
  });

  it("devient illisible si le secret de l'application change", () => {
    const sealed = sealSecret("jeton");
    process.env.BETTER_AUTH_SECRET = "autre-secret";
    expect(() => openSecret(sealed)).toThrow();
  });

  it("refuse un format inconnu", () => {
    expect(() => openSecret("en-clair")).toThrow("Secret chiffré illisible");
  });
});
