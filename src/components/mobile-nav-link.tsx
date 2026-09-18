import Link from "next/link";
import { SheetClose } from "@/components/ui/sheet";

export function MobileNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <SheetClose
      render={<Link href={href} />}
      nativeButton={false}
      className="block rounded-2xl px-3 py-2.5 text-foreground transition-colors hover:bg-muted pointer-coarse:py-3"
    >
      {children}
    </SheetClose>
  );
}
