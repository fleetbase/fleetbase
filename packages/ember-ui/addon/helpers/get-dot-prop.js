import { helper } from '@ember/component/helper';

export default helper(function getDotProp([object, key]) {
    if (object[key] === undefined) {
        return null;
    }

    return object[key];
});
