// ─────────────────────────────────────────────
//  ORPHEUS — Auth Guard
//  Include this on any page that requires login
//  Usage: <script src="auth-guard.js"></script>
//  (must be after supabase.js)
// ─────────────────────────────────────────────

(async function () {
  const sb = typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    // Not logged in — redirect to login page
    window.location.replace('login.html');
    return;
  }

  // Verify user has a profile in the database
  const { data: profile } = await sb
    .from('profiles')
    .select('username')
    .eq('id', session.user.id)
    .maybeSingle();

  if (!profile) {
    // Session exists but no profile — not a fully registered user
    await sb.auth.signOut();
    window.location.replace('login.html');
    return;
  }

  // Store user info for easy access
  sessionStorage.setItem('orpheus_user', profile.username || session.user.user_metadata?.username || session.user.email);
  sessionStorage.setItem('orpheus_uid', session.user.id);
})();
