import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AuthLoginRoute extends Route {
    @service session;

    /**
     * If user is authentication redirect to console.
     *
     * @memberof AuthLoginRoute
     * @void
     */
    beforeModel() {
        this.session.prohibitAuthentication('console');
    }
}
