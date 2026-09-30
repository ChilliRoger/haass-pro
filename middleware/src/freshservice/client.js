/**
 * client.js
 *
 * Freshservice REST API v2 client.
 * Handles ticket retrieval, requested items extraction, note posting, and tag management.
 *
 * Adheres to:
 * - ADR-005 (Stateless idempotency via ticket tags)
 * - ADR-006 (Zero external runtime dependencies; uses native fetch)
 * - Freshservice v2 API specification (Basic Auth apiKey:X, 429 Retry-After handling)
 * Strictly plain ASCII - no emojis.
 */

import { logger } from '../logger.js';

export const TAG_WEATHER_BRIEF_POSTED = 'weather-brief-posted';
export const TAG_RISK_LOW = 'weather-risk-low';
export const TAG_RISK_MEDIUM = 'weather-risk-medium';
export const TAG_RISK_HIGH = 'weather-risk-high';

export class FreshserviceError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {string} endpoint
   * @param {unknown} [responseBody]
   */
  constructor(message, statusCode, endpoint, responseBody = null) {
    super(message);
    this.name = 'FreshserviceError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.responseBody = responseBody;
  }
}

/**
 * Extracts travel recommendation catalog form fields from requested_items response.
 * Handles variable field key naming (such as numeric suffixes like destination_city_12345).
 *
 * @param {Array<object>} requestedItems - Array of requested items from Freshservice
 * @returns {{
 *   destinationCity: string | null,
 *   travelDate: string | null,
 *   tripType: string | null,
 *   budgetRange: string | null,
 *   specialNeeds: boolean | string | null,
 *   notes: string | null
 * }}
 */
export function extractServiceRequestFields(requestedItems) {
  const result = {
    destinationCity: null,
    travelDate: null,
    tripType: null,
    budgetRange: null,
    specialNeeds: null,
    notes: null,
  };

  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return result;
  }

  // Iterate over requested items and check custom_fields
  for (const item of requestedItems) {
    const fields = item?.custom_fields;
    if (!fields || typeof fields !== 'object') {
      continue;
    }

    for (const [key, val] of Object.entries(fields)) {
      if (val === undefined || val === null || val === '') {
        continue;
      }
      const lowerKey = key.toLowerCase();

      // Destination City
      if (
        !result.destinationCity &&
        (lowerKey.includes('destination') || lowerKey.includes('city'))
      ) {
        result.destinationCity = String(val).trim();
      }

      // Travel Date
      if (!result.travelDate && lowerKey.includes('travel') && lowerKey.includes('date')) {
        result.travelDate = String(val).trim();
      }

      // Trip Type
      if (!result.tripType && lowerKey.includes('trip') && lowerKey.includes('type')) {
        result.tripType = String(val).trim();
      }

      // Budget Range
      if (!result.budgetRange && lowerKey.includes('budget')) {
        result.budgetRange = String(val).trim();
      }

      // Special Needs
      if (!result.specialNeeds && lowerKey.includes('special') && lowerKey.includes('need')) {
        result.specialNeeds = val;
      }

      // Notes
      if (!result.notes && lowerKey.includes('note')) {
        result.notes = String(val).trim();
      }
    }
  }

  return result;
}

