import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ERROR_BEYOND_12_MONTHS,
  ERROR_INVALID_FORMAT,
  ERROR_PAST_DATE,
  calculateDaysFromToday,
  isBeyond12Months,
  isPastDate,
  parseCalendarDate,
  validateTravelDate,
} from '../../../src/validation/date-rules.js';

describe('date-rules boundary tests', () => {
  const TODAY = '2026-09-30';

  it('R-20 boundary: rejects date earlier than today with exact error string', () => {
    const yesterday = '2026-09-29';
    const pastOneYear = '2025-09-30';

    assert.equal(isPastDate(yesterday, TODAY), true);
    assert.equal(isPastDate(pastOneYear, TODAY), true);

    const resultYesterday = validateTravelDate(yesterday, TODAY);
    assert.equal(resultYesterday.isValid, false);
    assert.equal(resultYesterday.error, ERROR_PAST_DATE);
    assert.equal(resultYesterday.error, 'Travel Date cannot be in the past.');

    const resultPastYear = validateTravelDate(pastOneYear, TODAY);
    assert.equal(resultPastYear.isValid, false);
    assert.equal(resultPastYear.error, ERROR_PAST_DATE);
  });

  it('R-22 boundary: accepts travel date equal to today without error', () => {
    assert.equal(isPastDate(TODAY, TODAY), false);

    const result = validateTravelDate(TODAY, TODAY);
    assert.equal(result.isValid, true);
    assert.equal(result.error, null);
  });

  it('R-23 boundary: accepts travel date exactly 12 months from today without error', () => {
    const exactly12Months = '2027-09-30';
    assert.equal(isBeyond12Months(exactly12Months, TODAY), false);

    const result = validateTravelDate(exactly12Months, TODAY);
    assert.equal(result.isValid, true);
    assert.equal(result.error, null);
  });

  it('R-21 boundary: rejects travel date strictly greater than 12 months from today with exact error string', () => {
    const twelveMonthsPlusOneDay = '2027-10-01';
    const twoYearsLater = '2028-09-30';

    assert.equal(isBeyond12Months(twelveMonthsPlusOneDay, TODAY), true);
    assert.equal(isBeyond12Months(twoYearsLater, TODAY), true);

    const resultOneDay = validateTravelDate(twelveMonthsPlusOneDay, TODAY);
    assert.equal(resultOneDay.isValid, false);
    assert.equal(resultOneDay.error, ERROR_BEYOND_12_MONTHS);
    assert.equal(resultOneDay.error, 'Travel Date must be within the next 12 months.');

    const resultTwoYears = validateTravelDate(twoYearsLater, TODAY);
    assert.equal(resultTwoYears.isValid, false);
    assert.equal(resultTwoYears.error, ERROR_BEYOND_12_MONTHS);
  });

  it('leap year boundary: clamps Feb 29 to Feb 28 next non-leap year', () => {
    const leapDay = '2024-02-29';
    const clampedNextYear = '2025-02-28';
    const oneDayBeyondClamped = '2025-03-01';

    assert.equal(isBeyond12Months(clampedNextYear, leapDay), false);
    assert.equal(isBeyond12Months(oneDayBeyondClamped, leapDay), true);

    const validResult = validateTravelDate(clampedNextYear, leapDay);
    assert.equal(validResult.isValid, true);
    assert.equal(validResult.error, null);

    const invalidResult = validateTravelDate(oneDayBeyondClamped, leapDay);
    assert.equal(invalidResult.isValid, false);
    assert.equal(invalidResult.error, ERROR_BEYOND_12_MONTHS);
  });

  it('calculates calendar day differences accurately', () => {
    assert.equal(calculateDaysFromToday('2026-09-30', '2026-09-30'), 0);
    assert.equal(calculateDaysFromToday('2026-10-01', '2026-09-30'), 1);
    assert.equal(calculateDaysFromToday('2026-09-29', '2026-09-30'), -1);
    assert.equal(calculateDaysFromToday('2026-10-14', '2026-09-30'), 14);
  });

  it('rejects invalid date formats and non-existent calendar dates', () => {
    assert.throws(() => parseCalendarDate(''), /Invalid travel date format/);
    assert.throws(() => parseCalendarDate(null), /Invalid travel date format/);
    assert.throws(() => parseCalendarDate(12345), /Invalid travel date format/);
    assert.throws(() => parseCalendarDate('invalid-date-string'), /Invalid travel date format/);
    assert.throws(() => parseCalendarDate('2026-02-30'), /Invalid travel date format/);
    assert.throws(() => parseCalendarDate(new Date('invalid')), /Invalid travel date format/);

    const resultInvalidFormat = validateTravelDate('invalid-date-string', TODAY);
    assert.equal(resultInvalidFormat.isValid, false);
    assert.equal(resultInvalidFormat.error, ERROR_INVALID_FORMAT);

    const resultInvalidToday = validateTravelDate(TODAY, 'invalid-today');
    assert.equal(resultInvalidToday.isValid, false);
    assert.equal(resultInvalidToday.error, 'Invalid reference today date.');

    const dateInstance = new Date(Date.UTC(2026, 9, 15));
    const parsedFromDate = parseCalendarDate(dateInstance);
    assert.equal(parsedFromDate.getUTCDate(), 15);
  });
});
