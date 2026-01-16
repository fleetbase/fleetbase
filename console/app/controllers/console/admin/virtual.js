import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class ConsoleAdminVirtualController extends Controller {
    @tracked bodyClass = 'overflow-y-scroll h-full';
    @tracked containerClass = 'container mx-auto h-screen';
    @tracked wrapperClass = 'max-w-3xl my-10 mx-auto';
    @tracked view;
    queryParams = ['view'];
}
