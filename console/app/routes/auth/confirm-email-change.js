import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import removeBootLoader from '../../utils/remove-boot-loader';

export default class AuthConfirmEmailChangeRoute extends Route {
    @service store;
    @service fetch;
    @service router;
    @service notifications;
    @service intl;

    @action activate() {
        removeBootLoader();
    }

    async model({ id }) {
        return this.fetch.get('auth/validate-verification', { id, for: 'email_change' });
    }

    async setupController(controller, model) {
        super.setupController(...arguments);
        if (model.is_valid === false) {
            this.notifications.warning(this.intl.t('auth.confirm-email-change.invalid-verification-code'));
            return this.router.transitionTo('auth.login');
        }

        controller.brand = await this.store.findRecord('brand', 1);
    }
}
