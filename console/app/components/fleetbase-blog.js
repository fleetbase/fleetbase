import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import { debug } from '@ember/debug';
import { storageFor } from 'ember-local-storage';
import { add, isPast } from 'date-fns';
import { task } from 'ember-concurrency';

export default class FleetbaseBlogComponent extends Component {
    @storageFor('local-cache') localCache;
    @service fetch;
    @tracked posts = [];

    constructor() {
        super(...arguments);
        this.loadBlogPosts.perform();
    }

    @task *loadBlogPosts() {
        // Check if cached data and expiration are available
        const cachedData = this.localCache.get('fleetbase-blog-data');
        const expiration = this.localCache.get('fleetbase-blog-data-expiration');

        // Check if the cached data is still valid
        if (cachedData && isArray(cachedData) && expiration && !isPast(new Date(expiration))) {
            // Use cached data
            this.posts = cachedData;
        } else {
            // Fetch new data
            try {
                const data = yield this.fetch.get('lookup/fleetbase-blog');
                this.posts = isArray(data) ? data : [];
                if (data) {
                    this.localCache.set('fleetbase-blog-data', data);
                    this.localCache.set('fleetbase-blog-data-expiration', add(new Date(), { hours: 6 }));
                }
            } catch (err) {
                debug('Failed to load blog: ' + err.message);
            }
        }
    }
}
