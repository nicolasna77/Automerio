import { describe, expect, it } from "vitest";
import { initialsOf } from "./initials";

describe("initialsOf", () => {
  it("garde deux initiales au plus, en majuscules", () => {
    expect(initialsOf("marc lefèvre")).toBe("ML");
    expect(initialsOf("Jean Pierre Martin")).toBe("JP");
  });

  it("ignore les espaces en trop", () => {
    expect(initialsOf("  Élise   Moreau ")).toBe("ÉM");
  });

  it("rend « ? » pour un nom vide", () => {
    expect(initialsOf("   ")).toBe("?");
  });
});
