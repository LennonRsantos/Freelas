// Feature switches. Turned-off features stay in the code but never show.

export const FEATURES = {
  /**
   * GPS check-in on the day of the shift. Off until job coordinates come
   * from the full address (today they are the neighborhood center, so a
   * person at the door can be rejected as "too far").
   */
  checkIn: false,
  /**
   * Demo mode with made-up jobs, people and reviews, saved in the browser.
   * Only when NEXT_PUBLIC_DEMO=true and Supabase is not configured;
   * never mixed with real data.
   */
  demo: process.env.NEXT_PUBLIC_DEMO === "true",
} as const;
