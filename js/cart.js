/* ------------------------------------------------------------------ *
 * talaria.school — maquette — Panier (quantités, totaux, rendu prix)
 * Format d'item : { trainingId, trainingName, type: "module"|"bloc",
 *                   moduleIds: [...], moduleLabel?, quantity, unitPrice }
 * ------------------------------------------------------------------ */
window.TALARIA = window.TALARIA || {};

(function (ns) {
  ns.CART = {
    get() {
      return ns.DB.loadCart();
    },

    count() {
      return this.get().items.reduce((sum, it) => sum + it.quantity, 0);
    },

    total() {
      return this.get().items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    },

    has(itemsSelector) {
      return this.get().items.some(itemsSelector);
    },

    addItem(item) {
      const cart = this.get();
      // Fusion si même composition (même type + mêmes modules triés).
      const key = [item.trainingId, item.type, (item.moduleIds || []).slice().sort().join(",")].join("|");
      const existing = cart.items.find((it) =>
        [it.trainingId, it.type, (it.moduleIds || []).slice().sort().join(",")].join("|") === key
      );
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.items.push(Object.assign({ quantity: 1 }, item));
      }
      ns.DB.saveCart(cart);
      return cart;
    },

    removeItem(index) {
      const cart = this.get();
      cart.items.splice(index, 1);
      ns.DB.saveCart(cart);
      return cart;
    },

    clear() {
      ns.DB.clearCart();
    },

    // Rendu du libellé d'un item.
    label(item) {
      if (item.type === "bloc") {
        return item.trainingName + " — " + ns.t("cart.blocLabel");
      }
      const label = item.moduleLabel
        ? " — " + item.moduleLabel
        : " — " + (item.moduleIds || []).length + " " + ns.t("formation.countModules");
      return item.trainingName + label;
    },
  };

  ns.CART.badge = function () {
    const el = document.getElementById("cart-count");
    if (!el) return;
    const total = ns.CART.total();
    el.textContent = total > 0 ? ns.formatEUR(total) : ns.formatEUR(0);
  };
})(window.TALARIA);