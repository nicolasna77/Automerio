import { Heading, Link, Text } from "@react-email/components";
import {
  EmailLayout,
  emailHeadingStyle,
  emailButtonStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from "./layout";

export function OrganizationInvitationEmail({
  organizationName,
  inviterName,
  inviterEmail,
  roleLabel,
  url,
}: {
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  roleLabel: string;
  url: string;
}) {
  return (
    <EmailLayout preview={`Rejoignez ${organizationName} sur Automerio`}>
      <Heading as="h2" style={emailHeadingStyle}>
        Invitation à rejoindre {organizationName}
      </Heading>
      <Text style={emailTextStyle}>
        {inviterName} ({inviterEmail}) vous invite à rejoindre {organizationName}{" "}
        sur Automerio, en tant que {roleLabel.toLowerCase()}.
      </Text>
      <Text style={emailTextStyle}>
        Vous y verrez les automatisations de l&apos;entreprise : les appels reçus,
        la consommation de chaque solution et leur configuration.
      </Text>
      <Link href={url} style={emailButtonStyle}>
        Rejoindre {organizationName}
      </Link>
      <Text style={emailMutedTextStyle}>
        Si vous n&apos;avez pas encore de compte Automerio, ce lien vous proposera
        d&apos;en créer un. L&apos;invitation expire dans 48 heures. Si vous ne
        connaissez pas {inviterName}, ignorez ce message : sans votre action,
        rien ne se passe.
      </Text>
    </EmailLayout>
  );
}
