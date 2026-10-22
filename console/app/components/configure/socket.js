import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { format } from 'date-fns';
import { formatDateTime } from '../admin/database-backups';

/** The socket auth modes, as the select offers them. */
export const MODES = [
    { value: 'off', label: 'Off: tokens are verified, nothing is denied' },
    { value: 'log', label: 'Log: would-be denials are logged, nothing is denied' },
    { value: 'enforce', label: 'Enforce: unauthorized subscriptions and client publishing are refused' },
];

/** The settings an administrator can override; each falls back to the environment when null. */
export const FIELDS = ['enabled', 'mode', 'token_ttl', 'origins', 'publisher_origin'];

export const ENFORCE_WARNING =
    'In enforce mode the socket server refuses every subscription the API does not authorize and blocks client publishing. ' +
    'Clients that do not fetch socket tokens yet stop receiving realtime updates, and every connected socket reconnects once. ' +
    'Run in log mode first and check the denials below.';

export const KEY_MISSING_MESSAGE = 'Socket authentication cannot be switched on until SOCKETCLUSTER_AUTH_KEY is set on the API and the socket server.';

/** A blank input means "use the environment" (null). */
function blankToNull(value) {
    const text = String(value ?? '').trim();

    return text === '' ? null : text;
}

function nullableInteger(value) {
    const text = blankToNull(value);

    return text === null ? null : Number(text);
}

/**
 * Admin > Configure > Socket.
 *
 * Shows the socket server's live status and recent denials, lets an administrator override the
 * environment's socket settings (null = use the environment), and keeps the test console that
 * publishes to the current user's own test channel. The auth key itself is environment-only and
 * never reaches the console.
 */
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
     * Inject the `modalsManager` service
     *
     * @var {Service}
     * @memberof ConfigureSocketComponent
     */
    @service modalsManager;

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
     * The effective settings, the socket server's /stats (null when it cannot be reached) and
     * why it could not be reached. Assigned by apply().
     *
     * @memberof ConfigureSocketComponent
     */
    @tracked settings;
    @tracked status;
    @tracked statusError;

    /**
     * The form: one value per field, plus whether each field uses the environment instead.
     * Assigned by apply().
     *
     * @memberof ConfigureSocketComponent
     */
    @tracked inherits;
    @tracked enabled;
    @tracked mode;
    @tracked tokenTtl;
    @tracked origins;
    @tracked publisherOrigin;

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
    @tracked channelName;

    /**
     * The socket client and the subscribed test channel.
     *
     * @memberof ConfigureSocketComponent
     */
    socketClient = null;
    channel = null;

    modeOptions = MODES;

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
        this.load.perform();
        this.listenToTestSocket();
    }

    get isBusy() {
        return this.load.isRunning || this.saveSettings.isRunning;
    }

    get keyConfigured() {
        return this.settings?.key_configured === true;
    }

    /** The config the socket server reports running, or null (unreachable, or an older server). */
    get serverConfig() {
        return this.status?.config ?? null;
    }

    get lastSyncLabel() {
        return formatDateTime(this.serverConfig?.last_sync_at);
    }

    /**
     * Whether the socket server runs something other than the saved settings, e.g. right
     * after a save (it polls every 30 seconds) or when it cannot reach the API.
     */
    get isOutOfSync() {
        const server = this.serverConfig;
        if (!server || !this.settings) {
            return false;
        }
        if (server.enabled !== this.settings.enabled) {
            return true;
        }

        return Boolean(this.settings.enabled && this.settings.mode && server.mode !== this.settings.mode);
    }

    get denials() {
        return (this.status?.denials ?? []).map((row) => ({ ...row, lastAtLabel: formatDateTime(row.last_at) }));
    }

    @task *load() {
        try {
            const response = yield this.fetch.get('settings/socket');
            this.apply(response);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *saveSettings(payload) {
        try {
            // rawError keeps the API's `code` (e.g. key_missing) on the rejection.
            const response = yield this.fetch.post('settings/socket', payload, { rawError: true });
            this.apply(response);
            this.notifications.success('Socket settings saved. The socket server applies them within about 30 seconds.');
        } catch (error) {
            this.saveFailed(error);
        }
    }

    /**
     * Reports a failed save: the API refuses to switch auth on without a key (422 `key_missing`),
     * and Laravel's validation errors carry a message with per-field `errors`.
     */
    saveFailed(error) {
        if (error?.code === 'key_missing') {
            return this.notifications.error(KEY_MISSING_MESSAGE);
        }
        if (error && !Array.isArray(error.errors) && typeof error.message === 'string') {
            return this.notifications.error(error.message);
        }

        return this.notifications.serverError(error);
    }

    apply(response) {
        const settings = response?.settings ?? {};
        const sources = settings.sources ?? {};

        this.settings = settings;
        this.status = response?.status ?? null;
        this.statusError = response?.status_error ?? null;
        this.inherits = Object.fromEntries(FIELDS.map((field) => [field, sources[field] !== 'setting']));
        this.enabled = settings.enabled === true;
        this.mode = settings.mode ?? 'log';
        this.tokenTtl = settings.token_ttl ?? '';
        this.origins = settings.origins ?? '';
        this.publisherOrigin = settings.publisher_origin ?? '';
    }

    /** The POST body: every field, null where it uses the environment. */
    payload() {
        const pick = (field, value) => (this.inherits[field] ? null : value);

        return {
            enabled: pick('enabled', this.enabled),
            mode: pick('mode', this.mode),
            token_ttl: pick('token_ttl', nullableInteger(this.tokenTtl)),
            origins: pick('origins', blankToNull(this.origins)),
            publisher_origin: pick('publisher_origin', blankToNull(this.publisherOrigin)),
        };
    }

    /**
     * Whether saving this payload may start enforcing: enforce chosen while not enforcing yet,
     * or auth switched on with the mode left to the socket server, whose default is enforce.
     */
    entersEnforce(payload) {
        if (payload.enabled === false) {
            return false;
        }
        if (payload.mode === 'enforce') {
            return !(this.settings.enabled && this.settings.mode === 'enforce');
        }

        return payload.mode === null && payload.enabled === true && !this.settings.enabled;
    }

    @action save() {
        const payload = this.payload();
        if (!this.entersEnforce(payload)) {
            return this.saveSettings.perform(payload);
        }

        this.modalsManager.confirm({
            title: 'Enforce socket authentication?',
            body: ENFORCE_WARNING,
            acceptButtonText: 'Save and enforce',
            acceptButtonScheme: 'danger',
            confirm: async (modal) => {
                modal.startLoading();
                await this.saveSettings.perform(payload);
                return modal.done();
            },
        });
    }

    @action refresh() {
        return this.load.perform();
    }

    @action toggleInherit(field, inherit) {
        this.inherits = { ...this.inherits, [field]: inherit };
    }

    @action toggleEnabled(enabled) {
        this.enabled = enabled;
    }

    @action setMode(mode) {
        this.mode = mode;
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
     * Subscribes to a test channel (closing any previous one) and logs its events. Event
     * content is plain text: the template renders it escaped, since channel data and refusal
     * reasons come from the network.
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
