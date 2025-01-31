import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import formatCurrency from '../../utils/format-currency';
import formatMeters from '../../utils/format-meters';
import formatBytes from '../../utils/format-bytes';
import formatDuration from '../../utils/format-duration';
import formatDate from '../../utils/format-date';

export default class WidgetCountComponent extends Component {
    /**
     * The title of the metric count.
     *
     * @memberof WidgetCountComponent
     */
    @tracked title;

    /**
     * The value to render
     *
     * @memberof WidgetCountComponent
     */
    @tracked value = null;

    /**
     * Creates an instance of WidgetCountComponent.
     * @param {EngineInstance} owner
     * @param {Object} { options }
     * @memberof WidgetCountComponent
     */
    constructor(owner, { title, value = null, options = {} }) {
        super(...arguments);
        this.title = title;
        this.createRenderValueFromOptions(options, value);
    }

    /**
     * Creates the value to render using the options provided.
     *
     * @param {Object} [options={}]
     * @param {String|Number} defaultValue
     * @memberof WidgetCountComponent
     */
    createRenderValueFromOptions(options = {}, defaultValue = null) {
        if (defaultValue !== null) {
            this.value = defaultValue;
            return;
        }

        let { format, currency, dateFormat, value } = options;

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

        this.value = value;
    }
}
