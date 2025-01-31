import CoreObject from '@ember/object/core';
import { getOwner } from '@ember/application';

class ToModel extends CoreObject {
    fn(record, modelName) {
        const owner = getOwner(this);
        const store = owner.lookup('service:store');
        const normalized = store.normalize(modelName, record);

        return store.push(normalized);
    }
}

const toModel = (record, modelName) => {
    return ToModel.create().fn(record, modelName);
};

export default toModel;
