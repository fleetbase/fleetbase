import { helper } from '@ember/component/helper';

export default helper(function now(positional = []) {
    return new Date(...positional);
});
