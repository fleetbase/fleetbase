import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default class ConsoleSettingsController extends Controller {
    /**
     * INject the `universe` service
     *
     * @memberof ConsoleSettingsController
     */
    @service universe;
}
