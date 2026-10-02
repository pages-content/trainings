/* ------------------------------------------------------------------ *
 * talaria.school — Firebase checkout gateway (EPIC T-PAYMENT, US-1 BS-3)
 *
 * Client adapter of the `talaria.orders.PaymentGateway` port on top of the
 * Firebase **callable** `checkout`. The Kotlin port (`processPayment(amount)`)
 * is the mock-side contract; on the web the amount is decided by the server
 * (D6 — the client never computes the sum that gets charged). So this adapter
 * sends **what** is bought (`items`) and **who** buys it (`contact`), and the
 * callable answers with the authoritative order (`id`, `total`, `status`).
 *
 * Two invariants keep Cercle 1 hermetic (mirror of firebase-app.js and
 * firebase-order-store.js):
 *   - the callable is **injected** (`callable(payload)`) — tests pass an
 *     in-memory double, the browser passes `httpsCallable(functions, 'checkout')`;
 *   - a failing callable degrades to a `FAILED` order instead of throwing — the
 *     checkout page shows the failure, the cart is preserved.
 *
 * No project identity is committed here: the Functions client comes from
 * firebase-app.js.
 * ------------------------------------------------------------------ */
var PAYMENT_ROOT =
    (typeof window !== 'undefined') ? window
        : (typeof globalThis !== 'undefined' ? globalThis : this);

PAYMENT_ROOT.TALARIA = PAYMENT_ROOT.TALARIA || {};

(function (ns) {
    const CHECKOUT_CALLABLE = 'checkout';

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function normalizeContact(contact) {
        const source = isObject(contact) ? contact : {};
        return {
            fullName: String(source.fullName || '').trim(),
            email: String(source.email || '').trim(),
            phone: String(source.phone || '').trim(),
        };
    }

    function normalizeItem(item) {
        const source = isObject(item) ? item : {};
        return {
            trainingId: String(source.trainingId || '').trim(),
            type: String(source.type || '').trim(),
            moduleIds: Array.isArray(source.moduleIds) ? source.moduleIds.slice() : [],
            quantity: Number(source.quantity) || 1,
        };
    }

    /** Strips the client order to what the server is allowed to receive (D6). */
    function toCallablePayload(order) {
        const source = isObject(order) ? order : {};
        return {
            items: Array.isArray(source.items) ? source.items.map(normalizeItem) : [],
            contact: normalizeContact(source.contact),
        };
    }

    /** The order shape the caller keeps when the server is unreachable. */
    function toOrder(order, status) {
        const source = isObject(order) ? order : {};
        return {
            id: String(source.id || ''),
            createdAt: source.createdAt || new Date().toISOString(),
            items: Array.isArray(source.items) ? source.items : [],
            total: Number(source.total) || 0,
            contact: normalizeContact(source.contact),
            status: status,
        };
    }

    /**
     * Builds the callable-backed gateway. Returns `null` when the callable is
     * unusable — the caller then keeps the mock/local checkout exactly as before.
     */
    function createFirebasePaymentGateway(options) {
        const opts = options || {};
        const callable = opts.callable;
        if (typeof callable !== 'function') {
            return null;
        }

        /**
         * Sends the order to the `checkout` callable and returns the
         * server-authoritative order (id/total/status). A rejected call
         * degrades to a `FAILED` order carrying the client id — never throws.
         */
        async function checkout(order) {
            const local = toOrder(order, 'FAILED');
            try {
                const response = await callable(toCallablePayload(order));
                const data = isObject(response) && isObject(response.data) ? response.data : response;
                if (!isObject(data)) {
                    return local;
                }
                return Object.assign(local, data);
            } catch (error) {
                if (typeof console !== 'undefined') {
                    console.error('Firebase checkout failed:', error);
                }
                return local;
            }
        }

        return {
            checkout: checkout,
        };
    }

    ns.FirebasePaymentGateway = {
        CHECKOUT_CALLABLE: CHECKOUT_CALLABLE,
        toCallablePayload: toCallablePayload,
        createFirebasePaymentGateway: createFirebasePaymentGateway,
    };
})(PAYMENT_ROOT.TALARIA);

// Export for Node.js testing and browser consumers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CHECKOUT_CALLABLE: PAYMENT_ROOT.TALARIA.FirebasePaymentGateway.CHECKOUT_CALLABLE,
        toCallablePayload: PAYMENT_ROOT.TALARIA.FirebasePaymentGateway.toCallablePayload,
        createFirebasePaymentGateway: PAYMENT_ROOT.TALARIA.FirebasePaymentGateway.createFirebasePaymentGateway,
    };
}
