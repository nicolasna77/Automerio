import { describe, expect, it } from "vitest";
import { splitFigure } from "./figure";

describe("splitFigure", () => {
  it("sépare un prix de son unité", () => {
    expect(splitFigure("25 € TTC")).toEqual(["25", "€ TTC"]);
    expect(splitFigure("20,83 € HT")).toEqual(["20,83", "€ HT"]);
  });

  it("garde les séparateurs de milliers dans le nombre", () => {
    expect(splitFigure("6 000 min")).toEqual(["6 000", "min"]);
  });

  it("accepte un nombre seul ou à un chiffre", () => {
    expect(splitFigure("6")).toEqual(["6", ""]);
    expect(splitFigure("150")).toEqual(["150", ""]);
  });

  it("renvoie null quand le texte ne commence pas par un nombre", () => {
    expect(splitFigure("Aucun")).toBeNull();
    expect(splitFigure("")).toBeNull();
  });
});
