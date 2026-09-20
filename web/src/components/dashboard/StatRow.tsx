/** Plain figures, mono numerals — deliberately not a stat-card grid with icons in tinted circles. */
export function StatRow({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-surface px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="tnum font-serif text-[26px] font-semibold text-ink sm:text-[30px]">{s.value}</div>
          <div className="mt-0.5 text-[12px] text-ink-2">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
