import { Heading, Link, Text } from "@react-email/components";
import {
  EmailLayout,
  emailButtonStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from "./layout";

export function PasswordResetEmail({
  recipientName,
  url,
}: {
  recipientName: string;
  url: string;
}) {
  return (
    <EmailLayout preview="Réinitialisez votre mot de passe Automerio">
      <Heading
        as="h2"
        style={{ fontSize: "16px", margin: "0 0 12px", color: "#09090b" }}
      >
        Réinitialisation de mot de passe
      </Heading>
      <Text style={emailTextStyle}>Bonjour {recipientName},</Text>
      <Text style={emailTextStyle}>
        Vous avez demandé à réinitialiser votre mot de passe Automerio. Cliquez
        sur le bouton ci-dessous pour en choisir un nouveau.
      </Text>
      <Link href={url} style={emailButtonStyle}>
        Réinitialiser mon mot de passe
      </Link>
      <Text style={emailMutedTextStyle}>
        Ce lien expire dans une heure. Si vous n&apos;êtes pas à l&apos;origine
        de cette demande, vous pouvez ignorer cet e-mail — votre mot de passe
        actuel reste inchangé.
      </Text>
    </EmailLayout>
  );
}
