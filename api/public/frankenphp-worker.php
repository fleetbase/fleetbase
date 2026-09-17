<?php

// Worker startup is not an HTTP request and can exceed PHP's default script limit.
// Octane applies the configured request limit after the application has booted.
set_time_limit(0);

require __DIR__.'/../vendor/laravel/octane/bin/frankenphp-worker.php';
