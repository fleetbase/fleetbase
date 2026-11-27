import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import window from 'ember-window-mock';
import { DEFAULT_LAYOUT, LAYOUTS, OVERRIDE_KEY, isLayout, layoutFromTransition } from '@fleetbase/console/services/console-layout';

class CurrentUserStub extends Service {
    options = {};
    getOption(key) {
        return this.options[key] ?? null;
    }
    setOption(key, value) {
        this.options[key] = value;
    }
}

function throwingStorage() {
    return {
        getItem() {
            throw new Error('blocked');
        },
        setItem() {
            throw new Error('blocked');
        },
        removeItem() {
            throw new Error('blocked');
        },
    };
}

module('Unit | Service | console-layout', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        window.sessionStorage.removeItem(OVERRIDE_KEY);
        this.owner.register('service:current-user', CurrentUserStub);
        this.currentUser = this.owner.lookup('service:current-user');
    });

    hooks.afterEach(function () {
        window.sessionStorage.removeItem(OVERRIDE_KEY);
    });

    test('canvas is the default and the two layouts are canvas and classic', function (assert) {
        const service = this.owner.lookup('service:console-layout');

        assert.deepEqual(LAYOUTS, ['canvas', 'classic']);
        assert.strictEqual(DEFAULT_LAYOUT, 'canvas');
        assert.strictEqual(service.current, 'canvas');
        assert.true(service.isCanvas);
        assert.false(service.isClassic);
        assert.strictEqual(service.alternate, 'classic');
    });

    test('the saved user option wins over the default; unknown values are ignored', function (assert) {
        const service = this.owner.lookup('service:console-layout');

        this.currentUser.options.layout = 'classic';
        assert.strictEqual(service.current, 'classic');
        assert.true(service.isClassic);
        assert.strictEqual(service.alternate, 'canvas');

        this.currentUser.options.layout = 'sideways';
        assert.strictEqual(service.saved, null);
        assert.strictEqual(service.current, 'canvas');
    });

    test('a ?layout= override wins for the session and is restored by a new instance', function (assert) {
        this.currentUser.options.layout = 'canvas';
        const service = this.owner.lookup('service:console-layout');

        assert.false(service.applyOverride('sideways'), 'unknown values are ignored');
        assert.false(service.applyOverride(null));
        assert.strictEqual(service.current, 'canvas');

        assert.true(service.applyOverride('classic'));
        assert.strictEqual(service.current, 'classic');
        assert.strictEqual(window.sessionStorage.getItem(OVERRIDE_KEY), 'classic');

        this.owner.unregister('service:console-layout');
        this.owner.register('service:console-layout', service.constructor);
        assert.strictEqual(this.owner.lookup('service:console-layout').current, 'classic', 'read back from sessionStorage');
    });

    test('switching saves the option and drops the override', function (assert) {
        const service = this.owner.lookup('service:console-layout');
        service.applyOverride('classic');

        assert.false(service.switchTo('sideways'));
        assert.strictEqual(service.current, 'classic');

        assert.true(service.switchTo('canvas'));
        assert.strictEqual(this.currentUser.options.layout, 'canvas');
        assert.strictEqual(service.override, null);
        assert.strictEqual(window.sessionStorage.getItem(OVERRIDE_KEY), null);
        assert.strictEqual(service.current, 'canvas');

        service.switchTo('classic');
        assert.strictEqual(service.current, 'classic', 'the choice applies before the option is read again');
    });

    test('unavailable storage leaves the override in memory only', function (assert) {
        window.sessionStorage = throwingStorage();
        const service = this.owner.lookup('service:console-layout');

        assert.strictEqual(service.override, null, 'reading fails quietly');
        assert.true(service.applyOverride('classic'), 'writing fails quietly');
        assert.strictEqual(service.current, 'classic');
        assert.true(service.switchTo('canvas'), 'clearing fails quietly');
        assert.strictEqual(service.current, 'canvas');
    });

    test('isLayout and layoutFromTransition', function (assert) {
        assert.true(isLayout('canvas'));
        assert.false(isLayout('Canvas'));

        assert.strictEqual(layoutFromTransition({ to: { queryParams: { layout: 'classic' } } }), 'classic');
        assert.strictEqual(layoutFromTransition({ to: { queryParams: {} }, intent: { url: '/fleet-ops?layout=classic&x=1' } }), 'classic');
        assert.strictEqual(layoutFromTransition({ intent: { url: '/fleet-ops?x=1' } }), null);
        assert.strictEqual(layoutFromTransition({ intent: { url: '/fleet-ops' } }), null);
        assert.strictEqual(layoutFromTransition({ intent: {} }), null);
        assert.strictEqual(layoutFromTransition(undefined), null);
    });
});
