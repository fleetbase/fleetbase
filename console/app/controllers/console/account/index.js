import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { alias } from '@ember/object/computed';
import { debug } from '@ember/debug';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';

export default class ConsoleAccountIndexController extends Controller {
    /**
     * Inject the `currentUser` service.
     *
     * @memberof ConsoleAccountIndexController
     */
    @service currentUser;

    /**
     * Inject the `fetch` service.
     *
     * @memberof ConsoleAccountIndexController
     */
    @service fetch;

    /**
     * Inject the `notifications` service.
     *
     * @memberof ConsoleAccountIndexController
     */
    @service notifications;

    /**
     * Alias to the currentUser service user record.
     *
     * @memberof ConsoleAccountIndexController
     */
    @alias('currentUser.user') user;

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
     * Handle upload of new photo
     *
     * @param {UploadFile} file
     * @memberof ConsoleAccountIndexController
     */
    @action uploadNewPhoto(file) {
        return this.fetch.uploadFile.perform(
            file,
            {
                path: `uploads/${this.user.company_uuid}/users/${this.user.slug}`,
                subject_uuid: this.user.id,
                subject_type: 'user',
                type: 'user_avatar',
                resize: 'md',
            },
            (uploadedFile) => {
                this.user.setProperties({
                    avatar_uuid: uploadedFile.id,
                    avatar_url: uploadedFile.url,
                });

                return this.user.save();
            }
        );
    }

    /**
     * Starts the task to change password
     *
     * @param {Event} event
     * @memberof ConsoleAccountIndexController
     */
    @task *saveProfile(event) {
        // If from event fired
        if (event instanceof Event) {
            event.preventDefault();
        }

        try {
            const user = yield this.user.save();
            this.notifications.success('Profile changes saved.');
            this.currentUser.set('user', user);
        } catch (error) {
            this.notifications.serverError(error);
        }
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
