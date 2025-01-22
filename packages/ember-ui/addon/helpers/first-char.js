import { helper } from '@ember/component/helper';

export default helper(function firstChar([words]) {
    return words[0] ?? '';
});
