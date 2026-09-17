/**
 * Firebase bootstrap — installs the `window.__FIREBASE__` contract.
 *
 * `contact.js` already consumes a dormant Firestore branch (`waitForFirebase()`
 * polls `window.__FIREBASE__`), and the checkout/suivi adapters will consume the
 * same shape. This module is what installs that global — until now nothing did,
 * so the Firestore channel degraded on every submit.
 *
 * Two invariants keep Cercle 1 hermetic:
 *   - the SDK is **injected** (`{ initializeApp, getFirestore, collection, addDoc,
 *     serverTimestamp }`), mirroring the `phone-input.js` `lib` injection pattern —
 *     tests pass an in-memory fake, the browser passes the gstatic modules;
 *   - a missing config or a throwing SDK degrades **silently** to `null` instead of
 *     surfacing an error: the email channel keeps carrying the message.
 *
 * No project identity is committed here: the config comes from
 * `firebase-config.js` (which reads the deployment-injected global).
 */

var CONFIG_FIELDS = ['apiKey', 'authDomain', 'projectId', 'appId'];

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isResolvableConfig(config) {
    if (!isObject(config)) {
        return false;
    }
    return CONFIG_FIELDS.every(function (field) {
        return config[field] !== undefined && config[field] !== null && String(config[field]).trim() !== '';
    });
}

function isUsableSdk(sdk) {
    return isObject(sdk)
        && typeof sdk.initializeApp === 'function'
        && typeof sdk.getFirestore === 'function'
        && typeof sdk.collection === 'function'
        && typeof sdk.addDoc === 'function'
        && typeof sdk.serverTimestamp === 'function';
}

/**
 * Maps the SDK entry points to the exact `window.__FIREBASE__` contract that
 * `contact.js` expects (`{ db, collection, addDoc, serverTimestamp }`).
 */
function toFirebaseGlobals(sdk, db) {
    return {
        db: db,
        collection: sdk.collection,
        addDoc: sdk.addDoc,
        serverTimestamp: sdk.serverTimestamp
    };
}

/**
 * Initialises the Firebase app + Firestore from an injected SDK and resolved
 * config. Returns the installed contract, or `null` when Firebase is not
 * configured / the SDK is unusable / initialisation throws.
 */
function initFirebaseApp(options) {
    var opts = options || {};
    if (!isResolvableConfig(opts.config) || !isUsableSdk(opts.sdk)) {
        return null;
    }
    try {
        var app = opts.sdk.initializeApp(opts.config);
        var db = opts.sdk.getFirestore(app);
        return toFirebaseGlobals(opts.sdk, db);
    } catch (error) {
        if (typeof console !== 'undefined') {
            console.error('Firebase initialisation failed:', error);
        }
        return null;
    }
}

/**
 * Initialises Firebase and installs `target.__FIREBASE__`. No-op (returns `null`)
 * when unconfigured — the site then behaves exactly as before Firebase existed.
 */
function installFirebase(options) {
    var opts = options || {};
    var globals = initFirebaseApp(opts);
    if (globals === null) {
        return null;
    }
    var target = opts.target || (typeof globalThis !== 'undefined' ? globalThis : null);
    if (target) {
        target.__FIREBASE__ = globals;
    }
    return globals;
}

/**
 * Browser bootstrap: loads the gstatic SDK modules dynamically and installs the
 * contract. Guarded by a DOM check and wrapped in a catch — the CDN being
 * unreachable never breaks the page (graceful degradation, economy of ink).
 */
function bootstrapFirebase() {
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') {
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {
        'use strict';

        var configModule = (typeof window !== 'undefined') ? window.TALARIA_FIREBASE_CONFIG : null;
        var config = configModule ? configModule.resolveGlobal() : null;
        if (!config) {
            return;
        }

        Promise.all([
            import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js')
        ]).then(function (modules) {
            var app = modules[0];
            var firestore = modules[1];
            installFirebase({
                config: config,
                sdk: {
                    initializeApp: app.initializeApp,
                    getFirestore: firestore.getFirestore,
                    collection: firestore.collection,
                    addDoc: firestore.addDoc,
                    serverTimestamp: firestore.serverTimestamp
                }
            });
        }).catch(function (error) {
            console.error('Firebase SDK could not be loaded:', error);
        });
    });
}

bootstrapFirebase();

// Export for Node.js testing and browser consumers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG_FIELDS: CONFIG_FIELDS,
        toFirebaseGlobals: toFirebaseGlobals,
        initFirebaseApp: initFirebaseApp,
        installFirebase: installFirebase
    };
}
if (typeof window !== 'undefined') {
    window.TALARIA_FIREBASE_APP = {
        toFirebaseGlobals: toFirebaseGlobals,
        initFirebaseApp: initFirebaseApp,
        installFirebase: installFirebase
    };
}
