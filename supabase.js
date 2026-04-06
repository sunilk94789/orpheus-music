// ─────────────────────────────────────────────
//  ORPHEUS — Supabase Client
//  Uses the UMD build already in node_modules
// ─────────────────────────────────────────────

const SUPABASE_URL = 'https://zsnefaffxvktxbibmqaf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbmVmYWZmeHZrdHhiaWJtcWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNzA1ODgsImV4cCI6MjA4OTY0NjU4OH0.fLv00xEphMoLo1Uxdtof-u7xZn6_4LBh222yKb2eKIc';

// supabase global is loaded from the CDN <script> tag in each HTML page
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabaseClient = supabaseClient;  // ensure global access across all script blocks
window.SUPABASE_URL = SUPABASE_URL;      // expose for scripts that need the URL (e.g. REST API calls)
window.SUPABASE_KEY = SUPABASE_KEY;      // expose for scripts that need the key