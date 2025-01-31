import { helper } from '@ember/component/helper';
import formatBytesUtil from '../utils/format-bytes';

export default helper(function formatBytes([bytes, decimals = 2]) {
    return formatBytesUtil(bytes, decimals);
});
