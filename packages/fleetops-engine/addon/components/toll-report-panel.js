import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import TollReportPanelDetailsComponent from './toll-report-panel/details';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import findActiveTab from '../utils/find-active-tab';
import ENV from '@fleetbase/console/config/environment';

export default class TollReportPanelComponent extends Component {
    /**
     * Service for fetching data.
     *
     * @type {Service}
     */
    @service fetch;

    /**
     * Service for managing modals.
     *
     * @type {Service}
     */
    @service modalsManager;

    /**
     * Universe service for managing global data and settings.
     *
     * @type {Service}
     */
    @service universe;

    /**
     * Ember data store service.
     *
     * @type {Service}
     */
    @service store;

    /**
     * Service for managing routing within the host app.
     *
     * @type {Service}
     */
    @service hostRouter;

    /**
     * Service for managing the context panel.
     *
     * @type {Service}
     */
    @service contextPanel;
    @service intl;

    /**
     * The current active tab.
     *
     * @type {Object}
     * @tracked
     */
    @tracked tab;

    /**
     * The fuel-report being displayed or edited.
     *
     * @type {fuelReport}
     * @tracked
     */
    @tracked fuelReport;

    /**
     * Returns the array of tabs available for the panel.
     *
     * @type {Array}
     */
    get tabs() {
        const registeredTabs = this.universe.getMenuItemsFromRegistry('fleet-ops:component:fuel-report-panel');
        // this.universe._createMenuItem('Tracking', null, { icon: 'satellite-dish', component: VehiclePanelTrackingComponent }),
        const defaultTabs = [this.universe._createMenuItem(this.intl.t('fleet-ops.common.details'), null, {id: 'details', icon: 'circle-info', component: TollReportPanelDetailsComponent })];

        if (isArray(registeredTabs)) {
            return [...defaultTabs, ...registeredTabs];
        }

        return defaultTabs;
    }

    /**
     * Initializes the fuel-report panel component.
     */
    constructor() {
        super(...arguments);
        this.fuelReport = this.args.fuelReport;
        this.tab = findActiveTab(this.tabs, this.args.tab);
        applyContextComponentArguments(this);
    }

    /**
     * Sets the overlay context.
     *
     * @action
     * @param {OverlayContextObject} overlayContext
     */
    @action setOverlayContext(overlayContext) {
        this.context = overlayContext;
        contextComponentCallback(this, 'onLoad', ...arguments);
    }

    /**
     * Handles changing the active tab.
     *
     * @method
     * @param {String} tab - The new tab to switch to.
     * @action
     */
    @action onTabChanged(tab) {
        this.tab = findActiveTab(this.tabs, tab);
        contextComponentCallback(this, 'onTabChanged', tab);
    }

    /**
     * Handles edit action for the fuel-report.
     *
     * @method
     * @action
     */
    @action onEdit() {
        const isActionOverrided = contextComponentCallback(this, 'onEdit', this.fuelReport);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.fuelReport, 'editing', {
                onAfterSave: () => {
                    this.contextPanel.clear();
                },
            });
        }
    }

    /**
     * Handles the cancel action.
     *
     * @method
     * @action
     * @returns {Boolean} Indicates whether the cancel action was overridden.
     */
    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.fuelReport);
    }

    /**
     * Action triggered when a file is removed.
     *
     * @param {File} file - The file to be removed.
     * @returns {Promise} - A promise representing the file destruction operation.
     */
    @action 
        async removeFile(file) {
            const message = this.intl.t('common.file-delete-confirmation', {
                filename: file.original_filename
            });
            
            if (!confirm(message)) {
                return;
            }
            // if (!confirm(`Are you sure you want to delete the file "${file.original_filename}"?`)) {
            //     return;
            // }
           
            this.fuelReport.files.removeObject(file);
            
            try {
                const apiUrl = `${ENV.API_HOST}/v1/files/${file.public_id}`;
                const authToken = this.session.data?.authenticated?.token; // Safely access nested properties
    
                if (!authToken) {
                    throw new Error('Authentication token not found.');
                }
    
                const response = await fetch(apiUrl, {
                    method: 'DELETE',
                    headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`, // Include auth header if required
                    },
                });
    
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || this.intl.t('common.file-delete-failed'));
                }
          
                // Trigger a success notification
                this.notifications.success(this.intl.t('common.file-delete-success'), {
                    autoClear: true,
                    clearDuration: 3000, // Duration in milliseconds
                });

                return data;
                // Optionally, show a success notification to the user
              } catch (error) {
                // Revert the UI change
                this.fuelReport.files.pushObject(file);
                this.notifications.error(this.intl.t('common.file-delete-failed'), {
                    autoClear: true,
                    clearDuration: 5000,
                });
              }
        }
}
