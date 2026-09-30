/**
 * sanitise.js
 *
 * HTML-escaping utility for user-provided text inputs.
 * Prevents HTML injection when user text (destination city, notes) is embedded
 * into Freshservice HTML ticket notes.
 *
 * Strictly plain ASCII - no emojis.
 */

/**
 * Escapes characters with special meaning in HTML.
 *
 * @param {string | null | undefined} input
 * @returns {string} Escaped string safe for HTML interpolation
 */
export function escapeHtml(input) {
  if (input === null || input === undefined) {
    return "";
  }
  const str = String(input);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default { escapeHtml };
