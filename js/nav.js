/* ------------------------------------------------------------------ *
 * talaria.school — maquette — Navigation utilities
 * Porté depuis cheroliv.com script.js (SmoothScrollWithOffset,
 * NavbarHeightUpdater) + ajout swap titre-nav au scroll.
 * ------------------------------------------------------------------ */
(function () {
  if (typeof TALARIA === 'undefined') window.TALARIA = {};

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

  /* --- NavTitleSwapper : brand passe du raccourci au nom complet au scroll - */
  var NavTitleSwapper = {
    init: function () {
      var brand = document.querySelector('.brand');
      if (!brand) return;
      var shortName = brand.getAttribute('data-brand-short') || 'TS talaria.school';
      var fullName = brand.getAttribute('data-brand-full') || 'talaria.school';
      var self = this;
      window.addEventListener(
        'scroll',
        function () {
          self._swap(brand, shortName, fullName);
        },
        { passive: true }
      );
      self._swap(brand, shortName, fullName); // état initial (top)
    },
    // Préserve la pastille .brand-mark dans l'état "court".
    _swap: function (brand, shortName, fullName) {
      if (window.scrollY > 40) {
        brand.innerHTML = '<span class="brand-mark">' + fullName.charAt(0).toUpperCase() + '</span>' + fullName;
        brand.classList.add('scrolled');
      } else {
        var parts = shortName.split(' ');
        var mark = parts.shift();
        brand.innerHTML = '<span class="brand-mark">' + mark + '</span> ' + parts.join(' ');
        brand.classList.remove('scrolled');
      }
    },
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
  document.addEventListener('DOMContentLoaded', function () {
    NavbarHeightUpdater.init();
    SmoothScrollWithOffset.init();
    NavTitleSwapper.init();
    ScrollToTopButton.init();
  });

  // Expose pour tests / usage externe
  TALARIA.nav = {
    NavbarHeightUpdater: NavbarHeightUpdater,
    SmoothScrollWithOffset: SmoothScrollWithOffset,
    NavTitleSwapper: NavTitleSwapper,
    ScrollToTopButton: ScrollToTopButton,
  };
})();
