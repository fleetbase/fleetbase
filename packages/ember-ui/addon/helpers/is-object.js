import { helper } from '@ember/component/helper';

export default helper(function isObject([obj]) {
    return obj && typeof obj === 'object' && Object.prototype.toString.call(obj) === '[object Object]';
});
