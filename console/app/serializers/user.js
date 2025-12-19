import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class UserSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     */
    get attrs() {
        return {
            role: { serialize: 'ids', deserialize: 'records' },
            policies: { serialize: 'ids', deserialize: 'records' },
            permissions: { serialize: 'ids', deserialize: 'records' },
        };
    }

    /**
     * Prevent partial payloads from overwriting fully-loaded
     * user records in the store.
     *
     * This runs ONLY on incoming data.
     */
    normalize(modelClass, resourceHash, prop) {
        let normalized = super.normalize(modelClass, resourceHash, prop);

        // Existing user already loaded in the store?
        let existing = this.store.peekRecord(normalized.data.type, normalized.data.id);

        if (existing) {
            let attrs = normalized.data.attributes || {};

            for (let key in attrs) {
                if (attrs[key] === null || attrs[key] === undefined) {
                    delete attrs[key];
                }
            }
        }

        return normalized;
    }

    /**
     * Customize serializer so that sensitive or server-managed
     * fields are never sent to the backend.
     */
    serialize() {
        const json = super.serialize(...arguments);

        // Never send password
        delete json.password;

        // Verification flags
        delete json.email_verified_at;
        delete json.phone_verified_at;

        // Server-managed timestamps
        delete json.deleted_at;
        delete json.created_at;
        delete json.updated_at;

        return json;
    }
}
