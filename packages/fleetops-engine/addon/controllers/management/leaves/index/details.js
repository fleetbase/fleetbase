import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import ENV from '@fleetbase/console/config/environment';

export default class ManagementLeavesIndexDetailsController extends BaseController {
    @service hostRouter;
    @service notifications;
    @service intl;
    @service store;

    /**
     * The currently active view tab ('details' by default).
     *
     * @type {String}
     * @tracked
     */
    @tracked view = 'details';

    /**
     * An array of query parameters to be serialized in the URL.
     *
     * @type {String[]}
     * @tracked
     */
    @tracked queryParams = ['view'];

    /**
     * Transitions back to the "management.leaves.index" route.
     *
     * @method
     * @action
     * @returns {Transition} The transition object representing the route change.
     */
    @action transitionBack() {
        return this.transitionToRoute('management.leaves.index');
    }

    /**
     * Transitions to the edit view for a specific leave.
     *
     * @method
     * @param {LeaveModel} leave - The leave to be edited.
     * @action
     * @returns {Transition} The transition object representing the route change.
     */
    @action onEdit(leave) {
        return this.transitionToRoute('management.leaves.index.edit', leave);
    }

    /**
     * Updates the active view tab.
     *
     * @method
     * @param {String} tab - The name of the tab to activate.
     * @action
     */
    @action onTabChanged(tab) {
        this.view = tab;
    }

    /**
     * Updates the status of a leave request by sending a PUT request to the API.
     * 
     * @param leave - The leave object to update
     * @param action - The action to perform ('approve' or 'reject')
     * @returns Promise<boolean> - Success status
     */
    async _updateLeaveStatus(leave, action) {
        try {
            const authSession = JSON.parse(localStorage.getItem('ember_simple_auth-session'));
            const token = authSession?.authenticated?.token;
            if (!token) {
                this.notifications.error(this.intl.t('leaves.failed_to') + ' ' + action + ' ' + this.intl.t('leaves.leave') + '.');
                return false;
            }

            const response = await fetch(`${ENV.API.host}/api/v1/leave-requests/${leave.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ action })
            });

            if (!response.ok) {
                let errorMsg = `${this.intl.t('leaves.failed_to')} ${action} ${this.intl.t('leaves.leave')}.`;
                try {
                    const error = await response.json();
                    errorMsg = error.message || errorMsg;
                } catch (e) {
                    // ignore JSON parse error
                }
                this.notifications.error(errorMsg);
                return false;
            }
            const actionText = action === 'approve'
            ? this.intl.t('leaves.approved')
            : action === 'reject'
                ? this.intl.t('leaves.rejected')
                : action;
            // Only show success if the response is ok
            this.notifications.success(`${this.intl.t('leaves.leave_uppercase')} ${actionText}!`);
            // Invalidate the store cache for this specific leave
            const owner = getOwner(this);

            const route = owner.lookup('route:management.leaves.index');
            if (route && route._cache) {
                route._cache.unavailability = null;
            }
            // Now refresh the model (SPA-style)
            this.hostRouter.refresh();
            return true;
        } catch (error) { 
            this.notifications.error(`${this.intl.t('leaves.failed_to')} ${action === 'approve' ? this.intl.t('leaves.approved') : this.intl.t('leaves.rejected')} ${this.intl.t('leaves.leave')}.`);
            console.error(error);
            return false;
        }
    }

    /**
     * Approves a leave request using the existing API function.
     *
     * @method
     * @param {LeaveModel} leave - The leave to be approved.
     * @action
     */
    @action async approveLeave(leave) {
        return await this._updateLeaveStatus(leave, 'approve');
    }

    /**
     * Rejects a leave request using the existing API function.
     *
     * @method
     * @param {LeaveModel} leave - The leave to be rejected.
     * @action
     */
    @action async rejectLeave(leave) {
        return await this._updateLeaveStatus(leave, 'reject');
    }
}