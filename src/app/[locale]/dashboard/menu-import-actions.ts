"use server";

import { getSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionError, runAction } from "@/lib/run-action";
import {
  detectMenuFile,
  MENU_IMPORT_MAX_FILES,
  MENU_IMPORT_MAX_TOTAL_BYTES,
  type MenuDocument,
} from "@/lib/menu-import";
import { transcribeMenuDocuments } from "@/lib/menu-transcription";

const MANUAL_FALLBACK = "Vous pouvez aussi saisir votre carte à la main.";

export async function transcribeMenu(formData: FormData) {
  return runAction(async () => {
    const session = await getSession();
    if (!session) throw new ActionError("Votre session a expiré. Reconnectez-vous.");
    if (!(await checkRateLimit("menu-import", session.user.id, "10 m", 10))) {
      throw new ActionError("Trop d'imports. Réessayez dans quelques minutes.");
    }

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (files.length === 0) {
      throw new ActionError("Choisissez une photo ou un PDF de votre carte.");
    }
    if (files.length > MENU_IMPORT_MAX_FILES) {
      throw new ActionError(`${MENU_IMPORT_MAX_FILES} fichiers maximum par import.`);
    }
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MENU_IMPORT_MAX_TOTAL_BYTES) {
      throw new ActionError(
        `Fichiers trop lourds : ${MENU_IMPORT_MAX_TOTAL_BYTES / 1024 / 1024} Mo maximum au total.`
      );
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new ActionError(`L'import automatique est indisponible pour le moment. ${MANUAL_FALLBACK}`);
    }

    const documents: MenuDocument[] = [];
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const check = detectMenuFile(bytes);
      if (!check.ok) throw new ActionError(`« ${file.name} » : ${check.error}`);
      documents.push({
        name: file.name,
        mime: check.mime,
        kind: check.kind,
        base64: Buffer.from(bytes).toString("base64"),
      });
    }

    let sections;
    try {
      sections = await transcribeMenuDocuments(documents);
    } catch (err) {
      console.error("[menu-import]", err);
      throw new ActionError(`La lecture de votre carte a échoué. Réessayez dans un instant. ${MANUAL_FALLBACK}`);
    }
    if (sections.length === 0) {
      throw new ActionError(
        `Aucun produit n'a été trouvé dans ce document. Vérifiez qu'il s'agit bien de votre carte. ${MANUAL_FALLBACK}`
      );
    }
    return sections;
  });
}
