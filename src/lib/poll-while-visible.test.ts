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

  it("espace les appels après un échec puis revient à la normale", async () => {
    const results = [false, false, true];
    const tick = vi.fn(async () => results.shift() ?? true);
    const onStalledChange = vi.fn();
    const stop = pollWhileVisible(tick, 1000, onStalledChange);

    await vi.advanceTimersByTimeAsync(1000); // 1er échec
    expect(tick).toHaveBeenCalledTimes(1);
    expect(onStalledChange).toHaveBeenLastCalledWith(true);

    await vi.advanceTimersByTimeAsync(1999);
    expect(tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); // 2e échec, après 2 s
    expect(tick).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(4000); // succès, après 4 s
    expect(tick).toHaveBeenCalledTimes(3);
    expect(onStalledChange).toHaveBeenLastCalledWith(false);

    await vi.advanceTimersByTimeAsync(1000); // intervalle normal
    expect(tick).toHaveBeenCalledTimes(4);
    stop();
  });

  it("plafonne l'espacement à huit fois l'intervalle", async () => {
    const tick = vi.fn(async () => false);
    const stop = pollWhileVisible(tick, 1000);
    await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000 + 8000);
    expect(tick).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(8000);
    expect(tick).toHaveBeenCalledTimes(5);
    stop();
  });

  it("n'interroge pas hors ligne et reprend au retour du réseau", () => {
    const network = Object.assign(new EventTarget(), {});
    vi.stubGlobal("window", network);
    vi.stubGlobal("navigator", { onLine: true });
    const tick = vi.fn();
    const onStalledChange = vi.fn();
    const stop = pollWhileVisible(tick, 1000, onStalledChange);

    vi.stubGlobal("navigator", { onLine: false });
    network.dispatchEvent(new Event("offline"));
    expect(onStalledChange).toHaveBeenLastCalledWith(true);
    vi.advanceTimersByTime(5000);
    expect(tick).not.toHaveBeenCalled();

    vi.stubGlobal("navigator", { onLine: true });
    network.dispatchEvent(new Event("online"));
    expect(tick).toHaveBeenCalledTimes(1);
    expect(onStalledChange).toHaveBeenLastCalledWith(false);
    stop();
  });

  it("annonce l'état initial, même hors ligne dès le départ", () => {
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("navigator", { onLine: false });
    const tick = vi.fn();
    const onStalledChange = vi.fn();
    const stop = pollWhileVisible(tick, 1000, onStalledChange, true);
    expect(onStalledChange).toHaveBeenCalledWith(true);
    expect(tick).not.toHaveBeenCalled();
    stop();

    vi.stubGlobal("navigator", { onLine: true });
    const onStalledChangeOnline = vi.fn();
    const stopOnline = pollWhileVisible(tick, 1000, onStalledChangeOnline);
    expect(onStalledChangeOnline).toHaveBeenCalledWith(false);
    stopOnline();
  });

  it("compte l'échec du premier appel immédiat", async () => {
    const tick = vi.fn(async () => false);
    const onStalledChange = vi.fn();
    const stop = pollWhileVisible(tick, 1000, onStalledChange, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(tick).toHaveBeenCalledTimes(1);
    expect(onStalledChange).toHaveBeenLastCalledWith(true);
    await vi.advanceTimersByTimeAsync(1999);
    expect(tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(tick).toHaveBeenCalledTimes(2);
    stop();
  });

  it("ne démarre jamais deux chaînes d'appels en parallèle", async () => {
    const tick = vi.fn();
    const stop = pollWhileVisible(tick, 1000);
    vi.advanceTimersByTime(500);
    setHidden(false); // retour au premier plan pendant l'attente
    expect(tick).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(tick).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1000);
    expect(tick).toHaveBeenCalledTimes(3);
    stop();
  });
});
