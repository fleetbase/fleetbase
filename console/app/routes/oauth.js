import Route from '@ember/routing/route';
import removeBootLoader from '../utils/remove-boot-loader';

/**
 * Layout for "Continue with Fleetbase". Lives outside `console` so a signed-out user can land
 * here first; the child route decides whether to send them to sign in.
 */
export default class OauthRoute extends Route {
    beforeModel() {
        removeBootLoader();
    }
}
