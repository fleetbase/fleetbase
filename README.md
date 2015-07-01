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

Begin by installing this package through Composer. In Laravel 4, run this command from the Terminal:
```bash
composer require aloha/twilio
```
In Laravel 5, use 2.0.0 pre-release version:
```bash
composer require 'aloha/twilio:2.0.0-RC2'
```
## Laravel integration

To wire this up in your Laravel project, wether it's built in Laravel 4 or 5, you need to add the service provider. Open `app.php`, and add a new item to the providers array.

```php
'Aloha\Twilio\Support\Laravel\ServiceProvider',
```

This will register two new artisan commands for you:

- `twilio:sms`
- `twilio:call`

Then, add a Facade for more convenient usage. In your `app.php` config file add the following line to the `aliases` array:

```php
'Twilio' => 'Aloha\Twilio\Support\Laravel\Facade',
```

In Laravel 4 you need to publish the default config file to `app/config/packages/aloha/twilio/config.php` with the artisan command `config:publish aloha/twilio`.

In Laravel 5 you need to publish the default config file to `config/twilio.php` with the artisan command `vendor:publish`.

#### Facade

The facade now has the exact same methods as the `Aloha\Twilio\TwilioInterface`.
One extra feature is that you can define which settings (and which sender phone number) to use:

```php
Twilio::from('callcenter')->message($user->phone, $message);
Twilio::from('board_room')->message($boss->phone, 'Hi there boss!');
```

Define multiple entries in your `twilio` config to make use of this feature.

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

Generating TwiML:

```php
$twiml = $twilio->twiml(function($message) {
    $message->say('Hello');
    $message->play('https://api.twilio.com/cowbell.mp3', array('loop' => 5));
});

print $twiml;
```

### License

laravel-twilio is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT)
