import { describe, expect, it } from "vitest";
import { activationPath, authPathWithNext, safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("garde un chemin des espaces connectes, requete comprise", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/dashboard/prestations/activer/standard?minutes=300")).toBe(
      "/dashboard/prestations/activer/standard?minutes=300"
    );
    expect(safeNextPath("/admin/users")).toBe("/admin/users");
  });

  it("refuse toute autre origine", () => {
    expect(safeNextPath("https://evil.fr/dashboard")).toBeNull();
    expect(safeNextPath("//evil.fr/dashboard")).toBeNull();
    expect(safeNextPath("/\\evil.fr/dashboard")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
  });

  it("refuse les pages hors des espaces connectes", () => {
    expect(safeNextPath("/")).toBeNull();
    expect(safeNextPath("/login")).toBeNull();
    expect(safeNextPath("/dashboardx")).toBeNull();
    expect(safeNextPath("/dashboard/../login")).toBeNull();
  });

  it("refuse ce qui n'est pas une chaine", () => {
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(["/dashboard"])).toBeNull();
  });
});

describe("authPathWithNext", () => {
  it("encode la destination, ou l'omet si elle est refusee", () => {
    expect(authPathWithNext("/signup", "/dashboard/prestations/activer/a?minutes=300")).toBe(
      "/signup?next=%2Fdashboard%2Fprestations%2Factiver%2Fa%3Fminutes%3D300"
    );
    expect(authPathWithNext("/login", "https://evil.fr")).toBe("/login");
    expect(authPathWithNext("/login", null)).toBe("/login");
  });
});

describe("activationPath", () => {
  it("n'ajoute le volume que s'il est choisi", () => {
    expect(activationPath("standard")).toBe("/dashboard/prestations/activer/standard");
    expect(activationPath("standard", 300)).toBe(
      "/dashboard/prestations/activer/standard?minutes=300"
    );
  });
});
