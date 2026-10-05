"use server";

import { getSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionError, actionError, runAction } from "@/lib/run-action";
import {
  detectMenuFile,
  MENU_IMPORT_MAX_FILES,
  MENU_IMPORT_MAX_TOTAL_BYTES,
  type MenuDocument,
} from "@/lib/menu-import";
import { transcribeMenuDocuments } from "@/lib/menu-transcription";

export async function transcribeMenu(formData: FormData) {
  return runAction(async () => {
    const session = await getSession();
    if (!session) throw actionError("sessionExpired");
    if (!(await checkRateLimit("menu-import", session.user.id, "10 m", 10))) {
      throw actionError("tooManyImports");
    }

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (files.length === 0) {
      throw actionError("chooseMenuFile");
    }
    if (files.length > MENU_IMPORT_MAX_FILES) {
      throw actionError("tooManyFiles", { max: MENU_IMPORT_MAX_FILES });
    }
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MENU_IMPORT_MAX_TOTAL_BYTES) {
      throw actionError("filesTooLarge", { max: MENU_IMPORT_MAX_TOTAL_BYTES / 1024 / 1024 });
    }
    if (!process.env.OPENAI_API_KEY) {
      throw actionError("importUnavailable");
    }

    const documents: MenuDocument[] = [];
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const check = detectMenuFile(bytes);
      if (!check.ok) throw actionError("fileError", { name: file.name, error: check.error });
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
      throw actionError("importFailed");
    }
    if (sections.length === 0) {
      throw actionError("noProductFound");
    }
    return sections;
  });
}
