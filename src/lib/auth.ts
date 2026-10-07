import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, organization, twoFactor } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";
import { stripe } from "@better-auth/stripe";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/stripe-webhooks";
import { prepareAccountDeletion, removeOrphanOrganizations } from "@/lib/account-deletion";
import {
  sendEmailChangeConfirmationEmail,
  sendEmailVerificationEmail,
  sendOrganizationInvitationEmail,
  sendPasswordResetEmail,
} from "@/lib/email/notifications";
import { roleLabel } from "@/lib/organization-roles";
import {
  decideInvitation,
  decideRemoval,
  decideRoleChange,
  type GuardDecision,
  type TeamRow,
} from "@/lib/organization-guards";
import { isAcceptableAvatar } from "@/lib/avatar-image";
import { envWithDevFallback } from "@/lib/env";
import { absoluteUrl } from "@/lib/site";
import { redisRateLimitStorage } from "@/lib/rate-limit";
import { trustedOrigins } from "@/lib/trusted-origins";
import { isWaitlistMode } from "@/lib/launch-mode";

export { stripeClient };

const accessControl = createAccessControl(defaultStatements);
const adminRole = accessControl.newRole(adminAc.statements);
const clientRole = accessControl.newRole(userAc.statements);

async function actionsMessage(key: "avatarInvalid" | "roleNotAllowed"): Promise<string> {
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Actions" });
  return t(key);
}

// Toute écriture de `user.image` passe ici, y compris un appel direct à
// /api/auth/update-user qui contournerait le formulaire du profil.
async function assertAcceptableAvatar(user: Record<string, unknown>): Promise<void> {
  if (!("image" in user) || isAcceptableAvatar(user.image)) return;
  throw new APIError("BAD_REQUEST", { message: await actionsMessage("avatarInvalid") });
}

async function enforceDecision(decision: GuardDecision | null): Promise<void> {
  if (!decision || decision.ok) return;
  const message = "key" in decision ? await actionsMessage(decision.key) : decision.reason;
  throw new APIError("FORBIDDEN", { message });
}

async function loadTeam(organizationId: string): Promise<TeamRow[]> {
  const members = await db.member.findMany({
    where: { organizationId },
    select: { id: true, userId: true, role: true, user: { select: { email: true } } },
  });
  return members.map(({ user, ...member }) => ({ ...member, email: user.email }));
}

// Les règles d'équipe du tableau de bord (organization-roles.ts), rejouées
// pour les appels directs à /api/auth/organization/* : les crochets du plugin
// organization ne disent pas qui modifie ou retire un membre, d'où un crochet
// global qui lit la session.
const enforceTeamRules = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/organization/update-member-role" && ctx.path !== "/organization/remove-member") {
    return;
  }
  const session = await getSessionFromCtx(ctx);
  if (!session) return;
  const body = (ctx.body ?? {}) as Record<string, unknown>;
  const organizationId =
    typeof body.organizationId === "string" && body.organizationId
      ? body.organizationId
      : session.session.activeOrganizationId;
  if (typeof organizationId !== "string" || !organizationId) return;

  const team = await loadTeam(organizationId);
  if (ctx.path === "/organization/update-member-role") {
    const { memberId, role } = body;
    if (typeof memberId !== "string") return;
    if (typeof role !== "string" && !Array.isArray(role)) return;
    const nextRole = Array.isArray(role) ? role.map(String) : role;
    await enforceDecision(decideRoleChange(team, session.user.id, memberId, nextRole));
  } else if (typeof body.memberIdOrEmail === "string") {
    await enforceDecision(decideRemoval(team, session.user.id, body.memberIdOrEmail));
  }
});

export const auth = betterAuth({
  appName: "Automerio",
  baseURL: envWithDevFallback(["BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL"], "http://localhost:3000"),
  trustedOrigins: trustedOrigins(),
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  rateLimit: {
    enabled: true,
    customStorage: redisRateLimitStorage,
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: isWaitlistMode(),
    requireEmailVerification: true,
    // Mêmes bornes que les formulaires d'inscription et de réinitialisation
    // (MIN_PASSWORD_LENGTH = 8) ; ce sont aussi les valeurs par défaut de
    // better-auth, fixées ici pour qu'elles ne changent pas en silence.
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ email: user.email, name: user.name }, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmailVerificationEmail({ email: user.email, name: user.name }, url);
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      disableSignUp: isWaitlistMode(),
    },
  },
  account: {
    accountLinking: {
      requireLocalEmailVerified: true,
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendEmailChangeConfirmationEmail({ email: user.email, name: user.name }, newEmail, url);
      },
    },
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "CLIENT",
        input: false,
      },
      pendingOrganizationName: {
        type: "string",
        required: false,
        input: true,
        returned: false,
      },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        await prepareAccountDeletion(user.id);
      },
      afterDelete: async (user) => {
        await removeOrphanOrganizations(user.id);
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Une inscription (Google comprise) ne doit pas échouer pour une
        // photo : une image refusée est simplement écartée.
        before: async (user) => {
          if (isAcceptableAvatar(user.image)) return;
          return { data: { ...user, image: null } };
        },
      },
      update: {
        before: async (user) => {
          await assertAcceptableAvatar(user);
        },
      },
    },
  },
  hooks: {
    before: enforceTeamRules,
  },
  // Cache de 5 min : requireAdmin (session.ts) le contourne pour que le retrait
  // des droits d'un administrateur prenne effet immédiatement.
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [
    admin({
      defaultRole: "CLIENT",
      adminRoles: ["ADMIN"],
      ac: accessControl,
      roles: {
        ADMIN: adminRole,
        CLIENT: clientRole,
      },
    }),
    organization({
      organizationLimit: 20,
      organizationHooks: {
        beforeCreateInvitation: async ({ invitation }) => {
          const inviter = await db.member.findFirst({
            where: { organizationId: invitation.organizationId, userId: invitation.inviterId },
            select: { userId: true, role: true },
          });
          await enforceDecision(decideInvitation(inviter ?? undefined, invitation.role));
        },
      },
      async sendInvitationEmail(data) {
        await sendOrganizationInvitationEmail({
          to: data.email,
          organizationName: data.organization.name,
          inviterName: data.inviter.user.name,
          inviterEmail: data.inviter.user.email,
          roleLabel: roleLabel(data.role),
          url: absoluteUrl(`/invitation/${data.id}`),
        });
      },
    }),
    twoFactor({
      issuer: "Automerio",
      allowPasswordless: true,
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: envWithDevFallback(["STRIPE_WEBHOOK_SECRET"], "whsec_dev_placeholder"),
      onEvent: handleStripeEvent,
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
