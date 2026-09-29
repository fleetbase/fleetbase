import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';
import AdminRateLimitsComponent from '@fleetbase/console/components/admin/rate-limits';

const DEFAULTS = { enabled: true, max_attempts: 120, decay_minutes: 1, track_consumers: true, overrides: [] };

function settingsResponse(settings = {}) {
    return {
        settings: { ...DEFAULTS, ...settings },
        defaults: { ...DEFAULTS },
        unlimited_keys: 2,
    };
}

/**
 * Lets the task's fetch (a native promise, which settled() does not track) resolve.
 */
function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

module('Integration | Component | admin/rate-limits', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const context = this;
        this.requests = [];
        this.getResponse = settingsResponse({
            overrides: [{ company_uuid: 'company-1', company_id: 'company_abc', company_name: 'Acme Pharma', unlimited: false, max_attempts: 600, note: 'bulk import' }],
        });
        this.writeResponse = settingsResponse({ max_attempts: 300 });
        this.fail = {};

        class FetchStub extends Service {
            request(method, path, payload) {
                context.requests.push({ method, path, payload });
                if (context.fail[method]) {
                    return Promise.reject(new Error(`${method} failed`));
                }

                return Promise.resolve(method === 'get' ? context.getResponse : context.writeResponse);
            }
            get(path) {
                return this.request('get', path);
            }
            post(path, payload) {
                return this.request('post', path, payload);
            }
            delete(path) {
                return this.request('delete', path);
            }
        }
        class NotificationsStub extends Service {
            successes = [];
            errors = [];
            success(message) {
                this.successes.push(message);
            }
            serverError(error) {
                this.errors.push(error.message);
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.notifications = () => this.owner.lookup('service:notifications');

        const captured = captureComponent(this.owner, 'admin/rate-limits', AdminRateLimitsComponent);
        this.build = async () => {
            await render(hbs`
                <div id="next-view-section-subheader-actions"></div>
                <Admin::RateLimits />
            `);
            await flush();
            return captured.instance;
        };
    });

    test('it loads the effective settings and lists organization overrides', async function (assert) {
        const component = await this.build();

        assert.deepEqual(this.requests[0], { method: 'get', path: 'rate-limits/settings', payload: undefined });
        assert.strictEqual(component.maxAttempts, 120);
        assert.strictEqual(component.unlimitedKeys, 2);
        assert.dom('[data-test-override="company-1"]').containsText('Acme Pharma');
        assert.dom('[data-test-override="company-1"]').containsText('company_abc');
        assert.dom('[data-test-unlimited-keys]').containsText('2');
        assert.dom('[data-test-disabled-warning]').doesNotExist();
        assert.dom('#next-view-section-subheader-actions [data-test-save]').exists('save is wormholed to the subheader');
        assert.dom('[data-test-reset]').exists('an override differs from the defaults, so reset is offered');
        // ModelSelect reads @disabled once; the picker must not stay disabled after the load.
        assert.dom('.ember-power-select-trigger').doesNotHaveAttribute('aria-disabled', 'the organization picker is usable');
    });

    test('it saves the settings and overrides as numbers', async function (assert) {
        const component = await this.build();
        component.toggleEnabled(false);
        component.toggleTrackConsumers(false);
        component.maxAttempts = '250';
        component.decayMinutes = '2';
        await settled();

        assert.dom('[data-test-disabled-warning]').exists('disabling warns the admin');

        await click('[data-test-save]');
        await flush();

        const { method, path, payload } = this.requests.at(-1);
        assert.strictEqual(method, 'post');
        assert.strictEqual(path, 'rate-limits/settings');
        assert.deepEqual(payload, {
            enabled: false,
            max_attempts: 250,
            decay_minutes: 2,
            track_consumers: false,
            overrides: [{ company_uuid: 'company-1', unlimited: false, max_attempts: 600, note: 'bulk import' }],
        });
        assert.strictEqual(component.maxAttempts, 300, 'the saved response is applied');
        assert.deepEqual(this.notifications().successes, ['Rate limit settings saved.']);
    });

    test('it resets to the environment defaults', async function (assert) {
        this.writeResponse = settingsResponse();
        const component = await this.build();

        await click('[data-test-reset]');
        await flush();

        assert.strictEqual(this.requests.at(-1).method, 'delete');
        assert.strictEqual(this.requests.at(-1).path, 'rate-limits/settings');
        assert.deepEqual(component.overrides, []);
        assert.deepEqual(this.notifications().successes, ['Rate limits reset to the environment defaults.']);
        assert.dom('[data-test-reset]').doesNotExist('nothing left to reset');
    });

    test('it reports failed loads, saves and resets', async function (assert) {
        this.fail = { get: true, post: true, delete: true };
        const component = await this.build();

        await component.save.perform();
        await component.reset.perform();

        assert.deepEqual(this.notifications().errors, ['get failed', 'post failed', 'delete failed']);
    });

    test('it adds, edits and removes organization overrides', async function (assert) {
        const component = await this.build();

        component.addOverride({ uuid: 'company-2', public_id: 'company_def', name: 'Beta Logistics' });
        component.addOverride({ id: 'company-3', public_id: 'company_ghi', name: 'Gamma Freight' });
        component.addOverride({ uuid: 'company-2', name: 'Duplicate' });
        component.addOverride(null);
        component.addOverride({ name: 'No identifier' });

        assert.deepEqual(
            component.overrides.map((override) => override.company_uuid),
            ['company-1', 'company-2', 'company-3'],
            'uuid or id identifies the organization; duplicates and blanks are ignored'
        );
        assert.strictEqual(component.overrides[1].max_attempts, 240, 'a new override starts at double the default');
        assert.strictEqual(component.companyToAdd, null);

        const [first, second, third] = component.overrides;
        component.updateOverride(second, 'unlimited', true);
        component.updateOverrideInput(third, 'max_attempts', { target: { value: '' } });
        component.updateOverrideInput(component.overrides[0], 'note', { target: { value: 'renewed' } });
        component.overrides = [...component.overrides, { company_uuid: 'company-4', unlimited: false, max_attempts: null }];

        assert.deepEqual(component.payload().overrides, [
            { company_uuid: 'company-1', unlimited: false, max_attempts: 600, note: 'renewed' },
            { company_uuid: 'company-2', unlimited: true, max_attempts: null, note: '' },
            { company_uuid: 'company-3', unlimited: false, max_attempts: null, note: '' },
            { company_uuid: 'company-4', unlimited: false, max_attempts: null, note: '' },
        ]);
        assert.notStrictEqual(component.overrides[0], first, 'edits replace the row so the table re-renders');

        component.removeOverride(component.overrides[3]);
        await settled();

        assert.strictEqual(component.overrides.length, 3);
        await click('[data-test-override="company-1"] [data-test-remove-override]');
        assert.deepEqual(
            component.overrides.map((override) => override.company_uuid),
            ['company-2', 'company-3']
        );
    });

    test('it only offers a reset when something differs from the environment', async function (assert) {
        this.getResponse = settingsResponse();
        const component = await this.build();

        assert.false(component.differsFromDefaults, 'identical to the defaults');

        component.enabled = false;
        assert.true(component.differsFromDefaults, 'enabled differs');
        component.enabled = true;
        component.maxAttempts = '121';
        assert.true(component.differsFromDefaults, 'limit differs');
        component.maxAttempts = '120';
        component.decayMinutes = 5;
        assert.true(component.differsFromDefaults, 'window differs');
        component.decayMinutes = 1;
        component.trackConsumers = false;
        assert.true(component.differsFromDefaults, 'tracking differs');
        component.trackConsumers = true;

        component.defaults = null;
        assert.true(component.differsFromDefaults, 'with no defaults known every value differs');
    });

    test('it falls back to safe values for a sparse response', async function (assert) {
        const component = await this.build();

        component.apply();
        assert.true(component.enabled);
        assert.strictEqual(component.maxAttempts, 120);
        assert.strictEqual(component.decayMinutes, 1);
        assert.true(component.trackConsumers);
        assert.deepEqual(component.overrides, []);
        assert.deepEqual(component.defaults, {});
        assert.strictEqual(component.unlimitedKeys, 0);
        assert.false(component.isBusy);
    });
});
