import { helper } from '@ember/component/helper';

export default helper(function isBoolValue([value]) {
    if (typeof value === 'boolean') {
        return true;
    }

    if (typeof value === 'string') {
        return ['true', 'false', '1', '0'].includes(value);
    }

    return false;
});
