/**
 * otp-service.js
 * ─────────────────────────────────────────────────────────────
 * Replaces the hardcoded OTP '111111' with a real email-based
 * verification flow using Supabase's built-in OTP/magic-link auth.
 *
 * WHY THIS MATTERS (QA report — TC-F20, TC-S02, TC-S03 — severity HIGH)
 * The current code: generateOtp() { return '111111'; }
 * This means any user who reads the source can bypass email verification.
 * The OTP is also console.log'd in plaintext. This completely defeats
 * the purpose of the verification step.
 *
 * APPROACH
 * --------
 * Supabase Auth natively supports OTP via signInWithOtp().
 * This sends a real 6-digit code to the user's email — no third-party
 * email service account needed, Supabase handles delivery.
 *
 * HOW TO INTEGRATE
 * ----------------
 * 1. In your Supabase dashboard → Authentication → Email Templates,
 *    ensure "Confirm signup" and "Magic Link" templates are enabled.
 * 2. In Authentication → Settings, enable "Email OTP" under "OTP expiry".
 * 3. Replace the OTP-related functions in login.html / signup.html
 *    with the exports below.
 * ─────────────────────────────────────────────────────────────
 */

import { supabase } from './supabase-client.js';

/**
 * Send a real OTP to the user's email address via Supabase Auth.
 * Call this when the user submits their email on the signup/login form.
 *
 * @param {string} email
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function sendOTP(email) {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // set true during signup flow
      },
    });

    if (error) throw error;
    return { success: true, error: null };

  } catch (err) {
    console.error('[OTP] Failed to send OTP:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Verify the OTP code entered by the user.
 * Call this when the user submits the 6-digit code.
 *
 * @param {string} email
 * @param {string} token  — the 6-digit code from the user's inbox
 * @returns {Promise<{success: boolean, session: object|null, error: string|null}>}
 */
export async function verifyOTP(email, token) {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) throw error;
    return { success: true, session: data.session, error: null };

  } catch (err) {
    console.error('[OTP] Verification failed:', err.message);
    return { success: false, session: null, error: err.message };
  }
}

/**
 * EXAMPLE: Drop-in replacement for your existing OTP modal handler.
 *
 * // In login.html / signup.html, replace the OTP modal submit handler:
 *
 * import { sendOTP, verifyOTP } from './otp-service.js';
 *
 * // When showing the modal:
 * const { success, error } = await sendOTP(userEmail);
 * if (!success) showToast('Could not send code: ' + error, 'error');
 * else showToast('Verification code sent to ' + userEmail);
 *
 * // When the user submits their 6-digit code:
 * const enteredCode = otpInputs.map(i => i.value).join('');
 * const { success, session, error } = await verifyOTP(userEmail, enteredCode);
 * if (success) {
 *   // User is authenticated — redirect to home
 *   window.location.href = 'home.html';
 * } else {
 *   showToast('Incorrect code. Please try again.', 'error');
 * }
 */
