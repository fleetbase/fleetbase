import formatDateUtil from '../utils/format-date';
import { helper } from '@ember/component/helper';
import { isBlank } from '@ember/utils';
import { parse } from 'date-fns';

export default helper(function formatDate([dateInstance, formatString = 'PPP p', parseOptions = null]) {
    if (typeof formatString === 'object' && !isBlank(formatString)) {
        parseOptions = formatString;
        formatString = 'PPP p';
    }

    if (typeof dateInstance === 'string') {
        if (!isBlank(parseOptions) && typeof parseOptions.formatString === 'string') {
            dateInstance = parse(dateInstance, parseOptions.formatString, new Date(), parseOptions.options ?? {});
        } else {
            dateInstance = new Date(dateInstance);
        }
    }

    return formatDateUtil(dateInstance, formatString);
});
