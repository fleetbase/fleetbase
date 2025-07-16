import buildRoutes from 'ember-engines/routes';

export default buildRoutes(function () {
    this.route('settings', function () {
        this.route('navigator-app');
        this.route('payments', function () {
            this.route('index', { path: '/' });
            this.route('onboard');
        });
    });
    this.route('virtual', { path: '/:section/:slug' });
    this.route('operations', { path: '/' }, function () {
        this.route('dispatch');
        this.route('zones', function () {});
        this.route('order-config', function () {});
        this.route('service-rates', function () {
            this.route('index', { path: '/' }, function () {
                this.route('new');
                this.route('edit', { path: '/:public_id' });
            });
        });
        this.route('scheduler', function () {});
        this.route('orders', { path: '/' }, function () {
            this.route('index', { path: '/' }, function () {
                this.route('new');
                this.route('view', { path: '/:public_id' });
              
                this.route('config', function () {
                    this.route('types', { path: '/' });
                });
            });
            this.route('routes-segments', { path: '/routes-segments/:payload_uuid' });
        });
     
    });
    this.route('management', { path: '/manage' }, function () {
        this.route('fleets', function () {
            this.route('index', { path: '/' }, function () {
                this.route('new');
                this.route('details', { path: '/:public_id' });
                this.route('edit', { path: '/edit/:public_id' });
            });
        });
        this.route('vendors', function () {
            this.route('index', { path: '/' }, function () {
                this.route('new');
                this.route('details', { path: '/:public_id' });
                this.route('edit', { path: '/edit/:public_id' });
            });
        });
        this.route('drivers', function () {
            this.route('index', { path: '/' }, function () {
                this.route('new');
                this.route('details', { path: '/:public_id' });
                this.route('edit', { path: '/edit/:public_id' });
            });
        });
        this.route('vehicles', function () {
            this.route('index', { path: '/' }, function () {
                this.route('new');
                this.route('details', { path: '/:public_id' });
                this.route('edit', { path: '/edit/:public_id' });
            });
        });
        this.route('places', function () {
            this.route('index', { path: '/' }, function () {
                this.route('new');
                this.route('details', { path: '/:public_id' });
                this.route('edit', { path: '/edit/:public_id' });
            });
        });
        this.route('contacts', function () {
            this.route('index', { path: '/' }, function () {
                this.route('new');
                this.route('details', { path: '/:public_id' });
                this.route('edit', { path: '/edit/:public_id' });
            });
            this.route('customers', function () {
                this.route('new');
                this.route('details', { path: '/:public_id' });
                this.route('edit', { path: '/edit/:public_id' });
            });
        });
        this.route('fuel-reports', function () {
            this.route('index', { path: '/' }, function () {
                this.route('new');
                this.route('details', { path: '/:public_id' });
                this.route('edit', { path: '/edit/:public_id' });
            });
            
        });
        this.route('parking', function () {
            this.route('index', { path: '/' }, function () {
                this.route('new');
                this.route('details', { path: '/:public_id' });
                this.route('edit', { path: '/edit/:public_id' });
            });
        });
        this.route('toll-reports', function () {
            this.route('index', { path: '/' }, function () {
                this.route('new');
                this.route('details', { path: '/:public_id' });
                this.route('edit', { path: '/edit/:public_id' });
            });
        });
        this.route('issues', function () {
            this.route('index', { path: '/' }, function () {
                this.route('new');
                this.route('details', { path: '/:public_id' });
                this.route('edit', { path: '/edit/:public_id' });
            });
        });
        this.route('leaves', function () {
            this.route('index', { path: '/' }, function () {
                this.route('new');
                this.route('details', { path: '/:public_id' });
                this.route('edit', { path: '/edit/:public_id' });
            });
        });
        this.route('settings', function () {});
    });
    this.route('comms', function () {
        this.route('chat');
        this.route('intercom');
    });
});
