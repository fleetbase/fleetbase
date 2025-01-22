import { isBlank } from '@ember/utils';

export default function isEmptyObject(obj) {
    if (isBlank(obj)) {
        return true;
    }

    return obj.constructor === Object && Object.keys(obj).length === 0;
}
