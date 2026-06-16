import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export default class ConfigureServicesComponent extends Component {
    @service fetch;
    @service notifications;
    @tracked isLoading = false;

    /** aws service */
    @tracked awsKey = null;
    @tracked awsSecret = null;
    @tracked awsRegion = null;

    /** ipinfo service */
    @tracked ipinfoApiKey = null;

    /** google maps service */
    @tracked googleMapsApiKey = null;
    @tracked googleMapsLocale = 'us';

    /** twilio service */
    @tracked twilioSid = null;
    @tracked twilioToken = null;
    @tracked twilioFrom = null;
    @tracked twilioTestPhone = null;
    @tracked twilioTestResponse;

    /** sms service */
    @tracked sms = null;
    @tracked smsSelectedProvider = 'twilio';
    @tracked smsTestPhone = null;
    @tracked smsTestMessage = 'This is a Fleetbase SMS test.';
    @tracked smsTestResponse;
    @tracked customHttpHeadersText = '{}';
    @tracked customHttpBodyText = '{}';

    /** sentry service */
    @tracked sentryDsn = null;
    @tracked sentryTestResponse;

    /**
     * Creates an instance of ConfigureServicesComponent.
     * @memberof ConfigureServicesComponent
     */
    constructor() {
        super(...arguments);
        this.loadConfigValues.perform();
    }

    @action setConfigValues(config) {
        for (const key in config) {
            if (this[key] !== undefined) {
                this[key] = config[key];
            }
        }

        if (config.sms) {
            this.sms = this.normalizeSmsConfig(config.sms);
            this.smsSelectedProvider = this.sms.defaultProvider || 'twilio';
            this.syncSmsJsonText();
        }
    }

    @action selectSmsProvider(event) {
        this.smsSelectedProvider = event.target.value;
        this.syncSmsJsonText();
    }

    @action updateSmsDefaultProvider(event) {
        this.smsSelectedProvider = event.target.value;
        this.sms = {
            ...this.normalizedSms,
            defaultProvider: event.target.value,
        };
        this.syncSmsJsonText();
    }

    @action updateSmsProviderField(provider, field, event) {
        this.sms = this.updateSmsProvider(provider, {
            [field]: event.target.value,
        });

        if (provider === 'twilio') {
            if (field === 'sid') {
                this.twilioSid = event.target.value;
            }

            if (field === 'token') {
                this.twilioToken = event.target.value;
            }

            if (field === 'from') {
                this.twilioFrom = event.target.value;
            }
        }
    }

    @action updateSmsProviderChecked(provider, field, event) {
        this.sms = this.updateSmsProvider(provider, {
            [field]: event.target.checked,
        });
    }

    @action updateSmsProviderJsonField(provider, field, event) {
        if (field === 'headers') {
            this.customHttpHeadersText = event.target.value;
        }

        if (field === 'body') {
            this.customHttpBodyText = event.target.value;
        }

        const value = this.parseJsonValue(event.target.value);

        if (value) {
            this.sms = this.updateSmsProvider(provider, {
                [field]: value,
            });
        }
    }

    get normalizedSms() {
        return this.normalizeSmsConfig(this.sms);
    }

    get smsProviders() {
        return [
            { key: 'twilio', name: 'Twilio' },
            { key: 'callpro', name: 'CallPro/MessagePro.mn' },
            { key: 'vonage', name: 'Vonage' },
            { key: 'messagebird', name: 'MessageBird' },
            { key: 'aws_sns', name: 'AWS SNS' },
            { key: 'smpp', name: 'SMPP Gateway' },
            { key: 'custom_http', name: 'Custom HTTP Gateway' },
        ];
    }

    get selectedSmsProviderConfig() {
        return this.normalizedSms.providers[this.smsSelectedProvider] || {};
    }

    get smsConfigForSave() {
        const sms = this.normalizedSms;

        return {
            defaultProvider: sms.defaultProvider,
            providers: {
                ...sms.providers,
                twilio: {
                    ...(sms.providers.twilio || {}),
                    sid: this.twilioSid,
                    token: this.twilioToken,
                    from: this.twilioFrom,
                },
            },
        };
    }

    @task *loadConfigValues() {
        try {
            const config = yield this.fetch.get('settings/services-config');
            this.setConfigValues(config);
            return config;
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *save() {
        try {
            yield this.fetch.post('settings/services-config', {
                aws: {
                    key: this.awsKey,
                    secret: this.awsSecret,
                    region: this.awsRegion,
                },
                ipinfo: {
                    api_key: this.ipinfoApiKey,
                },
                googleMaps: {
                    api_key: this.googleMapsApiKey,
                    locale: this.googleMapsLocale,
                },
                twilio: {
                    sid: this.twilioSid,
                    token: this.twilioToken,
                    from: this.twilioFrom,
                },
                sms: this.smsConfigForSave,
                sentry: {
                    dsn: this.sentryDsn,
                },
            });
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *testTwilio() {
        try {
            const twilioTestResponse = yield this.fetch.post('settings/test-twilio-config', {
                sid: this.twilioSid,
                token: this.twilioToken,
                from: this.twilioFrom,
                phone: this.twilioTestPhone,
            });
            this.twilioTestResponse = twilioTestResponse;
            return twilioTestResponse;
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *testSmsProvider() {
        try {
            const smsTestResponse = yield this.fetch.post('settings/test-sms-provider-config', {
                provider: this.smsSelectedProvider,
                phone: this.smsTestPhone,
                message: this.smsTestMessage,
                config: this.selectedSmsProviderConfig,
            });
            this.smsTestResponse = smsTestResponse;
            return smsTestResponse;
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *testSentry() {
        try {
            const sentryTestResponse = yield this.fetch.post('settings/test-sentry-config', {
                dsn: this.sentryDsn,
            });
            this.sentryTestResponse = sentryTestResponse;
            return sentryTestResponse;
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    normalizeSmsConfig(sms = {}) {
        sms = sms ?? {};

        const providers = {
            twilio: {
                sid: this.twilioSid,
                token: this.twilioToken,
                from: this.twilioFrom,
            },
            callpro: {},
            vonage: {},
            messagebird: {},
            aws_sns: {},
            smpp: {},
            custom_http: {
                headers: {},
                body: {
                    to: '{{to}}',
                    text: '{{text}}',
                    from: '{{from}}',
                },
            },
            ...(sms.providers || {}),
        };

        providers.twilio = {
            ...providers.twilio,
            sid: providers.twilio.sid ?? this.twilioSid,
            token: providers.twilio.token ?? this.twilioToken,
            from: providers.twilio.from ?? this.twilioFrom,
        };

        return {
            defaultProvider: sms.defaultProvider || 'twilio',
            routingRules: sms.routingRules || {},
            providers,
        };
    }

    updateSmsProvider(provider, changes = {}) {
        const sms = this.normalizedSms;

        return {
            ...sms,
            providers: {
                ...sms.providers,
                [provider]: {
                    ...(sms.providers[provider] || {}),
                    ...changes,
                },
            },
        };
    }

    parseJsonValue(value) {
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
            return null;
        }
    }

    syncSmsJsonText() {
        const customHttpConfig = this.normalizedSms.providers.custom_http || {};
        this.customHttpHeadersText = JSON.stringify(customHttpConfig.headers || {}, null, 2);
        this.customHttpBodyText = JSON.stringify(
            customHttpConfig.body || {
                to: '{{to}}',
                text: '{{text}}',
                from: '{{from}}',
            },
            null,
            2
        );
    }
}
