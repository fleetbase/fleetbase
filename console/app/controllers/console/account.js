import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default class ConsoleAccountController extends Controller {
    @service('universe/menu-service') menuService;
    @service universe;
}
