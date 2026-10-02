/* ------------------------------------------------------------------ *
 * talaria.school — maquette — Couche de persistance (boutique serverless)
 *
 * The cart stays client-side (localStorage) — the basket is per-browser by
 * design. The **order** surface (`loadOrders`/`saveOrder`/`findOrder`/
 * `findByContact`) now delegates to a selectable backend: the Firestore
 * adapter (`firebase-order-store.js`) when the Firebase bootstrap installed
 * `window.__FIREBASE__.firestore`, the localStorage store otherwise.
 *
 * The selection is lazy (evaluated on each call): the bootstrap runs on
 * `DOMContentLoaded`, after `db.js` is parsed, so a load-time choice would
 * lock the site to localStorage forever.
 *
 * Order methods return a Promise (the Firestore path is asynchronous); the
 * localStorage path resolves immediately — the same contract either way.
 *
 * Order writes in production go through the `checkout` callable (server is the
 * price authority, D6) via `firebase-payment-gateway.js`; the Firestore store
 * is only ever asked to *read* (the rules deny client writes). A missing
 * bootstrap degrades to the localStorage store exactly as before Firebase.
 * ------------------------------------------------------------------ */
var DB_ROOT =
    (typeof window !== 'undefined') ? window
        : (typeof globalThis !== 'undefined' ? globalThis : this);

DB_ROOT.TALARIA = DB_ROOT.TALARIA || {};

(function (ns) {
    const CART_KEY = 'talaria.cart.v1';
    const ORDERS_KEY = 'talaria.orders.v1';

    function storageOf(scope) {
        const root = scope || DB_ROOT;
        try {
            return root.localStorage || null;
        } catch (e) {
            return null;
        }
    }

    function read(storage, key, fallback) {
        try {
            const raw = storage ? storage.getItem(key) : null;
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function write(storage, key, value) {
        if (storage) {
            storage.setItem(key, JSON.stringify(value));
        }
    }

    /** The default order store: localStorage, mirroring the pre-Firebase site. */
    function createLocalOrderBackend(storage) {
        return {
            isRemote: false,
            loadOrders() {
                return read(storage, ORDERS_KEY, []);
            },
            saveOrder(order) {
                const orders = read(storage, ORDERS_KEY, []);
                orders.unshift(order);
                write(storage, ORDERS_KEY, orders);
                return order;
            },
            findOrder(id) {
                return read(storage, ORDERS_KEY, []).find((order) => order.id === id) || null;
            },
            findByContact(contact) {
                const source = contact || {};
                const mail = String(source.email || '').trim().toLowerCase();
                const tel = String(source.phone || '').trim();
                return read(storage, ORDERS_KEY, []).filter((order) => {
                    const orderContact = order.contact || {};
                    const orderMail = String(orderContact.email || '').toLowerCase();
                    const orderTel = String(orderContact.phone || '');
                    return (mail && orderMail === mail) || (tel && orderTel === tel);
                });
            },
        };
    }

    /**
     * The Firestore order store, when the bootstrap installed the read API and
     * the adapter is present. Returns `null` otherwise (the caller keeps the
     * localStorage backend).
     *
     * US-6b — the hardened rules permit only the single-document read by id on
     * `orders` (D6/D7 deny listings and client writes), so the adapter receives
     * the **local backend** as its fallback: the operations the rules deny
     * (`loadOrders`/`saveOrder`/`findByContact`) are served locally instead of
     * throwing `permission-denied`.
     */
    function createFirebaseOrderBackend(scope) {
        const root = scope || DB_ROOT;
        const firebase = root.__FIREBASE__;
        const talaria = root.TALARIA || ns;
        const store = talaria.FirebaseOrderStore;
        if (!firebase || !firebase.firestore || !store ||
            typeof store.createFirebaseOrderStore !== 'function') {
            return null;
        }
        const adapter = store.createFirebaseOrderStore({
            db: firebase.db,
            firestore: firebase.firestore,
            fallback: createLocalOrderBackend(storageOf(scope)),
        });
        if (!adapter) {
            return null;
        }
        return Object.assign({ isRemote: true }, adapter);
    }

    /**
     * Chooses the order backend: Firestore when its bootstrap is installed,
     * localStorage otherwise. Pure w.r.t. its `scope` argument, so Cercle 1 tests
     * exercise both branches without a real SDK.
     */
    function selectOrderBackend(scope) {
        return createFirebaseOrderBackend(scope) || createLocalOrderBackend(storageOf(scope));
    }

    function orderBackend() {
        return selectOrderBackend(DB_ROOT);
    }

    function resolved(value) {
        return Promise.resolve(value);
    }

    ns.DB = {
        // --- Panier (toujours client-side, localStorage) ---
        loadCart() {
            return read(storageOf(DB_ROOT), CART_KEY, { items: [] });
        },
        saveCart(cart) {
            write(storageOf(DB_ROOT), CART_KEY, cart);
        },
        clearCart() {
            this.saveCart({ items: [] });
        },

        // --- Commandes (backend sélectionnable, contrat asynchrone) ---
        isRemote() {
            return orderBackend().isRemote === true;
        },
        loadOrders() {
            return resolved(orderBackend().loadOrders());
        },
        saveOrder(order) {
            return resolved(orderBackend().saveOrder(order));
        },
        findOrder(id) {
            return resolved(orderBackend().findOrder(id));
        },
        findByContact(contact) {
            return resolved(orderBackend().findByContact(contact));
        },
    };

    ns.DB.selectOrderBackend = selectOrderBackend;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            CART_KEY: CART_KEY,
            ORDERS_KEY: ORDERS_KEY,
            createLocalOrderBackend: createLocalOrderBackend,
            selectOrderBackend: selectOrderBackend,
        };
    }
})(DB_ROOT.TALARIA);
