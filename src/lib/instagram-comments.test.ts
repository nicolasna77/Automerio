import { afterEach, describe, expect, it, vi } from "vitest";
import { commentRepliesEnabled, parseInstagramComments, repliesToComments } from "./instagram-comments";

afterEach(() => {
  vi.unstubAllEnvs();
});

const change = (value: Record<string, unknown>) => ({ field: "comments", value });

describe("parseInstagramComments", () => {
  it("garde les commentaires de premier niveau écrits par un tiers", () => {
    const payload = {
      entry: [
        {
          id: "ig_1",
          changes: [
            change({ id: "c1", text: " Quel prix ? ", from: { id: "user_9" } }),
            change({ id: "c2", text: "Merci", parent_id: "c1", from: { id: "user_9" } }),
            change({ id: "c3", text: "Réponse du compte", from: { id: "ig_1" } }),
            change({ id: "c4", text: "", from: { id: "user_8" } }),
            { field: "mentions", value: { id: "m1", text: "x", from: { id: "user_7" } } },
          ],
        },
      ],
    };
    expect(parseInstagramComments(payload)).toEqual([
      { accountId: "ig_1", contactId: "user_9", text: "Quel prix ?", externalId: "c1" },
    ]);
  });

  it("survit à un envoi vide ou incomplet", () => {
    expect(parseInstagramComments({})).toEqual([]);
    expect(parseInstagramComments({ entry: [{ changes: [change({ id: "c1", text: "x", from: { id: "u" } })] }] })).toEqual([]);
  });
});

describe("activation", () => {
  it("est fermée tant que la variable n'est pas à « on »", () => {
    vi.stubEnv("INSTAGRAM_COMMENT_REPLIES", "");
    expect(commentRepliesEnabled()).toBe(false);
    vi.stubEnv("INSTAGRAM_COMMENT_REPLIES", "on");
    expect(commentRepliesEnabled()).toBe(true);
  });

  it("se règle par solution, désactivée par défaut", () => {
    expect(repliesToComments({})).toBe(false);
    expect(repliesToComments({ commentReplies: "on" })).toBe(true);
  });
});
