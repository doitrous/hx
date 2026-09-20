import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * The topbar's persistent patient-identity slot. Wrong-patient errors are a
 * safety issue, so any screen scoped to one patient publishes their identity
 * here with `<PatientBanner />`, and it stays visible in the chrome no matter
 * how far the user scrolls the page content.
 */
const PatientBannerContext = createContext<(node: ReactNode) => void>(() => {})

export function PatientBannerSlot({ children }: { children: (node: ReactNode) => ReactNode }) {
  const [node, setNode] = useState<ReactNode>(null)
  return (
    <PatientBannerContext.Provider value={setNode}>
      {children(node)}
    </PatientBannerContext.Provider>
  )
}

/** Render once per patient-scoped screen: `<PatientBanner mrn="DEMO-0007" age={54} sex="F" />`. */
export function PatientBanner({ mrn, age, sex }: { mrn: string; age?: number; sex?: 'M' | 'F' }) {
  const setNode = useContext(PatientBannerContext)
  useEffect(() => {
    setNode(
      <span className="inline-flex items-center gap-2 rounded-md border border-line-2 bg-surface-2 px-2.5 py-1 text-[12.5px] font-medium">
        <span className="font-mono tracking-[-0.01em] text-ink">{mrn}</span>
        {(age != null || sex) && (
          <span className="text-ink-2">
            {age != null ? `${age}y` : null}
            {age != null && sex ? ' · ' : null}
            {sex ?? null}
          </span>
        )}
      </span>,
    )
    return () => setNode(null)
  }, [mrn, age, sex, setNode])
  return null
}
