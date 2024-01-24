import Component from '@glimmer/component';
import { action } from '@ember/object';
import { task } from 'ember-concurrency-decorators';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

/**
 * Glimmer component for handling notification enforcement.
 *
 * @class EnforceNotificationComponent
 * @extends Component
 */
export default class TwoFaEnforcementAlertComponent extends Component {
    /**
     * Flag to determine whether the component should render or not.
     *
     * @property {boolean} shouldRender
     * @default false
     * @tracked
     */
    @tracked shouldRender = false;

    /**
     * Ember Router service for transitioning between routes.
     *
     * @type {RouterService}
     */
    @service router;

    /**
     * Fetch service for making HTTP requests.
     *
     * @property {FetchService} fetch
     * @inject
     */
    @service fetch;

    /**
     * Constructor method for the ConsoleAccountAuthController.
     *
     * @constructor
     */
    constructor() {
        super(...arguments);
        this.checkTwoFactorEnforcement.perform();
    }

    /**
     * Transition to the users auth page.
     *
     * @method transitionToTwoFa
     * @memberof ConsoleHomeController
     */
    @action transitionToTwoFactorSettings() {
        this.router.transitionTo('console.account.auth');
    }

    @task *checkTwoFactorEnforcement() {
        const shouldRender = yield this.fetch.get('two-fa/enforce').catch((error) => {
            this.notifications.serverError(error);
        });

        /**
         * Task to check whether two-factor authentication enforcement is required.
         *
         * @method checkTwoFactorEnforcement
         * @memberof TwoFaEnforcementAlertComponent
         * @task
         */
        if (shouldRender) {
            this.shouldRender = shouldRender.shouldEnforce;
        }
    }
}
