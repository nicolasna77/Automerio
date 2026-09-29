export function pollWhileVisible(tick: () => void, intervalMs: number): () => void {
  let id: ReturnType<typeof setInterval> | undefined;

  const start = () => {
    if (id === undefined) id = setInterval(tick, intervalMs);
  };
  const stop = () => {
    if (id !== undefined) {
      clearInterval(id);
      id = undefined;
    }
  };
  const onVisibilityChange = () => {
    if (document.hidden) {
      stop();
    } else {
      tick();
      start();
    }
  };

  if (!document.hidden) start();
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    stop();
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
