import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class OperationsOrderConfigRoute extends Route {
    @service loader;
    @service notifications;
    @service hostRouter;
    @service abilities;
    @service intl;

    queryParams = {
        config: {
            refreshModel: true,
        },
        tab: {
            refreshModel: false,
        },
        context: {
            refreshModel: false,
        },
        contextModel: {
            refreshModel: false,
        },
    };

    @action loading(transition) {
        this.loader.showOnInitialTransition(transition, 'section.next-view-section', {
            loadingMessage: this.intl.t('fleet-ops.operations.order-config.route-loading-message'),
        });
    }

    beforeModel() {
        if (this.abilities.cannot('fleet-ops list order-config')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.fleet-ops');
        }
    }
}
