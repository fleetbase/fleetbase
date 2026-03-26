import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

/**
 * Serializer for the Template model.
 *
 * Uses EmbeddedRecordsMixin so that the `queries` hasMany relationship is
 * included inline in the save payload (both create and update requests).
 * The backend TemplateController._syncQueries() reads this array and upserts
 * or deletes TemplateQuery records accordingly.
 *
 * Serialization behaviour:
 *   - `queries` are embedded as `always` — they are included when serializing
 *     (save) and deserialized when normalizing (load) the template response.
 *   - The mixin's default `serializeHasMany` is suppressed for `queries` so
 *     that we can emit the plain array directly (the backend expects a flat
 *     array of query attribute objects, not JSON:API relationship links).
 */
export default class TemplateSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes.
     *
     * @var {Object}
     */
    get attrs() {
        return {
            queries: { embedded: 'always' },
        };
    }
}
