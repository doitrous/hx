// Regex candidate extraction for number/bp/duration item types. Jev never invents a value:
// code finds candidates in the evidence sentence, and either uses the only one, asks Jev to
// pick among several, or reports none found.

// Digits, plus number words because dictation writes "four ports". The value stays a substring of the note.
const NUMBER_RE = /\b(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi;
const BP_RE = /\b(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})\b/gi;
const NUMBER_WORDS = "one two three four five six seven eight nine ten eleven twelve".split(" ");
const DURATION_RE = new RegExp(
  `\\b(?:\\d+|${NUMBER_WORDS.join("|")})\\s+(?:day|days|week|weeks|month|months|year|years|hour|hours|minute|minutes)\\b`,
  "gi"
);

// itemType is the raw item.type string, e.g. "number", "number %", "bp", "duration".
export function extractCandidates(itemType, sentenceText) {
  if (itemType === "bp") {
    // "130 over 85" and "130/85" both normalise to the canonical "systolic/diastolic" form:
    // this is a reformat of the same two numbers already in the note, not an invented value.
    const seen = new Set();
    for (const m of sentenceText.matchAll(BP_RE)) seen.add(`${m[1]}/${m[2]}`);
    return [...seen];
  }
  if (itemType === "duration") {
    return [...new Set([...sentenceText.matchAll(DURATION_RE)].map((m) => m[0]))];
  }
  if (itemType === "number" || itemType.startsWith("number ")) {
    return [...new Set([...sentenceText.matchAll(NUMBER_RE)].map((m) => m[0]))];
  }
  return [];
}

// "number %" -> "%", "number" -> undefined.
export function unitOf(itemType) {
  if (itemType === "bp" || itemType === "duration" || itemType === "text" || itemType === "presence") return undefined;
  const [, unit] = itemType.split(" ");
  return unit;
}
