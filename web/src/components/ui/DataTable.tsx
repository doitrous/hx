import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'

export type Column<T> = {
  key: string
  header: string
  /** Numeric/data columns hang off the trailing edge and render in tabular figures. */
  align?: 'start' | 'end'
  sortable?: boolean
  sortValue?: (row: T) => string | number
  render: (row: T) => ReactNode
}

/** Dense, sortable, sticky-header table. Row hover is a fill change — never a lift, which belongs to pricing tiers, not data. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  className,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  className?: string
}) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sort, columns])

  function toggleSort(key: string) {
    setSort((cur) => {
      if (cur?.key !== key) return { key, dir: 'asc' }
      if (cur.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  return (
    <div className={cn('max-w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key
              return (
                <th
                  key={col.key}
                  className={cn(
                    'sticky top-0 z-10 border-b border-line bg-surface px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3',
                    col.align === 'end' ? 'text-end' : 'text-start',
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn('inline-flex items-center gap-1 hover:text-ink-2', col.align === 'end' && 'flex-row-reverse')}
                    >
                      {col.header}
                      <Icon
                        icon={active ? (sort!.dir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown}
                        size={12}
                        className={active ? 'text-ink-2' : 'text-ink-3/70'}
                      />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn('transition-colors hover:bg-inset/70', onRowClick && 'cursor-pointer')}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onRowClick(row)
                      }
                    }
                  : undefined
              }
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('tnum border-b border-line px-3 py-3 text-ink', col.align === 'end' ? 'text-end' : 'text-start')}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
