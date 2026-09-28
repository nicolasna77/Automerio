import type { Metadata } from "next";
import { safeNextPath } from "@/lib/safe-redirect";
import { TwoFactorVerificationForm } from "./two-factor-verification-form";

export const metadata: Metadata = { title: "Vérification en deux étapes" };

export default async function TwoFactorVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <TwoFactorVerificationForm next={safeNextPath(next)} />;
}
