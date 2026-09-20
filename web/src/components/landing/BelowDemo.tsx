import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Meter, Ticks } from '@/components/ui/Meter'
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
      <Band title="How it decides what to ask" aside={<TriggerVisual />}>
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

      <Band title="Why it earns its place on the ward" aside={<EvidenceVisual />}>
        <Entry title="Nothing new to learn">
          There is no form, no template to pick and no button to press. You write or dictate the note the way you
          always have. The sheet does its work beside you and stays out of the way.
        </Entry>
        <Entry title="It catches the gap before the note is closed">
          The allergy nobody asked about, the swab count nobody wrote down, the anticoagulant in a patient going to
          theatre. What is still owed is counted in front of you while the patient is still in the room.
        </Entry>
        <Entry title="Quick enough to keep up with typing">
          The sheet answers in a second or two, clause by clause. A whole note costs less than half a cent to check,
          so it can run on every note, not only the important ones.
        </Entry>
        <Entry title="Hands full? Dictate">
          Speak the note and the questions tick themselves off as you talk. It works at the bedside, in clinic and
          straight after scrubbing out.
        </Entry>
        <Entry title="Private by design">
          The demo stores nothing. In the full product the patient's name and record number never leave your own
          record, and the analysis model never writes a word into the note.
        </Entry>
        <Entry title="Measured, not promised">
          Before every release the catalogue is tested against 800 ways real doctors phrase things, from textbook
          diagnoses to ward shorthand and spelling slips. A release ships only when none of them is missed.
        </Entry>
      </Band>

      {bundles && <Catalogue bundles={bundles} />}

      <Band
        title="Where this can go"
        aside={
          <>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-ink-2">
            The engine is small and the checklists are plain notes, so the same idea stretches a long way. These are
            directions, not promises. Tell us which one you need.
          </p>
          <AuditVisual />
          </>
        }
      >
        <Entry title="Teaching the complete history">
          A student takes a history and sees at once what a consultant would have asked next. The same sheet works
          as a marking scheme for clinical exams.
        </Entry>
        <Entry title="Audit without chart review">
          Operative notes are already checked against the Royal College of Surgeons standard for a good record. A
          department could see its documentation quality across every note, with nobody reading charts by hand.
        </Entry>
        <Entry title="Medico-legal peace of mind">
          Consent, counts, specimens, blood loss and the postoperative plan are the lines a complaint turns on. They
          are the lines the sheet refuses to forget.
        </Entry>
        <Entry title="Research data from ordinary notes">
          Every ticked question is a structured answer with the sentence it came from. A registry or a study could
          collect its fields from free text, with no extra form for the doctor.
        </Entry>
        <Entry title="Your specialty, your hospital, your protocol">
          A unit can write its own sets: a local sepsis pathway, a trauma survey, an antenatal booking visit. It
          takes a text editor, not a developer.
        </Entry>
        <Entry title="Inside the systems you already use">
          The checking runs behind one small interface. It can sit beside an existing electronic record, a
          dictation tool or a clinic system and fill their fields from the same note.
        </Entry>
      </Band>

      <Vision />

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

/** Small illustrative cards for the left rail. Built from the product's own parts, so they look like the thing they describe. */
function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div aria-hidden className="mt-6 max-w-sm overflow-hidden rounded-lg border border-line bg-surface shadow-panel">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{label}</span>
        <span className="text-[11px] text-ink-3">Illustration</span>
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  )
}

const mark = 'rounded-[2px] bg-accent/15 px-0.5 text-ink'

