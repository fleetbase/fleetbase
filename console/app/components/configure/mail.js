import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export default class ConfigureMailComponent extends Component {
    @service fetch;
    @service notifications;
    @tracked isLoading = false;
    @tracked testResponse;
    @tracked mailers = [];
    @tracked mailer = 'smtp';
    @tracked fromAddress = null;
    @tracked fromName = null;
    @tracked smtpHost = 'smtp.mailgun.org';
    @tracked smtpPort = 587;
    @tracked smtpEncryption = null;
    @tracked smtpUsername = null;
    @tracked smtpPassword = null;
    @tracked smtpTimeout = null;
    @tracked smtpAuth_mode = null;
    @tracked mailgunDomain = null;
    @tracked mailgunEndpoint = 'api.mailgun.net';
    @tracked mailgunSecret = null;
    @tracked postmarkToken = null;
    @tracked sendgridApi_key = null;
    @tracked resendKey = null;

    /**
     * Creates an instance of ConfigureFilesystemComponent.
     * @memberof ConfigureFilesystemComponent
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

    @action enableSmtpEncryption(enabled) {
        this.smtpEncryption = enabled ? 'tls' : null;
    }

    @action setMailer(mailer) {
        this.mailer = mailer;
    }

    @action serializeSmtpConfig() {
        return {
            host: this.smtpHost,
            port: this.smtpPort,
            encryption: this.smtpEncryption,
            username: this.smtpUsername,
            password: this.smtpPassword,
            timeout: this.smtpTimeout,
            auth_mode: this.smtpAuth_mode,
        };
    }

    @action serializeMailgunConfig() {
        return {
            domain: this.mailgunDomain,
            secret: this.mailgunSecret,
            endpoint: this.mailgunEndpoint,
        };
    }

    @action serializePostmarkConfig() {
        return {
            token: this.postmarkToken,
        };
    }

    @action serializeSendgridConfig() {
        return {
            api_key: this.sendgridApi_key,
        };
    }

    @action serializeResendConfig() {
        return {
            key: this.resendKey,
        };
    }

    @task *loadConfigValues() {
        try {
            const config = yield this.fetch.get('settings/mail-config');
            this.setConfigValues(config);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *test() {
        try {
            this.testResponse = yield this.fetch.post('settings/test-mail-config', {
                mailer: this.mailer,
                from: {
                    address: this.fromAddress,
                    name: this.fromName,
                },
                smtp: this.serializeSmtpConfig(),
                mailgun: this.serializeMailgunConfig(),
                postmark: this.serializePostmarkConfig(),
                sendgrid: this.serializeSendgridConfig(),
                resend: this.serializeResendConfig(),
            });
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *save() {
        try {
            yield this.fetch.post('settings/mail-config', {
                mailer: this.mailer,
                from: {
                    address: this.fromAddress,
                    name: this.fromName,
                },
                smtp: this.serializeSmtpConfig(),
                mailgun: this.serializeMailgunConfig(),
                postmark: this.serializePostmarkConfig(),
                sendgrid: this.serializeSendgridConfig(),
                resend: this.serializeResendConfig(),
            });
            this.notifications.success('Mail configuration saved.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}
