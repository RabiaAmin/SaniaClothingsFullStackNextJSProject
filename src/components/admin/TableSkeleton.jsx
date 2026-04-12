import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton that mimics a data table with `rows` rows and `cols` columns.
 */
export default function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 border-b pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-4 flex-1 rounded"
              style={{ opacity: 1 - r * 0.12 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
