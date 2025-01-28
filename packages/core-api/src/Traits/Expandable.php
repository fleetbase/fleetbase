<?php

namespace Fleetbase\Traits;

use Closure;
use Fleetbase\Support\Utils;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

trait Expandable
{
    /**
     * Tracked expansion methods.
     */
    protected static array $added = [];

    /**
     * Dynamically adds a method to the model or class.
     *
     * This method allows you to expand the functionality of the model by adding custom methods
     * at runtime. You can pass either a closure to define the method's behavior, or a class
     * name/object from which the methods will be imported.
     *
     * @param string|\Closure $name    the name of the method or the class/object from which methods are imported
     * @param \Closure|null   $closure the closure defining the method's behavior, if applicable
     *
     * @return void
     */
    public static function expand($name, ?\Closure $closure = null)
    {
        if ((is_object($name) || Utils::classExists($name)) && $closure === null) {
            return static::expandFromClass($name);
        }

        $class = get_class(app(static::class));

        if (!isset(static::$added[$class])) {
            static::$added[$class] = [];
        }

        static::$added[$class][$name] = $closure;
    }

    /**
     * Adds methods to the model from a given class.
     *
     * This method imports public or protected methods from the provided class or object and
     * adds them as expansions to the model. This allows the model to dynamically gain new
     * methods based on the provided class's methods.
     *
     * @param object|string $class the class or object from which to import methods
     */
    public static function expandFromClass($class): void
    {
        $methods = (new \ReflectionClass($class))->getMethods(\ReflectionMethod::IS_PUBLIC | \ReflectionMethod::IS_PROTECTED);
        $target  = null;
        if (method_exists($class, 'target')) {
            $target = app($class::target());
        }

        foreach ($methods as $method) {
            $method->setAccessible(true);

            if (!static::isMethodExpandable($method, $class)) {
                continue;
            }

            $closure = $method->invoke($target);
            static::expand($method->getName(), $closure);
        }
    }

    /**
     * Checks if a specific expansion method exists.
     *
     * This method determines whether a method with the given name has been added as an expansion
     * to the model or class.
     *
     * @param string $name the name of the expansion method to check for
     *
     * @return bool true if the expansion exists, false otherwise
     */
    public static function hasExpansion(string $name): bool
    {
        $class = get_class(app(static::class));

        return isset(static::$added[$class][$name]);
    }

    /**
     * Determines if a given method is an expansion.
     *
     * This method checks whether the method with the provided name is an expansion and
     * whether it is defined as a closure.
     *
     * @param string $name the name of the method to check
     *
     * @return bool true if the method is an expansion and a closure, false otherwise
     */
    public static function isExpansion(string $name): bool
    {
        $class = get_class(app(static::class));

        return static::hasExpansion($name) && static::$added[$class][$name] instanceof \Closure;
    }

    /**
     * Retrieves the closure associated with a specific expansion method.
     *
     * This method returns the closure that was added as an expansion method to the model
     * or class for the given method name.
     *
     * @param string $name the name of the expansion method
     *
     * @return \Closure the closure associated with the expansion method
     */
    public static function getExpansionClosure(string $name)
    {
        $class = get_class(app(static::class));

        return static::$added[$class][$name];
    }

    /**
     * Handle dynamic method calls for expansion methods or delegate to parent.
     *
     * This method first checks if the method being called is an expansion. If it is, the
     * associated closure is executed. If the method is not an expansion but the model is
     * an Eloquent model, the method call is forwarded to the query builder or other relevant
     * model method. If all else fails, the call is passed to the parent class's `__call` method.
     *
     * @param string $method     the name of the method being called
     * @param array  $parameters the parameters passed to the method
     *
     * @return mixed the result of the method call
     *
     * @throws \BadMethodCallException if the method does not exist
     */
    public function __call($method, $parameters)
    {
        if (static::isExpansion($method)) {
            $closure = static::getExpansionClosure($method);

            // Ensure $closure is not static
            if (!($closure instanceof \Closure)) {
                throw new \RuntimeException('Invalid closure provided for expansion method `. $method .`');
            }

            // Handle static closures
            $reflection      = new \ReflectionFunction($closure);
            $isStaticClosure = $reflection->isStatic();
            if ($isStaticClosure) {
                return call_user_func($closure, ...$parameters);
            }

            return $closure->call($this, ...$parameters);
        }

        if (static::isModel()) {
            if (method_exists($this, $method)) {
                return $this->$method(...$parameters);
            }

            // only forward call if connection is working
            try {
                // Try to make a simple DB call
                DB::connection()->getPdo();
            } catch (\Exception $e) {
                // Connection failed, or other error occurred
                return $this->$method(...$parameters);
            }

            return $this->forwardCallTo($this->newQuery(), $method, $parameters);
        }

        // return $this->$method(...$parameters);
        return parent::__call($method, $parameters);
    }

    /**
     * Checks if a method can be expanded.
     *
     * This method determines whether a given method from a class or object can be
     * added as an expansion, based on whether it returns a closure.
     *
     * @param \ReflectionMethod $method the reflection method to check
     * @param object|string     $target the class or object being checked
     *
     * @return bool true if the method can be expanded, false otherwise
     */
    private static function isMethodExpandable(\ReflectionMethod $method, $target)
    {
        $closure = $method->invoke($target);

        return $closure instanceof \Closure;
    }

    /**
     * Determines if the current class is an Eloquent model.
     *
     * This method checks whether the current class instance is an instance of
     * `Illuminate\Database\Eloquent\Model`, indicating it is an Eloquent model.
     *
     * @return bool true if the class is an Eloquent model, false otherwise
     */
    private static function isModel()
    {
        return (new static()) instanceof Model;
    }
}
