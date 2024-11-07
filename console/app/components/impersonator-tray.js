import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';

export default class ImpersonatorTrayComponent extends Component {
    @service session;
    @service notifications;
    @service router;
    @service fetch;

    get isImpersonator() {
        return typeof this.session.data?.authenticated?.impersonator === 'string';
    }

    /**
     * Restore session
     *
     * @memberof ConsoleAdminOrganizationsIndexUsersController
     */
    @action async restoreSession() {
        try {
            const { token } = await this.fetch.delete('auth/impersonate');
            await this.router.transitionTo('console');
            this.session.manuallyAuthenticate(token);
            this.notifications.info(`Ending impersonation session.`);
            later(
                this,
                () => {
                    window.location.reload();
                },
                600
            );
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}
