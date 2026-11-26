'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TableBody } from '@/components/ui/table';

// Lists at or below this size render every row unchanged; virtualization only pays off above it.
export const VIRTUALIZE_THRESHOLD = 100;
// Rows rendered before the scroll container has been measured (first paint / SSR hydration).
const INITIAL_ROWS = 30;

function getScrollParent(node) {
  // The (admin) shell scrolls inside <main>; fall back to the document elsewhere.
  return node?.closest('main') ?? document.scrollingElement ?? document.documentElement;
}

function getScrollMargin(body, scrollElement) {
  const isDocument = scrollElement === document.scrollingElement;
  const containerTop = isDocument ? 0 : scrollElement.getBoundingClientRect().top;
  return body.getBoundingClientRect().top - containerTop + scrollElement.scrollTop;
}

/**
 * Drop-in <TableBody> that windows large, already-loaded row sets inside the page's existing
 * scroll container. Native table markup, column widths, sticky headers and row actions are
 * preserved by padding the body with spacer rows instead of absolutely positioning rows.
 *
 * renderRow(item, rowProps) must spread rowProps onto its <TableRow> so heights are measured.
 */
export default function VirtualTableBody({
  items,
  renderRow,
  colSpan,
  estimateSize = 53,
  threshold = VIRTUALIZE_THRESHOLD,
  overscan = 10,
  className,
}) {
  const bodyRef = useRef(null);
  const [scrollElement, setScrollElement] = useState(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const enabled = items.length > threshold;

  useLayoutEffect(() => {
    if (!enabled || !bodyRef.current) return undefined;
    const element = getScrollParent(bodyRef.current);
    const measure = () => setScrollMargin(getScrollMargin(bodyRef.current, element));
    setScrollElement(element);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [enabled, items.length]);

  const virtualizer = useVirtualizer({
    count: enabled ? items.length : 0,
    getScrollElement: () => scrollElement,
    estimateSize: () => estimateSize,
    overscan,
    scrollMargin,
  });

  if (!enabled) {
    return (
      <TableBody ref={bodyRef} className={className}>
        {items.map((item) => renderRow(item, {}))}
      </TableBody>
    );
  }

  const virtualRows = virtualizer.getVirtualItems();
  if (virtualRows.length === 0) {
    return (
      <TableBody ref={bodyRef} className={className} data-virtualized="true">
        {items.slice(0, INITIAL_ROWS).map((item) => renderRow(item, {}))}
      </TableBody>
    );
  }

  const paddingTop = virtualRows[0].start - scrollMargin;
  const paddingBottom =
    virtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1].end - scrollMargin);

  return (
    <TableBody ref={bodyRef} className={className} data-virtualized="true">
      {paddingTop > 0 && (
        <tr aria-hidden="true" style={{ height: paddingTop }}>
          <td colSpan={colSpan} className="p-0" />
        </tr>
      )}
      {virtualRows.map((row) =>
        renderRow(items[row.index], { ref: virtualizer.measureElement, 'data-index': row.index })
      )}
      {paddingBottom > 0 && (
        <tr aria-hidden="true" style={{ height: paddingBottom }}>
          <td colSpan={colSpan} className="p-0" />
        </tr>
      )}
    </TableBody>
  );
}
