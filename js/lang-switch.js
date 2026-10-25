// ===============================================================================================================
// BKY-LANG-NAV-3 — client host of the same-page language switcher.
// ===============================================================================================================
// The single pure rule `resolveLangPath(...)` is the JS sibling of the Kotlin
// `LangSwitchPath.resolveSamePage` (BKY-LANG-NAV-1): both replay the shared
// fixture `bakery/langswitch/lang-switch-path-vectors.json` (anti split-brain
// decision D3). Site tree model: the default language lives at the site root
// (`blog/foo.html`), every other language under its own directory
// (`en/blog/foo.html`).
//
// Division of labour (decision D2):
//   - tree site   → the server already emits the exact `th:href` (BKY-LANG-NAV-2);
//                   the adapter only rewrites `data-lang` links page-aware at
//                   load, and marks the active language (persistence/active).
//   - dictionary site → there is no per-language tree; the adapter relocalises
//                   in place (`preventDefault`), never navigates.
// The module is plain browser JS (no build step) and doubles as a CommonJS
// module for the node host tests.
// ===============================================================================================================

(function (root) {
    'use strict';

    /** Strips surrounding whitespace and a leading slash from a page uri. */
    function normalise(uri) {
        return String(uri == null ? '' : uri).trim().replace(/^\/+/, '');
    }

    /** Removes the current language directory prefix (non-default languages only). */
    function stripLanguagePrefix(uri, currentLang, defaultLang) {
        if (currentLang === defaultLang) return uri;
        var prefix = currentLang + '/';
        return uri.indexOf(prefix) === 0 ? uri.slice(prefix.length) : uri;
    }

    /** Absolute path of the same page in the target tree, degrading to the index. */
    function absolutePath(pageWithinLang, targetLang, defaultLang, pageExists) {
        var candidate = targetLang === defaultLang ? pageWithinLang : targetLang + '/' + pageWithinLang;
        if (pageExists(candidate)) return candidate;
        return targetLang === defaultLang ? 'index.html' : targetLang + '/index.html';
    }

    /** Relative url from `fromDir` to `toPath`. */
    function relativise(fromDir, toPath) {
        var dirSegments = fromDir.split('/').filter(function (s) {
            return s.length > 0;
        });
        var targetSegments = toPath.split('/').filter(function (s) {
            return s.length > 0;
        });

        var common = 0;
        while (
            common < dirSegments.length &&
            common < targetSegments.length &&
            dirSegments[common] === targetSegments[common]
        ) {
            common++;
        }

        var ups = '';
        for (var i = 0; i < dirSegments.length - common; i++) ups += '../';
        return ups + targetSegments.slice(common).join('/');
    }

    /**
     * Resolves the relative url of the translation of the *current page* in the
     * target language. Pure — no DOM, no I/O. `pageExists` is an injectable
     * predicate (default: always true).
     */
    function resolveLangPath(currentPageUri, currentLang, targetLang, defaultLang, pageExists) {
        if (!currentPageUri || !String(currentPageUri).trim()) {
            throw new Error('currentPageUri must not be blank');
        }
        if (!currentLang) throw new Error('currentLang must not be blank');
        if (!targetLang) throw new Error('targetLang must not be blank');
        if (!defaultLang) throw new Error('defaultLang must not be blank');

        var exists = typeof pageExists === 'function' ? pageExists : function () {
            return true;
        };
        var uri = normalise(currentPageUri);

        if (targetLang === currentLang) {
            return uri.slice(uri.lastIndexOf('/') + 1);
        }

        var pageWithinLang = stripLanguagePrefix(uri, currentLang, defaultLang);
        var targetAbsolute = absolutePath(pageWithinLang, targetLang, defaultLang, exists);
        var lastSlash = uri.lastIndexOf('/');
        var currentDir = lastSlash < 0 ? '' : uri.slice(0, lastSlash);
        return relativise(currentDir, targetAbsolute);
    }

    /** The language a link targets: `data-lang`, never a recomputed href (D4). */
    function targetLangOf(option) {
        var lang = option.getAttribute('data-lang');
        return lang || null;
    }

    /**
     * DOM adapter. Reads `data-lang` on every `.lang-option`, then:
     *   - tree mode       → rewrites each `href` page-aware and sets the active class;
     *   - dictionary mode → attaches click handlers that relocalise in place.
     * Returns `null` (never throws) when there is no document or no option, so a
     * missing selector cannot break the page.
     */
    function attachLangSwitch(config) {
        if (!config || !config.document || typeof config.document.querySelectorAll !== 'function') {
            return null;
        }
        var options = config.document.querySelectorAll('.lang-option');
        if (!options || options.length === 0) return null;

        var mode = config.mode === 'dictionary' ? 'dictionary' : 'tree';
        var currentLang = config.currentLang;
        var defaultLang = config.defaultLang;
        var pageExists = config.pageExists;
        var onSwitch = config.onSwitch;

        var list = Array.prototype.slice.call(options);
        var activeLang = currentLang;

        list.forEach(function (option) {
            var lang = targetLangOf(option);
            if (!lang) return;

            if (mode === 'tree') {
                var href = resolveLangPath(config.currentPageUri, currentLang, lang, defaultLang, pageExists);
                option.setAttribute('href', href);
                if (lang === currentLang) option.classList.add('active');
                else option.classList.remove('active');
            } else {
                option.addEventListener('click', function (event) {
                    if (event && typeof event.preventDefault === 'function') event.preventDefault();
                    activeLang = lang;
                    if (typeof onSwitch === 'function') onSwitch(lang);
                });
            }
        });

        return {
            mode: mode,
            activeLang: function () {
                return activeLang;
            },
            options: list,
        };
    }

    /**
     * Auto-bootstrap on DOMContentLoaded. Mode and current language are declared
     * by the host page (`<html data-lang-switch="tree|dictionary" lang="fr">`).
     * A page that carries no `.lang-option` is left untouched.
     */
    function bootstrap() {
        if (typeof document === 'undefined') return null;
        var html = document.documentElement;
        if (!html) return null;

        var mode = html.getAttribute('data-lang-switch') || 'tree';
        var currentLang = html.getAttribute('lang') || null;
        var defaultLang = html.getAttribute('data-default-lang') || currentLang;
        if (!currentLang) return null;

        var pageUri = (root.location && root.location.pathname ? root.location.pathname : '').replace(/^\/+/, '');
        if (!pageUri) pageUri = 'index.html';

        return attachLangSwitch({
            mode: mode,
            currentPageUri: pageUri,
            currentLang: currentLang,
            defaultLang: defaultLang,
            document: document,
            onSwitch: function (lang) {
                try {
                    root.localStorage.setItem('lang', lang);
                } catch (e) {
                    // storage unavailable (private mode) — switching still applies.
                }
                var i18n = root.TALARIA && root.TALARIA.I18N;
                if (i18n && typeof i18n.setLang === 'function') i18n.setLang(lang);
            },
        });
    }

    var api = {
        resolveLangPath: resolveLangPath,
        attachLangSwitch: attachLangSwitch,
        bootstrap: bootstrap,
    };

    root.LANG_SWITCH = api;

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : this);
