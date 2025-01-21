import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class FuelReportSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            driver: { embedded: 'always' },
            vehicle: { embedded: 'always' },
            reporter: { embedded: 'always' },
        };
    }

    /**
     * Customize serializer so that any attributes that are instances of Models or objects
     * that are to accept and ID get serialized into the id only
     *
     * @param {Snapshot} snapshot
     * @param {Object} options
     * @return {Object} json
     */
    serialize() {
        const json = super.serialize(...arguments);

        // remove automatically set `reporter_uuid`
        delete json.reporter_uuid;

        return json;
    }
}
