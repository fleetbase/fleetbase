<?php

namespace Fleetbase\Support;

use Fleetbase\Models\Setting;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Notification Registry for managing registered notifications.
 */
class NotificationRegistry
{
    /**
     * Array to store registered notifications.
     *
     * @var array
     */
    public static $notifications = [];

    /**
     * Array to store registered notificable types.
     *
     * @var array
     */
    public static $notifiables = [
        \Fleetbase\Models\User::class,
        \Fleetbase\Models\Group::class,
        \Fleetbase\Models\Role::class,
        \Fleetbase\Models\Company::class,
    ];

    /**
     * Register a notification.
     *
     * @param string|array $notificationClass the class or an array of classes to register
     * @param sarray       $notificationClass the class or an array of classes to register
     *
     * @throws \Exception
     */
    public static function register($notificationClass, ?array $options = []): void
    {
        if (is_array($notificationClass)) {
            foreach ($notificationClass as $notificationClassElement) {
                if (is_array($notificationClassElement) && count($notificationClassElement) === 2) {
                    static::register($notificationClassElement[0], $notificationClassElement[1]);
                } elseif (is_string($notificationClassElement)) {
                    static::register($notificationClassElement);
                } else {
                    throw new \Exception('Attempted to register invalid notification.');
                }
            }

            return;
        }

        static::$notifications[] = [
            'definition'  => $notificationClass,
            'name'        => static::getNotificationClassProperty($notificationClass, 'name', data_get($options, 'name', null)),
            'description' => static::getNotificationClassProperty($notificationClass, 'description', data_get($options, 'description', null)),
            'package'     => static::getNotificationClassProperty($notificationClass, 'package', data_get($options, 'package', null)),
            'params'      => static::getNotificationClassParameters($notificationClass),
            'options'     => static::getNotificationClassProperty($notificationClass, 'notificationOptions', data_get($options, 'notificationOptions', [])),
        ];
    }

    /**
     * Register a notifiable.
     *
     * @param string|array $notifiableClass the class of the notifiable
     */
    public static function registerNotifiable($notifiableClass): void
    {
        if (is_array($notifiableClass)) {
            foreach ($notifiableClass as $notifiableClassElement) {
                static::registerNotifiable($notifiableClassElement);
            }

            return;
        }

        static::$notifiables[] = $notifiableClass;
    }

    /**
     * Get a property of a notification class.
     *
     * @param string $notificationClass the class name
     * @param string $property          the name of the property to retrieve
     * @param mixed  $defaultValue      the default value if the property is not found
     *
     * @return mixed|null the value of the property or null if not found
     */
    private static function getNotificationClassProperty(string $notificationClass, string $property, $defaultValue = null)
    {
        if (!Utils::classExists($notificationClass) || !property_exists($notificationClass, $property)) {
            return $defaultValue;
        }

        $properties = get_class_vars($notificationClass);

        return data_get($properties, $property, $defaultValue);
    }

    /**
     * Get the parameters required by a specific notification class constructor.
     *
     * @param string $notificationClass the class name of the notification
     *
     * @return array an array of associative arrays, each containing details about a parameter required by the constructor
     */
    private static function getNotificationClassParameters(string $notificationClass): array
    {
        // Make sure class exists
        if (!Utils::classExists($notificationClass)) {
            return [];
        }

        // Create ReflectionMethod object for the constructor
        $reflection = new \ReflectionMethod($notificationClass, '__construct');

        // Get parameters
        $params = $reflection->getParameters();

        // Array to store required parameters
        $requiredParams = [];

        foreach ($params as $param) {
            // Get parameter name
            $name = $param->getName();

            // Get parameter type
            $type = $param->getType();

            // Check if the parameter is optional
            $isOptional = $param->isOptional();

            $requiredParams[] = [
                'name'     => $name,
                'type'     => $type ? $type->getName() : 'mixed',  // If type is null, set it as 'mixed'
                'optional' => $isOptional,
            ];
        }

        return $requiredParams;
    }

    /**
     * Get all notificables for a company.
     */
    public static function getNotifiablesForCompany(string $companyId): array
    {
        $companySessionId = $companyId;

        // if no company session provided, no notifiables
        if (!$companySessionId) {
            return [];
        }

        $notifiables = [];

        // iterate through each notifiable types and get records
        foreach (static::$notifiables as $notifiableClass) {
            $notifiableModel = app($notifiableClass);
            $type            = class_basename($notifiableClass);

            if ($notifiableModel && $notifiableModel instanceof \Illuminate\Database\Eloquent\Model) {
                $table            = $notifiableModel->getTable();
                $modelClass       = get_class($notifiableModel);
                $hasCompanyColumn = Schema::hasColumn($table, 'company_uuid');

                if ($hasCompanyColumn) {
                    $records = $notifiableModel->where('company_uuid', $companySessionId)->get();

                    foreach ($records as $record) {
                        $recordId      = Utils::or($record, ['uuid', 'id']);
                        $notifiables[] = [
                            'label'      => Str::title($type) . ': ' . Utils::or($record, ['name', 'public_id']),
                            'key'        => $recordId,
                            'primaryKey' => $notifiableModel->getKeyName(),
                            'definition' => $modelClass,
                            'value'      => Str::slug(str_replace('\\', '-', $modelClass)) . ':' . $recordId,
                        ];
                    }
                }
            }
        }

        return $notifiables;
    }

