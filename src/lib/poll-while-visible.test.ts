import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pollWhileVisible } from "./poll-while-visible";

const fakeDocument = Object.assign(new EventTarget(), { hidden: false });

function setHidden(hidden: boolean) {
  fakeDocument.hidden = hidden;
  fakeDocument.dispatchEvent(new Event("visibilitychange"));
}

describe("pollWhileVisible", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("document", fakeDocument);
    fakeDocument.hidden = false;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("interroge à intervalle régulier tant que la page est visible", () => {
    const tick = vi.fn();
    const stop = pollWhileVisible(tick, 1000);
    vi.advanceTimersByTime(3000);
    expect(tick).toHaveBeenCalledTimes(3);
    stop();
  });

  it("s'arrête quand l'onglet est masqué et reprend aussitôt au retour", () => {
    const tick = vi.fn();
    const stop = pollWhileVisible(tick, 1000);
    setHidden(true);
    vi.advanceTimersByTime(5000);
    expect(tick).not.toHaveBeenCalled();
    setHidden(false);
    expect(tick).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(tick).toHaveBeenCalledTimes(2);
    stop();
  });

  it("ne rappelle plus rien une fois arrêté", () => {
    const tick = vi.fn();
    const stop = pollWhileVisible(tick, 1000);
    stop();
    vi.advanceTimersByTime(5000);
    setHidden(true);
    setHidden(false);
    expect(tick).not.toHaveBeenCalled();
  });
});
