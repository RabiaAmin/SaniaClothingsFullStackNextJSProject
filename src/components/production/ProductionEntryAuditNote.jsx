import { Badge } from '@/components/ui/badge';
import { isReversalEntry } from '@/lib/productionEntries';
import { formatDate } from '@/lib/utils/formatters';

// Shared reversal audit labels for manager tables and read-only worker cards.
export default function ProductionEntryAuditNote({ entry }) {
  if (isReversalEntry(entry)) {
    return (
      <div className="space-y-0.5">
        <Badge variant="outline">Reversal</Badge>
        <p className="text-xs text-muted-foreground">
          Offsets the entry dated {formatDate(entry.reversalOf?.date)}
        </p>
      </div>
    );
  }
  if (entry?.reversedAt) {
    const reverser = entry.reversedBy?.username ?? entry.reversedBy?.email;
    return (
      <div className="space-y-0.5">
        <Badge variant="outline">Reversed</Badge>
        <p className="max-w-48 text-xs text-muted-foreground">
          {reverser ? `by ${reverser} ` : ''}on {formatDate(entry.reversedAt)}
          {entry.reversalReason ? `: ${entry.reversalReason}` : ''}
        </p>
      </div>
    );
  }
  return null;
}
