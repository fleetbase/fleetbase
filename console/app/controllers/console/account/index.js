import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { alias } from '@ember/object/computed';

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
     * The loading state of request.
     *
     * @memberof ConsoleAccountIndexController
     */
    @tracked isLoading = false;

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
                key_uuid: this.user.id,
                key_type: `user`,
                type: `user_avatar`,
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
     * Save the Profile settings.
     *
     * @return {Promise}
     * @memberof ConsoleAccountIndexController
     */
    @action saveProfile() {
        const user = this.user;

        this.isLoading = true;

        return user
            .save()
            .then((user) => {
                this.notifications.success('Profile changes saved.');
                this.currentUser.set('user', user);
            })
            .catch((error) => {
                this.notifications.serverError(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
