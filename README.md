laravel-twilio
===============
Laravel Twillio API Integration

[![Build Status](https://travis-ci.org/aloha/laravel4-twilio.svg)](https://travis-ci.org/laravel/framework)
[![Total Downloads](https://poser.pugx.org/aloha/twilio/downloads.svg)](https://packagist.org/packages/aloha/twilio)
[![Latest Stable Version](https://poser.pugx.org/aloha/twilio/v/stable.svg)](https://packagist.org/packages/aloha/twilio)
[![Latest Unstable Version](https://poser.pugx.org/aloha/twilio/v/unstable.svg)](https://packagist.org/packages/aloha/twilio)
[![License](https://poser.pugx.org/aloha/twilio/license.svg)](https://packagist.org/packages/aloha/twilio)

- `twilio:sms`
- `twilio:call`

## Installation

Begin by installing this package through Composer. Run this command from the Terminal:

```bash
    composer require aloha/twilio 1.0.2
```

## Laravel integration

To wire this up in your Laravel project, you need to add the service provider. Open `app/config/app.php`, and add a new item to the providers array.

```php
'Aloha\Twilio\Support\Laravel\ServiceProvider',
```

Then, add a Facade for more convenient usage. In `app/config/app.php` add the following line to the `aliases` array:

```php
'Twilio' => 'Aloha\Twilio\Support\Laravel\Facade',
```

Edit `services.php` in your config folder with your appropriate Twilio settings. Example config can be found in [this file](src/config/services.php).

### Facade usage

Sending a SMS Message

```php
<?php

Twilio::message('+18085551212', 'Pink Elephants and Happy Rainbows');
```

Creating a Call

```php
<?php

Twilio::call('+18085551212', 'http://foo.com/call.xml');
```

Generating TwiML

```php
<?php

$twiml = Twilio::twiml(function($message) {
    $message->say('Hello');
    $message->play('https://api.twilio.com/cowbell.mp3', array('loop' => 5));
});

print $twiml;
```

### License

laravel-twilio is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT)
