import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { underscore } from '@ember/string';
import { task } from 'ember-concurrency';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import showErrorOnce from '@fleetbase/console/utils/show-error-once';

export default class FleetFormPanelComponent extends Component {
    @service store;
    @service notifications;
    @service hostRouter;
    @service intl;
    @service contextPanel;
    @service analytics;

    /**
     * Overlay context.
     * @type {any}
     * @memberof FleetFormPanelComponent
     */
    @tracked context;

    /**
     * All possible order status options
     *
     * @var {String}
     * @memberof FleetFormPanelComponent
     */
    @tracked statusOptions = ['active', 'disabled', 'decommissioned'];

    /**
     * Permission needed to update or create record.
     *
     * @memberof DriverFormPanelComponent
     */
    @tracked savePermission;

    /**
     * Constructs the component and applies initial state.
     */
    constructor(owner, { fleet = null }) {
        super(...arguments);
        this.fleet = fleet;
        this.savePermission = fleet && fleet.isNew ? 'fleet-ops create fleet' : 'fleet-ops update fleet';
        applyContextComponentArguments(this);
    }

    /**
     * Sets the overlay context.
     *
     * @action
     * @param {OverlayContextObject} overlayContext
     * @memberof FleetFormPanelComponent
     */
    @action setOverlayContext(overlayContext) {
        this.context = overlayContext;
        contextComponentCallback(this, 'onLoad', ...arguments);
    }

    /**
     * Task to save fleet.
     *
     * @return {void}
     * @memberof FleetFormPanelComponent
     */
    @task *save() {
        // Validate before saving
        if (!this.validate()) {
            return; // Stop execution if validation fails
        }
        contextComponentCallback(this, 'onBeforeSave', this.fleet);

        try {
            this.fleet = yield this.fleet.save();

            // Track fleet action in analytics
            if (this.analytics && this.analytics.isInitialized) {
                const action = this.fleet.isNew ? 'created' : 'updated';
                this.analytics.trackFleetAction(action, {
                    id: this.fleet.id,
                    uuid: this.fleet.uuid,
                    name: this.fleet.name,
                    type: this.fleet.type,
                    size: this.fleet.size,
                    vehicles_count: this.fleet.vehicles_count,
                    drivers_count: this.fleet.drivers_count,
                    company: this.fleet.company?.name
                });
            }
        } catch (error) {
            this.notifications.serverError(error);
            return;
        }

        this.notifications.success(this.intl.t('fleet-ops.component.fleet-form-panel.success-message', { fleetName: this.fleet.name }));
        contextComponentCallback(this, 'onAfterSave', this.fleet);
    }

    /**
     * Validates required fields and sets errors.
     * @returns {boolean} true if valid, false otherwise
     */
    validate() {
        const requiredFields = [
            'name',
            'status',
            'trip_length'
        ];
        const tripLength = parseInt(this.fleet.trip_length, 10);
        const hasEmptyRequired = requiredFields.some(field => !this.fleet[field] || this.fleet[field].toString().trim() === '');
        if (hasEmptyRequired) {
            showErrorOnce(this, this.notifications, this.intl.t('validation.form_invalid'));
            return false;
        }
        if (isNaN(tripLength) || tripLength <= 0) {
            showErrorOnce(this, this.notifications, this.intl.t('common.trip_length_invalid'));
            return false;
        }
        
        return true;
    }

    /**
     * View the details of the fleet.
     *
     * @action
     * @memberof FleetFormPanelComponent
     */
    @action onViewDetails() {
        const isActionOverrided = contextComponentCallback(this, 'onViewDetails', this.fleet);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.fleet, 'viewing');
        }
    }

    /**
     * Handles cancel button press.
     *
     * @action
     * @returns {any}
     * @memberof FleetFormPanelComponent
     */
    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.fleet);
    }

    /**
     * Update relation on a model.
     *
     * @param {String} relation
     * @param {Model|null} value
     * @memberof FleetFormPanelComponent
     */
    @action updateRelationship(relation, value) {
        this.fleet.set(relation, value);

        if (!value) {
            this.fleet.set(underscore(relation) + '_uuid', null);
        }
    }

 
}