    /**
     * Gets all notifiables for the current company session.
     */
    public static function getNotifiables(): array
    {
        $companySessionId = session('company');

        return static::getNotifiablesForCompany($companySessionId);
    }

    /**
     * Finda a notification registration by it's class.
     */
    public static function findNotificationRegistrationByDefinition(string $notificationClass): ?array
    {
        foreach (static::$notifications as $notificationRegistration) {
            if ($notificationRegistration['definition'] === $notificationClass) {
                return $notificationRegistration;
            }
        }

        return null;
    }

    /**
     * Notify one or multiple notifiables using a specific notification class.
     *
     * @param string $notificationClass the class name of the notification to use
     * @param mixed  ...$params         Additional parameters for the notification class.
     *
     * @throws \Exception
     */
    public static function notify($notificationClass, ...$params): void
    {
        // if the class doesn't exist return false
        if (!Utils::classExists($notificationClass)) {
            return;
        }

        // resolve settings for notification
        $notificationSettings = Setting::lookup('notification_settings');

        // Get the notification class definition
        $definition = static::findNotificationRegistrationByDefinition($notificationClass);

        // iterate the properties to find the notifications key starting with the class
        $notificationSettingsKey = Str::camel(str_replace('\\', '', $notificationClass)) . '__' . Str::camel($definition['name']);

        // get the notification settings for this $notificationClass
        $settings = data_get($notificationSettings, $notificationSettingsKey, []);

        // if we have the settings resolve the notifiables
        if ($settings) {
            $notifiables = data_get($settings, 'notifiables', []);

            if (is_array($notifiables)) {
                foreach ($notifiables as $notifiable) {
                    $notifiableModel = static::resolveNotifiable($notifiable);

                    // if has multiple notifiables
                    if (isset($notifiableModel->containsMultipleNotifiables) && is_string($notifiableModel->containsMultipleNotifiables)) {
                        $notifiablesRelationship = $notifiableModel->containsMultipleNotifiables;
                        $multipleNotifiables     = data_get($notifiableModel, $notifiablesRelationship, []);

                        // notifiy each
                        foreach ($multipleNotifiables as $singleNotifiable) {
                            $singleNotifiable->notify(new $notificationClass(...$params));
                        }

                        // continue
                        continue;
                    }

                    if ($notifiableModel) {
                        $notifiableModel->notify(new $notificationClass(...$params));
                    }
                }
            }
        }
    }

    /**
     * Notify one or multiple notifiables using a specific notification class.
     *
     * @param string $notificationClass the class name of the notification to use
     * @param string $notificationName  the name defined for the notification class
     * @param mixed  ...$params         Additional parameters for the notification class.
     *
     * @throws \Exception
     */
    public static function notifyUsingDefinitionName($notificationClass, $notificationName, ...$params): void
    {
        // if the class doesn't exist return false
        if (!Utils::classExists($notificationClass)) {
            return;
        }

        // resolve settings for notification
        $notificationSettings = Setting::lookup('notification_settings');

        // iterate the properties to find the notifications key starting with the class
        $notificationSettingsKey = Str::camel(str_replace('\\', '', $notificationClass)) . '__' . Str::camel($notificationName);

        // get the notification settings for this $notificationClass
        $settings = data_get($notificationSettings, $notificationSettingsKey, []);

        // if we have the settings resolve the notifiables
        if ($settings) {
            $notifiables = data_get($settings, 'notifiables', []);

            if (is_array($notifiables)) {
                foreach ($notifiables as $notifiable) {
                    $notifiableModel = static::resolveNotifiable($notifiable);

                    // if has multiple notifiables
                    if (isset($notifiableModel->containsMultipleNotifiables) && is_string($notifiableModel->containsMultipleNotifiables)) {
                        $notifiablesRelationship = $notifiableModel->containsMultipleNotifiables;
                        $multipleNotifiables     = data_get($notifiableModel, $notifiablesRelationship, []);

                        // notifiy each
                        foreach ($multipleNotifiables as $singleNotifiable) {
                            $singleNotifiable->notify(new $notificationClass(...$params));
                        }

                        // continue
                        continue;
                    }

                    if ($notifiableModel) {
                        $notifiableModel->notify(new $notificationClass(...$params));
                    }
                }
            }
        }
    }

    /**
     * Resolve a notifiable object to an Eloquent model.
     *
     * @param array $notifiableObject an associative array containing the definition and primary key to resolve the notifiable object
     *
     * @return \Illuminate\Database\Eloquent\Model|null the Eloquent model or null if it cannot be resolved
     */
    protected static function resolveNotifiable(array $notifiableObject): ?\Illuminate\Database\Eloquent\Model
    {
        $definition = data_get($notifiableObject, 'definition');
        $primaryKey = data_get($notifiableObject, 'primaryKey');
        $key        = data_get($notifiableObject, 'key');

        // resolve the notifiable
        $modelInstance = app($definition);

        if ($modelInstance instanceof \Illuminate\Database\Eloquent\Model) {
            return $modelInstance->where($primaryKey, $key)->first();
        }

        return null;
    }
}
