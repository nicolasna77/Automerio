"use server";

import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { sendNewContactMessageInternalEmail } from "@/lib/email/notifications";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export type WaitlistResult = { status: "success" } | { status: "error"; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: string, max: number): string | null {
  const trimmed = value.trim().slice(0, max);
  return trimmed ? trimmed : null;
}

export async function joinWaitlist(input: {
  email: string;
  name: string;
  company: string;
  phone: string;
  wantsCallback: boolean;
  wantsNewsletter: boolean;
  website: string;
}): Promise<WaitlistResult> {
  if (input.website.trim()) return { status: "success" };

  const t = await getTranslations("Waitlist.errors");
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return { status: "error", error: t("invalidEmail") };
  if (!input.wantsCallback && !input.wantsNewsletter) return { status: "error", error: t("missingChoice") };

  if (!(await checkRateLimit("waitlist", await getClientIp(), "10 m", 5))) {
    return { status: "error", error: t("rateLimited") };
  }

  const data = {
    name: clean(input.name, 120),
    company: clean(input.company, 160),
    phone: clean(input.phone, 30),
    wantsCallback: input.wantsCallback,
    wantsNewsletter: input.wantsNewsletter,
    newsletterConsentAt: input.wantsNewsletter ? new Date() : null,
  };
  await db.waitlistEntry.upsert({ where: { email }, create: { email, ...data }, update: data });

  const choices = [
    input.wantsCallback ? "à recontacter" : null,
    input.wantsNewsletter ? "informé du lancement" : null,
  ].filter(Boolean);
  await sendNewContactMessageInternalEmail({
    name: data.name ?? email,
    email,
    activity: data.company,
    message: `Inscription à la liste d'attente : ${choices.join(" et ")}.${data.phone ? ` Téléphone : ${data.phone}.` : ""}`,
  });

  return { status: "success" };
}
