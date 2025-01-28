import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
export default class ManagementIssuesIndexDetailsController extends BaseController {
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
     * Transitions back to the "management.issues.index" route.
     *
     * @method
     * @action
     * @returns {Transition} The transition object representing the route change.
     */
    @action transitionBack() {
        return this.transitionToRoute('management.issues.index');
    }

    /**
     * Transitions to the edit view for a specific issue.
     *
     * @method
     * @param {issueModel} issue - The issue to be edited.
     * @action
     * @returns {Transition} The transition object representing the route change.
     */
    @action onEdit(issue) {
        return this.transitionToRoute('management.issues.index.edit', issue);
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
}
