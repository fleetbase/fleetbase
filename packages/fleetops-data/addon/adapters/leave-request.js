import ApplicationAdapter from '@fleetbase/ember-core/adapters/application';

export default class LeaveRequestAdapter extends ApplicationAdapter {
    // Force leave-request model to use the public API namespace
    namespace = 'api/v1';

    // Ensure queryRecord hits /api/v1/leave-requests
    urlForQueryRecord() {
        return `${this.host}/${this.namespace}/leave-requests`;
    }
}
