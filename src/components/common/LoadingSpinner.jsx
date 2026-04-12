import { cn } from '@/lib/utils';

/**
 * @param {'sm'|'md'|'lg'} size
 * @param {string} className
 */
export default function LoadingSpinner({ size = 'md', className }) {
  const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeMap[size],
        className
      )}
    />
  );
}

/** Full-page centered spinner */
export function PageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
