import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import { get } from '@ember/object';
import { isArray } from '@ember/array';

export default class DriverSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {
    /**
     * Embedded relationship attributes
     *
     * @var {Object}
     */
    get attrs() {
        return {
            user: { embedded: 'always' },
            fleets: { embedded: 'always' },
            vendor: { embedded: 'always' },
            vehicle: { embedded: 'always' },
            devices: { embedded: 'always' },
            current_job: { embedded: 'always' },
            jobs: { embedded: 'always' },
        };
    }

    serializeBelongsTo(snapshot, json, relationship) {
        let key = relationship.key;

        if (key === 'fleets' || key === 'current_job' || key === 'user' || key === 'vendor') {
            return;
        }

        if (key === 'vehicle' && isArray(json[key])) {
            json[`${key}_uuid`] = get(json, `${key}.uuid`);
            return;
        }

        super.serializeBelongsTo(...arguments);
    }

    serializeHasMany(snapshot, json, relationship) {
        let key = relationship.key;

        if (key === 'jobs' || key === 'orders' || key == 'fleets') {
            return;
        }

        super.serializeHasMany(...arguments);
    }
}
