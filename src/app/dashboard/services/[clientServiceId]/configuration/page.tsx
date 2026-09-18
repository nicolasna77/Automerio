import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getMyService } from "@/app/dashboard/get-my-service";
import { canEditConfiguration, withCleanProductCatalog } from "@/lib/catalog";
import { ServiceConfigurationForm } from "./service-configuration-form";

export const metadata: Metadata = { title: "Configuration de la solution" };

export default async function ServiceConfigurationPage({
  params,
}: {
  params: Promise<{ clientServiceId: string }>;
}) {
  const { clientServiceId } = await params;
  const session = await requireUser();
  const item = await getMyService(clientServiceId, session.user.id);
  if (!item) notFound();

  const detailHref = `/dashboard/services/${item.clientServiceId}`;
  if (!canEditConfiguration(item)) redirect(detailHref);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <Link
        href={detailHref}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour à {item.name}
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Configuration</h1>
      <p className="mt-1 text-muted-foreground">
        {item.name === item.service.name ? item.service.name : `${item.name}, ${item.service.name}`}
      </p>

      <ServiceConfigurationForm
        clientServiceId={item.clientServiceId}
        configFields={item.service.configFields}
        initialConfiguration={withCleanProductCatalog(item.configuration)}
        backHref={detailHref}
      />
    </div>
  );
}
