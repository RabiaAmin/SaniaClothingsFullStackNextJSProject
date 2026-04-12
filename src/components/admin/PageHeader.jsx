/**
 * Reusable page header for all admin sections.
 *
 * @param {{ title: string, description?: string, action?: React.ReactNode }} props
 */
export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-3 sm:mt-0">{action}</div>}
    </div>
  );
}
