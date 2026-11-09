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
 * Maps the SDK entry points to the `window.__FIREBASE__` contract.
 *
 * `contact.js` consumes `{ db, collection, addDoc, serverTimestamp }`; the
 * order store (`db.js` → `firebase-order-store.js`) consumes the read API
 * (`firestore.{collection,doc,getDoc,query,where,getDocs,setDoc}`) — exposed
 * additively so neither channel is broken.
 */
function toFirebaseGlobals(sdk, db, app) {
    return {
        db: db,
        collection: sdk.collection,
        addDoc: sdk.addDoc,
        serverTimestamp: sdk.serverTimestamp,
        firestore: {
            collection: sdk.collection,
            doc: sdk.doc,
            setDoc: sdk.setDoc,
            getDoc: sdk.getDoc,
            query: sdk.query,
            where: sdk.where,
            getDocs: sdk.getDocs
        },
        callable: toCallableFactory(bindFunctions(sdk.functions, app))
    };
}

/**
 * Builds the `checkout`/`suivi` callable factory over a Functions client whose
 * `httpsCallable(name)` is already bound to the app instance. Returns `null`
 * when the Functions client is unavailable — the caller then keeps the local
 * checkout.
 */
function toCallableFactory(functionsClient) {
    if (!isObject(functionsClient) || typeof functionsClient.httpsCallable !== 'function') {
        return null;
    }
    return function (name) {
        const callable = functionsClient.httpsCallable(name);
        return function (payload) {
            return callable(payload);
        };
    };
}

/**
 * Binds the modular Functions API to an app instance: the callable adapter only
 * ever needs `httpsCallable(name)`. Accepts either the Functions *module*
 * (`getFunctions` + `httpsCallable(instance, name)`) or a pre-bound client.
 */
function bindFunctions(functionsModule, app) {
    if (!isObject(functionsModule)) {
        return null;
    }
    if (typeof functionsModule.getFunctions === 'function') {
        const instance = functionsModule.getFunctions(app);
        return {
            httpsCallable: function (name) {
                return functionsModule.httpsCallable(instance, name);
            }
        };
    }
    if (typeof functionsModule.httpsCallable === 'function') {
        return {
            httpsCallable: function (name) {
                return functionsModule.httpsCallable(app, name);
            }
        };
    }
    return null;
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
        var app = opts.app || opts.sdk.initializeApp(opts.config);
        var db = opts.sdk.getFirestore(app);
        return toFirebaseGlobals(opts.sdk, db, app);
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
            import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'),
            import('https://www.gstatic.com/firebasejs/11.6.0/firebase-functions.js')
        ]).then(function (modules) {
            var app = modules[0];
            var firestore = modules[1];
            var functions = modules[2];
            var appInstance = app.initializeApp(config);
            installFirebase({
                config: config,
                app: appInstance,
                sdk: {
                    initializeApp: app.initializeApp,
                    getFirestore: firestore.getFirestore,
                    collection: firestore.collection,
                    addDoc: firestore.addDoc,
                    serverTimestamp: firestore.serverTimestamp,
                    doc: firestore.doc,
                    setDoc: firestore.setDoc,
                    getDoc: firestore.getDoc,
                    query: firestore.query,
                    where: firestore.where,
                    getDocs: firestore.getDocs,
                    functions: bindFunctions(functions, appInstance)
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
        toCallableFactory: toCallableFactory,
        bindFunctions: bindFunctions,
        initFirebaseApp: initFirebaseApp,
        installFirebase: installFirebase
    };
}
if (typeof window !== 'undefined') {
    window.TALARIA_FIREBASE_APP = {
        toFirebaseGlobals: toFirebaseGlobals,
        toCallableFactory: toCallableFactory,
        bindFunctions: bindFunctions,
        initFirebaseApp: initFirebaseApp,
        installFirebase: installFirebase
    };
}
