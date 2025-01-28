import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class BaseController extends Controller {
    /**
     * Inject the `universe` service
     *
     * @var {Service}
     */
    @service universe;

    /**
     * Transitions to a specified route within the '@fleetbase/fleetops-engine' engine.
     *
     * This action is a wrapper around the `transitionToEngineRoute` method of the `universe` service (or object),
     * specifically targeting the '@fleetbase/fleetops-engine'. It allows for easy transitioning to routes
     * within this engine, abstracting away the need to repeatedly specify the engine name.
     *
     * @param {string} route - The route within the '@fleetbase/fleetops-engine' to transition to.
     * @param {...any} args - Additional arguments to pass to the transitionToEngineRoute method.
     * @returns {Promise} A Promise that resolves with the result of the transitionToEngineRoute method.
     *
     * @example
     * // To transition to the 'management.fleets.index.new' route within the '@fleetbase/fleetops-engine'
     * this.transitionToRoute('management.fleets.index.new');
     */
    @action transitionToRoute(route, ...args) {
        return this.universe.transitionToEngineRoute('@fleetbase/fleetops-engine', route, ...args);
    }
}
