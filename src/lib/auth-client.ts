import { createAuthClient } from "better-auth/react";
import { stripeClient } from "@better-auth/stripe/client";
import {
  inferAdditionalFields,
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    stripeClient({ subscription: true }),
    organizationClient(),
    twoFactorClient(),
  ],
});
