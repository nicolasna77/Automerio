import { Heading, Link, Text } from "@react-email/components";
import {
  EmailLayout,
  emailHeadingStyle,
  emailButtonStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from "./layout";

export function EmailChangeConfirmationEmail({
  recipientName,
  newEmail,
  url,
}: {
  recipientName: string;
  newEmail: string;
  url: string;
}) {
  return (
    <EmailLayout preview="Confirmez le changement d'adresse de votre compte Automerio">
      <Heading as="h2" style={emailHeadingStyle}>
        Changement d&apos;adresse e-mail
      </Heading>
      <Text style={emailTextStyle}>Bonjour {recipientName},</Text>
      <Text style={emailTextStyle}>
        Vous avez demandé à utiliser {newEmail} pour votre compte Automerio. Confirmez ce
        changement : un second lien sera ensuite envoyé à la nouvelle adresse pour la vérifier.
      </Text>
      <Link href={url} style={emailButtonStyle}>
        Confirmer le changement
      </Link>
      <Text style={emailMutedTextStyle}>
        Si vous n&apos;êtes pas à l&apos;origine de cette demande, ignorez cet e-mail : votre adresse
        actuelle reste inchangée.
      </Text>
    </EmailLayout>
  );
}
