---
status: draft
about: Design research brief for dashboard, patient record, note workspace, operative workspace. Feeds UI decisions after Wave 1.
---

# Display research brief

For the "Clinical Notes" build (see `Project/00 Plan.md`, `docs/CONTRACT.md`). What the literature says should shape the record sheet, connection view, dashboard and patient record — using only data this product actually has.

## Ten rules for this product

1. **Interruptive alerts get overridden most, and correctly least** — override rates up to 96%, appropriateness as low as 12% for renal-dose alerts — so the sheet must stay passive, never a modal (Nanji et al. 2014, *JAMIA*, PMID 24166725; Poly et al. 2020, *JMIR Med Inform*, PMID 32706721).
2. **Tailoring what's shown to context is the one design change proven to raise acceptance** — tiering and forced override-reasons did not reliably help; scope every bundle to what's actually relevant (Hussain, Reynolds & Zheng 2019, *JAMIA*, PMID 31206159).
3. **Alert follow-through can collapse to 1–3%** when prompts are constant and generic — a warning for a system that re-checks the note every second (Joglekar et al. 2021, *Appl Clin Inform*, PMID 34107541).
4. **Synoptic/structured operative reporting roughly doubles completeness** over narrative dictation (99.7% vs 64.0% of quality indicators) — the strongest evidence here, and it validates the bundle+field model directly (Vergis et al. 2017, *Surg Obes Relat Dis*, PMID 28433464).
5. **Prompting for the specific field beats having a template on paper**: EMR-prompted fields hit 79.5% documentation vs 45.6% for the same item free-dictated (Karmustaji et al. 2026, *Hernia*, PMID 42507058).
6. **Automation bias is documented across GenAI-assisted clinical tools** (10 of 29 reviewed studies) — every machine-filled field needs visible, correctable provenance, not silent trust (Al-Anezi 2026, *J Healthc Leadersh*, PMID 42445869).
7. **A doctor's edit must never be silently overwritten** — already CONTRACT.md's `source: "doctor"` rule; matches Microsoft's HAX guideline on easy edit/retract (Amershi et al. 2019, ACM CHI, https://doi.org/10.1145/3290605.3300233).
8. **Structured templates save time as well as filling more fields**: a hernia template raised captured variables from 5.9 to 20 of 21, and same-day completion from 80% to 100% (Vetter & Kim 2021, *Health Inf Manag*, PMID 33840243).
9. **Patient identity must stay visible everywhere, via two-plus identifiers, never colour alone** (ONC SAFER Guide: Patient Identification, 2024/2025, healthit.gov/topic/safety/safer-guides; NHS Common User Interface patient-banner standard, digital.nhs.uk ISB 1500-1508).
10. **Lab/vital trends should look like Powsner & Tufte's compressed time-series, not a table** — the one clinical-graphics format with a 30-year record of being read correctly at a glance (Powsner & Tufte 1994, *Lancet*, PMID 7914312).

## 1. Alert and prompt fatigue

Override rates for interruptive alerts run 46–96%, and appropriateness varies by type from 12% (renal) to 100% (allergy) — the *type*, not the volume, drives ignoring (Poly et al. 2020, PMID 32706721; Nanji et al. 2018, *JAMIA*, PMID 29092059). A systematic review of interaction designs found the conventional pop-up accepted least of all, and role/context-tailoring the only alternative that reliably raised acceptance — tiering and mandatory override-reasons did not (Hussain et al. 2019, PMID 31206159). Narrowing which triggers fire beats any UI layered on top of a noisy one: excluding stat-dose co-prescriptions cut one alert's volume 29% and adherence rose with it (Sundermann et al. 2024, *Int J Med Inform*, PMID 38518676). At the low end, follow-through as low as 1–3% has been measured for broad, constant alerts (Joglekar et al. 2021, PMID 34107541). A 2024 human-factors CDS guideline recommends passive over interruptive design wherever possible but gives no numeric cap on simultaneous prompts (Awad et al. 2024, *Mayo Clin Proc Digit Health*); the cap below is design judgment.

