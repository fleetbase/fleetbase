import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import removeBootLoader from '../../utils/remove-boot-loader';

/**
 * Landing page for the verification link an administrator sends from IAM. The
 * link confirms the user's email address or phone number without signing in.
 */
export default class AuthVerifyContactRoute extends Route {
    @service store;
    @service fetch;
    @service router;
    @service notifications;
    @service intl;

    @action activate() {
        removeBootLoader();
    }

    async model({ id }) {
        const [email, phone] = await Promise.all([
            this.fetch.get('auth/validate-verification', { id, for: 'email_verification' }),
            this.fetch.get('auth/validate-verification', { id, for: 'phone_verification' }),
        ]);

        return {
            id,
            is_valid: Boolean(email?.is_valid || phone?.is_valid),
            channel: phone?.is_valid ? 'phone' : 'email',
        };
    }

    async setupController(controller, model) {
        super.setupController(...arguments);
        if (model.is_valid === false) {
            this.notifications.warning(this.intl.t('auth.verify-contact.invalid-link'));
            return this.router.transitionTo('auth.login');
        }

        controller.brand = await this.store.findRecord('brand', 1);
    }
}
