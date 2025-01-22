import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { debug } from '@ember/debug';

export default class LeafletService extends Service {
    @tracked instances = [];
    @tracked initialized = false;
    @tracked instance;
    @tracked initializationId;

    load(options = {}) {
        let intervals = 0;
        this.initializationId = setInterval(() => {
            const Leaflet = window.L || window.leaflet;
            if (this.initialized) {
                this.setInstance(this.instance);
            }
            // Check if Leaflet global object `L` is present
            if (Leaflet && typeof Leaflet === 'object') {
                if (!this.initialized) {
                    // First initialization
                    debug('Leaflet has been initialized.');
                    if (this.instance === undefined) {
                        this.setInstance(Leaflet);
                        this.initialized = true;
                    }
                } else if (Leaflet !== this.instance && !this.instances.includes(Leaflet)) {
                    // Subsequent re-initializations
                    debug('Leaflet has been re-initialized!');
                    this.instances.push(window.L);
                }
            }

            intervals++;
            if (intervals === 20) {
                if (typeof options.onReady === 'function') {
                    options.onReady(this.instance);
                }
                clearTimeout(this.initializationId);
            }
        }, 100);
    }

    setInstance(instance) {
        this.instance = window.L = window.leaflet = instance;
    }

    getInstance() {
        return this.instance || window.L || window.leaflet;
    }
}
