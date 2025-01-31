import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class HomeRoute extends Route {
    /**
     * Inject the `loader` service.
     *
     * @var {Service}
     */
    @service loader;

    @action loading(transition) {
        const loader = this.loader.show({ loadingMessage: `Loading Fleet-Ops...` });

        transition.finally(() => {
            this.loader.removeLoader(loader);
        });
    }
}
