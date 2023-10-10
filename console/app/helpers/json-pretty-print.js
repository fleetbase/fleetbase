import { helper } from '@ember/component/helper';

export default helper(function jsonPrettyPrint([json]) {
    return JSON.stringify(json, null, '  ');
});
