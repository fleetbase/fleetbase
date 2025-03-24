import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleHomeRoute extends Route {
  @service session;
  @service router; // Inject router service

  beforeModel() {
    if (this.session.isAuthenticated) {
        //Redirect to orders page
        const currentPath = window.location.pathname;
        if (currentPath === '/' || currentPath === '/auth') {
          this.router.transitionTo('console.fleet-ops');
        }
      
    }
  }
}
