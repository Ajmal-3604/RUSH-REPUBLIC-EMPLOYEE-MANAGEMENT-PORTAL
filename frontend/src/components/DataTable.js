import React from 'react';
import EmptyState, { LoadingState } from './EmptyState';

/**
 * Horizontally scrollable table used by every module list.
 *
 * `columns` is an array of:
 *   { key, header, render?(row), align?: 'right', width? }
 * When `render` is omitted the raw `row[key]` value is printed.
 */
export default function DataTable({
  columns,
  rows,
  loading,
  emptyTitle = 'Nothing here yet',
  emptyText,
  emptyAction,
  rowKey = (row) => row.id,
}) {
  if (loading) return <LoadingState />;

  if (!rows || rows.length === 0) {
    return <EmptyState title={emptyTitle} text={emptyText} action={emptyAction} />;
  }

  return (
    <div className="rr-table-wrap">
      <table className="rr-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  textAlign: column.align === 'right' ? 'right' : 'left',
                  width: column.width,
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.align === 'right' ? 'rr-table__num' : undefined}
                >
                  {column.render ? column.render(row) : row[column.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
