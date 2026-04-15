import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * Audit tab. Emits:
 *
 *   {
 *     'audit.default_tolerance_percent': <number >= 0>,
 *     'audit.default_tolerance_amount':  <number >= 0>,
 *     'audit.auto_audit_on_receive':     <bool>,
 *   }
 */
export default class SettingsTabsAuditComponent extends Component {
    @tracked defaultTolerancePercent = String(this.args.values?.default_tolerance_percent ?? 2.0);
    @tracked defaultToleranceAmount = String(this.args.values?.default_tolerance_amount ?? 50.0);
    @tracked autoAuditOnReceive = Boolean(this.args.values?.auto_audit_on_receive ?? true);

    @action updateDefaultTolerancePercent(event) {
        this.defaultTolerancePercent = event.target.value;
    }
    @action updateDefaultToleranceAmount(event) {
        this.defaultToleranceAmount = event.target.value;
    }
    @action toggleAutoAuditOnReceive(event) {
        this.autoAuditOnReceive = Boolean(event.target.checked);
    }

    @action
    submit(event) {
        event.preventDefault();

        const percent = Number.parseFloat(this.defaultTolerancePercent);
        const amount = Number.parseFloat(this.defaultToleranceAmount);

        this.args.onSave?.({
            'audit.default_tolerance_percent': Number.isFinite(percent) ? percent : 0,
            'audit.default_tolerance_amount': Number.isFinite(amount) ? amount : 0,
            'audit.auto_audit_on_receive': this.autoAuditOnReceive,
        });
    }
}
