import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';

export default class AuthConfirmEmailChangeController extends Controller {
    @service fetch;
    @service notifications;
    @service router;
    @service intl;
    @service session;

    /**
     * The verification code query param.
     *
     * @memberof AuthConfirmEmailChangeController
     */
    @tracked code;

    /**
     * Query parameters.
     *
     * @memberof AuthConfirmEmailChangeController
     */
    queryParams = ['code'];

    /**
     * The confirm email change task.
     *
     * @memberof AuthConfirmEmailChangeController
     */
    @task *confirmEmailChange(event) {
        event?.preventDefault();

        const { code } = this;
        const { id } = this.model;

        try {
            yield this.fetch.post('auth/confirm-email-change', { link: id, code });
        } catch (error) {
            return this.notifications.serverError(error);
        }

        this.notifications.success(this.intl.t('auth.confirm-email-change.success-message'));

        if (this.session.isAuthenticated) {
            return this.router.transitionTo('console');
        }

        return this.router.transitionTo('auth.login');
    }
}
