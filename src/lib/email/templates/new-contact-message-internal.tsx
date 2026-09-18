import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout, emailHeadingStyle, emailTextStyle } from "./layout";
import { EMAIL_COLORS } from "../colors";

export function NewContactMessageInternalEmail({
  name,
  email,
  activity,
  message,
}: {
  name: string;
  email: string;
  activity: string | null;
  message: string;
}) {
  return (
    <EmailLayout preview={`Nouveau message de contact de ${name}`}>
      <Heading
        as="h2"
        style={emailHeadingStyle}
      >
        Nouveau message depuis le site public
      </Heading>
      <Text style={emailTextStyle}>
        {name} ({email})
        {activity ? ` — ${activity}` : ""}
      </Text>
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
    </EmailLayout>
  );
}
