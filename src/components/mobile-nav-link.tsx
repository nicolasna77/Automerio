"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <SheetClose
      render={<Link href={href} aria-current={isActive ? "page" : undefined} />}
      nativeButton={false}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-foreground transition-colors hover:bg-muted focus-visible:focus-ring",
        isActive && "bg-muted font-medium"
      )}
    >
      {icon}
      <span className="min-w-0">{children}</span>
    </SheetClose>
  );
}
