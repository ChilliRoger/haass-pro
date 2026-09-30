import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getConditionLabel,
  isRainCode,
  isSnowCode,
  isThunderstormCode,
} from '../../../src/engine/wmo-codes.js';

describe('wmo-codes mapper', () => {
  it('maps known WMO codes to correct English descriptions', () => {
    assert.equal(getConditionLabel(0), 'Clear sky');
    assert.equal(getConditionLabel(1), 'Mainly clear');
    assert.equal(getConditionLabel(2), 'Partly cloudy');
    assert.equal(getConditionLabel(3), 'Overcast');
    assert.equal(getConditionLabel(61), 'Slight rain');
    assert.equal(getConditionLabel(65), 'Heavy rain');
    assert.equal(getConditionLabel(71), 'Slight snow fall');
    assert.equal(getConditionLabel(95), 'Thunderstorm');
  });

  it('handles null, undefined and invalid codes safely', () => {
    assert.equal(getConditionLabel(null), 'Unknown');
    assert.equal(getConditionLabel(undefined), 'Unknown');
    assert.equal(getConditionLabel('invalid'), 'Unknown');
    assert.equal(getConditionLabel(999), 'Weather code 999');
  });

  it('identifies rain codes correctly', () => {
    assert.equal(isRainCode(51), true); // Light drizzle
    assert.equal(isRainCode(61), true); // Slight rain
    assert.equal(isRainCode(65), true); // Heavy rain
    assert.equal(isRainCode(80), true); // Rain showers
    assert.equal(isRainCode(95), true); // Thunderstorm
    assert.equal(isRainCode(0), false); // Clear
    assert.equal(isRainCode(71), false); // Snow
    assert.equal(isRainCode(null), false);
  });

  it('identifies snow codes correctly', () => {
    assert.equal(isSnowCode(71), true); // Slight snow fall
    assert.equal(isSnowCode(75), true); // Heavy snow fall
    assert.equal(isSnowCode(85), true); // Snow showers
    assert.equal(isSnowCode(61), false); // Rain
    assert.equal(isSnowCode(0), false);
    assert.equal(isSnowCode(undefined), false);
  });

  it('identifies thunderstorm codes correctly', () => {
    assert.equal(isThunderstormCode(95), true);
    assert.equal(isThunderstormCode(96), true);
    assert.equal(isThunderstormCode(99), true);
    assert.equal(isThunderstormCode(61), false);
    assert.equal(isThunderstormCode(0), false);
    assert.equal(isThunderstormCode('95'), false);
  });
});
