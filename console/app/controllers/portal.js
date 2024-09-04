import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class PortalController extends Controller {
    @service session;

    /**
     * Action to invalidate and log user out
     *
     * @void
     */
    @action invalidateSession(event) {
        event.preventDefault();
        this.session.invalidateWithLoader();
    }
}
