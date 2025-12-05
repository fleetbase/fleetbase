import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default class ConsoleSettingsController extends Controller {
    @service('universe/menu-service') menuService;
    @service universe;
}
