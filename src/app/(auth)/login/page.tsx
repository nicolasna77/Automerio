import type { Metadata } from "next";
import { isGoogleSignInConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return <LoginForm googleEnabled={isGoogleSignInConfigured()} />;
}
