import { Heading, Link, Section, Text } from "@react-email/components";
import { appUrl } from "../app-url";
import { EmailLayout, emailHeadingStyle, emailButtonStyle, emailTextStyle } from "./layout";
import { EMAIL_COLORS } from "../colors";

export function HelpRequestClientReplyInternalEmail({
  clientName,
  clientEmail,
  organizationName,
  subject,
  body,
}: {
  clientName: string;
  clientEmail: string;
  organizationName: string;
  subject: string;
  body: string;
}) {
  return (
    <EmailLayout preview={`Réponse de ${clientName} : ${subject}`}>
      <Heading
        as="h2"
        style={emailHeadingStyle}
      >
        Nouvelle réponse d&apos;un client
      </Heading>
      <Text style={emailTextStyle}>
        {clientName} ({clientEmail}) — {organizationName}
      </Text>
      <Text style={{ ...emailTextStyle, fontWeight: 600 }}>{subject}</Text>
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
      <Link href={appUrl("/admin/aide")} style={emailButtonStyle}>
        Ouvrir le centre d&apos;aide
      </Link>
    </EmailLayout>
  );
}
