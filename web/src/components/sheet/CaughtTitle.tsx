import { triggerStyle } from './triggerColor'

/** A set's title, wearing the colour of the words in the note that opened it. */
export function CaughtTitle({ title, caught }: { title: string; caught?: { hue: string; phrase: string } }) {
  if (!caught) return <>{title}</>
  return (
    <span title={`Opened by “${caught.phrase}” in the note`} style={{ ...triggerStyle(caught.hue), padding: '1px 4px', margin: '0 -4px' }}>
      {title}
    </span>
  )
}
