import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class VendorPanelDetailsComponent extends Component {
    @tracked isIntegratedVendor = false;
    @tracked vendor;
    constructor() {
        super(...arguments);
        this.vendor = this.args.vendor;
        this.isIntegratedVendor = this.vendor && this.vendor.type === 'integrated-vendor';
    }
}
