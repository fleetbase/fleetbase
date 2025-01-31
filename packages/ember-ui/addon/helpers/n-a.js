import { helper } from '@ember/component/helper';
import { isBlank } from '@ember/utils';

export default helper(function nA([value, fallback = '-']) {
    if (isBlank(value)) {
        return fallback;
    } else {
        return value;
    }
});
