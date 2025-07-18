import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ManagementLeavesIndexDetailsRoute extends Route {
    @service store;

    model(params) {
        return this.store.findRecord('leave', params.public_id);
    }
} 