import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class OnboardIndexController extends Controller {
    @tracked step;
    @tracked session;
    @tracked code;
}
