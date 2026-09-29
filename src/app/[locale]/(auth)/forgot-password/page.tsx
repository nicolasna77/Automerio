import { titleMetadata } from "@/i18n/metadata";
import { ForgotPasswordForm } from "./forgot-password-form";

export const generateMetadata = titleMetadata("forgotPassword");

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
