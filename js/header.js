/* ------------------------------------------------------------------ *
 * talaria.school — maquette — Header + footer partagés (injectés au load)
 * Champ : nav à ancres + sélecteur langue (22 langues) + brand-swap.
 * Le DOM injecté est localisé via TALARIA.I18N.apply() (data-i18n).
 *
 * Responsive (EPIC T-RESPONSIVE, US-1) : sous --bp-md (760px) la barre de
 * navigation devient un *disclosure* — un bouton hamburger `aria-expanded`
 * pilote un panneau `.main-nav.open`. `createNavDisclosure` isole la logique
 * d'ouverture/fermeture en fonction pure (élément/classList injectés, sans DOM
 * réel) pour être testable sous `node --test` sans navigateur.
 * ------------------------------------------------------------------ */
(function () {
  var ELEMENT_ROOT =
    (typeof window !== "undefined") ? window
      : (typeof globalThis !== "undefined" ? globalThis : this);

  function langOptions() {
    var langMeta = (ELEMENT_ROOT.TALARIA && ELEMENT_ROOT.TALARIA.LANGS) || [];
    return langMeta
      .map(function (l) {
        return '<a class="lang-option" href="#" data-lang="' + l.code + '">' +
          l.flag + ' ' + l.name + "</a>";
      })
      .join("");
  }

  function header() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    const homeHref = path === "index.html" ? "#home" : "index.html";
    return `
<header class="site-header">
  <div class="header-inner">
    <a class="brand" data-brand-short="TS talaria.school" data-brand-full="talaria.school" href="index.html"><span class="brand-mark">TS</span> talaria.school</a>
    <nav class="main-nav" id="main-nav" aria-label="Navigation principale">
      <a href="${homeHref}" class="${path === "index.html" ? "active" : ""}" data-i18n="nav.home">Accueil</a>
      <a href="catalogue.html" class="${path === "catalogue.html" ? "active" : ""}" data-i18n="nav.formations">Formations</a>
      <a href="suivi.html" class="${path === "suivi.html" ? "active" : ""}" data-i18n="nav.follow">Suivre ma commande</a>
    </nav>
    <div class="header-actions">
      <a class="cart-link" href="panier.html" data-i18n="nav.cart">Panier <span id="cart-count">0</span></a>
      <div class="lang-switcher">
        <button type="button" class="lang-btn" id="lang-current" aria-haspopup="true" aria-expanded="false" data-i18n="nav.lang">Langue</button>
        <div class="lang-menu">
          ${langOptions()}
        </div>
      </div>
      <button type="button" class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="main-nav">
        <span class="sr-only" data-i18n="nav.menu">Menu</span>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>
      </button>
    </div>
  </div>
</header>
`;
  }

  function footer() {
    return `
<footer class="site-footer">
  <div class="footer-inner">
    <span data-i18n="footer.copy">© 2026 talaria.school — Vente de formations · FPA &amp; CDA</span>
    <span data-i18n="footer.tagline">Boutique en ligne sans compte · Paiement sécurisé</span>
  </div>
</footer>
`;
  }

  function initLangSwitcher() {
    const btn = document.getElementById("lang-current");
    if (!btn) return;
    const menu = btn.parentElement.querySelector(".lang-menu");

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const open = menu.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    menu.querySelectorAll(".lang-option").forEach(function (opt) {
      opt.addEventListener("click", function (e) {
        e.preventDefault();
        if (window.TALARIA && TALARIA.I18N) {
          TALARIA.I18N.setLang(opt.getAttribute("data-lang"));
        }
        menu.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", function (e) {
      if (!btn.contains(e.target)) {
        menu.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /**
   * Mobile navigation disclosure — pure controller, no DOM assumption.
   *
   * Opens/closes the `.main-nav` panel from a hamburger `button`. The state is
   * mirrored on `aria-expanded` and the `open` class. Clicks outside the panel
   * (and the Escape key) close it, mirroring the `lang-switcher` pattern.
   * Returns `null` when the button or the panel is missing, so a page without
   * the injected header degrades silently.
   */
  function createNavDisclosure(options) {
    var button = options && options.button;
    var panel = options && options.panel;
    var hostDocument = options && options.document;
    if (!button || !panel) return null;

    var open = false;

    function render() {
      button.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        panel.classList.add("open");
      } else {
        panel.classList.remove("open");
      }
    }

    function openPanel() {
      open = true;
      render();
    }

    function closePanel() {
      open = false;
      render();
    }

    function toggle() {
      if (open) {
        closePanel();
      } else {
        openPanel();
      }
    }

    button.addEventListener("click", function (event) {
      if (event && typeof event.preventDefault === "function") event.preventDefault();
      toggle();
    });

    if (hostDocument && typeof hostDocument.addEventListener === "function") {
      hostDocument.addEventListener("click", function (event) {
        if (!open) return;
        var target = event && event.target;
        var insidePanel = panel.contains && panel.contains(target);
        var insideButton = button.contains && button.contains(target);
        if (!insidePanel && !insideButton) closePanel();
      });

      hostDocument.addEventListener("keydown", function (event) {
        if (open && event && event.key === "Escape") closePanel();
      });
    }

    render();

    return {
      isOpen: function () { return open; },
      open: openPanel,
      close: closePanel,
      toggle: toggle,
    };
  }

  function initNavDisclosure() {
    var button = document.getElementById("nav-toggle");
    var panel = document.getElementById("main-nav");
    if (!button || !panel) return;
    createNavDisclosure({ button: button, panel: panel, document: document });
  }

  function scrollTopButton() {
    return `
<button id="scrollToTopBtn" class="btn btn-primary" type="button" aria-label="Retour en haut de page">
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
</button>
`;
  }

  ELEMENT_ROOT.TALARIA = ELEMENT_ROOT.TALARIA || {};
  ELEMENT_ROOT.TALARIA.createNavDisclosure = createNavDisclosure;

  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("DOMContentLoaded", function () {
      const head = document.getElementById("site-header");
      const foot = document.getElementById("site-footer");
      if (head) head.outerHTML = header();
      if (foot) foot.outerHTML = footer();
      document.body.insertAdjacentHTML("beforeend", scrollTopButton());

      if (window.TALARIA && TALARIA.I18N) TALARIA.I18N.apply();
      initLangSwitcher();
      initNavDisclosure();
      if (window.TALARIA && TALARIA.CART) TALARIA.CART.badge();
    });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createNavDisclosure: createNavDisclosure };
  }
})();
