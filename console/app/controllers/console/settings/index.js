import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

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
                this.notifications.success('Organization changes successfully saved.');
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
        return this.fetch.uploadFile.perform(
            file,
            {
                path: `uploads/companies/${this.currentUser.companyId}/${type}`,
                key_uuid: this.currentUser.companyId,
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
