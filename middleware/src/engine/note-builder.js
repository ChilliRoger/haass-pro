/**
 * note-builder.js
 *
 * Assembles the final Freshservice ticket conversation note.
 * Produces clean, professional, responsive HTML formatted for Freshservice agents and requesters.
 *
 * Adheres strictly to the no-emojis rule and sanitises all user-provided strings.
 */

import { escapeHtml } from '../validation/sanitise.js';
import {
  applyTripTypeTailoring,
  applyBudgetTailoring,
  applySpecialNeedsAwareness,
} from './personaliser.js';

const VERDICT_STYLES = {
  Go: {
    badgeBg: '#15803d',
    cardBorder: '#86efac',
    cardBg: '#f0fdf4',
    textColor: '#166534',
  },
  'Go with caution': {
    badgeBg: '#b45309',
    cardBorder: '#fde68a',
    cardBg: '#fffbeb',
    textColor: '#92400e',
  },
  Reconsider: {
    badgeBg: '#b91c1c',
    cardBorder: '#fca5a5',
    cardBg: '#fef2f2',
    textColor: '#991b1b',
  },
};

/**
 * Builds the comprehensive HTML travel recommendation note.
 *
 * @param {object} params
 * @param {string} params.destination - Resolved place name (e.g. "Tokyo, Tokyo, Japan")
 * @param {string} params.travelDate - YYYY-MM-DD
 * @param {import('./normaliser.js').WeatherData} params.weather
 * @param {import('./recommender.js').Recommendation} params.recommendation
 * @param {string} [params.tripType] - "Vacation" | "Business" | "Adventure"
 * @param {string} [params.budget] - "Low" | "Medium" | "High"
 * @param {string | boolean} [params.specialNeeds] - Special needs flag or details
 * @param {string} [params.notes] - Requester notes
 * @returns {string} Safe HTML string for Freshservice ticket note
 */
