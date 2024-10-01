import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class UserSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            role: { serialize: 'ids', deserialize: 'records' },
            policies: { serialize: 'ids', deserialize: 'records' },
            permissions: { serialize: 'ids', deserialize: 'records' },
        };
    }

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
        // delete verification attributes
        delete json.email_verified_at;
        delete json.phone_verified_at;

        // delete server managed dates
        delete json.deleted_at;
        delete json.created_at;
        delete json.updated_at;

        return json;
    }
}
