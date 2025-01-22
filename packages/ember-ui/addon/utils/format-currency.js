import getCurrency from './get-currency';
import formatMoney from '@fleetbase/ember-accounting/utils/format-money';

export default function formatCurrency(amount = 0, currencyCode = 'USD') {
    let currency = getCurrency(currencyCode);

    return formatMoney(!currency.decimalSeparator ? amount : amount / 100, currency.symbol, currency.precision, currency.thousandSeparator, currency.decimalSeparator);
}
