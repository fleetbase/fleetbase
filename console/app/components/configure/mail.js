import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

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
    @tracked smtpEncryption = 'tls';
    @tracked smtpUsername = null;
    @tracked smtpPassword = null;
    @tracked smtpTimeout = null;
    @tracked smtpAuth_mode = null;

    /**
     * Creates an instance of ConfigureFilesystemComponent.
     * @memberof ConfigureFilesystemComponent
     */
    constructor() {
        super(...arguments);
        this.loadConfigValues();
    }

    @action setConfigValues(config) {
        for (const key in config) {
            if (this[key] !== undefined) {
                this[key] = config[key];
            }
        }
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

    @action loadConfigValues() {
        this.isLoading = true;

        this.fetch
            .get('settings/mail-config')
            .then((response) => {
                this.setConfigValues(response);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @action test() {
        this.isLoading = true;

        this.fetch
            .post('settings/test-mail-config', {
                mailer: this.mailer,
                from: {
                    address: this.fromAddress,
                    name: this.fromName,
                },
                smtp: this.serializeSmtpConfig(),
            })
            .then((response) => {
                this.testResponse = response;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @action save() {
        this.isLoading = true;

        this.fetch
            .post('settings/mail-config', {
                mailer: this.mailer,
                from: {
                    address: this.fromAddress,
                    name: this.fromName,
                },
                smtp: this.serializeSmtpConfig(),
            })
            .then(() => {
                this.notifications.success('Mail configuration saved.');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
