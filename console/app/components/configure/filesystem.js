import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ConfigureFilesystemComponent extends Component {
    @service fetch;
    @service notifications;
    @service currentUser;
    @tracked isLoading = false;
    @tracked testResponse;
    @tracked disks = [];
    @tracked driver = 'local';
    @tracked s3Bucket = null;
    @tracked s3Url = null;
    @tracked s3Endpoint = null;
    @tracked gcsBucket = null;
    @tracked gcsCredentialsFileId = null;
    @tracked gcsCredentialsFile = null;
    @tracked isGoogleCloudStorageEnvConfigued = false;

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

    @action setDriver(driver) {
        this.driver = driver;
    }

    @action loadConfigValues() {
        this.isLoading = true;

        this.fetch
            .get('settings/filesystem-config')
            .then((response) => {
                this.setConfigValues(response);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @action save() {
        this.isLoading = true;

        this.fetch
            .post('settings/filesystem-config', {
                driver: this.driver,
                s3: {
                    bucket: this.s3Bucket,
                    url: this.s3Url,
                    endpoint: this.s3Endpoint,
                },
                gcsCredentialsFileId: this.gcsCredentialsFileId,
                gcsBucket: this.gcsBucket,
            })
            .then(() => {
                this.notifications.success('Filesystem configuration saved.');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @action test() {
        this.isLoading = true;

        this.fetch
            .post('settings/test-filesystem-config', {
                disk: this.driver,
            })
            .then((response) => {
                this.testResponse = response;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @action removeGcsCredentialsFile() {
        this.gcsCredentialsFileId = undefined;
        this.gcsCredentialsFile = undefined;
    }

    @action uploadGcsCredentialsFile(file) {
        try {
            this.fetch.uploadFile.perform(
                file,
                {
                    path: 'gcs',
                    subject_uuid: this.currentUser.companyId,
                    subject_type: 'company',
                    type: 'gcs_credentials',
                },
                (uploadedFile) => {
                    console.log('uploadedFile', uploadedFile);
                    this.gcsCredentialsFileId = uploadedFile.id;
                    this.gcsCredentialsFile = uploadedFile;
                    console.log('this.gcsCredentialsFile', this.gcsCredentialsFile);
                }
            );
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}
