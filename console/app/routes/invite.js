import Route from '@ember/routing/route';
import removeBootLoader from '../utils/remove-boot-loader';

export default class InviteRoute extends Route {
    activate() {
        removeBootLoader();
    }
}
