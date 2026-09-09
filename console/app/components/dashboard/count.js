import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import formatCurrency from '@fleetbase/ember-ui/utils/format-currency';
import formatMeters from '@fleetbase/ember-ui/utils/format-meters';
import formatBytes from '@fleetbase/ember-ui/utils/format-bytes';
import formatDuration from '@fleetbase/ember-ui/utils/format-duration';
import formatDate from '@fleetbase/ember-ui/utils/format-date';

export default class DashboardCountComponent extends Component {
    /**
     * The title of the metric count.
     *
     * @memberof WidgetKeyMetricsCountComponent
     */
    @tracked title;

    /**
     * The value to render
     *
     * @memberof WidgetKeyMetricsCountComponent
     */
    @tracked value;

    /**
     * Creates an instance of WidgetKeyMetricsCountComponent.
     * @param {EngineInstance} owner
     * @param {Object} { options }
     * @memberof WidgetKeyMetricsCountComponent
     */
    constructor(owner, { options, title, value = null }) {
        super(...arguments);
        this.title = title;
        this.createRenderValueFromOptions(options, value);
    }

    /**
     * Creates the value to render using the options provided.
     *
     * The provided value is taken as a parameter rather than read back off the tracked
     * `value` property: reading and then writing the same tracked property while the
     * component is being constructed during a render trips Ember's "already been used
     * previously in the same computation" assertion. Mirrors
     * @fleetbase/ember-ui's widget/count component.
     *
     * @param {Object} [options={}]
     * @param {String|Number} [defaultValue=null]
     * @memberof WidgetKeyMetricsCountComponent
     */
    createRenderValueFromOptions(options = {}, defaultValue = null) {
        // Skip deriving a value from options when one was already provided.
        if (defaultValue !== null) {
            this.value = defaultValue;
            return;
        }

        let { format, currency, dateFormat, value } = options;

        // These are plain utils taking positional arguments, not helpers taking a params
        // array. Passing `[value, currency]` meant the currency and date format were never
        // read, and date-fns rejects an array outright, so a count configured with
        // format: 'date' threw "RangeError: Invalid time value" and broke the render.
        switch (format) {
            case 'money':
                value = formatCurrency(value, currency);
                break;

            case 'meters':
                value = formatMeters(value);
                break;

            case 'bytes':
                value = formatBytes(value);
                break;

            case 'duration':
                value = formatDuration(value);
                break;

            case 'date':
                // date-fns only accepts a Date or a timestamp, and API values arrive serialized.
                value = formatDate(new Date(value), dateFormat);
                break;

            default:
                break;
        }

        this.value = value;
    }
}
