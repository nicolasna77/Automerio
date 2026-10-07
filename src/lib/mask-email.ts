// Masque une adresse e-mail pour les journaux ou pour un visiteur qui n'en est
// pas le titulaire : « jean.dupont@exemple.fr » devient « j***@exemple.fr ».
// Le domaine reste lisible (utile pour diagnostiquer une livraison), la partie
// locale ne garde que sa première lettre.
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return "***";
  const first = Array.from(trimmed.slice(0, at))[0];
  return `${first}***${trimmed.slice(at)}`;
}
