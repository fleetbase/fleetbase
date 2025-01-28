import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { task } from 'ember-concurrency';
import apiUrl from '@fleetbase/ember-core/utils/api-url';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';

export default class VendorFormPanelCreateFormComponent extends Component {
    @service store;
    @service fetch;
    @service intl;
    @service contextPanel;
    @service notifications;

    /**
     * State of whether editing credentials is enabled.
     * @type {Boolean}
     */
    @tracked isEditingCredentials = false;

    /**
     * State of whether to show advanced options for integrated vendor.
     * @type {Boolean}
     */
    @tracked showAdvancedOptions = false;

    /**
     * The selectable types of vendors.
     * @type {Array}
     */
    @tracked vendorTypes = [
        { label: this.intl.t('fleet-ops.component.vendor-form-panel.create-form.integrated-vendor'), value: 'integrated-vendor' },
        { label: this.intl.t('fleet-ops.component.vendor-form-panel.create-form.custom-vendor'), value: 'vendor' },
    ];

    /**
     * The selected type of vendor being created or edited.
     * @type {String}
     */
    @tracked selectedVendorType = this.vendorTypes[1];

    /**
     * The supported integrated vendors.
     * @type {Array}
     */
    @tracked supportedIntegratedVendors = [];

    /**
     * The selected integrated vendor provider.
     * @type {Object}
     */
    @tracked selectedIntegratedVendor;

    constructor() {
        super(...arguments);
        this.vendor = this.args.vendor;
        this.fetchSupportedIntegratedVendors.perform();
    }

    @action toggleCredentialsReset() {
        if (this.isEditingCredentials) {
            this.isEditingCredentials = false;
        } else {
            this.isEditingCredentials = true;
        }
    }

    @action toggleAdvancedOptions() {
        if (this.showAdvancedOptions) {
            this.showAdvancedOptions = false;
        } else {
            this.showAdvancedOptions = true;
        }
    }

    @action onSelectVendorType(selectedVendorType) {
        this.selectedVendorType = selectedVendorType;
    }

    @action onSelectIntegratedVendor(integratedVendor) {
        this.selectedIntegratedVendor = integratedVendor;
        const { credential_params, option_params } = integratedVendor;

        // create credentials object
        const credentials = {};
        if (isArray(integratedVendor.credential_params)) {
            for (let i = 0; i < integratedVendor.credential_params.length; i++) {
                const param = integratedVendor.credential_params.objectAt(i);
                credentials[param] = null;
            }
        }

        // create options object
        const options = {};
        if (isArray(integratedVendor.option_params)) {
            for (let i = 0; i < integratedVendor.option_params.length; i++) {
                const param = integratedVendor.option_params.objectAt(i);
                options[param.key] = null;
            }
        }

        const vendor = this.store.createRecord('integrated-vendor', {
            provider: integratedVendor.code,
            webhook_url: apiUrl(`listeners/${integratedVendor.code}`),
            credentials: {},
            options: {},
            credential_params,
            option_params,
        });

        this.vendor = vendor;

        // trigger callback
        contextComponentCallback(this, 'onVendorChanged', vendor);
    }

    @action selectVendorAddress(place) {
        this.vendor.place = place;
        this.vendor.place_uuid = place.id;
    }

    @action async editAddress() {
        let place;

        if (this.vendor.has_place) {
            place = await this.vendor.place;
        } else {
            place = this.store.createRecord('place');
        }

        return this.contextPanel.focus(place, 'editing', {
            onAfterSave: (place) => {
                this.selectVendorAddress(place);
                this.contextPanel.clear();
            },
        });
    }

    /**
     * Fetches the supported integrated vendors.
     *
     * @returns {Promise}
     */
    @task *fetchSupportedIntegratedVendors() {
        try {
            this.supportedIntegratedVendors = yield this.fetch.get('integrated-vendors/supported');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}
