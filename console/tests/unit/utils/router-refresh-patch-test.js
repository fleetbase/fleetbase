// This util patches Ember's private router microlib, so the tests necessarily reach for
// the same private API the patch itself targets.
/* eslint-disable ember/no-private-routing-service */
import applyRouterFix, { patchRouterRefresh, suppressRouterRefreshErrors } from '@fleetbase/console/utils/router-refresh-patch';
import { module, test } from 'qunit';

const STATE_SYMBOL = 'state-symbol';

// Stands in for Ember's RouterMicrolib. `this.constructor` inside the patched refresh must
// carry STATE_SYMBOL and NamedTransitionIntent, so the fake has to be a real class.
class FakeMicrolib {
    static STATE_SYMBOL = STATE_SYMBOL;
    static NamedTransitionIntent = class {
        constructor(router, name, pivotRoute, contexts, queryParams) {
            Object.assign(this, { router, name, pivotRoute, contexts, queryParams });
        }
    };

    constructor({ routeInfos, queryParams = {}, handlers = [], activeTransition = null, changedQueryParams = null } = {}) {
        this.state = { routeInfos, queryParams };
        this.activeTransition = activeTransition;
        this._changedQueryParams = changedQueryParams;
        this.recognizer = { handlersFor: () => handlers };
        this.intents = [];
        this.methodCalls = [];
    }

    refresh() {
        return 'original';
    }

    transitionByIntent(intent, isIntermediate) {
        this.intents.push({ intent, isIntermediate });
        return { method: (m) => this.methodCalls.push(m) };
    }
}

function patch(microlib) {
    patchRouterRefresh({ lookup: () => ({ _routerMicrolib: microlib }) });
    return microlib;
}

