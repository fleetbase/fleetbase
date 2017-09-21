laravel-twilio
===============
Laravel Twillio API Integration

[![Build Status](https://travis-ci.org/aloha/laravel-twilio.svg)](https://travis-ci.org/aloha/laravel-twilio)
[![Total Downloads](https://poser.pugx.org/aloha/twilio/downloads.svg)](https://packagist.org/packages/aloha/twilio)
[![Latest Stable Version](https://poser.pugx.org/aloha/twilio/v/stable.svg)](https://packagist.org/packages/aloha/twilio)
[![Latest Unstable Version](https://poser.pugx.org/aloha/twilio/v/unstable.svg)](https://packagist.org/packages/aloha/twilio)
[![License](https://poser.pugx.org/aloha/twilio/license.svg)](https://packagist.org/packages/aloha/twilio)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/aloha/laravel-twilio?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

## Installation

Begin by installing this package through Composer. Run this command from the Terminal:

```bash
composer require aloha/twilio
```

## Laravel integration

To wire this up in your Laravel project, whether it's built in Laravel 4 or 5, you need to add the service provider.
Open `app.php`, and add a new item to the providers array.

```php
'Aloha\Twilio\Support\Laravel\ServiceProvider',
```

This will register two new artisan commands for you:

- `twilio:sms`
- `twilio:call`

And make these objects resolvable from the IoC container:

- `Aloha\Twilio\Manager` (aliased as `twilio`)
- `Aloha\Twilio\TwilioInterface` (resolves a `Twilio` object, the default connection object created by the `Manager`).

There's a Facade class available for you, if you like. In your `app.php` config file add the following
line to the `aliases` array if you want to use a short class name:

```php
'Twilio' => 'Aloha\Twilio\Support\Laravel\Facade',
```

In Laravel 4 you can publish the default config file to `app/config/packages/aloha/twilio/config.php` with the artisan command `config:publish aloha/twilio`.

In Laravel 5 you can publish the default config file to `config/twilio.php` with the artisan command `vendor:publish`.

#### Facade

The facade has the exact same methods as the `Aloha\Twilio\TwilioInterface`. First, include the `Facade` class at the top of your file:

```php
use Twilio;
```

To send a message using the default entry from your `twilio` [config file](src/config/config.php):

```php
Twilio::message($user->phone, $message);
```

One extra feature is that you can define which settings (and which sender phone number) to use:

```php
Twilio::from('call_center')->message($user->phone, $message);
Twilio::from('board_room')->message($boss->phone, 'Hi there boss!');
```

Define multiple entries in your `twilio` [config file](src/config/config.php) to make use of this feature.

### Usage

Creating a Twilio object. This object implements the `Aloha\Twilio\TwilioInterface`.

```php
$twilio = new Aloha\Twilio\Twilio($accountId, $token, $fromNumber);
```

Sending a text message:

```php
$twilio->message('+18085551212', 'Pink Elephants and Happy Rainbows');
```

Creating a call:

```php
$twilio->call('+18085551212', 'http://foo.com/call.xml');
```

Generating a call and building the message in one go:

```php
$twilio->call('+18085551212', function ($message) {
    $message->say('Hello');
    $message->play('https://api.twilio.com/cowbell.mp3', ['loop' => 5]);
});
```

Access the configured `\Services_Twilio` object:

```php
$sdk = $twilio->getTwilio();
```

You can also access this via the Facade as well:

```php
$sdk = Twilio::getTwilio();
```

##### Pass as many optional parameters as you want

If you want to pass on extra optional parameters to the `messages->sendMessage(...)` method [from the Twilio SDK](https://twilio-php.readthedocs.io/en/latest/api/rest.html#Services_Twilio_Rest_Messages::sendMessage), you can do so
by adding to the `message` method. All arguments are passed on, and the `from` field is prepended from configuration.

```php
$twilio->message($to, $message, $mediaUrls, $params);
// passes all these arguments on.
```

The same is true for the [call method](https://twilio-php.readthedocs.io/en/latest/api/rest.html#Services_Twilio_Rest_Calls::create).

```php
$twilio->call($to, $message, $params);
// passes all these arguments on.
```

#### Dummy class

There is a dummy implementation of the `TwilioInterface` available: `Aloha\Twilio\Dummy`. This class
allows you to inject this instead of a working implementation in case you need to run quick integration tests.

#### Logging decorator

There is one more class available for you: the `Aloha\Twilio\LoggingDecorator`. This class wraps any
`TwilioInterface` object and logs whatever Twilio will do for you. It also takes a `Psr\Log\LoggerInterface` object
(like Monolog) for logging, you know.

By default the service providers don't wrap objects with the `LoggingDecorator`,
but it is at your disposal in case you want it. A possible use case is to construct a
`TwilioInterface` object that logs what will happen, but doesn't actually call Twilio (using the Dummy class):

```php
if (getenv('APP_ENV') === 'production') {
    $twilio = $container->make(\Aloha\Twilio\Manager::class);
} else {
    $psrLogger = $container->make(\Psr\Log\LoggerInterface::class);
    $twilio = new LoggingDecorator($psrLogger, new \Aloha\Twilio\Dummy());
}

// Inject it wherever you want.
$notifier = new Notifier($twilio);
```

## Credits

- [Hannes Van De Vreken](https://twitter.com/hannesvdvreken)
- [Travis Ryan](https://twitter.com/nayrsivart)
- [All Contributors](../../contributors)

### License

laravel-twilio is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT)
