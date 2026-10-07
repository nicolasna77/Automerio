import { after } from "next/server";
import { Resend } from "resend";
import type { ReactElement } from "react";
import { maskEmail } from "@/lib/mask-email";

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Automerio <onboarding@resend.dev>";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendEmail({
  kind,
  to,
  subject,
  react,
  devLink,
}: {
  // Nom stable du type d'e-mail pour les journaux (« sendInvitationEmail »…) :
  // jamais l'objet, qui peut contenir des données personnelles, ni le nom du
  // composant React, raccourci par la compilation de production.
  kind: string;
  to: string;
  subject: string;
  react: ReactElement;
  devLink?: string;
}): Promise<void> {
  const label = `[email] ${kind} à ${maskEmail(to)}`;
  const resend = getResendClient();
  if (!resend) {
    console.error(`RESEND_API_KEY manquant — ${label} non envoyé.`);
    if (devLink && process.env.NODE_ENV !== "production") {
      console.info(`[email] Lien que l'e-mail aurait contenu : ${devLink}`);
    }
    return;
  }

  const deliver = async () => {
    try {
      const { error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to,
        subject,
        react,
      });
      if (error) {
        console.error(`Échec d'envoi — ${label} :`, error);
      }
    } catch (err) {
      console.error(`Échec d'envoi — ${label} :`, err);
    }
  };

  try {
    after(deliver);
  } catch {
    await deliver();
  }
}
