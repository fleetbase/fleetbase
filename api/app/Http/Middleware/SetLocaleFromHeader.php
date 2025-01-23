<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\App;

class SetLocaleFromHeader
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
       // Check if the 'X-Locale' header exists
       $locale = $request->header('X-Locale');

       // If the locale exists and is valid, set the locale
    //    if ($locale && in_array($locale, ['en', 'fr', 'es', 'de'])) {
        if (isset($locale)) {
           App::setLocale($locale);
       } else {
           // Default to 'en' if the header is not set or is invalid
           App::setLocale('en');
       }

       return $next($request);
    }
}
