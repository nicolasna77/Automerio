import { redirect } from "next/navigation";
import { AutomerioLogo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession, isAdmin } from "@/lib/session";
import { AuthAside } from "./auth-aside";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session) {
    redirect(isAdmin(session.user) ? "/admin" : "/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-12 xl:px-16">
          <AutomerioLogo />
          <ThemeToggle />
        </div>
      </header>
      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <main className="flex items-center px-4 py-12 sm:px-6 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <AuthAside />
      </div>
    </div>
  );
}
