import { helper } from '@ember/component/helper';

export default helper(function jsonHash(positional, named) {
    let json = JSON.stringify(named);
    return json;
});
