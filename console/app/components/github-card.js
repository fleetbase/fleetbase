import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { computed } from '@ember/object';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { task } from 'ember-concurrency';
import { storageFor } from 'ember-local-storage';
import { add, isPast } from 'date-fns';
import fetch from 'fetch';

export default class GithubCardComponent extends Component {
    @storageFor('local-cache') localCache;
    @tracked data;
    @tracked tags;
    @tracked isLoading = false;

    @computed('tags.length') get latestRelease() {
        if (isArray(this.tags) && this.tags.length) {
            return this.tags[0];
        }

        return { name: 'v0.0.1' };
    }

    @computed('data.releases_url', 'latestRelease.name') get releaseUrl() {
        let url = 'https://github.com/fleetbase/fleetbase/releases';

        if (!isBlank(this.latestRelease?.name)) {
            url += '/tag/' + this.latestRelease.name;
        }

        return url;
    }

    constructor() {
        super(...arguments);
        this.getRepositoryData.perform();
        this.getRepositoryTags.perform();
    }

    @task *getRepositoryData() {
        // Check if cached data and expiration are available
        const cachedData = this.localCache.get('fleetbase-github-data');
        const expiration = this.localCache.get('fleetbase-github-data-expiration');

        // Check if the cached data is still valid
        if (cachedData && expiration && !isPast(new Date(expiration))) {
            // Use cached data
            this.data = cachedData;
        } else {
            // Fetch new data
            const response = yield fetch('https://api.github.com/repos/fleetbase/fleetbase');
            if (response.ok) {
                this.data = yield response.json();
                this.localCache.set('fleetbase-github-data', this.data);
                this.localCache.set('fleetbase-github-data-expiration', add(new Date(), { hours: 6 }));
            }
        }
    }

    @task *getRepositoryTags() {
        // Check if cached tags and expiration are available
        const cachedTags = this.localCache.get('fleetbase-github-tags');
        const expiration = this.localCache.get('fleetbase-github-tags-expiration');

        // Check if the cached tags are still valid
        if (cachedTags && expiration && !isPast(new Date(expiration))) {
            // Use cached tags
            this.tags = cachedTags;
        } else {
            // Fetch new tags
            const response = yield fetch('https://api.github.com/repos/fleetbase/fleetbase/tags');
            if (response.ok) {
                this.tags = yield response.json();
                this.localCache.set('fleetbase-github-tags', this.tags);
                this.localCache.set('fleetbase-github-tags-expiration', add(new Date(), { hours: 6 }));
            }
        }
    }
}
