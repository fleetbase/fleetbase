import Route from '@ember/routing/route';

export default class AuthForgotPasswordRoute extends Route {
    queryParams = {
        email: {
            refreshModel: false,
        },
    };
}
