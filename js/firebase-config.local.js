/* ------------------------------------------------------------------ *
 * talaria.school — Firebase config injection surface (EPIC T-PAYMENT)
 *
 * COMMITTED PLACEHOLDER — carries NO project identity.
 *
 * The real Firebase *web* config (apiKey/authDomain/projectId/appId/…) is
 * public by design (it ends up in the browser), but the project never commits
 * it. The deployment overwrites this file with the real values from the
 * `firebase:` section of `site.yml` (gitignored) before the bake.
 *
 * While this file is the null placeholder, `firebase-config.js` resolves no
 * config and the whole Firebase plumbing degrades silently: the email channel
 * keeps working exactly as before, `db.js` stays on localStorage.
 * See `.agents/CADRAGE_EPIC_T_PAYMENT.adoc` (D4).
 * ------------------------------------------------------------------ */
window.__FIREBASE_CONFIG__ = null;
