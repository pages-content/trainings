/* ------------------------------------------------------------------ *
 * talaria.school — maquette — Navigation utilities
 * Porté depuis cheroliv.com script.js (SmoothScrollWithOffset,
 * NavbarHeightUpdater) + brand au scroll (port de la référence
 * cccp.education / magic-stick `BrandVisibilityManager`, EPIC T-NAV-POLISH US-3).
 * ------------------------------------------------------------------ */
(function () {
  var ELEMENT_ROOT =
    (typeof window !== 'undefined') ? window
      : (typeof globalThis !== 'undefined' ? globalThis : this);
  if (typeof TALARIA === 'undefined') ELEMENT_ROOT.TALARIA = {};

  /* --- NavbarHeightUpdater : --navbar-height = hauteur réelle du header ---- */
  var NavbarHeightUpdater = {
    init: function () {
      var navbar = document.querySelector('.site-header');
      if (!navbar || !('ResizeObserver' in window)) return;
      var self = this;
      new ResizeObserver(function () {
        self._update(navbar);
      }).observe(navbar);
      this._update(navbar);
    },
    _update: function (navbar) {
      var h = navbar.offsetHeight + 'px';
      document.documentElement.style.setProperty('--navbar-height', h);
    },
  };

  /* --- SmoothScrollWithOffset : ancre #id → scroll smooth + offset -------- */
  var SmoothScrollWithOffset = {
    init: function () {
      var self = this;
      document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          self._handle(e, a);
        });
      });
    },
    _handle: function (e, anchor) {
      if (anchor.matches('[data-bs-toggle]')) return; // dropdown toggle
      var href = anchor.getAttribute('href');
      if (!href || href === '#' || href === '#home') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      var id = href.substring(1);
      var el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      // Comportement cheroliv.com : scrollIntoView natif — le recadrage est
      // délégué au navigateur via `scroll-margin-top: var(--navbar-height)`
      // (CSS), donc toujours exact même si le layout change pendant le scroll.
      el.scrollIntoView({ behavior: 'smooth' });
    },
  };

  /* --- BrandVisibilityManager : icône seule au top, nom en fondu au scroll -
   * Port de la référence cccp.education / magic-stick (EPIC T-NAV-POLISH US-3),
   * qui remplace l'ancien swap de titre buggé « Ttalaria.school » (constat C-4).
   * Le nom du site vit dans un `.brand-hero` dédié en haut du hero ; au fil du
   * défilement, il s'estompe pendant que le `.brand-text` de la nav s'affiche,
   * en proportion (`progress` bornée 0..1). `computeProgress` est une fonction
   * pure (géométrie injectée) pour être testable sous node sans DOM réel. */
  function computeProgress(heroTop, heroHeight, navbarHeight) {
    var start = heroTop - navbarHeight;
    if (heroHeight <= 0) return 0;
    return Math.max(0, Math.min(1, -start / heroHeight));
  }

  var BrandVisibilityManager = {
    init: function () {
      var brandText = document.querySelector('.brand .brand-text');
      var hero = document.querySelector('.brand-hero');
      if (!brandText || !hero) return;
      var navbar = document.querySelector('.site-header');
      var self = this;
      // Géométrie lue à chaque événement : le hero peut se déplacer (langue,
      // viewport) sans qu'il faille recalculer une origine figée.
      function apply() {
        var rect = hero.getBoundingClientRect();
        var navbarHeight = navbar ? navbar.offsetHeight : hero.offsetHeight;
        var progress = computeProgress(rect.top, rect.height, navbarHeight);
        brandText.style.opacity = String(progress);
        hero.style.opacity = String(1 - progress);
      }
      ELEMENT_ROOT.addEventListener(
        'scroll',
        function () {
          apply();
        },
        { passive: true }
      );
      apply(); // état initial (top) : brand-text masqué, brand-hero visible
    },
    computeProgress: computeProgress,
  };

  /* --- ScrollToTopButton : bouton retour haut (porté cheroliv.com) ------- */
  var ScrollToTopButton = {
    init: function () {
      this.button = document.getElementById('scrollToTopBtn');
      if (!this.button) return;
      this.footer = document.querySelector('footer');
      var self = this;
      window.addEventListener(
        'scroll',
        function () {
          self._handleScroll();
        },
        { passive: true }
      );
      this.button.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      this._handleScroll();
    },
    _handleScroll: function () {
      var scrollY = window.scrollY;
      this.button.classList.toggle('show', scrollY > 300);
      if (this.footer) {
        var footerRect = this.footer.getBoundingClientRect();
        if (footerRect.top < window.innerHeight) {
          this.button.style.bottom =
            window.innerHeight - footerRect.top + 20 + 'px';
        } else {
          this.button.style.bottom = '20px';
        }
      }
    },
  };

  /* --- Init global au DOMContentLoaded ----------------------------------- */
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', function () {
      NavbarHeightUpdater.init();
      SmoothScrollWithOffset.init();
      BrandVisibilityManager.init();
      ScrollToTopButton.init();
    });
  }

  // Expose pour tests / usage externe
  ELEMENT_ROOT.TALARIA.nav = {
    NavbarHeightUpdater: NavbarHeightUpdater,
    SmoothScrollWithOffset: SmoothScrollWithOffset,
    BrandVisibilityManager: BrandVisibilityManager,
    ScrollToTopButton: ScrollToTopButton,
  };
})();
