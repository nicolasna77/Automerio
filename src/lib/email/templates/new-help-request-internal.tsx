import { Heading, Link, Section, Text } from "@react-email/components";
import { appUrl } from "../app-url";
import { EmailLayout, emailHeadingStyle, emailButtonStyle, emailTextStyle } from "./layout";
import { EMAIL_COLORS } from "../colors";

export function NewHelpRequestInternalEmail({
  clientName,
  clientEmail,
  organizationName,
  subject,
  message,
  serviceName,
}: {
  clientName: string;
  clientEmail: string;
  organizationName: string;
  subject: string;
  message: string;
  serviceName: string | null;
}) {
  return (
    <EmailLayout preview={`Nouvelle demande d'aide : ${subject}`}>
      <Heading
        as="h2"
        style={emailHeadingStyle}
      >
        Nouvelle demande d&apos;aide
      </Heading>
      <Text style={emailTextStyle}>
        {clientName} ({clientEmail}) — {organizationName}
      </Text>
      <Text style={emailTextStyle}>
        Solution concernée : {serviceName ?? "Question générale"}
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
        <Text style={{ ...emailTextStyle, margin: 0 }}>{message}</Text>
      </Section>
      <Link href={appUrl("/admin/aide")} style={emailButtonStyle}>
        Ouvrir le centre d&apos;aide
      </Link>
    </EmailLayout>
  );
}
