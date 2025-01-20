import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementIssuesIndexNewController extends BaseController {
    /**
     * Inject the `store` service
     *
     * @memberof ManagementissuesIndexNewController
     */
    @service store;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementissuesIndexNewController
     */
    @service hostRouter;

    /**
     * Inject the `intl` service
     *
     * @memberof intl
     */
    @service intl;

    /**
     * Inject the `currentUser` service
     *
     * @memberof ManagementissuesIndexNewController
     */
    @service currentUser;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementissuesIndexNewController
     */
    @service modalsManager;

    /**
     * The overlay component context.
     *
     * @memberof ManagementissuesIndexNewController
     */
    @tracked overlay;

    /**
     * The issue being created.
     *
     * @var {issueModel}
     */
    @tracked issue = this.store.createRecord('issue', { reporter: this.currentUser.user, status: 'pending', priority: 'low', type: 'operational' });

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementissuesIndexNewController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementissuesIndexNewController
     */
    @action transitionBack() {
        return this.transitionToRoute('management.issues.index');
    }

    /**
     * Trigger a route refresh and focus the new issue created.
     *
     * @param {issueModel} issue
     * @return {Promise}
     * @memberof ManagementissuesIndexNewController
     */
    @action onAfterSave(issue) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.issues.index.details', issue).then(() => {
            this.resetForm();
        });
    }

    /**
     * Resets the form with a new issue record
     *
     * @memberof ManagementissuesIndexNewController
     */
    resetForm() {
        this.issue = this.store.createRecord('issue', { reporter: this.currentUser.user, status: 'pending', priority: 'low', type: 'operational' });
    }
}
