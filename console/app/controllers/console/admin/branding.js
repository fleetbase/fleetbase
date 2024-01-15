import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';

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
     * Unsets the value of a given key or array of keys on the model.
     *
     * @action
     * @param {string | string[]} key - The key or keys to unset on the model.
     * @param {*} [newValue=null] - The new value to set for the given key or keys. Defaults to null.
     * @memberof ConsoleAdminBrandingController
     */
    @action unset(key, newValue = null) {
        if (isArray(key)) {
            return key.forEach((k) => this.unset(k, undefined));
        }

        this.model.set(key, newValue);
    }

    /**
     * Unsets the icon properties on the model.
     *
     * @action
     * @returns {void} - No return value.
     * @memberof ConsoleAdminBrandingController
     */
    @action unsetIcon() {
        this.unset(['icon_uuid', 'icon_url']);
        this.model.set('icon_url', '/images/icon.png');
    }

    /**
     * Unsets the logo properties on the model.
     *
     * @action
     * @returns {void} - No return value.
     * @memberof ConsoleAdminBrandingController
     */
    @action unsetLogo() {
        this.unset(['logo_uuid', 'logo_url']);
        this.model.set('logo_url', '/images/fleetbase-logo-svg.svg');
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

                // if logo url is null
                if (this.model.logo_url === null) {
                    this.model.set('logo_url', '/images/fleetbase-logo-svg.svg');
                }

                // if icon url is null
                if (this.model.icon_url === null) {
                    this.model.set('icon_url', '/images/icon.png');
                }
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
