import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class PortalController extends Controller {
    @service session;

    /**
     * Action handler.
     *
     * @void
     */
    @action onAction(action, ...params) {
        if (typeof this[action] === 'function') {
            this[action](...params);
        }
    }

    /**
     * Action to invalidate and log user out
     *
     * @void
     */
    @action invalidateSession(event) {
        console.log('invalidateSession', ...arguments)
        // event.preventDefault();
        this.session.invalidateWithLoader();
    }
}