module('Unit | Utility | router-refresh-patch', function () {
    test('patchRouterRefresh ignores an application it cannot use', function (assert) {
        assert.strictEqual(patchRouterRefresh(null), undefined, 'no application');
        assert.strictEqual(patchRouterRefresh({}), undefined, 'an application with no lookup()');
        assert.strictEqual(patchRouterRefresh({ lookup: () => null }), undefined, 'no router');
        assert.strictEqual(patchRouterRefresh({ lookup: () => ({}) }), undefined, 'a router with no microlib');
    });

    test('patchRouterRefresh wraps refresh once and marks it patched', function (assert) {
        const microlib = new FakeMicrolib({ routeInfos: [{ route: 'r', name: 'n' }] });
        const original = microlib.refresh;

        patch(microlib);
        assert.true(microlib._fleetbaseRefreshPatched, 'the microlib is marked');
        assert.notStrictEqual(microlib.refresh, original, 'refresh is wrapped');

        const wrapped = microlib.refresh;
        patch(microlib);
        assert.strictEqual(microlib.refresh, wrapped, 'a second application is a no-op');
    });

    test('the patched refresh defaults the pivot route to the first route info', function (assert) {
        const microlib = patch(
            new FakeMicrolib({
                routeInfos: [{ route: 'first-route', name: 'first' }, { name: 'last' }],
                queryParams: { page: 2 },
            })
        );

        microlib.refresh();

        const { intent, isIntermediate } = microlib.intents.at(-1);
        assert.strictEqual(intent.pivotRoute, 'first-route', 'the pivot defaults to the first route');
        assert.strictEqual(intent.name, 'last', 'the intent targets the leaf route');
        assert.deepEqual(intent.queryParams, { page: 2 }, 'the state query params are carried over');
        assert.false(isIntermediate);
    });

    test('an explicit pivot route is respected', function (assert) {
        const microlib = patch(new FakeMicrolib({ routeInfos: [{ route: 'first', name: 'first' }, { name: 'last' }] }));

        microlib.refresh('explicit-pivot');

        assert.strictEqual(microlib.intents.at(-1).intent.pivotRoute, 'explicit-pivot');
    });

    test('dynamic segments are preserved as intent contexts', function (assert) {
        // This is the whole point of the patch: the stock refresh passes [] and loses the
        // dynamic segments, producing the "not enough parameters" error.
        const microlib = patch(
            new FakeMicrolib({
                routeInfos: [
                    { route: 'first', name: 'first' },
                    { name: 'orders.order', params: { order_id: 'ord_1', missing: undefined } },
                ],
                handlers: [{ names: [] }, { names: ['order_id', 'missing'] }],
            })
        );

        microlib.refresh();

        assert.deepEqual(microlib.intents.at(-1).intent.contexts, ['ord_1'], 'defined params become contexts, undefined ones are skipped');
    });

    test('a leaf route without params contributes no contexts', function (assert) {
        const microlib = patch(new FakeMicrolib({ routeInfos: [{ route: 'first', name: 'first' }, { name: 'index' }], handlers: [{ names: ['id'] }] }));

        microlib.refresh();

        assert.deepEqual(microlib.intents.at(-1).intent.contexts, []);
    });

    test('a handler with no names contributes no contexts', function (assert) {
        const microlib = patch(
            new FakeMicrolib({
                routeInfos: [
                    { route: 'first', name: 'first' },
                    { name: 'index', params: { id: '1' } },
                ],
                handlers: [{ names: [] }],
            })
        );

        microlib.refresh();

        assert.deepEqual(microlib.intents.at(-1).intent.contexts, []);
    });

    test('an in-flight transition supplies the state and its replace method is preserved', function (assert) {
        const activeTransition = {
            urlMethod: 'replace',
            [STATE_SYMBOL]: { routeInfos: [{ route: 'from-transition', name: 'first' }, { name: 'last' }], queryParams: { q: 1 } },
        };
        const microlib = patch(new FakeMicrolib({ routeInfos: [{ route: 'unused', name: 'unused' }], activeTransition }));

        microlib.refresh();

        assert.strictEqual(microlib.intents.at(-1).intent.pivotRoute, 'from-transition', 'the active transition state wins');
        assert.deepEqual(microlib.methodCalls, ['replace'], 'the replace url method carries over');
    });

    test('a non-replace transition does not set a url method', function (assert) {
        const activeTransition = {
            urlMethod: 'update',
            [STATE_SYMBOL]: { routeInfos: [{ route: 'r', name: 'first' }, { name: 'last' }], queryParams: {} },
        };
        const microlib = patch(new FakeMicrolib({ routeInfos: [{ route: 'r', name: 'r' }], activeTransition }));

        microlib.refresh();

        assert.deepEqual(microlib.methodCalls, [], 'no method override');
    });

    test('changed query params take precedence over the state query params', function (assert) {
        const microlib = patch(
            new FakeMicrolib({
                routeInfos: [{ route: 'first', name: 'first' }, { name: 'last' }],
                queryParams: { page: 1 },
                changedQueryParams: { page: 9 },
            })
        );

        microlib.refresh();

        assert.deepEqual(microlib.intents.at(-1).intent.queryParams, { page: 9 });
    });

    test('a throwing lookup is swallowed so boot continues', function (assert) {
        assert.strictEqual(
            patchRouterRefresh({
                lookup() {
                    throw new Error('router unavailable');
                },
            }),
            undefined,
            'the error is caught'
        );
    });

    test('suppressRouterRefreshErrors ignores a missing application', function (assert) {
        assert.strictEqual(suppressRouterRefreshErrors(null), undefined);
    });

    test('suppressRouterRefreshErrors swallows the known refresh error via Ember.onerror', function (assert) {
        const originalEmber = window.Ember;
        const seen = [];
        window.Ember = { onerror: (error) => seen.push(error) };

        try {
            suppressRouterRefreshErrors({});

            const known = new Error("You didn't provide enough string/numeric parameters to satisfy all of the dynamic segments");
            assert.strictEqual(window.Ember.onerror(known), undefined, 'the known error is suppressed');
            assert.deepEqual(seen, [], 'it never reaches the original handler');

            const other = new Error('something else');
            window.Ember.onerror(other);
            assert.deepEqual(seen, [other], 'unrelated errors pass through to the original handler');
        } finally {
            window.Ember = originalEmber;
        }
    });

    test('without an original handler an unrelated error is rethrown', function (assert) {
        const originalEmber = window.Ember;
        window.Ember = { onerror: null };

        try {
            suppressRouterRefreshErrors({});
            assert.throws(() => window.Ember.onerror(new Error('boom')), /boom/, 'unrelated errors still surface');
        } finally {
            window.Ember = originalEmber;
        }
    });

    test('applyRouterFix applies the patch and can skip error suppression', function (assert) {
        const microlib = new FakeMicrolib({ routeInfos: [{ route: 'r', name: 'r' }] });

        applyRouterFix({ lookup: () => ({ _routerMicrolib: microlib }) }, { suppressErrors: false });

        assert.true(microlib._fleetbaseRefreshPatched);
    });
});

module('Unit | Utility | router-refresh-patch | unhandled rejections', function (hooks) {
    hooks.beforeEach(function () {
        // The listener is installed on window and there is no way to remove it afterwards,
        // so capture it instead of letting it attach to the real window.
        this.original = window.addEventListener;
        this.listeners = {};
        window.addEventListener = (type, listener) => (this.listeners[type] = listener);
    });

    hooks.afterEach(function () {
        window.addEventListener = this.original;
    });

    test('the known refresh rejection is suppressed before it reaches the console', function (assert) {
        suppressRouterRefreshErrors({});

        let prevented = false;
        this.listeners.unhandledrejection({
            reason: new Error("You didn't provide enough string/numeric parameters to satisfy all of the dynamic segments"),
            preventDefault: () => (prevented = true),
        });

        assert.true(prevented, 'the rejection is swallowed');
    });

    test('any other rejection is left alone', function (assert) {
        suppressRouterRefreshErrors({});
        const seen = [];
        const dispatch = (reason) => this.listeners.unhandledrejection({ reason, preventDefault: () => seen.push(reason) });

        dispatch(new Error('a completely unrelated failure'));
        dispatch({ message: 42 });
        dispatch(undefined);

        assert.deepEqual(seen, [], 'nothing without the known message is touched, and a non-string or missing message does not throw');
    });

    test('a window that rejects listener registration does not break boot', function (assert) {
        window.addEventListener = () => {
            throw new Error('listeners are unavailable');
        };

        assert.strictEqual(suppressRouterRefreshErrors({}), undefined, 'the failure is swallowed');
    });
});
