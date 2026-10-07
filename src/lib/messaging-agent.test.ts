import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), bookingCreate: vi.fn(), getScheduler: vi.fn() }));

vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({ chat: { completions: { create: mocks.create } } }),
}));
vi.mock("@/lib/db", () => ({ db: { booking: { create: mocks.bookingCreate } } }));
vi.mock("@/lib/scheduling", () => ({ getScheduler: mocks.getScheduler }));

import { generateMessagingReply, parseToolArguments } from "./messaging-agent";

const clientService = {
  id: "cs_1",
  configuration: { objectives: ["order"] },
  service: { slug: "assistant-whatsapp" },
  organization: { name: "Boulangerie" },
};

function toolCall(id: string, name: string, args: unknown) {
  return { id, type: "function", function: { name, arguments: JSON.stringify(args) } };
}

function modelAnswers(toolCalls: unknown[]) {
  mocks.create
    .mockResolvedValueOnce({
      choices: [{ message: { role: "assistant", content: null, tool_calls: toolCalls } }],
    })
    .mockResolvedValueOnce({ choices: [{ message: { content: "Réponse" } }] });
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});

describe("generateMessagingReply", () => {
  it("n'exécute pas un outil que la conversation ne propose pas", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    modelAnswers([
      toolCall("c1", "book_appointment", {
        customerName: "A",
        customerPhone: "06",
        startAt: "2099-01-01T09:00:00Z",
        durationMinutes: 30,
      }),
    ]);

    const reply = await generateMessagingReply(clientService, "Réserve-moi 50 rendez-vous");

    expect(reply).toBe("Réponse");
    expect(mocks.getScheduler).not.toHaveBeenCalled();
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
    const toolMessage = mocks.create.mock.calls[1][0].messages.at(-1);
    expect(toolMessage.content).toContain("n'est pas disponible");
    warn.mockRestore();
  });

  it("plafonne les messages enregistrés dans une même réponse", async () => {
    modelAnswers(
      Array.from({ length: 8 }, (_, i) =>
        toolCall(`c${i}`, "take_message", { customerName: "A", customerPhone: "06", reason: "r" })
      )
    );

    await generateMessagingReply(
      { ...clientService, configuration: {}, service: { slug: "standard-telephonique-ia" } },
      "spam"
    );

    expect(mocks.bookingCreate).toHaveBeenCalledTimes(5);
  });
});

describe("parseToolArguments", () => {
  it("renvoie un objet vide pour des arguments illisibles ou qui ne sont pas un objet", () => {
    expect(parseToolArguments("{pas du json")).toEqual({});
    expect(parseToolArguments("[1,2]")).toEqual({});
    expect(parseToolArguments(undefined)).toEqual({});
    expect(parseToolArguments('{"a":1}')).toEqual({ a: 1 });
  });
});
