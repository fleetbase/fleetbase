import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class ConsoleVirtualController extends Controller {
    @tracked view;
    queryParams = ['view'];
}
