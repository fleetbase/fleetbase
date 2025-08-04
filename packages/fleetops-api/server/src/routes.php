<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/
Route::prefix(config('fleetops.api.routing.prefix', null))->namespace('Fleetbase\FleetOps\Http\Controllers')->group(
    function ($router) {
        /*
        |--------------------------------------------------------------------------
        | Consumable FleetOps API Routes
        |--------------------------------------------------------------------------
        |
        | End-user API routes, these are routes that the SDK and applications will interface with, and require API credentials.
        */
        Route::prefix('v1')
            ->middleware(['fleetbase.api', Fleetbase\FleetOps\Http\Middleware\TransformLocationMiddleware::class])
            ->namespace('Api\v1')
            ->group(function ($router) {
                // drivers routes
                $router->group(['prefix' => 'drivers', 'middleware' => [Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]], function () use ($router) {
                    $router->post('register-device', 'DriverController@registerDevice');
                    $router->post('login-with-sms', 'DriverController@loginWithPhone');
                    $router->post('verify-code', 'DriverController@verifyCode');
                    $router->post('login', 'DriverController@login');
                    $router->post('{id}/simulate', 'DriverController@simulate');
                    $router->post('{id}/track', 'DriverController@track');
                    $router->post('{id}/register-device', 'DriverController@registerDevice');
                    $router->post('{id}/switch-organization', 'DriverController@switchOrganization');
                    $router->post('/', 'DriverController@create');
                    $router->get('/', 'DriverController@query');
                    $router->get('{id}', 'DriverController@find');
                    $router->get('{id}/organizations', 'DriverController@listOrganizations');
                    $router->get('{id}/current-organization', 'DriverController@currentOrganization');
                    $router->put('{id}', 'DriverController@update');
                    $router->delete('{id}', 'DriverController@delete');
                });
                // contacts routes
                $router->group(['prefix' => 'contacts'], function () use ($router) {
                    $router->post('/', 'ContactController@create');
                    $router->get('/', 'ContactController@query');
                    $router->get('{id}', 'ContactController@find');
                    $router->put('{id}', 'ContactController@update');
                    $router->delete('{id}', 'ContactController@delete');
                });
                // vendors routes
                $router->group(['prefix' => 'vendors'], function () use ($router) {
                    $router->post('/', 'VendorController@create');
                    $router->get('/', 'VendorController@query');
                    $router->get('{id}', 'VendorController@find');
                    $router->put('{id}', 'VendorController@update');
                    $router->delete('{id}', 'VendorController@delete');
                });
                // issue routes
                $router->group(['prefix' => 'issues'], function () use ($router) {
                    $router->post('/', 'IssueController@create');
                    $router->get('/', 'IssueController@query');
                    $router->get('{id}', 'IssueController@find');
                    $router->put('{id}', 'IssueController@update');
                    $router->delete('{id}', 'IssueController@delete');
                });
                // orders routes
                $router->group(['prefix' => 'orders', 'middleware' => [Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]], function () use ($router) {
                    $router->post('/', 'OrderController@create');
                    $router->get('/', 'OrderController@query');
                    $router->get('{id}', 'OrderController@find');
                    $router->get('{id}/distance-and-time', 'OrderController@getDistanceMatrix');
                    $router->match(['post', 'patch'], '{id}/schedule', 'OrderController@scheduleOrder');
                    $router->match(['post', 'patch'], '{id}/dispatch', 'OrderController@dispatchOrder');
                    $router->post('{id}/start', 'OrderController@startOrder');
                    $router->delete('{id}/cancel', 'OrderController@cancelOrder');
                    $router->match(['post', 'patch'], '{id}/update-activity', 'OrderController@updateActivity');
                    $router->post('{id}/complete', 'OrderController@completeOrder');
                    $router->get('{id}/next-activity', 'OrderController@getNextActivity');
                    $router->match(['post', 'patch'], '{id}/set-destination/{placeId}', 'OrderController@setDestination');
                    $router->post('{id}/capture-signature/{subjectId?}', 'OrderController@captureSignature');
                    $router->post('{id}/capture-qr/{subjectId?}', 'OrderController@captureQrScan');
                    $router->post('{id}/capture-photo/{subjectId?}', 'OrderController@capturePhoto');
                    $router->put('{id}', 'OrderController@update');
                    $router->delete('{id}', 'OrderController@delete');
                    $router->get('{id}/editable-entity-fields', 'OrderController@getEditableEntityFields');
                });
                // entities routes
                $router->group(['prefix' => 'entities'], function () use ($router) {
                    $router->post('/', 'EntityController@create');
                    $router->get('/', 'EntityController@query');
                    $router->get('{id}', 'EntityController@find');
                    $router->put('{id}', 'EntityController@update');
                    $router->delete('{id}', 'EntityController@delete');
                });
                // payloads routes
                $router->group(['prefix' => 'payloads'], function () use ($router) {
                    $router->post('/', 'PayloadController@create');
                    $router->get('/', 'PayloadController@query');
                    $router->get('{id}', 'PayloadController@find');
                    $router->put('{id}', 'PayloadController@update');
                    $router->delete('{id}', 'PayloadController@delete');
                });
                // purchase-rates routes
                $router->group(['prefix' => 'purchase-rates'], function () use ($router) {
                    $router->post('/', 'PurchaseRateController@create');
                    $router->get('/', 'PurchaseRateController@query');
                    $router->get('{id}', 'PurchaseRateController@find');
                });
                // places routes
                $router->group(['prefix' => 'places'], function () use ($router) {
                    $router->post('/', 'PlaceController@create');
                    $router->get('/', 'PlaceController@query');
                    $router->get('search', 'PlaceController@search');
                    $router->get('{id}', 'PlaceController@find');
                    $router->put('{id}', 'PlaceController@update');
                    $router->delete('{id}', 'PlaceController@delete');
                });
                // zones routes
                $router->group(['prefix' => 'zones'], function () use ($router) {
                    $router->post('/', 'ZoneController@create');
                    $router->get('/', 'ZoneController@query');
                    $router->get('{id}', 'ZoneController@find');
                    $router->put('{id}', 'ZoneController@update');
                    $router->delete('{id}', 'ZoneController@delete');
                });
                // service-areas routes
                $router->group(['prefix' => 'service-areas'], function () use ($router) {
                    $router->post('/', 'ServiceAreaController@create');
                    $router->get('/', 'ServiceAreaController@query');
                    $router->get('{id}', 'ServiceAreaController@find');
                    $router->put('{id}', 'ServiceAreaController@update');
                    $router->delete('{id}', 'ServiceAreaController@delete');
                });
                // service-rates routes
                $router->group(['prefix' => 'service-rates'], function () use ($router) {
                    $router->post('/', 'ServiceRateController@create');
                    $router->get('/', 'ServiceRateController@query');
                    $router->get('{id}', 'ServiceRateController@find');
                    $router->put('{id}', 'ServiceRateController@update');
                    $router->delete('{id}', 'ServiceRateController@delete');
                });
                // service-quotes routes
                $router->group(['prefix' => 'service-quotes'], function () use ($router) {
                    $router->get('/', 'ServiceQuoteController@query');
                    $router->get('{id}', 'ServiceQuoteController@find');
                });
                // tracking-numbers routes
                $router->group(['prefix' => 'tracking-numbers'], function () use ($router) {
                    $router->post('/', 'TrackingNumberController@create');
                    $router->post('from-qr', 'TrackingNumberController@fromQR');
                    $router->get('/', 'TrackingNumberController@query');
                    $router->get('{id}', 'TrackingNumberController@find');
                    $router->delete('{id}', 'TrackingNumberController@delete');
                });
                // tracking-statuses routes
                $router->group(['prefix' => 'tracking-statuses'], function () use ($router) {
                    $router->post('/', 'TrackingStatusController@create');
                    $router->get('/', 'TrackingStatusController@query');
                    $router->get('{id}', 'TrackingStatusController@find');
                    $router->put('{id}', 'TrackingStatusController@update');
                    $router->delete('{id}', 'TrackingStatusController@delete');
                });
                // vehicle routes
                $router->group(['prefix' => 'vehicles'], function () use ($router) {
                    $router->post('/', 'VehicleController@create');
                    $router->get('/', 'VehicleController@query');
                    $router->get('{id}', 'VehicleController@find');
                    $router->put('{id}', 'VehicleController@update');
                    $router->delete('{id}', 'VehicleController@delete');
                });
                // fleets routes
                $router->group(['prefix' => 'fleets'], function () use ($router) {
                    $router->post('/', 'FleetController@create');
                    $router->get('/', 'FleetController@query');
                    $router->get('{id}', 'FleetController@find');
                    $router->put('{id}', 'FleetController@update');
                    $router->delete('{id}', 'FleetController@delete');
                });
                // labels routes
                $router->group(['prefix' => 'labels'], function () use ($router) {
                    $router->get('{id}', 'LabelController@getLabel');
                });

                // navigator routes
                $router->group(['prefix' => 'onboard'], function () use ($router) {
                    $router->get('driver-onboard-settings/{companyId}', 'NavigatorController@getDriverOnboardSettings');
                });
            });

        /*
         |--------------------------------------------------------------------------
         | Publicly Consumable FleetOps API Routes
         |--------------------------------------------------------------------------
         |
         | End-user API routes, these are routes that the SDK and applications will interface with, that DO NOT REQUIRE API credentials.
         */
        $router->group(['prefix' => 'v1', 'namespace' => 'Api\v1'], function () use ($router) {
            $router->get('organizations', 'OrganizationController@listOrganizations');
        });

        /*
        |--------------------------------------------------------------------------
        | Navigator App API
        |--------------------------------------------------------------------------
        |
        | Internal routes specific for instance wide authentication/use for navigator app
        */
        Route::prefix('navigator/v1')
            ->group(function ($router) {
                // driver/auth routes
                $router->group(['prefix' => 'drivers', 'namespace' => 'Internal\v1'], function () use ($router) {
                    $router->post('login-with-sms', 'DriverController@loginWithPhone');
                    $router->post('verify-code', 'DriverController@verifyCode');
                    $router->post('login', 'DriverController@login');
                });

                // auth:sanctum
                $router->group(['middleware' => ['fleetbase.protected', Fleetbase\FleetOps\Http\Middleware\TransformLocationMiddleware::class]], function () use ($router) {
                    $router->group(['prefix' => 'orders', 'middleware' => [Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]], function () use ($router) {
                        $router->post('/', 'Api\v1\OrderController@create');
                        $router->get('/', 'Api\v1\OrderController@query');
                        $router->get('{id}', 'Api\v1\OrderController@find');
                        $router->get('{id}/distance-and-time', 'Api\v1\OrderController@getDistanceMatrix');
                        $router->post('{id}/dispatch', 'Api\v1\OrderController@dispatchOrder');
                        $router->post('{id}/start', 'Api\v1\OrderController@startOrder');
                        $router->delete('{id}/cancel', 'Api\v1\OrderController@cancelOrder');
                        $router->post('{id}/update-activity', 'Api\v1\OrderController@updateActivity');
                        $router->post('{id}/complete', 'Api\v1\OrderController@completeOrder');
                        $router->get('{id}/next-activity', 'Api\v1\OrderController@getNextActivity');
                        $router->post('{id}/set-destination/{placeId}', 'Api\v1\OrderController@setDestination');
                        $router->post('{id}/capture-signature/{subjectId?}', 'Api\v1\OrderController@captureSignature');
                        $router->post('{id}/capture-qr/{subjectId?}', 'Api\v1\OrderController@captureQrScan');
                        $router->post('{id}/capture-photo/{subjectId?}', 'Api\v1\OrderController@capturePhoto');
                        $router->put('{id}', 'Api\v1\OrderController@update');
                        $router->delete('{id}', 'Api\v1\OrderController@delete');
                    });

                    $router->group(['prefix' => 'drivers'], function () use ($router) {
                        $router->post('{id}/register-device', 'Api\v1\DriverController@registerDevice');
                        $router->post('{id}/track', 'Api\v1\DriverController@track');
                        $router->post('{id}/switch-organization', 'Api\v1\DriverController@switchOrganization');
                        $router->post('/', 'Api\v1\DriverController@create');
                        $router->get('/', 'Api\v1\DriverController@query');
                        $router->get('{id}', 'Api\v1\DriverController@find');
                        $router->get('{id}/organizations', 'Api\v1\DriverController@listOrganizations');
                        $router->put('{id}', 'Api\v1\DriverController@update');
                        $router->delete('{id}', 'Api\v1\DriverController@delete');
                    });

                    $router->group(['prefix' => 'organizations'], function ($router) {
                        $router->get('current', 'Internal\v1\NavigatorController@getCurrentOrganization');
                    });
                });
            });

        /*
        |--------------------------------------------------------------------------
        | Internal FleetOps API Routes
        |--------------------------------------------------------------------------
        |
        | Primary internal routes for console.
        */
        $router->prefix(config('fleetops.api.routing.internal_prefix', 'int'))->namespace('Internal')->group(
            function ($router) {
                $router->group(
                    ['prefix' => 'v1/fleet-ops', 'namespace' => 'v1'],
                    function ($router) {
                        $router->get('lookup', 'OrderController@lookup');
                    }
                );

                $router->group(
                    ['prefix' => 'v1/fleet-ops/navigator', 'namespace' => 'v1'],
                    function ($router) {
                        $router->get('get-link-app', 'NavigatorController@getLinkAppUrl');
                        $router->get('link-app', 'NavigatorController@linkApp');
                    }
                );

                $router->group(
                    [
                        'prefix'     => 'v1',
                        'namespace'  => 'v1',
                        'middleware' => [
                            'fleetbase.protected',
                            Fleetbase\FleetOps\Http\Middleware\TransformLocationMiddleware::class,
                            Fleetbase\FleetOps\Http\Middleware\SetupDriverSession::class,
                        ],
                    ],
                    function ($router) {
                        $router->fleetbaseRoutes(
                            'contacts',
                            function ($router, $controller) {
                                $router->match(['get', 'post'], 'export', $controller('export'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->post('import', $controller('import'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->get('facilitators/{id}', $controller('getAsFacilitator'));
                                $router->get('customers/{id}', $controller('getAsCustomer'));
                                $router->delete('bulk-delete', $controller('bulkDelete'));
                            }
                        );
                        $router->fleetbaseRoutes(
                            'drivers',
                            function ($router, $controller) {
                                $router->get('statuses', $controller('statuses'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->get('avatars', $controller('avatars'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->match(['get', 'post'], 'export', $controller('export'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->delete('bulk-delete', $controller('bulkDelete'));
                                $router->post('import', $controller('import'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                            }
                        );
                        $router->fleetbaseRoutes('entities');
                        $router->fleetbaseRoutes(
                            'fleets',
                            function ($router, $controller) {
                                $router->post('assign-driver', $controller('assignDriver'));
                                $router->post('remove-driver', $controller('removeDriver'));
                                $router->post('assign-vehicle', $controller('assignVehicle'));
                                $router->post('remove-vehicle', $controller('removeVehicle'));
                                $router->match(['get', 'post'], 'export', $controller('export'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->post('import', $controller('import'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->delete('bulk-delete', $controller('bulkDelete'));
                            }
                        );
                        $router->fleetbaseRoutes(
                            'fuel-reports',
                            function ($router, $controller) {
                                $router->match(['get', 'post'], 'export', $controller('export'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->post('import', $controller('import'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->delete('bulk-delete', $controller('bulkDelete'));
                            }
                        );
                        $router->fleetbaseRoutes(
                            'issues',
                            function ($router, $controller) {
                                $router->match(['get', 'post'], 'export', $controller('export'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->post('import', $controller('import'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->delete('bulk-delete', $controller('bulkDelete'));
                            }
                        );
                        $router->fleetbaseRoutes(
                            'integrated-vendors',
                            function ($router, $controller) {
                                $router->get('supported', $controller('getSupported'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->delete('bulk-delete', $controller('bulkDelete'));
                            }
                        );
                        $router->fleetbaseRoutes(
                            'orders',
                            function ($router, $controller) {
                                $router->get('default-config', $controller('getDefaultOrderConfig'));
                                $router->get('search', $controller('search'));
                                $router->get('statuses', $controller('statuses'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->get('types', $controller('types'));
                                $router->get('label/{id}', $controller('label'));
                                $router->get('next-activity/{id}', $controller('nextActivity'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->get('{id}/tracker', 'OrderController@trackerInfo')->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->get('{id}/eta', 'OrderController@waypointEtas')->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->post('process-imports', $controller('importFromFiles'));
                                $router->patch('route/{id}', $controller('editOrderRoute'));
                                $router->patch('update-activity/{id}', $controller('updateActivity'));
                                $router->patch('bulk-cancel', $controller('bulkCancel'));
                                $router->post('bulk-dispatch', $controller('bulkDispatch'));
                                $router->patch('cancel', $controller('cancel'));
                                $router->patch('dispatch', $controller('dispatchOrder'));
                                $router->patch('start', $controller('start'));
                                $router->delete('bulk-delete', $controller('bulkDelete'));
                                $router->match(['get', 'post'], 'export', $controller('export'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                //get Order route segments-id-> payload_uuid
                                $router->get('{id}/route-segments', 'OrderController@getOrderRouteSegments');
                            }
                        );
                        $router->fleetbaseRoutes('order-configs');
                        $router->fleetbaseRoutes('payloads');
                        $router->fleetbaseRoutes(
                            'places',
                            function ($router, $controller) {
                                $router->get('search', $controller('search'));
                                $router->get('lookup', $controller('geocode'))->middleware(['cache.headers:private;max_age=3600', Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->get('avatars', $controller('avatars'));
                                $router->match(['get', 'post'], 'export', $controller('export'));
                                $router->delete('bulk-delete', $controller('bulkDelete'));
                                $router->post('import', $controller('import'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                            }
                        );
                        $router->fleetbaseRoutes('proofs');
                        $router->fleetbaseRoutes('purchase-rates');
                        $router->fleetbaseRoutes('routes');
                        $router->fleetbaseRoutes(
                            'service-areas',
                            function ($router, $controller) {
                                $router->match(['get', 'post'], 'export', $controller('export'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->delete('bulk-delete', $controller('bulkDelete'));
                            }
                        );
                        $router->fleetbaseRoutes('zones');
                        $router->fleetbaseRoutes(
                            'service-quotes',
                            function ($router, $controller) {
                                $router->post('preliminary', $controller('preliminaryQuery'));
                                $router->post('stripe-checkout-session', $controller('createStripeCheckoutSession'));
                                $router->get('stripe-checkout-session', $controller('getStripeCheckoutSessionStatus'));
                            }
                        );
                        $router->fleetbaseRoutes(
                            'service-rates',
                            function ($router, $controller) {
                                $router->delete('bulk-delete', $controller('bulkDelete'));
                                $router->get('for-route', $controller('getServicesForRoute'));
                                $router->match(['get', 'post'], 'export', $controller('export'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->get('for-route', $controller('getServicesForRoute'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                            }
                        );
                        $router->fleetbaseRoutes('tracking-numbers');
                        $router->fleetbaseRoutes('tracking-statuses');
                        $router->fleetbaseRoutes(
                            'vehicles',
                            function ($router, $controller) {
                                $router->get('statuses', $controller('statuses'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->get('avatars', $controller('avatars'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->match(['get', 'post'], 'export', $controller('export'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->post('import', $controller('import'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->delete('bulk-delete', $controller('bulkDelete'));
                            }
                        );
                        $router->fleetbaseRoutes('vehicle-devices');
                        $router->fleetbaseRoutes(
                            'vendors',
                            function ($router, $controller) {
                                $router->get('statuses', $controller('statuses'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->match(['get', 'post'], 'export', $controller('export'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                $router->get('facilitators/{id}', $controller('getAsFacilitator'));
                                $router->get('customers/{id}', $controller('getAsCustomer'));
                                $router->post('{id}/assign-driver', $controller('assignDriver'));
                                $router->post('{id}/remove-driver', $controller('removeDriver'));
                                $router->delete('bulk-delete', $controller('bulkDelete'));
                                $router->post('import', $controller('import'))->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                            }
                        );
                        $router->group(
                            ['prefix' => 'query'],
                            function () use ($router) {
                                $router->get('customers', 'MorphController@queryCustomersOrFacilitators');
                                $router->get('facilitators', 'MorphController@queryCustomersOrFacilitators');
                            }
                        );
                        $router->group(
                            ['prefix' => 'customers'],
                            function () use ($router) {
                                $router->get('/', 'MorphController@queryCustomers');
                                $router->post('reset-credentials', 'CustomerController@resetCredentials');
                            }
                        );
                        $router->group(
                            ['prefix' => 'facilitators'],
                            function () use ($router) {
                                $router->get('/', 'MorphController@queryFacilitators');
                            }
                        );
                        $router->group(
                            ['prefix' => 'geocoder', ['middleware' => [Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]]],
                            function ($router) {
                                $router->get('reverse', 'GeocoderController@reverse');
                                $router->get('query', 'GeocoderController@geocode');
                            }
                        );
                        $router->group(
                            ['prefix' => 'fleet-ops'],
                            function ($router) {
                                $router->group(
                                    ['prefix' => 'payments', ['middleware' => [Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]]],
                                    function () use ($router) {
                                        $router->post('stripe-account', 'PaymentController@getStripeAccount')->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                        $router->post('stripe-account-session', 'PaymentController@getStripeAccountSession')->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                        $router->get('has-stripe-connect-account', 'PaymentController@hasStripeConnectAccount')->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                        $router->get('payments-received', 'PaymentController@getCompanyReceivedPayments')->middleware([Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]);
                                    }
                                );

                                $router->group(
                                    ['prefix' => 'lookup'],
                                    function ($router) {
                                        $router->get('customers', 'FleetOpsLookupController@polymorphs');
                                        $router->get('facilitators', 'FleetOpsLookupController@polymorphs');
                                    }
                                );
                                $router->group(
                                    ['prefix' => 'live'],
                                    function ($router) {
                                        $router->get('coordinates', 'LiveController@coordinates');
                                        $router->get('routes', 'LiveController@routes');
                                        $router->get('orders', 'LiveController@orders');
                                        $router->get('drivers', 'LiveController@drivers');
                                        $router->get('vehicles', 'LiveController@vehicles');
                                        $router->get('places', 'LiveController@places');
                                    }
                                );
                                $router->group(
                                    ['prefix' => 'settings', 'middleware' => [Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]],
                                    function ($router) {
                                        $router->get('customer-payments-config', 'SettingController@getCustomerPortalPaymentConfig');
                                        $router->post('customer-payments-config', 'SettingController@saveCustomerPortalPaymentConfig');
                                        $router->get('customer-enabled-order-configs', 'SettingController@getCustomerEnabledOrderConfigs');
                                        $router->post('customer-enabled-order-configs', 'SettingController@saveCustomerEnabledOrderConfigs');
                                        $router->get('entity-editing-settings', 'SettingController@getEntityEditingSettings');
                                        $router->post('entity-editing-settings', 'SettingController@saveEntityEditingSettings');
                                        $router->post('driver-onboard-settings', 'SettingController@savedDriverOnboardSettings');
                                        $router->get('driver-onboard-settings/{companyId}', 'SettingController@getDriverOnboardSettings');
                                    }
                                );
                                $router->group(
                                    ['prefix' => 'metrics'],
                                    function ($router) {
                                        $router->get('/', 'MetricsController@all');
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    }
);
