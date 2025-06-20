// app/routes/onboard/verify-email.js
import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class OnboardVerifyEmailRoute extends Route {
    @service router;
    
    queryParams = {
        code: {
            refreshModel: false,
        },
        hello: {
            refreshModel: false,
        },
    };
    
    beforeModel(transition) {
        let { hello } = transition.to.queryParams;
        
        // Simple validation - just check if hello exists
        if (!hello) {
            console.error('Missing hello parameter in onboard flow');
            return this.router.transitionTo('auth.login');
        }
    }
    
    setupController(controller, model) {
        super.setupController(controller, model);
        
        // Get query parameters and set them on the controller
        const params = this.paramsFor(this.routeName);
        
        controller.setProperties({
            code: params.code,
            hello: params.hello
        });
    }
}