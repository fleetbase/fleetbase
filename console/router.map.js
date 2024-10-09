import EmberRouter from '@ember/routing/router';
import config from '@fleetbase/console/config/environment';

export default class Router extends EmberRouter {
    location = config.locationType;
    rootURL = config.rootURL;
}

Router.map(function () {
    this.route('virtual', { path: '/:slug' });
    this.route('install');
    this.route('onboard', function () {
        this.route('verify-email');
    });
    this.route('auth', function () {
        this.route('login', { path: '/' });
        this.route('forgot-password');
        this.route('reset-password', { path: '/reset-password/:id' });
        this.route('two-fa');
        this.route('verification');
        this.route('portal-login', { path: '/portal' });
    });
    this.route('invite', { path: 'join' }, function () {
        this.route('for-driver', { path: '/fleet/:public_id' });
        this.route('for-user', { path: '/org/:public_id' });
    });
    this.route('console', { path: '/' }, function () {
        this.route('home', { path: '/' });
        this.route('notifications');
        this.route('account', function () {
            this.route('virtual', { path: '/:slug' });
            this.route('auth');
            this.route('organizations');
        });
        this.route('settings', function () {
            this.route('virtual', { path: '/:slug' });
            this.route('two-fa');
        });
        this.route('virtual', { path: '/:slug' });
        this.route('admin', function () {
            this.route('config', function () {
                this.route('database');
                this.route('cache');
                this.route('filesystem');
                this.route('mail');
                this.route('notification-channels', { path: '/push-notifications' });
                this.route('queue');
                this.route('services');
                this.route('socket');
            });
            this.route('branding');
            this.route('notifications');
            this.route('two-fa-settings');
            this.route('virtual', { path: '/:slug' });
            this.route('organizations', function () {
                this.route('index', { path: '/' }, function () {
                    this.route('users', { path: '/:public_id/users' });
                });
            });
            this.route('schedule-monitor', function () {
                this.route('logs', { path: '/:id/logs' });
            });
        });
    });
    this.route('catch', { path: '/*' });
});
