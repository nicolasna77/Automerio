import { Heading, Link, Text } from "@react-email/components";
import {
  EmailLayout,
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
        style={{ fontSize: "16px", margin: "0 0 12px", color: "#09090b" }}
      >
        Confirmez votre adresse e-mail
      </Heading>
      <Text style={emailTextStyle}>Bonjour {recipientName},</Text>
      <Text style={emailTextStyle}>
        Il reste une étape pour activer votre compte Automerio : confirmez que
        cette adresse est bien la vôtre.
      </Text>
      <Link href={url} style={emailButtonStyle}>
        Confirmer mon adresse
      </Link>
      <Text style={emailMutedTextStyle}>
        Ce lien expire dans une heure. Si vous n&apos;avez pas créé de compte
        Automerio, ignorez cet e-mail : aucun compte ne sera activé.
      </Text>
    </EmailLayout>
  );
}
