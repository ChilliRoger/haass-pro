/**
 * date-rules.js
 *
 * Pure validation functions for travel dates in the Weather-Based Travel Recommendation service.
 * Enforces business rules R-20, R-21, R-22, R-23 from docs/01-requirements-analysis.md.
 *
 * All functions take "today" as an explicit argument for deterministic testing.
 * Plain ASCII - no emojis.
 */

export const ERROR_PAST_DATE = 'Travel Date cannot be in the past.';
export const ERROR_BEYOND_12_MONTHS = 'Travel Date must be within the next 12 months.';
export const ERROR_INVALID_FORMAT = 'Invalid travel date format. Expected YYYY-MM-DD.';

/**
 * Normalises a date input (string YYYY-MM-DD or Date instance) to a UTC calendar date at 00:00:00.000.
 *
 * @param {string | Date} input - Date string or Date instance
 * @returns {Date} Date instance set to UTC midnight
 * @throws {Error} If date format or values are invalid
 */
export function parseCalendarDate(input) {
  if (!input) {
    throw new Error(ERROR_INVALID_FORMAT);
  }

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new Error(ERROR_INVALID_FORMAT);
    }
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (!match) {
      throw new Error(ERROR_INVALID_FORMAT);
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);

    const parsed = new Date(Date.UTC(year, month, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month ||
      parsed.getUTCDate() !== day
    ) {
      throw new Error(ERROR_INVALID_FORMAT);
    }
    return parsed;
  }

  throw new Error(ERROR_INVALID_FORMAT);
}

/**
 * Calculates the exact upper boundary date (12 months from today).
 * Properly handles month day counts and leap year boundaries (e.g. Feb 29 -> Feb 28 next year).
 *
 * @param {string | Date} today - Base reference date
 * @returns {Date} UTC calendar date exactly 12 months in the future
 */
export function calculate12MonthsHorizon(today) {
  const base = parseCalendarDate(today);
  const targetYear = base.getUTCFullYear() + 1;
  const targetMonth = base.getUTCMonth();
  const targetDay = base.getUTCDate();

  // Find max days in the target month for target year
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(targetDay, daysInTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, clampedDay));
}

/**
 * Calculates the number of whole calendar days between today and travelDate.
 * Returns negative number if travelDate is in the past.
 *
 * @param {string | Date} travelDate - Destination travel date
 * @param {string | Date} [today=new Date()] - Reference date
 * @returns {number} Days difference
 */
export function calculateDaysFromToday(travelDate, today = new Date()) {
  const tDate = parseCalendarDate(travelDate);
  const baseDate = parseCalendarDate(today);
  const diffMs = tDate.getTime() - baseDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Checks if the travel date is in the past relative to today.
 *
 * @param {string | Date} travelDate
 * @param {string | Date} [today=new Date()]
 * @returns {boolean}
 */
export function isPastDate(travelDate, today = new Date()) {
  const tDate = parseCalendarDate(travelDate);
  const baseDate = parseCalendarDate(today);
  return tDate.getTime() < baseDate.getTime();
}

/**
 * Checks if the travel date is strictly more than 12 months from today.
 *
 * @param {string | Date} travelDate
 * @param {string | Date} [today=new Date()]
 * @returns {boolean}
 */
export function isBeyond12Months(travelDate, today = new Date()) {
  const tDate = parseCalendarDate(travelDate);
  const maxDate = calculate12MonthsHorizon(today);
  return tDate.getTime() > maxDate.getTime();
}

/**
 * Validates travel date against all business rules.
 *
 * @param {string | Date} travelDate
 * @param {string | Date} [today=new Date()]
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validateTravelDate(travelDate, today = new Date()) {
  let tDate;
  try {
    tDate = parseCalendarDate(travelDate);
  } catch (err) {
    return { isValid: false, error: err.message };
  }

  let baseDate;
  try {
    baseDate = parseCalendarDate(today);
  } catch {
    return { isValid: false, error: 'Invalid reference today date.' };
  }

  if (tDate.getTime() < baseDate.getTime()) {
    return { isValid: false, error: ERROR_PAST_DATE };
  }

  const maxDate = calculate12MonthsHorizon(baseDate);
  if (tDate.getTime() > maxDate.getTime()) {
    return { isValid: false, error: ERROR_BEYOND_12_MONTHS };
  }

  return { isValid: true, error: null };
}