**So we should:**
- Never use a modal for anything Jev finds; all items live passively on the sheet.
- Only show items from bundles the note has actually triggered (`open`) — no generic superset.
- Cap emphasized unanswered items at roughly 3–5 per bundle; collapse the rest under "N more" (judgment call, following the fatigue-at-volume finding above).
- Tune the `p` thresholds per bundle type using real override/dismiss data, the way Sundermann's team tuned a single noisy alert.
- Never require a reason to dismiss a field — mandatory override reasons didn't improve appropriateness in the cited reviews.

## 2. Structured vs free-text documentation

The best-supported claim in this brief. Synoptic reports beat narrative dictation on every completeness measure studied: 99.7% vs 64.0% of validated quality indicators for gastric bypass (Vergis et al. 2017, PMID 28433464); up to 92% vs <70% completion across a review of synoptic-vs-narrative studies (Dumitra et al. 2014, *J Surg Educ*, PMID 25456406); a 2026 pediatric-oncology study found synoptic reports significantly better at capturing resection completeness and margins, with 94% surgeon agreement and a System Usability Scale of 81 (Abdelhafeez et al. 2026, *Pediatr Blood Cancer*, PMID 41491784). Outside the OR, a hernia clinic template raised captured variables from 5.9 to 20 of 21 (Vetter & Kim 2021, PMID 33840243), and an asthma template raised severity documentation from 44% to 71% (Beck et al. 2012, *Hosp Pediatr*, PMID 24313025). Prompted fields beat the same field free-dictated even within one EMR (79.5% vs 45.6%, Karmustaji et al. 2026, PMID 42507058). Free text isn't faster either: PCPs using it for history and plan reported routinely spending an extra hour per half-day clinic regardless of style (Makam et al. 2013, *BMC Med Inform Decis Mak*, PMID 24070335).

**So we should:**
- Trust the bundle/item architecture — it's structurally the same intervention that produced the largest completeness gains found anywhere here.
- Prioritise the fields narrative notes miss most: margins/resection completeness, node counts, closure/mesh details — these map to the op-event/op-procedure bundles already planned.
- Keep the note itself free-text; let structure emerge only on the sheet, matching every cited study's design (synoptic *report*, narrative *dictation* as input).

## 3. The auto-filled record sheet

Direct evidence on "machine fills a field, human corrects it" is thin, but adjacent evidence agrees. A 2026 review of GenAI-assisted clinical tools found automation bias in 10/29 studies and deskilling/reduced reasoning in 9, naming human-in-the-loop review and explainability as the mitigations (Al-Anezi 2026, PMID 42445869). A GPT-4 discharge-summary pipeline got positive ratings on 89% of test cases but still required review of every case (Carenzo et al. 2026, *JMIR AI*, PMID 42398933). Microsoft's *Guidelines for Human-AI Interaction* gives directly usable rules: show contextually relevant confidence, make capabilities clear up front, make output easy to edit/retract, and notify the user when output changes after the fact (Amershi et al. 2019, https://doi.org/10.1145/3290605.3300233) — the last matters because a field's evidence sentence can move as the note is edited. Google's PAIR guidebook cautions that raw confidence percentages are frequently misread and should be user-tested, not assumed legible (pair.withgoogle.com/guidebook-v2/chapter/explainability-trust).

**So we should:**
- Three visually distinct states, not two: empty, machine-filled (`source: "jev"`), doctor-edited (`source: "doctor"`) — never let the last two look alike.
- Show provenance, not a number: highlight the evidence span on hover/focus instead of a percentage.
- Use the `p` bucketing (filled/unclear/empty) only as a subtle cue, never a blocking gate — "unclear" stays editable.
- A locked/doctor-edited field is never silently re-offered or overwritten by a later Jev pass — non-negotiable in the UI, not just the API.
- One-click "revert to Jev's evidence" for any edited field, using the last `known` value already in the API.
- No aggregate "AI confidence: 92%" anywhere — no evidence it helps, and PAIR/automation-bias literature both point toward evidence over scores.

## 4. Patient record and dashboard

No dashboard-layout RCT evidence was found; recommendations draw on NN/g's complex-application heuristics (reduce clutter without reducing capability, nngroup.com/articles/complex-application-design) and Powsner & Tufte's compressed time-series for trends (PMID 7914312). NHS's patient-banner convention — demographics fixed at the top of every screen — is now folded into ONC's SAFER Patient Identification guide, whose 2024 revision asks for two-plus identifiers shown consistently everywhere (healthit.gov/topic/safety/safer-guides).

