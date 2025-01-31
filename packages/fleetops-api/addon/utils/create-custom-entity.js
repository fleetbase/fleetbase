import ObjectProxy from '@ember/object/proxy';
import config from '../config/environment';
import generateUUID from '@fleetbase/ember-core/utils/generate-uuid';
import { get } from '@ember/object';

export default function createCustomEntity(name = '', type = '', description = '', props = {}) {
    return ObjectProxy.create({
        content: {
            id: generateUUID(),
            name,
            description,
            type,
            dimensions_unit: 'cm',
            weight_unit: 'kg',
            photo_url: typeof props.photo_url === 'string' ? props.photo_url : get(config, 'defaultValues.entityImage'),
            ...props,
            _internalModel: {
                modelName: 'custom-entity',
            },
        },
    });
}
