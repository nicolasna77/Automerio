import { Heading, Link, Section, Text } from "@react-email/components";
import { appUrl } from "../app-url";
import {
  EmailLayout,
  emailButtonStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from "./layout";
import { EMAIL_COLORS } from "../colors";

export function HelpRequestReplyEmail({
  recipientName,
  subject,
  body,
}: {
  recipientName: string;
  subject: string;
  body: string;
}) {
  return (
    <EmailLayout preview={`Réponse à votre demande « ${subject} »`}>
      <Heading
        as="h2"
        style={{ fontSize: "16px", margin: "0 0 12px", color: "#09090b" }}
      >
        L&apos;équipe Automerio vous a répondu
      </Heading>
      <Text style={emailTextStyle}>Bonjour {recipientName},</Text>
      <Text style={emailTextStyle}>
        Nouvelle réponse à votre demande « {subject} » :
      </Text>
      <Section
        style={{
          backgroundColor: EMAIL_COLORS.background,
          borderRadius: "12px",
          padding: "12px 16px",
          margin: "0 0 16px",
        }}
      >
        <Text style={{ ...emailTextStyle, margin: 0 }}>{body}</Text>
      </Section>
      <Text style={emailMutedTextStyle}>
        Vous pouvez répondre directement depuis votre centre d&apos;aide.
      </Text>
      <Link href={appUrl("/dashboard/aide")} style={emailButtonStyle}>
        Répondre
      </Link>
    </EmailLayout>
  );
}
