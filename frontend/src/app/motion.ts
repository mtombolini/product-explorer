/**
 * The shared motion values. Motion here is short and quiet: it confirms
 * what happened and never delays content or blocks input.
 */
export const motionTokens = {
  /** Seconds. Everything stays between 0.15 and 0.3. */
  duration: { fast: 0.15, base: 0.2, slow: 0.3 },
  /** Starts quickly and settles gently. */
  ease: 'easeOut',
  /** How far, in pixels, an element travels as it appears. */
  revealOffset: 12,
  /** Delay between neighbouring cards of a row, in seconds. */
  stagger: 0.05,
  /** How far, in pixels, a card rises on hover and focus. */
  lift: 4,
} as const;
