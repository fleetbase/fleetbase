import { helper } from '@ember/component/helper';
import formatCurrencyUtil from '../utils/format-currency';

export default helper(function formatCurrency([amount = 0, currencyCode = 'USD']) {
    return formatCurrencyUtil(amount, currencyCode);
});