**Dashboard**, using only `DashboardStats`/`Patient` fields that exist:
1. Open drafts (`openDrafts`) — actionable, first.
2. Most-missed fields (`mostMissed`) — the one module with direct literature support: it turns section 2's completeness finding into a feedback loop.
3. Completeness trend as a sparkline, not a single number (`completenessByWeek`).
4. Patient list by MRN (`patients`), sortable by `lastEncounterAt`.
5. Case mix by system (`bySystem`) — lowest priority, informational.

**Patient record**, using `Patient`/`Encounter`/`encounter_facts`:
1. Persistent banner: MRN + sex + birth year — the scrubbed-name-safe two-identifier pair this product already has.
2. Encounter timeline (`encounters`, `status`, `finalizedAt`).
3. Problem list from ever-opened bundle ids across encounters — no new data model needed.
4. Trend sparklines for recurring numeric facts (HbA1c, BP, weight) from `encounter_facts`.

**Leave out (vanity metrics):** total notes, tokens/cost, raw Jev call counts, productivity counts, streaks/badges — none map to a safety or completeness outcome in the cited literature, and streaks risk turning documentation into a metric-chasing exercise.

## 5. Showing connections between findings

No direct literature compares threaded lists, breadcrumbs and local graphs for "this fired because of that" provenance; this is design judgment against the product's own data. CONTRACT.md's `link`/`reason` on an `Item` already is a directed, reason-labeled edge (Diabetes.hba1c → renal, reason: nephropathy) — exactly what a breadcrumb needs.

- **Full graph** (Obsidian-style): matches the link data 1:1 but becomes a hairball at scale and isn't scannable mid-consultation; duplicates the vault's authoring-facing graph for the wrong audience.
- **Nested/threaded list**: each opened bundle shown as a child of the item that triggered it ("Renal — opened because HbA1c 9.2%"). Reuses the sheet's own list UI, scales to the 2–3 links a note typically fires. Doesn't show cross-links between siblings.
- **Breadcrumb only**: cheapest, but drops the `reason` text — the actually useful part.

**Recommendation: nested/threaded list with an inline reason.** Needs no new component, surfaces `reason` directly, stays legible at 5–6 fired bundles where a graph wouldn't. Reserve a small local graph (this bundle and its immediate links only) for an on-demand "why is this here" detail view, never the default.

**So we should:** render each opened bundle with one line — "Opened because {reason} — from {triggering item}", clicking scrolls to the field. No full graph visualisation in the product UI; keep Obsidian's graph as an authoring tool only.

## 6. Safety and usability standards

ONC's SAFER Guides (2024/2025) require two-plus identifiers shown consistently across every screen and print-out, and apply "never colour alone" / "units always shown" to orders and alerts (healthit.gov/topic/safety/safer-guides). NHS's Common User Interface programme established the fixed-position banner and red/amber/green-plus-non-colour-cue convention still cited as reference design (digital.nhs.uk ISB 1500-1508). No evidence was found for NEWS2-specific chart conventions in this non-monitoring context — treat NEWS2 only as a reference for colour+symbol pairing, not a chart to replicate.

**So we should:**
- Persistent patient banner (MRN, sex, birth year) on every screen, not just the patient record.
- Every numeric field always shows its unit next to the number — never a bare "8.2."
- Never encode field state by colour alone — pair with an icon or label.
- Standardise number formatting (consistent decimals per field type) and use one unambiguous date format throughout — no direct evidence found for either; both are inherited safety/legibility practice, applied here because our first doctor reads dates in a non-US convention.
- Never truncate an evidence sentence or field value without an explicit "show more" — truncation hides what a doctor needs to verify a machine-filled field.

## 7. Dictation UX

