import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import fetch from 'fetch';

export default class ModalsChangelogComponent extends Component {
    @tracked releases = [];
    @tracked isLoading = false;

    constructor() {
        super(...arguments);
        this.loadRepositoryReleases();
    }

    @action loadRepositoryReleases() {
        this.isLoading = true;

        return fetch('https://api.github.com/repos/fleetbase/fleetbase/releases')
            .then((response) => {
                return response.json().then((releases) => {
                    this.releases = releases.map((release) => {
                        release.changes = release.body.split('\n').map((line) => line.replace('-', '').replace('*', '').trim());
                        return release;
                    });
                });
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
