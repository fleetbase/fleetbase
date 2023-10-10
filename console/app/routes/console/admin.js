import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleAdminRoute extends Route {
    @service currentUser;
    @service notifications;

    beforeModel() {
        // USER MUST BE ADMIN
        if (!this.currentUser.user.is_admin) {
            return this.transitionTo('console').then(() => {
                this.notifications.error('You do not have authorization to access admin!');
            });
        }
    }
}
