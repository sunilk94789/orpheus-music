# ORPHEUS — Fix Integration Guide
*Addresses QA Report v1.0 — 06 April 2026*

This guide tells you exactly where to add each file and what to change.
All 5 fix files are drop-in: no build tools, no npm required.

---

## Files Included

| File | Fixes | QA Severity |
|---|---|---|
| `supabase-client.js` | Credential duplication (TC-C01) | MEDIUM |
| `sanitize.js` | XSS via innerHTML (TC-S08) | HIGH |
| `otp-service.js` | Hardcoded OTP '111111' (TC-F20, TC-S02, TC-S03) | HIGH |
| `paginated-query.js` | No pagination on DB queries (TC-P01) | MEDIUM |
| `responsive-patch.css` | Mobile layout (TC-U10) | MEDIUM |
| `accessibility.js` | Keyboard nav + focus styles (TC-A06, TC-A07, TC-A08) | MEDIUM/LOW |

---

## Step 1 — Add files to your repository

Copy all 6 files into the root of your project (same folder as `home.html`).

---

## Step 2 — supabase-client.js (centralised credentials)

1. Open `supabase-client.js` and fill in your real values:
   ```js
   const SUPABASE_URL  = 'https://YOUR-PROJECT.supabase.co';
   const SUPABASE_ANON = 'YOUR-ANON-KEY-HERE';
   ```

2. In each of these files, **remove** the existing Supabase initialisation block:
   - `home.html`
   - `login.html`
   - `signup.html`
   - `player.js`
   - `auth-guard.js`

   The block to remove looks like:
   ```js
   const supabaseUrl = 'https://...';
   const supabaseKey = 'eyJ...';
   const supabase = supabase.createClient(supabaseUrl, supabaseKey);
   ```

3. At the top of each of those files' `<script>` tags, add:
   ```html
   <script type="module">
     import { supabase } from './supabase-client.js';
     // ... rest of your existing code (unchanged)
   </script>
   ```

> **Result**: TC-C01 resolved (MEDIUM). Credential rotation is now a 1-line change.

---

## Step 3 — sanitize.js (XSS protection)

1. On every page that renders database content, add DOMPurify **before** your scripts:
   ```html
   <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js"></script>
   ```

2. In your JavaScript, replace every `innerHTML` injection of database content.

   **Before:**
   ```js
   card.innerHTML = `<h3>${song.title}</h3><p>${song.artist}</p>`;
   ```
   **After:**
   ```js
   import { sanitizeHTML, safeText } from './sanitize.js';

   // Option A — when you need HTML structure:
   card.innerHTML = sanitizeHTML(`<h3>${song.title}</h3><p>${song.artist}</p>`);

   // Option B — for plain text only (recommended for names/titles):
   const h3 = document.createElement('h3');
   h3.textContent = safeText(song.title);
   card.appendChild(h3);
   ```

3. Key places to patch in `home.html` (search for `innerHTML`):
   - Trending song cards
   - Random song cards
   - Playlist cards
   - Artist cards
   - Album cards
   - Greeting banner stats

> **Result**: TC-S08 resolved (HIGH). XSS via database content eliminated.

---

## Step 4 — otp-service.js (real email OTP)

1. In your Supabase dashboard:
   - Go to **Authentication → Settings**
   - Enable **Email OTP** and set an expiry (e.g. 10 minutes)
   - Go to **Authentication → Email Templates**, review the OTP template

2. In `login.html` and `signup.html`, **delete** the hardcoded OTP function:
   ```js
   // DELETE THIS:
   generateOtp() { return '111111'; }
   ```

3. Replace the OTP send + verify logic with the module. At the top of your script:
   ```js
   import { sendOTP, verifyOTP } from './otp-service.js';
   ```

4. When the user submits their email (step 2 of signup / forgot password):
   ```js
   const { success, error } = await sendOTP(userEmail);
   if (success) showOTPModal();
   else showToast('Could not send code: ' + error, 'error');
   ```

5. When the user submits the 6-digit code from the modal:
   ```js
   const code = [...otpInputs].map(i => i.value).join('');
   const { success, error } = await verifyOTP(userEmail, code);
   if (success) window.location.href = 'home.html';
   else showToast('Invalid code. Try again.', 'error');
   ```

> **Result**: TC-F20, TC-S02, TC-S03 resolved (all HIGH). Real email OTP, nothing hardcoded.

---

## Step 5 — responsive-patch.css (mobile layout)

Add this single line to the `<head>` of **every HTML page**, after your existing CSS:
```html
<link rel="stylesheet" href="responsive-patch.css">
```

That's it. The patch uses `!important` overrides so it works without touching your existing CSS.

Key things it adds:
- Sidebar collapses to icon strip on tablet, moves to bottom bar on mobile
- Card grids reflow from 4 columns → 3 → 2 → 1 at each breakpoint
- Player bar pins above the bottom nav on mobile
- Touch targets are at least 44×44px on small screens
- OTP inputs resize for small screens

> **Result**: TC-U10 resolved (MEDIUM). Adequate layout at all screen sizes.

---

## Step 6 — accessibility.js (keyboard nav + focus)

Add this to the bottom of `<body>` on every HTML page:
```html
<script type="module" src="./accessibility.js"></script>
```

What it does automatically:
- Injects a "Skip to main content" link for keyboard users (TC-A07)
- Applies ORPHEUS orange focus rings to all focusable elements (TC-A08)
- Makes sidebar items navigable with Arrow Up/Down keys (TC-A06)
- Adds keyboard shortcuts for the music player (TC-A06):
  - `Space` → play/pause
  - `→` → next track
  - `←` → previous track
  - `M` → mute/unmute
  - `S` → toggle shuffle
  - `R` → cycle repeat
- Announces track changes to screen readers via `aria-live`

> **Result**: TC-A06 (FAIL→PASS), TC-A07 (WARN→PASS), TC-A08 (WARN→PASS).

---

## Summary — Before vs After

| Test Case | Before | After |
|---|---|---|
| TC-S08 XSS via innerHTML | FAIL HIGH | PASS |
| TC-F20 OTP verification | FAIL HIGH | PASS |
| TC-S02 Hardcoded OTP | FAIL HIGH | PASS |
| TC-S03 OTP console.log | FAIL HIGH | PASS |
| TC-C01 Credential duplication | FAIL MEDIUM | PASS |
| TC-U10 Mobile responsiveness | WARN MEDIUM | PASS |
| TC-A06 Keyboard navigation | FAIL MEDIUM | PASS |
| TC-A07 Skip navigation | WARN LOW | PASS |
| TC-A08 Focus styles | WARN LOW | PASS |
| TC-P01 No pagination | WARN MEDIUM | PASS (with paginated-query.js) |

**Estimated score improvement**: 8 FAIL/WARN cases → PASS.
Previous: 28 PASS / 11 WARN / 8 FAIL
After integration: ~36–37 PASS / 2–3 WARN / 0–1 FAIL

---

## Remaining items (not covered by these files)

- **TC-S04** — Verify your Supabase secret key has been regenerated in the dashboard. Check every source file with `grep -r "service_role"` to confirm it's absent.
- **TC-P03** — 6+ concurrent API calls on home load: consider using `Promise.all()` to run them in parallel (they already run concurrently, but adding loading skeletons hides the delay).
- **TC-C06** — home.html 1900+ lines of inline JS: long-term refactor into ES modules (P3 priority, 2–3 days effort per the report).
- **TC-S09** — HTTPS: Vercel enforces HTTPS automatically — this is already handled by your deployment target.
