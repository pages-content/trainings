/* ------------------------------------------------------------------ *
 * talaria.school — maquette — Page détail formation
 * Rend la formation (?formation=fpa|cda), la liste des 7 modules
 * (checkbox) et calcule le prix dynamiquement (module × 60 €, bloc complet).
 * ------------------------------------------------------------------ */
(function () {
  const params = new URLSearchParams(window.location.search);
  const training = TALARIA.localizedTraining(params.get("formation"));
  const T = TALARIA;

  if (!training) {
    document.getElementById("shop").innerHTML =
      '<p class="empty">' + T.t("formation.notFound") +
      ' <a href="catalogue.html">' + T.t("formation.seeCatalog") + "</a>.</p>";
    return;
  }

  const selected = new Set(); // module ids (Set pour tri canonique)

  function currentPrice() {
    if (selected.size === T.MODULES_PER_FORMATION) return T.blocPrice();
    return T.trainingPrice(selected.size);
  }

  function currentLabel() {
    if (selected.size === T.MODULES_PER_FORMATION) return T.t("cart.blocLabel");
    return selected.size + " " + T.t("formation.countModules");
  }

  function render() {
    const totalEl = document.getElementById("total-price");
    const countEl = document.getElementById("count-modules");
    if (totalEl) totalEl.textContent = T.formatEUR(currentPrice());
    if (countEl) countEl.textContent = String(selected.size);
    const cta = document.getElementById("cta-cart");
    cta.disabled = selected.size === 0;
    cta.textContent = selected.size === 0
      ? T.t("formation.ctaDisabled")
      : T.t("formation.ctaAdd") + " — " + currentLabel() + " — " + T.formatEUR(currentPrice());
  }

  // En-tête
  document.getElementById("tr-code").textContent = training.code;
  document.title = training.title + " — talaria.school";
  document.getElementById("tr-title").textContent = training.title;
  document.getElementById("tr-tagline").textContent = training.tagline;
  document.getElementById("tr-meta").textContent =
    training.level + " · " + training.duration;

  // Objectifs
  const obj = document.getElementById("objectives");
  training.objectives.forEach((o) => {
    const li = document.createElement("li");
    li.textContent = o;
    obj.appendChild(li);
  });

  // Modules — la sélection "bloc" se gère par cochant les 7 ; la carte bloc
  // sert de raccourci et reste décorative (le prix bloc s'applique seul).
  const list = document.getElementById("module-list");
  training.modules.forEach((m, i) => {
    const wrap = document.createElement("article");
    wrap.className = "module";
    wrap.id = "mod-" + m.id;

    const box = document.createElement("input");
    box.type = "checkbox";
    box.value = m.id;
    box.id = "chk-" + m.id;
    box.addEventListener("change", () => {
      if (box.checked) selected.add(m.id);
      else selected.delete(m.id);
      wrap.classList.toggle("selected", box.checked);
      render();
    });

    const label = document.createElement("label");
    label.htmlFor = box.id;
    const h4 = document.createElement("h4");
    h4.textContent = "M" + (i + 1) + " — " + m.title;
    const p = document.createElement("p");
    p.textContent = m.desc;
    label.appendChild(h4);
    label.appendChild(p);

    const price = document.createElement("div");
    price.className = "module-price";
    price.textContent = T.formatEUR(T.PRICE_PER_MODULE);

    wrap.appendChild(box);
    wrap.appendChild(label);
    wrap.appendChild(price);
    list.appendChild(wrap);
  });

  document.getElementById("modal-price").textContent = T.formatEUR(T.PRICE_PER_MODULE);
  document.getElementById("bloc-price").textContent = T.formatEUR(T.blocPrice());

  // Ajout au panier — feedback badge + toast, PAS de redirection :
  // l'utilisateur accumule (FPA + CDA) avant de passer au panier.
  document.getElementById("cta-cart").addEventListener("click", () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected).sort();
    const allModules = ids.length === T.MODULES_PER_FORMATION;
    T.CART.addItem({
      trainingId: training.id,
      trainingName: training.code + " — " + training.title,
      type: allModules ? "bloc" : "module",
      moduleIds: ids,
      moduleLabel: allModules
        ? T.t("cart.blocLabel")
        : ids.length + " " + T.t("formation.countModules"),
      unitPrice: currentPrice(),
    });
    T.CART.badge();

    const toast = document.getElementById("cart-toast");
    toast.textContent =
      T.t("cart.toastAdded") + " " + currentLabel() + " — " + T.formatEUR(currentPrice());
    toast.classList.add("show");
    clearTimeout(window.__cartToastTimer);
    window.__cartToastTimer = setTimeout(() => toast.classList.remove("show"), 3000);

    const link = document.getElementById("cart-link");
    if (link) link.textContent = T.t("formation.viewCart") + " — " + T.formatEUR(T.CART.total());
  });

  render();
})();