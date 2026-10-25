/**
 * Phone number normalisation — shared between browser and Node.js.
 *
 * Mirrors the Kotlin `talaria.forms.PhoneNumber` value object: the dial-code
 * selector (intl-tel-input) formats the value it controls using the selected
 * country's grouping (e.g. `06 12 34 56 78`), so a raw digit-only check would
 * reject every number typed through the selector. One normalisation rule keeps
 * the browser and the Gradle domain in agreement.
 *
 * National numbers keep their leading zero (`06 12 34 56 78` → `0612345678`);
 * international numbers keep the leading `+` in E.164 form
 * (`+33 6 12 34 56 78` → `+33612345678`).
 */

var PHONE_SEPARATORS = /[\s.()\-]/g;
var NATIONAL_PATTERN = /^\d{10,15}$/;
var E164_PATTERN = /^\+[1-9]\d{6,14}$/;

/**
 * Reduces a human-formatted phone string to its comparable digits-only form,
 * preserving a leading `+`. Blank input collapses to an empty string.
 */
function normalize(raw) {
    var value = (raw == null ? '' : String(raw)).trim().replace(PHONE_SEPARATORS, '');
    var hasLeadingPlus = value.charAt(0) === '+';
    var digits = value.replace(/\+/g, '');
    return hasLeadingPlus ? '+' + digits : digits;
}

/** Tells whether `raw` is a valid national (10-15 digits) or E.164 number. */
function isValid(raw) {
    var normalized = normalize(raw);
    return NATIONAL_PATTERN.test(normalized) || E164_PATTERN.test(normalized);
}

// Export for Node.js testing and browser consumers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalize: normalize,
        isValid: isValid,
        NATIONAL_PATTERN: NATIONAL_PATTERN,
        E164_PATTERN: E164_PATTERN
    };
}
if (typeof window !== 'undefined') {
    window.TALARIA_PHONE_FORMAT = {
        normalize: normalize,
        isValid: isValid
    };
}
