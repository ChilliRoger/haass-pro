import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateColdRule,
  evaluateHeatRule,
  evaluatePleasantRule,
  evaluateRainRule,
  evaluateStormAndWindRule,
  evaluateUvRule,
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

  describe("Storm and Wind Rule evaluation", () => {
    it("flags thunderstorm hazard with high risk points", () => {
      const res = evaluateStormAndWindRule({ wmoCode: 95 });
      assert.equal(res.risk, 50);
      assert.equal(res.severity, 4);
      assert.match(res.alerts[0], /Thunderstorms forecasted/);
      assert.ok(res.packing.includes("Emergency power bank"));
    });

    it("flags gale-force winds when wind speed >= 75 km/h", () => {
      const res = evaluateStormAndWindRule({ windKmh: 80, gustsKmh: 95 });
      assert.equal(res.risk, 40);
      assert.equal(res.severity, 3);
      assert.match(res.alerts[0], /Gale-force winds/);
      assert.ok(res.packing.includes("Heavy windbreaker"));
    });

    it("flags strong winds when wind speed is between 50 and 74 km/h", () => {
      const res = evaluateStormAndWindRule({ windKmh: 55 });
      assert.equal(res.risk, 20);
      assert.equal(res.severity, 2);
      assert.match(res.alerts[0], /Strong gusty winds/);
    });

    it("returns zero risk for calm conditions", () => {
      const res = evaluateStormAndWindRule({ windKmh: 12, wmoCode: 1 });
      assert.equal(res.risk, 0);
      assert.equal(res.alerts.length, 0);
    });
  });

  describe("UV Rule evaluation", () => {
    it("flags very high UV risk when uvIndex >= 8", () => {
      const res = evaluateUvRule({ uvIndex: 9.2 });
      assert.equal(res.risk, 25);
      assert.equal(res.severity, 2);
      assert.match(res.alerts[0], /Very high UV index/);
      assert.ok(res.packing.includes("Broad-spectrum SPF 50+ sunscreen"));
    });

    it("flags high UV advisory when uvIndex is between 6 and 7.9", () => {
      const res = evaluateUvRule({ uvIndex: 6.8 });
      assert.equal(res.risk, 15);
      assert.equal(res.severity, 1);
      assert.match(res.alerts[0], /High UV index/);
      assert.ok(res.packing.includes("SPF 30+ sunscreen"));
    });

    it("returns zero risk when UV index is below 6 or null (seasonal tier)", () => {
      assert.equal(evaluateUvRule({ uvIndex: 4 }).risk, 0);
      assert.equal(evaluateUvRule({ uvIndex: null }).risk, 0);
    });
  });

  describe("Pleasant Rule evaluation", () => {
    it("identifies ideal pleasant conditions (22C, calm, clear)", () => {
      const res = evaluatePleasantRule({
        tempC: 22,
        rainChancePct: 5,
        windKmh: 12,
        wmoCode: 0,
      });
      assert.equal(res.isPleasant, true);
      assert.match(res.alerts[0], /Pleasant weather expected with comfortable temperatures around 22C/);
      assert.ok(res.packing.includes("Comfortable walking shoes"));
    });

    it("returns false if temperature is too hot or cold", () => {
      assert.equal(evaluatePleasantRule({ tempC: 32 }).isPleasant, false);
      assert.equal(evaluatePleasantRule({ tempC: 10 }).isPleasant, false);
    });

    it("returns false if rain or high wind is present", () => {
      assert.equal(evaluatePleasantRule({ tempC: 22, rainChancePct: 50 }).isPleasant, false);
      assert.equal(evaluatePleasantRule({ tempC: 22, windKmh: 45 }).isPleasant, false);
    });
  });
});
