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
        if (!currency) {
            console.error('Currency data is missing.');
            return;
        }
        let value = numbersOnly(this.value);
        let amount = !currency.decimalSeparator ? value : value / 100;
        // Add these options to make zero values editable
        const options = this.getCurrencyFormatOptions(currency);
        options.emptyInputBehavior = "focus";  // Clear on focus if empty
        options.selectOnFocus = true; 
        this.autonumeric = new AutoNumeric(element, amount, options);
        // Add event listener for focusing
         element.addEventListener('focus', this.handleFocus.bind(this));

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
            // Add these additional options
            selectOnFocus: true,            // Select entire field on focus
            emptyInputBehavior: "focus"     // Clear on focus if empty
        };

        // decimal and thousand seperator cannot be the same, if they are revert the thousand seperator
        if (options.decimalCharacter === options.digitGroupSeparator) {
            options.digitGroupSeparator = ',';
        }

        return options;
    }

    /**
     * 
     * @param {*} event 
     */
    @action handleFocus(event) {
        // If the value is zero, clear it for easier editing
        if (parseFloat(this.autonumeric.getNumericString()) === 0) {
            this.autonumeric.set('');
        }
    }
}
