import { helper } from '@ember/component/helper';
import calculatePercentage from '../utils/calculate-percentage';
import formatCurrency from '../utils/format-currency';

export default helper(function getTipAmount([tip, subtotal, format = false]) {
    let tipAmount = 0;

    if (typeof tip === 'string' && tip.endsWith('%')) {
        tipAmount = calculatePercentage(parseInt(tip), subtotal);
    } else {
        tipAmount = tip;
    }

    if (format !== false) {
        return formatCurrency(tipAmount, format);
    }

    return tipAmount;
});
