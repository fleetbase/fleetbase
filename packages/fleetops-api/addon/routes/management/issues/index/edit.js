import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementIssuesIndexEditRoute extends Route {
    @service store;
    @service notifications;
    @service hostRouter;
    @service abilities;
    @service intl;

    @action error(error) {
        this.notifications.serverError(error);
        if (typeof error.message === 'string' && error.message.endsWith('not found')) {
            return this.hostRouter.transitionTo('console.fleet-ops.management.issues.index');
        }
    }

    beforeModel() {
        if (this.abilities.cannot('fleet-ops update issue')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.fleet-ops.management.issues.index');
        }
    }

    model({ public_id }) {
        return this.store.queryRecord('issue', { public_id, single: true, with: ['driver', 'vehicle', 'assignee', 'reporter'] });
    }
}
