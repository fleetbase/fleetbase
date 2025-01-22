import { helper } from '@ember/component/helper';
import or from '../utils/or';

export default helper(function getDefaultValue([...params]) {
    return or(...params);
});
