import Service from '@ember/service';
import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { click, fillIn, render, select, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import ConfigureServicesComponent from '@fleetbase/console/components/configure/services';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

class FetchStub extends Service {
    lastPost = null;

    async get(url) {
        if (url === 'settings/services-config') {
            return {
                awsKey: 'aws-key',
                awsSecret: 'aws-secret',
                awsRegion: 'us-east-1',
                twilioSid: 'twilio-sid',
                twilioToken: 'twilio-token',
                twilioFrom: '+15551234567',
                sms: {
                    defaultProvider: 'twilio',
                    routingRules: {
                        '+44': 'messagebird',
                    },
                    providers: {
                        twilio: {
                            sid: 'twilio-sid',
                            token: 'twilio-token',
                            from: '+15551234567',
                        },
                        messagebird: {
                            access_key: 'messagebird-key',
                            originator: 'Fleetbase',
                            base_url: 'https://rest.messagebird.com/messages',
                        },
                        smpp: {
                            host: 'smpp.example.test',
                            port: 2775,
                            system_id: 'fleetbase',
                            password: 'secret',
                            source_addr: 'FLEETBASE',
                            bind_type: 'transceiver',
                        },
                        custom_http: {
                            method: 'POST',
                            url: 'https://sms-gateway.test/send',
                            from: 'Fleetbase',
                            auth_header: 'Authorization',
                            auth_token: 'Bearer token',
                            headers: {
                                'X-Tenant': 'fleetbase',
                            },
                            query_params: {},
                            body: {
                                recipient: '{{to}}',
                                message: '{{text}}',
                            },
                        },
                    },
                },
            };
        }

        return {};
    }

    async post(url, payload) {
        this.lastPost = { url, payload };

        return {
            status: 'success',
            message: 'SMS sent.',
        };
    }
}

class NotificationsStub extends Service {
    serverError() {}
}

module('Integration | Component | configure/services', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
    });

    test('it renders sms provider configuration and sends test payload', async function (assert) {
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::Services />
        `);
        await waitFor('[data-test-sms-default-provider]');

        assert.dom('[data-test-sms-default-provider]').hasValue('twilio');
        assert.dom('[data-test-sms-configure-provider]').exists();
        assert.dom(this.element).includesText('SMS Providers');
        assert.dom(this.element).doesNotIncludeText('Test Twilio Config');

        await select('[data-test-sms-default-provider]', 'messagebird');
        assert.dom('[data-test-sms-configure-provider]').hasValue('messagebird');

        await fillIn('[data-test-sms-test-phone]', '+441234567890');
        await fillIn('[data-test-sms-test-message]', 'Fleetbase SMS test');
        await click('[data-test-sms-test-button]');

        const fetch = this.owner.lookup('service:fetch');

        assert.strictEqual(fetch.lastPost.url, 'settings/test-sms-provider-config');
        assert.deepEqual(fetch.lastPost.payload, {
            provider: 'messagebird',
            phone: '+441234567890',
            message: 'Fleetbase SMS test',
            config: {
                access_key: 'messagebird-key',
                originator: 'Fleetbase',
                base_url: 'https://rest.messagebird.com/messages',
            },
        });
    });

    test('it configures custom http get query params', async function (assert) {
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::Services />
        `);
        await waitFor('[data-test-sms-default-provider]');

        assert.dom(this.element).doesNotIncludeText('Vonage Base URL');
        assert.dom(this.element).doesNotIncludeText('MessageBird Base URL');

        await select('[data-test-sms-default-provider]', 'custom_http');
        assert.dom('[data-test-sms-configure-provider]').hasValue('custom_http');
        assert.dom('[data-test-custom-http-body]').exists();

        await select('[data-test-custom-http-method]', 'GET');
        assert.dom('[data-test-custom-http-body]').doesNotExist();

        await fillIn('[data-test-custom-http-query-params]', '{ "recipient": "{{to}}", "message": "{{text}}", "reference": "{{unique_id}}" }');
        await fillIn('[data-test-sms-test-phone]', '+15551234567');
        await click('[data-test-sms-test-button]');

        const fetch = this.owner.lookup('service:fetch');

        assert.strictEqual(fetch.lastPost.url, 'settings/test-sms-provider-config');
        assert.strictEqual(fetch.lastPost.payload.provider, 'custom_http');
        assert.deepEqual(fetch.lastPost.payload.config, {
            method: 'GET',
            url: 'https://sms-gateway.test/send',
            from: 'Fleetbase',
            auth_header: 'Authorization',
            auth_token: 'Bearer token',
            headers: {
                'X-Tenant': 'fleetbase',
            },
            query_params: {
                recipient: '{{to}}',
                message: '{{text}}',
                reference: '{{unique_id}}',
            },
            body: {
                recipient: '{{to}}',
                message: '{{text}}',
            },
        });
    });

    test('it configures smpp advanced submit parameters', async function (assert) {
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::Services />
        `);
        await waitFor('[data-test-sms-default-provider]');

        await select('[data-test-sms-default-provider]', 'smpp');
        assert.dom('[data-test-sms-configure-provider]').hasValue('smpp');
        assert.dom('[data-test-smpp-advanced-settings]').doesNotExist();
        assert.dom('[data-test-smpp-advanced-toggle]').hasText('Advanced Settings');

        await click('[data-test-smpp-advanced-toggle]');
        assert.dom('[data-test-smpp-advanced-settings]').exists();
        assert.dom('[data-test-smpp-advanced-toggle]').hasText('Hide Advanced Settings');

        await fillIn('[data-test-smpp-addr-ton]', '1');
        await fillIn('[data-test-smpp-addr-npi]', '0');
        await fillIn('[data-test-smpp-source-ton]', '1');
        await fillIn('[data-test-smpp-source-npi]', '0');
        await fillIn('[data-test-smpp-dest-ton]', '1');
        await fillIn('[data-test-smpp-dest-npi]', '0');

        await click('[data-test-smpp-advanced-toggle]');
        assert.dom('[data-test-smpp-advanced-settings]').doesNotExist();
        assert.dom('[data-test-smpp-advanced-toggle]').hasText('Advanced Settings');

        await fillIn('[data-test-sms-test-phone]', '+15551234567');
        await click('[data-test-sms-test-button]');

        const fetch = this.owner.lookup('service:fetch');

        assert.strictEqual(fetch.lastPost.url, 'settings/test-sms-provider-config');
        assert.deepEqual(fetch.lastPost.payload.config, {
            host: 'smpp.example.test',
            port: 2775,
            system_id: 'fleetbase',
            password: 'secret',
            source_addr: 'FLEETBASE',
            bind_type: 'transceiver',
            addr_ton: 1,
            addr_npi: 0,
            source_addr_ton: 1,
            source_addr_npi: 0,
            dest_addr_ton: 1,
            dest_addr_npi: 0,
            registered_delivery: 1,
            data_coding: 0,
            service_type: '',
            address_range: '',
        });
    });
});

/**
 * The panel's ember-concurrency tasks, error paths and SMS normalisation helpers are not
 * reachable from the rendered UI (there is no button for most of them, and the error paths
 * need a failing endpoint), so this module drives the component instance directly. Glimmer
 * components cannot be constructed by hand, so captureComponent registers a capturing
 * subclass and lets Ember build it.
 */
module('Integration | Component | configure/services | actions', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.getResponse = {};
        this.postResponse = { status: 'success' };
        this.getRejectsWith = null;
        this.postRejectsWith = null;
        const context = this;

        class ConfigurableFetchStub extends Service {
            async get() {
                if (context.getRejectsWith) {
                    throw context.getRejectsWith;
                }

                return context.getResponse;
            }
            async post(url, payload) {
                context.posted.push({ url, payload });

                if (context.postRejectsWith) {
                    throw context.postRejectsWith;
                }

                return context.postResponse;
            }
        }
        class RecordingNotificationsStub extends Service {
            serverErrors = [];
            serverError(error) {
                this.serverErrors.push(error);
            }
        }

        this.owner.register('service:fetch', ConfigurableFetchStub);
        this.owner.register('service:notifications', RecordingNotificationsStub);

        const captured = captureComponent(this.owner, 'configure/services', ConfigureServicesComponent);
        this.build = async () => {
            await render(hbs`
                <div id="next-view-section-subheader-actions"></div>
                <Configure::Services />
            `);

            return captured.instance;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('a failed config load is reported instead of thrown', async function (assert) {
        const failure = new Error('services config unavailable');
        this.getRejectsWith = failure;

        const component = await this.build();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.strictEqual(component.awsKey, null, 'nothing is applied from a failed load');
    });

    test('setConfigValues applies known keys and leaves the sms block alone when absent', async function (assert) {
        this.getResponse = { awsKey: 'key', awsRegion: 'eu-west-1', notAFieldOnThisComponent: 'ignored' };

        const component = await this.build();

        assert.strictEqual(component.awsKey, 'key');
        assert.strictEqual(component.awsRegion, 'eu-west-1');
        assert.strictEqual(component.notAFieldOnThisComponent, undefined, 'keys the component does not declare are dropped');
        assert.strictEqual(component.sms, null, 'no sms block means sms stays untouched');
        assert.strictEqual(component.smsSelectedProvider, 'twilio');
    });

    test('an sms block with no default provider falls back to twilio', async function (assert) {
        this.getResponse = { sms: { providers: { vonage: { api_key: 'v' } } } };

        const component = await this.build();

        assert.strictEqual(component.smsSelectedProvider, 'twilio');
        assert.strictEqual(component.sms.defaultProvider, 'twilio');
        assert.deepEqual(component.sms.routingRules, {}, 'missing routing rules normalise to an empty map');
    });

    test('save posts every service section', async function (assert) {
        const component = await this.build();

        component.awsKey = 'aws-key';
        component.awsSecret = 'aws-secret';
        component.awsRegion = 'us-east-1';
        component.ipinfoApiKey = 'ipinfo';
        component.googleMapsApiKey = 'maps-key';
        component.twilioSid = 'sid';
        component.twilioToken = 'token';
        component.twilioFrom = '+15550000000';
        component.sentryDsn = 'https://sentry.example.com/1';

        await component.save.perform();

        const { url, payload } = this.posted.at(-1);
        assert.strictEqual(url, 'settings/services-config');
        assert.deepEqual(payload.aws, { key: 'aws-key', secret: 'aws-secret', region: 'us-east-1' });
        assert.deepEqual(payload.ipinfo, { api_key: 'ipinfo' });
        assert.deepEqual(payload.googleMaps, { api_key: 'maps-key', locale: 'us' });
        assert.deepEqual(payload.twilio, { sid: 'sid', token: 'token', from: '+15550000000' });
        assert.deepEqual(payload.sentry, { dsn: 'https://sentry.example.com/1' });
        assert.strictEqual(payload.sms.defaultProvider, 'twilio');
        assert.deepEqual(payload.sms.providers.twilio, { sid: 'sid', token: 'token', from: '+15550000000' }, 'the twilio credentials are folded into the sms block');
    });

    test('a failed save is reported instead of thrown', async function (assert) {
        const component = await this.build();
        const failure = new Error('save rejected');
        this.postRejectsWith = failure;

        await component.save.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
    });

    test('testTwilio posts the credentials and keeps the response', async function (assert) {
        this.postResponse = { status: 'success', message: 'Twilio reachable' };
        const component = await this.build();

        component.twilioSid = 'sid';
        component.twilioToken = 'token';
        component.twilioFrom = '+15550000000';
        component.twilioTestPhone = '+15551111111';

        const result = await component.testTwilio.perform();

        assert.deepEqual(this.posted.at(-1), {
            url: 'settings/test-twilio-config',
            payload: { sid: 'sid', token: 'token', from: '+15550000000', phone: '+15551111111' },
        });
        assert.deepEqual(component.twilioTestResponse, this.postResponse);
        assert.deepEqual(result, this.postResponse);
    });

    test('a failed twilio test is reported instead of thrown', async function (assert) {
        const component = await this.build();
        const failure = new Error('twilio unreachable');
        this.postRejectsWith = failure;

        await component.testTwilio.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.strictEqual(component.twilioTestResponse, undefined, 'no response is stored');
    });

    test('testSentry posts the dsn and keeps the response', async function (assert) {
        this.postResponse = { status: 'success', message: 'Sentry reachable' };
        const component = await this.build();

        component.sentryDsn = 'https://sentry.example.com/1';

        const result = await component.testSentry.perform();

        assert.deepEqual(this.posted.at(-1), { url: 'settings/test-sentry-config', payload: { dsn: 'https://sentry.example.com/1' } });
        assert.deepEqual(component.sentryTestResponse, this.postResponse);
        assert.deepEqual(result, this.postResponse);
    });

    test('a failed sentry test is reported instead of thrown', async function (assert) {
        const component = await this.build();
        const failure = new Error('sentry unreachable');
        this.postRejectsWith = failure;

        await component.testSentry.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.strictEqual(component.sentryTestResponse, undefined);
    });

    test('a failed sms provider test is reported instead of thrown', async function (assert) {
        const component = await this.build();
        const failure = new Error('gateway unreachable');
        this.postRejectsWith = failure;

        await component.testSmsProvider.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.strictEqual(component.smsTestResponse, undefined);
    });

    test('selectSmsProvider switches the panel being configured', async function (assert) {
        const component = await this.build();

        component.selectSmsProvider({ target: { value: 'vonage' } });

        assert.strictEqual(component.smsSelectedProvider, 'vonage');
    });

    test('updateSmsDefaultProvider records the choice on the sms config', async function (assert) {
        const component = await this.build();

        component.updateSmsDefaultProvider({ target: { value: 'messagebird' } });

        assert.strictEqual(component.smsSelectedProvider, 'messagebird');
        assert.strictEqual(component.sms.defaultProvider, 'messagebird');
    });

    test('updateSmsProviderField mirrors the twilio credentials onto the component', async function (assert) {
        const component = await this.build();

        component.updateSmsProviderField('twilio', 'sid', { target: { value: 'new-sid' } });
        component.updateSmsProviderField('twilio', 'token', { target: { value: 'new-token' } });
        component.updateSmsProviderField('twilio', 'from', { target: { value: '+15559999999' } });

        assert.strictEqual(component.twilioSid, 'new-sid');
        assert.strictEqual(component.twilioToken, 'new-token');
        assert.strictEqual(component.twilioFrom, '+15559999999');
        assert.strictEqual(component.sms.providers.twilio.sid, 'new-sid');
    });

    test('updateSmsProviderField leaves the twilio credentials alone for other providers and fields', async function (assert) {
        const component = await this.build();

        component.updateSmsProviderField('twilio', 'messaging_service_sid', { target: { value: 'MG1' } });
        component.updateSmsProviderField('vonage', 'sid', { target: { value: 'not-twilio' } });

        assert.strictEqual(component.twilioSid, null, 'another provider never writes the twilio sid');
        assert.strictEqual(component.sms.providers.vonage.sid, 'not-twilio');
        assert.strictEqual(component.sms.providers.twilio.messaging_service_sid, 'MG1');
    });

    test('updateSmsProviderChecked stores a boolean toggle', async function (assert) {
        const component = await this.build();

        component.updateSmsProviderChecked('smpp', 'tls', { target: { checked: true } });

        assert.true(component.sms.providers.smpp.tls);
    });

    test('updateSmsProviderNumberField parses integers and falls back to zero', async function (assert) {
        const component = await this.build();

        component.updateSmsProviderNumberField('smpp', 'port', { target: { value: '2775' } });
        assert.strictEqual(component.sms.providers.smpp.port, 2775);

        component.updateSmsProviderNumberField('smpp', 'port', { target: { value: 'not-a-number' } });
        assert.strictEqual(component.sms.providers.smpp.port, 0, 'an unparseable value becomes 0');
    });

    test('toggleSmppAdvancedSettings flips the advanced panel', async function (assert) {
        const component = await this.build();

        assert.false(component.isSmppAdvancedSettingsVisible);
        component.toggleSmppAdvancedSettings();
        assert.true(component.isSmppAdvancedSettingsVisible);
        component.toggleSmppAdvancedSettings();
        assert.false(component.isSmppAdvancedSettingsVisible);
    });

    test('updateSmsProviderJsonField stores the raw text and applies parseable JSON', async function (assert) {
        const component = await this.build();

        component.updateSmsProviderJsonField('custom_http', 'headers', { target: { value: '{"X-Key":"abc"}' } });
        component.updateSmsProviderJsonField('custom_http', 'query_params', { target: { value: '{"debug":"1"}' } });
        component.updateSmsProviderJsonField('custom_http', 'body', { target: { value: '{"text":"{{text}}"}' } });

        assert.strictEqual(component.customHttpHeadersText, '{"X-Key":"abc"}', 'the raw text is kept verbatim for the editor');
        assert.deepEqual(component.sms.providers.custom_http.headers, { 'X-Key': 'abc' });
        assert.deepEqual(component.sms.providers.custom_http.query_params, { debug: '1' });
        assert.deepEqual(component.sms.providers.custom_http.body, { text: '{{text}}' });
    });

    test('updateSmsProviderJsonField keeps the last good value while the JSON is invalid', async function (assert) {
        const component = await this.build();

        component.updateSmsProviderJsonField('custom_http', 'headers', { target: { value: '{"X-Key":"abc"}' } });
        component.updateSmsProviderJsonField('custom_http', 'headers', { target: { value: '{"X-Key": ' } });

        assert.strictEqual(component.customHttpHeadersText, '{"X-Key": ', 'the half-typed text is still shown');
        assert.deepEqual(component.sms.providers.custom_http.headers, { 'X-Key': 'abc' }, 'but the parsed config is not clobbered');
    });

    test('updateSmsProviderJsonField ignores JSON that is not an object', async function (assert) {
        const component = await this.build();

        component.updateSmsProviderJsonField('custom_http', 'headers', { target: { value: '42' } });

        assert.strictEqual(component.customHttpHeadersText, '42', 'the raw text is still shown in the editor');
        assert.strictEqual(component.sms, null, 'a bare number is not a headers map, so nothing is applied');
        assert.deepEqual(component.normalizedSms.providers.custom_http.headers, {}, 'headers stay at their default');
    });

    test('selectedSmsProviderConfig is empty for a provider with no config', async function (assert) {
        const component = await this.build();

        component.smsSelectedProvider = 'not-a-provider';

        assert.deepEqual(component.selectedSmsProviderConfig, {});
        assert.true(component.isCustomHttpPostMethod, 'POST is assumed when no method is set');
    });

    test('isCustomHttpPostMethod follows the configured method case-insensitively', async function (assert) {
        const component = await this.build();

        component.smsSelectedProvider = 'custom_http';
        assert.true(component.isCustomHttpPostMethod, 'custom_http defaults to POST');

        component.updateSmsProviderField('custom_http', 'method', { target: { value: 'get' } });
        assert.false(component.isCustomHttpPostMethod);

        component.updateSmsProviderField('custom_http', 'method', { target: { value: 'post' } });
        assert.true(component.isCustomHttpPostMethod, 'lower case post still counts as POST');
    });

    test('smsProviders lists every supported gateway', async function (assert) {
        const component = await this.build();

        assert.deepEqual(
            component.smsProviders.map((provider) => provider.key),
            ['twilio', 'callpro', 'vonage', 'messagebird', 'aws_sns', 'smpp', 'custom_http']
        );
    });

    test('normalizeSmsConfig fills in the defaults for a missing or empty config', async function (assert) {
        const component = await this.build();

        const fromNothing = component.normalizeSmsConfig();
        const fromNull = component.normalizeSmsConfig(null);

        assert.strictEqual(fromNothing.defaultProvider, 'twilio');
        assert.deepEqual(fromNothing.routingRules, {});
        assert.strictEqual(fromNull.defaultProvider, 'twilio', 'null is treated the same as absent');
        assert.strictEqual(fromNothing.providers.smpp.bind_type, 'transceiver', 'smpp defaults are filled in');
        assert.strictEqual(fromNothing.providers.custom_http.method, 'POST');
        assert.deepEqual(fromNothing.providers.callpro, {});
    });

    test('normalizeSmsConfig keeps stored twilio credentials over the component fields', async function (assert) {
        const component = await this.build();

        component.twilioSid = 'component-sid';
        const normalized = component.normalizeSmsConfig({ providers: { twilio: { sid: 'stored-sid' } } });

        assert.strictEqual(normalized.providers.twilio.sid, 'stored-sid');
        assert.strictEqual(normalized.providers.twilio.token, null, 'unset credentials fall back to the component field');
    });

    test('updateSmsProvider adds a provider that has no config yet', async function (assert) {
        const component = await this.build();

        const withNewProvider = component.updateSmsProvider('brand_new', { api_key: 'k' });
        assert.deepEqual(withNewProvider.providers.brand_new, { api_key: 'k' });

        const unchanged = component.updateSmsProvider('vonage');
        assert.deepEqual(unchanged.providers.vonage, {}, 'no changes leaves the provider as it was');
    });

    test('parseJsonValue only accepts objects', async function (assert) {
        const component = await this.build();

        assert.deepEqual(component.parseJsonValue('{"a":1}'), { a: 1 });
        assert.deepEqual(component.parseJsonValue('[1,2]'), [1, 2], 'arrays are objects too');
        assert.strictEqual(component.parseJsonValue('42'), null, 'a number is rejected');
        assert.strictEqual(component.parseJsonValue('null'), null, 'null is rejected');
        assert.strictEqual(component.parseJsonValue('not json at all'), null, 'unparseable text is rejected');
    });

    test('syncSmsJsonText falls back to the default body when custom_http is bare', async function (assert) {
        const component = await this.build();

        component.sms = { providers: { custom_http: {} } };
        component.syncSmsJsonText();

        assert.strictEqual(component.customHttpHeadersText, '{}');
        assert.strictEqual(component.customHttpQueryParamsText, '{}');
        assert.deepEqual(JSON.parse(component.customHttpBodyText), { to: '{{to}}', text: '{{text}}', from: '{{from}}' }, 'the templated default body is offered');
    });
});

module('Integration | Component | configure/services | sparse sms config', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.getResponse = {};
        const context = this;

        class SparseFetchStub extends Service {
            async get() {
                return context.getResponse;
            }
            async post() {
                return { status: 'success' };
            }
        }
        class QuietNotificationsStub extends Service {
            serverError() {}
        }

        this.owner.register('service:fetch', SparseFetchStub);
        this.owner.register('service:notifications', QuietNotificationsStub);

        const captured = captureComponent(this.owner, 'configure/services', ConfigureServicesComponent);
        this.build = async () => {
            await render(hbs`
                <div id="next-view-section-subheader-actions"></div>
                <Configure::Services />
            `);

            return captured.instance;
        };
    });

    test('a custom HTTP provider saved without headers reads back as an empty object', async function (assert) {
        // An incoming providers block replaces the shipped defaults wholesale, so a
        // custom_http entry written by an older version has neither headers nor query params.
        this.getResponse = { sms: { defaultProvider: 'custom_http', providers: { custom_http: { method: 'POST', url: 'https://gw.test/send' } } } };

        const component = await this.build();

        assert.strictEqual(component.customHttpHeadersText, '{}', 'the headers editor opens on an empty object rather than "undefined"');
        assert.strictEqual(component.customHttpQueryParamsText, '{}', 'and so does the query params editor');
        assert.strictEqual(component.customHttpBodyText, JSON.stringify({ to: '{{to}}', text: '{{text}}', from: '{{from}}' }, null, 2), 'a missing body falls back to the templated default');
        assert.strictEqual(component.smsSelectedProvider, 'custom_http', 'the saved provider is the one shown');
    });

    test('headers and query params fall back independently of one another', async function (assert) {
        this.getResponse = {
            sms: { providers: { custom_http: { method: 'POST', headers: { 'X-Tenant': 'acme' } } } },
        };

        const component = await this.build();

        assert.strictEqual(component.customHttpHeadersText, JSON.stringify({ 'X-Tenant': 'acme' }, null, 2), 'saved headers are shown as written');
        assert.strictEqual(component.customHttpQueryParamsText, '{}', 'while the absent query params still default');
    });
});
