/**
 * RETAILEDGE PRO — CANONICAL ASIA/KOLKATA DATE & TIME UTILITIES (FRONTEND)
 *
 * Enforces business timezone (Asia/Kolkata, UTC+05:30):
 * - User local date/time input is interpreted strictly in Asia/Kolkata.
 * - Converted to canonical UTC ISO string ending in 'Z' for API requests.
 * - Displays in Asia/Kolkata regardless of user's browser or device timezone.
 * - Calendar grouping and day headers use Asia/Kolkata date strings (never UTC date split).
 */

const { DateTimeFormat } = Intl;
export const KOLKATA_TZ = 'Asia/Kolkata';

/**
 * Converts a date/time input into a canonical UTC ISO-8601 string ending in 'Z'.
 * If the input is timezone-naive (e.g. 'YYYY-MM-DDTHH:mm'), it is interpreted as Asia/Kolkata.
 * If already full ISO with Z or timezone offset, it is parsed directly.
 * Returns null if input is missing or invalid.
 */
export function kolkataToUtcIso(input) {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input.toISOString();
  }
  const str = String(input).trim();
  if (!str) return null;

  // Already ISO with Z
  if (str.endsWith('Z') || str.endsWith('z')) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Has explicit timezone offset (e.g., +05:30 or -04:00)
  if (/[+-]\d{2}:?\d{2}$/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Timezone-naive datetime-local: YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm(:ss)
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const [, y, m, d, h, min, s] = match;
    const sec = s || '00';

    const year = parseInt(y, 10);
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    const hour = parseInt(h, 10);
    const minute = parseInt(min, 10);
    const second = parseInt(sec, 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
      return null;
    }

    // Asia/Kolkata is strictly UTC+05:30 (no DST)
    const isoWithKolkataOffset = `${y}-${m}-${d}T${h}:${min}:${sec}+05:30`;
    const dateObj = new Date(isoWithKolkataOffset);
    return isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
  }

  // Fallback parsing
  const fallbackDate = new Date(str);
  return isNaN(fallbackDate.getTime()) ? null : fallbackDate.toISOString();
}

/**
 * Converts a canonical UTC ISO string or Date into 'YYYY-MM-DDTHH:mm' in Asia/Kolkata
 * suitable for HTML5 datetime-local form inputs.
 */
export function utcIsoToKolkataLocalInput(dateOrStr) {
  if (!dateOrStr) return '';
  const d = new Date(dateOrStr);
  if (isNaN(d.getTime())) return '';

  const parts = new DateTimeFormat('en-CA', {
    timeZone: KOLKATA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d);

  const map = {};
  for (const p of parts) map[p.type] = p.value;

  let hr = map.hour || '00';
  if (hr === '24') hr = '00';
  return `${map.year}-${map.month}-${map.day}T${hr}:${map.minute}`;
}

/**
 * Returns 'YYYY-MM-DD' representing the calendar date in Asia/Kolkata.
 */
export function getKolkataDateStr(dateOrStr) {
  if (!dateOrStr) return '';
  const d = new Date(dateOrStr);
  if (isNaN(d.getTime())) return '';

  return new DateTimeFormat('en-CA', {
    timeZone: KOLKATA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Returns today's 'YYYY-MM-DD' in Asia/Kolkata.
 */
export function getKolkataTodayStr() {
  return getKolkataDateStr(new Date());
}

/**
 * Formats timestamp for human reading in Asia/Kolkata.
 * Example: "28 Oct 2026, 10:00 am"
 */
export function formatKolkataDateTime(dateOrStr, options = {}) {
  if (!dateOrStr) return '';
  const d = new Date(dateOrStr);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleString('en-IN', {
    timeZone: KOLKATA_TZ,
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options
  });
}

/**
 * Formats time-only in Asia/Kolkata.
 * Example: "10:00 am"
 */
export function formatKolkataTime(dateOrStr, options = {}) {
  if (!dateOrStr) return '';
  const d = new Date(dateOrStr);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleTimeString('en-IN', {
    timeZone: KOLKATA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  });
}

/**
 * Formats date-only in Asia/Kolkata.
 * Handles both timestamps and 'YYYY-MM-DD' date-only strings without timezone drift.
 */
export function formatKolkataDate(dateOrStr, options = {}) {
  if (!dateOrStr) return '';
  let d;
  if (typeof dateOrStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrStr.trim())) {
    d = new Date(`${dateOrStr.trim()}T12:00:00+05:30`);
  } else {
    d = new Date(dateOrStr);
  }
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('en-IN', {
    timeZone: KOLKATA_TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...options
  });
}
