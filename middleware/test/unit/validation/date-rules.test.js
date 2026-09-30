import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ERROR_BEYOND_12_MONTHS,
  ERROR_PAST_DATE,
  isBeyond12Months,
  isPastDate,
  validateTravelDate,
} from "../../../src/validation/date-rules.js";

describe("date-rules boundary tests", () => {
  const TODAY = "2026-09-30";

  it("R-20 boundary: rejects date earlier than today with exact error string", () => {
    const yesterday = "2026-09-29";
    const pastOneYear = "2025-09-30";

    assert.equal(isPastDate(yesterday, TODAY), true);
    assert.equal(isPastDate(pastOneYear, TODAY), true);

    const resultYesterday = validateTravelDate(yesterday, TODAY);
    assert.equal(resultYesterday.isValid, false);
    assert.equal(resultYesterday.error, ERROR_PAST_DATE);
    assert.equal(resultYesterday.error, "Travel Date cannot be in the past.");

    const resultPastYear = validateTravelDate(pastOneYear, TODAY);
    assert.equal(resultPastYear.isValid, false);
    assert.equal(resultPastYear.error, ERROR_PAST_DATE);
  });

  it("R-22 boundary: accepts travel date equal to today without error", () => {
    assert.equal(isPastDate(TODAY, TODAY), false);

    const result = validateTravelDate(TODAY, TODAY);
    assert.equal(result.isValid, true);
    assert.equal(result.error, null);
  });

  it("R-23 boundary: accepts travel date exactly 12 months from today without error", () => {
    const exactly12Months = "2027-09-30";
    assert.equal(isBeyond12Months(exactly12Months, TODAY), false);

    const result = validateTravelDate(exactly12Months, TODAY);
    assert.equal(result.isValid, true);
    assert.equal(result.error, null);
  });

  it("R-21 boundary: rejects travel date strictly greater than 12 months from today with exact error string", () => {
    const twelveMonthsPlusOneDay = "2027-10-01";
    const twoYearsLater = "2028-09-30";

    assert.equal(isBeyond12Months(twelveMonthsPlusOneDay, TODAY), true);
    assert.equal(isBeyond12Months(twoYearsLater, TODAY), true);

    const resultOneDay = validateTravelDate(twelveMonthsPlusOneDay, TODAY);
    assert.equal(resultOneDay.isValid, false);
    assert.equal(resultOneDay.error, ERROR_BEYOND_12_MONTHS);
    assert.equal(resultOneDay.error, "Travel Date must be within the next 12 months.");

    const resultTwoYears = validateTravelDate(twoYearsLater, TODAY);
    assert.equal(resultTwoYears.isValid, false);
    assert.equal(resultTwoYears.error, ERROR_BEYOND_12_MONTHS);
  });
});
