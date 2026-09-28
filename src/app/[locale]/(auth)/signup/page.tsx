import type { Metadata } from "next";
import { isGoogleSignInConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Inscription" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <SignupForm googleEnabled={isGoogleSignInConfigured()} next={safeNextPath(next)} />;
}
