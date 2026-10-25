/* ------------------------------------------------------------------ *
 * talaria.school — maquette — Suivi de commande (email / téléphone)
 * Recherche les commandes par contact — aucune zone authentifiée.
 *
 * En production, la lecture passe par la callable `suivi` (le serveur est le
 * seul lecteur de `orders` — D7 : le navigateur ne liste jamais la collection,
 * les règles Firestore le refusent). Le repli `T.DB.findByContact` sert la
 * maquette / un site non configuré — interface identique, résultat unique :
 * `T.DB.findByContact` retourne une Promise dans les deux cas (US-6).
 * ------------------------------------------------------------------ */
(function () {
  const T = TALARIA;
  const form = document.getElementById("follow-form");
  const box = document.getElementById("results");
  const blank = document.getElementById("blank");

  /** The server-side tracking callable, when the bootstrap installed it. */
  function resolveTrack() {
    const fb = window.__FIREBASE__;
    if (!fb || typeof fb.callable !== "function") {
      return null;
    }
    const callable = fb.callable("suivi");
    return typeof callable === "function" ? callable : null;
  }

  function findLocally(contact) {
    return Promise.resolve(T.DB.findByContact(contact));
  }

  /** Resolves the learner's orders through the server (D7) or the local store. */
  function resolveOrders(contact) {
    const track = resolveTrack();
    if (!track) {
      return findLocally(contact);
    }
    return Promise.resolve(track(contact))
      .then((response) => {
        const data = response && response.data ? response.data : response;
        return (data && data.orders) || [];
      })
      .catch(() => findLocally(contact));
  }

  function render(orders) {
    blank.style.display = "none";
    box.innerHTML = "";

    if (!orders.length) {
      box.innerHTML =
        '<p class="empty"><div class="big">🔍</div>' + T.t("suivi.noResults") +
        "<br>" + T.t("suivi.checkContact") + "</p>";
      return;
    }

    orders.forEach((o) => {
      const card = document.createElement("article");
      card.className = "order-card";
      card.style.marginBottom = "1rem";
      const rows = o.items
        .map(
          (it) =>
            "<div class=\"summary-item\"><span>" +
            T.CART.label(it) +
            (it.quantity > 1 ? " × " + it.quantity : "") +
            "</span><span>" +
            T.formatEUR(it.unitPrice * it.quantity) +
            "</span></div>"
        )
        .join("");
      card.innerHTML =
        '<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">' +
        "<div class=\"order-id\">" + o.id + "</div>" +
        ' <span class="status status-success">' + o.status + "</span>" +
        "</div>" +
        '<p class="small muted">' + new Date(o.createdAt).toLocaleString(T.locale()) + "</p>" +
        rows +
        '<div class="total"><span>' + T.t("panier.total") + "</span><span>" + T.formatEUR(o.total) + "</span></div>";
      box.appendChild(card);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("f-email").value.trim();
    const phone = document.getElementById("f-phone").value.trim();
    const err = document.getElementById("err-follow");
    err.textContent = "";

    if (!email && !phone) {
      err.textContent = T.t("suivi.errEmpty");
      return;
    }

    resolveOrders({ email, phone }).then(render);
  });
})();
