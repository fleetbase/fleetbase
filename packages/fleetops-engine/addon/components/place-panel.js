import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import PlacePanelDetailComponent from './place-panel/details';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import findActiveTab from '../utils/find-active-tab';

export default class PlacePanelComponent extends Component {
    @service fetch;
    @service modalsManager;
    @service universe;
    @service store;
    @service hostRouter;
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
     * The place being displayed or edited.
     *
     * @type {placeModel}
     * @tracked
     */
    @tracked place;

    /**
     * Returns the array of tabs available for the panel.
     *
     * @type {Array}
     */
    get tabs() {
        const registeredTabs = this.universe.getMenuItemsFromRegistry('fleet-ops:component:place-panel');
        const defaultTabs = [this.universe._createMenuItem(this.intl.t('fleet-ops.common.details'), null, { icon: 'circle-info', component: PlacePanelDetailComponent })];

        if (isArray(registeredTabs)) {
            return [...defaultTabs, ...registeredTabs];
        }

        return defaultTabs;
    }

    /**
     * Initializes the place panel component.
     */
    constructor() {
        super(...arguments);
        this.place = this.args.place;
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
     * Handles edit action for the place.
     *
     * @method
     * @action
     */
    @action onEdit() {
        const isActionOverrided = contextComponentCallback(this, 'onEdit', this.place);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.place, 'editing', {
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
        return contextComponentCallback(this, 'onPressCancel', this.place);
    }
}
