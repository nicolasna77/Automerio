import { Resend } from "resend";
import type { ReactElement } from "react";

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Automerio <onboarding@resend.dev>";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendEmail({
  to,
  subject,
  react,
  devLink,
}: {
  to: string;
  subject: string;
  react: ReactElement;
  devLink?: string;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.error(
      `RESEND_API_KEY manquant — e-mail "${subject}" à ${to} non envoyé.`
    );
    if (devLink && process.env.NODE_ENV !== "production") {
      console.info(`[email] Lien que l'e-mail aurait contenu : ${devLink}`);
    }
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      react,
    });
    if (error) {
      console.error(`Échec d'envoi de l'e-mail "${subject}" à ${to} :`, error);
    }
  } catch (err) {
    console.error(`Échec d'envoi de l'e-mail "${subject}" à ${to} :`, err);
  }
}
