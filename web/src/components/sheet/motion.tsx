/**
 * Two authored moments that belong to the record sheet only, kept out of the
 * shared `index.css` (owned by the foundation wave) rather than added to it:
 *
 *  - `cn-ink-settle`: a field filling gets a one-shot underline sweep.
 *  - `cn-pulse-scale`: "Next to document" scrolls to a blank and pulses it —
 *    transform only, per the hard rule against opacity on page content.
 *
 * Rendered once by RecordSheet. Respects prefers-reduced-motion itself,
 * matching index.css's blanket collapse for everything else.
 */
export function SheetMotionStyles() {
  return (
    <style>{`
      @keyframes cn-ink-settle {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }
      .cn-ink-settle {
        transform-origin: left;
        animation: cn-ink-settle 900ms var(--ease-out-quint, cubic-bezier(0.22, 1, 0.36, 1)) both;
      }
      @keyframes cn-pulse-scale {
        0% { transform: scale(1); }
        35% { transform: scale(1.018); }
        100% { transform: scale(1); }
      }
      .cn-pulse-scale {
        animation: cn-pulse-scale 600ms var(--ease-out-quint, cubic-bezier(0.22, 1, 0.36, 1));
      }
      @keyframes cn-tick-in {
        from { transform: scale(0.4); }
        to { transform: none; }
      }
      .cn-tick-in { animation: cn-tick-in 420ms var(--ease-out-quint, cubic-bezier(0.22, 1, 0.36, 1)); }
      /* Only while an analysis is in flight, so it is a progress cue, not ambient motion. */
      @keyframes cn-scan {
        from { transform: translateX(-100%); }
        to { transform: translateX(300%); }
      }
      .cn-scan { animation: cn-scan 900ms linear infinite; }
      @media (prefers-reduced-motion: reduce) {
        .cn-ink-settle, .cn-pulse-scale, .cn-scan, .cn-tick-in { animation: none !important; }
      }
    `}</style>
  )
}
