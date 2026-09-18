import { Heading, Link, Text } from "@react-email/components";
import { appUrl } from "../app-url";
import {
  EmailLayout,
  emailHeadingStyle,
  emailButtonStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from "./layout";

export function HelpRequestResolvedEmail({
  recipientName,
  subject,
}: {
  recipientName: string;
  subject: string;
}) {
  return (
    <EmailLayout preview={`Votre demande « ${subject} » a été traitée`}>
      <Heading
        as="h2"
        style={emailHeadingStyle}
      >
        Votre demande a été traitée
      </Heading>
      <Text style={emailTextStyle}>Bonjour {recipientName},</Text>
      <Text style={emailTextStyle}>
        Votre demande « {subject} » a été marquée comme traitée par l&apos;équipe
        Automerio.
      </Text>
      <Text style={emailMutedTextStyle}>
        Retrouvez le détail de l&apos;échange sur votre centre d&apos;aide.
      </Text>
      <Link href={appUrl("/dashboard/aide")} style={emailButtonStyle}>
        Voir ma demande
      </Link>
    </EmailLayout>
  );
}
