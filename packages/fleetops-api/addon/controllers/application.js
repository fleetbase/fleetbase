import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { computed, action } from '@ember/object';

export default class ApplicationController extends BaseController {
    @service hostRouter;
    @service contextPanel;
    @tracked routes = ['console.fleet-ops.operations', 'console.fleet-ops.management', 'console.fleet-ops.comms'];
    @tracked settingsContext;

    @action setSettingsContext(context) {
        this.settingsContext = context;
    }

    @action toggleSettings() {
        this.settingsContext?.toggle();
    }

    @action closeSettings() {
        this.settingsContext?.close();
    }

    @action openOrderConfigManager() {
        this.contextPanel.focus('orderConfigManager');
    }

    @action isRouteActive(route) {
        const currentRouteName = this.hostRouter.currentRouteName;
        const contains = (haystack, needle) => haystack.includes(needle);

        return contains(currentRouteName, route);
    }

    @action createOrder() {
        return this.transitionToRoute('operations.orders.index.new');
    }

    @computed('routes.[]') get isOpsNavigationsActive() {
        const allRoutesInactive = this.routes.every((route) => !this.isRouteActive(route));

        return this.isRouteActive('console.fleet-ops.operations') || allRoutesInactive || true;
    }
}
