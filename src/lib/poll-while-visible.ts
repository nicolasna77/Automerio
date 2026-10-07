// Interroge le serveur à intervalle régulier tant que l'onglet est visible.
//
// `tick` peut signaler un échec (réponse en erreur, réseau coupé) en renvoyant
// `false`, directement ou via une promesse : l'intervalle double alors à chaque
// échec, jusqu'à huit fois sa durée, puis revient à la normale au premier
// succès. Hors ligne, rien n'est envoyé ; la reprise est immédiate au retour
// du réseau. `onStalledChange` reçoit l'état initial au démarrage, puis
// chaque changement : l'actualisation cesse de fonctionner, ou repart.
// `immediate` lance le premier appel tout de suite au lieu d'attendre un
// intervalle ; son échec compte comme les suivants.
export type PollTick = () => void | boolean | Promise<void | boolean>;

const MAX_BACKOFF_FACTOR = 8;

export function pollWhileVisible(
  tick: PollTick,
  intervalMs: number,
  onStalledChange?: (stalled: boolean) => void,
  immediate = false
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let inFlight = false;
  let failures = 0;
  let stalled: boolean | undefined;

  const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

  const report = () => {
    const next = failures > 0 || isOffline();
    if (next !== stalled) {
      stalled = next;
      onStalledChange?.(next);
    }
  };

  const clear = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const schedule = () => {
    clear();
    if (stopped || document.hidden || isOffline()) return;
    timer = setTimeout(run, intervalMs * Math.min(2 ** failures, MAX_BACKOFF_FACTOR));
  };

  const settle = (ok: boolean) => {
    inFlight = false;
    if (stopped) return;
    failures = ok ? 0 : failures + 1;
    report();
    schedule();
  };

  function run() {
    clear();
    if (stopped || inFlight) return;
    if (isOffline()) {
      report();
      return;
    }
    let result: ReturnType<PollTick>;
    try {
      result = tick();
    } catch {
      settle(false);
      return;
    }
    if (result instanceof Promise) {
      inFlight = true;
      result.then(
        (value) => settle(value !== false),
        () => settle(false)
      );
    } else {
      settle(result !== false);
    }
  }

  const onVisibilityChange = () => {
    if (document.hidden) clear();
    else run();
  };
  const onOnline = () => {
    report();
    run();
  };
  const onOffline = () => {
    clear();
    report();
  };

  report();
  if (immediate && !document.hidden) run();
  else schedule();
  document.addEventListener("visibilitychange", onVisibilityChange);
  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
  }
  return () => {
    stopped = true;
    clear();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    }
  };
}
