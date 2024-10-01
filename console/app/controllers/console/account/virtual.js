import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class ConsoleAccountVirtualController extends Controller {
    @tracked view;
    queryParams = ['view'];
}
