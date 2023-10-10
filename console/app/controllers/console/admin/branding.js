import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ConsoleAdminBrandingController extends Controller {
    /**
     * Inject the `fetch` service.
     *
     * @memberof ConsoleAdminBrandingController
     */
    @service fetch;

    /**
     * Inject the `notifications` service.
     *
     * @memberof ConsoleAdminBrandingController
     */
    @service notifications;

    /**
     * Inject the `theme` service.
     *
     * @memberof ConsoleAdminBrandingController
     */
    @service theme;

    /**
     * Status of loading process.
     *
     * @memberof ConsoleAdminBrandingController
     */
    @tracked isLoading = false;

    /**
     * Theme options.
     *
     * @memberof ConsoleAdminBrandingController
     */
    @tracked themeOptions = ['light', 'dark'];

    /**
     * Set the default theme
     *
     * @param {String} theme
     * @memberof ConsoleAdminBrandingController
     */
    @action setTheme(theme) {
        this.model.default_theme = theme;
        this.theme.setTheme(theme);
    }

    /**
     * Unset a branding settings
     *
     * @param {String} key
     * @memberof ConsoleAdminBrandingController
     */
    @action unset(key, newValue = null) {
        this.model[key] = newValue;
    }

    /**
     * Save branding settings.
     *
     * @return {Promise}
     * @memberof ConsoleAdminBrandingController
     */
    @action save() {
        this.isLoading = true;

        return this.model
            .save()
            .then(() => {
                this.notifications.success('Branding settings saved.');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    /**
     * Handle upload of new console icon
     *
     * @param {UploadFile} file
     * @memberof ConsoleAccountIndexController
     */
    @action uploadIcon(file) {
        this.isLoading = true;

        return this.fetch.uploadFile.perform(
            file,
            {
                path: `uploads/system`,
                type: `system`,
            },
            (uploadedFile) => {
                this.model.icon_uuid = uploadedFile.id;
                this.model.icon_url = uploadedFile.url;
                this.isLoading = false;
            }
        );
    }

    /**
     * Handle upload of new console logo
     *
     * @param {UploadFile} file
     * @memberof ConsoleAccountIndexController
     */
    @action uploadLogo(file) {
        this.isLoading = true;

        return this.fetch.uploadFile.perform(
            file,
            {
                path: `uploads/system`,
                type: `system`,
            },
            (uploadedFile) => {
                this.model.logo_uuid = uploadedFile.id;
                this.model.logo_url = uploadedFile.url;
                this.isLoading = false;
            }
        );
    }
}
