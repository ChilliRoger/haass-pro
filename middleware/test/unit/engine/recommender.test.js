import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateHeatRule } from "../../../src/engine/recommender.js";

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
});
