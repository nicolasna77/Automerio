import type { Metadata } from "next";
import Link from "next/link";
import { LegalFacts, LegalPage, LegalSection } from "@/components/legal-page";
import { HOSTING_PROVIDER, LEGAL_ENTITY } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales">
      <LegalSection title="Éditeur du site">
        <LegalFacts
          rows={[
            ["Nom commercial", LEGAL_ENTITY.tradeName],
            ["Dénomination sociale", LEGAL_ENTITY.companyName],
            ["Forme juridique", LEGAL_ENTITY.legalForm],
            ["Capital social", LEGAL_ENTITY.shareCapital],
            ["Siège social", LEGAL_ENTITY.headOffice],
            ["Immatriculation", LEGAL_ENTITY.registration],
            ["TVA intracommunautaire", LEGAL_ENTITY.vatNumber],
            ["E-mail", <a key="email" href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>],
            ["Téléphone", LEGAL_ENTITY.phone],
          ]}
        />
      </LegalSection>

      <LegalSection title="Directeur de la publication">
        <p>{LEGAL_ENTITY.publicationDirector}, en qualité de représentant légal de la société.</p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          Le site et l&apos;application sont hébergés par{" "}
          <strong>{HOSTING_PROVIDER.name}</strong>, {HOSTING_PROVIDER.address} —{" "}
          <a href={HOSTING_PROVIDER.website}>{HOSTING_PROVIDER.website.replace("https://", "")}</a>.
        </p>
        <p>Base de données : {LEGAL_ENTITY.databaseHost}.</p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          Les textes, le logo, les illustrations et l&apos;interface d&apos;Automerio sont
          protégés par le droit d&apos;auteur. Toute reproduction, même partielle,
          sans autorisation écrite est interdite.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles et cookies">
        <p>
          Le traitement de vos données est décrit dans la{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>, et
          l&apos;usage des cookies dans la <Link href="/cookies">politique cookies</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Nous contacter">
        <p>
          Pour toute question sur le site : <Link href="/contact">formulaire de contact</Link>{" "}
          ou <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
