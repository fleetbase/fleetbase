# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [2.0.0-RC4](https://github.com/aloha/laravel-twilio/releases/tag/2.0.0-RC4)

### Added

* New method messageWithMedia($to, $message, $media, $from) on ClientInterface, thanks to [@russmatney](https://github.com/russmatney).

## [2.0.0-RC3](https://github.com/aloha/laravel-twilio/releases/tag/2.0.0-RC3)

### Changed

* Allowed v4 of the twilio SDK as well.

## [2.0.0-RC2](https://github.com/aloha/laravel-twilio/releases/tag/2.0.0-RC2)

### Fixed

* Return result of the `TwilioInterface::message` and `TwilioInterface::call` methods on the defaultConnection through the manager.

## [2.0.0-RC1](https://github.com/aloha/laravel-twilio/releases/tag/2.0.0-RC1)

### Changed
- Added a ServiceProvider for Laravel 5 and adapted the original Service Provider to proxy the L4 or L5 service provider depending on the Laravel version.
- Added a Manager class ([#34](https://github.com/aloha/laravel-twilio/pull/34)) to configure a Twilio object from an array of settings, depending on the requested from address.
- Abstracted a TwilioInterface from the Twilio class ([#34](https://github.com/aloha/laravel-twilio/pull/34)).
- Allowed second argument to be callable as message builder ([#36](https://github.com/aloha/laravel-twilio/pull/36)).
- Made the Twilio class independent from the Laravel Framework, thus made the package framework agnostic.
- Moved files around (Facade and Service Providers to Support subnamespace).
- Dropped PHP 5.3 support (by accident, by using square array bracket syntax).
- Autoloading from PSR-0 to PSR-4.
- Changed version constraint for twilio/sdk to `~3.12` because of `3.13.0` release.

### Added
- PSR-2 code style throughout
- .gitattributes file for keeping unnecessary files out of --prefer-dist installations and unified line endings.

### Fixed
- Year in License file

## [1.0.2](https://github.com/aloha/laravel-twilio/releases/tag/1.0.2) - 2014-09-04

### Changed
- Support for all Laravel 4.x versions
- Package renamed from travisjryan/twilio to aloha/twilio
- Changed twilio/sdk dependency from volatile dev-master to 3.12.*

## [1.0.1](https://github.com/aloha/laravel-twilio/releases/tag/1.0.1) - 2014-05-20
