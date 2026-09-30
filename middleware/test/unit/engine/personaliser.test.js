import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyTripTypeTailoring } from '../../../src/engine/personaliser.js';

describe('personaliser engine', () => {
  describe('applyTripTypeTailoring', () => {
    it('tailors advice for Vacation trip type', () => {
      const res = applyTripTypeTailoring('Vacation', { tempC: 24, rainChancePct: 10 });
      assert.ok(res.details.some((d) => d.includes('sightseeing') || d.includes('photography')));
      assert.ok(res.packing.includes('Comfortable walking sneakers'));
    });

    it('tailors advice for Business trip type during rain', () => {
      const res = applyTripTypeTailoring('Business', { tempC: 22, rainChancePct: 60 });
      assert.ok(res.details.some((d) => d.includes('indoor meeting venues')));
      assert.ok(res.packing.includes('Formal umbrella'));
      assert.ok(res.packing.includes('Weather-resistant laptop sleeve'));
    });

    it('tailors advice for Adventure trip type during high winds', () => {
      const res = applyTripTypeTailoring('Adventure', { tempC: 15, windKmh: 55 });
      assert.ok(res.details.some((d) => d.includes('High wind exposure')));
      assert.ok(res.packing.includes('Wind-resistant shell'));
    });
  });
});
