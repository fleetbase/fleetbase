import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleHomeRoute extends Route {
  @service session;
  @service router; // Inject router service

  beforeModel() {
    if (this.session.isAuthenticated) {
        //check the url has /
        if (window.location.pathname === '/') {
            this.router.transitionTo('console.fleet-ops');
        }
      
    }
  }
}
