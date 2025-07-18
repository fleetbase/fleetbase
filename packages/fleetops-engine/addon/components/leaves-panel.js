import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';

export default class LeavesPanelComponent extends Component {
    @service contextPanel;
    @tracked leave = this.args.leave;

    constructor() {
        super(...arguments);
        console.log('LeavesPanelComponent loaded');
        console.log(this.leave);
    }

    @action onEdit() {
        const isActionOverrided = contextComponentCallback(this, 'onEdit', this.leave);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.leave, 'editing', {
                onAfterSave: () => {
                    this.contextPanel.clear();
                },
            });
        }
    }

    @action onPressCancel() {
        if (typeof this.args.onPressCancel === 'function') {
            return this.args.onPressCancel();
        }
        
        // Fallback to context panel clear
        if (this.contextPanel) {
            this.contextPanel.clear();
        }
        
        return contextComponentCallback(this, 'onPressCancel', this.leave);
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
     * Handles the open action.
     *
     * @method
     * @action
     * @returns {Boolean} Indicates whether the open action was overridden.
     */
    @action onOpen() {
        return contextComponentCallback(this, 'onOpen');
    }

    /**
     * Handles the close action.
     *
     * @method
     * @action
     * @returns {Boolean} Indicates whether the close action was overridden.
     */
    @action onClose() {
        return contextComponentCallback(this, 'onClose');
    }

    /**
     * Handles the toggle action.
     *
     * @method
     * @action
     * @returns {Boolean} Indicates whether the toggle action was overridden.
     */
    @action onToggle() {
        return contextComponentCallback(this, 'onToggle');
    }

    @action
    async approveLeave(leave) {
        // Call the controller's approveLeave action
        if (typeof this.args.onApproveLeave === 'function') {
            const result = await this.args.onApproveLeave(leave);
            // Update the local leave reference after successful approval
            if (result) {
                this.leave = leave;
                // Close the panel on success
                if (typeof this.args.onPressCancel === 'function') {
                    this.args.onPressCancel();
                }
            }
            return result;
        }
        
        // Fallback to context component callback
        return contextComponentCallback(this, 'onApproveLeave', leave);
    }

    @action
    async rejectLeave(leave) {
        // Call the controller's rejectLeave action
        if (typeof this.args.onRejectLeave === 'function') {
            const result = await this.args.onRejectLeave(leave);
            // Update the local leave reference after successful rejection
            if (result) {
                this.leave = leave;
                // Close the panel on success
                if (typeof this.args.onPressCancel === 'function') {
                    this.args.onPressCancel();
                }
            }
            return result;
        }
        
        // Fallback to context component callback
        return contextComponentCallback(this, 'onRejectLeave', leave);
    }
}
