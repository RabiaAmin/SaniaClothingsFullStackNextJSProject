import { cn } from '@/lib/utils';

/**
 * Centered empty-state placeholder shown when a list has no items.
 *
 * @param {{
 *   icon: React.ComponentType<{ className?: string }>,
 *   title: string,
 *   description?: string,
 *   action?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
