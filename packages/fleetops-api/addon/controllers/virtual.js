import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class VirtualController extends Controller {
    @tracked view;
    queryParams = ['view'];
}
