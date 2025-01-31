import { helper } from '@ember/component/helper';

export default helper(function formatMilliseconds([milliseconds]) {
    if (!milliseconds || typeof milliseconds !== 'number') {
        return '-';
    }

    return milliseconds.toString().startsWith(0) ? `${milliseconds.toFixed(3).substring(2)}ms` : `${milliseconds.toFixed(3)}s`;
});
