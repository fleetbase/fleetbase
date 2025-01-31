import { helper } from '@ember/component/helper';
import { dasherize } from '@ember/string';

export default helper(function safeDasherize([string]) {
    return dasherize(`${string}`);
});
