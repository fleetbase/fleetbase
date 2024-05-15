import Route from '@ember/routing/route';

export default class OnboardVerifyEmailRoute extends Route {
    queryParams = {
        code: {
            refreshModel: false,
        },
        hello: {
            refreshModel: false,
        },
    };
}
