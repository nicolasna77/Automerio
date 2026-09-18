import { Heading, Link, Text } from "@react-email/components";
import { appUrl } from "../app-url";
import {
  EmailLayout,
  emailHeadingStyle,
  emailButtonStyle,
  emailMutedTextStyle,
  emailTextStyle,
} from "./layout";

export function ServiceCanceledEmail({
  recipientName,
  serviceName,
}: {
  recipientName: string;
  serviceName: string;
}) {
  return (
    <EmailLayout preview={`Résiliation de « ${serviceName} » confirmée`}>
      <Heading
        as="h2"
        style={emailHeadingStyle}
      >
        Résiliation confirmée
      </Heading>
      <Text style={emailTextStyle}>Bonjour {recipientName},</Text>
      <Text style={emailTextStyle}>
        Votre solution « {serviceName} » a bien été résiliée. L&apos;abonnement
        mensuel est annulé immédiatement ; les frais de mise en place déjà
        réglés ne sont pas remboursés.
      </Text>
      <Text style={emailMutedTextStyle}>
        Vous pouvez réactiver cette solution à tout moment depuis votre
        tableau de bord.
      </Text>
      <Link href={appUrl("/dashboard/prestations")} style={emailButtonStyle}>
        Voir mes solutions
      </Link>
    </EmailLayout>
  );
}
