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
}
