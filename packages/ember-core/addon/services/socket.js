import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { isBlank } from '@ember/utils';
import { later } from '@ember/runloop';
import toBoolean from '../utils/to-boolean';
import config from 'ember-get-config';

export default class SocketService extends Service {
    @tracked channels = [];

    constructor() {
        super(...arguments);
        this.socket = this.createSocketClusterClient();
    }

    instance() {
        return this.socket;
    }

    createSocketClusterClient() {
        const socketConfig = { ...config.socket };

        if (isBlank(socketConfig.hostname)) {
            socketConfig.hostname = window.location.hostname;
        }

        socketConfig.secure = toBoolean(socketConfig.secure);

        return socketClusterClient.create(socketConfig);
    }

    async listen(channelId, callback) {
        later(
            this,
            async () => {
                const channel = this.socket.subscribe(channelId);

                // Track channel
                this.channels.pushObject(channel);

                // Listen to channel for events
                await channel.listener('subscribe').once();

                // Listen for channel subscription
                (async () => {
                    for await (let output of channel) {
                        if (typeof callback === 'function') {
                            callback(output);
                        }
                    }
                })();
            },
            300
        );
    }

    closeChannels() {
        for (let i = 0; i < this.channels.length; i++) {
            const channel = this.channels.objectAt(i);

            channel.close();
        }
    }
}