/** One phrase opens a set, and the set opens its follow-ups. The names and counts are the catalogue's own. */
function TriggerVisual() {
  const chain: [string, number, number][] = [
    ['Chronic renal failure', 14, 0],
    ['Limb ischemia history', 10, 0],
    ['Sensory symptoms', 9, 0],
  ]
  return (
    <Card label="One phrase">
      <p className="font-mono text-[12.5px] leading-relaxed text-ink">
        “k/c/o <mark className={mark}>DM2</mark> for 8 yrs, on metformin”
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink">Diabetes mellitus</span>
        <Ticks filled={3} total={14} />
      </div>
      <ul className="ms-1 mt-2 flex flex-col gap-1.5 border-s-2 border-line ps-3">
        {chain.map(([name, total, filled]) => (
          <li key={name} className="flex items-center justify-between gap-3">
            <span className="truncate text-[12.5px] text-ink-2">{name}</span>
            <Ticks filled={filled} total={total} />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11.5px] text-ink-3">Three letters, 47 questions a consultant would ask.</p>
    </Card>
  )
}

/** The answer is the doctor's own sentence, never a generated one. */
function EvidenceVisual() {
  const facts: [string, string][] = [
    ['0', 'words written for you'],
    ['< ½¢', 'to check a whole note'],
    ['1 to 2 s', 'behind your typing'],
  ]
  return (
    <>
      <Card label="Copied, never invented">
        <p className="text-[12.5px] leading-relaxed text-ink-2">
          …a 16-French drain was placed. <mark className={mark}>Estimated blood loss was 350 ml.</mark> The abdomen was closed in layers…
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-accent/10 px-2 text-[12px] font-medium text-ink">
            <span className="text-accent">✓</span> Blood loss · 350 mL
          </span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-2 px-2 text-[12px] font-medium text-ink">
            <span className="size-1.5 rounded-full bg-primary" /> Counts correct
          </span>
        </div>
      </Card>
      <dl className="mt-5 grid max-w-sm grid-cols-3 gap-3">
        {facts.map(([v, l]) => (
          <div key={l} className="flex flex-col-reverse gap-1 border-t border-line pt-2.5">
            <dt className="text-[11.5px] leading-snug text-ink-3">{l}</dt>
            <dd className="tnum font-serif text-[20px] font-semibold leading-none text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

/** What a department view could look like. Synthetic figures. */
function AuditVisual() {
  const rows: [string, number, number][] = [
    ['Operative notes', 18, 1],
    ['Admission histories', 14, 3],
    ['Discharge plans', 9, 2],
  ]
  return (
    <Card label="Department audit">
      <ul className="flex flex-col gap-2.5">
        {rows.map(([name, filled, unclear]) => (
          <li key={name}>
            <div className="mb-1 flex items-baseline justify-between text-[12.5px]">
              <span className="text-ink">{name}</span>
              <span className="tnum font-mono text-[11.5px] text-ink-3">{filled * 5}% complete</span>
            </div>
            <Ticks filled={filled} unclear={unclear} total={20} stretch />
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Vision() {
  const lines: [string, string][] = [
    ['An open library of what to ask', 'Written and corrected by clinicians, for every specialty, hospital and language. Owned by nobody, useful to everybody.'],
    ['A machine that checks, and never writes', 'The record stays the doctor\u2019s own words. The machine only notices what is missing, and shows its evidence when it ticks something off.'],
    ['Documentation good enough to build on', 'When every note is complete and structured, handover, audit and research stop being extra work. They fall out of the note you were writing anyway.'],
  ]
  return (
    <section className="border-t border-line py-16 lg:py-20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-strong">The vision</p>
      <h2 className="mt-4 max-w-5xl font-serif text-[28px] font-semibold leading-[1.18] text-ink sm:text-[36px]">
        Medicine already knows what a complete note looks like. That knowledge lives in textbooks and in consultants' heads, and it is
        least available at three in the morning. Hx puts it beside the pen.
      </h2>
      <ol className="mt-10 grid gap-x-12 gap-y-8 lg:grid-cols-3">
        {lines.map(([title, body], i) => (
          <li key={title} className="border-t-2 border-ink pt-4">
            <span className="tnum font-mono text-[12px] text-ink-3">0{i + 1}</span>
            <h3 className="mt-1.5 font-serif text-[19px] font-semibold leading-snug text-ink">{title}</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{body}</p>
          </li>
        ))}
      </ol>
    </section>
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
