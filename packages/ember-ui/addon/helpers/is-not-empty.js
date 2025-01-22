import { helper } from '@ember/component/helper';
import { isEmpty } from '@ember/utils';

export default helper(function isNotEmpty([subject]) {
    return !isEmpty(subject);
});
