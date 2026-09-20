import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Meter } from '@/components/ui/Meter'
import type { Bundle } from '@/lib/types'
import { GitHubStar, REPO_URL } from './GitHubStar'

/**
 * Everything under the demo. Editorial, not a feature grid: a serif heading in
 * the left rail, ruled entries on the right, the same wide container and left
 * edge as the hero and the workspace above it.
 */
export function BelowDemo({ bundles, accounts }: { bundles: Bundle[] | null; accounts: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-8">
      <Band title="How it decides what to ask">
        <Entry title="A phrase opens its questions">
          Mention diabetes, a pain, a stoma or a drain and the questions clinicians normally ask about it appear. One
          set can open another: diabetes brings a kidney screen, a bowel resection brings the drain and the leak test.
          Nothing appears that the note has not triggered, and nothing interrupts you to ask it.
        </Entry>
        <Entry title="It reads the way doctors write">
          “k/c/o DM2, HTN, IHD s/p PCI”, “on marevan”, “hypertention for 5 yrs”. Abbreviations, ward shorthand and
          typing slips open the same questions as the full words. A relative's illness or a diagnosis you ruled out
          does not.
        </Entry>
        <Entry title="It never invents text">
          Every answer is copied from your note: the exact clause, or a number or pressure lifted out of it. Point at
          a ticked question to see the words it came from, lit up in the note. If you did not say it, the question
          stays open.
        </Entry>
        <Entry title="Your correction is final">
          Answer a question yourself or mark it not relevant, and it is never asked again or overwritten, even if you
          keep editing the note.
        </Entry>
      </Band>

      {bundles && <Catalogue bundles={bundles} />}

      {!accounts && <ComingSoon />}

      <OpenSource />
    </div>
  )
}

function Band({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-x-16 gap-y-6 border-t border-line py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="lg:sticky lg:top-8 lg:self-start">
        <h2 className="font-serif text-[24px] font-semibold leading-tight text-ink">{title}</h2>
        {aside}
      </div>
      <div className="flex max-w-3xl flex-col divide-y divide-line">{children}</div>
    </section>
  )
}

function Entry({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="py-6 first:pt-0 last:pb-0">
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{children}</p>
    </article>
  )
}

/** Counted from the live catalogue, so the page can never drift from what the demo actually knows. */
function Catalogue({ bundles }: { bundles: Bundle[] }) {
  const questions = bundles.reduce((n, b) => n + b.items.length, 0)
  const links = bundles.reduce((n, b) => n + b.items.filter((i) => i.link).length, 0)
  const operative = bundles.filter((b) => b.kind.startsWith('op-')).length
  const systems = new Set(bundles.map((b) => b.system)).size
  const figures: [string, string][] = [
    [String(bundles.length - operative), 'history and examination sets'],
    [String(operative), 'operative procedures and events'],
    [questions.toLocaleString('en'), 'individual questions'],
    [String(links), 'connections between sets'],
    [String(systems), 'body systems and specialties'],
  ]
  return (
    <section className="border-t border-line py-10">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">What the demo knows today</h2>
      <dl className="mt-5 grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {figures.map(([value, label]) => (
          <div key={label} className="flex flex-col-reverse gap-1">
            <dt className="text-[13px] leading-snug text-ink-2">{label}</dt>
            <dd className="tnum font-serif text-[30px] font-semibold leading-none text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

const PREVIEW = [
  { mrn: '104-2231', label: 'Epigastric pain, type 2 diabetes', when: 'Today', pct: 86 },
  { mrn: '098-7714', label: 'Right hemicolectomy, operative note', when: 'Yesterday', pct: 100 },
  { mrn: '101-3390', label: 'Neck swelling, thyroid', when: '3 days ago', pct: 62 },
]

function ComingSoon() {
  return (
    <Band
      title="Accounts and patient records"
      aside={
        <>
          <Badge tone="primary" dot className="mt-3">
            Coming soon
          </Badge>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-ink-2">
            The demo above forgets everything when you close the tab. The full product keeps the record, under your
            own login.
          </p>
          {/* Illustrative only: synthetic rows showing what a doctor's patient list will look like. */}
          <div aria-hidden className="mt-6 max-w-sm overflow-hidden rounded-lg border border-line bg-surface shadow-panel">
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Patients</span>
              <span className="text-[11px] text-ink-3">Preview</span>
            </div>
            {PREVIEW.map((row) => (
              <div key={row.mrn} className="flex items-center gap-3 border-b border-line/70 px-3.5 py-2.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="tnum font-mono text-[12px] text-ink">MRN {row.mrn}</p>
                  <p className="truncate text-[12px] text-ink-2">{row.label}</p>
                </div>
                <div className="w-20 shrink-0">
                  <Meter value={row.pct} size="sm" tone="neutral" />
                  <p className="mt-1 text-end text-[10.5px] text-ink-3">{row.when}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      }
    >
      <Entry title="Your own login">
        Your patients, notes and corrections are yours alone. Nothing is shared between doctors.
      </Entry>
      <Entry title="Patients by medical record number">
        You choose the patient by MRN before you write. The patient's name and MRN stay in your record and are never
        sent to the analysis model, even if you dictate the name out loud.
      </Entry>
      <Entry title="A medical record that fills itself">
        Every history, examination and operative note lands in the patient's record, each answer in its place and
        still editable. Finalize a note and it becomes read-only, with its open questions on file.
      </Entry>
      <Entry title="A dashboard of what is still owed">
        See which notes are unfinished, how complete your documentation is over time, and which questions you most
        often leave open.
      </Entry>
    </Band>
  )
}

function OpenSource() {
  return (
    <Band
      title="Open source, and the medicine is not code"
      aside={
        <>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-ink-2">
            Hx is free and MIT licensed. If it is useful to you, a star on GitHub is how other doctors find it.
          </p>
          <GitHubStar size="lg" className="mt-5" />
        </>
      }
    >
      <Entry title="Every checklist is a plain note">
        A trigger, the questions, and what it connects to. Diabetes links to a kidney screen, cirrhosis links to
        varices. No programming is needed to read one or to correct one.
      </Entry>
      <Entry title="If a list is wrong, fix it">
        Missing a question you always ask? Disagree with one? Open the note, change the line, and send it. Every
        change is checked against hundreds of real-world phrasings before it ships.
      </Entry>
      <Entry title="Run it yourself">
        The whole thing is one container and one key.{' '}
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="font-medium text-ink underline decoration-line-2 underline-offset-2 hover:decoration-ink-3">
          github.com/doitrous/hx
        </a>
      </Entry>
    </Band>
  )
}
