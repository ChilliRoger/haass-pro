#!/usr/bin/env node

/**
 * run-demo-scenarios.js
 *
 * Runs through the 4 canonical demonstration scenarios for the Haass.io review call.
 * Evaluates tiers, recommendations, personalisation layers, and note HTML formatting.
 *
 * Usage:
 *   node scripts/run-demo-scenarios.js
 *
 * Strictly plain ASCII - no emojis.
 */

import { selectTier } from '../middleware/src/providers/tier-selector.js';
import { computeRecommendation } from '../middleware/src/engine/recommender.js';
import { buildRecommendationNote } from '../middleware/src/engine/note-builder.js';

const DEMO_REFERENCE_DATE = '2026-10-01';

const SCENARIOS = [
  {
    id: 1,
    title: 'Scenario 1: Ideal Autumn Vacation (Tier 1 Forecast, Go)',
    destination: 'Kyoto, Kyoto, Japan',
    travelDate: '2026-10-08', // 7 days ahead
    tripType: 'Vacation',
    budget: 'Medium',
    specialNeeds: false,
    notes: 'Sightseeing ancient temples and photography in gardens.',
    weather: {
      tempC: 22,
      feelsLikeC: 22,
      rainChancePct: 10,
      precipSumMm: 0,
      uvIndex: 4,
      windKmh: 12,
      gustsKmh: 18,
      condition: 'Clear sky',
      wmoCode: 0,
      source: 'Open-Meteo Standard Forecast (Tier 1)',
      confidence: 'Forecast (High Confidence)',
    },
  },
  {
    id: 2,
    title: 'Scenario 2: Severe Coastal Storm (Tier 1 Forecast, Reconsider)',
    destination: 'Miami, Florida, United States',
    travelDate: '2026-10-04', // 3 days ahead
    tripType: 'Adventure',
    budget: 'Medium',
    specialNeeds: false,
    notes: 'Kayaking and open water excursions along coast.',
    weather: {
      tempC: 29,
      feelsLikeC: 34,
      rainChancePct: 90,
      precipSumMm: 45.2,
      uvIndex: 3,
      windKmh: 78,
      gustsKmh: 95,
      condition: 'Thunderstorm with heavy rain',
      wmoCode: 95,
      source: 'Open-Meteo Standard Forecast (Tier 1)',
      confidence: 'Forecast (High Confidence)',
    },
  },
  {
    id: 3,
    title: 'Scenario 3: Winter Corporate Trip (Tier 2 Seasonal, Go with caution, High Budget)',
    destination: 'Zurich, Zurich, Switzerland',
    travelDate: '2026-12-15', // 75 days ahead
    tripType: 'Business',
    budget: 'High',
    specialNeeds: false,
    notes: 'Attending annual executive summit at conference center.',
    weather: {
      tempC: 2,
      feelsLikeC: -2,
      rainChancePct: null,
      precipSumMm: 3.8,
      uvIndex: null,
      windKmh: 20,
      gustsKmh: 32,
      condition: 'Rain / drizzle seasonal outlook',
      wmoCode: 61,
      source: 'Open-Meteo Seasonal Ensemble (Tier 2)',
      confidence: 'Seasonal Outlook (Medium Confidence)',
    },
  },
  {
    id: 4,
    title: 'Scenario 4: Accessibility & Special Needs (Rain + Wheelchair + Senior)',
    destination: 'London, England, United Kingdom',
    travelDate: '2026-10-12', // 11 days ahead
    tripType: 'Vacation',
    budget: 'Low',
    specialNeeds: true,
    notes: 'Traveling with elderly parent who uses a wheelchair.',
    weather: {
      tempC: 14,
      feelsLikeC: 13,
      rainChancePct: 75,
      precipSumMm: 8.5,
      uvIndex: 2,
      windKmh: 24,
      gustsKmh: 35,
      condition: 'Moderate rain',
      wmoCode: 63,
      source: 'Open-Meteo Standard Forecast (Tier 1)',
      confidence: 'Forecast (High Confidence)',
    },
  },
];

console.log('================================================================');
console.log('WEATHER-BASED TRAVEL RECOMMENDATION DEMO SCENARIOS');
console.log(`Reference Date: ${DEMO_REFERENCE_DATE}`);
console.log('================================================================\n');

for (const sc of SCENARIOS) {
  const tierInfo = selectTier(sc.travelDate, DEMO_REFERENCE_DATE);
  const recommendation = computeRecommendation(sc.weather);
  const noteHtml = buildRecommendationNote({
    destination: sc.destination,
    travelDate: sc.travelDate,
    weather: sc.weather,
    recommendation,
    tripType: sc.tripType,
    budget: sc.budget,
    specialNeeds: sc.specialNeeds,
    notes: sc.notes,
  });

  console.log(`[SCENARIO ${sc.id}] ${sc.title}`);
  console.log(`  Destination:       ${sc.destination}`);
  console.log(`  Travel Date:       ${sc.travelDate} (${tierInfo.daysFromToday} days out)`);
  console.log(`  Selected Tier:     Tier ${tierInfo.tier} (${tierInfo.confidence})`);
  console.log(`  Trip Type:         ${sc.tripType} | Budget: ${sc.budget}`);
  console.log(`  Special Needs:     ${sc.specialNeeds ? 'Yes' : 'No'} (${sc.notes})`);
  console.log('  --------------------------------------------------------------');
  console.log(`  Calculated Verdict: [ ${recommendation.verdict.toUpperCase()} ]`);
  console.log(`  Risk Score:        ${recommendation.riskScore} / 100`);
  console.log(`  Freshservice Tag:  ${recommendation.riskTag}`);
  console.log(`  Headline:          ${recommendation.headline}`);
  console.log(`  Generated HTML:    ${noteHtml.length} characters (safe ASCII, escaped)`);
  console.log('================================================================\n');
}

console.log('All 4 demo scenarios evaluated successfully.');
