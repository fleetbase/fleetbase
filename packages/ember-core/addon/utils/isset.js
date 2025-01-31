import { isBlank } from '@ember/utils';
import { get } from '@ember/object';

export default function isset(target, key = null) {
    if (key === null) {
        return !isBlank(target);
    }

    return !isBlank(get(target, key));
}
