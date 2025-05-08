import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';

export default class ManagementContactsIndexRoute extends Route {
    @service store;
    @service loader;
    @service intl;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        status: { refreshModel: true },
        name: { refreshModel: true },
        title: { refreshModel: true },
        phone: { refreshModel: true },
        email: { refreshModel: true },
        type: { refreshModel: true },
        internal_id: { refreshModel: true },
        createdAt: { refreshModel: true },
        updatedAt: { refreshModel: true },
    };

    @action loading(transition) {
        this.loader.showOnInitialTransition(transition, 'section.next-view-section', {
            loadingMessage: this.intl.t('fleet-ops.common.loading-resource', { resourceName: 'Contacts' }),
        });
    }

    @action willTransition(transition) {
        if (isNestedRouteTransition(transition)) {
            set(this.queryParams, 'page.refreshModel', false);
            set(this.queryParams, 'sort.refreshModel', false);
        }
    }

    model(params) {
        return this.store.query('contact', { ...params, type: 'contact' });
    }
    resetController(controller, isExiting) {
        if (isExiting) {
            controller.set('page', 1);
        }
    }
}
