import { helper } from '@ember/component/helper';
import { isNone } from '@ember/utils';

export default helper(function isDdItemVisible([context, isVisible]) {
    if (isNone(context) || !isVisible) {
        return true;
    }

    if (typeof isVisible === 'boolean') {
        return isVisible;
    }

    if (typeof isVisible === 'function') {
        return isVisible(context);
    }

    return true;
});
