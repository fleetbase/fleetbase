import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import ENV from '@fleetbase/console/config/environment';

export default class ConsoleSettingsIndexController extends Controller {
    /**
     * Inject the `currentUser` service
     *
     * @memberof ConsoleSettingsIndexController
     */
    @service currentUser;

    /**
     * Inject the `notifications` service
     *
     * @memberof ConsoleSettingsIndexController
     */
    @service notifications;

    /**
     * Inject the `fetch` service
     *
     * @memberof ConsoleSettingsIndexController
     */
    @service fetch;
    @service intl;
    /**
     * The request loading state.
     *
     * @memberof ConsoleSettingsIndexController
     */
    @tracked isLoading = false;

    /**
     * the upload queue.
     *
     * @memberof ConsoleSettingsIndexController
     */
    @tracked uploadQueue = [];

    /**
     * Uploaded files.
     *
     * @memberof ConsoleSettingsIndexController
     */
    @tracked uploadedFiles = [];

    /**
     * Save the organization settings.
     *
     * @memberof ConsoleSettingsIndexController
     */
    @action saveSettings(event) {
        event.preventDefault();
        this.isLoading = true;

        this.model
            .save()
            .then(() => {
                this.notifications.success(this.intl.t('fleet-ops.user-management.organization-changes-saved'));
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    /**
     * Upload file to company.
     *
     * @param {String} type
     * @param {File} file
     * @return {Promise}
     * @memberof ConsoleSettingsIndexController
     */
    @action uploadFile(type, file) {
        let path = `${ENV.AWS.FILE_PATH}/companies/${this.currentUser.companyId}/${type}`;
        let disk = ENV.AWS.DISK;
        let bucket = ENV.AWS.BUCKET;
        return this.fetch.uploadFile.perform(
            file,
            {
                path: path,
                key_uuid: this.currentUser.companyId,
                disk:disk,
                bucket:bucket,
                key_type: `company`,
                type,
            },
            (uploadedFile) => {
                this.model.setProperties({
                    [`${type}_uuid`]: uploadedFile.id,
                    [`${type}_url`]: uploadedFile.url,
                    [type]: uploadedFile,
                });
            }
        );
    }
}
