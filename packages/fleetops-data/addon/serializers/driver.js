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
            fleet: { embedded: 'always' },
            vendor: { embedded: 'always' },
            vehicle: { embedded: 'always' },
            devices: { embedded: 'always' },
            current_job: { embedded: 'always' },
            jobs: { embedded: 'always' },
        };
    }

    serializeBelongsTo(snapshot, json, relationship) {
        let key = relationship.key;

        if (['fleet', 'current_job', 'user', 'vendor'].includes(key)) {
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

        if (['jobs', 'orders'].includes(key)) {
            return;
        }

        super.serializeHasMany(...arguments);
    }

    normalize(modelClass, resourceHash) {
        // Case 1: fleet object is embedded (normal flow)
        if (resourceHash.fleet && typeof resourceHash.fleet === 'object') {
            resourceHash.fleet_id = resourceHash.fleet.id || resourceHash.fleet.uuid;
        }

        // Case 2: backend only gave fleet_uuid
        if (!resourceHash.fleet && resourceHash.fleet_uuid) {
            resourceHash.fleet = {
                id: resourceHash.fleet_uuid,
                uuid: resourceHash.fleet_uuid,
                name: '(Unknown Fleet)', // placeholder text you control
            };
            resourceHash.fleet_id = resourceHash.fleet_uuid;
        }

        return super.normalize(modelClass, resourceHash);
    }
}
