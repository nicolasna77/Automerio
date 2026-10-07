import { describe, expect, it } from "vitest";
import { envWithDevFallback, isProductionRuntime } from "./env";

describe("isProductionRuntime", () => {
  it("vaut vrai pour un serveur de production en service", () => {
    expect(isProductionRuntime({ NODE_ENV: "production" })).toBe(true);
  });

  it("vaut faux pendant next build, en développement et en test", () => {
    expect(isProductionRuntime({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" })).toBe(false);
    expect(isProductionRuntime({ NODE_ENV: "development" })).toBe(false);
    expect(isProductionRuntime({ NODE_ENV: "test" })).toBe(false);
  });
});

describe("envWithDevFallback", () => {
  it("prend la première variable renseignée", () => {
    expect(envWithDevFallback(["A", "B"], "repli", { A: " ", B: "b", NODE_ENV: "production" })).toBe("b");
  });

  it("se replie sur la valeur de développement hors production", () => {
    expect(envWithDevFallback(["A"], "repli", { NODE_ENV: "development" })).toBe("repli");
    expect(
      envWithDevFallback(["A"], "repli", { NODE_ENV: "production", NEXT_PHASE: "phase-production-build" })
    ).toBe("repli");
  });

  it("échoue en production plutôt que d'utiliser une valeur factice", () => {
    expect(() => envWithDevFallback(["A", "B"], "repli", { NODE_ENV: "production" })).toThrow(
      /A ou B manquante en production/
    );
  });
});