No clinical-documentation-specific literature was found on interim-vs-final transcript display; this draws on general streaming-ASR practice plus one adjacent workflow study. Interim ("partial") ASR results are unstable by design and get revised as more audio arrives; rendering every micro-revision causes visible flicker that erodes trust, so standard practice is to visually distinguish provisional from committed text and debounce re-renders (industry guidance, not peer-reviewed: speechmatics.com). A qualitative study of ED consultants working with human scribes — the closest studied analogue to "something transcribes while I talk" — found most valued not breaking flow to type, but the minority who declined cited losing the cognitive-processing value of writing it themselves and losing nuance to templated capture (Cowan et al. 2017, *Emerg Med J*, PMID 28971848).

**So we should:**
- Interim words visually lighter than committed text — standard ASR practice, not clinical-specific evidence.
- Never let sheet fields re-highlight or jump on every partial update; only re-run extraction against committed text or after a short pause, matching the ~370ms Jev budget already measured (00 Plan.md).
- Keep correction controls minimal and reachable without breaking gaze from the note — Cowan et al.'s doctors valued not breaking flow.
- Don't auto-restructure dictated sentences before the doctor finishes speaking; let the note stay raw and let the *sheet* carry structure, per section 2 and Cowan et al.'s finding that doctors resent losing their own phrasing.

## Recommended content for each screen

**Dashboard**: open drafts → most-missed fields → completeness trend (sparkline) → patient list by MRN → case mix by system.

**Patient record**: persistent banner (MRN/sex/birth year) → encounter timeline → problem list from opened bundles → trend sparklines for recurring facts.

**Note workspace**: dictation pane left (interim/final distinction) → record sheet right, bundles nested with field state → "opened because" connection line per bundle → hover evidence-highlight linking field to sentence.

**Operative workspace**: same split → op-core bundle (procedure, indication) fixed at top → op-event bundles appear in trigger order, not alphabetical, to support synoptic completeness → same connection-threading and evidence-highlight components, no bespoke UI.

**Public demo landing page** (no storage, per CONTRACT.md): one example note showing the sheet fill live — the single most convincing demonstration of section 2's core claim — no patient banner, no MRN, no login, and a visible one-line notice that nothing is saved.

## What to leave out

- Blocking/interruptive alerts of any kind.
- A raw numeric "AI confidence" display anywhere on the sheet.
- A full interactive graph of bundle connections in the product UI — Obsidian-only.
- Vanity dashboard metrics: note counts, tokens/cost, call counts, streaks/badges.
- Auto-restructuring dictated sentences before the doctor finishes speaking.
- Colour-only status coding anywhere.
- Mandatory "reason for dismissal" fields.

## Open questions for the doctor

1. Should "most missed fields" be scoped per operation/history type, or aggregated — aggregating may bury specialty-specific signal.
2. Which fields should never count toward "most missed" because omitting them is often clinically correct (e.g. bowel-viability judgment calls already flagged in 00 Plan.md)?
3. Is MRN + sex + birth year enough as the "two-plus identifiers" SAFER asks for, or do you want a photo/third identifier given shared-surname risk in some Egyptian clinics?
4. How many bundles deep does a real note typically chain (diabetes → renal → ?) — determines whether the connection list needs a scroll affordance.
5. Should the "opened because" text be the vault's authoring `reason` string verbatim, or does it need rewriting for a clinical reader?

## References

