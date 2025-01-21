import ApplicationAdapter from '@fleetbase/ember-core/adapters/application';

export default class FacilitatorContactAdapter extends ApplicationAdapter {
    /**
     * Set the URL path for users endpoints
     *
     * @param {object} query
     * @return {String} originalUrl
     */
    urlForFindRecord(id, modelName, snapshot) {
        let baseUrl = this.buildURL('contacts/facilitators', id, snapshot);

        return baseUrl;
    }
}
