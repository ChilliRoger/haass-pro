import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyTripTypeTailoring, applyBudgetTailoring } from '../../../src/engine/personaliser.js';

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

  describe('applyBudgetTailoring', () => {
    it('tailors advice for High budget tier in adverse weather', () => {
      const res = applyBudgetTailoring('High', { tempC: 34, rainChancePct: 40 });
      assert.ok(res.details.some((d) => d.includes('Pre-book private air-conditioned vehicle')));
      assert.ok(res.packing.includes('Noise-cancelling transit headphones'));
    });

    it('tailors advice for High budget tier in fair weather', () => {
      const res = applyBudgetTailoring('High', { tempC: 22, rainChancePct: 10 });
      assert.ok(res.details.some((d) => d.includes('skip-the-line passes')));
    });

    it('tailors advice for Low budget tier during rain', () => {
      const res = applyBudgetTailoring('Low', { tempC: 18, rainChancePct: 50 });
      assert.ok(res.details.some((d) => d.includes('ride-hail surge pricing')));
      assert.ok(res.details.some((d) => d.includes('Explore municipal galleries')));
      assert.ok(res.packing.includes('Reusable hydration flask'));
    });

    it('tailors advice for Low budget tier during heat', () => {
      const res = applyBudgetTailoring('Low', { tempC: 31, rainChancePct: 10 });
      assert.ok(res.details.some((d) => d.includes('free city public water fountains')));
    });

    it('tailors advice for Medium budget tier (default)', () => {
      const res = applyBudgetTailoring('Medium', { tempC: 22, rainChancePct: 10 });
      assert.ok(res.details.some((d) => d.includes('timed-entry tickets online')));
      assert.ok(res.packing.includes('Portable power bank'));
    });
  });
});
