import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import fetch from 'fetch';

export default class GithubCardComponent extends Component {
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
        this.loadRepositoryData();
        this.loadRepositoryTags();
    }

    @action loadRepositoryData() {
        this.isLoading = true;

        return fetch('https://api.github.com/repos/fleetbase/fleetbase')
            .then((response) => {
                return response.json().then((data) => {
                    this.data = data;
                });
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @action loadRepositoryTags() {
        return fetch('https://api.github.com/repos/fleetbase/fleetbase/tags').then((response) => {
            return response.json().then((data) => {
                this.tags = data;
            });
        });
    }
}
