<?php

namespace Fleetbase\Expansions;

use Closure;
use Fleetbase\Build\Expansion;
use Fleetbase\Routing\RESTRegistrar;
use Illuminate\Routing\PendingResourceRegistration;
use Illuminate\Support\Str;

class Route implements Expansion
{
    /**
     * Get the target class to expand.
     *
     * @return string|Class
     */
    public static function target()
    {
        return \Illuminate\Support\Facades\Route::class;
    }

    /**
     * Registers a REST complicit collection of routes.
     *
     * @return \Closure
     */
    public function fleetbaseRestRoutes()
    {
        /*
         * Registers a REST complicit collection of routes.
         *
         * @param string $name
         * @param string|null $controller
         * @param array $options
         * @param Closure $callback Can be use to define additional routes
         * @return PendingResourceRegistration
         */
        return function (string $name, $controller = null, $options = [], ?\Closure $callback = null) {
            /** @var \Illuminate\Routing\Router $this */
            if (is_callable($controller) && $callback === null) {
                $callback   = $controller;
                $controller = null;
            }

            if (is_callable($options) && $callback === null) {
                $callback = $options;
                $options  = [];
            }

            if ($controller === null) {
                $controller = Str::studly(Str::singular($name)) . 'Controller';
            }

            if ($this->container && $this->container->bound(RESTRegistrar::class)) {
                $registrar = $this->container->make(RESTRegistrar::class);
            } else {
                $registrar = new RESTRegistrar($this);
            }

            return (new PendingResourceRegistration($registrar, $name, $controller, $options))->setRouter($this)->extend($callback);
        };
    }

    public function fleetbaseRoutes()
    {
        return function (string $name, callable|array|null $registerFn = null, $options = [], $controller = null) {
            /** @var \Illuminate\Routing\Router $this */
            if (is_array($registerFn) && !empty($registerFn) && empty($options)) {
                $options = $registerFn;
            }

            if (is_callable($controller) && $registerFn === null) {
                $registerFn = $controller;
                $controller = null;
            }

            if (is_callable($options) && $registerFn === null) {
                $registerFn = $options;
                $options    = [];
            }

            if ($controller === null) {
                $controller = Str::studly(Str::singular($name)) . 'Controller';
            }

            if (app()->version() > 8) {
                $options['controller'] = $controller;
            }

            $make = function (string $routeName) use ($controller) {
                return $controller . '@' . $routeName;
            };

            // Add groupstack to options
            $options['groupStack'] = $this->getGroupStack();

            $register = function ($router) use ($name, $registerFn, $make, $controller, $options) {
                if (is_callable($registerFn)) {
                    $router->group(
                        ['prefix' => $name],
                        function ($router) use ($registerFn, $make, $controller) {
                            $registerFn($router, $make, $controller);
                        }
                    );
                }

                $router->fleetbaseRestRoutes($name, $controller, $options);
            };

            return $this->group($options, $register);
        };
    }

    public function fleetbaseAuthRoutes()
    {
        return function (?callable $registerFn = null, ?callable $registerProtectedFn = null) {
            /** @var \Illuminate\Routing\Router $this */
            return $this->group(
                ['prefix' => 'auth'],
                function ($router) use ($registerFn, $registerProtectedFn) {
                    $router->group(
                        ['middleware' => ['throttle:10,1', \Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]],
                        function ($router) use ($registerFn) {
                            $router->post('login', 'AuthController@login');
                            $router->post('sign-up', 'AuthController@signUp');
                            $router->post('logout', 'AuthController@logout');
                            $router->post('get-magic-reset-link', 'AuthController@createPasswordReset');
                            $router->post('reset-password', 'AuthController@resetPassword');
                            $router->post('create-verification-session', 'AuthController@createVerificationSession');
                            $router->post('validate-verification-session', 'AuthController@validateVerificationSession');
                            $router->post('send-verification-email', 'AuthController@sendVerificationEmail');
                            $router->post('verify-email', 'AuthController@verifyEmail');
                            $router->get('validate-verification', 'AuthController@validateVerificationCode');

                            if (is_callable($registerFn)) {
                                $registerFn($router);
                            }
                        }
                    );

                    $router->group(
                        ['middleware' => ['fleetbase.protected', \Spatie\ResponseCache\Middlewares\DoNotCacheResponse::class]],
                        function ($router) use ($registerProtectedFn) {
                            $router->post('switch-organization', 'AuthController@switchOrganization');
                            $router->post('join-organization', 'AuthController@joinOrganization');
                            $router->post('create-organization', 'AuthController@createOrganization');
                            $router->get('session', 'AuthController@session');
                            $router->get('organizations', 'AuthController@getUserOrganizations');
                            $router->get('services', 'AuthController@services');

                            if (is_callable($registerProtectedFn)) {
                                $registerProtectedFn($router);
                            }
                        }
                    );
                }
            );
        };
    }

    public function registerFleetbaseOnboardRoutes()
    {
        return function () {
            return $this;
        };
    }
}
