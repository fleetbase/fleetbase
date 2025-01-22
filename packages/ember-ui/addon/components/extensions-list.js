import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ExtensionsListComponent extends Component {
    @service router;
    @service hostRouter;

    @action routeTo(route) {
        const router = this.router ?? this.hostRouter;

        return router.transitionTo(route);
    }
}
