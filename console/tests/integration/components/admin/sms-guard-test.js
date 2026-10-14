import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';
import AdminSmsGuardComponent, { SmsGuardOverride, toList, toLimit } from '@fleetbase/console/components/admin/sms-guard';

const DEFAULT_SETTINGS = {
    enabled: true,
    mode: 'enforce',
    alert_emails: [],
    validation: { enabled: true, blocked_countries: [], blocked_prefixes: ['+881', '+882'] },
    limits: {
        destination: { cooldown_seconds: 60, per_hour: 3, per_day: 5 },
        company: { per_minute: 10, per_hour: 60, per_day: 200 },
        probation: { days: 7, per_day: 20 },
        platform: { public: { per_minute: 100, per_hour: 1500, per_day: 10000 } },
    },
    breaker: { pause_minutes: 60, distinct_destinations_per_10m: 25, new_country_min_sends: 10, conversion_min_issued: 20, conversion_min_percent: 10 },
    overrides: [],
};

function settingsResponse(settings = {}, extra = {}) {
    return {
        settings: { ...DEFAULT_SETTINGS, ...settings },
        defaults: { ...DEFAULT_SETTINGS },
        pauses: [],
        ledger_available: true,
        ...extra,
    };
}

/**
 * Lets the task's fetch (a native promise, which settled() does not track) resolve.
 */
function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

