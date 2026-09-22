import type { Metadata } from "next";
import { isGoogleSignInConfigured } from "@/lib/env";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Inscription" };

export default function SignupPage() {
  return <SignupForm googleEnabled={isGoogleSignInConfigured()} />;
}
