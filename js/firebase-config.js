/**
 * Firebase web-app configuration resolution — shared between browser and Node.js.
 *
 * The Firebase *web* config (apiKey/authDomain/projectId/appId/…) is public by
 * design: it ends up in the browser. It is still never committed here — the
 * deployment injects it at publish time as `window.__FIREBASE_CONFIG__`
 * (see `.agents/CADRAGE_EPIC_T_PAYMENT.adoc`, D4). This module only resolves and
 * validates that injected global; it ships **no** project identity of its own.
 *
 * The module is purely functional (no DOM, no network, no SDK) so Cercle 1 tests
 * exercise it directly under `node --test`. When no config is injected the whole
 * Firebase plumbing degrades silently: callers get `null` and the email channel
 * keeps working exactly as before (economy of ink, no user-visible failure).
 */

var REQUIRED_FIELDS = ['apiKey', 'authDomain', 'projectId', 'appId'];
var OPTIONAL_FIELDS = ['storageBucket', 'messagingSenderId', 'measurementId'];

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === '';
}

/** Lists the required fields that are missing or blank in `config`. */
function missingRequiredFields(config) {
    if (!isObject(config)) {
        return REQUIRED_FIELDS.slice();
    }
    return REQUIRED_FIELDS.filter(function (field) {
        return isBlank(config[field]);
    });
}

/** Tells whether `config` carries every required Firebase web field. */
function isConfigured(config) {
    return isObject(config) && missingRequiredFields(config).length === 0;
}

/**
 * Returns a trimmed copy carrying only the known Firebase web fields, or `null`
 * when the config is incomplete/invalid. Unknown keys (a leaked service-account
 * `privateKey`, for instance) are never propagated.
 */
function resolve(config) {
    if (!isConfigured(config)) {
        return null;
    }
    var resolved = {};
    REQUIRED_FIELDS.concat(OPTIONAL_FIELDS).forEach(function (field) {
        if (!isBlank(config[field])) {
            resolved[field] = String(config[field]).trim();
        }
    });
    return resolved;
}

/** Resolves the config injected by the deployment, if any. */
function resolveGlobal() {
    if (typeof globalThis === 'undefined') {
        return null;
    }
    return resolve(globalThis.__FIREBASE_CONFIG__);
}

// Export for Node.js testing and browser consumers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        REQUIRED_FIELDS: REQUIRED_FIELDS,
        OPTIONAL_FIELDS: OPTIONAL_FIELDS,
        missingRequiredFields: missingRequiredFields,
        isConfigured: isConfigured,
        resolve: resolve,
        resolveGlobal: resolveGlobal
    };
}
if (typeof window !== 'undefined') {
    window.TALARIA_FIREBASE_CONFIG = {
        REQUIRED_FIELDS: REQUIRED_FIELDS,
        missingRequiredFields: missingRequiredFields,
        isConfigured: isConfigured,
        resolve: resolve,
        resolveGlobal: resolveGlobal
    };
}
