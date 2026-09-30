import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ERROR_PAST_DATE,
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
});
