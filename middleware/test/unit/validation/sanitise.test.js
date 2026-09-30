import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml } from "../../../src/validation/sanitise.js";

describe("sanitise module", () => {
  it("escapes all HTML special characters", () => {
    const raw = `<script>alert("XSS" & 'attack');</script>`;
    const safe = escapeHtml(raw);
    assert.equal(
      safe,
      "&lt;script&gt;alert(&quot;XSS&quot; &amp; &#39;attack&#39;);&lt;/script&gt;"
    );
  });

  it("handles empty and null/undefined values safely", () => {
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
    assert.equal(escapeHtml(""), "");
  });

  it("leaves safe ASCII text unmodified", () => {
    assert.equal(escapeHtml("London, England, United Kingdom"), "London, England, United Kingdom");
    assert.equal(escapeHtml("Business trip with wheelchair access"), "Business trip with wheelchair access");
  });
});
