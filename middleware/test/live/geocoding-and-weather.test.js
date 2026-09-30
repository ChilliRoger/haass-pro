import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FORECAST_MAX_DAYS, OPEN_METEO_FORECAST_URL } from '../../src/config.js';
import { searchCity } from '../../src/geocoding/client.js';
import { fetchCurrentWeather, fetchForecastWeather } from '../../src/providers/forecast.js';
import { fetchSeasonalWeather } from '../../src/providers/seasonal.js';

describe('live Open-Meteo contract tests (no mocks, real APIs)', () => {
  const TODAY = new Date().toISOString().slice(0, 10);

  describe('Geocoding API live contract', () => {
    it('resolves London to geographic coordinates and place metadata', async () => {
      const result = await searchCity('London');
      assert.ok(result);
      assert.equal(result.name, 'London');
      assert.equal(result.country, 'United Kingdom');
      assert.ok(result.latitude > 50 && result.latitude < 53);
      assert.ok(result.longitude > -1 && result.longitude < 1);
      assert.ok(result.formattedPlace.includes('London'));
    });

    it('resolves Tokyo accurately', async () => {
      const result = await searchCity('Tokyo');
      assert.ok(result);
      assert.equal(result.name, 'Tokyo');
      assert.equal(result.country, 'Japan');
      assert.ok(result.latitude > 34 && result.latitude < 37);
    });

    it('returns null for non-existent place query', async () => {
      const result = await searchCity('NonExistentCityXYZ99999');
      assert.equal(result, null);
    });
  });

  describe('Forecast API live contract (Tier 1)', () => {
    it('fetches live forecast for London for today and normalises internal shape', async () => {
      const geo = await searchCity('London');
      assert.ok(geo);

      const weather = await fetchForecastWeather({
        latitude: geo.latitude,
        longitude: geo.longitude,
        targetDate: TODAY,
      });

      assert.equal(weather.source, 'forecast');
      assert.equal(weather.confidence, 'Forecast-based');
      assert.ok(typeof weather.tempC === 'number');
      assert.ok(typeof weather.condition === 'string');
      assert.ok(weather.condition.length > 0);
    });

    it('boundary test: verifies 14-day effective forecast horizon (FORECAST_MAX_DAYS = 14)', async () => {
      const url = new URL(OPEN_METEO_FORECAST_URL);
      url.searchParams.set('latitude', '51.5085');
      url.searchParams.set('longitude', '-0.1257');
      url.searchParams.set('daily', 'temperature_2m_max,apparent_temperature_max');
      url.searchParams.set('timezone', 'auto');
      url.searchParams.set('forecast_days', '16');

      const response = await fetch(url.toString());
      assert.equal(response.status, 200);

      const data = await response.json();
      assert.ok(data.daily);
      assert.equal(data.daily.time.length, 16);

      // Verify that days 0 through FORECAST_MAX_DAYS - 1 (13) have valid temperature readings
      for (let i = 0; i < FORECAST_MAX_DAYS; i++) {
        assert.ok(
          data.daily.temperature_2m_max[i] !== null,
          `Expected valid temperature at day index ${i}`,
        );
      }
    });
  });

  describe('Seasonal API live contract (Tier 2)', () => {
    it('fetches seasonal outlook for 60 days ahead using forecast_months parameter', async () => {
      const targetDateObj = new Date();
      targetDateObj.setDate(targetDateObj.getDate() + 60);
      const targetDate = targetDateObj.toISOString().slice(0, 10);

      const weather = await fetchSeasonalWeather({
        latitude: 51.5085,
        longitude: -0.1257,
        targetDate,
      });

      assert.equal(weather.source, 'seasonal');
      assert.equal(weather.confidence, 'Seasonal outlook, low confidence');
      assert.ok(typeof weather.tempC === 'number');
      assert.equal(weather.feelsLikeC, null);
      assert.equal(weather.uvIndex, null);
    });
  });

  describe('Current conditions live contract (Tier 3)', () => {
    it('fetches live current conditions for Tokyo', async () => {
      const weather = await fetchCurrentWeather({
        latitude: 35.6895,
        longitude: 139.6917,
      });

      assert.equal(weather.source, 'current');
      assert.equal(weather.confidence, 'Current conditions only, not a prediction');
      assert.ok(typeof weather.tempC === 'number');
      assert.ok(typeof weather.condition === 'string');
    });
  });
});
