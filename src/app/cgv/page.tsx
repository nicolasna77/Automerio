import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { LEGAL_ENTITY, REFUND_GUARANTEE_DAYS } from "@/lib/legal";
import { VAT_PERCENTAGE } from "@/lib/vat";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  alternates: { canonical: "/cgv" },
};

export default function CgvPage() {
  return (
    <LegalPage
      title="Conditions générales de vente"
      intro={
        <p>
          Ces conditions encadrent l&apos;abonnement aux solutions Automerio. Elles
          s&apos;appliquent à toute commande passée depuis le tableau de bord, et
          l&apos;emportent sur tout autre document du client.
        </p>
      }
    >
      <LegalSection title="1. Parties et champ d'application">
        <p>
          Les solutions sont vendues par {LEGAL_ENTITY.companyName},{" "}
          {LEGAL_ENTITY.legalForm.toLowerCase()} au capital de {LEGAL_ENTITY.shareCapital},
          dont le siège est situé {LEGAL_ENTITY.headOffice}, immatriculée{" "}
          {LEGAL_ENTITY.registration} (ci-après « Automerio »).
        </p>
        <p>
          Elles s&apos;adressent aux professionnels — artisans, indépendants,
          coachs, TPE et PME — qui les commandent pour les besoins de leur
          activité (ci-après « le client »).
        </p>
      </LegalSection>

      <LegalSection title="2. Solutions proposées">
        <p>
          Automerio installe, connecte et surveille des automatisations fondées sur
          l&apos;intelligence artificielle : standard téléphonique, assistants de
          messagerie, prise de rendez-vous, documents administratifs. Le contenu,
          le prix et les éventuels plafonds d&apos;usage de chaque solution sont
          décrits sur sa page et rappelés avant le paiement.
        </p>
      </LegalSection>

      <LegalSection title="3. Commande">
        <p>
          La commande se passe depuis le tableau de bord, après création d&apos;un
          compte et confirmation de l&apos;adresse e-mail. Le client choisit une
          solution, renseigne les informations demandées, puis paie sur la page
          sécurisée de Stripe. La commande est ferme dès la confirmation du
          paiement, qui déclenche la mise en place.
        </p>
      </LegalSection>

      <LegalSection title="4. Prix">
        <ul>
          <li>
            Les prix sont indiqués en euros, <strong>toutes taxes comprises</strong> :
            ils incluent la TVA au taux de {VAT_PERCENTAGE} %. Le détail hors taxes figure sur
            chaque facture.
          </li>
          <li>
            Chaque solution est facturée sous forme d&apos;un abonnement mensuel,
            sans frais de mise en place : l&apos;installation, le paramétrage et le
            suivi sont compris dans l&apos;abonnement.
          </li>
          <li>
            Le prix appliqué est celui affiché au moment de la commande. Un code
            promo n&apos;est valable que dans les conditions annoncées avec lui
            (durée, solutions concernées, date limite).
          </li>
          <li>
            Automerio peut faire évoluer ses tarifs. Un changement de prix d&apos;un
            abonnement en cours est annoncé au moins 30 jours avant son
            application ; le client peut résilier avant cette date.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Paiement et facturation">
        <p>
          Le paiement est traité par Stripe ; Automerio ne conserve aucune donnée de
          carte bancaire. L&apos;abonnement est prélevé chaque mois à la date
          anniversaire de la commande. Les factures sont disponibles dans la
          rubrique « Paiements » du tableau de bord, où le client peut aussi
          mettre à jour son moyen de paiement.
        </p>
        <p>
          En cas d&apos;échec d&apos;un prélèvement, le client est prévenu par
          e-mail et Stripe retente le paiement pendant quelques jours. Sans
          régularisation, l&apos;abonnement est résilié et la solution désactivée.
          Tout retard de paiement entraîne de plein droit l&apos;indemnité
          forfaitaire pour frais de recouvrement de 40 € prévue à l&apos;article
          L. 441-10 du Code de commerce.
        </p>
      </LegalSection>

      <LegalSection title="6. Durée et résiliation">
        <p>
          Les abonnements sont <strong>sans engagement de durée</strong>. Le client
          peut résilier une solution à tout moment depuis le tableau de bord ; la
          résiliation prend effet immédiatement et arrête les prélèvements
          suivants. Le mois entamé reste dû, sous réserve de la garantie de
          remboursement (article 7).
        </p>
      </LegalSection>

      <LegalSection title={`7. Satisfait ou remboursé pendant ${REFUND_GUARANTEE_DAYS} jours`}>
        <p>
          Si une solution ne convient pas au client, Automerio rembourse{" "}
          <strong>l&apos;abonnement</strong> versé pour cette solution, à condition
          que la demande soit faite dans les {REFUND_GUARANTEE_DAYS} jours qui
          suivent son premier paiement.
        </p>
        <ul>
          <li>
            La demande se fait depuis la rubrique « Aide » du tableau de bord ou
            par e-mail à <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>,
            sans avoir à se justifier.
          </li>
          <li>
            Le remboursement est versé sur le moyen de paiement d&apos;origine sous
            14 jours, et la solution est résiliée.
          </li>
          <li>La garantie joue une fois par solution et par client.</li>
        </ul>
        <p>
          Cette garantie est commerciale : elle s&apos;ajoute aux droits que le
          client tient de la loi et ne les restreint pas.
        </p>
      </LegalSection>

      <LegalSection title="8. Mise en place et engagements d&apos;Automerio">
        <p>
          Automerio installe la solution, la relie aux outils du client, vérifie
          son fonctionnement puis la surveille pendant toute la durée de
          l&apos;abonnement. Automerio s&apos;engage à mettre en œuvre tous les
          moyens raisonnables pour assurer un service continu et de qualité ;
          il s&apos;agit d&apos;une obligation de moyens.
        </p>
      </LegalSection>

      <LegalSection title="9. Engagements du client">
        <ul>
          <li>Fournir des informations exactes et les tenir à jour.</li>
          <li>
            Donner accès aux outils à connecter (agenda, messagerie, numéro de
            téléphone) et conserver la maîtrise de ses propres comptes.
          </li>
          <li>
            Informer ses propres clients qu&apos;ils échangent avec un assistant
            automatisé, et respecter la réglementation qui s&apos;applique à son
            activité, notamment en matière de données personnelles.
          </li>
          <li>Ne pas utiliser les solutions à des fins illicites ou abusives.</li>
        </ul>
      </LegalSection>

      <LegalSection title="10. Services tiers">
        <p>
          Les solutions s&apos;appuient sur des services tiers — notamment Twilio
          pour la téléphonie, OpenAI pour l&apos;intelligence artificielle, Meta
          pour WhatsApp, Messenger et Instagram, Google pour l&apos;agenda et
          Stripe pour le paiement. Une interruption ou un changement de leurs
          conditions peut affecter le service ; Automerio en informe alors le client
          et cherche une solution équivalente.
        </p>
      </LegalSection>

      <LegalSection title="11. Responsabilité">
        <p>
          Automerio n&apos;est responsable que des dommages directs et prouvés
          résultant d&apos;un manquement à ses obligations. Sa responsabilité est
          limitée, toutes causes confondues, aux sommes payées par le client au
          titre de la solution concernée au cours des 12 derniers mois. Automerio ne
          répond pas des dommages indirects, comme une perte de chiffre
          d&apos;affaires ou de clientèle.
        </p>
      </LegalSection>

      <LegalSection title="12. Données personnelles">
        <p>
          Les données du client sont traitées selon la{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>. Pour
          les données des clients du client traitées par les solutions (appels,
          messages, rendez-vous), Automerio agit en qualité de sous-traitant au sens
          de l&apos;article 28 du RGPD : il ne les utilise que pour faire
          fonctionner la solution, sur instruction du client.
        </p>
      </LegalSection>

      <LegalSection title="13. Propriété intellectuelle">
        <p>
          Automerio reste propriétaire de ses outils, de ses méthodes et des
          configurations qu&apos;il développe. Le client dispose d&apos;un droit
          d&apos;utilisation personnel, pendant la durée de son abonnement. Les
          contenus fournis par le client restent sa propriété.
        </p>
      </LegalSection>

      <LegalSection title="14. Modification des conditions">
        <p>
          Automerio peut modifier ces conditions. La version applicable est celle en
          vigueur au jour de la commande ; toute modification d&apos;un abonnement
          en cours est notifiée au moins 30 jours à l&apos;avance.
        </p>
      </LegalSection>

      <LegalSection title="15. Droit applicable et litiges">
        <p>
          Ces conditions sont soumises au droit français. En cas de différend, les
          parties recherchent d&apos;abord une solution amiable. À défaut, le
          litige est porté devant le tribunal de commerce dans le ressort duquel se
          trouve le siège d&apos;Automerio.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
