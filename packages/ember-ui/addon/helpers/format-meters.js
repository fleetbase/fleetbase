import { helper } from '@ember/component/helper';
import formatMetersUtils from '../utils/format-meters';

export default helper(function formatMeters([meters]) {
    return formatMetersUtils(meters);
});
