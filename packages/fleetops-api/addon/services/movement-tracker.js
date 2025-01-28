import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import { task, timeout } from 'ember-concurrency';
import { debug } from '@ember/debug';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';
import LeafletTrackingMarkerComponent from '../components/leaflet-tracking-marker';

export class EventBuffer {
    @tracked events = [];
    @tracked waitTime = 1000 * 3;
    @tracked intervalId;
    @tracked model;

    constructor(model, waitTime = 1000 * 3) {
        this.model = model;
        this.waitTime = waitTime;
    }

    start() {
        this.intervalId = setInterval(() => {
            const bufferReady = this.process.isIdle && this.events.length;
            if (bufferReady) {
                this.process.perform();
            }
        }, this.waitTime);
    }

    stop() {
        clearInterval(this.intervalId);
    }

    clear() {
        this.events.length = 0;
    }

    add(event) {
        this.events.pushObject(event);
    }

    removeByIndex(index) {
        this.events = this.events.filter((_, i) => i !== index);
    }

    remove(event) {
        this.events = this.events.removeObject(event);
    }

    @task *process() {
        debug('Processing movement tracker event buffer.');
        // Sort events by created_at
        this.events = this.events.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // Process sorted events
        for (const output of this.events) {
            const { event, data } = output;

            // log incoming event
            debug(`${event} - #${data.additionalData.index} (${output.created_at}) [ ${data.location.coordinates.join(' ')} ]`);

            // get movingObject marker
            const marker = this.model._layer || this.model._marker;
            if (marker) {
                if (typeof marker.setRotationAngle === 'function' && data.heading) {
                    marker.setRotationAngle(data.heading);
                }

                if (typeof marker.slideTo === 'function') {
                    marker.slideTo(data.location.coordinates);
                } else {
                    marker.setLatLng(data.location.coordinates);
                }

                yield timeout(1000);
            }
        }

        // Clear the buffer
        this.clear();
    }
}

export default class MovementTrackerService extends Service {
    @service socket;
    @tracked channels = [];

    constructor() {
        super(...arguments);
        this.registerTrackingMarker();
    }

    _getOwner(owner = null) {
        return owner ?? window.Fleetbase ?? getOwner(this);
    }

    registerTrackingMarker(_owner = null) {
        const owner = this._getOwner(_owner);
        const emberLeafletService = owner.lookup('service:ember-leaflet');

        if (emberLeafletService) {
            const alreadyRegistered = emberLeafletService.components.find((registeredComponent) => registeredComponent.name === 'leaflet-tracking-marker');
            if (alreadyRegistered) {
                return;
            }
            // we then invoke the `registerComponent` method
            emberLeafletService.registerComponent('leaflet-tracking-marker', {
                as: 'tracking-marker',
                component: LeafletTrackingMarkerComponent,
            });
        }
    }

    closeChannels() {
        this.channels.forEach((channel) => {
            channel.close();
        });
    }

    watch(models = []) {
        models.forEach((model) => {
            this.track(model);
        });
    }

    async track(model) {
        // Create socket instance
        const socket = this.socket.instance();

        // Get model type and identifier
        const type = getModelName(model);
        const identifier = model.id;
        debug(`Tracking movement started for ${type} with id ${identifier}`, model);

        // Listen on the specific channel
        const channelId = `${type}.${identifier}`;
        const channel = socket.subscribe(channelId);

        // Track the channel
        this.channels.pushObject(channel);

        // Listen to the channel for events
        await channel.listener('subscribe').once();

        // Create event buffer for tracking model
        const eventBuffer = new EventBuffer(model);

        // Start tracking with event buffer
        eventBuffer.start();

        // Get incoming data and console out
        (async () => {
            for await (let output of channel) {
                const { event } = output;

                if (event === `${type}.location_changed` || event === `${type}.simulated_location_changed`) {
                    eventBuffer.add(output);
                    debug(`Incoming socket event added to buffer: ${event}`);
                }
            }
        })();
    }
}
