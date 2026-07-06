// Shared schedule evaluation utilities.
//
// Data model (mirrors AccessSchedulePanel / FormRenderer):
//   schedule.enabled        — master switch; false → always open
//   schedule.dateRange      — { enabled, startDate, endDate }  (ISO yyyy-mm-dd)
//   schedule.weeklyHours    — { enabled, slots: [{ days[], startTime, endTime }] }
//   schedule.closedMessage  — shown when closed
//
// Semantics: AND across constraints (date window AND weekly hours),
// OR across weekly slots (form opens if any slot matches).
//
// NOTE: day-of-week and time-of-day are derived from the visitor's LOCAL
// clock (getDay / getHours), while the date-window comparison uses the
// UTC date (toISOString). This mirrors the original evaluateSchedule
// implementation. Fixing the timezone inconsistency is a separate task.

export const DAY_NAMES = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

export const DAY_SHORT = {
  sunday: 'Sun', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat',
};

const DEFAULT_CLOSED_MESSAGE = 'This form is currently closed. Please check back later.';

/**
 * Evaluate whether the form is open at a specific moment.
 * @param {object} schedule
 * @param {Date} [date] — defaults to now
 * @returns {boolean}
 */
export function isOpenAt(schedule, date = new Date()) {
  if (!schedule?.enabled) return true;
  const { dateRange, weeklyHours } = schedule;
  const hasAnyConstraint = dateRange?.enabled || weeklyHours?.enabled;
  if (!hasAnyConstraint) return true;

  const currentDay = DAY_NAMES[date.getDay()];
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;
  const currentDate = date.toISOString().slice(0, 10);

  // Date window — must be satisfied if enabled
  if (dateRange?.enabled) {
    const start = dateRange.startDate || '';
    const end = dateRange.endDate || '';
    if (currentDate < start || currentDate > end) return false;
  }

  // Weekly hours — at least one slot must match (OR across slots)
  if (weeklyHours?.enabled) {
    const slots = weeklyHours.slots || [];
    const anySlotOpen = slots.some((slot) => {
      const days = slot.days || [];
      const start = slot.startTime || '00:00';
      const end = slot.endTime || '23:59';
      return days.includes(currentDay) && currentTime >= start && currentTime < end;
    });
    if (!anySlotOpen) return false;
  }

  return true;
}

/** Whether the form is open right now. */
export const isOpenNow = (schedule) => isOpenAt(schedule, new Date());

/**
 * Compatibility wrapper returning the same shape as the original
 * FormRenderer.evaluateSchedule: { open, closedMessage }.
 */
export function evaluateSchedule(schedule) {
  if (!schedule?.enabled) return { open: true, closedMessage: null };
  const open = isOpenAt(schedule, new Date());
  return open
    ? { open: true, closedMessage: null }
    : { open: false, closedMessage: schedule.closedMessage || DEFAULT_CLOSED_MESSAGE };
}

/**
 * Find the next time the open/closed state changes.
 *
 * Generates candidate transition times (slot boundaries + date-window
 * boundaries) for the next 8 days, then returns the earliest one whose
 * open-state differs from the current state.
 *
 * @param {object} schedule
 * @returns {{ at: Date, opening: boolean } | null}
 *   `opening: true`  → form will open at `at`
 *   `opening: false` → form will close at `at`
 *   `null` if no future transition is found (e.g. always-open or
 *   no end in sight within the search window).
 */
export function nextTransition(schedule) {
  if (!schedule?.enabled) return null;
  const { dateRange, weeklyHours } = schedule;
  if (!dateRange?.enabled && !weeklyHours?.enabled) return null;

  const now = new Date();
  const currentlyOpen = isOpenAt(schedule, now);
  const candidates = [];

  // ── Weekly slot boundaries ──────────────────────────────────────────
  if (weeklyHours?.enabled) {
    const slots = weeklyHours.slots || [];
    // Search 9 days forward to cover a full week + same-day edge cases.
    for (let offset = 0; offset < 9; offset++) {
      const day = new Date(now);
      day.setDate(day.getDate() + offset);
      const dayName = DAY_NAMES[day.getDay()];
      slots.forEach((slot) => {
        if (!(slot.days || []).includes(dayName)) return;
        const start = slot.startTime || '00:00';
        const end = slot.endTime || '23:59';
        [start, end].forEach((t) => {
          const [h, m] = t.split(':').map(Number);
          const cand = new Date(day);
          cand.setHours(h, m, 0, 0);
          if (cand > now) candidates.push(cand);
        });
      });
    }
  }

  // ── Date-window boundaries ──────────────────────────────────────────
  if (dateRange?.enabled) {
    const { startDate, endDate } = dateRange;
    if (startDate) {
      // Opens at 00:00 on startDate (if a weekly slot is also open then).
      const [y, mo, d] = startDate.split('-').map(Number);
      const start = new Date(y, mo - 1, d, 0, 0, 0);
      if (start > now) candidates.push(start);
    }
    if (endDate) {
      // Closes at 00:00 the day AFTER endDate (currentDate > end).
      const [y, mo, d] = endDate.split('-').map(Number);
      const end = new Date(y, mo - 1, d + 1, 0, 0, 0);
      if (end > now) candidates.push(end);
    }
  }

  candidates.sort((a, b) => a - b);

  // First candidate whose open-state differs from now.
  for (const cand of candidates) {
    const openAtCand = isOpenAt(schedule, cand);
    if (openAtCand !== currentlyOpen) {
      return { at: cand, opening: openAtCand };
    }
  }

  return null;
}

/**
 * Human-readable relative duration, e.g. "in 2h 14m", "in 3d 5h", "in 12m".
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  if (ms <= 0) return 'now';
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'in <1m';
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) {
    return remMins > 0 ? `in ${hours}h ${remMins}m` : `in ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `in ${days}d ${remHours}h` : `in ${days}d`;
}

/**
 * Format a Date as a short day + time, e.g. "Mon 9:00 AM".
 * Uses the visitor's local timezone.
 */
export function formatDayTime(date) {
  const day = DAY_SHORT[DAY_NAMES[date.getDay()]];
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  const mm = m < 10 ? `0${m}` : m;
  return `${day} ${h}:${mm} ${ampm}`;
}