export class FreshserviceClient {
  /**
   * @param {object} options
   * @param {string} options.domain - Freshservice tenant domain (e.g. company.freshservice.com)
   * @param {string} options.apiKey - Freshservice agent API key
   * @param {number} [options.timeoutMs=10000] - Request timeout in milliseconds
   * @param {typeof fetch} [options.fetchFn=fetch] - Injectable fetch implementation for tests
   */
  constructor({ domain, apiKey, timeoutMs = 10000, fetchFn = globalThis.fetch }) {
    if (!domain) {
      throw new Error('Freshservice domain is required');
    }
    if (!apiKey) {
      throw new Error('Freshservice API key is required');
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.baseUrl = `https://${cleanDomain}`;
    this.authHeader = `Basic ${Buffer.from(`${apiKey}:X`).toString('base64')}`;
    this.timeoutMs = timeoutMs;
    this.fetchFn = fetchFn;
  }

  /**
   * Executes an authenticated HTTP request to the Freshservice API with retry for rate limits.
   *
   * @private
   * @param {string} endpoint - API path (e.g. /api/v2/tickets/123)
   * @param {RequestInit} [options={}]
   * @param {number} [attempt=1]
   * @returns {Promise<any>} Parsed JSON response
   */
  async _request(endpoint, options = {}, attempt = 1) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers = {
      Authorization: this.authHeader,
      Accept: 'application/json',
      ...options.headers,
    };

    try {
      const response = await this.fetchFn(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      // Handle 429 Rate Limiting with Retry-After
      if (response.status === 429 && attempt <= 2) {
        const retryHeader = response.headers.get('retry-after');
        const waitSec = retryHeader ? parseInt(retryHeader, 10) : 2;
        const waitMs = (Number.isNaN(waitSec) ? 2 : waitSec) * 1000;

        logger.warn(
          { endpoint, attempt, waitMs },
          'Freshservice rate limit hit (HTTP 429); backing off',
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return this._request(endpoint, options, attempt + 1);
      }

      const responseText = await response.text();
      let responseBody = null;
      if (responseText) {
        try {
          responseBody = JSON.parse(responseText);
        } catch {
          responseBody = responseText;
        }
      }

      if (!response.ok) {
        throw new FreshserviceError(
          `Freshservice API error: HTTP ${response.status} on ${endpoint}`,
          response.status,
          endpoint,
          responseBody,
        );
      }

      return responseBody;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new FreshserviceError(
          `Freshservice request timed out after ${this.timeoutMs}ms on ${endpoint}`,
          504,
          endpoint,
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Retrieves ticket details by ID.
   *
   * @param {number | string} ticketId
   * @returns {Promise<object>} Ticket object containing id, status, tags, etc.
   */
  async getTicket(ticketId) {
    if (!ticketId) {
      throw new Error('ticketId is required for getTicket');
    }
    const data = await this._request(`/api/v2/tickets/${ticketId}`);
    return data?.ticket || data;
  }

  /**
   * Retrieves requested items for a service catalog ticket.
   *
   * @param {number | string} ticketId
   * @returns {Promise<Array<object>>} List of requested items with custom_fields
   */
  async getRequestedItems(ticketId) {
    if (!ticketId) {
      throw new Error('ticketId is required for getRequestedItems');
    }
    const data = await this._request(`/api/v2/tickets/${ticketId}/requested_items`);
    return data?.requested_items || [];
  }

  /**
   * Posts a conversation note to a ticket.
   * Defaults to public note (private: false) per requirement R-34.
   * If JSON returns 400 invalid_field (reported in some Freshservice versions), falls back to multipart.
   *
   * @param {number | string} ticketId
   * @param {object} params
   * @param {string} params.body - Safe HTML content
   * @param {boolean} [params.isPrivate=false] - Whether note is private to agents
   * @returns {Promise<object>} Created note response
   */
  async addNote(ticketId, { body, isPrivate = false }) {
    if (!ticketId) {
      throw new Error('ticketId is required for addNote');
    }
    if (!body || typeof body !== 'string') {
      throw new Error('body string is required for addNote');
    }

    const payload = {
      body,
      private: Boolean(isPrivate),
    };

    try {
      return await this._request(`/api/v2/tickets/${ticketId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Community fallback check for multipart if JSON rejected with 400 invalid_field
      if (err instanceof FreshserviceError && err.statusCode === 400) {
        logger.warn(
          { ticketId, err: err.message },
          'JSON note posting rejected with 400; attempting FormData fallback',
        );

        const formData = new FormData();
        formData.append('body', body);
        formData.append('private', String(Boolean(isPrivate)));

        return this._request(`/api/v2/tickets/${ticketId}/notes`, {
          method: 'POST',
          body: formData,
        });
      }
      throw err;
    }
  }

  /**
   * Updates ticket tags using a read-merge-write sequence to prevent tag clobbering.
   *
   * @param {number | string} ticketId
   * @param {string[]} newTags - Tags to add to the ticket
   * @returns {Promise<string[]>} Resulting merged tag list
   */
  async updateTicketTags(ticketId, newTags) {
    if (!ticketId) {
      throw new Error('ticketId is required for updateTicketTags');
    }
    if (!Array.isArray(newTags) || newTags.length === 0) {
      return [];
    }

    const ticket = await this.getTicket(ticketId);
    const existingTags = Array.isArray(ticket?.tags) ? ticket.tags : [];

    const mergedSet = new Set([...existingTags, ...newTags]);
    const mergedTags = [...mergedSet];

    // If no new tags were actually introduced, skip network write
    if (mergedTags.length === existingTags.length) {
      return existingTags;
    }

    await this._request(`/api/v2/tickets/${ticketId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tags: mergedTags,
      }),
    });

    return mergedTags;
  }

  /**
   * Checks if a ticket has already had a weather brief posted (stateless idempotency check).
   *
   * @param {object | string[]} ticketOrTags
   * @returns {boolean} True if weather brief tag is present
   */
  static hasWeatherBriefPosted(ticketOrTags) {
    const tags = Array.isArray(ticketOrTags)
      ? ticketOrTags
      : Array.isArray(ticketOrTags?.tags)
        ? ticketOrTags.tags
        : [];

    return tags.includes(TAG_WEATHER_BRIEF_POSTED);
  }
}
