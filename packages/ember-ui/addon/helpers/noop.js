import { helper } from '@ember/component/helper';
import noopFn from '../utils/noop';

export default helper(function noop() {
    return noopFn;
});
