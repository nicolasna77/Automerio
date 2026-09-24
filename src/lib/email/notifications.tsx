import { sendEmail } from "./client";
import { isNotificationEnabled } from "./preferences";
import { HelpRequestResolvedEmail } from "./templates/help-request-resolved";
import { HelpRequestReplyEmail } from "./templates/help-request-reply";
import { HelpRequestClientReplyInternalEmail } from "./templates/help-request-client-reply-internal";
import { ServiceActivatedEmail } from "./templates/service-activated";
import { ServiceNoteAddedEmail } from "./templates/service-note-added";
import { ServiceCanceledEmail } from "./templates/service-canceled";
import { NewHelpRequestInternalEmail } from "./templates/new-help-request-internal";
import { NewContactMessageInternalEmail } from "./templates/new-contact-message-internal";
import { PasswordResetEmail } from "./templates/password-reset";
import { EmailVerificationEmail } from "./templates/email-verification";
import { EmailChangeConfirmationEmail } from "./templates/email-change-confirmation";
import { PaymentFailedEmail } from "./templates/payment-failed";
import { OrganizationInvitationEmail } from "./templates/organization-invitation";
import { QuotaAlertEmail } from "./templates/quota-alert";
import { CallSummaryEmail } from "./templates/call-summary";

type Recipient = {
  email: string;
  name: string;
  notificationPreferences: unknown;
};

const teamEmail = () =>
  process.env.AUTOMERIO_TEAM_EMAIL ??
  process.env.NOVERIS_TEAM_EMAIL ??
  "info@automerio.com";

export async function sendHelpRequestResolvedEmail(
  recipient: Recipient,
  subject: string
) {
  if (
    !isNotificationEnabled(recipient.notificationPreferences, "HELP_REQUEST_RESOLVED")
  ) {
    return;
  }
  await sendEmail({
    to: recipient.email,
    subject: `Votre demande « ${subject} » a été traitée`,
    react: <HelpRequestResolvedEmail recipientName={recipient.name} subject={subject} />,
  });
}

export async function sendHelpRequestReplyEmail(
  recipient: Recipient,
  subject: string,
  body: string
) {
  if (!isNotificationEnabled(recipient.notificationPreferences, "HELP_REQUEST_REPLY")) {
    return;
  }
  await sendEmail({
    to: recipient.email,
    subject: `Réponse à votre demande « ${subject} »`,
    react: (
      <HelpRequestReplyEmail
        recipientName={recipient.name}
        subject={subject}
        body={body}
      />
    ),
  });
}

export async function sendServiceActivatedEmail(
  recipient: Recipient,
  serviceName: string,
  clientServiceId: string
) {
  if (!isNotificationEnabled(recipient.notificationPreferences, "SERVICE_ACTIVATED")) {
    return;
  }
  await sendEmail({
    to: recipient.email,
    subject: `« ${serviceName} » est maintenant active`,
    react: (
      <ServiceActivatedEmail
        recipientName={recipient.name}
        serviceName={serviceName}
        clientServiceId={clientServiceId}
      />
    ),
  });
}

export async function sendServiceNoteAddedEmail(
  recipient: Recipient,
  serviceName: string,
  clientServiceId: string,
  note: string
) {
  if (!isNotificationEnabled(recipient.notificationPreferences, "SERVICE_NOTE_ADDED")) {
    return;
  }
  await sendEmail({
    to: recipient.email,
    subject: `Nouvelle note sur « ${serviceName} »`,
    react: (
      <ServiceNoteAddedEmail
        recipientName={recipient.name}
        serviceName={serviceName}
        clientServiceId={clientServiceId}
        note={note}
      />
    ),
  });
}

export async function sendServiceCanceledEmail(
  recipient: Recipient,
  serviceName: string
) {
  if (!isNotificationEnabled(recipient.notificationPreferences, "SERVICE_CANCELED")) {
    return;
  }
  await sendEmail({
    to: recipient.email,
    subject: `Résiliation de « ${serviceName} » confirmée`,
    react: <ServiceCanceledEmail recipientName={recipient.name} serviceName={serviceName} />,
  });
}

export async function sendNewHelpRequestInternalEmail(input: {
  clientName: string;
  clientEmail: string;
  organizationName: string;
  subject: string;
  message: string;
  serviceName: string | null;
}) {
  await sendEmail({
    to: teamEmail(),
    subject: `Nouvelle demande d'aide : ${input.subject}`,
    react: <NewHelpRequestInternalEmail {...input} />,
  });
}

