import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { format } from 'date-fns';

/**
 * Apps the signed-in user authorized with "Continue with Fleetbase", with Remove access.
 *
 * Renders nothing until the user has authorized an app, so the account page is unchanged
 * for everyone else.
 */
export default class AccountConnectedAppsComponent extends Component {
    @service fetch;
    @service notifications;
    @service intl;
    @service modalsManager;

    @tracked apps = [];

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    @action formatDate(value) {
        try {
            return format(new Date(value), 'PP');
        } catch (error) {
            return value;
        }
    }

    @task *load() {
        try {
            const payload = yield this.fetch.get('oauth-server/connected-apps');
            this.apps = Array.isArray(payload?.connected_apps) ? payload.connected_apps : [];
        } catch (error) {
            // Not fatal: the rest of the account page still works without this panel.
            this.apps = [];
        }
    }

    @task *revoke(connectedApp) {
        try {
            yield this.fetch.delete(`oauth-server/connected-apps/${connectedApp.id}`);
            this.apps = this.apps.filter((app) => app.id !== connectedApp.id);
            this.notifications.success(this.intl.t('oauth.connected-apps.removed', { app: connectedApp.app.name }));
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action confirmRevoke(connectedApp) {
        this.modalsManager.confirm({
            title: this.intl.t('oauth.connected-apps.remove-title', { app: connectedApp.app.name }),
            body: this.intl.t('oauth.connected-apps.remove-body', { app: connectedApp.app.name }),
            acceptButtonText: this.intl.t('oauth.connected-apps.remove-button'),
            acceptButtonScheme: 'danger',
            confirm: async (modal) => {
                modal.startLoading();
                await this.revoke.perform(connectedApp);
                modal.done();
            },
        });
    }
}
