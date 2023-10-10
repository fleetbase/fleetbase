import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';

export default class UserSerializer extends ApplicationSerializer {
    /**
     * Customize serializer so that the password is never sent to the server via Ember Data
     *
     * @param {Snapshot} snapshot
     * @param {Object} options
     * @return {Object} json
     */
    serialize() {
        const json = super.serialize(...arguments);

        // delete the password always
        delete json.password;

        return json;
    }
}
