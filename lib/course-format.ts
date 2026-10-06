// Client-safe course helpers (no DB imports) — used by both server pages and
// client components like BookingButton.

/** Law-enforcement training is always delivered privately — no public seat booking. */
export function isRequestOnly(audience: string): boolean {
  return audience === "law_enforcement";
}

export function formatCourseDate(d: Date | string, opts?: { weekday?: boolean }) {
  return new Date(d).toLocaleDateString("en-US", {
    ...(opts?.weekday ? { weekday: "short" } : {}),
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });
}

export function formatPrice(price: string | number) {
  const n = Number(price);
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}
