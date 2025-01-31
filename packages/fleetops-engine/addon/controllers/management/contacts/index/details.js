import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ManagementContactsIndexDetailsController extends BaseController {
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
     * Transitions back to the "management.contacts.index" route.
     *
     * @method
     * @action
     * @returns {Transition} The transition object representing the route change.
     */
    @action transitionBack() {
        return this.transitionToRoute('management.contacts.index');
    }

    /**
     * Transitions to the edit view for a specific contact.
     *
     * @method
     * @param {contactModel} contact - The contact to be edited.
     * @action
     * @returns {Transition} The transition object representing the route change.
     */
    @action onEdit(contact) {
        return this.transitionToRoute('management.contacts.index.edit', contact);
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
