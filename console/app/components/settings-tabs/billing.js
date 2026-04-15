import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * Billing tab for the Operations Settings screen.
 *
 * Emits a flat-dot-notation payload to the parent `onSave` action:
 *
 *   {
 *     'billing.default_payment_terms_days': <int>,
 *     'billing.default_billing_frequency': <string>,
 *     'billing.invoice_number_prefix':     <string>,
 *     'billing.invoice_number_next':       <int>,
 *     'billing.default_currency':          <string>,
 *   }
 *
 * `default_charge_template_uuid` is intentionally NOT exposed here — it
 * requires a charge-template lookup UI which is out of scope for Task 10.
 */
export default class SettingsTabsBillingComponent extends Component {
    @tracked paymentTermsDays = String(this.args.values?.default_payment_terms_days ?? 30);
    @tracked billingFrequency = this.args.values?.default_billing_frequency ?? 'per_shipment';
    @tracked invoicePrefix = this.args.values?.invoice_number_prefix ?? 'INV';
    @tracked invoiceNext = String(this.args.values?.invoice_number_next ?? 1);
    @tracked currency = this.args.values?.default_currency ?? 'USD';

    @action updatePaymentTermsDays(event) {
        this.paymentTermsDays = event.target.value;
    }
    @action updateBillingFrequency(event) {
        this.billingFrequency = event.target.value;
    }
    @action updateInvoicePrefix(event) {
        this.invoicePrefix = event.target.value;
    }
    @action updateInvoiceNext(event) {
        this.invoiceNext = event.target.value;
    }
    @action updateCurrency(event) {
        this.currency = event.target.value;
    }

    @action
    submit(event) {
        event.preventDefault();
        const payload = {
            'billing.default_payment_terms_days': parseInt(this.paymentTermsDays, 10) || 0,
            'billing.default_billing_frequency': this.billingFrequency,
            'billing.invoice_number_prefix': this.invoicePrefix,
            'billing.invoice_number_next': parseInt(this.invoiceNext, 10) || 1,
            'billing.default_currency': (this.currency || '').toUpperCase().slice(0, 3),
        };
        this.args.onSave?.(payload);
    }
}
