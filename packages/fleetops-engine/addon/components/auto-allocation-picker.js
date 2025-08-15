import Component from '@glimmer/component';

export default class AutoAllocationPickerComponent extends Component {

    get fleetOptions() {
        return this.args.fleetOptions || [];
    }

    get selectedFleet() {
        return this.args.selectedFleet;
    }

    get autoAllocationDate() {
        return this.args.autoAllocationDate;
    }
}
