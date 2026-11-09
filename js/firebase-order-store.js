/* ------------------------------------------------------------------ *
 * talaria.school — Firestore order store (EPIC T-PAYMENT, US-1 BS-2 + US-6b)
 *
 * Real adapter of the `TALARIA.DB` order surface (`loadOrders`/`saveOrder`/
 * `findOrder`/`findByContact`) on top of the Firestore `orders` collection.
 *
 * US-6b — the adapter obeys the **hardened** security rules (US-2b): `orders`
 * permits the single-document read by a known id only (`allow get: if true`),
 * and denies every collection listing (`allow list: if false`, D7) as well as
 * every client write (`allow write: if false`, D6 — the `checkout` callable is
 * the only writer). So this adapter reads one order by id and **delegates**
 * `loadOrders`/`saveOrder`/`findByContact` to an injected **local fallback** —
 * issuing those calls against `orders` would fail with `permission-denied`
 * instead of degrading gracefully. In production the denied paths never run:
 * writes go through the `checkout` callable (`firebase-payment-gateway.js`) and
 * contact tracking reads through the `suivi` callable (D7).
 *
 * Two invariants keep Cercle 1 hermetic (mirror of firebase-app.js):
 *   - the Firestore SDK is **injected** (`db`, `collection`, `doc`, `getDoc`) —
 *     tests pass an in-memory fake, the browser passes the gstatic modules;
 *   - a missing Firestore degrades to `null`, the caller keeps the localStorage
 *     store (`db.js`) exactly as before Firebase existed.
 *
 * The stored document matches the contract documented in
 * `.agents/CADRAGE_EPIC_T_PAYMENT.adoc` (D7): `id`, `createdAt`, `items[]`,
 * `total`, `contact{fullName,email,phone}`, `status`.
 *
 * No project identity is committed here: the config comes from firebase-app.js.
 * ------------------------------------------------------------------ */
var ORDER_STORE_ROOT =
    (typeof window !== 'undefined') ? window
        : (typeof globalThis !== 'undefined' ? globalThis : this);

ORDER_STORE_ROOT.TALARIA = ORDER_STORE_ROOT.TALARIA || {};

(function (ns) {
    const ORDERS_COLLECTION = 'orders';

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * The adapter only ever reads a single order by id: the hardened rules deny
     * collection listings and client writes, so the read API required here is
     * exactly the surface that stays allowed.
     */
    function isUsableFirestore(firestore) {
        return isObject(firestore)
            && typeof firestore.collection === 'function'
            && typeof firestore.doc === 'function'
            && typeof firestore.getDoc === 'function';
    }

    function normalizeContact(contact) {
        const source = isObject(contact) ? contact : {};
        return {
            fullName: String(source.fullName || '').trim(),
            email: String(source.email || '').trim(),
            phone: String(source.phone || '').trim(),
        };
    }

    /** Strips the adapter to the documented Firestore order contract. */
    function toDocument(order) {
        const source = isObject(order) ? order : {};
        return {
            id: String(source.id || ''),
            createdAt: source.createdAt || new Date().toISOString(),
            items: Array.isArray(source.items) ? source.items : [],
            total: Number(source.total) || 0,
            contact: normalizeContact(source.contact),
            status: String(source.status || 'PAYE'),
        };
    }

    /**
     * Builds the Firestore-backed order store. Returns `null` when the Firestore
     * handle is unusable — the site then behaves exactly as before Firebase.
     *
     * `options.fallback` is the local order backend (`db.js`
     * `createLocalOrderBackend`) that serves the operations the rules deny:
     * listing (`loadOrders`), client writes (`saveOrder`) and contact queries
     * (`findByContact`). Without it those operations would throw against
     * `orders`, so a missing fallback degrades them to empty/no-op results.
     */
    function createFirebaseOrderStore(options) {
        const opts = options || {};
        const firestore = opts.firestore;
        const db = opts.db;
        const fallback = isObject(opts.fallback) ? opts.fallback : null;
        if (!isObject(db) || !isUsableFirestore(firestore)) {
            return null;
        }

        const collectionRef = firestore.collection(db, ORDERS_COLLECTION);

        /** The single operation the hardened rules allow: read by known id. */
        async function findOrder(id) {
            if (!id) {
                return null;
            }
            const snapshot = await firestore.getDoc(firestore.doc(collectionRef, id));
            if (!snapshot || typeof snapshot.exists !== 'function' || !snapshot.exists()) {
                return null;
            }
            return snapshot.data();
        }

        /** A listing is denied on `orders` (D7) — the local fallback serves it. */
        function loadOrders() {
            return fallback && typeof fallback.loadOrders === 'function'
                ? fallback.loadOrders()
                : [];
        }

        /** A client write is denied on `orders` (D6) — the local fallback echoes it. */
        function saveOrder(order) {
            return fallback && typeof fallback.saveOrder === 'function'
                ? fallback.saveOrder(order)
                : order;
        }

        /** A contact query is a listing (D7) — the local fallback serves it. */
        function findByContact(contact) {
            return fallback && typeof fallback.findByContact === 'function'
                ? fallback.findByContact(contact)
                : [];
        }

        return {
            loadCart: () => ns.DB.loadCart(),
            saveCart: (cart) => ns.DB.saveCart(cart),
            clearCart: () => ns.DB.clearCart(),
            loadOrders: loadOrders,
            saveOrder: saveOrder,
            findOrder: findOrder,
            findByContact: findByContact,
        };
    }

    ns.FirebaseOrderStore = {
        ORDERS_COLLECTION: ORDERS_COLLECTION,
        toDocument: toDocument,
        createFirebaseOrderStore: createFirebaseOrderStore,
    };
})(ORDER_STORE_ROOT.TALARIA);

// Export for Node.js testing and browser consumers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ORDERS_COLLECTION: ORDER_STORE_ROOT.TALARIA.FirebaseOrderStore.ORDERS_COLLECTION,
        toDocument: ORDER_STORE_ROOT.TALARIA.FirebaseOrderStore.toDocument,
        createFirebaseOrderStore: ORDER_STORE_ROOT.TALARIA.FirebaseOrderStore.createFirebaseOrderStore,
    };
}
