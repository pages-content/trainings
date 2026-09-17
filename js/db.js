/* ------------------------------------------------------------------ *
 * talaria.school — maquette — Couche de persistance (boutique serverless)
 *
 * STUB de maquette : tout est stocké en localStorage.
 * L'intégration Firebase (EPIC T-FIREBASE) remplacera uniquement
 * l'implémentation des fonctions ci-dessous — l'interface (charge/persiste)
 * est fixée pour que le swap soit trivial.
 *
 * cible Firebase (documenté, NON branché — zéro SDK, zéro secret) :
 *   - Static Hosting        : maquette/ (les pages HTTP)
 *   - Firestore             : collection `orders` (doc par commande)
 *   - Cloud Functions       : checkout (écrit la doc après paiement) + suivi
 *   - Firebase Payments     : encaissement module/bloc (carte, sans compte)
 * ------------------------------------------------------------------ */
window.TALARIA = window.TALARIA || {};

(function (ns) {
  const CART_KEY = "talaria.cart.v1";
  const ORDERS_KEY = "talaria.orders.v1";

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  ns.DB = {
    // --- Panier ---
    loadCart() {
      return read(CART_KEY, { items: [] });
    },
    saveCart(cart) {
      write(CART_KEY, cart);
    },
    clearCart() {
      this.saveCart({ items: [] });
    },

    // --- Commandes ---
    loadOrders() {
      return read(ORDERS_KEY, []);
    },
    saveOrder(order) {
      const orders = this.loadOrders();
      orders.unshift(order);
      write(ORDERS_KEY, orders);
      return order;
    },
    findOrder(id) {
      return this.loadOrders().find((o) => o.id === id) || null;
    },
    findByContact({ email, phone }) {
      const mail = (email || "").trim().toLowerCase();
      const tel = (phone || "").trim();
      return this.loadOrders().filter((o) => {
        const oMail = (o.contact && o.contact.email || "").toLowerCase();
        const oTel = (o.contact && o.contact.phone || "");
        return (mail && oMail === mail) || (tel && oTel === tel);
      });
    },
  };
})(window.TALARIA);