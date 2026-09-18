import { Heading, Link, Text } from "@react-email/components";
import { appUrl } from "../app-url";
import {
  EmailLayout,
  emailHeadingStyle,
  emailButtonStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from "./layout";

export function ServiceActivatedEmail({
  recipientName,
  serviceName,
  clientServiceId,
}: {
  recipientName: string;
  serviceName: string;
  clientServiceId: string;
}) {
  return (
    <EmailLayout preview={`« ${serviceName} » est maintenant active`}>
      <Heading
        as="h2"
        style={emailHeadingStyle}
      >
        Votre solution est active
      </Heading>
      <Text style={emailTextStyle}>Bonjour {recipientName},</Text>
      <Text style={emailTextStyle}>
        « {serviceName} » est déployée et vérifiée par l&apos;équipe Automerio —
        elle est maintenant active.
      </Text>
      <Text style={emailMutedTextStyle}>
        Vous pouvez suivre son fonctionnement depuis votre tableau de bord.
      </Text>
      <Link
        href={appUrl(`/dashboard/services/${clientServiceId}`)}
        style={emailButtonStyle}
      >
        Voir ma solution
      </Link>
    </EmailLayout>
  );
}
