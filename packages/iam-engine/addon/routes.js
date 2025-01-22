import buildRoutes from 'ember-engines/routes';

export default buildRoutes(function () {
    this.route('home', { path: '/' }, function () {});
    this.route('users', function () {});
    this.route('groups', function () {});
    this.route('roles', function () {});
    this.route('policies', function () {});
});
