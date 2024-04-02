import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { alias } from '@ember/object/computed';
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
     * Inject the `modalsManager` service.
     *
     * @memberof ConsoleAccountIndexController
     */
    @service modalsManager;

    /**
     * Alias to the currentUser service user record.
     *
     * @memberof ConsoleAccountIndexController
     */
    @alias('currentUser.user') user;

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

        let canUpdateProfile = true;
        // If email has been changed prompt for password validation
        if (this.changedUserAttribute('email')) {
            canUpdateProfile = yield this.validatePassword.perform();
        }

        if (canUpdateProfile === true) {
            try {
                const user = yield this.user.save();
                this.notifications.success('Profile changes saved.');
                this.currentUser.set('user', user);
            } catch (error) {
                this.notifications.serverError(error);
            }
        } else {
            this.user.rollbackAttributes();
        }
    }

    /**
     * Task to validate current password
     *
     * @return {boolean}
     * @memberof ConsoleAccountIndexController
     */
    @task *validatePassword() {
        let isPasswordValid = false;

        yield this.modalsManager.show('modals/validate-password', {
            body: 'You must validate your password to update the account email address.',
            onValidated: (isValid) => {
                isPasswordValid = isValid;
            },
        });

        return isPasswordValid;
    }

    /**
     * Checks if any user attribute has been changed
     *
     * @param {string} attributeKey
     * @return {boolean}
     * @memberof ConsoleAccountIndexController
     */
    changedUserAttribute(attributeKey) {
        const changedAttributes = this.user.changedAttributes();
        return changedAttributes[attributeKey] !== undefined;
    }
}
