import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog-data";
import { SERVICE_COPY, getServiceCopy } from "./service-copy";

const CATALOG_SLUGS = new Set(CATALOG.map((service) => service.slug));

describe("SERVICE_COPY", () => {
  it("couvre chaque solution du catalogue", () => {
    const sansTexte = CATALOG.filter((service) => !getServiceCopy(service.slug)).map(
      (service) => service.slug
    );
    expect(sansTexte).toEqual([]);
  });

  it("ne décrit aucune solution absente du catalogue", () => {
    const orphelines = Object.keys(SERVICE_COPY).filter(
      (slug) => !CATALOG_SLUGS.has(slug)
    );
    expect(orphelines).toEqual([]);
  });

  it("donne trois avantages à chaque solution", () => {
    for (const [slug, copy] of Object.entries(SERVICE_COPY)) {
      expect(copy.benefits, slug).toHaveLength(3);
      for (const benefit of copy.benefits) {
        expect(benefit.title.trim(), slug).not.toBe("");
        expect(benefit.description.trim(), slug).not.toBe("");
      }
    }
  });

  it("illustre par trois situations quand elle en donne", () => {
    for (const [slug, copy] of Object.entries(SERVICE_COPY)) {
      if (!copy.useCases) continue;
      expect(copy.useCases, slug).toHaveLength(3);
      for (const useCase of copy.useCases) {
        expect(useCase.audience.trim(), slug).not.toBe("");
        expect(useCase.scenario.trim(), slug).not.toBe("");
      }
    }
  });

  it("répond à trois questions par solution", () => {
    for (const [slug, copy] of Object.entries(SERVICE_COPY)) {
      expect(copy.faq, slug).toHaveLength(3);
      for (const faq of copy.faq) {
        expect(faq.question.trim(), slug).toMatch(/\?$/);
        expect(faq.answer.trim(), slug).not.toBe("");
      }
    }
  });

  it("ne pose pas deux fois la même question sur une solution", () => {
    for (const [slug, copy] of Object.entries(SERVICE_COPY)) {
      const questions = copy.faq.map((faq) => faq.question);
      expect(new Set(questions).size, slug).toBe(questions.length);
    }
  });

  it("ne laisse aucune introduction vide", () => {
    for (const [slug, copy] of Object.entries(SERVICE_COPY)) {
      expect(copy.intro.trim(), slug).not.toBe("");
    }
  });

  it("renvoie null pour une solution inconnue", () => {
    expect(getServiceCopy("cette-solution-nexiste-pas")).toBeNull();
  });
});
