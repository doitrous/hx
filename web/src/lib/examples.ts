// Public-demo example notes (see web/README.md, "THE PUBLIC DEMO LANDING").
// Invented details only — no real patient. Written so the sheet visibly
// fills as the text types itself in: a pain complaint, a chronic condition,
// a family history and a set of pertinent negatives for clinical; a named
// procedure, an intra-operative event and a closure detail for operative.

export type ExampleId = 'clinical' | 'operative'

export type Example = {
  id: ExampleId
  mode: 'clinical' | 'operative'
  label: string
  text: string
}

export const EXAMPLES: Record<ExampleId, Example> = {
  clinical: {
    id: 'clinical',
    mode: 'clinical',
    label: 'Clinical — epigastric pain',
    text: `A 54-year-old man presents with a 3-day history of epigastric pain, described as a burning ache that comes on after meals and sometimes wakes him at night. The pain does not radiate. He denies vomiting or haematemesis. He has had type 2 diabetes mellitus for eight years, currently managed with metformin and gliclazide, and admits to occasionally missing his evening dose. He denies chest pain and denies any change in bowel habit. There is no weight loss. His father has hypertension; his mother is well and there is no family history of malignancy. He does not smoke and drinks alcohol occasionally. On direct questioning he denies jaundice or dark urine.`,
  },
  operative: {
    id: 'operative',
    mode: 'operative',
    label: 'Operative — lap chole, converted',
    text: `Operation note. Date and time: 14 March 2026, 09:20, elective admission. Surgeon: Mr Adel, assisted by Dr Youssef. Anaesthesia: general anaesthesia with endotracheal intubation. Diagnosis: symptomatic cholelithiasis. Procedure: laparoscopic cholecystectomy, converted to open cholecystectomy. Findings: a thick-walled, chronically inflamed gallbladder densely adherent to the porta hepatis. During dissection of Calot's triangle there was brisk bleeding from the cystic artery, which obscured the operative field and could not be controlled laparoscopically, so the decision was made to convert to an open procedure through a right subcostal incision. The cystic artery was identified and ligated with 2-0 silk and haemostasis was secured. The gallbladder was removed in the standard fashion. A 16-French closed suction drain was placed in the subhepatic space and brought out through a separate stab incision. Estimated blood loss was 350 ml. The abdomen was closed in layers and the patient was transferred to recovery in stable condition.`,
  },
}
