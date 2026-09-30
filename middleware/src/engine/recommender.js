/**
 * recommender.js
 *
 * Deterministic, rule-based recommendation engine for Weather-Based Travel Recommendation.
 * Evaluates weather conditions against verified thresholds, computes a 0-100 Weather Risk Score,
 * assigns verdicts (Go, Go with caution, Reconsider), and generates tailored travel advice.
 *
 * Adheres to Section 1, Section 12 (WOW feature), ADR-007, and docs/02-architecture.md.
 * Strictly plain ASCII - no emojis.
 */

import {
  RAIN_HIGH_PCT,
  RAIN_MODERATE_PCT,
  TEMP_COLD_C,
  TEMP_HOT_C,
  TEMP_WARM_C,
  UV_HIGH,
  UV_VERY_HIGH,
  WIND_STRONG_KMH,
  WIND_VERY_STRONG_KMH,
} from "../config.js";

/**
 * Evaluates heat and high temperature conditions.
 *
 * @param {import('../engine/normaliser.js').WeatherData} weather
 * @returns {{ risk: number, alerts: string[], packing: string[], severity: number }}
 */
export function evaluateHeatRule(weather) {
  const temp = weather?.tempC;
  if (temp === null || temp === undefined || typeof temp !== "number") {
    return { risk: 0, alerts: [], packing: [], severity: 0 };
  }

  if (temp >= TEMP_HOT_C) {
    return {
      risk: 35,
      alerts: [
        `High temperatures reaching ${Math.round(temp)}C. Stay hydrated and minimise midday sun exposure.`,
      ],
      packing: ["Sun hat", "Breathable lightweight clothing", "Electrolyte packets"],
      severity: 3,
    };
  }

  if (temp >= TEMP_WARM_C) {
    return {
      risk: 10,
      alerts: [`Warm weather around ${Math.round(temp)}C. Ideal for morning and evening activities.`],
      packing: ["Lightweight clothing", "Water bottle"],
      severity: 1,
    };
  }

  return { risk: 0, alerts: [], packing: [], severity: 0 };
}

/**
 * Evaluates cold and sub-zero temperature conditions as well as snowfall.
 *
 * @param {import('../engine/normaliser.js').WeatherData} weather
 * @returns {{ risk: number, alerts: string[], packing: string[], severity: number }}
 */
export function evaluateColdRule(weather) {
  const temp = weather?.tempC;
  const isSnow = typeof weather?.wmoCode === "number" && (
    (weather.wmoCode >= 71 && weather.wmoCode <= 77) ||
    weather.wmoCode === 85 ||
    weather.wmoCode === 86
  );

  let risk = 0;
  let severity = 0;
  const alerts = [];
  const packing = [];

  if (temp !== null && temp !== undefined && typeof temp === "number" && temp <= TEMP_COLD_C) {
    if (temp <= 0) {
      risk += 40;
      severity = 3;
      alerts.push(`Freezing conditions at ${Math.round(temp)}C. Risk of frost and icy surfaces.`);
      packing.push("Thermal base layers", "Heavy insulated coat", "Insulated gloves and warm hat");
    } else {
      risk += 25;
      severity = 2;
      alerts.push(`Cold weather around ${Math.round(temp)}C. Warm layered clothing recommended.`);
      packing.push("Thermal layers", "Warm jacket", "Scarf and gloves");
    }
  }

  if (isSnow) {
    risk += 20;
    severity = Math.max(severity, 2);
    alerts.push("Snowfall expected. Check local transit advisories and allow extra travel time.");
    packing.push("Waterproof winter boots");
  }

  return {
    risk,
    alerts,
    packing: [...new Set(packing)],
    severity,
  };
}

/**
 * Evaluates rainfall probability, precipitation volume, and rain weather codes.
 *
 * @param {import('../engine/normaliser.js').WeatherData} weather
 * @returns {{ risk: number, alerts: string[], packing: string[], severity: number }}
 */
export function evaluateRainRule(weather) {
  const rainPct = weather?.rainChancePct;
  const precipMm = weather?.precipSumMm;
  const code = weather?.wmoCode;

  const isRainByCode = typeof code === "number" && (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82)
  );

  let risk = 0;
  let severity = 0;
  const alerts = [];
  const packing = [];

  const hasHighChance = (typeof rainPct === "number" && rainPct >= RAIN_HIGH_PCT) ||
                        (typeof precipMm === "number" && precipMm >= 10);

  const hasModerateChance = (typeof rainPct === "number" && rainPct >= RAIN_MODERATE_PCT) ||
                            (typeof precipMm === "number" && precipMm >= 3) ||
                            isRainByCode;

  if (hasHighChance) {
    risk = 30;
    severity = 2;
    const detail = typeof rainPct === "number" ? `${rainPct}% chance` : `${precipMm}mm expected`;
    alerts.push(`High likelihood of rain (${detail}). Carry rain protection and prepare for wet ground.`);
    packing.push("Compact umbrella", "Waterproof rain jacket", "Water-resistant footwear");
  } else if (hasModerateChance) {
    risk = 15;
    severity = 1;
    const detail = typeof rainPct === "number" ? `${rainPct}% chance` : "scattered showers expected";
    alerts.push(`Moderate chance of rain (${detail}). Keep a portable umbrella handy.`);
    packing.push("Compact umbrella");
  }

  return {
    risk,
    alerts,
    packing,
    severity,
  };
}

