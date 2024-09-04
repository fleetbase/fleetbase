import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AuthPortalLoginRoute extends Route {
    @service session;

    /**
     * If user is authentication redirect to portal.
     *
     * @memberof AuthPortalLoginRoute
     * @void
     */
    beforeModel() {
        this.session.prohibitAuthentication('portal');
    }
}
