"use server";

import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { sendNewContactMessageInternalEmail } from "@/lib/email/notifications";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  error?: string;
};

export async function submitContactMessage(
  input: {
    name: string;
    email: string;
    activity: string;
    message: string;
    website: string;
  }
): Promise<ContactFormState> {
  if (input.website.trim()) {
    return { status: "success" };
  }

  const t = await getTranslations("Contact.errors");
  const allowed = await checkRateLimit("contact-form", await getClientIp(), "10 m", 5);
  if (!allowed) {
    return {
      status: "error",
      error: t("rateLimited"),
    };
  }

  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  if (!name || !email || !message) {
    return { status: "error", error: t("missingFields") };
  }
  if (!email.includes("@")) {
    return { status: "error", error: t("invalidEmail") };
  }

  const activity = input.activity.trim() || null;

  await db.contactMessage.create({
    data: { name, email, activity, message },
  });
  await sendNewContactMessageInternalEmail({ name, email, activity, message });

  return { status: "success" };
}
