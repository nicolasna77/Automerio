import { Heading, Link, Text } from "@react-email/components";
import {
  EmailLayout,
  emailHeadingStyle,
  emailButtonStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from "./layout";

export function EmailVerificationEmail({
  recipientName,
  url,
}: {
  recipientName: string;
  url: string;
}) {
  return (
    <EmailLayout preview="Confirmez votre adresse e-mail Automerio">
      <Heading
        as="h2"
        style={emailHeadingStyle}
      >
        Confirmez votre adresse e-mail
      </Heading>
      <Text style={emailTextStyle}>Bonjour {recipientName},</Text>
      <Text style={emailTextStyle}>
        Confirmez que cette adresse est bien la vôtre pour l&apos;utiliser avec
        votre compte Automerio.
      </Text>
      <Link href={url} style={emailButtonStyle}>
        Confirmer mon adresse
      </Link>
      <Text style={emailMutedTextStyle}>
        Ce lien expire dans une heure. Si vous n&apos;êtes pas à l&apos;origine de
        cette demande, ignorez cet e-mail.
      </Text>
    </EmailLayout>
  );
}
