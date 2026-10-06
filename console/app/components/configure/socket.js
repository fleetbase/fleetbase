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
     * Inject the `currentUser` service
     *
     * @var {Service}
     * @memberof ConfigureSocketComponent
     */
    @service currentUser;

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
     * The channel the console is listening on. Test events are published to the current
     * user's own `test.{user uuid}` channel, which a socket token for that user may subscribe to.
     *
     * @memberof ConfigureSocketComponent
     */
    @tracked channelName = null;

    /**
     * The socket client and the subscribed test channel.
     *
     * @memberof ConfigureSocketComponent
     */
    socketClient = null;
    channel = null;

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
                channel: this.channelName,
            })
            .then((response) => {
                this.testResponse = response;

                // The API reports the channel it actually published to; follow it so the
                // test message (and every later one) shows up here.
                if (response.channel && response.channel !== this.channelName) {
                    this.subscribeToTestChannel(response.channel);
                }
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
        this.socketClient = socket;

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

        this.subscribeToTestChannel(this.defaultChannelName);

        // disconnect when transitioning
        this.router.on('routeWillChange', () => {
            this.channel.close();
            this.events = [];
        });
    }

    /**
     * The current user's own test channel, `test.{user uuid}`.
     *
     * @readonly
     * @memberof ConfigureSocketComponent
     */
    get defaultChannelName() {
        return `test.${this.currentUser.id}`;
    }

    /**
     * Subscribes to a test channel (closing any previous one) and logs its events.
     *
     * @param {String} channelName
     * @memberof ConfigureSocketComponent
     */
    subscribeToTestChannel(channelName) {
        if (this.channel) {
            this.channel.close();
        }

        const channel = this.socketClient.subscribe(channelName);
        this.channel = channel;
        this.channelName = channelName;

        // Listen for channel subscription
        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (let event of channel.listener('subscribe')) {
                this.events.pushObject({
                    time: format(new Date(), this.consoleDateFormat),
                    content: `Socket subscribed to ${channelName} channel`,
                    color: 'blue',
                });
            }
        })();

        // Listen for a refused subscription (e.g. the socket server's auth denied it)
        (async () => {
            for await (let event of channel.listener('subscribeFail')) {
                const { reason } = event.error;
                this.events.pushObject({
                    time: format(new Date(), this.consoleDateFormat),
                    content: reason ? `Socket subscription to ${channelName} was refused: ${reason}` : `Socket subscription to ${channelName} was refused`,
                    color: 'red',
                });
            }
        })();

        // Log every message published to the channel
        (async () => {
            for await (let data of channel) {
                this.events.pushObject({
                    time: format(new Date(), this.consoleDateFormat),
                    content: JSON.stringify(data, undefined, 2),
                    color: 'green',
                });
            }
        })();
    }
}
