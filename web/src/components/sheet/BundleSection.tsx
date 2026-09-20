import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { Meter } from '@/components/ui/Meter'
import { Tooltip } from '@/components/ui/Popover'
import { systemColor } from '@/lib/systems'
import { cn } from '@/lib/cn'
import type { Bundle, Sheet } from '@/lib/types'
import { countBundleItems, displayTitle, type BundleNode } from './bundleTree'
import { FieldRow } from './FieldRow'

export function BundleSection({
  node,
  allBundles,
  sheet,
  activeFieldKeys,
  pulseKey,
  onFieldHover,
  onEdit,
  onDismiss,
  readOnly,
  registerRef,
  depth = 0,
}: {
  node: BundleNode
  allBundles: Bundle[]
  sheet: Sheet
  activeFieldKeys: ReadonlySet<string>
  pulseKey?: string | null
  onFieldHover: (fieldKey: string | null) => void
  onEdit: (fieldKey: string, value: string) => void
  onDismiss: (fieldKey: string) => void
  readOnly?: boolean
  registerRef: (bundleId: string, el: HTMLElement | null) => void
  depth?: number
}) {
  const { bundle, parents, children } = node
  const { filled, unclear, empty, total } = countBundleItems(node, sheet)
  const done = total > 0 && empty === 0 && unclear === 0
  const color = systemColor(bundle.system)
  const extraParents = parents.slice(1)

  return (
    <div
      ref={(el) => registerRef(bundle.id, el)}
      data-bundle-id={bundle.id}
      className={cn('animate-screen-in flex flex-col gap-2.5 rounded-lg py-2', depth === 0 && 'ps-3.5', children.length === 0 && 'break-inside-avoid')}
      style={depth === 0 ? { boxShadow: `inset 3px 0 0 0 ${color}` } : undefined}
    >
      {(parents.length > 0 || bundle.trigger !== null) && (
        <div className="text-[12px] leading-snug">
          {parents.length > 0 ? (
            <>
              <span className="font-medium text-ink-2">
                Opened because · <span className="text-ink">{displayTitle(parents[0].bundle.title)}</span>
                {' → '}
                <span className="text-ink">{displayTitle(bundle.title)}</span>
              </span>
              {parents[0].item.reason && <p className="mt-0.5 text-ink-2">{parents[0].item.reason}</p>}
            </>
          ) : (
            <>
              <span className="font-medium text-ink-2">Opened because · the note mentions…</span>
              <p className="mt-0.5 text-ink-2">{bundle.trigger}</p>
            </>
          )}
          {extraParents.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {extraParents.map((p) => (
                <Tooltip key={p.bundle.id} label={p.item.reason ?? `Also opened by ${p.bundle.title}`}>
                  <Badge tone="accent">{p.bundle.title}</Badge>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="font-sans text-[13.5px] font-bold tracking-[-0.012em] text-ink">{displayTitle(bundle.title)}</h3>
        <span className="tnum font-mono text-[11.5px] text-ink-3">
          {filled} / {total}
        </span>
        {done ? (
          <span className="animate-screen-in inline-flex items-center gap-1 text-[11.5px] font-medium text-accent">
            <Icon icon={Check} size={13} />
            Complete
          </span>
        ) : (
          <Meter value={total === 0 ? 0 : (filled / total) * 100} size="sm" tone="accent" className="min-w-20 max-w-28 flex-1" />
        )}
      </div>

      <div className="flex flex-col divide-y divide-line/60">
        {bundle.items.map((item) => {
          const key = `${bundle.id}.${item.id}`
          return (
            <FieldRow
              key={key}
              fieldKey={key}
              item={item}
              entry={sheet[key]}
              linkTarget={item.link ? allBundles.find((b) => b.id === item.link) : undefined}
              active={activeFieldKeys.has(key)}
              pulse={pulseKey === key}
              readOnly={readOnly}
              onHoverChange={(hovering) => onFieldHover(hovering ? key : null)}
              onEdit={(value) => onEdit(key, value)}
              onDismiss={() => onDismiss(key)}
            />
          )
        })}
      </div>

      {children.length > 0 && (
        <div className="ms-1 flex flex-col gap-4 border-s-2 border-line ps-4">
          {children.map((child) => (
            <BundleSection
              key={child.bundle.id}
              node={child}
              allBundles={allBundles}
              sheet={sheet}
              activeFieldKeys={activeFieldKeys}
              pulseKey={pulseKey}
              onFieldHover={onFieldHover}
              onEdit={onEdit}
              onDismiss={onDismiss}
              readOnly={readOnly}
              registerRef={registerRef}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
