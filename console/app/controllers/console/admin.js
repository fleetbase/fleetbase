import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default class ConsoleAdminController extends Controller {
    /**
     * Inject the `universe` service.
     *
     * @memberof ConsoleAdminController
     */
    @service universe;
}
