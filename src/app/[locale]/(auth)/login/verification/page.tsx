import { titleMetadata } from "@/i18n/metadata";
import { safeNextPath } from "@/lib/safe-redirect";
import { TwoFactorVerificationForm } from "./two-factor-verification-form";

export const generateMetadata = titleMetadata("twoFactor");

export default async function TwoFactorVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <TwoFactorVerificationForm next={safeNextPath(next)} />;
}
