import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import window from 'ember-window-mock';

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

            // Handed back so the caller can cancel the pending reload. Without this the
            // timer is unreachable once scheduled and always reloads the window.
            return later(() => window.location.reload(), 600);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}
