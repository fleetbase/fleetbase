import Route from '@ember/routing/route';
import removeBootLoader from '../../utils/remove-boot-loader';

export default class AuthForgotPasswordRoute extends Route {
    queryParams = {
        email: {
            refreshModel: false,
        },
    };
}
