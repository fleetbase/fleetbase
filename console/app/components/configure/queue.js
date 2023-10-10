import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ConfigureQueueComponent extends Component {
    @service fetch;
    @service notifications;
    @tracked isLoading = false;
    @tracked testResponse;
    @tracked connections = [];
    @tracked driver = 'sync';
    @tracked sqsPrefix = null;
    @tracked sqsQueue = null;
    @tracked sqsSuffix = null;
    @tracked beanstalkdHost = 'localhost';
    @tracked beanstalkdQueue = 'default';

    /**
     * Creates an instance of ConfigureQueueComponent.
     * @memberof ConfigureQueueComponent
     */
    constructor() {
        super(...arguments);
        this.loadConfigValues();
    }

    @action setConfigValues(config) {
        for (const key in config) {
            if (this[key] !== undefined) {
                this[key] = config[key];
            }
        }
    }

    @action setDriver(driver) {
        this.driver = driver;
    }

    @action loadConfigValues() {
        this.isLoading = true;

        this.fetch
            .get('settings/queue-config')
            .then((response) => {
                this.setConfigValues(response);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @action save() {
        this.isLoading = true;

        this.fetch
            .post('settings/queue-config', {
                driver: this.driver,
                sqs: {
                    prefix: this.sqsPrefix,
                    queue: this.sqsQueue,
                    suffix: this.sqsSuffix,
                },
                beanstalkd: {
                    host: this.beanstalkdHost,
                    queue: this.beanstalkdQueue,
                },
            })
            .then(() => {
                this.notifications.success('Queue configuration saved.');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @action test() {
        this.isLoading = true;

        this.fetch
            .post('settings/test-queue-config', {
                queue: this.driver,
            })
            .then((response) => {
                this.testResponse = response;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
