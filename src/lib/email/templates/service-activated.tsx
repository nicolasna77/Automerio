import { Heading, Link, Text } from "@react-email/components";
import { appUrl } from "../app-url";
import {
  EmailLayout,
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
        style={{ fontSize: "16px", margin: "0 0 12px", color: "#09090b" }}
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
