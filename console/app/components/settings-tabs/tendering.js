import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * Tendering tab. Emits:
 *
 *   {
 *     'tendering.default_method':           'email'|'api',
 *     'tendering.default_expiration_hours': <int > 0>,
 *     'tendering.auto_waterfall':           <bool>,
 *     'tendering.check_call_stale_hours':   <int > 0>,
 *   }
 */
export default class SettingsTabsTenderingComponent extends Component {
    @tracked defaultMethod = this.args.values?.default_method ?? 'email';
    @tracked expirationHours = String(this.args.values?.default_expiration_hours ?? 4);
    @tracked autoWaterfall = Boolean(this.args.values?.auto_waterfall ?? true);
    @tracked checkCallStaleHours = String(this.args.values?.check_call_stale_hours ?? 6);

    @action updateDefaultMethod(event) {
        this.defaultMethod = event.target.value;
    }
    @action updateExpirationHours(event) {
        this.expirationHours = event.target.value;
    }
    @action toggleAutoWaterfall(event) {
        this.autoWaterfall = Boolean(event.target.checked);
    }
    @action updateCheckCallStaleHours(event) {
        this.checkCallStaleHours = event.target.value;
    }

    @action
    submit(event) {
        event.preventDefault();
        this.args.onSave?.({
            'tendering.default_method': this.defaultMethod,
            'tendering.default_expiration_hours': parseInt(this.expirationHours, 10) || 0,
            'tendering.auto_waterfall': this.autoWaterfall,
            'tendering.check_call_stale_hours': parseInt(this.checkCallStaleHours, 10) || 0,
        });
    }
}
