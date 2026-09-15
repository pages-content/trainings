/* ------------------------------------------------------------------ *
 * talaria.school — maquette — Checkout + confirmation
 * Identification par email OU téléphone (aucune zone authentifiée).
 * La commande est une "vigne" de contact : suivant de vente par
 * email/téléphone. Coin paiement = simulation (Firebase Payments cible).
 * ------------------------------------------------------------------ */
(function () {
  const T = TALARIA;

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("id");

  // --- Page panier ----------
  if (document.getElementById("checkout-form")) {
    const box = document.getElementById("checkout-box");

    function renderCartPage() {
      const cart = T.CART.get();
      if (!cart.items.length) {
        box.innerHTML =
          '<p class="empty"><div class="big">🛒</div>' + T.t("panier.errEmpty") +
          '<br><a class="btn btn-primary mt-2" href="catalogue.html">' + T.t("formations.chip") + "</a></p>";
        return;
      }

      const list = document.getElementById("cart-summary");
      list.innerHTML = "";
      cart.items.forEach((it, index) => {
        const row = document.createElement("div");
        row.className = "summary-item";
        const left = document.createElement("span");
        left.textContent = T.CART.label(it) + (it.quantity > 1 ? " × " + it.quantity : "");
        const right = document.createElement("span");
        right.textContent = T.formatEUR(it.unitPrice * it.quantity);
        const del = document.createElement("button");
        del.type = "button";
        del.className = "btn-remove";
        del.title = T.t("cart.remove");
        del.setAttribute("aria-label", T.t("cart.remove"));
        del.textContent = "×";
        del.addEventListener("click", () => {
          T.CART.removeItem(index);
          renderCartPage();
        });
        row.appendChild(left);
        row.appendChild(right);
        row.appendChild(del);
        list.appendChild(row);
      });

      document.getElementById("total-label").textContent = T.t("panier.total");
      document.getElementById("total-amount").textContent = T.formatEUR(T.CART.total());
      const submit = document.getElementById("pay-btn");
      submit.textContent = T.t("panier.pay") + " " + T.formatEUR(T.CART.total());
      submit.disabled = false;

      if (T.CART.badge) T.CART.badge();
    }

    renderCartPage();
  }

  // --- Écoute du formulaire ----------
  const form = document.getElementById("checkout-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const contact = {
        fullName: form.fullName.value.trim(),
        email: form.email.value.trim(),
        phone: (window.TALARIA_PHONE_FORMAT
          ? window.TALARIA_PHONE_FORMAT.normalize(form.phone.value)
          : form.phone.value.trim()),
      };

      // Identifier : email OU téléphone obligatoire pour le suivi de vente.
      const errMail = document.getElementById("err-email");
      const errPhone = document.getElementById("err-phone");
      errMail.textContent = "";
      errPhone.textContent = "";
      let valid = true;
      if (!contact.email && !contact.phone) {
        errMail.textContent = T.t("panier.errEmailMsg");
        errPhone.textContent = T.t("panier.errPhoneMsg");
        valid = false;
      } else if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        errMail.textContent = T.t("panier.errEmailFormat");
        valid = false;
      } else if (contact.phone && !/^(\+[1-9]\d{6,14}|\d{10,15})$/.test(contact.phone)) {
        errPhone.textContent = T.t("panier.errPhoneFormat");
        valid = false;
      }
      if (!valid) return;

      const cart = T.CART.get();
      const order = {
        id: newOrderId(),
        createdAt: new Date().toISOString(),
        items: cart.items,
        total: T.CART.total(),
        contact: contact,
        status: "PAYE", // simulation — statut réel posé par Cloud Function Firebase
      };
      T.DB.saveOrder(order);
      T.CART.clear();
      window.location.href = "confirmation.html?id=" + order.id;
    });
  }

  function newOrderId() {
    const d = new Date();
    const ymd =
      String(d.getFullYear()) +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return "TC-" + ymd + "-" + rnd;
  }

  // --- Page confirmation ----------
  const conf = document.getElementById("confirmation");
  if (conf) {
    const order = T.DB.findOrder(orderId);
    if (!order) {
      conf.innerHTML =
        '<p class="empty"><div class="big">❓</div>' + T.t("confirmation.notFound") +
        '<br><a class="btn btn-primary mt-2" href="suivi.html">' + T.t("confirmation.findAgain") + "</a></p>";
      return;
    }
    document.getElementById("order-id").textContent = order.id;
    document.getElementById("order-status").textContent = order.status;
    document.getElementById("order-date").textContent =
      T.t("confirmation.orderedOn") + " " + new Date(order.createdAt).toLocaleString(T.locale());
    const items = document.getElementById("conf-items");
    order.items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "summary-item";
      row.innerHTML =
        "<span>" + T.CART.label(it) + (it.quantity > 1 ? " × " + it.quantity : "") + "</span>" +
        "<span>" + T.formatEUR(it.unitPrice * it.quantity) + "</span>";
      items.appendChild(row);
    });
    document.getElementById("conf-total").textContent = T.formatEUR(order.total);
    const contact = document.getElementById("conf-contact");
    contact.innerHTML =
      "<strong>" + (order.contact.fullName || T.t("confirmation.unknown")) + "</strong>" +
      (order.contact.email ? "<br>" + T.t("panier.email") + " : " + order.contact.email : "") +
      (order.contact.phone ? "<br>" + T.t("panier.phone") + " : " + order.contact.phone : "");
    document.getElementById("follow-link").href = "suivi.html";
  }
})();