import { useTranslations } from "next-intl";

// À la place d'un bouton que le serveur refuserait : connecter un numéro, un
// agenda ou une messagerie est réservé aux responsables de l'entreprise.
export function ManagersOnlyNote() {
  const t = useTranslations("Dashboard");
  return <p className="text-sm text-muted-foreground">{t("managersOnlyNote")}</p>;
}
