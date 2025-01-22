import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class RolesRoute extends Route {
    @service abilities;
    @service notifications;
    @service hostRouter;
    @service intl;

    beforeModel() {
        if (this.abilities.cannot('iam list role')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.iam.home');
        }
    }
}
