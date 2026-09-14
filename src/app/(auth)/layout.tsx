import { redirect } from "next/navigation";
import { AutomerioLogo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession, isAdmin } from "@/lib/session";

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
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <AutomerioLogo />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
