import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';

export default class WidgetIamMetricsComponent extends Component {
    /**
     * The widget ID to use for registering.
     *
     * @memberof WidgetIamMetricsComponent
     */
    static widgetId = 'iam-metrics-widget';

    /**
     * Inject the fetch service.
     *
     * @memberof WidgetKeyMetricsComponent
     */
    @service fetch;

    /**
     * Property for loading metrics to.
     *
     * @memberof WidgetKeyMetricsComponent
     */
    @tracked metrics = {};

    /**
     * Creates an instance of WidgetKeyMetricsComponent.
     * @memberof WidgetKeyMetricsComponent
     */
    constructor() {
        super(...arguments);
        this.getIamMetrics.perform();
    }

    /**
     * Task which fetches key metrics.
     *
     * @memberof WidgetKeyMetricsComponent
     */
    @task *getIamMetrics() {
        try {
            this.metrics = yield this.fetch.get('metrics/iam');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}
