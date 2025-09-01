import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ApplicationRoute extends Route {
    @service notifications;
    @service hostRouter;
    @service abilities;
    @service intl;
    @service currentUser;


    model() {
        return {
            currentUser: this.currentUser,
            isAdmin: this.currentUser.isAdmin,
            roleName: this.currentUser.roleName,
            role: this.currentUser.role
        };
    }
    
    beforeModel() {
        if (this.abilities.cannot('iam see extension')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console');
        }
    }
}