/**
 * Evaluates thunderstorms, storm-force winds, and strong gusts.
 *
 * @param {import('../engine/normaliser.js').WeatherData} weather
 * @returns {{ risk: number, alerts: string[], packing: string[], severity: number }}
 */
export function evaluateStormAndWindRule(weather) {
  const wind = weather?.windKmh;
  const gusts = weather?.gustsKmh;
  const code = weather?.wmoCode;

  const isThunderstorm = code === 95 || code === 96 || code === 99;

  let risk = 0;
  let severity = 0;
  const alerts = [];
  const packing = [];

  if (isThunderstorm) {
    risk += 50;
    severity = Math.max(severity, 4);
    alerts.push("Thunderstorms forecasted with lightning risk. Stay indoors during active storms.");
    packing.push("Emergency power bank", "Portable flashlight");
  }

  const isSevereWind = (typeof wind === "number" && wind >= WIND_VERY_STRONG_KMH) ||
                       (typeof gusts === "number" && gusts >= 90);

  const isStrongWind = (typeof wind === "number" && wind >= WIND_STRONG_KMH) ||
                       (typeof gusts === "number" && gusts >= 65);

  if (isSevereWind) {
    risk += 40;
    severity = Math.max(severity, 3);
    const speed = Math.round(wind || gusts || 0);
    alerts.push(`Gale-force winds exceeding ${speed} km/h. Expect potential flight and transit disruptions.`);
    packing.push("Heavy windbreaker");
  } else if (isStrongWind) {
    risk += 20;
    severity = Math.max(severity, 2);
    const speed = Math.round(wind || gusts || 0);
    alerts.push(`Strong gusty winds reaching ${speed} km/h. Secure loose outdoor gear.`);
    packing.push("Windproof jacket");
  }

  return {
    risk: Math.min(risk, 70), // Capped so single category doesn't exceed 70 on its own
    alerts,
    packing: [...new Set(packing)],
    severity,
  };
}

/**
 * Evaluates ultraviolet (UV) radiation levels against UV_HIGH and UV_VERY_HIGH thresholds.
 *
 * @param {import('../engine/normaliser.js').WeatherData} weather
 * @returns {{ risk: number, alerts: string[], packing: string[], severity: number }}
 */
export function evaluateUvRule(weather) {
  const uv = weather?.uvIndex;
  if (uv === null || uv === undefined || typeof uv !== "number") {
    return { risk: 0, alerts: [], packing: [], severity: 0 };
  }

  let risk = 0;
  let severity = 0;
  const alerts = [];
  const packing = [];

  if (uv >= UV_VERY_HIGH) {
    risk = 25;
    severity = 2;
    alerts.push(`Very high UV index (${uv}). Extreme sun protection needed; limit direct midday exposure.`);
    packing.push("Broad-spectrum SPF 50+ sunscreen", "UV400 sunglasses", "Wide-brim sun hat");
  } else if (uv >= UV_HIGH) {
    risk = 15;
    severity = 1;
    alerts.push(`High UV index (${uv}). Sun protection recommended for outdoor sightseeing.`);
    packing.push("SPF 30+ sunscreen", "Sunglasses");
  }

  return {
    risk,
    alerts,
    packing,
    severity,
  };
}

/**
 * Evaluates pleasant and comfortable weather conditions (mild temperatures, low rain, calm winds).
 *
 * @param {import('../engine/normaliser.js').WeatherData} weather
 * @returns {{ isPleasant: boolean, alerts: string[], packing: string[] }}
 */
export function evaluatePleasantRule(weather) {
  const temp = weather?.tempC;
  const rainPct = weather?.rainChancePct;
  const wind = weather?.windKmh;
  const code = weather?.wmoCode;

  const isMildTemp = typeof temp === "number" && temp >= 18 && temp <= 27;
  const isLowRain = rainPct === null || rainPct === undefined || rainPct < RAIN_MODERATE_PCT;
  const isCalmWind = wind === null || wind === undefined || wind < 30;
  const isClearCode = code === null || code === undefined || code === 0 || code === 1 || code === 2;

  if (isMildTemp && isLowRain && isCalmWind && isClearCode) {
    const tempStr = Math.round(temp);
    return {
      isPleasant: true,
      alerts: [`Pleasant weather expected with comfortable temperatures around ${tempStr}C. Great conditions for outdoor sightseeing!`],
      packing: ["Comfortable walking shoes", "Light jacket for evenings", "Sunglasses"],
    };
  }

  return {
    isPleasant: false,
    alerts: [],
    packing: [],
  };
}
