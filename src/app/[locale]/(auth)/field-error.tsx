// Erreur de saisie affichée sous son champ (DESIGN.md : aria-invalid,
// aria-describedby et focus sur le champ), commune aux pages de connexion.

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FieldError({ id, message }: { id: string; message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

// aria-describedby d'un champ : son aide, puis son erreur quand il y en a une.
export function describedBy(...ids: (string | null | undefined | false)[]): string | undefined {
  return ids.filter(Boolean).join(" ") || undefined;
}
