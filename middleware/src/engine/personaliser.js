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

/**
 * Evaluates special needs and notes for health/accessibility considerations
 * correlated with expected weather hazards.
 *
 * @param {string | boolean | null | undefined} specialNeeds - Special needs flag or details
 * @param {string | null | undefined} notes - Freeform travel notes
 * @param {import('../engine/normaliser.js').WeatherData} weather
 * @returns {{ cautions: string[], packing: string[] }}
 */
export function applySpecialNeedsAwareness(specialNeeds, notes, weather) {
  const parts = [];
  if (typeof specialNeeds === 'string') {
    parts.push(specialNeeds);
  }
  if (typeof notes === 'string') {
    parts.push(notes);
  }
  const text = parts.join(' ').toLowerCase();

  const isSpecialNeedsActive =
    specialNeeds === true ||
    (typeof specialNeeds === 'string' &&
      ['yes', 'true', '1'].includes(specialNeeds.trim().toLowerCase())) ||
    text.length > 0;

  if (!isSpecialNeedsActive && text.length === 0) {
    return { cautions: [], packing: [] };
  }

  const cautions = [];
  const packing = [];

  const temp = weather?.tempC;
  const isRain = (weather?.rainChancePct ?? 0) >= 30;
  const isSnow = (weather?.wmoCode ?? 0) >= 71 && (weather?.wmoCode ?? 0) <= 86;
  const isWindy = (weather?.windKmh ?? 0) >= 35 || (weather?.gustsKmh ?? 0) >= 45;
  const isHot = typeof temp === 'number' && temp >= 30;
  const isExtremeHeat = typeof temp === 'number' && temp >= 35;
  const isCold = typeof temp === 'number' && temp <= 5;

  let keywordMatched = false;

  // 1. Mobility / Accessibility
  if (
    text.includes('wheelchair') ||
    text.includes('mobility') ||
    text.includes('crutches') ||
    text.includes('walker') ||
    text.includes('stroller')
  ) {
    keywordMatched = true;
    if (isRain || isSnow) {
      cautions.push(
        'Mobility alert: Wet or slippery walkways increase fall risk; confirm step-free entrances and accessible elevator availability with venues.',
      );
      packing.push('Waterproof poncho for mobility device');
    }
    if (isExtremeHeat) {
      cautions.push(
        'Elevated thermal load can heighten physical fatigue during mobility transit; plan shaded rest intervals and use climate-controlled transport.',
      );
    }
    if (!isRain && !isSnow && !isExtremeHeat) {
      cautions.push(
        'Mobility verification: Confirm ramp grades and step-free transit connections along planned routes.',
      );
    }
  }

  // 2. Age / Vulnerability (Seniors, Infants, Pregnancy)
  if (
    text.includes('elderly') ||
    text.includes('senior') ||
    text.includes('infant') ||
    text.includes('baby') ||
    text.includes('toddler') ||
    text.includes('pregnant') ||
    text.includes('pregnancy')
  ) {
    keywordMatched = true;
    if (isHot) {
      cautions.push(
        'Thermal advisory for vulnerable travelers: High temperatures pose acute dehydration and heat exhaustion risks; schedule indoor activities between 11:00 and 16:00.',
      );
      packing.push('Electrolyte rehydration salts');
    }
    if (isCold) {
      cautions.push(
        'Cold exposure advisory: Vulnerable travelers lose body heat quickly; ensure thermal layering and limit prolonged outdoor exposure.',
      );
      packing.push('Thermal base layers');
    }
  }

  // 3. Respiratory / Allergies
  if (
    text.includes('asthma') ||
    text.includes('respiratory') ||
    text.includes('breathing') ||
    text.includes('allergy') ||
    text.includes('allergies') ||
    text.includes('pollen')
  ) {
    keywordMatched = true;
    if (isWindy) {
      cautions.push(
        'High winds can disperse airborne dust, mold, and environmental irritants; keep rescue inhalers and antihistamines accessible.',
      );
      packing.push('Protective face covering', 'Prescription inhaler / antihistamines');
    } else if (isHot) {
      cautions.push(
        'Hot, humid air can exacerbate respiratory discomfort; avoid strenuous outdoor exertion during midday peaks.',
      );
      packing.push('Prescription inhaler / antihistamines');
    } else {
      cautions.push(
        'Carry all required respiratory medication and allergy relief in carry-on baggage.',
      );
      packing.push('Prescription inhaler / antihistamines');
    }
  }

  // 4. Chronic Medical / Medication storage (Diabetes / Insulin)
  if (text.includes('diabetic') || text.includes('diabetes') || text.includes('insulin')) {
    keywordMatched = true;
    if (isHot) {
      cautions.push(
        'Medical storage advisory: Insulin and glucose monitoring test strips degrade above 30C; store medical supplies in an insulated cooling case.',
      );
      packing.push('Insulated medication cooling pouch');
    } else {
      cautions.push(
        'Keep medical supplies, monitor devices, and glucose reserves in personal carry-on bags.',
      );
    }
  }

  // 5. Fallback if specialNeeds flag was checked/yes but no known keyword in notes
  if (!keywordMatched && (specialNeeds === true || String(specialNeeds).toLowerCase() === 'yes')) {
    cautions.push(
      'Special assistance requested: Contact airlines and local transit operators in advance to arrange dedicated terminal support.',
    );
  }

  return {
    cautions,
    packing: [...new Set(packing)],
  };
}
