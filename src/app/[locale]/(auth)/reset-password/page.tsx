import { titleMetadata } from "@/i18n/metadata";
import { ResetPasswordForm } from "./reset-password-form";

export const generateMetadata = titleMetadata("resetPassword");

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <ResetPasswordForm token={token} invalidToken={error === "INVALID_TOKEN"} />
  );
}
