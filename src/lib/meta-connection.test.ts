import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { CLEARED_META_CONNECTION, isUniqueViolation } from "./meta-connection";

describe("CLEARED_META_CONNECTION", () => {
  it("efface tous les champs de connexion WhatsApp, Facebook et Instagram", () => {
    const metaFields = Object.values(Prisma.ClientServiceScalarFieldEnum).filter((field) =>
      /^(whatsapp|facebook|instagram)/.test(field)
    );
    expect(metaFields).toContain("whatsappPhoneNumberId");
    expect(metaFields).toContain("facebookPageId");
    expect(metaFields).toContain("instagramAccountId");
    expect(Object.keys(CLEARED_META_CONNECTION).sort()).toEqual([...metaFields].sort());
    expect(Object.values(CLEARED_META_CONNECTION).every((value) => value === null)).toBe(true);
  });
});

describe("isUniqueViolation", () => {
  it("ne reconnaît que l'erreur Prisma P2002", () => {
    const unique = new Prisma.PrismaClientKnownRequestError("doublon", {
      code: "P2002",
      clientVersion: "test",
    });
    const notFound = new Prisma.PrismaClientKnownRequestError("absent", {
      code: "P2025",
      clientVersion: "test",
    });
    expect(isUniqueViolation(unique)).toBe(true);
    expect(isUniqueViolation(notFound)).toBe(false);
    expect(isUniqueViolation(new Error("P2002"))).toBe(false);
  });
});
