import { helper } from '@ember/component/helper';
import formatDurationUtil from '../utils/format-duration';

export default helper(function formatDuration([secs]) {
    return formatDurationUtil(secs);
});
