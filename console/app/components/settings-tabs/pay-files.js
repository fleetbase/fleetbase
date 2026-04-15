import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * Pay-files tab. Emits:
 *
 *   {
 *     'pay_files.default_format':         'csv'|'ach_nacha'|'iif',
 *     'pay_files.default_frequency':      'daily'|'weekly'|'biweekly'|'monthly',
 *     'pay_files.default_day_of_week':    0-6,
 *     'pay_files.default_recipients':     [emails],
 *     'pay_files.default_payment_method': 'ach'|'check'|'wire'|'card',
 *   }
 *
 * Note the category prefix uses the underscored form `pay_files.*` even
 * though the URL slug is hyphenated — backend resolver expects underscore.
 */
export default class SettingsTabsPayFilesComponent extends Component {
    @tracked defaultFormat = this.args.values?.default_format ?? 'csv';
    @tracked defaultFrequency = this.args.values?.default_frequency ?? 'weekly';
    @tracked defaultDayOfWeek = String(this.args.values?.default_day_of_week ?? 1);
    @tracked recipientsText = Array.isArray(this.args.values?.default_recipients)
        ? this.args.values.default_recipients.join('\n')
        : '';
    @tracked defaultPaymentMethod = this.args.values?.default_payment_method ?? 'ach';

    @action updateDefaultFormat(event) {
        this.defaultFormat = event.target.value;
    }
    @action updateDefaultFrequency(event) {
        this.defaultFrequency = event.target.value;
    }
    @action updateDefaultDayOfWeek(event) {
        this.defaultDayOfWeek = event.target.value;
    }
    @action updateRecipients(event) {
        this.recipientsText = event.target.value;
    }
    @action updateDefaultPaymentMethod(event) {
        this.defaultPaymentMethod = event.target.value;
    }

    @action
    submit(event) {
        event.preventDefault();

        const recipients = (this.recipientsText ?? '')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        this.args.onSave?.({
            'pay_files.default_format': this.defaultFormat,
            'pay_files.default_frequency': this.defaultFrequency,
            'pay_files.default_day_of_week': parseInt(this.defaultDayOfWeek, 10) || 0,
            'pay_files.default_recipients': recipients,
            'pay_files.default_payment_method': this.defaultPaymentMethod,
        });
    }
}
