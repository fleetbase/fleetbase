import ApplicationAdapter from '@fleetbase/ember-core/adapters/application';

export default class CustomerVendorAdapter extends ApplicationAdapter {
    /**
     * Set the URL path for users endpoints
     *
     * @param {object} query
     * @return {String} originalUrl
     */
    urlForFindRecord(id, modelName, snapshot) {
        let baseUrl = this.buildURL('vendors/customers', id, snapshot);

        return baseUrl;
    }
}
