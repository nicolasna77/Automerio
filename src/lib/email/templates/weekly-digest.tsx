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

export function WeeklyDigestEmail({
  recipientName,
  organizationName,
  highlights,
}: {
  recipientName: string;
  organizationName: string;
  highlights: string[];
}) {
  return (
    <EmailLayout preview={`Votre semaine : ${highlights.join(", ")}`}>
      <Heading as="h2" style={emailHeadingStyle}>
        Votre semaine avec Automerio
      </Heading>
      <Text style={emailTextStyle}>Bonjour {recipientName},</Text>
      <Text style={emailTextStyle}>
        Ces sept derniers jours, vos solutions ont travaillé pour {organizationName} :
      </Text>
      <Section
        style={{
          backgroundColor: EMAIL_COLORS.background,
          borderRadius: "12px",
          padding: "12px 16px",
          margin: "0 0 16px",
        }}
      >
        {highlights.map((line) => (
          <Text key={line} style={{ ...emailTextStyle, margin: "4px 0" }}>
            • {line}
          </Text>
        ))}
      </Section>
      <Text style={emailMutedTextStyle}>
        Le détail de chaque appel et de chaque conversation est dans votre tableau de bord. Vous
        pouvez désactiver ce bilan depuis votre profil.
      </Text>
      <Link href={appUrl("/dashboard")} style={emailButtonStyle}>
        Ouvrir mon tableau de bord
      </Link>
    </EmailLayout>
  );
}
