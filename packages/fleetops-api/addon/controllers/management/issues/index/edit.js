import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ManagementIssuesIndexEditController extends BaseController {
    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementissuesIndexEditController
     */
    @service hostRouter;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementissuesIndexEditController
     */
    @service modalsManager;

    /**
     * Inject the `intl` service
     *
     * @memberof intl
     */
    @service intl;

    /**
     * The overlay component context.
     *
     * @memberof ManagementissuesIndexEditController
     */
    @tracked overlay;

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementissuesIndexEditController
     */
    @action transitionBack(issue) {
        // check if issue record has been edited and prompt for confirmation
        if (issue.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(issue, {
                confirm: () => {
                    issue.rollbackAttributes();
                    return this.transitionToRoute('management.issues.index');
                },
            });
        }

        return this.transitionToRoute('management.issues.index');
    }

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementissuesIndexEditController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When issue details button is clicked in overlay.
     *
     * @param {IssueModel} issue
     * @return {Promise}
     * @memberof ManagementissuesIndexEditController
     */
    @action onViewDetails(issue) {
        // check if issue record has been edited and prompt for confirmation
        if (issue.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(issue);
        }

        return this.transitionToRoute('management.issues.index.details', issue);
    }

    /**
     * Trigger a route refresh and focus the new issue created.
     *
     * @param {IssueModel} issue
     * @return {Promise}
     * @memberof ManagementissuesIndexEditController
     */
    @action onAfterSave(issue) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.issues.index.details', issue);
    }

    /**
     * Prompts the user to confirm if they wish to continue with unsaved changes.
     *
     * @method
     * @param {IssueModel} issue - The issue object with unsaved changes.
     * @param {Object} [options={}] - Additional options for configuring the modal.
     * @returns {Promise} A promise that resolves when the user confirms, and transitions to a new route.
     * @memberof ManagementissuesIndexEditController
     */
    confirmContinueWithUnsavedChanges(issue, options = {}) {
        return this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.management.drivers.index.edit.title'),
            body: this.intl.t('fleet-ops.management.issues.index.edit.body'),
            acceptButtonText: this.intl.t('fleet-ops.management.drivers.index.edit.button'),
            confirm: () => {
                issue.rollbackAttributes();
                return this.transitionToRoute('management.issues.index.details', issue);
            },
            ...options,
        });
    }
}
