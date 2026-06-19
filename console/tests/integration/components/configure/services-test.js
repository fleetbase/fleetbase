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
        await render(hbs`<Configure::Services />`);
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
});
