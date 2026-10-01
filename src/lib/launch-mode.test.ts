import { describe, expect, it } from "vitest";
import { isOpenDuringWaitlist } from "./launch-mode";

describe("isOpenDuringWaitlist", () => {
  it("laisse voir l'accueil, les pages légales et l'accès de l'équipe", () => {
    for (const path of ["/", "/privacy", "/terms", "/legal-notice", "/cookies", "/login", "/admin", "/admin/users"]) {
      expect(isOpenDuringWaitlist(path), path).toBe(true);
    }
  });

  it("ferme l'inscription, le tableau de bord et les autres pages", () => {
    for (const path of ["/signup", "/dashboard", "/dashboard/services", "/services/standard-telephonique-ia", "/contact", "/administration"]) {
      expect(isOpenDuringWaitlist(path), path).toBe(false);
    }
  });

  it("laisse voir les pages par métier, pour le référencement", () => {
    expect(isOpenDuringWaitlist("/industries/tradespeople")).toBe(true);
    expect(isOpenDuringWaitlist("/industries")).toBe(false);
  });

  it("ignore la barre oblique finale", () => {
    expect(isOpenDuringWaitlist("/privacy/")).toBe(true);
  });
});
