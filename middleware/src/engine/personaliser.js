/**
 * personaliser.js
 *
 * Personalisation layers for the Weather-Based Travel Recommendation WOW feature.
 * Adds trip-type tailoring, budget-tier adjustments, and special-needs keyword awareness.
 *
 * Adheres to Section 12 of the project specification.
 * Strictly plain ASCII - no emojis.
 */

/**
 * Tailors recommendation details based on trip type (Vacation, Business, Adventure).
 *
 * @param {string | null | undefined} tripType - "Vacation" | "Business" | "Adventure"
 * @param {import('../engine/normaliser.js').WeatherData} weather
 * @returns {{ details: string[], packing: string[] }}
 */
export function applyTripTypeTailoring(tripType, weather) {
  const normType = (tripType || 'Vacation').trim();
  const temp = weather?.tempC;
  const isRain = (weather?.rainChancePct ?? 0) >= 30;
  const isWindy = (weather?.windKmh ?? 0) >= 40;

  const details = [];
  const packing = [];

  switch (normType.toLowerCase()) {
    case 'business':
      details.push('Schedule buffer time between transit points to accommodate weather delays.');
      if (isRain) {
        details.push('Rain expected: choose indoor meeting venues and verify cab availability.');
        packing.push('Formal umbrella', 'Weather-resistant laptop sleeve');
      } else {
        details.push('Dry conditions: standard corporate commuter routes should be clear.');
      }
      if (typeof temp === 'number' && temp >= 28) {
        details.push('Warm outdoor climate: lightweight formal attire recommended.');
      }
      break;

    case 'adventure':
      details.push(
        'Outdoor safety check: review trail conditions and terrain forecasts before setting out.',
      );
      if (isWindy || (weather?.gustsKmh ?? 0) >= 50) {
        details.push('High wind exposure: avoid ridge hikes and open cliff trails.');
        packing.push('Wind-resistant shell', 'Trekking poles');
      }
      if (isRain) {
        details.push('Wet terrain alert: expect slippery paths; waterproof footwear is essential.');
        packing.push('Waterproof dry bag', 'Quick-dry synthetic apparel');
      }
      if ((weather?.uvIndex ?? 0) >= 6) {
        packing.push('UV-shielding neck gaiter');
      }
      break;

    case 'vacation':
    default:
      if (typeof temp === 'number' && temp >= 28) {
        details.push(
          'Optimal sightseeing window: early morning (07:00-10:00) and evening after sunset.',
        );
      } else {
        details.push(
          'Explore scenic landmarks during midday when ambient light and temperatures are peak.',
        );
      }
      if (isRain) {
        details.push(
          'Have a backup list of indoor attractions (museums, art galleries, local markets).',
        );
      } else {
        details.push('Great conditions for outdoor photography, walking tours, and park visits.');
      }
      packing.push('Comfortable walking sneakers');
      break;
  }

  return {
    details,
    packing,
  };
}

/**
 * Tailors recommendation advice based on budget range (Low, Medium, High).
 *
 * @param {string | null | undefined} budget - "Low" | "Medium" | "High"
 * @param {import('../engine/normaliser.js').WeatherData} weather
 * @returns {{ details: string[], packing: string[] }}
 */
export function applyBudgetTailoring(budget, weather) {
  const normBudget = (budget || 'Medium').trim().toLowerCase();
  const temp = weather?.tempC;
  const isRain = (weather?.rainChancePct ?? 0) >= 30;
  const isStorm = (weather?.windKmh ?? 0) >= 50 || (weather?.wmoCode ?? 0) >= 95;

  const details = [];
  const packing = [];

  switch (normBudget) {
    case 'high':
      if (isRain || isStorm || (typeof temp === 'number' && temp >= 32)) {
        details.push(
          'Weather premium tip: Pre-book private air-conditioned vehicle transfers to eliminate transit delays during adverse conditions.',
        );
      } else {
        details.push(
          'Flexible premium booking: Secure priority access / skip-the-line passes for major cultural sites.',
        );
      }
      packing.push('Noise-cancelling transit headphones');
      break;

    case 'low':
      if (isRain) {
        details.push(
          'Budget alert: Rainy weather causes ride-hail surge pricing; use covered underground metro stations or day transit passes.',
        );
        details.push('Free activity: Explore municipal galleries and public indoor arcades.');
      } else if (typeof temp === 'number' && temp >= 30) {
        details.push(
          'Heat savings: Stay hydrated using free city public water fountains; avoid expensive tourist kiosk beverages.',
        );
      } else {
        details.push(
          'Great value: Weather is ideal for free self-guided walking tours and open public gardens.',
        );
      }
      packing.push('Reusable hydration flask');
      break;

    case 'medium':
    default:
      if (isRain) {
        details.push(
          'Transit tip: Combine standard metro lines with verified ride-hailing apps for final-mile connections during rain.',
        );
      } else {
        details.push(
          'Standard booking: Reserve timed-entry tickets online 24 hours ahead to balance cost and queue times.',
        );
      }
      packing.push('Portable power bank');
      break;
  }

  return {
    details,
    packing,
  };
}
