import { helper } from '@ember/component/helper';
import { isArray } from '@ember/array';

export default helper(function inArray([item, arr]) {
    return isArray(arr) && arr.includes(item);
});
