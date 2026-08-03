import applyRouterFix, { patchRouterRefresh, suppressRouterRefreshErrors } from '@fleetbase/console/utils/router-refresh-patch';
import { module, test } from 'qunit';

module('Unit | Utility | router-refresh-patch', function () {
    test('patchRouterRefresh ignores invalid application instances', function (assert) {
        assert.strictEqual(patchRouterRefresh(null), undefined);
        assert.strictEqual(patchRouterRefresh({}), undefined, 'no lookup() => no-op');
        assert.ok(true, 'did not throw');
    });

    test('patchRouterRefresh does nothing when the router has no microlib', function (assert) {
        const app = { lookup: () => ({}) };
        patchRouterRefresh(app);
        assert.ok(true, 'did not throw');
    });

    test('patchRouterRefresh wraps refresh once and marks it patched', function (assert) {
        const originalRefresh = function () {
            return 'orig';
        };
        const microlib = { refresh: originalRefresh };
        const app = { lookup: (name) => (name === 'router:main' ? { _routerMicrolib: microlib } : null) };

        patchRouterRefresh(app);
        assert.true(microlib._fleetbaseRefreshPatched, 'marked as patched');
        assert.notStrictEqual(microlib.refresh, originalRefresh, 'refresh was wrapped');

        const wrapped = microlib.refresh;
        patchRouterRefresh(app);
        assert.strictEqual(microlib.refresh, wrapped, 'second call is a no-op');
    });

    test('suppressRouterRefreshErrors ignores a missing application', function (assert) {
        assert.strictEqual(suppressRouterRefreshErrors(null), undefined);
        assert.ok(true, 'did not throw');
    });

    test('applyRouterFix applies the patch (without installing global error suppression)', function (assert) {
        const microlib = { refresh() {} };
        const app = { lookup: () => ({ _routerMicrolib: microlib }) };

        applyRouterFix(app, { suppressErrors: false });

        assert.true(microlib._fleetbaseRefreshPatched);
    });
});
