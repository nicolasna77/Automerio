export function ProfileSection({
  id,
  title,
  description,
  action,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 border-t border-border py-8 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="max-w-md">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
