import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), createMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { callerQuestion: { findMany: mocks.findMany, createMany: mocks.createMany } } }));

import { questionKey, saveUnansweredQuestions } from "./caller-questions";

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.createMany.mockReset();
});

describe("questionKey", () => {
  it("ignore la casse, les accents, les espaces et la ponctuation finale", () => {
    expect(questionKey("  Intervenez-vous le DIMANCHE ? ")).toBe(questionKey("intervenez-vous le dimanche"));
    expect(questionKey("Quel délai ?")).toBe(questionKey("quel delai"));
  });
});

describe("saveUnansweredQuestions", () => {
  it("n'enregistre pas une question déjà connue ni un doublon du même appel", async () => {
    mocks.findMany.mockResolvedValue([{ question: "Quel est le prix ?" }]);
    const saved = await saveUnansweredQuestions({
      clientServiceId: "cs_1",
      usageEventId: "ue_1",
      questions: ["quel est le prix", "Faites-vous les devis ?", "faites-vous les devis"],
    });
    expect(saved).toBe(1);
    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [{ clientServiceId: "cs_1", usageEventId: "ue_1", question: "Faites-vous les devis ?" }],
    });
  });

  it("ne lit pas la base quand l'appel n'a laissé aucune question", async () => {
    expect(await saveUnansweredQuestions({ clientServiceId: "cs_1", usageEventId: "ue_1", questions: [] })).toBe(0);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
