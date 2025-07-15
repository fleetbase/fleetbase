import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import ENV from '@fleetbase/console/config/environment';
import { driver } from 'driver.js'; 
import 'driver.js/dist/driver.css';

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

    @action OrganizationSettingsTour() {
        const sectionBody = document.querySelector('.next-view-section-body');
        const scrollElementIntoView = (element) => {
            if (sectionBody) {
                const elementRect = element.getBoundingClientRect();
                const sectionBodyRect = sectionBody.getBoundingClientRect();
                const scrollTop = sectionBody.scrollTop + elementRect.top - sectionBodyRect.top - (sectionBodyRect.height - elementRect.height) / 2;
                sectionBody.scrollTo({ top: scrollTop, behavior: 'smooth' });
            }
        };
        const driverObj = driver({
            showProgress: true,
            nextBtnText: this.intl.t('fleetbase.common.next'),
            prevBtnText: this.intl.t('fleetbase.common.previous'),
            doneBtnText: this.intl.t('fleetbase.common.done'),
            closeBtnText: this.intl.t('fleetbase.common.close'),
            steps: [
                {
                    element: '.input-group:has(.org-name)',
                    popover: {
                        title: this.intl.t('fleetbase.organization_settings.tour.name_field.title'),
                        description: this.intl.t('fleetbase.organization_settings.tour.name_field.description'),
                    },
                    onHighlightStarted: scrollElementIntoView,
                },
                {
                    element: '.input-group:has(.org-description)',
                    popover: {
                        title: this.intl.t('fleetbase.organization_settings.tour.description_field.title'),
                        description: this.intl.t('fleetbase.organization_settings.tour.description_field.description'),
                    },
                    onHighlightStarted: scrollElementIntoView,
                },
                {
                    element: '.input-group:has(.org-phone)',
                    popover: {
                        title: this.intl.t('fleetbase.organization_settings.tour.phone_field.title'),
                        description: this.intl.t('fleetbase.organization_settings.tour.phone_field.description'),
                    },
                    onHighlightStarted: scrollElementIntoView,
                },
                {
                    element: '.input-group:has(.org-currency)',
                    popover: {
                        title: this.intl.t('fleetbase.organization_settings.tour.currency_field.title'),
                        description: this.intl.t('fleetbase.organization_settings.tour.currency_field.description'),
                    },
                    onHighlightStarted: scrollElementIntoView,
                },
                {
                    element: '.input-group:has(.org-id)',
                    popover: {
                        title: this.intl.t('fleetbase.organization_settings.tour.id_field.title'),
                        description: this.intl.t('fleetbase.organization_settings.tour.id_field.description'),
                    },
                    onHighlightStarted: scrollElementIntoView,
                },
                {
                    element: '.parking-zone .input-group',
                    popover: {
                        title: this.intl.t('fleetbase.organization_settings.tour.parking_zone.title'),
                        description: this.intl.t('fleetbase.organization_settings.tour.parking_zone.description'),
                    },
                    onHighlightStarted: scrollElementIntoView,
                },
                {
                    element: '.save-button .btn',
                    popover: {
                        title: this.intl.t('fleetbase.organization_settings.tour.save_button.title'),
                        description: this.intl.t('fleetbase.organization_settings.tour.save_button.description'),
                    },
                    onHighlightStarted: scrollElementIntoView,
                },
                {
                    element: '.input-group:has(.org-logo)',
                    popover: {
                        title: this.intl.t('fleetbase.organization_settings.tour.logo_field.title'),
                        description: this.intl.t('fleetbase.organization_settings.tour.logo_field.description'),
                    },
                    onHighlightStarted: scrollElementIntoView,
                },
                {
                    element: '.input-group:has(.org-backdrop)',
                    popover: {
                        title: this.intl.t('fleetbase.organization_settings.tour.backdrop_field.title'),
                        description: this.intl.t('fleetbase.organization_settings.tour.backdrop_field.description'),
                    },
                    onHighlightStarted: scrollElementIntoView,
                },
            ],
        });

        driverObj.drive();
    }
}
