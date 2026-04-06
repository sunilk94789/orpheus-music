/**
 * accessibility.js
 * ─────────────────────────────────────────────────────────────
 * Drop-in keyboard navigation and WCAG 2.1 Level A fixes for
 * the player controls, sidebar, and global focus styles.
 *
 * HOW TO ADD
 * ----------
 * Add this ONE line at the bottom of <body> on every HTML page:
 *   <script type="module" src="./accessibility.js"></script>
 *
 * It runs once on DOMContentLoaded and is safe on all pages.
 *
 * WHY THIS MATTERS (QA report)
 *   TC-A06 — FAIL   MEDIUM  — no keyboard nav for sidebar/player
 *   TC-A07 — WARN   LOW     — no skip navigation link
 *   TC-A08 — WARN   LOW     — focus styles are browser-default only
 * ─────────────────────────────────────────────────────────────
 */

document.addEventListener('DOMContentLoaded', () => {
  injectSkipLink();
  injectFocusStyles();
  patchSidebar();
  patchPlayerControls();
  patchDropdowns();
});

/* ── 1. Skip navigation link (TC-A07) ──────────────────────── */
function injectSkipLink() {
  if (document.getElementById('skip-to-main')) return;

  const skip = document.createElement('a');
  skip.id        = 'skip-to-main';
  skip.href      = '#main-content';
  skip.textContent = 'Skip to main content';
  skip.setAttribute('tabindex', '0');

  // Visible only on focus (keyboard users)
  Object.assign(skip.style, {
    position:   'fixed',
    top:        '-9999px',
    left:       '16px',
    zIndex:     '9999',
    padding:    '8px 16px',
    background: '#FF9B51',
    color:      '#000',
    fontWeight: '500',
    borderRadius: '0 0 8px 8px',
    textDecoration: 'none',
    transition: 'top 0.1s',
  });

  skip.addEventListener('focus', () => { skip.style.top = '0'; });
  skip.addEventListener('blur',  () => { skip.style.top = '-9999px'; });

  document.body.prepend(skip);

  // Ensure the main content area has the matching id
  const main = document.querySelector(
    'main, .main-content, .content-area, #main-content'
  );
  if (main && !main.id) main.id = 'main-content';
}

/* ── 2. Custom focus ring styles (TC-A08) ───────────────────── */
function injectFocusStyles() {
  if (document.getElementById('orpheus-focus-styles')) return;

  const style = document.createElement('style');
  style.id = 'orpheus-focus-styles';
  style.textContent = `
    :focus-visible {
      outline: 2px solid #FF9B51 !important;
      outline-offset: 2px !important;
      border-radius: 4px !important;
    }
    :focus:not(:focus-visible) {
      outline: none !important;
    }
  `;
  document.head.appendChild(style);
}

/* ── 3. Sidebar keyboard navigation (TC-A06) ────────────────── */
function patchSidebar() {
  const sidebar = document.querySelector(
    '.sidebar, #sidebar, nav[aria-label], aside'
  );
  if (!sidebar) return;

  const items = sidebar.querySelectorAll('a, button, [data-href]');
  items.forEach((item, index) => {
    // Make non-interactive elements focusable
    if (!item.hasAttribute('tabindex') && item.tagName !== 'A' && item.tagName !== 'BUTTON') {
      item.setAttribute('tabindex', '0');
    }

    // Add role if missing
    if (item.tagName !== 'A' && item.tagName !== 'BUTTON' && !item.getAttribute('role')) {
      item.setAttribute('role', 'menuitem');
    }

    // Keyboard activation for non-button/link items
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }

      // Arrow key navigation within sidebar
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = items[index + 1];
        if (next) next.focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = items[index - 1];
        if (prev) prev.focus();
      }
    });
  });

  // Add ARIA landmark if missing
  if (!sidebar.getAttribute('aria-label') && !sidebar.getAttribute('role')) {
    sidebar.setAttribute('aria-label', 'Main navigation');
    sidebar.setAttribute('role', 'navigation');
  }
}

/* ── 4. Music player keyboard navigation (TC-A06) ───────────── */
function patchPlayerControls() {
  const playerSelectors = [
    '#player-panel',
    '.player-panel',
    '.now-playing-bar',
    '#now-playing',
  ];

  const player = document.querySelector(playerSelectors.join(', '));
  if (!player) return;

  // Map of key → button aria-label / data attribute to click
  const keyMap = {
    ' ':          '[aria-label*="play"], [aria-label*="pause"], .play-btn, #play-btn',
    'ArrowRight': '[aria-label*="next"], .next-btn, #next-btn',
    'ArrowLeft':  '[aria-label*="prev"], .prev-btn, #prev-btn',
    'm':          '[aria-label*="mute"], .mute-btn, #mute-btn',
    's':          '[aria-label*="shuffle"], .shuffle-btn, #shuffle-btn',
    'r':          '[aria-label*="repeat"], .repeat-btn, #repeat-btn',
  };

  document.addEventListener('keydown', (e) => {
    // Don't intercept when user is typing in an input
    const tag = document.activeElement?.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

    const selector = keyMap[e.key];
    if (!selector) return;

    const btn = document.querySelector(selector);
    if (btn) {
      e.preventDefault();
      btn.click();
    }
  });

  // Ensure all player control buttons are keyboard-accessible
  const controls = player.querySelectorAll('button, [onclick], .btn, .control');
  controls.forEach(ctrl => {
    if (!ctrl.hasAttribute('tabindex') && ctrl.tagName !== 'BUTTON') {
      ctrl.setAttribute('tabindex', '0');
    }
    if (!ctrl.getAttribute('aria-label') && !ctrl.textContent.trim()) {
      // Attempt to infer label from class name
      const cls = ctrl.className || '';
      const inferred = cls.match(/(play|pause|next|prev|mute|shuffle|repeat|like)/i);
      if (inferred) ctrl.setAttribute('aria-label', inferred[1]);
    }
    ctrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        ctrl.click();
      }
    });
  });

  // Announce track changes to screen readers via live region
  if (!document.getElementById('orpheus-sr-announce')) {
    const live = document.createElement('div');
    live.id = 'orpheus-sr-announce';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    Object.assign(live.style, { position: 'absolute', left: '-9999px', width: '1px', height: '1px' });
    document.body.appendChild(live);

    // Observe track title changes and announce them
    const titleEl = document.querySelector(
      '.track-title, .song-title, #current-song-title, .now-playing-title'
    );
    if (titleEl) {
      new MutationObserver(() => {
        live.textContent = 'Now playing: ' + titleEl.textContent;
      }).observe(titleEl, { childList: true, characterData: true, subtree: true });
    }
  }
}

/* ── 5. Dropdown keyboard navigation ────────────────────────── */
function patchDropdowns() {
  document.querySelectorAll('select, .custom-select, .dropdown').forEach(dropdown => {
    if (dropdown.tagName === 'SELECT') return; // native already handles it

    const options = dropdown.querySelectorAll('[role="option"], li, .dropdown-item');
    options.forEach((opt, index) => {
      if (!opt.getAttribute('tabindex')) opt.setAttribute('tabindex', '-1');
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); options[index + 1]?.focus(); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); options[index - 1]?.focus(); }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.click(); }
        if (e.key === 'Escape')    { dropdown.querySelector('[aria-haspopup]')?.focus(); }
      });
    });
  });
}
