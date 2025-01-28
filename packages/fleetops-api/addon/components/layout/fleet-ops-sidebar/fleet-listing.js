import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { task } from 'ember-concurrency-decorators';

export default class LayoutFleetOpsSidebarFleetListingComponent extends Component {
    @service store;
    @service universe;
    @service contextPanel;
    @service vehicleActions;
    @service hostRouter;
    @service abilities;
    @service notifications;
    @tracked fleets = [];

    constructor() {
        super(...arguments);
        this.fetchFleets.perform();
        this.listenForChanges();
    }

    dropdownButtonActions = [
        {
            label: 'View vehicle details...',
            onClick: (vehicle) => {
                this.contextPanel.focus(vehicle);
            },
        },
        {
            label: 'Edit vehicle...',
            onClick: (vehicle) => {
                this.contextPanel.focus(vehicle, 'editing');
            },
        },
        {
            label: 'Locate vehicle...',
            onClick: (vehicle) => {
                // If currently on the operations dashboard focus driver on the map
                if (typeof this.hostRouter.currentRouteName === 'string' && this.hostRouter.currentRouteName.startsWith('console.fleet-ops.operations.orders')) {
                    return this.onVehicleClicked(vehicle);
                }

                this.vehicleActions.locate(vehicle);
            },
        },
        {
            separator: true,
        },
        {
            label: 'Delete vehicle...',
            onClick: (vehicle) => {
                this.vehicleActions.delete(vehicle);
            },
        },
    ];

    @action transitionToRoute(toggleApiContext) {
        if (typeof this.args.route === 'string') {
            if (typeof this.hostRouter.currentRouteName === 'string' && this.hostRouter.currentRouteName.startsWith('console.fleet-ops.management.fleets.index')) {
                if (typeof toggleApiContext.toggle === 'function') {
                    toggleApiContext.toggle();
                }
            }

            this.hostRouter.transitionTo(this.args.route);
        }
    }

    @action onVehicleClicked(vehicle) {
        // Transition to dashboard/map display
        return this.hostRouter.transitionTo('console.fleet-ops.operations.orders.index', { queryParams: { layout: 'map' } }).then(() => {
            // Focus vehicle on live map
            this.focusVehicleOnMap(vehicle);

            // Fire callback
            if (typeof this.args.onFocusVehicle === 'function') {
                this.args.onFocusVehicle(vehicle);
            }
        });
    }

    @action calculateDropdownItemPosition(trigger) {
        let { top, left, width } = trigger.getBoundingClientRect();
        let style = {
            left: 11 + left + width,
            top: top + 2,
        };

        return { style };
    }

    @action focusVehicleOnMap(vehicle) {
        const liveMap = this.universe.get('component:fleet-ops:live-map');

        if (liveMap) {
            if (liveMap.contextPanel) {
                liveMap.contextPanel.clear();
            }

            liveMap.showAll();
            liveMap.focusLayerByRecord(vehicle, 16, {
                onAfterFocusWithRecord: function () {
                    later(
                        this,
                        () => {
                            liveMap.onVehicleClicked(vehicle);
                        },
                        600 * 2
                    );
                },
            });
        }
    }

    listenForChanges() {
        // when a vehicle is assigned/ or unassigned reload
        this.universe.on('fleet-ops.fleet.vehicle_assigned', () => {
            this.fetchFleets.perform();
        });

        // when a vehicle is assigned/ or unassigned reload
        this.universe.on('fleet-ops.fleet.vehicle_unassigned', () => {
            this.fetchFleets.perform();
        });

        // when a driver is assigned/ or unassigned reload
        this.universe.on('fleet-ops.fleet.driver_assigned', () => {
            this.fetchFleets.perform();
        });

        // when a driver is assigned/ or unassigned reload
        this.universe.on('fleet-ops.fleet.driver_unassigned', () => {
            this.fetchFleets.perform();
        });
    }

    @task *fetchFleets() {
        if (this.abilities.cannot('fleet-ops list fleet')) {
            return;
        }

        try {
            this.fleets = yield this.store.query('fleet', { with: ['vehicles', 'subfleets'], parents_only: true });
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}