module('Integration | Component | admin/sms-guard', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const context = this;
        this.requests = [];
        this.getResponse = settingsResponse(
            {
                mode: 'monitor',
                alert_emails: ['ops@example.test'],
                overrides: [
                    {
                        company_uuid: 'company-1',
                        company_id: 'company_abc',
                        company_name: 'Acme Pharma',
                        unlimited: false,
                        per_day: 600,
                        allowed_countries: ['GB', 'FR'],
                        note: 'bulk',
                    },
                ],
            },
            {
                pauses: [
                    {
                        scope: 'company:company-2',
                        reason: 'incident 7',
                        until: 1,
                        until_iso: '2026-10-13T12:00:00+00:00',
                        auto: true,
                        platform: false,
                        company_uuid: 'company-2',
                        company_name: 'Beta',
                    },
                    { scope: 'platform', reason: 'freeze', until: null, until_iso: null, auto: false, platform: true, company_uuid: null, company_name: null },
                    {
                        scope: 'tenant:store:store-7',
                        reason: 'distinct_destinations',
                        until: 1,
                        until_iso: '2026-10-13T12:30:00+00:00',
                        auto: true,
                        platform: false,
                        company_uuid: null,
                        company_name: null,
                    },
                ],
            }
        );
        this.usageResponse = {
            hours: 24,
            ledger_available: true,
            usage: [
                {
                    company_uuid: 'company-1',
                    company_id: 'company_abc',
                    company_name: 'Acme Pharma',
                    sent: 12,
                    failed: 1,
                    blocked: 3,
                    destinations: 9,
                    last_send_at: '2026-10-13 11:00:00',
                    daily_budget: 600,
                    paused: false,
                },
                {
                    company_uuid: 'company-9',
                    company_id: null,
                    company_name: null,
                    sent: 2,
                    failed: 0,
                    blocked: 0,
                    destinations: 2,
                    last_send_at: null,
                    daily_budget: null,
                    paused: true,
                },
            ],
        };
        this.writeResponse = settingsResponse({ limits: { ...DEFAULT_SETTINGS.limits, company: { per_minute: 10, per_hour: 60, per_day: 300 } } });
        this.pauseResponse = {
            pauses: [{ scope: 'company:company-3', reason: 'manual', until: null, until_iso: null, auto: false, platform: false, company_uuid: 'company-3', company_name: 'Gamma' }],
        };
        this.fail = {};

        class FetchStub extends Service {
            request(method, path, payload) {
                context.requests.push({ method, path, payload });
                if (context.fail[method]) {
                    return Promise.reject(new Error(`${method} failed`));
                }
                if (path === 'sms-guard/usage') {
                    return Promise.resolve(context.usageResponse);
                }
                if (path === 'sms-guard/pauses') {
                    return Promise.resolve(context.pauseResponse);
                }
                if (path.startsWith('sms-guard/pauses/')) {
                    return Promise.resolve({ pauses: [] });
                }

                return Promise.resolve(method === 'get' ? context.getResponse : context.writeResponse);
            }
            get(path, query) {
                return this.request('get', path, query);
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

        const captured = captureComponent(this.owner, 'admin/sms-guard', AdminSmsGuardComponent);
        this.build = async () => {
            await render(hbs`
                <div id="next-view-section-subheader-actions"></div>
                <Admin::SmsGuard />
            `);
            await flush();
            await flush();
            const component = captured.instance;
            this.transitions = [];
            Object.defineProperty(component, 'router', {
                configurable: true,
                value: { transitionTo: (...args) => this.transitions.push(args) },
            });
            return component;
        };
    });

    test('it loads the policy, pauses and usage', async function (assert) {
        const component = await this.build();

        assert.deepEqual(this.requests[0], { method: 'get', path: 'sms-guard/settings', payload: undefined });
        assert.deepEqual(this.requests[1], { method: 'get', path: 'sms-guard/usage', payload: { hours: 24 } });
        assert.strictEqual(component.mode, 'monitor');
        assert.true(component.isMonitoring);
        assert.strictEqual(component.companyPerDay, 200);
        assert.strictEqual(component.alertEmails, 'ops@example.test');
        assert.strictEqual(component.blockedPrefixes, '+881, +882');
        assert.strictEqual(component.overrides[0].allowed_countries, 'GB, FR');
        assert.dom('[data-test-monitor-warning]').exists();
        assert.dom('[data-test-disabled-warning]').doesNotExist();
        assert.dom('[data-test-overrides-table]').containsText('Acme Pharma');
        assert.dom('[data-test-override-input="per_day"]').hasValue('600');
        assert.dom('[data-test-pauses-table]').containsText('Beta');
        assert.dom('[data-test-pauses-table]').containsText('Whole platform');
        assert.dom('[data-test-pauses-table]').containsText('until lifted by an administrator');
        assert.strictEqual(component.pauses[2].label, 'tenant:store:store-7', 'a store pause shows its scope');
        assert.dom('[data-test-usage-table]').containsText('Acme Pharma');
        assert.dom('[data-test-usage-table]').containsText('unlimited');
        assert.strictEqual(component.usage[1].organization.name, 'company-9', 'an unnamed organization shows its id');
        assert.strictEqual(component.usage[1].pausedLabel, 'yes');
        assert.dom('#next-view-section-subheader-actions [data-test-save]').exists('save is wormholed to the subheader');
        assert.dom('[data-test-reset]').exists('mode and an exception differ from the defaults');
    });

    test('it saves the policy as numbers and lists, keeping blanks as no limit', async function (assert) {
        const component = await this.build();
        component.toggleEnabled(false);
        component.changeMode({ target: { value: 'enforce' } });
        component.companyPerDay = '250';
        component.companyPerHour = '';
        component.platformPerHour = null;
        component.blockedCountries = 'kp, ir';
        component.alertEmails = 'ops@example.test, sec@example.test';
        component.probationDays = '';
        component.conversionMinPercent = '';
        await settled();

        assert.dom('[data-test-disabled-warning]').exists('disabling warns the admin');
        assert.dom('[data-test-monitor-warning]').doesNotExist();

        await click('[data-test-save]');
        await flush();

        const { method, path, payload } = this.requests.at(-1);
        assert.strictEqual(method, 'post');
        assert.strictEqual(path, 'sms-guard/settings');
        assert.deepEqual(payload, {
            enabled: false,
            mode: 'enforce',
            alert_emails: ['ops@example.test', 'sec@example.test'],
            validation: { blocked_countries: ['KP', 'IR'], blocked_prefixes: ['+881', '+882'] },
            limits: {
                destination: { cooldown_seconds: 60, per_hour: 3, per_day: 5 },
                company: { per_minute: 10, per_hour: null, per_day: 250 },
                probation: { days: 0, per_day: 20 },
                platform: { public: { per_hour: null, per_day: 10000 } },
            },
            breaker: { pause_minutes: 60, distinct_destinations_per_10m: 25, new_country_min_sends: 10, conversion_min_issued: 20, conversion_min_percent: 0 },
            overrides: [{ company_uuid: 'company-1', unlimited: false, per_day: 600, allowed_countries: ['GB', 'FR'], note: 'bulk' }],
        });
        assert.strictEqual(component.companyPerDay, 300, 'the saved response is applied');
        assert.deepEqual(this.notifications().successes, ['SMS guard settings saved.']);
    });

    test('it resets to the environment defaults', async function (assert) {
        this.writeResponse = settingsResponse();
        const component = await this.build();

        await click('[data-test-reset]');
        await flush();

        assert.strictEqual(this.requests.at(-1).method, 'delete');
        assert.strictEqual(this.requests.at(-1).path, 'sms-guard/settings');
        assert.deepEqual(component.overrides, []);
        assert.deepEqual(this.notifications().successes, ['SMS guard reset to the environment defaults.']);
        assert.dom('[data-test-reset]').doesNotExist('nothing left to reset');
        assert.dom('[data-test-no-pauses]').exists();
    });

    test('it reports failed loads, saves, resets, pauses and unpauses', async function (assert) {
        this.fail = { get: true, post: true, delete: true };
        const component = await this.build();

        assert.deepEqual(component.defaults, {}, 'the environment defaults stay unknown until the policy loads');
        assert.deepEqual([component.usage, component.pauses, component.overrides], [[], [], []], 'nothing is listed until something loads');

        await component.save.perform();
        await component.reset.perform();
        component.selectPauseTarget({ uuid: 'company-3' });
        await component.pause.perform();
        await component.unpause.perform('platform');

        assert.deepEqual(this.notifications().errors, ['get failed', 'get failed', 'post failed', 'delete failed', 'post failed', 'delete failed']);
        assert.false(component.isBusy);
    });

    test('it adds, edits and removes organization exceptions', async function (assert) {
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
        assert.strictEqual(component.overrides[1].per_day, 400, 'a new exception starts at double the default');
        assert.strictEqual(component.companyToAdd, null);

        const [first, second, third] = component.overrides;
        component.updateOverride(second, 'unlimited', true);
        component.updateOverrideInput(third, 'per_day', { target: { value: '' } });
        component.updateOverrideInput(third, 'allowed_countries', { target: { value: 'mn, sg' } });
        component.updateOverrideInput(component.overrides[0], 'note', { target: { value: 'renewed' } });
        component.overrides = [...component.overrides, new SmsGuardOverride({ company_uuid: 'company-4', note: null, allowed_countries: 'US' })];

        assert.deepEqual(component.payload().overrides, [
            { company_uuid: 'company-1', unlimited: false, per_day: 600, allowed_countries: ['GB', 'FR'], note: 'renewed' },
            { company_uuid: 'company-2', unlimited: true, per_day: null, allowed_countries: [], note: '' },
            { company_uuid: 'company-3', unlimited: false, per_day: null, allowed_countries: ['MN', 'SG'], note: '' },
            { company_uuid: 'company-4', unlimited: false, per_day: null, allowed_countries: ['US'], note: '' },
        ]);
        assert.strictEqual(component.overrides[0], first, 'edits happen in place, so an input keeps focus while typing');
        assert.deepEqual(component.overrides[3].organization, { id: 'company-4', uuid: 'company-4', public_id: null, name: 'company-4' }, 'an unnamed organization shows its id');

        const [view, remove] = component.overrideColumns.at(-1).actions;
        view.fn(second);
        view.fn(component.overrides[3]);
        assert.deepEqual(this.transitions, [['console.admin.organizations.details', 'company_def']], 'no public id, no transition');

        remove.fn(component.overrides[3]);
        component.removeOverride(first);
        await settled();

        assert.deepEqual(
            component.overrides.map((override) => override.company_uuid),
            ['company-2', 'company-3']
        );

        component.companyPerDay = '';
        component.addOverride({ uuid: 'company-5', public_id: 'company_jkl', name: 'Delta' });
        assert.strictEqual(component.overrides.at(-1).per_day, null, 'no default budget, no starting value');
    });

    test('it pauses and resumes organizations and the platform', async function (assert) {
        const component = await this.build();

        await component.pause.perform();
        assert.strictEqual(this.requests.filter((request) => request.path === 'sms-guard/pauses').length, 0, 'no organization chosen, nothing sent');

        component.selectPauseTarget({ uuid: 'company-3', name: 'Gamma' });
        component.pauseLength = '';
        component.pauseReason = '';
        await component.pause.perform();

        assert.deepEqual(this.requests.at(-1), { method: 'post', path: 'sms-guard/pauses', payload: { scope: 'company-3', minutes: null, reason: 'manual' } });
        assert.strictEqual(component.pauseTarget, null);
        assert.strictEqual(component.pauses[0].label, 'Gamma');
        assert.deepEqual(this.notifications().successes, ['SMS paused.']);

        component.selectPauseTarget({ id: 'company-4' });
        component.pauseLength = '15';
        component.pauseReason = 'incident 42';
        await component.pause.perform();
        assert.deepEqual(this.requests.at(-1).payload, { scope: 'company-4', minutes: 15, reason: 'incident 42' });

        const [lift] = component.pauseColumns.at(-1).actions;
        lift.fn({ scope: 'company:company-3' });
        await flush();

        assert.deepEqual(this.requests.at(-1), { method: 'delete', path: 'sms-guard/pauses/company%3Acompany-3', payload: undefined });
        assert.deepEqual(component.pauses, []);
        assert.deepEqual(this.notifications().successes.at(-1), 'SMS resumed.');
    });

    test('it only offers a reset when something differs from the environment', async function (assert) {
        this.getResponse = settingsResponse();
        const component = await this.build();

        assert.false(component.differsFromDefaults, 'identical to the defaults');

        component.enabled = false;
        assert.true(component.differsFromDefaults, 'enabled differs');
        component.enabled = true;
        component.mode = 'monitor';
        assert.true(component.differsFromDefaults, 'mode differs');
        component.mode = 'enforce';
        component.companyPerDay = '201';
        assert.true(component.differsFromDefaults, 'daily budget differs');
        component.companyPerDay = '200';
        component.companyPerHour = 61;
        assert.true(component.differsFromDefaults, 'hourly budget differs');
        component.companyPerHour = 60;
        component.platformPerDay = 1;
        assert.true(component.differsFromDefaults, 'platform budget differs');
        component.platformPerDay = 10000;
        component.pauseMinutes = 5;
        assert.true(component.differsFromDefaults, 'pause length differs');
        component.pauseMinutes = 60;
        assert.false(component.differsFromDefaults);

        component.defaults = null;
        assert.true(component.differsFromDefaults, 'with no defaults known every value differs');
    });

    test('it falls back to safe values for sparse responses', async function (assert) {
        this.usageResponse = {};
        const component = await this.build();

        assert.dom('[data-test-no-usage]').exists();

        component.apply();
        assert.true(component.enabled);
        assert.strictEqual(component.mode, 'enforce');
        assert.strictEqual(component.companyPerDay, null);
        assert.strictEqual(component.probationDays, 0);
        assert.strictEqual(component.pauseMinutes, 60);
        assert.strictEqual(component.conversionMinPercent, 0);
        assert.strictEqual(component.alertEmails, '');
        assert.deepEqual(component.overrides, []);
        assert.deepEqual(component.pauses, []);
        assert.false(component.ledgerAvailable);
        assert.deepEqual(component.defaults, {
            enabled: true,
            mode: 'enforce',
            companyPerDay: null,
            companyPerHour: null,
            platformPerDay: null,
            pauseMinutes: 60,
        });
        assert.deepEqual(component.payload().limits.company, { per_minute: null, per_hour: null, per_day: null });
        component.pauseMinutes = '';
        assert.strictEqual(component.payload().breaker.pause_minutes, 60, 'a blank pause length falls back to an hour');
        await settled();
        assert.dom('[data-test-no-ledger]').exists();

        component.pauses = component.pauseRows(undefined);
        component.changeMode({ target: { value: 'monitor' } });
        assert.deepEqual(component.pauses, []);
        assert.deepEqual(component.pauseRows(null), [], 'a null pause list reads as no pauses');
        assert.true(component.isMonitoring);
        assert.deepEqual(toList(null), []);
        assert.deepEqual(toList([' GB ', '']), ['GB']);
        assert.strictEqual(toLimit(undefined), null);
        assert.strictEqual(toLimit('7'), 7);
    });
});
