import Route from '@ember/routing/route';

export default class ConsoleAdminTwoFaSettingsRoute extends Route {
    // Loaded here rather than in the controller's constructor — see controller.load().
    setupController(controller) {
        super.setupController(...arguments);
        controller.load();
    }
}
