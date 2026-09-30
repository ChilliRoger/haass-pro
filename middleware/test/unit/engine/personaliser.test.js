import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyTripTypeTailoring,
  applyBudgetTailoring,
  applySpecialNeedsAwareness,
} from '../../../src/engine/personaliser.js';

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

  describe('applySpecialNeedsAwareness', () => {
    it('returns empty lists when no special needs or notes are provided', () => {
      const res = applySpecialNeedsAwareness(null, '', { tempC: 25 });
      assert.equal(res.cautions.length, 0);
      assert.equal(res.packing.length, 0);
    });

    it('detects mobility/wheelchair needs during rain', () => {
      const res = applySpecialNeedsAwareness(true, 'Traveling with wheelchair', {
        tempC: 18,
        rainChancePct: 60,
      });
      assert.ok(res.cautions.some((c) => c.includes('Wet or slippery walkways')));
      assert.ok(res.packing.includes('Waterproof poncho for mobility device'));
    });

    it('detects elderly travelers during heat wave', () => {
      const res = applySpecialNeedsAwareness(false, 'Elderly parent joining trip', {
        tempC: 34,
      });
      assert.ok(res.cautions.some((c) => c.includes('Thermal advisory for vulnerable travelers')));
      assert.ok(res.packing.includes('Electrolyte rehydration salts'));
    });

    it('detects infant/child travelers during extreme cold', () => {
      const res = applySpecialNeedsAwareness('Yes', 'Traveling with infant', {
        tempC: 2,
      });
      assert.ok(res.cautions.some((c) => c.includes('Cold exposure advisory')));
      assert.ok(res.packing.includes('Thermal base layers'));
    });

    it('detects asthma/respiratory needs during high winds', () => {
      const res = applySpecialNeedsAwareness('yes', 'Severe asthma', {
        windKmh: 45,
      });
      assert.ok(res.cautions.some((c) => c.includes('High winds can disperse airborne dust')));
      assert.ok(res.packing.includes('Prescription inhaler / antihistamines'));
    });

    it('detects diabetes/insulin storage caution during heat', () => {
      const res = applySpecialNeedsAwareness(true, 'Diabetic passenger needing insulin', {
        tempC: 33,
      });
      assert.ok(res.cautions.some((c) => c.includes('Medical storage advisory: Insulin')));
      assert.ok(res.packing.includes('Insulated medication cooling pouch'));
    });

    it('provides general assistance advisory when flag is true but without specific keywords', () => {
      const res = applySpecialNeedsAwareness(true, 'Need extra help at gate', {
        tempC: 20,
      });
      assert.ok(res.cautions.some((c) => c.includes('Special assistance requested')));
    });
  });
});
