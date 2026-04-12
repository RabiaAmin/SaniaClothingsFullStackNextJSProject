import { cn } from '@/lib/utils';

const STATUS_MAP = {
  // Invoice statuses
  draft:   { label: 'Draft',   classes: 'bg-slate-100 text-slate-700 border-slate-200' },
  sent:    { label: 'Sent',    classes: 'bg-blue-100  text-blue-700  border-blue-200'  },
  paid:    { label: 'Paid',    classes: 'bg-green-100 text-green-700 border-green-200' },
  overdue: { label: 'Overdue', classes: 'bg-red-100   text-red-700   border-red-200'   },
  // Bank account types
  VAT:     { label: 'VAT',     classes: 'bg-purple-100 text-purple-700 border-purple-200' },
  NON_VAT: { label: 'Non-VAT', classes: 'bg-gray-100   text-gray-700   border-gray-200'   },
  // Generic
  active:  { label: 'Active',  classes: 'bg-green-100 text-green-700 border-green-200' },
  default: { label: 'Default', classes: 'bg-primary/10 text-primary   border-primary/20' },
};

/**
 * @param {{ status: string, className?: string }} props
 */
export default function StatusBadge({ status, className }) {
  const key = status?.toLowerCase?.() ?? '';
  const config = STATUS_MAP[key] ?? {
    label: status ?? 'Unknown',
    classes: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}
