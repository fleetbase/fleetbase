import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ConfigureNotificationChannelsComponent extends Component {
    @service fetch;
    @service notifications;
    @service currentUser;
    @tracked isLoading = false;
    @tracked testResponse;
    @tracked testTitle = 'Hello World from Fleetbase 🚀';
    @tracked testMessage = 'This is a test push notification!';
    @tracked apnToken;
    @tracked fcmToken;
    @tracked apn = {
        key_id: '',
        team_id: '',
        app_bundle_id: '',
        private_key_path: '',
        _private_key_path: '',
        private_key_file_id: '',
        private_key_file: null,
        production: true,
    };
    @tracked firebase = {
        credentials: '',
    };

    constructor() {
        super(...arguments);
        this.loadConfigValues();
    }

    @action removeApnFile() {
        const apnConfig = this.apn;
        apnConfig.private_key_file = null;
        apnConfig.private_key_file_id = '';
        apnConfig.private_key_path = '';
        apnConfig._private_key_path = '';

        this.apn = apnConfig;
    }

    @action removeFirebaseCredentialsFile() {
        const firebaseConfig = this.firebase;
        firebaseConfig.credentials_file = null;
        firebaseConfig.credentials_file_id = '';
        firebaseConfig.credentials = '';

        this.firebase = firebaseConfig;
    }

    @action uploadApnKey(file) {
        try {
            this.fetch.uploadFile.perform(
                file,
                {
                    path: 'apn',
                    subject_uuid: this.currentUser.companyId,
                    subject_type: 'company',
                    type: 'apn_key',
                },
                (uploadedFile) => {
                    const apnConfig = this.apn;
                    apnConfig.private_key_file = uploadedFile;
                    apnConfig.private_key_file_id = uploadedFile.id;
                    apnConfig.private_key_path = uploadedFile.path;
                    apnConfig._private_key_path = uploadedFile.path;

                    this.apn = apnConfig;
                }
            );
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action uploadFirebaseCredentials(file) {
        try {
            this.fetch.uploadFile.perform(
                file,
                {
                    path: 'firebase',
                    subject_uuid: this.currentUser.companyId,
                    subject_type: 'company',
                    type: 'firebase_credentials',
                },
                (uploadedFile) => {
                    const firebaseConfig = this.firebase;
                    firebaseConfig.credentials_file = uploadedFile;
                    firebaseConfig.credentials_file_id = uploadedFile.id;
                    firebaseConfig.credentials_file_path = uploadedFile.path;

                    this.firebase = firebaseConfig;
                }
            );
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action setConfigValues(config) {
        for (const key in config) {
            if (this[key] !== undefined) {
                this[key] = config[key];
            }
        }
    }

    @action loadConfigValues() {
        this.isLoading = true;

        this.fetch
            .get('settings/notification-channels-config')
            .then((response) => {
                this.setConfigValues(response);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @action save() {
        this.isLoading = true;

        const apnConfig = this.apn;
        delete apnConfig.private_key_file;

        const firebaseConfig = this.firebase;
        delete firebaseConfig.credentials_file;

        this.fetch
            .post('settings/notification-channels-config', {
                apn: apnConfig,
                firebase: firebaseConfig,
            })
            .then(() => {
                this.notifications.success("Notification channel's configuration saved.");
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @action test() {
        this.isLoading = true;

        this.fetch
            .post('settings/test-notification-channels-config', {
                apn: this.apn,
                firebase: this.firebase,
                title: this.testTitle,
                message: this.testMessage,
                apnToken: this.apnToken,
                fcmToken: this.fcmToken,
            })
            .then((response) => {
                this.testResponse = response;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
