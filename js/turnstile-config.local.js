/* ------------------------------------------------------------------ *
 * talaria.school — Turnstile config injection surface
 *
 * COMMITTED PLACEHOLDER — carries NO site key.
 *
 * The Cloudflare Turnstile site key is public by design (it ends up in the
 * page), but the project never commits it. The deployment overwrites this file
 * with the real value from the `turnstile:` section of `site.yml` (gitignored)
 * before the bake — exactly like the Firebase web config.
 *
 * While this file is null, `turnstile.js` resolves no config and the contact
 * form keeps its email channel (graceful degradation).
 * ------------------------------------------------------------------ */
window.__TURNSTILE_CONFIG__ = null;
