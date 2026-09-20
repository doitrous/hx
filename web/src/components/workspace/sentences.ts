export type Sentence = { start: number; end: number }

/**
 * Rough sentence tokenizer for hover hit-testing only — not a linguistic
 * parser. Splits on `.`/`!`/`?` followed by whitespace (or end of text) and
 * on blank lines, keeping the trailing punctuation/whitespace with each
 * sentence so spans are contiguous and cover the whole text.
 */
export function splitSentences(text: string): Sentence[] {
  const sentences: Sentence[] = []
  const re = /[^.!?\n]+[.!?]*(?:\n+|\s+|$)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (!match[0].trim()) continue
    sentences.push({ start: match.index, end: match.index + match[0].length })
  }
  return sentences
}

export function sentenceIndexAtOffset(sentences: Sentence[], offset: number): number {
  return sentences.findIndex((s) => offset >= s.start && offset < s.end)
}

/** Which sentence a field's evidence span belongs to — matched by midpoint, with an overlap fallback. */
export function sentenceIndexForRange(sentences: Sentence[], start: number, end: number): number {
  const mid = (start + end) / 2
  const byMidpoint = sentences.findIndex((s) => mid >= s.start && mid < s.end)
  if (byMidpoint !== -1) return byMidpoint
  return sentences.findIndex((s) => start < s.end && end > s.start)
}
