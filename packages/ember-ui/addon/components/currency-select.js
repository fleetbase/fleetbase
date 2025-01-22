import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import getCurrency from '../utils/get-currency';

export default class CurrencySelectComponent extends Component {
    @service currentUser;
    @tracked currencies = getCurrency();
    @tracked currency;
    @tracked currencyData;

    constructor() {
        super(...arguments);

        let whois = this.currentUser.getOption('whois');

        this.currency = this.args.currency ?? whois?.currency?.code ?? 'USD';
        this.currencyData = this.args.currencyData ?? getCurrency(this.currency);
    }

    @action onChange(currency) {
        const { onChange, onCurrencyChange } = this.args;

        this.currency = currency.code;
        this.currencyData = currency;

        if (typeof onCurrencyChange === 'function') {
            onCurrencyChange(currency.code, currency);
        }

        if (typeof onChange === 'function') {
            onChange(currency);
        }
    }

    @action searchCurrencies(currency, term) {
        if (!term || typeof term !== 'string') {
            return -1;
        }

        let name = `${currency.title} ${currency.code} ${currency.iso2}`.toLowerCase();

        return name.indexOf(term.toLowerCase());
    }
}
