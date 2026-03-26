import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class ConsoleHomeController extends Controller {
    @service store;
    @tracked template = this.store.createRecord('template');
}
