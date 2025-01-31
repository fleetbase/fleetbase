import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency-decorators';

export default class NavigatorAppControlsComponent extends Component {
    @service fetch;
    @tracked url;

    constructor() {
        super(...arguments);
        this.getAppLinkUrl.perform();
    }

    @task *getAppLinkUrl() {
        const response = yield this.fetch.get('fleet-ops/navigator/get-link-app');
        const { linkUrl } = response;
        if (linkUrl) {
            this.url = linkUrl;
        }
    }
}
