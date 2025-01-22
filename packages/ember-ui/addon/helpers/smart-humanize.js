import { helper } from '@ember/component/helper';
import smartHumanizeUtil from '../utils/smart-humanize';

export default helper(function smartHumanize([string]) {
    return smartHumanizeUtil(string);
});
