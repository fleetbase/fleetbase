import { helper } from '@ember/component/helper';

export default helper(function flowRawStatus([status]) {
    if (!status || typeof status !== 'string') {
        return '';
    }

    if (status.includes('|')) {
        return status.slice(status.indexOf('|') + 1);
    }

    return status;
});
