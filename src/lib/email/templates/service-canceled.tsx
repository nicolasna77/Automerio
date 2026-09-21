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
        Votre solution « {serviceName} » a bien été résiliée et
        l&apos;abonnement mensuel est annulé immédiatement. Si votre premier
        paiement date de moins de 30 jours, cet abonnement vous est remboursé
        sur simple demande depuis la rubrique « Aide ». Les frais de mise en
        place restent acquis dès lors que la solution a été mise en service.
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
