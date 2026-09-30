import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TIER_CONFIDENCE,
  selectTier,
  selectTierByDays,
} from '../../../src/providers/tier-selector.js';

describe('tier-selector module', () => {
  it('selects Tier 1 (forecast) for days 0 through 14', () => {
    const tierDay0 = selectTierByDays(0);
    assert.equal(tierDay0.tier, 1);
    assert.equal(tierDay0.source, 'forecast');
    assert.equal(tierDay0.confidence, TIER_CONFIDENCE.tier1);
    assert.equal(tierDay0.confidence, 'Forecast-based');

    const tierDay7 = selectTierByDays(7);
    assert.equal(tierDay7.tier, 1);

    const tierDay14 = selectTierByDays(14);
    assert.equal(tierDay14.tier, 1);
    assert.equal(tierDay14.source, 'forecast');
  });

  it('selects Tier 2 (seasonal) for days 15 through 180', () => {
    const tierDay15 = selectTierByDays(15);
    assert.equal(tierDay15.tier, 2);
    assert.equal(tierDay15.source, 'seasonal');
    assert.equal(tierDay15.confidence, TIER_CONFIDENCE.tier2);
    assert.equal(tierDay15.confidence, 'Seasonal outlook, low confidence');

    const tierDay90 = selectTierByDays(90);
    assert.equal(tierDay90.tier, 2);

    const tierDay180 = selectTierByDays(180);
    assert.equal(tierDay180.tier, 2);
    assert.equal(tierDay180.source, 'seasonal');
  });

  it('selects Tier 3 (current) for days 181 and beyond', () => {
    const tierDay181 = selectTierByDays(181);
    assert.equal(tierDay181.tier, 3);
    assert.equal(tierDay181.source, 'current');
    assert.equal(tierDay181.confidence, TIER_CONFIDENCE.tier3);
    assert.equal(tierDay181.confidence, 'Current conditions only, not a prediction');

    const tierDay365 = selectTierByDays(365);
    assert.equal(tierDay365.tier, 3);
  });

  it('throws error when selecting tier for negative days (past date)', () => {
    assert.throws(() => selectTierByDays(-1), /Cannot select tier for past dates/);
  });

  it('selects tier based on travelDate and base date correctly', () => {
    const base = '2026-09-30';

    const resTier1 = selectTier('2026-10-05', base);
    assert.equal(resTier1.tier, 1);
    assert.equal(resTier1.daysFromToday, 5);

    const resTier2 = selectTier('2026-11-15', base);
    assert.equal(resTier2.tier, 2);
    assert.equal(resTier2.daysFromToday, 46);

    const resTier3 = selectTier('2027-05-01', base);
    assert.equal(resTier3.tier, 3);
    assert.ok(resTier3.daysFromToday > 180);
  });
});
