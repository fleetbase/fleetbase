import isset from './isset';
import isModel from './is-model';
import { underscore } from '@ember/string';

export default function isRelationMissing(model, relation, options = {}) {
    if (!isModel(model)) {
        return false;
    }

    relation = underscore(relation);

    const isMissingRelation = isset(model, `${relation}_uuid`) && !isset(model, ``);
    const isNotMissingPolymorphicType = isset(model, `${relation}_type`);

    if (isset(options, 'polymorphic') && options.polymorphic === true) {
        // no relation is set, so false
        return isNotMissingPolymorphicType && isset(model, `${relation}_uuid`);
    }

    return isMissingRelation;
}
