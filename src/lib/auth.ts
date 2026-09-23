import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, organization, twoFactor } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";
import { stripe } from "@better-auth/stripe";
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
import { absoluteUrl } from "@/lib/site";
import { redisRateLimitStorage } from "@/lib/rate-limit";
import { trustedOrigins } from "@/lib/trusted-origins";

export { stripeClient };

const accessControl = createAccessControl(defaultStatements);
const adminRole = accessControl.newRole(adminAc.statements);
const clientRole = accessControl.newRole(userAc.statements);

export const auth = betterAuth({
  appName: "Automerio",
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000",
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
    requireEmailVerification: true,
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
      // Sans ce rappel, `invite-member` cree bien une ligne `Invitation` mais
      // personne n'est prevenu : l'invite ne saurait jamais qu'on l'attend.
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
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      // Plus de client Stripe par utilisateur : c'est l'organisation qui achete
      // et qui est facturee, et sa fiche se cree a sa premiere commande
      // (`src/lib/organization-billing.ts`). Laisser ce rappel actif remplirait
      // Stripe d'une fiche par inscription, que rien ne facturerait jamais.
      // `User.stripeCustomerId` demeure — better-auth possede la colonne — mais
      // l'application ne la lit plus.
      onEvent: handleStripeEvent,
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
