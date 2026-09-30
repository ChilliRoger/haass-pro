import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateColdRule,
  evaluateHeatRule,
  evaluateRainRule,
} from "../../../src/engine/recommender.js";

describe("recommender engine", () => {
  describe("Heat Rule evaluation", () => {
    it("flags extreme heat when temp >= 35C", () => {
      const res = evaluateHeatRule({ tempC: 38 });
      assert.equal(res.risk, 35);
      assert.equal(res.severity, 3);
      assert.match(res.alerts[0], /High temperatures reaching 38C/);
      assert.ok(res.packing.includes("Sun hat"));
    });

    it("flags warm advisory when temp is between 28C and 34C", () => {
      const res = evaluateHeatRule({ tempC: 30 });
      assert.equal(res.risk, 10);
      assert.equal(res.severity, 1);
      assert.match(res.alerts[0], /Warm weather around 30C/);
    });

    it("returns zero risk for mild temperature", () => {
      const res = evaluateHeatRule({ tempC: 22 });
      assert.equal(res.risk, 0);
      assert.equal(res.alerts.length, 0);
    });
  });

  describe("Cold Rule evaluation", () => {
    it("flags cold advisory when temp is at or below 5C", () => {
      const res = evaluateColdRule({ tempC: 3 });
      assert.equal(res.risk, 25);
      assert.equal(res.severity, 2);
      assert.match(res.alerts[0], /Cold weather around 3C/);
      assert.ok(res.packing.includes("Thermal layers"));
    });

    it("flags freezing conditions when temp <= 0C", () => {
      const res = evaluateColdRule({ tempC: -4 });
      assert.equal(res.risk, 40);
      assert.equal(res.severity, 3);
      assert.match(res.alerts[0], /Freezing conditions at -4C/);
    });

    it("flags snowfall and adds waterproof footwear", () => {
      const res = evaluateColdRule({ tempC: 1, wmoCode: 71 });
      assert.equal(res.risk, 45); // 25 (cold) + 20 (snow)
      assert.ok(res.packing.includes("Waterproof winter boots"));
      assert.match(res.alerts[1], /Snowfall expected/);
    });

    it("returns zero risk for warm temperature", () => {
      const res = evaluateColdRule({ tempC: 20 });
      assert.equal(res.risk, 0);
    });
  });

  describe("Rain Rule evaluation", () => {
    it("flags high rain risk when rain probability >= 60%", () => {
      const res = evaluateRainRule({ rainChancePct: 75, precipSumMm: 12 });
      assert.equal(res.risk, 30);
      assert.equal(res.severity, 2);
      assert.match(res.alerts[0], /High likelihood of rain/);
      assert.ok(res.packing.includes("Compact umbrella"));
    });

    it("flags moderate rain advisory when rain probability is between 30% and 59%", () => {
      const res = evaluateRainRule({ rainChancePct: 40 });
      assert.equal(res.risk, 15);
      assert.equal(res.severity, 1);
      assert.match(res.alerts[0], /Moderate chance of rain/);
    });

    it("identifies rain from WMO code when probability is null (seasonal tier)", () => {
      const res = evaluateRainRule({ rainChancePct: null, wmoCode: 61 });
      assert.equal(res.risk, 15);
      assert.match(res.alerts[0], /Moderate chance of rain/);
    });

    it("returns zero risk when rain chance is below threshold", () => {
      const res = evaluateRainRule({ rainChancePct: 10, precipSumMm: 0.1 });
      assert.equal(res.risk, 0);
      assert.equal(res.alerts.length, 0);
    });
  });
});
