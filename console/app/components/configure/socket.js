import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { format } from 'date-fns';

export default class ConfigureSocketComponent extends Component {
    /**
     * Inject the `router` service
     *
     * @var {Service}
     * @memberof ConfigureSocketComponent
     */
    @service router;

    /**
     * Inject the `fetch` service
     *
     * @var {Service}
     * @memberof ConfigureSocketComponent
     */
    @service fetch;

    /**
     * Inject the `notifications` service
     *
     * @var {Service}
     * @memberof ConfigureSocketComponent
     */
    @service notifications;

    /**
     * Inject the `socket` service
     *
     * @var {Service}
     * @memberof ConfigureSocketComponent
     */
    @service socket;

    /**
     * State of the test request.
     *
     * @memberof ConfigureSocketComponent
     */
    @tracked isLoading = null;

    /**
     * The response form testing the socket.
     *
     * @memberof ConfigureSocketComponent
     */
    @tracked testResponse = null;

    /**
     * Incoming events logged from test socket channel.
     *
     * @memberof ConfigureSocketComponent
     */
    @tracked events = [];

    /**
     * Date format to use for socket console events.
     *
     * @memberof ConfigureSocketComponent
     */
    consoleDateFormat = 'MMM-dd HH:mm';

    /**
     * Creates an instance of ConfigureSocketComponent.
     * @memberof ConfigureSocketComponent
     */
    constructor() {
        super(...arguments);
        this.listenToTestSocket();
    }

    /**
     * Send a request to test the socket connection.
     *
     * @memberof ConfigureSocketComponent
     */
    @action testSocketConnection() {
        this.isLoading = true;

        this.fetch
            .post('settings/test-socket', {
                channel: 'test',
            })
            .then((response) => {
                this.testResponse = response;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    /**
     * Opens socket and logs all incoming events.
     *
     * @memberof ConfigureSocketComponent
     */
    @action async listenToTestSocket() {
        // Create SocketClusterClient
        const socket = this.socket.instance();

        // Listen for socket connection errors
        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (let event of socket.listener('error')) {
                // Push an event or notification for socket connection here
                this.events.pushObject({
                    time: format(new Date(), this.consoleDateFormat),
                    content: 'Socket connection error!',
                    color: 'red',
                });
            }
        })();

        // Listen for socket connection
        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (let event of socket.listener('connect')) {
                // Push an event or notification for socket connection here
                this.events.pushObject({
                    time: format(new Date(), this.consoleDateFormat),
                    content: 'Socket is connected',
                    color: 'green',
                });
            }
        })();

        // Listed on company channel
        const channel = socket.subscribe('test');

        // Listen for channel subscription
        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (let event of channel.listener('subscribe')) {
                // Push an event or notification for channel subscription here
                this.events.pushObject({
                    time: format(new Date(), this.consoleDateFormat),
                    content: `Socket subscribed to test channel`,
                    color: 'blue',
                });
            }
        })();

        // Listen for channel subscription
        (async () => {
            for await (let data of channel) {
                this.events.pushObject({
                    time: format(new Date(), this.consoleDateFormat),
                    content: JSON.stringify(data, undefined, 2),
                    color: 'green',
                });
            }
        })();

        // disconnect when transitioning
        this.router.on('routeWillChange', () => {
            channel.close();
            this.events = [];
        });
    }
}
