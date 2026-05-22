export const BUSINESS_DAY_ROLLOVER_HOUR = 3;

export function startOfBusinessDate(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfBusinessDate(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function getCurrentBusinessDate(now = new Date()): Date {
  const next = new Date(now);
  if (next.getHours() < BUSINESS_DAY_ROLLOVER_HOUR) {
    next.setDate(next.getDate() - 1);
  }
  return startOfBusinessDate(next);
}

export function getBusinessDateRange(date: Date) {
  const start = startOfBusinessDate(date);
  const end = endOfBusinessDate(date);
  return {
    start,
    end,
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
}

export function getBusinessDateKey(date: Date) {
  const d = startOfBusinessDate(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
