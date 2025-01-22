import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { isNone } from '@ember/utils';
import numbersOnly from '../utils/numbers-only';
import getCurrency from '../utils/get-currency';
import AutoNumeric from 'autonumeric';

export default class MoneyInputComponent extends Component {
    @service fetch;
    @service currentUser;
    @tracked currencies = getCurrency();
    @tracked value;
    @tracked currency;
    @tracked currencyData;
    @tracked autonumeric;

    constructor() {
        super(...arguments);

        let whois = this.currentUser.getOption('whois');

        this.value = this.args.value ?? 0;
        this.currency = this.args.currency ?? whois?.currency?.code ?? 'USD';
        this.currencyData = getCurrency(this.currency);
    }

    @action autoNumerize(element) {
        const { onCurrencyChange } = this.args;
        let currency = this.currencyData;
        let value = numbersOnly(this.value);
        let amount = !currency.decimalSeparator ? value : value / 100;

        this.autonumeric = new AutoNumeric(element, amount, this.getCurrencyFormatOptions(currency));

        // default the currency from currency data
        if (typeof onCurrencyChange === 'function') {
            onCurrencyChange(currency.code, currency);
        }

        element.addEventListener('autoNumeric:formatted', this.onFormatCompleted.bind(this));
    }

    @action setCurrency(currency) {
        const { onCurrencyChange } = this.args;

        if (this.autonumeric) {
            this.autonumeric.set(numbersOnly(this.value, true), this.getCurrencyFormatOptions(currency));
        }

        this.currency = currency.code;
        this.currencyData = currency;

        if (typeof onCurrencyChange === 'function') {
            onCurrencyChange(currency.code, currency);
        }
    }

    @action onFormatCompleted({ detail }) {
        const { onFormatCompleted, onChange } = this.args;

        // 300ms for format to apply to input ?
        later(
            this,
            () => {
                if (typeof onFormatCompleted === 'function') {
                    onFormatCompleted(detail);
                }
            },
            300
        );

        if (typeof onChange === 'function') {
            onChange(detail);
        }
    }

    @action getCurrencyFormatOptions(currency) {
        let options = {
            currencySymbol: isNone(currency.symbol) ? '$' : currency.symbol,
            currencySymbolPlacement: currency.symbolPlacement === 'before' ? 'p' : 's',
            decimalCharacter: isNone(currency.decimalSeperator) ? '.' : currency.decimalSeparator,
            decimalPlaces: isNone(currency.precision) ? 2 : currency.precision,
            digitGroupSeparator: isNone(currency.thousandSeparator) ? ',' : currency.thousandSeparator,
        };

        // decimal and thousand seperator cannot be the same, if they are revert the thousand seperator
        if (options.decimalCharacter === options.digitGroupSeparator) {
            options.digitGroupSeparator = ',';
        }

        return options;
    }
}
