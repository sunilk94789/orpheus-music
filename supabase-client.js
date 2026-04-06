/**
 * supabase-client.js
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for the Supabase client instance.
 *
 * HOW TO USE
 * ----------
 * 1. Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY below
 *    with your actual values (anon/public key only — never the secret key).
 * 2. Remove the inline Supabase initialisation blocks from:
 *      home.html, login.html, signup.html, player.js, auth-guard.js
 * 3. In every file that previously initialised its own client, add at the top:
 *      <script type="module">
 *        import { supabase } from './supabase-client.js';
 *        // ... rest of your code
 *      </script>
 *
 * WHY THIS MATTERS (QA report — TC-C01, severity MEDIUM)
 * -------------------------------------------------------
 * Credentials duplicated across 5+ files means one rotation requires
 * editing every file. A single module export makes rotation a one-line change.
 * ─────────────────────────────────────────────────────────────
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://zsnefaffxvktxbibmqaf.supabase.co';   // e.g. https://xxxx.supabase.co
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbmVmYWZmeHZrdHhiaWJtcWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4Mjk0MzksImV4cCI6MjA1OTQwNTQzOX0.78314181628093827215758813163490155121'; // safe to expose — public key

if (SUPABASE_URL === 'https://zsnefaffxvktxbibmqaf.supabase.co') {
  console.warn('[ORPHEUS] supabase-client.js: replace placeholder credentials.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
