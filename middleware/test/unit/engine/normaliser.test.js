import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normaliseCurrent,
  normaliseForecast,
  normaliseSeasonal,
} from '../../../src/engine/normaliser.js';

describe('normaliser module', () => {
  describe('normaliseForecast (Tier 1)', () => {
    const sampleRawForecast = {
      daily: {
        time: ['2026-10-01', '2026-10-02'],
        weather_code: [0, 61],
        temperature_2m_max: [22.5, 18.0],
        apparent_temperature_max: [21.0, 17.5],
        precipitation_probability_max: [10, 80],
        precipitation_sum: [0.0, 5.2],
        uv_index_max: [5.5, 3.0],
        wind_speed_10m_max: [15.0, 32.0],
        wind_gusts_10m_max: [25.0, 48.0],
      },
    };

    it('normalises complete Tier 1 forecast accurately', () => {
      const result = normaliseForecast(sampleRawForecast, '2026-10-02');
      assert.equal(result.tempC, 18.0);
      assert.equal(result.feelsLikeC, 17.5);
      assert.equal(result.rainChancePct, 80);
      assert.equal(result.precipSumMm, 5.2);
      assert.equal(result.uvIndex, 3.0);
      assert.equal(result.windKmh, 32.0);
      assert.equal(result.gustsKmh, 48.0);
      assert.equal(result.wmoCode, 61);
      assert.equal(result.condition, 'Slight rain');
      assert.equal(result.source, 'forecast');
      assert.equal(result.confidence, 'Forecast-based');
    });

    it('handles null values in optional fields safely', () => {
      const partialRaw = {
        daily: {
          time: ['2026-10-01'],
          weather_code: [null],
          temperature_2m_max: [20.0],
        },
      };
      const result = normaliseForecast(partialRaw, '2026-10-01');
      assert.equal(result.tempC, 20.0);
      assert.equal(result.feelsLikeC, null);
      assert.equal(result.rainChancePct, null);
      assert.equal(result.precipSumMm, null);
      assert.equal(result.uvIndex, null);
      assert.equal(result.windKmh, null);
      assert.equal(result.gustsKmh, null);
      assert.equal(result.wmoCode, null);
      assert.equal(result.condition, 'Unknown');
    });

    it('throws when target date is not in daily.time array', () => {
      assert.throws(
        () => normaliseForecast(sampleRawForecast, '2026-10-15'),
        /Target date 2026-10-15 not found in forecast time array/,
      );
    });

    it('throws on malformed response structure', () => {
      assert.throws(() => normaliseForecast(null, '2026-10-01'), /Invalid forecast API response/);
      assert.throws(() => normaliseForecast({}, '2026-10-01'), /Invalid forecast API response/);
    });
  });

  describe('normaliseSeasonal (Tier 2)', () => {
    const sampleRawSeasonal = {
      daily: {
        time: ['2026-11-15', '2026-11-16'],
        weather_code: [3, 2],
        temperature_2m_max: [14.2, 15.0],
        precipitation_sum: [1.8, 0.0],
        wind_speed_10m_max: [22.0, 18.5],
      },
    };

    it('normalises Tier 2 seasonal forecast and sets unavailable metrics to null', () => {
      const result = normaliseSeasonal(sampleRawSeasonal, '2026-11-15');
      assert.equal(result.tempC, 14.2);
      assert.equal(result.feelsLikeC, null);
      assert.equal(result.rainChancePct, null);
      assert.equal(result.precipSumMm, 1.8);
      assert.equal(result.uvIndex, null);
      assert.equal(result.windKmh, 22.0);
      assert.equal(result.gustsKmh, null);
      assert.equal(result.wmoCode, 3);
      assert.equal(result.condition, 'Overcast');
      assert.equal(result.source, 'seasonal');
      assert.equal(result.confidence, 'Seasonal outlook, low confidence');
    });

    it('throws when target date is not found in seasonal array', () => {
      assert.throws(
        () => normaliseSeasonal(sampleRawSeasonal, '2027-02-01'),
        /Target date 2027-02-01 not found in seasonal time array/,
      );
    });
  });

  describe('normaliseCurrent (Tier 3)', () => {
    const sampleRawCurrent = {
      current: {
        time: '2026-09-30T10:00',
        temperature_2m: 24.6,
        weather_code: 1,
        wind_speed_10m: 12.3,
        precipitation: 0.0,
      },
    };

    it('normalises Tier 3 current weather conditions accurately', () => {
      const result = normaliseCurrent(sampleRawCurrent);
      assert.equal(result.tempC, 24.6);
      assert.equal(result.feelsLikeC, null);
      assert.equal(result.rainChancePct, null);
      assert.equal(result.precipSumMm, 0.0);
      assert.equal(result.uvIndex, null);
      assert.equal(result.windKmh, 12.3);
      assert.equal(result.gustsKmh, null);
      assert.equal(result.wmoCode, 1);
      assert.equal(result.condition, 'Mainly clear');
      assert.equal(result.source, 'current');
      assert.equal(result.confidence, 'Current conditions only, not a prediction');
    });

    it('throws on malformed current response', () => {
      assert.throws(() => normaliseCurrent(null), /Invalid current weather API response/);
      assert.throws(() => normaliseCurrent({}), /Invalid current weather API response/);
    });
  });
});
