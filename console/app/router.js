import EmberRouter from '@ember/routing/router';
import config from '@fleetbase/console/config/environment';

export default class Router extends EmberRouter {
    location = config.locationType;
    rootURL = config.rootURL;
}

Router.map(function () {
    this.route('auth', function () {
        this.route('login', { path: '/' });
        this.route('forgot-password');
        this.route('reset-password');
    });
    this.route('onboard', function () {
        this.route('verify-email');
    });
    this.route('invite', { path: 'join' }, function () {
        this.route('for-driver', { path: '/fleet/:public_id' });
        this.route('for-user', { path: '/org/:public_id' });
    });
    this.route('console', { path: '/' }, function () {
        this.route('home', { path: '/' });
        this.route('extensions');
        this.route('notifications');
        this.route('account', function () {
            this.route('virtual', { path: '/:slug/:view' });
        });
        this.route('settings', function () {
            this.route('virtual', { path: '/:slug/:view' });
        });
        this.route('virtual', { path: '/:slug/:view' });
        this.route('admin', function () {
            this.route('config', function () {
                this.route('database');
                this.route('cache');
                this.route('filesystem');
                this.route('mail');
                this.route('notification-channels');
                this.route('queue');
                this.route('services');
                this.route('socket');
            });
            this.route('branding');
            this.route('notifications');
            this.route('virtual', { path: '/:slug/:view' });
        });

        this.mount('@fleetbase/dev-engine', {
            as: 'developers',
            path: 'developers'
        });

        this.mount('@fleetbase/fleetops-engine', {
            as: 'fleet-ops',
            path: 'fleet-ops'
        });

        this.mount('@fleetbase/iam-engine', {
            as: 'iam',
            path: 'iam'
        });

        this.mount('@fleetbase/storefront-engine', {
            as: 'storefront',
            path: 'storefront'
        });
    });
    this.route('install');
});
