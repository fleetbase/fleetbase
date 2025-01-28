import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { underscore, capitalize, w } from '@ember/string';
import { task } from 'ember-concurrency';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';

/**
 * Component class for managing activity forms.
 * This component facilitates the creation and editing of activities,
 * allowing the setting of activity codes, keys, logic, and events.
 *
 * @extends Component
 */
export default class ActivityFormPanelComponent extends Component {
    /**
     * Tracked property for the activity being edited or created.
     * @tracked
     */
    @tracked activity;

    /**
     * Tracked property for the target activity, if applicable.
     * @tracked
     */
    @tracked targetActivity;

    /**
     * Proof of delivery options.
     *
     * @memberof ActivityFormPanelComponent
     */
    @tracked podOptions = ['scan', 'signature', 'photo'];

    /**
     * Constructor for ActivityFormPanelComponent.
     * Applies context component arguments upon instantiation.
     */
    constructor() {
        super(...arguments);
        applyContextComponentArguments(this);
    }

    /**
     * Task to save the activity. It triggers an optional onSave callback
     * with the current state of the activity.
     * @task
     */
    @task *save() {
        contextComponentCallback(this, 'onSave', this.customEntity);
        if (typeof this.onSave === 'function') {
            yield this.onSave(this.activity);
        }
    }

    /**
     * Sets the proof of delivery method to be used for this activity.
     *
     * @param {Event} event
     * @memberof ActivityFormPanelComponent
     */
    @action setProofOfDeliveryMethod(event) {
        const value = event.target.value;
        this.activity.set('pod_method', value);
    }

    /**
     * Action method to set the activity code. It uses the underscore function to format
     * the code and updates the status by capitalizing each word.
     * @param {Event} event - The event object containing the new activity code.
     * @action
     */
    @action setActivityCode(event) {
        const value = event.target.value;
        const code = underscore(value);
        this.activity.set('code', code);
        this.activity.set('status', w(value.replace(/_/g, ' ')).map(capitalize).join(' '));
    }

    /**
     * Action method to set the activity key. It converts the key to an underscored string.
     * @param {Event} event - The event object containing the new activity key.
     * @action
     */
    @action setActivityKey(event) {
        const value = event.target.value;
        const key = underscore(value);
        this.activity.set('key', key);
    }

    /**
     * Action method to update the logic associated with the activity.
     * @param {Array} logic - An array representing the activity logic.
     * @action
     */
    @action updateActivityLogic(logic = []) {
        this.activity.set('logic', logic);
    }

    /**
     * Action method to update the events associated with the activity.
     * @param {Array} events - An array of events linked to the activity.
     * @action
     */
    @action updateActivityEvents(events = []) {
        this.activity.set('events', events);
    }
}
