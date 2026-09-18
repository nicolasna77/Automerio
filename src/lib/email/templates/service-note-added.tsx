import { Heading, Link, Section, Text } from "@react-email/components";
import { appUrl } from "../app-url";
import {
  EmailLayout,
  emailHeadingStyle,
  emailButtonStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from "./layout";
import { EMAIL_COLORS } from "../colors";

export function ServiceNoteAddedEmail({
  recipientName,
  serviceName,
  clientServiceId,
  note,
}: {
  recipientName: string;
  serviceName: string;
  clientServiceId: string;
  note: string;
}) {
  return (
    <EmailLayout preview={`Nouvelle note sur « ${serviceName} »`}>
      <Heading
        as="h2"
        style={emailHeadingStyle}
      >
        Nouvelle note de l&apos;équipe Automerio
      </Heading>
      <Text style={emailTextStyle}>Bonjour {recipientName},</Text>
      <Text style={emailTextStyle}>
        L&apos;équipe Automerio a ajouté une note sur « {serviceName} » :
      </Text>
      <Section
        style={{
          backgroundColor: EMAIL_COLORS.background,
          borderRadius: "12px",
          padding: "12px 16px",
          margin: "0 0 16px",
        }}
      >
        <Text style={{ ...emailTextStyle, margin: 0 }}>{note}</Text>
      </Section>
      <Text style={emailMutedTextStyle}>
        Retrouvez le détail sur votre tableau de bord.
      </Text>
      <Link
        href={appUrl(`/dashboard/services/${clientServiceId}`)}
        style={emailButtonStyle}
      >
        Voir ma solution
      </Link>
    </EmailLayout>
  );
}
