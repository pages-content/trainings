/* ------------------------------------------------------------------ *
 * talaria.school — maquette — Header + footer partagés (injectés au load)
 * Champ : nav à ancres + selecteur langue (21 langues) + brand-swap.
 * Le DOM injecté est localisé via TALARIA.I18N.apply() (data-i18n).
 * ------------------------------------------------------------------ */
(function () {
  function langOptions() {
    var langMeta = (window.TALARIA && TALARIA.LANGS) || [];
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
    <nav class="main-nav" aria-label="Navigation principale">
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

  function scrollTopButton() {
    return `
<button id="scrollToTopBtn" class="btn btn-primary" type="button" aria-label="Retour en haut de page">
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
</button>
`;
  }

  document.addEventListener("DOMContentLoaded", function () {
    const head = document.getElementById("site-header");
    const foot = document.getElementById("site-footer");
    if (head) head.outerHTML = header();
    if (foot) foot.outerHTML = footer();
    document.body.insertAdjacentHTML("beforeend", scrollTopButton());

    if (window.TALARIA && TALARIA.I18N) TALARIA.I18N.apply();
    initLangSwitcher();
    if (window.TALARIA && TALARIA.CART) TALARIA.CART.badge();
  });
})();