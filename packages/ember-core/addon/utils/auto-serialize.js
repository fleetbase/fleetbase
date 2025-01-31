import Model from '@ember-data/model';
import { isArray } from '@ember/array';
import { get } from '@ember/object';
import { isEmpty } from '@ember/utils';

const _isEmpty = (value) => {
    let empty = isEmpty(value);

    if (empty) {
        return empty;
    }

    // edge case for empty object {}
    if (typeof value === 'object' && Object.values(value).length === 0) {
        return true;
    }

    return empty;
};

const invoke = (context, method, ...params) => {
    if (typeof context.method === 'function') {
        return context.method(...params);
    }

    return null;
};

const serialize = (model) => {
    let serializerMethods = ['toJSON', 'toJson', 'serialize'];

    for (let i = 0; i < serializerMethods.length; i++) {
        const serializer = serializerMethods.objectAt(i);
        const serialized = invoke(model, serializer);

        if (!_isEmpty(serialized)) {
            return serialized;
        }
    }

    return autoSerialize(model);
};

export default function autoSerialize(model, except = []) {
    if (isArray(model)) {
        return model.map((record) => autoSerialize(record, except));
    }

    if (!(model instanceof Model)) {
        return {};
    }

    // hacky patch
    const modelName = get(model, '_internalModel.modelName');

    if (modelName === 'fleet') {
        except.push('drivers');
    }

    if (modelName === 'zone') {
        except.push('service_area');
    }

    const serialized = {};

    // set uuid from id
    serialized.id = model.id;
    serialized.uuid = model.id;

    // serialize attributes
    model.eachAttribute((attr) => {
        if (except.includes(attr)) {
            return;
        }

        serialized[attr] = model[attr];
    });

    // serialize relationships
    model.eachRelationship((attr, descriptor) => {
        const { kind } = descriptor;

        if (except.includes(attr)) {
            return;
        }

        if (_isEmpty(model.get(attr))) {
            serialized[attr] = null;
            return;
        }

        if (kind === 'hasMany') {
            serialized[attr] = [];
        } else {
            serialized[attr] = serialize(model[attr]);
        }
    });

    return serialized;
}
