import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireActiveOrganization } from "@/lib/organization";
import { getServiceBySlug } from "@/lib/get-catalog";
import { ActivationFlow } from "./activation-flow";

export const metadata: Metadata = { title: "Activer une solution" };

export default async function ActivateServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, { active: organization }] = await Promise.all([
    params,
    requireActiveOrganization(),
  ]);
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard/prestations#catalogue"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour aux solutions
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Activer {service.name}
      </h1>
      <p className="mt-1 text-muted-foreground">
        Pour {organization.name}. Vous réglez l&apos;automatisation, puis vous payez en ligne.
      </p>

      <ActivationFlow service={service} organizationId={organization.id} />
    </div>
  );
}
