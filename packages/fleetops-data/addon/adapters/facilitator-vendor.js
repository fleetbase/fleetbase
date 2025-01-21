import ApplicationAdapter from '@fleetbase/ember-core/adapters/application';

export default class FacilitatorVendorAdapter extends ApplicationAdapter {
    /**
     * Set the URL path for users endpoints
     *
     * @param {object} query
     * @return {String} originalUrl
     */
    urlForFindRecord(id, modelName, snapshot) {
        let baseUrl = this.buildURL('vendors/facilitators', id, snapshot);

        return baseUrl;
    }
}
