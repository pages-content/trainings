/* ------------------------------------------------------------------ *
 * talaria.school — Firestore order store (EPIC T-PAYMENT, US-1 BS-2)
 *
 * Real adapter of the `TALARIA.DB` order surface (`loadOrders`/`saveOrder`/
 * `findOrder`/`findByContact`) on top of the Firestore `orders` collection.
 *
 * Two invariants keep Cercle 1 hermetic (mirror of firebase-app.js):
 *   - the Firestore SDK is **injected** (`db`, `collection`, `doc`, `setDoc`,
 *     `getDoc`, `query`, `where`, `getDocs`) — tests pass an in-memory fake, the
 *     browser passes the gstatic modules;
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

    function isUsableFirestore(firestore) {
        return isObject(firestore)
            && typeof firestore.collection === 'function'
            && typeof firestore.doc === 'function'
            && typeof firestore.setDoc === 'function'
            && typeof firestore.getDoc === 'function'
            && typeof firestore.query === 'function'
            && typeof firestore.where === 'function'
            && typeof firestore.getDocs === 'function';
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

    function byField(contacts, field, value) {
        return contacts.filter((order) => order[field] === value);
    }

    function mergeUnique(groups) {
        const seen = new Set();
        const merged = [];
        groups.forEach((group) => {
            group.forEach((order) => {
                if (!seen.has(order.id)) {
                    seen.add(order.id);
                    merged.push(order);
                }
            });
        });
        return merged;
    }

    /**
     * Builds the Firestore-backed order store. Returns `null` when the Firestore
     * handle is unusable — the site then behaves exactly as before Firebase.
     */
    function createFirebaseOrderStore(options) {
        const opts = options || {};
        const firestore = opts.firestore;
        const db = opts.db;
        if (!isObject(db) || !isUsableFirestore(firestore)) {
            return null;
        }

        const collectionRef = firestore.collection(db, ORDERS_COLLECTION);

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

        async function loadOrders() {
            const snapshot = await firestore.getDocs(collectionRef);
            const docs = (snapshot && snapshot.docs) || [];
            return docs.map((doc) => doc.data());
        }

        async function saveOrder(order) {
            const document = toDocument(order);
            await firestore.setDoc(firestore.doc(collectionRef, document.id), document);
            return document;
        }

        async function findByContact(contact) {
            const searched = normalizeContact(contact);
            if (!searched.email && !searched.phone) {
                return [];
            }
            const groups = [];
            if (searched.email) {
                const byMail = await firestore.getDocs(
                    firestore.query(collectionRef, firestore.where('contact.email', '==', searched.email)),
                );
                groups.push(((byMail && byMail.docs) || []).map((doc) => doc.data()));
            }
            if (searched.phone) {
                const byPhone = await firestore.getDocs(
                    firestore.query(collectionRef, firestore.where('contact.phone', '==', searched.phone)),
                );
                groups.push(((byPhone && byPhone.docs) || []).map((doc) => doc.data()));
            }
            return mergeUnique(groups);
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
