<?php

namespace App\Services;

use Illuminate\Support\Facades\Lang;

class LocationTranslatorService
{
    public function translateLocation($locationName, $locale = null)
    {
        // Normalize the location key (lowercase, no spaces)
        $key = strtolower(str_replace(' ', '_', $locationName));
        
        // Set locale if provided
        if ($locale) {
            app()->setLocale($locale);
        }
        
        // Check if translation exists
        if (Lang::has('places.' . $key)) {
            return trans('places.' . $key);
        }
        
        // Return original if no translation exists
        return $locationName;
    }
}