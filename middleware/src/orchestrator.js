/**
 * orchestrator.js
 *
 * Webhook orchestration pipeline for the Weather-Based Travel Recommendation middleware.
 * Coordinates ticket retrieval, stateless idempotency checking, date validation,
 * geocoding, tiered weather retrieval, recommendation evaluation, note posting, and tag management.
 *
 * Adheres to:
 * - ADR-001 (Middleware approach: async execution after immediate 202)
 * - ADR-003 (Dynamic geocoding with first-match resolution)
 * - ADR-004 (Tiered weather lookup: forecast 0-14d, seasonal 15-180d, current 181+d)
 * - ADR-005 (Stateless idempotency via ticket tags: weather-brief-posted)
 * - ADR-007 (Deterministic recommendation engine: no LLM)
 * Strictly plain ASCII - no emojis.
 */

import { getConfig } from './config.js';
import { logger } from './logger.js';
import { validateTravelDate } from './validation/date-rules.js';
import { searchCity } from './geocoding/client.js';
import { selectTier } from './providers/tier-selector.js';
import { fetchForecastWeather, fetchCurrentWeather } from './providers/forecast.js';
import { fetchSeasonalWeather } from './providers/seasonal.js';
import { computeRecommendation } from './engine/recommender.js';
import {
  buildRecommendationNote,
  buildFallbackNote,
  buildDateValidationErrorNote,
} from './engine/note-builder.js';
import {
  FreshserviceClient,
  extractServiceRequestFields,
  TAG_WEATHER_BRIEF_POSTED,
} from './freshservice/client.js';

/**
 * Executes the complete travel recommendation pipeline for a Freshservice ticket.
 *
 * @param {number | string} ticketId - Freshservice Ticket ID
 * @param {object} [options={}] - Optional dependency overrides for testing
 * @param {FreshserviceClient} [options.fsClient]
 * @param {typeof searchCity} [options.searchCityFn]
 * @param {typeof fetchForecastWeather} [options.fetchForecastWeatherFn]
 * @param {typeof fetchSeasonalWeather} [options.fetchSeasonalWeatherFn]
 * @param {typeof fetchCurrentWeather} [options.fetchCurrentWeatherFn]
 * @param {Date | string} [options.today]
 * @returns {Promise<{ success: boolean, skipped?: boolean, reason?: string, error?: string, [key: string]: any }>}
 */
