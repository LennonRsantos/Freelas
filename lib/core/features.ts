// Feature switches. Turned-off features stay in the code but never show.

export const FEATURES = {
  /**
   * GPS check-in on the day of the shift. Off until job coordinates come
   * from the full address (today they are the neighborhood center, so a
   * person at the door can be rejected as "too far").
   */
  checkIn: false,
} as const;
