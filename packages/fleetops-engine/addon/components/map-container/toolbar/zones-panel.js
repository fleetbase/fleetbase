import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { classify } from '@ember/string';
import { calculateInPlacePosition } from 'ember-basic-dropdown/utils/calculate-position';
import { task } from 'ember-concurrency-decorators';

/**
 * @class MapContainerToolbarZonesPanelComponent
 * @extends {Component}
 * @memberof @fleetbase/fleetops-engine
 */
export default class MapContainerToolbarZonesPanelComponent extends Component {
    /**
     * Ember Data store service.
     * @type {Service}
     * @memberof MapContainerToolbarZonesPanelComponent
     */
    @service store;

    /**
     * Service areas service.
     * @type {Service}
     * @memberof MapContainerToolbarZonesPanelComponent
     */
    @service serviceAreas;

    /**
     * Application cache service.
     * @type {Service}
     * @memberof MapContainerToolbarZonesPanelComponent
     */
    @service appCache;

    /**
     * Indicates if the component is in a loading state.
     * @type {boolean}
     * @memberof MapContainerToolbarZonesPanelComponent
     */
    @tracked isLoading = false;

    /**
     * Holds the records for service areas.
     * @type {Array}
     * @memberof MapContainerToolbarZonesPanelComponent
     */
    @tracked serviceAreaRecords = [];

    /**
     * Reference to the map instance.
     * @type {L.Map}
     * @memberof MapContainerToolbarZonesPanelComponent
     */
    @tracked map;

    /**
     * Reference to the live map component instance.
     * @type {LiveMapComponent}
     * @memberof MapContainerToolbarZonesPanelComponent
     */
    @tracked liveMap;

    /**
     * Class constructor.
     * @memberof MapContainerToolbarZonesPanelComponent
     */
    constructor() {
        super(...arguments);

        this.map = this.args.map;
        this.liveMap = this.args.liveMap;
        this.serviceAreas.setMapInstance(this.args.map);

        later(
            this,
            () => {
                this.fetchServiceAreas.perform();
            },
            100
        );
    }

    /**
     * Calculate position for dropdown.
     * @param {Element} trigger The triggering element
     * @returns {Object} Position style object
     * @memberof MapContainerToolbarZonesPanelComponent
     */
    @action calculatePosition(trigger) {
        const position = calculateInPlacePosition(...arguments);
        const rect = trigger.getBoundingClientRect();

        position.style.top = '-0.5rem';
        position.style.left = `calc(${rect.width}px + 0.75rem)`;

        return position;
    }

    /**
     * Generic callback trigger function.
     * @param {string} callbackFn Callback function name
     * @param {...any} params Parameters for the callback function
     * @memberof MapContainerToolbarZonesPanelComponent
     */
    @action triggerCallback(callbackFn, ...params) {
        const tryInvoke = (context, fnName) => {
            if (context && typeof context[fnName] === 'function') {
                context[fnName](...params);
            }
        };

        tryInvoke(this, callbackFn);
        tryInvoke(this.args, callbackFn);
        tryInvoke(this.liveMap, callbackFn);
        tryInvoke(this.serviceAreas, callbackFn);

        // Additional check for event callback function in args
        const eventCallbackFn = `on${classify(callbackFn)}`;
        tryInvoke(this.args, eventCallbackFn);
    }

    /**
     * Fetch service areas and update state.
     * @memberof MapContainerToolbarZonesPanelComponent
     */
    @task *fetchServiceAreas() {
        if (this.appCache.has('serviceAreas')) {
            this.serviceAreaRecords = this.appCache.getEmberData('serviceAreas', 'service-area');
        }

        const serviceAreas = yield this.store.query('service-area', { with: ['zones'] });

        this.serviceAreaRecords = serviceAreas;
        this.appCache.setEmberData('serviceAreas', serviceAreas);
    }
}