export function buildRecommendationNote({
  destination,
  travelDate,
  weather,
  recommendation,
  tripType = 'Vacation',
  budget = 'Medium',
  specialNeeds = false,
  notes = '',
}) {
  const safeDest = escapeHtml(destination || 'Specified Destination');
  const safeDate = escapeHtml(travelDate || 'Selected Travel Date');
  const safeTripType = escapeHtml(tripType || 'Vacation');
  const safeBudget = escapeHtml(budget || 'Medium');

  const verdict = recommendation.verdict || 'Go with caution';
  const styles = VERDICT_STYLES[verdict] || VERDICT_STYLES['Go with caution'];
  const safeHeadline = escapeHtml(recommendation.headline);

  // Apply personalisation layers
  const tripAdvice = applyTripTypeTailoring(tripType, weather);
  const budgetAdvice = applyBudgetTailoring(budget, weather);
  const specialNeedsAdvice = applySpecialNeedsAwareness(specialNeeds, notes, weather);

  // Combine and deduplicate packing list
  const combinedPacking = [
    ...new Set([
      ...(recommendation.packing || []),
      ...(tripAdvice.packing || []),
      ...(budgetAdvice.packing || []),
      ...(specialNeedsAdvice.packing || []),
    ]),
  ];

  // Weather condition and metrics formatting
  const tempStr =
    typeof weather.tempC === 'number'
      ? `${weather.tempC} deg C (Feels like ${weather.feelsLikeC ?? weather.tempC} deg C)`
      : 'Climatological estimate';

  const rainStr =
    weather.rainChancePct !== null
      ? `${weather.rainChancePct}% chance (${weather.precipSumMm ?? 0} mm)`
      : weather.precipSumMm !== null
        ? `${weather.precipSumMm} mm estimated`
        : 'Seasonal precipitation';

  const windStr =
    weather.windKmh !== null
      ? `${weather.windKmh} km/h (Gusts: ${weather.gustsKmh ?? weather.windKmh} km/h)`
      : 'Moderate seasonal winds';

  const uvStr =
    weather.uvIndex !== null
      ? `${weather.uvIndex} (${weather.uvIndex >= 8 ? 'Very High' : weather.uvIndex >= 6 ? 'High' : weather.uvIndex >= 3 ? 'Moderate' : 'Low'})`
      : 'UV index not available for seasonal horizon';

  // Packing list items HTML
  const packingItemsHtml =
    combinedPacking.length > 0
      ? combinedPacking.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n          ')
      : '<li>Standard seasonal travel clothing</li>';

  // Special needs alert block HTML
  let specialNeedsHtml = '';
  if (specialNeedsAdvice.cautions.length > 0) {
    const cautionList = specialNeedsAdvice.cautions
      .map((c) => `<li>${escapeHtml(c)}</li>`)
      .join('\n          ');
    specialNeedsHtml = `
    <!-- Special Needs and Health Advisory -->
    <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 16px; margin-bottom: 18px; border-radius: 0 4px 4px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #9a3412; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
        Accessibility and Health Advisory
      </div>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #7c2d12; line-height: 1.5;">
        ${cautionList}
      </ul>
    </div>`;
  }

  // Active alerts block HTML
  let alertsHtml = '';
  if (recommendation.alerts && recommendation.alerts.length > 0) {
    const alertsList = recommendation.alerts
      .map((a) => `<li>${escapeHtml(a)}</li>`)
      .join('\n          ');
    alertsHtml = `
      <div style="margin-bottom: 14px;">
        <div style="font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Weather Highlights and Advisories</div>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #374151; line-height: 1.5;">
          ${alertsList}
        </ul>
      </div>`;
  }

  const generatedIso = new Date().toISOString();

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1f2937; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background-color: #ffffff; line-height: 1.5;">
  <!-- Header Banner -->
  <div style="background-color: #1e3a8a; color: #ffffff; padding: 16px 20px;">
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; opacity: 0.85;">Freshservice Travel Desk</div>
    <div style="font-size: 18px; font-weight: 700; margin-top: 4px;">Weather-Based Travel Recommendation</div>
    <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">
      Destination: <strong>${safeDest}</strong> &bull; Date: <strong>${safeDate}</strong> &bull; Horizon: <strong>${escapeHtml(weather.confidence)}</strong>
    </div>
  </div>

  <div style="padding: 20px;">
    <!-- Verdict & Risk Summary Card -->
    <div style="border: 2px solid ${styles.cardBorder}; background-color: ${styles.cardBg}; border-radius: 6px; padding: 14px 16px; margin-bottom: 18px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
        <span style="display: inline-block; background-color: ${styles.badgeBg}; color: #ffffff; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;">
          VERDICT: ${escapeHtml(verdict)}
        </span>
        <span style="font-size: 13px; font-weight: 700; color: ${styles.textColor};">
          Risk Score: ${recommendation.riskScore} / 100
        </span>
      </div>
      <div style="font-size: 15px; font-weight: 600; color: #111827; line-height: 1.4;">
        ${safeHeadline}
      </div>
    </div>

    <!-- Weather Key Metrics Table -->
    <div style="margin-bottom: 18px;">
      <div style="font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Forecast Overview</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e5e7eb;">
        <tbody>
          <tr style="border-bottom: 1px solid #f3f4f6; background-color: #fafafa;">
            <td style="padding: 8px 12px; font-weight: 600; color: #4b5563; width: 35%;">Condition</td>
            <td style="padding: 8px 12px; color: #111827;">${escapeHtml(weather.condition)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 12px; font-weight: 600; color: #4b5563;">Temperature</td>
            <td style="padding: 8px 12px; color: #111827;">${escapeHtml(tempStr)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6; background-color: #fafafa;">
            <td style="padding: 8px 12px; font-weight: 600; color: #4b5563;">Precipitation</td>
            <td style="padding: 8px 12px; color: #111827;">${escapeHtml(rainStr)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 12px; font-weight: 600; color: #4b5563;">Wind Speed</td>
            <td style="padding: 8px 12px; color: #111827;">${escapeHtml(windStr)}</td>
          </tr>
          <tr style="background-color: #fafafa;">
            <td style="padding: 8px 12px; font-weight: 600; color: #4b5563;">UV Index</td>
            <td style="padding: 8px 12px; color: #111827;">${escapeHtml(uvStr)}</td>
          </tr>
        </tbody>
      </table>
    </div>
${alertsHtml}${specialNeedsHtml}
    <!-- Tailored Guidance -->
    <div style="margin-bottom: 18px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px; background-color: #fcfcfd;">
      <div style="font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
        Personalised Travel Notes (${safeTripType} &bull; ${safeBudget} Budget)
      </div>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #374151; line-height: 1.5;">
        ${tripAdvice.details.map((d) => `<li>${escapeHtml(d)}</li>`).join('\n        ')}
        ${budgetAdvice.details.map((d) => `<li>${escapeHtml(d)}</li>`).join('\n        ')}
      </ul>
    </div>

    <!-- Packing Checklist -->
    <div style="margin-bottom: 18px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px; background-color: #f9fafb;">
      <div style="font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
        Recommended Packing Checklist
      </div>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #374151; line-height: 1.5;">
        ${packingItemsHtml}
      </ul>
    </div>

    <!-- Data Attribution Footer -->
    <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #6b7280; line-height: 1.5;">
      <div>Weather data: Open-Meteo (https://open-meteo.com/) - CC BY 4.0</div>
      <div>Geocoding data: GeoNames via Open-Meteo Geocoding API (https://geocoding-api.open-meteo.com/)</div>
      <div style="margin-top: 2px;">Generated at: ${generatedIso} | Tier: ${escapeHtml(weather.source)}</div>
    </div>
  </div>
</div>`;
}

/**
 * Builds a fallback note when an external service is unavailable or city is unresolvable.
 *
 * @param {object} params
 * @param {string} params.destination - City query provided
 * @param {string} params.travelDate - Travel date provided
 * @param {string} params.reason - Technical reason for fallback
 * @param {string} params.actionRequired - Clear instruction for the travel desk agent
 * @returns {string} Safe HTML string for Freshservice ticket note
 */
export function buildFallbackNote({ destination, travelDate, reason, actionRequired }) {
  const safeDest = escapeHtml(destination || 'Unspecified Destination');
  const safeDate = escapeHtml(travelDate || 'Unspecified Date');
  const safeReason = escapeHtml(reason || 'Unable to retrieve automated forecast');
  const safeAction = escapeHtml(actionRequired || 'Please verify weather manually.');
  const generatedIso = new Date().toISOString();

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1f2937; border: 1px solid #fecaca; border-radius: 8px; overflow: hidden; background-color: #ffffff; line-height: 1.5;">
  <div style="background-color: #991b1b; color: #ffffff; padding: 14px 20px;">
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; opacity: 0.85;">Freshservice Travel Desk</div>
    <div style="font-size: 16px; font-weight: 700; margin-top: 2px;">Weather Recommendation Notice: Manual Review Required</div>
  </div>
  <div style="padding: 18px 20px;">
    <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px;">
      <div style="font-size: 13px; font-weight: 700; color: #991b1b; margin-bottom: 4px;">Automated Weather Retrieval Notice</div>
      <div style="font-size: 13px; color: #7f1d1d;">${safeReason}</div>
    </div>
    <div style="font-size: 13px; color: #374151; margin-bottom: 12px;">
      <div>Requested Destination: <strong>${safeDest}</strong></div>
      <div>Requested Travel Date: <strong>${safeDate}</strong></div>
    </div>
    <div style="font-size: 13px; font-weight: 600; color: #1f2937; margin-bottom: 16px;">
      Action for Agent: ${safeAction}
    </div>
    <div style="border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 11px; color: #6b7280;">
      Generated at: ${generatedIso} | Automated Travel Desk Middleware
    </div>
  </div>
</div>`;
}

/**
 * Builds a ticket note when date validation fails.
 *
 * @param {object} params
 * @param {string} params.travelDate - Provided date string
 * @param {string} params.errorMessage - Exact validation error message (R-20 / R-21)
 * @returns {string} Safe HTML string for Freshservice ticket note
 */
export function buildDateValidationErrorNote({ travelDate, errorMessage }) {
  const safeDate = escapeHtml(travelDate || 'Invalid date');
  const safeMsg = escapeHtml(errorMessage);
  const generatedIso = new Date().toISOString();

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1f2937; border: 1px solid #fed7aa; border-radius: 8px; overflow: hidden; background-color: #ffffff; line-height: 1.5;">
  <div style="background-color: #c2410c; color: #ffffff; padding: 14px 20px;">
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; opacity: 0.85;">Freshservice Travel Desk</div>
    <div style="font-size: 16px; font-weight: 700; margin-top: 2px;">Date Validation Notice</div>
  </div>
  <div style="padding: 18px 20px;">
    <div style="background-color: #fff7ed; border: 1px solid #fdba74; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px;">
      <div style="font-size: 13px; font-weight: 700; color: #9a3412; margin-bottom: 4px;">Validation Error</div>
      <div style="font-size: 13px; color: #7c2d12;">${safeMsg}</div>
    </div>
    <div style="font-size: 13px; color: #374151; margin-bottom: 16px;">
      Submitted Date: <strong>${safeDate}</strong>
    </div>
    <div style="font-size: 13px; color: #4b5563; margin-bottom: 16px;">
      The requester has been notified to update the travel date to a valid upcoming window.
    </div>
    <div style="border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 11px; color: #6b7280;">
      Generated at: ${generatedIso} | Automated Travel Desk Middleware
    </div>
  </div>
</div>`;
}
