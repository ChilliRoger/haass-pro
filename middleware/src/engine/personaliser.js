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
