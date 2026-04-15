import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * Fuel tab. Emits:
 *
 *   {
 *     'fuel.auto_update_eia':        <bool>,
 *     'fuel.manual_override_price':  <number | null>,
 *     'fuel.update_day':             'monday'...'sunday',
 *   }
 *
 * `manual_override_price` is optional; an empty string is serialized as
 * `null` so the backend clears any prior override.
 */
export default class SettingsTabsFuelComponent extends Component {
    @tracked autoUpdateEia = Boolean(this.args.values?.auto_update_eia ?? true);

    @tracked manualOverridePrice =
        this.args.values?.manual_override_price === null || this.args.values?.manual_override_price === undefined
            ? ''
            : String(this.args.values.manual_override_price);

    @tracked updateDay = this.args.values?.update_day ?? 'monday';

    @action toggleAutoUpdateEia(event) {
        this.autoUpdateEia = Boolean(event.target.checked);
    }
    @action updateManualOverridePrice(event) {
        this.manualOverridePrice = event.target.value;
    }
    @action updateUpdateDay(event) {
        this.updateDay = event.target.value;
    }

    @action
    submit(event) {
        event.preventDefault();

        const raw = (this.manualOverridePrice ?? '').trim();
        const manual = raw === '' ? null : Number.parseFloat(raw);

        this.args.onSave?.({
            'fuel.auto_update_eia': this.autoUpdateEia,
            'fuel.manual_override_price': Number.isFinite(manual) ? manual : null,
            'fuel.update_day': this.updateDay,
        });
    }
}
