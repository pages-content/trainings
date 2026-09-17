/**
 * Phone number input — international dial code selector (intl-tel-input).
 *
 * Mirrors the cheroliv.com `PhoneInputManager` behaviour: the phone field gains a
 * country flag + dial-code dropdown. The library itself is a CDN asset loaded by
 * the page (see `header.thyme`/`footer.thyme`); this module only wires it.
 *
 * Shared between the browser and Node.js: the browser bootstrap is guarded by a
 * DOM check and the library is injectable, so Cercle 1 tests never touch the
 * network (the page load is faked by an in-memory stub).
 */

var INTL_TEL_INPUT_VERSION = '25.10.1';
var INTL_TEL_INPUT_UTILS =
    'https://cdn.jsdelivr.net/npm/intl-tel-input@' + INTL_TEL_INPUT_VERSION + '/build/js/utils.js';

var DEFAULT_INITIAL_COUNTRY = 'fr';

/**
 * Tells whether an intl-tel-input implementation is available.
 * Accepts an explicit `{ lib }` override (tests) and falls back to the global
 * `intlTelInput` installed by the CDN script (browser).
 */
function isPhoneInputSupported(options) {
    var opts = options || {};
    var lib = Object.prototype.hasOwnProperty.call(opts, 'lib') ? opts.lib : resolveLib();
    return typeof lib === 'function';
}

function resolveLib() {
    if (typeof window !== 'undefined' && typeof window.intlTelInput === 'function') {
        return window.intlTelInput;
    }
    return null;
}

/**
 * Initialises the dial-code selector on a phone input element.
 *
 * Returns the library instance, or `null` when the library is absent or throws —
 * the field stays a plain functional `input type="tel"` (graceful degradation,
 * never an error for the user).
 */
function initPhoneInput(element, options) {
    var opts = options || {};
    var lib = Object.prototype.hasOwnProperty.call(opts, 'lib') ? opts.lib : resolveLib();

    if (typeof lib !== 'function') {
        console.error('intl-tel-input library is not loaded.');
        return null;
    }

    var config = {
        initialCountry: opts.initialCountry || DEFAULT_INITIAL_COUNTRY,
        utilsScript: opts.utilsScript || INTL_TEL_INPUT_UTILS
    };

    try {
        return lib(element, config);
    } catch (error) {
        console.error('Failed to initialize intl-tel-input:', error);
        return null;
    }
}

// Browser-specific bootstrap (only runs in a DOM environment)
if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function () {
        'use strict';

        var phoneInputField = document.querySelector('#phone');
        if (phoneInputField) {
            initPhoneInput(phoneInputField);
        }
    });
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        INTL_TEL_INPUT_VERSION: INTL_TEL_INPUT_VERSION,
        INTL_TEL_INPUT_UTILS: INTL_TEL_INPUT_UTILS,
        DEFAULT_INITIAL_COUNTRY: DEFAULT_INITIAL_COUNTRY,
        isPhoneInputSupported: isPhoneInputSupported,
        initPhoneInput: initPhoneInput
    };
}
