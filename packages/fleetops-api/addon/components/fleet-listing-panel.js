import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class FleetListingPanelComponent extends Component {
    /**
     * The fleet the listing is for.
     *
     * @type {Fleetmodel}
     * @memberof FleetListingPanelComponent
     */
    @tracked fleet;

    /**
     * Creates an instance of FleetListingPanelComponent.
     * @memberof FleetListingPanelComponent
     */
    constructor() {
        super(...arguments);
        this.fleet = this.args.fleet;
    }

    /**
     * Handle when fleet vehicle clicked.
     *
     * @param {VehicleModel} vehicle
     * @memberof FleetListingPanelComponent
     */
    @action onVehicleClicked(vehicle) {
        if (typeof this.args.onVehicleClicked === 'function') {
            this.args.onVehicleClicked(vehicle);
        }
    }
}
