import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { HOSTING_PROVIDER, LEGAL_ENTITY } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  alternates: { canonical: "/confidentialite" },
};

const PROCESSORS: [string, string][] = [
  [HOSTING_PROVIDER.name, "hébergement du site et de l'application"],
  [LEGAL_ENTITY.databaseHost, "hébergement de la base de données"],
  ["Stripe", "paiement, facturation et gestion des moyens de paiement"],
  ["Resend", "envoi des e-mails (confirmation d'adresse, notifications)"],
  ["Twilio", "numéros de téléphone et acheminement des appels"],
  ["OpenAI", "agent vocal, réponses aux messages et aide à la rédaction"],
  ["Google", "connexion avec un compte Google et agenda de rendez-vous"],
  ["Meta", "connexion aux comptes WhatsApp, Messenger et Instagram"],
  ["Upstash", "protection contre les abus (limitation du nombre de requêtes)"],
];

export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      intro={
        <p>
          Ce que Automerio collecte, pourquoi, combien de temps, et comment exercer
          vos droits. Nous ne vendons ni ne louons vos données.
        </p>
      }
    >
      <LegalSection title="Responsable du traitement">
        <p>
          {LEGAL_ENTITY.companyName} ({LEGAL_ENTITY.tradeName}),{" "}
          {LEGAL_ENTITY.headOffice}. Pour toute question relative à vos données :{" "}
          <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
        </p>
      </LegalSection>

      <LegalSection title="Données collectées">
        <ul>
          <li>
            <strong>Compte</strong> : nom, adresse e-mail, mot de passe (stocké
            haché, jamais en clair), photo de profil facultative.
          </li>
          <li>
            <strong>Entreprise</strong> : nom de vos organisations et
            informations saisies pour configurer vos solutions (horaires,
            services proposés, consignes).
          </li>
          <li>
            <strong>Paiement</strong> : historique des factures. Les données de
            carte bancaire sont traitées par Stripe et ne transitent jamais par
            nos serveurs.
          </li>
          <li>
            <strong>Activité de vos solutions</strong> : numéro et horaires des
            appels reçus, durée, demandes de rendez-vous et messages traités pour
            vous.
          </li>
          <li>
            <strong>Échanges</strong> : messages envoyés via le formulaire de
            contact ou le centre d&apos;aide.
          </li>
          <li>
            <strong>Sécurité</strong> : adresse IP et navigateur de chaque
            session de connexion.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Pourquoi nous les utilisons">
        <ul>
          <li>
            Fournir les solutions commandées, les facturer et vous assister —
            exécution du contrat.
          </li>
          <li>
            Conserver les factures et pièces comptables — obligation légale.
          </li>
          <li>
            Sécuriser les comptes et prévenir la fraude — intérêt légitime.
          </li>
          <li>
            Répondre à une demande envoyée depuis le formulaire de contact —
            mesures précontractuelles.
          </li>
        </ul>
        <p>Aucune donnée n&apos;est utilisée à des fins publicitaires.</p>
      </LegalSection>

      <LegalSection title="Qui y a accès">
        <p>
          L&apos;équipe Automerio, pour installer et surveiller vos solutions, et les
          prestataires suivants, qui n&apos;agissent que sur nos instructions :
        </p>
        <ul>
          {PROCESSORS.map(([name, role]) => (
            <li key={name}>
              <strong>{name}</strong> — {role}
            </li>
          ))}
        </ul>
        <p>
          Certains de ces prestataires sont établis hors de l&apos;Union
          européenne, notamment aux États-Unis. Ces transferts sont encadrés par
          le cadre de protection des données UE–États-Unis ou par les clauses
          contractuelles types de la Commission européenne.
        </p>
      </LegalSection>

      <LegalSection title="Combien de temps">
        <ul>
          <li>Compte et configuration : tant que le compte existe.</li>
          <li>Factures : 10 ans, comme l&apos;exige le Code de commerce.</li>
          <li>Sessions de connexion : jusqu&apos;à leur expiration.</li>
          <li>Messages de contact sans suite : 3 ans.</li>
        </ul>
        <p>
          À la suppression du compte, les données sont effacées, à l&apos;exception
          des factures, conservées par Stripe pour satisfaire l&apos;obligation
          comptable.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous pouvez accéder à vos données, les corriger, les effacer, en
          demander la portabilité, vous opposer à un traitement ou en demander la
          limitation. Deux droits s&apos;exercent directement depuis votre profil :
        </p>
        <ul>
          <li>
            <strong>Exporter vos données</strong>, au format JSON.
          </li>
          <li>
            <strong>Supprimer votre compte</strong> : les abonnements en cours sont
            résiliés et les numéros de téléphone libérés.
          </li>
        </ul>
        <p>
          Pour les autres demandes, écrivez à{" "}
          <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a> ; nous
          répondons sous un mois. Si la réponse ne vous satisfait pas, vous pouvez
          saisir la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>).
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Connexions chiffrées, mots de passe hachés, double authentification
          disponible pour chaque compte, limitation des tentatives de connexion
          et accès de l&apos;équipe réservé aux comptes administrateurs.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Automerio n&apos;utilise que des cookies nécessaires au fonctionnement du
          service. Le détail est dans la <Link href="/cookies">politique cookies</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
