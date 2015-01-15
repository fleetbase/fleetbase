laravel4-twilio
===============
Laravel 4 Twillio API Integration

[![Build Status](https://travis-ci.org/aloha/laravel4-twilio.svg)](https://travis-ci.org/aloha/laravel4-twilio)


- `twilio:sms`
- `twilio:call`


## Installation
Begin by installing this package through Composer. Run this command from the Terminal:

    composer require aloha/twilio

Once composer is finished, you need to add the service provider. Open `app/config/app.php`, and add a new item to the providers array.

```php
'Aloha\Twilio\TwilioServiceProvider',
```

Then, add a Facade for more convenient usage. In `app/config/app.php` add the following line to the `aliases` array:

```php
'Twilio' => 'Aloha\Twilio\Facades\Twilio',
```

Publish config files from the Terminal

```bash
php artisan config:publish aloha/twilio
```

Edit `config/packages/aloha/twilio` with your appropriate Twilio settings


## Usage

Sending a SMS Message

```php
<?php

Twilio::message('+18085551212', 'Pink Elephants and Happy Rainbows');

?>
```

Creating a Call

```php
<?php

Twilio::call('+18085551212', 'http://foo.com/call.xml');

?>
```

Generating TwiML

```php
<?php

$twiml = Twilio::twiml(function($message) {
    $message->say('Hello');
    $message->play('https://api.twilio.com/cowbell.mp3', array('loop' => 5));
});

print $twiml;

?>
```

### License

laravel4-twilio is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT)
