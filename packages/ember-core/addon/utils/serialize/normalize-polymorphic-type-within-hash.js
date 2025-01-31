import normalizePolymorphicType from './normalize-polymorphic-type';
import { isBlank } from '@ember/utils';
import { set } from '@ember/object';

export default function serializeNormalizePolymorphicTypeWithinHash(hash) {
    if (typeof hash !== 'object') {
        return hash;
    }

    for (let attr in hash) {
        if (typeof attr === 'string' && attr.includes('_type') && encodeURI(hash[attr]).includes('%5C')) {
            const emberPolymorphicType = normalizePolymorphicType(hash[attr]);
            const polymorphicRelationType = attr.replace(`_type`, ``);

            hash[attr] = emberPolymorphicType;

            // set the type of relationship using the polymorphic relation attr
            if (hash[polymorphicRelationType] && !isBlank(hash[polymorphicRelationType])) {
                if (hash[polymorphicRelationType].type) {
                    set(hash, `${polymorphicRelationType}._type`, hash[polymorphicRelationType].type);
                }
            }
        }
    }

    return hash;
}
