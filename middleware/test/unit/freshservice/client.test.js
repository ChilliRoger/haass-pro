import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FreshserviceClient,
  FreshserviceError,
  extractServiceRequestFields,
  TAG_WEATHER_BRIEF_POSTED,
  TAG_RISK_LOW,
} from '../../../src/freshservice/client.js';

describe('freshservice client module', () => {
  describe('extractServiceRequestFields', () => {
    it('extracts fields with exact standard names', () => {
      const items = [
        {
          id: 1,
          custom_fields: {
            destination_city: 'Tokyo',
            travel_date: '2026-10-15',
            trip_type: 'Vacation',
            budget_range: 'Medium',
            special_needs: false,
            notes: 'First time visiting Japan',
          },
        },
      ];

      const res = extractServiceRequestFields(items);
      assert.equal(res.destinationCity, 'Tokyo');
      assert.equal(res.travelDate, '2026-10-15');
      assert.equal(res.tripType, 'Vacation');
      assert.equal(res.budgetRange, 'Medium');
      assert.equal(res.specialNeeds, false);
      assert.equal(res.notes, 'First time visiting Japan');
    });

    it('extracts fields with numeric suffixes from Freshservice form designer', () => {
      const items = [
        {
          id: 2,
          custom_fields: {
            destination_city_10023: 'London',
            travel_date_10023: '2026-11-20',
            trip_type_10023: 'Business',
            budget_range_10023: 'High',
            special_needs_10023: true,
            notes_10023: 'Wheelchair access required',
          },
        },
      ];

      const res = extractServiceRequestFields(items);
      assert.equal(res.destinationCity, 'London');
      assert.equal(res.travelDate, '2026-11-20');
      assert.equal(res.tripType, 'Business');
      assert.equal(res.budgetRange, 'High');
      assert.equal(res.specialNeeds, true);
      assert.equal(res.notes, 'Wheelchair access required');
    });

    it('returns nulls for empty or missing requested_items', () => {
      assert.deepEqual(extractServiceRequestFields([]), {
        destinationCity: null,
        travelDate: null,
        tripType: null,
        budgetRange: null,
        specialNeeds: null,
        notes: null,
      });

      assert.deepEqual(extractServiceRequestFields(null), {
        destinationCity: null,
        travelDate: null,
        tripType: null,
        budgetRange: null,
        specialNeeds: null,
        notes: null,
      });
    });
  });

  describe('FreshserviceClient constructor and auth', () => {
    it('throws error when domain or apiKey is missing', () => {
      assert.throws(() => new FreshserviceClient({ apiKey: 'key' }), /domain is required/);
      assert.throws(() => new FreshserviceClient({ domain: 'test.com' }), /API key is required/);
    });

    it('normalises domain and constructs Basic Auth header with apiKey:X', () => {
      const client = new FreshserviceClient({
        domain: 'https://sample.freshservice.com/',
        apiKey: 'my_api_key_123',
      });

      assert.equal(client.baseUrl, 'https://sample.freshservice.com');
      const expectedAuth = `Basic ${Buffer.from('my_api_key_123:X').toString('base64')}`;
      assert.equal(client.authHeader, expectedAuth);
    });
  });

  describe('hasWeatherBriefPosted', () => {
    it('detects idempotency tag from ticket object', () => {
      assert.equal(
        FreshserviceClient.hasWeatherBriefPosted({
          tags: ['service-request', TAG_WEATHER_BRIEF_POSTED],
        }),
        true,
      );

      assert.equal(
        FreshserviceClient.hasWeatherBriefPosted({
          tags: ['service-request', 'vip'],
        }),
        false,
      );
    });

    it('detects idempotency tag from raw string array', () => {
      assert.equal(
        FreshserviceClient.hasWeatherBriefPosted([TAG_WEATHER_BRIEF_POSTED, TAG_RISK_LOW]),
        true,
      );
      assert.equal(FreshserviceClient.hasWeatherBriefPosted([]), false);
      assert.equal(FreshserviceClient.hasWeatherBriefPosted(null), false);
    });
  });

  describe('API operations with simulated fetch', () => {
    it('getTicket fetches ticket details with auth header', async () => {
      const calls = [];
      const mockFetch = async (url, opts) => {
        calls.push({ url, opts });
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ ticket: { id: 101, tags: ['travel'] } }),
        };
      };

      const client = new FreshserviceClient({
        domain: 'demo.freshservice.com',
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      const ticket = await client.getTicket(101);
      assert.equal(ticket.id, 101);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, 'https://demo.freshservice.com/api/v2/tickets/101');
      assert.equal(calls[0].opts.headers.Authorization, client.authHeader);
    });

    it('getRequestedItems fetches items correctly', async () => {
      const mockFetch = async (url) => {
        assert.ok(url.endsWith('/api/v2/tickets/101/requested_items'));
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ requested_items: [{ id: 5 }] }),
        };
      };

      const client = new FreshserviceClient({
        domain: 'demo.freshservice.com',
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      const items = await client.getRequestedItems(101);
      assert.equal(items.length, 1);
      assert.equal(items[0].id, 5);
    });

    it('addNote posts JSON public note successfully', async () => {
      let postedBody = null;
      const mockFetch = async (url, opts) => {
        assert.ok(url.endsWith('/api/v2/tickets/101/notes'));
        assert.equal(opts.method, 'POST');
        postedBody = JSON.parse(opts.body);
        return {
          ok: true,
          status: 201,
          text: async () => JSON.stringify({ conversation: { id: 999 } }),
        };
      };

      const client = new FreshserviceClient({
        domain: 'demo.freshservice.com',
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await client.addNote(101, { body: '<p>Recommendation</p>', isPrivate: false });
      assert.equal(postedBody.body, '<p>Recommendation</p>');
      assert.equal(postedBody.private, false);
    });

    it('addNote falls back to FormData when JSON receives 400', async () => {
      let attempt = 0;
      const mockFetch = async (url, opts) => {
        attempt++;
        if (attempt === 1) {
          // JSON attempt fails with 400 invalid_field
          return {
            ok: false,
            status: 400,
            text: async () => JSON.stringify({ description: 'Validation failed' }),
          };
        }
        // FormData fallback attempt succeeds
        assert.ok(opts.body instanceof FormData);
        return {
          ok: true,
          status: 201,
          text: async () => JSON.stringify({ conversation: { id: 999 } }),
        };
      };

      const client = new FreshserviceClient({
        domain: 'demo.freshservice.com',
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      const res = await client.addNote(101, { body: '<p>Fallback</p>', isPrivate: false });
      assert.equal(attempt, 2);
      assert.equal(res.conversation.id, 999);
    });

    it('updateTicketTags merges tags without overwriting existing tags', async () => {
      let putBody = null;
      const mockFetch = async (url, opts) => {
        if (opts.method === 'PUT') {
          putBody = JSON.parse(opts.body);
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ ticket: { tags: putBody.tags } }),
          };
        }
        // GET ticket
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ ticket: { id: 101, tags: ['travel-req', 'department-it'] } }),
        };
      };

      const client = new FreshserviceClient({
        domain: 'demo.freshservice.com',
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      const merged = await client.updateTicketTags(101, [TAG_WEATHER_BRIEF_POSTED, TAG_RISK_LOW]);
      assert.deepEqual(merged, [
        'travel-req',
        'department-it',
        TAG_WEATHER_BRIEF_POSTED,
        TAG_RISK_LOW,
      ]);
      assert.deepEqual(putBody.tags, merged);
    });

    it('updateTicketTags skips network write if tags are already present', async () => {
      let putCalled = false;
      const mockFetch = async (url, opts) => {
        if (opts.method === 'PUT') {
          putCalled = true;
          return { ok: true, status: 200, text: async () => '{}' };
        }
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ ticket: { id: 101, tags: [TAG_WEATHER_BRIEF_POSTED] } }),
        };
      };

      const client = new FreshserviceClient({
        domain: 'demo.freshservice.com',
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      const tags = await client.updateTicketTags(101, [TAG_WEATHER_BRIEF_POSTED]);
      assert.equal(putCalled, false);
      assert.deepEqual(tags, [TAG_WEATHER_BRIEF_POSTED]);
    });

    it('retries on HTTP 429 with Retry-After header', async () => {
      let attempts = 0;
      const mockFetch = async () => {
        attempts++;
        if (attempts === 1) {
          return {
            ok: false,
            status: 429,
            headers: new Headers({ 'retry-after': '0' }),
            text: async () => JSON.stringify({ description: 'Rate limit exceeded' }),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ ticket: { id: 101 } }),
        };
      };

      const client = new FreshserviceClient({
        domain: 'demo.freshservice.com',
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      const ticket = await client.getTicket(101);
      assert.equal(ticket.id, 101);
      assert.equal(attempts, 2);
    });

    it('throws FreshserviceError on non-2xx status', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: 'Ticket not found' }),
      });

      const client = new FreshserviceClient({
        domain: 'demo.freshservice.com',
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      await assert.rejects(
        () => client.getTicket(999),
        (err) => {
          assert.ok(err instanceof FreshserviceError);
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });
  });
});