export async function processTicketWebhook(ticketId, options = {}) {
  const log = logger.child({ ticketId });

  if (!ticketId) {
    log.error('processTicketWebhook called without a valid ticketId');
    return { success: false, reason: 'missing_ticket_id' };
  }

  log.info('Starting weather recommendation pipeline');

  // Initialise Freshservice client
  let fsClient = options.fsClient;
  if (!fsClient) {
    const config = getConfig();
    fsClient = new FreshserviceClient({
      domain: config.freshserviceDomain,
      apiKey: config.freshserviceApiKey,
    });
  }

  // Step 1: Stateless Idempotency check via ticket tags (ADR-005)
  let ticket;
  try {
    ticket = await fsClient.getTicket(ticketId);
  } catch (err) {
    log.error({ err: err.message }, 'Failed to fetch ticket from Freshservice');
    return { success: false, reason: 'ticket_fetch_failed', error: err.message };
  }

  if (FreshserviceClient.hasWeatherBriefPosted(ticket)) {
    log.info(
      { tags: ticket.tags },
      'Weather brief tag (weather-brief-posted) already present; skipping execution (idempotent)',
    );
    return { success: true, skipped: true, reason: 'already_posted' };
  }

  // Step 2: Fetch requested items and extract catalog form fields
  let requestedItems;
  try {
    requestedItems = await fsClient.getRequestedItems(ticketId);
  } catch (err) {
    log.error({ err: err.message }, 'Failed to fetch requested items from Freshservice');
    return { success: false, reason: 'requested_items_fetch_failed', error: err.message };
  }

  const fields = extractServiceRequestFields(requestedItems);
  const { destinationCity, travelDate, tripType, budgetRange, specialNeeds, notes } = fields;

  log.info(
    { destinationCity, travelDate, tripType, budgetRange, specialNeeds: Boolean(specialNeeds) },
    'Extracted service catalog fields',
  );

  // Validate presence of mandatory fields
  const missingFields = [];
  if (!destinationCity) {
    missingFields.push('Destination City');
  }
  if (!travelDate) {
    missingFields.push('Travel Date');
  }

  if (missingFields.length > 0) {
    log.warn({ missingFields }, 'Required catalog fields missing from service request');
    const fallbackHtml = buildFallbackNote({
      destination: destinationCity || 'Unspecified',
      travelDate: travelDate || 'Unspecified',
      reason: `Required travel catalog fields were missing or unpopulated (${missingFields.join(', ')}).`,
      actionRequired:
        'Please review ticket details with requester and verify travel requirements manually.',
    });

    try {
      await fsClient.addNote(ticketId, { body: fallbackHtml, isPrivate: false });
      await fsClient.updateTicketTags(ticketId, [TAG_WEATHER_BRIEF_POSTED]);
    } catch (noteErr) {
      log.error({ err: noteErr.message }, 'Failed to post missing fields fallback note');
    }

    return { success: false, reason: 'missing_required_fields', missingFields };
  }

  // Step 3: Date validation (R-20, R-21, R-22, R-23)
  const dateValidation = validateTravelDate(travelDate, options.today);
  if (!dateValidation.isValid) {
    const errorMsg = dateValidation.error || dateValidation.errorMessage;
    log.warn({ travelDate, error: errorMsg }, 'Travel date failed validation rules');
    const dateErrorHtml = buildDateValidationErrorNote({
      travelDate,
      errorMessage: errorMsg,
    });

    try {
      await fsClient.addNote(ticketId, { body: dateErrorHtml, isPrivate: false });
      await fsClient.updateTicketTags(ticketId, [TAG_WEATHER_BRIEF_POSTED]);
    } catch (noteErr) {
      log.error({ err: noteErr.message }, 'Failed to post date validation error note');
    }

    return {
      success: false,
      reason: 'date_validation_failed',
      error: errorMsg,
    };
  }

  // Step 4: Geocoding location resolution (ADR-003)
  const geoFn = options.searchCityFn || searchCity;
  let place = null;
  try {
    place = await geoFn(destinationCity);
  } catch (geoErr) {
    log.error({ destinationCity, err: geoErr.message }, 'Geocoding service error');
  }

  if (!place) {
    log.warn({ destinationCity }, 'City could not be resolved by geocoding provider');
    const fallbackHtml = buildFallbackNote({
      destination: destinationCity,
      travelDate,
      reason: `Unable to resolve destination city "${destinationCity}" to geographic coordinates.`,
      actionRequired:
        'Please verify destination spelling with requester or conduct manual weather assessment.',
    });

    try {
      await fsClient.addNote(ticketId, { body: fallbackHtml, isPrivate: false });
      await fsClient.updateTicketTags(ticketId, [TAG_WEATHER_BRIEF_POSTED]);
    } catch (noteErr) {
      log.error({ err: noteErr.message }, 'Failed to post geocoding fallback note');
    }

    return { success: false, reason: 'geocoding_failed', destinationCity };
  }

  log.info({ formattedPlace: place.formattedPlace }, 'Resolved geographic coordinates');

  // Step 5: Weather retrieval based on tiered horizon (ADR-004)
  const tierInfo = selectTier(travelDate, options.today);
  log.info(
    { tier: tierInfo.tier, daysFromToday: tierInfo.daysFromToday, source: tierInfo.source },
    'Selected weather horizon tier',
  );

  let weatherData;
  try {
    if (tierInfo.tier === 1) {
      const fetchFn = options.fetchForecastWeatherFn || fetchForecastWeather;
      weatherData = await fetchFn({
        latitude: place.latitude,
        longitude: place.longitude,
        targetDate: travelDate,
        timezone: place.timezone,
      });
    } else if (tierInfo.tier === 2) {
      const fetchFn = options.fetchSeasonalWeatherFn || fetchSeasonalWeather;
      weatherData = await fetchFn({
        latitude: place.latitude,
        longitude: place.longitude,
        targetDate: travelDate,
        timezone: place.timezone,
      });
    } else {
      const fetchFn = options.fetchCurrentWeatherFn || fetchCurrentWeather;
      weatherData = await fetchFn({
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone,
      });
    }
  } catch (weatherErr) {
    log.error(
      { tier: tierInfo.tier, destination: place.formattedPlace, err: weatherErr.message },
      'Weather provider lookup failed',
    );

    const fallbackHtml = buildFallbackNote({
      destination: place.formattedPlace,
      travelDate,
      reason: 'Upstream weather service was temporarily unavailable or timed out.',
      actionRequired:
        'Please verify destination weather conditions manually before approving travel.',
    });

    try {
      await fsClient.addNote(ticketId, { body: fallbackHtml, isPrivate: false });
      await fsClient.updateTicketTags(ticketId, [TAG_WEATHER_BRIEF_POSTED]);
    } catch (noteErr) {
      log.error({ err: noteErr.message }, 'Failed to post weather provider fallback note');
    }

    return { success: false, reason: 'weather_fetch_failed', error: weatherErr.message };
  }

  // Step 6: Recommendation engine and WOW personalisation layers
  const recommendation = computeRecommendation(weatherData);
  log.info(
    {
      verdict: recommendation.verdict,
      riskScore: recommendation.riskScore,
      riskTag: recommendation.riskTag,
    },
    'Computed travel recommendation',
  );

  const noteHtml = buildRecommendationNote({
    destination: place.formattedPlace,
    travelDate,
    weather: weatherData,
    recommendation,
    tripType,
    budget: budgetRange,
    specialNeeds,
    notes,
  });

  // Step 7: Post recommendation note to Freshservice ticket
  try {
    await fsClient.addNote(ticketId, { body: noteHtml, isPrivate: false });
    log.info('Posted public recommendation note to Freshservice ticket');
  } catch (noteErr) {
    log.error({ err: noteErr.message }, 'Failed to post recommendation note to Freshservice');
    return { success: false, reason: 'note_post_failed', error: noteErr.message };
  }

  // Step 8: Update ticket tags with idempotency tag and risk tag (ADR-005)
  try {
    await fsClient.updateTicketTags(ticketId, [TAG_WEATHER_BRIEF_POSTED, recommendation.riskTag]);
    log.info(
      { tags: [TAG_WEATHER_BRIEF_POSTED, recommendation.riskTag] },
      'Updated ticket tags in Freshservice',
    );
  } catch (tagErr) {
    log.error({ err: tagErr.message }, 'Failed to update ticket tags in Freshservice');
    // Note was successfully posted, so we treat this as partial success
  }

  return {
    success: true,
    ticketId,
    destination: place.formattedPlace,
    tier: tierInfo.tier,
    verdict: recommendation.verdict,
    riskScore: recommendation.riskScore,
    riskTag: recommendation.riskTag,
  };
}
