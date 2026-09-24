import { Heading, Link, Section, Text } from "@react-email/components";
import { appUrl } from "../app-url";
import {
  EmailLayout,
  emailButtonStyle,
  emailHeadingStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from "./layout";
import { EMAIL_COLORS } from "../colors";

export function CallSummaryEmail({
  recipientName,
  serviceName,
  clientServiceId,
  reason,
  summary,
  followUp,
  callerName,
}: {
  recipientName: string;
  serviceName: string;
  clientServiceId: string;
  reason: string | null;
  summary: string;
  followUp: string | null;
  callerName: string | null;
}) {
  const title = reason ?? "Nouvel appel";
  return (
    <EmailLayout preview={`${title} — ${summary.slice(0, 80)}`}>
      <Heading as="h2" style={emailHeadingStyle}>
        {title}
      </Heading>
      <Text style={emailTextStyle}>Bonjour {recipientName},</Text>
      <Text style={emailTextStyle}>
        « {serviceName} » vient de traiter un appel
        {callerName ? ` de ${callerName}` : ""}. Voici ce qu&apos;il faut retenir :
      </Text>
      <Section
        style={{
          backgroundColor: EMAIL_COLORS.background,
          borderRadius: "12px",
          padding: "12px 16px",
          margin: "0 0 16px",
        }}
      >
        <Text style={{ ...emailTextStyle, margin: 0 }}>{summary}</Text>
      </Section>
      {followUp && (
        <Text style={emailTextStyle}>
          <strong>À faire :</strong> {followUp}
        </Text>
      )}
      <Text style={emailMutedTextStyle}>
        La transcription complète est dans votre tableau de bord. Vous pouvez désactiver ces
        e-mails depuis votre profil.
      </Text>
      <Link href={appUrl(`/dashboard/services/${clientServiceId}`)} style={emailButtonStyle}>
        Voir l&apos;appel
      </Link>
    </EmailLayout>
  );
}