1. Nanji KC, Seger DL, Slight SP, et al. Medication-related CDS alert overrides in inpatients. *J Am Med Inform Assoc*. 2018;25(5):476-481. PMID 29092059.
2. Nanji KC, Slight SP, Seger DL, et al. Overrides of medication-related CDS alerts in outpatients. *J Am Med Inform Assoc*. 2014;21(3):487-491. PMID 24166725.
3. Poly TN, Islam MM, Yang HC, Li YJ. Appropriateness of Overridden Alerts in CPOE: Systematic Review. *JMIR Med Inform*. 2020;8(7):e15653. PMID 32706721.
4. Hussain MI, Reynolds TL, Zheng K. Medication safety alert fatigue may be reduced via interaction design and clinical role tailoring: systematic review. *J Am Med Inform Assoc*. 2019;26(10):1141-1149. PMID 31206159.
5. Sundermann M, Clendon O, McNeill R, Doogue M, Chin PKL. Optimising interruptive CDS alerts for antithrombotic duplicate prescribing. *Int J Med Inform*. 2024;186:105418. PMID 38518676.
6. Joglekar NN, Patel Y, Keller MS. Evaluation of CDS to Reduce Sedative-Hypnotic Prescribing in Older Adults. *Appl Clin Inform*. 2021;12(3):436-444. PMID 34107541.
7. Awad S, Loveday T, Lau R, Baysari MT. Development of a Human Factors-Based Guideline for CDS Design, Evaluation and Continuous Improvement. *Mayo Clin Proc Digit Health*. 2024. https://doi.org/10.1016/j.mcpdig.2024.100182.
8. Vergis A, Stogryn SE, Mullan MJ, Hardy K. Electronic synoptic reporting: completeness of synoptic vs narrative reports for RYGB. *Surg Obes Relat Dis*. 2017;13(11):1863-1868. PMID 28433464.
9. Dumitra S, Wong SM, Meterissian S, Featherstone R, Barkun J, Fata P. The operative dictation: a review of how this skill is taught and assessed. *J Surg Educ*. 2014;72(2):321-329. PMID 25456406.
10. Abdelhafeez AH, Harrison D, Loh A, et al. Effectiveness of Synoptic Reports in Pediatric Surgical Oncology. *Pediatr Blood Cancer*. 2026;73(3):e70075. PMID 41491784.
11. Karmustaji A, Alahmed S, Yang Y, Chiu C, Meneghetti A, Liu Hennessey RQ. Quality review of ventral hernia repair operative reports. *Hernia*. 2026;30(1). PMID 42507058.
12. Vetter CD, Kim JH. Impact of structured note templates on data capture for hernia surgery. *Health Inf Manag*. 2021;52(2):87-91. PMID 33840243.
13. Beck AF, Sauers HS, Kahn RS, Yau C, Weiser J, Simmons JM. Improved documentation and care planning with an asthma-specific H&P. *Hosp Pediatr*. 2012;2(4):194-201. PMID 24313025.
14. Makam AN, Lanham HJ, Batchelor K, et al. Use and satisfaction with key functions of a commercial EHR. *BMC Med Inform Decis Mak*. 2013;13:86. PMID 24070335.
15. Al-Anezi FM. Generative AI in Healthcare: Automation Bias, Deskilling, and Cognitive Implications. *J Healthc Leadersh*. 2026;18:590498. PMID 42445869.
16. Carenzo C, Goldsmith K, Arribas M, et al. Real-World Implementation of LLMs for Writing Clinical Discharge Summaries. *JMIR AI*. 2026;5:e88816. PMID 42398933.
17. Cowan TL, Dunlop WA, Ben-Meir M, et al. Emergency consultants value medical scribes and most prefer to work with them. *Emerg Med J*. 2017;35(1):12-17. PMID 28971848.
18. Powsner SM, Tufte ER. Graphical summary of patient status. *Lancet*. 1994;344(8919):386-389. PMID 7914312.
19. Amershi S, Weld D, Vorvoreanu M, et al. Guidelines for Human-AI Interaction. *Proc CHI 2019*. https://doi.org/10.1145/3290605.3300233.
20. Google PAIR. People + AI Guidebook — Explainability + Trust. https://pair.withgoogle.com/guidebook-v2/chapter/explainability-trust/.
21. Nielsen Norman Group. 8 Design Guidelines for Complex Applications. https://www.nngroup.com/articles/complex-application-design/.
22. Office of the National Coordinator for Health IT. SAFER Guides (2024/2025), Patient Identification and CPOE with Decision Support. https://www.healthit.gov/topic/safety/safer-guides.
23. NHS Digital / NHS England. ISB 1500-1508: Common User Interface. https://digital.nhs.uk/data-and-information/information-standards/information-standards-and-data-collections-including-extractions/publications-and-notifications/standards-and-collections/isb-1500-1508-common-user-interface.
24. Speechmatics. Guide to Building Voice AI Applications With Real-Time Transcription (industry guidance, not peer-reviewed). https://www.speechmatics.com/company/articles-and-news/guide-to-building-voice-ai-applications-with-real-time-transcription.

*No direct evidence found (flagged in-text as design judgment): NEWS2 chart conventions for a non-monitoring product; numeric caps on simultaneous prompts; number/date formatting; threaded-list vs graph comparison; interim/final dictation display in a clinical-documentation study specifically.*
