import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { processTicketWebhook } from '../../src/orchestrator.js';
import { TAG_WEATHER_BRIEF_POSTED } from '../../src/freshservice/client.js';

describe('orchestrator module', () => {
  const fixedToday = '2026-10-01';

  const createMockFsClient = ({
    tags = [],
    requestedItems = [],
    ticketFail = false,
    itemsFail = false,
    addNoteFail = false,
  } = {}) => {
    const notesPosted = [];
    const tagsUpdated = [];

    return {
      notesPosted,
      tagsUpdated,
      async getTicket(id) {
        if (ticketFail) {
          throw new Error('Network error getting ticket');
        }
        return { id, tags: [...tags] };
      },
      async getRequestedItems(_id) {
        if (itemsFail) {
          throw new Error('Network error getting items');
        }
        return requestedItems;
      },
      async addNote(id, note) {
        if (addNoteFail) {
          throw new Error('Failed to post note');
        }
        notesPosted.push({ id, ...note });
        return { conversation: { id: 1001 } };
      },
      async updateTicketTags(id, newTags) {
        tagsUpdated.push({ id, newTags });
        return newTags;
      },
    };
  };

  it('rejects execution when ticketId is missing', async () => {
    const res = await processTicketWebhook(null);
    assert.equal(res.success, false);
    assert.equal(res.reason, 'missing_ticket_id');
  });

  it('handles ticket fetch failure gracefully', async () => {
    const fsClient = createMockFsClient({ ticketFail: true });
    const res = await processTicketWebhook(100, { fsClient });
    assert.equal(res.success, false);
    assert.equal(res.reason, 'ticket_fetch_failed');
  });

  it('skips execution when weather-brief-posted tag is already present (stateless idempotency)', async () => {
    const fsClient = createMockFsClient({ tags: ['travel-req', TAG_WEATHER_BRIEF_POSTED] });
    const res = await processTicketWebhook(101, { fsClient });
    assert.equal(res.success, true);
    assert.equal(res.skipped, true);
    assert.equal(res.reason, 'already_posted');
    assert.equal(fsClient.notesPosted.length, 0);
  });

  it('handles requested items fetch failure gracefully', async () => {
    const fsClient = createMockFsClient({ itemsFail: true });
    const res = await processTicketWebhook(102, { fsClient });
    assert.equal(res.success, false);
    assert.equal(res.reason, 'requested_items_fetch_failed');
  });

  it('posts fallback note when mandatory catalog fields are missing', async () => {
    const fsClient = createMockFsClient({
      requestedItems: [
        {
          custom_fields: {
            destination_city: 'Tokyo',
            // Missing travel_date
          },
        },
      ],
    });

    const res = await processTicketWebhook(103, { fsClient, today: fixedToday });
    assert.equal(res.success, false);
    assert.equal(res.reason, 'missing_required_fields');
    assert.equal(fsClient.notesPosted.length, 1);
    assert.ok(fsClient.notesPosted[0].body.includes('Required travel catalog fields were missing'));
    assert.ok(fsClient.tagsUpdated[0].newTags.includes(TAG_WEATHER_BRIEF_POSTED));
  });

  it('posts validation error note when travel date is in the past (R-20)', async () => {
    const fsClient = createMockFsClient({
      requestedItems: [
        {
          custom_fields: {
            destination_city: 'Berlin',
            travel_date: '2026-09-20', // past relative to fixedToday
          },
        },
      ],
    });

    const res = await processTicketWebhook(104, { fsClient, today: fixedToday });
    assert.equal(res.success, false);
    assert.equal(res.reason, 'date_validation_failed');
    assert.equal(res.error, 'Travel Date cannot be in the past.');
    assert.equal(fsClient.notesPosted.length, 1);
    assert.ok(fsClient.notesPosted[0].body.includes('Travel Date cannot be in the past.'));
    assert.ok(fsClient.tagsUpdated[0].newTags.includes(TAG_WEATHER_BRIEF_POSTED));
  });

  it('posts fallback note when geocoding service cannot resolve city', async () => {
    const fsClient = createMockFsClient({
      requestedItems: [
        {
          custom_fields: {
            destination_city: 'NonExistentPlaceXYZ',
            travel_date: '2026-10-10',
          },
        },
      ],
    });

    const res = await processTicketWebhook(105, {
      fsClient,
      today: fixedToday,
      searchCityFn: async () => null,
    });

    assert.equal(res.success, false);
    assert.equal(res.reason, 'geocoding_failed');
    assert.equal(fsClient.notesPosted.length, 1);
    assert.ok(
      fsClient.notesPosted[0].body.includes('Unable to resolve destination city') &&
        fsClient.notesPosted[0].body.includes('NonExistentPlaceXYZ'),
    );
    assert.ok(fsClient.tagsUpdated[0].newTags.includes(TAG_WEATHER_BRIEF_POSTED));
  });

  it('posts fallback note when weather provider throws an error', async () => {
    const fsClient = createMockFsClient({
      requestedItems: [
        {
          custom_fields: {
            destination_city: 'London',
            travel_date: '2026-10-05', // Tier 1 (4 days ahead)
          },
        },
      ],
    });

    const res = await processTicketWebhook(106, {
      fsClient,
      today: fixedToday,
      searchCityFn: async () => ({
        formattedPlace: 'London, England, United Kingdom',
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
      }),
      fetchForecastWeatherFn: async () => {
        throw new Error('Upstream timeout 504');
      },
    });

    assert.equal(res.success, false);
    assert.equal(res.reason, 'weather_fetch_failed');
    assert.equal(fsClient.notesPosted.length, 1);
    assert.ok(
      fsClient.notesPosted[0].body.includes('Upstream weather service was temporarily unavailable'),
    );
    assert.ok(fsClient.tagsUpdated[0].newTags.includes(TAG_WEATHER_BRIEF_POSTED));
  });

  it('executes complete end-to-end pipeline for Tier 1 forecast (0-14 days)', async () => {
    const fsClient = createMockFsClient({
      requestedItems: [
        {
          custom_fields: {
            destination_city_101: 'Paris',
            travel_date_101: '2026-10-08', // 7 days ahead -> Tier 1
            trip_type_101: 'Vacation',
            budget_range_101: 'Medium',
            special_needs_101: false,
            notes_101: 'Sightseeing trip',
          },
        },
      ],
    });

    const res = await processTicketWebhook(107, {
      fsClient,
      today: fixedToday,
      searchCityFn: async () => ({
        formattedPlace: 'Paris, Ile-de-France, France',
        latitude: 48.8566,
        longitude: 2.3522,
        timezone: 'Europe/Paris',
      }),
      fetchForecastWeatherFn: async () => ({
        tempC: 21,
        feelsLikeC: 22,
        rainChancePct: 10,
        precipSumMm: 0.1,
        uvIndex: 4,
        windKmh: 14,
        gustsKmh: 20,
        condition: 'Clear sky',
        wmoCode: 0,
        source: 'Open-Meteo Standard Forecast (Tier 1)',
        confidence: 'Forecast (High Confidence)',
      }),
    });

    assert.equal(res.success, true);
    assert.equal(res.tier, 1);
    assert.equal(res.destination, 'Paris, Ile-de-France, France');
    assert.equal(res.verdict, 'Go');
    assert.equal(res.riskTag, 'weather-risk-low');

    // Note assertions
    assert.equal(fsClient.notesPosted.length, 1);
    const noteBody = fsClient.notesPosted[0].body;
    assert.ok(noteBody.includes('Paris, Ile-de-France, France'));
    assert.ok(noteBody.includes('VERDICT: Go'));
    assert.ok(noteBody.includes('Open-Meteo (https://open-meteo.com/) - CC BY 4.0'));

    // Tag assertions
    assert.equal(fsClient.tagsUpdated.length, 1);
    assert.deepEqual(fsClient.tagsUpdated[0].newTags, [
      TAG_WEATHER_BRIEF_POSTED,
      'weather-risk-low',
    ]);
  });

  it('executes complete end-to-end pipeline for Tier 2 seasonal outlook (15-180 days)', async () => {
    const fsClient = createMockFsClient({
      requestedItems: [
        {
          custom_fields: {
            destination_city: 'Zurich',
            travel_date: '2026-12-15', // ~75 days ahead -> Tier 2
            trip_type: 'Business',
            budget_range: 'High',
            special_needs: true,
            notes: 'Senior executive conference',
          },
        },
      ],
    });

    const res = await processTicketWebhook(108, {
      fsClient,
      today: fixedToday,
      searchCityFn: async () => ({
        formattedPlace: 'Zurich, Zurich, Switzerland',
        latitude: 47.3769,
        longitude: 8.5417,
        timezone: 'Europe/Zurich',
      }),
      fetchSeasonalWeatherFn: async () => ({
        tempC: 3,
        feelsLikeC: 1,
        rainChancePct: null,
        precipSumMm: 4.5,
        uvIndex: null,
        windKmh: 18,
        gustsKmh: 28,
        condition: 'Rain / drizzle seasonal outlook',
        wmoCode: 61,
        source: 'Open-Meteo Seasonal Ensemble (Tier 2)',
        confidence: 'Seasonal Outlook (Medium Confidence)',
      }),
    });

    assert.equal(res.success, true);
    assert.equal(res.tier, 2);
    assert.equal(res.destination, 'Zurich, Zurich, Switzerland');
    assert.ok(['Go with caution', 'Go', 'Reconsider'].includes(res.verdict));

    // Note assertions
    assert.equal(fsClient.notesPosted.length, 1);
    assert.ok(fsClient.notesPosted[0].body.includes('Seasonal Outlook (Medium Confidence)'));

    // Tag assertions
    assert.equal(fsClient.tagsUpdated.length, 1);
    assert.ok(fsClient.tagsUpdated[0].newTags.includes(TAG_WEATHER_BRIEF_POSTED));
    assert.ok(fsClient.tagsUpdated[0].newTags.includes(res.riskTag));
  });

  it('executes complete end-to-end pipeline for Tier 3 current baseline (181+ days)', async () => {
    const fsClient = createMockFsClient({
      requestedItems: [
        {
          custom_fields: {
            destination_city: 'Sydney',
            travel_date: '2027-05-10', // ~221 days ahead -> Tier 3
            trip_type: 'Adventure',
            budget_range: 'Low',
          },
        },
      ],
    });

    const res = await processTicketWebhook(109, {
      fsClient,
      today: fixedToday,
      searchCityFn: async () => ({
        formattedPlace: 'Sydney, New South Wales, Australia',
        latitude: -33.8688,
        longitude: 151.2093,
        timezone: 'Australia/Sydney',
      }),
      fetchCurrentWeatherFn: async () => ({
        tempC: 19,
        feelsLikeC: 19,
        rainChancePct: null,
        precipSumMm: 0,
        uvIndex: null,
        windKmh: 22,
        gustsKmh: 28,
        condition: 'Clear sky',
        wmoCode: 0,
        source: 'Open-Meteo Current Weather Baseline (Tier 3)',
        confidence: 'Current Climate Baseline (Indicative)',
      }),
    });

    assert.equal(res.success, true);
    assert.equal(res.tier, 3);
    assert.equal(res.destination, 'Sydney, New South Wales, Australia');
    assert.equal(fsClient.notesPosted.length, 1);
    assert.ok(fsClient.notesPosted[0].body.includes('Current Climate Baseline (Indicative)'));
  });

  it('returns note_post_failed if addNote throws an unrecoverable error', async () => {
    const fsClient = createMockFsClient({
      addNoteFail: true,
      requestedItems: [
        {
          custom_fields: {
            destination_city: 'Madrid',
            travel_date: '2026-10-04',
          },
        },
      ],
    });

    const res = await processTicketWebhook(110, {
      fsClient,
      today: fixedToday,
      searchCityFn: async () => ({
        formattedPlace: 'Madrid, Spain',
        latitude: 40.4168,
        longitude: -3.7038,
        timezone: 'Europe/Madrid',
      }),
      fetchForecastWeatherFn: async () => ({
        tempC: 25,
        feelsLikeC: 25,
        rainChancePct: 5,
        precipSumMm: 0,
        uvIndex: 5,
        windKmh: 10,
        gustsKmh: 15,
        condition: 'Mainly clear',
        wmoCode: 1,
        source: 'Open-Meteo Standard Forecast (Tier 1)',
        confidence: 'Forecast (High Confidence)',
      }),
    });

    assert.equal(res.success, false);
    assert.equal(res.reason, 'note_post_failed');
  });
});
