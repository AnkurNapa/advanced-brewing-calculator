import type { ReactNode } from 'react';
import { cn } from './cn';

interface DataTableProps {
  /** Table rows — provide <thead>/<tbody> as children. */
  children: ReactNode;
  /** Accessible caption for the table. */
  caption?: ReactNode;
  /** Extra classes on the inner <table>. */
  className?: string;
  /** Extra classes on the scroll wrapper. */
  wrapperClassName?: string;
}

/**
 * Styled table shell. The wrapper scrolls horizontally so wide tables never
 * push the page into horizontal overflow. Consumers supply their own
 * <thead>/<tbody>; the styling below (via child selectors) themes them.
 */
export function DataTable({
  children,
  caption,
  className,
  wrapperClassName,
}: DataTableProps) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-xl border border-amber-200 bg-parchment',
        wrapperClassName,
      )}
    >
      <table
        className={cn(
          'w-full min-w-full border-collapse text-left text-sm text-ink',
          // Header cells
          '[&_th]:whitespace-nowrap [&_th]:bg-amber-50 [&_th]:px-4 [&_th]:py-2.5',
          '[&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-amber-700',
          // Body cells
          '[&_td]:whitespace-nowrap [&_td]:px-4 [&_td]:py-2.5 [&_td]:tabular-nums',
          // Row hairlines
          '[&_tbody_tr]:border-t [&_tbody_tr]:border-amber-200',
          '[&_tbody_tr:hover]:bg-amber-50/60',
          className,
        )}
      >
        {caption ? (
          <caption className="px-4 py-2 text-left text-xs text-amber-700">
            {caption}
          </caption>
        ) : null}
        {children}
      </table>
    </div>
  );
}
