import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { debug } from '@ember/debug';
import { task } from 'ember-concurrency';

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
     * Available timezones for selection.
     *
     * @memberof ConsoleAccountIndexController
     */
    @tracked timezones = [];

    constructor() {
        super(...arguments);
        this.loadTimezones.perform();
    }

    /**
     * Save the organization settings.
     *
     * @memberof ConsoleSettingsIndexController
     */
    @task *saveSettings(event) {
        event?.preventDefault();

        try {
            yield this.model.save();
            this.notifications.success('Organization changes successfully saved.');
        } catch (error) {
            debug(`Unable to save organization settings : ${error.message}`);
        }
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

    /**
     * Load all available timezones from lookup.
     *
     * @memberof ConsoleAccountIndexController
     */
    @task *loadTimezones() {
        try {
            this.timezones = yield this.fetch.get('lookup/timezones');
        } catch (error) {
            debug(`Unable to load timezones : ${error.message}`);
        }
    }
}
