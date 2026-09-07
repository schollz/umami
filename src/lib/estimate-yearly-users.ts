const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function estimateYearlyUsers(
  visitors: number,
  startAt: number,
  endAt: number,
  now: number,
): number {
  if (
    !Number.isFinite(visitors) ||
    !Number.isFinite(startAt) ||
    !Number.isFinite(endAt) ||
    !Number.isFinite(now) ||
    visitors <= 0 ||
    endAt < startAt ||
    now < startAt
  ) {
    return 0;
  }

  const elapsedDays = Math.max(1, (Math.min(endAt, now) - startAt) / MILLISECONDS_PER_DAY);
  const estimate = (visitors / elapsedDays) * 365;

  return Number.isFinite(estimate) ? estimate : 0;
}
