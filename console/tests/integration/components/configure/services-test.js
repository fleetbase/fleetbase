import Service from '@ember/service';
import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { click, fillIn, render, select, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

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
