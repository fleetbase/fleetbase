import ApplicationAdapter from './application';

export default class UserAdapter extends ApplicationAdapter {
    /**
     * Set the URL path for users endpoints
     *
     * @param {object} query
     * @return {String} originalUrl
     */
    urlForQueryRecord(query) {
        let originalUrl = super.urlForQueryRecord(...arguments);
        if (query.me) {
            delete query.me;
            return `${originalUrl}/me`;
        }

        return originalUrl;
    }
}
