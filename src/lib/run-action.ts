import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Messages } from "next-intl";
import type { ActionResult } from "@/lib/action-result";

export class ActionError extends Error {}

// Erreur destinée au client dont le texte vit dans messages/*.json (espace
// « Actions ») : runAction la traduit dans la langue de la requête.
type ActionMessageKey = keyof Messages["Actions"];
type ActionMessageValues = Record<string, string | number>;

export class TranslatedActionError extends ActionError {
  constructor(
    readonly key: ActionMessageKey,
    readonly values?: ActionMessageValues
  ) {
    super(key);
  }
}

export function actionError(key: ActionMessageKey, values?: ActionMessageValues): TranslatedActionError {
  return new TranslatedActionError(key, values);
}

export const GENERIC_ACTION_ERROR = "Une erreur est survenue. Réessayez dans un instant.";

async function translateActionMessage(key: ActionMessageKey, values?: ActionMessageValues): Promise<string> {
  const t = (await getTranslations("Actions")) as unknown as (key: string, values?: ActionMessageValues) => string;
  return t(key, values);
}

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof TranslatedActionError) {
      return { ok: false, error: await translateActionMessage(err.key, err.values) };
    }
    if (err instanceof ActionError) return { ok: false, error: err.message };
    console.error("[server-action]", err);
    return { ok: false, error: await translateActionMessage("generic").catch(() => GENERIC_ACTION_ERROR) };
  }
}
