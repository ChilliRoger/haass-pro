import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildRecommendationNote,
  buildFallbackNote,
  buildDateValidationErrorNote,
} from '../../../src/engine/note-builder.js';

describe('note-builder module', () => {
  const sampleWeather = {
    tempC: 22,
    feelsLikeC: 24,
    rainChancePct: 15,
    precipSumMm: 0.5,
    uvIndex: 4,
    windKmh: 18,
    gustsKmh: 25,
    condition: 'Mainly clear',
    wmoCode: 1,
    source: 'Open-Meteo Standard Forecast (Tier 1)',
    confidence: 'Forecast (High Confidence)',
  };

  const sampleRecommendation = {
    verdict: 'Go',
    riskScore: 15,
    riskTag: 'weather-risk-low',
    headline: 'Pleasant and sunny weather expected; ideal travel conditions.',
    alerts: ['Pleasant weather expected with comfortable temperatures around 22C.'],
    packing: ['Comfortable walking shoes', 'Sunglasses', 'Light jacket'],
  };

  describe('buildRecommendationNote', () => {
    it('builds a complete recommendation note with attribution and verdict badge', () => {
      const html = buildRecommendationNote({
        destination: 'Kyoto, Kyoto, Japan',
        travelDate: '2026-10-15',
        weather: sampleWeather,
        recommendation: sampleRecommendation,
        tripType: 'Vacation',
        budget: 'Medium',
      });

      assert.ok(html.includes('Weather-Based Travel Recommendation'));
      assert.ok(html.includes('Kyoto, Kyoto, Japan'));
      assert.ok(html.includes('VERDICT: Go'));
      assert.ok(html.includes('Risk Score: 15 / 100'));
      assert.ok(html.includes('22 deg C'));
      assert.ok(html.includes('Open-Meteo (https://open-meteo.com/) - CC BY 4.0'));
      assert.ok(html.includes('GeoNames via Open-Meteo Geocoding API'));
      assert.ok(html.includes('Comfortable walking shoes'));
    });

    it('escapes user inputs to prevent HTML injection attacks', () => {
      const html = buildRecommendationNote({
        destination: '<script>alert("hack")</script>',
        travelDate: '2026-10-15',
        weather: sampleWeather,
        recommendation: sampleRecommendation,
        tripType: '<b>Adventure</b>',
        budget: 'High & Exclusive',
        specialNeeds: true,
        notes: '<img src=x onerror=alert(1)> Needs assistance',
      });

      assert.ok(!html.includes('<script>'));
      assert.ok(html.includes('&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;'));
      assert.ok(html.includes('&lt;b&gt;Adventure&lt;/b&gt;'));
      assert.ok(html.includes('High &amp; Exclusive'));
      assert.ok(!html.includes('<img src=x'));
    });

    it('includes accessibility block when special needs are specified', () => {
      const html = buildRecommendationNote({
        destination: 'London, England, United Kingdom',
        travelDate: '2026-10-15',
        weather: {
          ...sampleWeather,
          rainChancePct: 70,
        },
        recommendation: {
          verdict: 'Go with caution',
          riskScore: 40,
          riskTag: 'weather-risk-medium',
          headline: 'Moderate rain expected.',
          alerts: ['Rain expected.'],
          packing: ['Umbrella'],
        },
        specialNeeds: true,
        notes: 'Wheelchair user with elderly companion',
      });

      assert.ok(html.includes('Accessibility and Health Advisory'));
      assert.ok(html.includes('Mobility alert: Wet or slippery walkways'));
      assert.ok(html.includes('VERDICT: Go with caution'));
    });

    it('handles Reconsider verdict styling properly', () => {
      const html = buildRecommendationNote({
        destination: 'Miami, Florida, United States',
        travelDate: '2026-10-15',
        weather: {
          ...sampleWeather,
          tempC: 38,
          windKmh: 75,
        },
        recommendation: {
          verdict: 'Reconsider',
          riskScore: 75,
          riskTag: 'weather-risk-high',
          headline: 'Severe heatwave and strong winds.',
          alerts: ['Extreme heatwave.', 'Gale-force winds.'],
          packing: ['Heavy windbreaker', 'Electrolyte tablets'],
        },
      });

      assert.ok(html.includes('VERDICT: Reconsider'));
      assert.ok(html.includes('Risk Score: 75 / 100'));
      assert.ok(html.includes('#b91c1c')); // Reconsider badge color
    });

    it('handles seasonal tier with null UV and rain probability gracefully', () => {
      const html = buildRecommendationNote({
        destination: 'Berlin, Germany',
        travelDate: '2026-12-25',
        weather: {
          tempC: 4,
          feelsLikeC: 2,
          rainChancePct: null,
          precipSumMm: 2.1,
          uvIndex: null,
          windKmh: 15,
          gustsKmh: 20,
          condition: 'Rain / drizzle seasonal outlook',
          wmoCode: 61,
          source: 'Open-Meteo Seasonal Ensemble (Tier 2)',
          confidence: 'Seasonal Outlook (Medium Confidence)',
        },
        recommendation: {
          verdict: 'Go with caution',
          riskScore: 35,
          riskTag: 'weather-risk-medium',
          headline: 'Cool seasonal conditions with precipitation expected.',
          alerts: ['Cool conditions.'],
          packing: ['Thermal jacket', 'Waterproof coat'],
        },
      });

      assert.ok(html.includes('2.1 mm estimated'));
      assert.ok(html.includes('UV index not available for seasonal horizon'));
      assert.ok(html.includes('Seasonal Outlook (Medium Confidence)'));
    });
  });

  describe('buildFallbackNote', () => {
    it('builds clear fallback notice for unresolvable location', () => {
      const html = buildFallbackNote({
        destination: 'AtlantisUnknownCity',
        travelDate: '2026-10-15',
        reason: 'Location could not be resolved by geocoding provider.',
        actionRequired: 'Please verify the city spelling with requester or conduct manual review.',
      });

      assert.ok(html.includes('Weather Recommendation Notice: Manual Review Required'));
      assert.ok(html.includes('AtlantisUnknownCity'));
      assert.ok(html.includes('Location could not be resolved by geocoding provider.'));
      assert.ok(html.includes('Action for Agent:'));
    });
  });

  describe('buildDateValidationErrorNote', () => {
    it('builds date validation error note with exact error text', () => {
      const html = buildDateValidationErrorNote({
        travelDate: '2025-01-01',
        errorMessage: 'Travel Date cannot be in the past.',
      });

      assert.ok(html.includes('Date Validation Notice'));
      assert.ok(html.includes('2025-01-01'));
      assert.ok(html.includes('Travel Date cannot be in the past.'));
    });
  });
});
