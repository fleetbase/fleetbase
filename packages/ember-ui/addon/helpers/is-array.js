import { helper } from '@ember/component/helper';
import { isArray as EmberIsArray } from '@ember/array';

export default helper(function isArray([arg]) {
    return EmberIsArray(arg);
});
