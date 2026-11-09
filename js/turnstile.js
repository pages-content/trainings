/**
 * Cloudflare Turnstile plumbing — anti-bot gate for the contact form.
 *
 * `contact.js` refuses to submit while its `turnstileToken` is empty, but until
 * now nothing rendered the widget nor fed that token: the form was dead on every
 * page that mounted it. This module closes the loop, mirroring the hardened
 * contact form of the reference site (`cheroliv.com`, EPIC BKY-CONTACT-SEC).
 *
 * Two invariants keep Cercle 1 hermetic (same shape as `phone-input.js` /
 * `firebase-app.js`):
 *   - the widget is **injected** (`{ render, getResponse }`): the browser passes
 *     the global `turnstile` installed by the CDN script, tests pass a fake;
 *   - an absent config or a failing widget degrades **silently** to `null` / `''`
 *     instead of surfacing an error — the form falls back to its email channel.
 *
 * The site key is public by design (it ends up in the page), still the project
 * never commits it: the deployment injects `window.__TURNSTILE_CONFIG__` at
 * publish time, exactly like the Firebase web config (EPIC T-PAYMENT, D4).
 */

var API_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
var THEME = 'light';

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === '';
}

/**
 * Returns a trimmed `{ siteKey }` when the config carries one, or `null` when it
 * is absent/incomplete. Unknown keys are never propagated.
 */
function resolve(config) {
    if (!isObject(config) || isBlank(config.siteKey)) {
        return null;
    }
    return { siteKey: String(config.siteKey).trim() };
}

/** Resolves the config injected by the deployment, if any. */
function resolveGlobal() {
    if (typeof globalThis === 'undefined') {
        return null;
    }
    return resolve(globalThis.__TURNSTILE_CONFIG__);
}

/**
 * Tells whether Turnstile is armed for this page. Accepts an explicit
 * `{ config }` override (tests) and falls back to the injected global.
 */
function isEnabled(options) {
    var opts = options || {};
    var config = Object.prototype.hasOwnProperty.call(opts, 'config')
        ? opts.config
        : resolveGlobal();
    return resolve(config) !== null;
}

/**
 * Tells whether the contact form must wait for a token before submitting.
 * It mirrors [isEnabled] by design: the gate only closes when Turnstile is armed,
 * so a site without a site key keeps its form usable (graceful degradation).
 */
function isRequired(options) {
    return isEnabled(options);
}

/** Resolves the global `turnstile` implementation, or null when not loaded. */
function resolveGlobalWidget() {
    if (typeof window !== 'undefined' && isObject(window.turnstile)) {
        return window.turnstile;
    }
    return null;
}

/** Accepts an explicit `{ widget }` override, else the global CDN widget. */
function resolveWidget(options) {
    var opts = options || {};
    var widget = Object.prototype.hasOwnProperty.call(opts, 'widget')
        ? opts.widget
        : resolveGlobalWidget();
    if (!isObject(widget) || typeof widget.render !== 'function') {
        return null;
    }
    return widget;
}

/**
 * Renders the Turnstile widget into `container` with the injected site key.
 * Returns the widget id, or `null` when unconfigured / without a widget / on
 * failure — never throws.
 */
function renderWidget(container, options) {
    var opts = options || {};
    if (!container || typeof container !== 'object') {
        return null;
    }
    if (!isEnabled(opts)) {
        return null;
    }
    var widget = resolveWidget(opts);
    if (widget === null) {
        return null;
    }
    try {
        return widget.render(container, {
            sitekey: resolve(opts.config || resolveGlobal()).siteKey,
            theme: opts.theme || THEME,
            callback: opts.onToken,
            'error-callback': opts.onError,
            'expired-callback': opts.onToken
        });
    } catch (error) {
        if (typeof console !== 'undefined') {
            console.error('Turnstile widget could not be rendered:', error);
        }
        return null;
    }
}

/**
 * Reads the current token from the widget. Returns `''` when Turnstile is not
 * armed, when the widget is unreachable, or when it throws — the caller then
 * simply does not send a token.
 */
function readToken(options) {
    var opts = options || {};
    if (!isEnabled(opts)) {
        return '';
    }
    var widget = resolveWidget(opts);
    if (widget === null || typeof widget.getResponse !== 'function') {
        return '';
    }
    try {
        return widget.getResponse() || '';
    } catch (error) {
        return '';
    }
}

/**
 * Injects the Cloudflare API script (`?render=explicit`) and resolves once the
 * global `turnstile` is available. Injectable (`{ loadScript }`) so Cercle 1
 * never touches the network. Never rejects — an unreachable CDN resolves `false`
 * (graceful degradation).
 */
function loadApiScript(options) {
    var opts = options || {};
    if (resolveWidget(opts) !== null) {
        return Promise.resolve(true);
    }
    if (typeof document === 'undefined') {
        return Promise.resolve(false);
    }
    var load = opts.loadScript || function (url) {
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    return Promise.resolve(load(opts.apiUrl || API_URL))
        .then(function () {
            return resolveWidget(opts) !== null;
        })
        .catch(function (error) {
            if (typeof console !== 'undefined') {
                console.error('Turnstile API could not be loaded:', error);
            }
            return false;
        });
}

/**
 * Browser bootstrap: loads the API, renders the widget mounted by the page
 * (`#cf-turnstile-mount`) and forwards the token to the hidden form input and to
 * `window.onTurnstileToken` (the contract `contact.js` already consumes).
 * Guarded by a DOM check, never throws when the CDN is unreachable.
 */
function bootstrapTurnstile() {
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') {
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {
        'use strict';

        if (!isEnabled()) {
            return;
        }

        var container = document.getElementById('cf-turnstile-mount');
        if (!container) {
            return;
        }

        var hidden = document.querySelector('input[name="cf_turnstile_token"]');
        var receive = function (token) {
            var value = token || '';
            if (hidden) hidden.value = value;
            if (typeof window !== 'undefined' && typeof window.onTurnstileToken === 'function') {
                window.onTurnstileToken(value);
            }
        };

        loadApiScript({}).then(function (ready) {
            if (!ready) {
                return;
            }
            renderWidget(container, {
                onToken: receive,
                onError: function () {
                    receive('');
                }
            });
        });
    });
}

bootstrapTurnstile();

// Export for Node.js testing and browser consumers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_URL: API_URL,
        THEME: THEME,
        resolve: resolve,
        resolveGlobal: resolveGlobal,
        isEnabled: isEnabled,
        isRequired: isRequired,
        resolveWidget: resolveWidget,
        renderWidget: renderWidget,
        loadApiScript: loadApiScript,
        readToken: readToken
    };
}
if (typeof window !== 'undefined') {
    window.TALARIA_TURNSTILE = {
        resolve: resolve,
        resolveGlobal: resolveGlobal,
        isEnabled: isEnabled,
        isRequired: isRequired,
        renderWidget: renderWidget,
        loadApiScript: loadApiScript,
        readToken: readToken
    };
}
