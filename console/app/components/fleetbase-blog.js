import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class FleetbaseBlogComponent extends Component {
    @service fetch;
    @tracked posts = [];
    @tracked isLoading = false;

    constructor() {
        super(...arguments);
        this.loadBlogPosts();
    }

    @action loadBlogPosts() {
        this.isLoading = true;

        return this.fetch
            .get('lookup/fleetbase-blog')
            .then((response) => {
                this.posts = response;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
