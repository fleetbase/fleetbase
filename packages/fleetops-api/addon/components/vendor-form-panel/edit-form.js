import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class VendorFormPanelEditFormComponent extends Component {
    @service store;
    @service intl;
    @service contextPanel;
    @tracked isIntegratedVendor;
    @tracked isEditingCredentials = false;
    @tracked showAdvancedOptions = false;

    constructor() {
        super(...arguments);
        this.vendor = this.args.vendor;
        this.isIntegratedVendor = this.vendor && this.vendor.type === 'integrated-vendor';
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
}