export async function sendHelpRequestClientReplyInternalEmail(input: {
  clientName: string;
  clientEmail: string;
  organizationName: string;
  subject: string;
  body: string;
}) {
  await sendEmail({
    to: teamEmail(),
    subject: `Réponse de ${input.clientName} : ${input.subject}`,
    react: <HelpRequestClientReplyInternalEmail {...input} />,
  });
}

export async function sendNewContactMessageInternalEmail(input: {
  name: string;
  email: string;
  activity: string | null;
  message: string;
}) {
  await sendEmail({
    to: teamEmail(),
    subject: `Nouveau message de contact de ${input.name}`,
    react: <NewContactMessageInternalEmail {...input} />,
  });
}

export async function sendPasswordResetEmail(
  recipient: { email: string; name: string },
  url: string
) {
  await sendEmail({
    to: recipient.email,
    subject: "Réinitialisez votre mot de passe Automerio",
    react: <PasswordResetEmail recipientName={recipient.name} url={url} />,
  });
}

export async function sendEmailVerificationEmail(
  recipient: { email: string; name: string },
  url: string
) {
  await sendEmail({
    to: recipient.email,
    subject: "Confirmez votre adresse e-mail Automerio",
    react: <EmailVerificationEmail recipientName={recipient.name} url={url} />,
    devLink: url,
  });
}

export async function sendEmailChangeConfirmationEmail(
  recipient: { email: string; name: string },
  newEmail: string,
  url: string
) {
  await sendEmail({
    to: recipient.email,
    subject: "Confirmez le changement d'adresse de votre compte Automerio",
    react: <EmailChangeConfirmationEmail recipientName={recipient.name} newEmail={newEmail} url={url} />,
    devLink: url,
  });
}

export async function sendPaymentFailedEmail(
  recipient: { email: string; name: string },
  serviceName: string
) {
  await sendEmail({
    to: recipient.email,
    subject: `Le paiement de « ${serviceName} » a échoué`,
    react: <PaymentFailedEmail recipientName={recipient.name} serviceName={serviceName} />,
  });
}

/**
 * L'invitation ne passe par aucune preference de notification : elle s'adresse
 * a quelqu'un qui n'a peut-etre pas encore de compte, donc pas de preferences,
 * et c'est un message sollicite par un tiers, non une notification de service.
 */
export async function sendOrganizationInvitationEmail(input: {
  to: string;
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  roleLabel: string;
  url: string;
}) {
  await sendEmail({
    to: input.to,
    subject: `${input.inviterName} vous invite à rejoindre ${input.organizationName}`,
    react: (
      <OrganizationInvitationEmail
        organizationName={input.organizationName}
        inviterName={input.inviterName}
        inviterEmail={input.inviterEmail}
        roleLabel={input.roleLabel}
        url={input.url}
      />
    ),
  });
}

export async function sendQuotaAlertEmail(
  recipient: Recipient,
  quota: {
    alert: "WARNING" | "EXCEEDED";
    serviceName: string;
    clientServiceId: string;
    consumed: string;
    included: string;
    overagePrice: string | null;
  }
) {
  if (!isNotificationEnabled(recipient.notificationPreferences, "QUOTA_ALERT")) return;
  await sendEmail({
    to: recipient.email,
    subject:
      quota.alert === "EXCEEDED"
        ? `Forfait dépassé sur « ${quota.serviceName} »`
        : `« ${quota.serviceName} » : 80 % du forfait consommé`,
    react: <QuotaAlertEmail recipientName={recipient.name} {...quota} />,
  });
}

export async function sendCallSummaryEmail(
  recipient: Recipient,
  call: {
    serviceName: string;
    clientServiceId: string;
    reason: string | null;
    summary: string;
    followUp: string | null;
    callerName: string | null;
  }
) {
  if (!isNotificationEnabled(recipient.notificationPreferences, "CALL_SUMMARY")) return;
  await sendEmail({
    to: recipient.email,
    subject: call.reason ? `Appel : ${call.reason}` : `Nouvel appel sur « ${call.serviceName} »`,
    react: <CallSummaryEmail recipientName={recipient.name} {...call} />,
  });
}
