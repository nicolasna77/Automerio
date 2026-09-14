import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Cookies",
  alternates: { canonical: "/cookies" },
};

const STORED_ITEMS: { name: string; purpose: string; lifetime: string }[] = [
  {
    name: "Cookies de session (better-auth.*)",
    purpose: "Vous garder connecté et protéger votre compte.",
    lifetime: "Jusqu'à 7 jours, ou la déconnexion",
  },
  {
    name: "Appareil de confiance (better-auth.trust_device)",
    purpose:
      "Ne plus demander le code de double authentification sur cet appareil, si vous l'avez choisi.",
    lifetime: "30 jours",
  },
  {
    name: "Thème (stockage local « theme »)",
    purpose: "Retenir le choix entre thème clair et sombre.",
    lifetime: "Jusqu'à ce que vous le changiez",
  },
  {
    name: "Affichage (stockage local « automerio:my-services-view »)",
    purpose: "Retenir l'affichage en liste ou en grille de vos solutions.",
    lifetime: "Jusqu'à ce que vous le changiez",
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookies"
      intro={
        <p>
          Automerio ne dépose ni cookie publicitaire, ni cookie de mesure
          d&apos;audience. C&apos;est pourquoi aucun bandeau ne vous demande votre
          consentement : les éléments ci-dessous sont strictement nécessaires au
          service.
        </p>
      }
    >
      <LegalSection title="Ce que nous stockons">
        <div className="overflow-x-auto">
          <table className="w-full min-w-lg text-left text-sm">
            <thead className="text-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-4 font-medium">Élément</th>
                <th scope="col" className="py-2 pr-4 font-medium">Utilité</th>
                <th scope="col" className="py-2 font-medium">Durée</th>
              </tr>
            </thead>
            <tbody>
              {STORED_ITEMS.map((item) => (
                <tr key={item.name} className="border-b border-border align-top">
                  <td className="py-3 pr-4 text-foreground">{item.name}</td>
                  <td className="py-3 pr-4">{item.purpose}</td>
                  <td className="py-3">{item.lifetime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="Services tiers">
        <ul>
          <li>
            <strong>Stripe</strong> dépose ses propres cookies sur la page de
            paiement, pour sécuriser la transaction et prévenir la fraude.
          </li>
          <li>
            <strong>Meta</strong> (Facebook) n&apos;est chargé que lorsque vous
            connectez un compte WhatsApp ou une Page Facebook, à votre demande ;
            ses cookies relèvent alors de sa propre politique.
          </li>
          <li>
            <strong>Google</strong> intervient uniquement si vous vous connectez
            avec votre compte Google ou reliez votre agenda.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Les supprimer">
        <p>
          Vous pouvez effacer ces éléments à tout moment depuis les réglages de
          votre navigateur ; vous serez alors simplement déconnecté. Pour le reste
          de vos données, voir la{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
