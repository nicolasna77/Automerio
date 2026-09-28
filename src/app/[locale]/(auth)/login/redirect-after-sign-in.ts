import type { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

import { safeNextPath } from "@/lib/safe-redirect";

export async function redirectAfterSignIn(
  router: ReturnType<typeof useRouter>,
  next: string | null = null
) {
  const session = await authClient.getSession();
  const role = session.data?.user.role;
  router.refresh();
  router.push(safeNextPath(next) ?? (role === "ADMIN" ? "/admin" : "/dashboard"));
}
