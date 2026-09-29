import { SERVICE_COPY as FR } from "@/content/fr/service-copy";
import type { Faq } from "@/lib/site";

export type ServiceBenefit = { title: string; description: string };

export type ServiceUseCase = { audience: string; scenario: string };

export type ServiceCopy = {
  intro: string;
  benefits: ServiceBenefit[];
  useCases?: ServiceUseCase[];
  faq: Faq[];
};

const SERVICE_COPY_BY_LOCALE: Record<string, Record<string, ServiceCopy>> = { fr: FR };

export function getServiceCopy(slug: string, locale = "fr"): ServiceCopy | null {
  const copies = SERVICE_COPY_BY_LOCALE[locale] ?? FR;
  return copies[slug] ?? FR[slug] ?? null;
}
