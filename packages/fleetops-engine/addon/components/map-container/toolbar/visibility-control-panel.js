import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { classify } from '@ember/string';
import { calculateInPlacePosition } from 'ember-basic-dropdown/utils/calculate-position';

/**
 * @class MapContainerToolbarVisibilityControlPanelComponent
 * @extends {Component}
 * @memberof @fleetbase/fleetops-engine
 */
export default class MapContainerToolbarVisibilityControlPanelComponent extends Component {
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

        // Additional check for event callback function in args
        const eventCallbackFn = `on${classify(callbackFn)}`;
        tryInvoke(this.args, eventCallbackFn);
    }
}
