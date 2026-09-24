import type { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

import { safeNextPath } from "@/lib/safe-redirect";

/**
 * Apres la connexion : la page demandee avant de se connecter si elle est sure
 * (une solution a activer, une page protegee ouverte depuis un lien), sinon
 * l'espace du role.
 */
export async function redirectAfterSignIn(
  router: ReturnType<typeof useRouter>,
  next: string | null = null
) {
  const session = await authClient.getSession();
  const role = session.data?.user.role;
  router.refresh();
  router.push(safeNextPath(next) ?? (role === "ADMIN" ? "/admin" : "/dashboard"));
}
