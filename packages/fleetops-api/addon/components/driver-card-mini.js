import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

/**
 * DriverCardMiniComponent
 *
 * A mini-component responsible for displaying a specific driver's card.
 *
 * @extends Component
 *
 * @property {Service} store - Ember's store service.
 * @property {Service} fetch - Service for fetching data.
 * @property {Service} contextPanel - Service for context panel operations.
 */
export default class DriverCardMiniComponent extends Component {
    /**
     * Ember's store service.
     * @type {Service}
     */
    @service store;

    /**
     * Fetch service.
     * @type {Service}
     */
    @service fetch;

    /**
     * ContextPanel service.
     * @type {Service}
     */
    @service contextPanel;

    /**
     * View the details of a specific driver.
     *
     * @param {Object} record - The driver record to view.
     * @action
     * @returns {Promise} Resolves when the driver's details are focused in the context panel.
     */
    @action viewDriver(record) {
        const driver = this.fetch.jsonToModel(record, 'driver');
        return this.contextPanel.focus(driver);
    }
}
