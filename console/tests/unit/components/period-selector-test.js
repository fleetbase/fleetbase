import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Component | period-selector', function (hooks) {
    setupTest(hooks);

    let originalLocalStorage;

    hooks.beforeEach(function () {
        originalLocalStorage = window.localStorage;
        const store = {};

        window.localStorage = {
            getItem(key) {
                return store[key] ?? null;
            },
            setItem(key, value) {
                store[key] = value;
            },
            removeItem(key) {
                delete store[key];
            },
        };
    });

    hooks.afterEach(function () {
        window.localStorage = originalLocalStorage;
    });

    function instantiate(callback, args = {}) {
        return this.owner.factoryFor('component:period-selector').create({
            args: {
                onChange(payload) {
                    callback(payload);
                },
                ...args,
            },
        });
    }

    test('selecting a predefined period emits change', function (assert) {
        assert.expect(1);

        const component = instantiate.call(this, (payload) => {
            assert.strictEqual(payload.value, 'today', 'Value emitted');
        });

        component.selectPeriod('today');
    });

    test('applying custom range calls onChange with ISO dates', function (assert) {
        assert.expect(3);

        let emitted = null;
        const component = instantiate.call(this, (payload) => {
            emitted = payload;
        });

        component.selectPeriod('custom');
        component.updateCustomRange('customStart', { target: { value: '2025-11-01' } });
        component.updateCustomRange('customEnd', { target: { value: '2025-11-03' } });
        component.applyCustomRange();

        assert.strictEqual(emitted?.value, 'custom', 'Custom value flagged');
        assert.ok(emitted.start.includes('2025-11-01'), 'Start date preserved');
        assert.ok(emitted.end.includes('2025-11-03'), 'End date preserved');
    });

    test('selection persists to localStorage', function (assert) {
        assert.expect(1);

        const component = instantiate.call(this, () => {});
        component.selectPeriod('last_30_days');

        const stored = JSON.parse(window.localStorage.getItem('bitacora-period-selector'));
        assert.strictEqual(stored.value, 'last_30_days', 'Persisted selection');
    });
});

