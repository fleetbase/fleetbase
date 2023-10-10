import Component from '@glimmer/component';
import { computed } from '@ember/object';
import formatCurrency from '@fleetbase/ember-ui/utils/format-currency';
import formatMeters from '@fleetbase/ember-ui/utils/format-meters';
import formatBytes from '@fleetbase/ember-ui/utils/format-bytes';
import formatDuration from '@fleetbase/ember-ui/utils/format-duration';
import formatDate from '@fleetbase/ember-ui/utils/format-date';

export default class DashboardCountComponent extends Component {
    @computed('args.options.{currency,dateFormat,format,value}') get displayValue() {
        let format = this.args.options?.format;
        let currency = this.args.options?.currency;
        let dateFormat = this.args.options?.dateFormat;
        let value = this.args.options?.value;

        switch (format) {
            case 'money':
                value = formatCurrency([value, currency]);
                break;

            case 'meters':
                value = formatMeters([value]);
                break;

            case 'bytes':
                value = formatBytes([value]);
                break;

            case 'duration':
                value = formatDuration([value]);
                break;

            case 'date':
                value = formatDate([value, dateFormat]);
                break;

            default:
                break;
        }

        return value;
    }
}
