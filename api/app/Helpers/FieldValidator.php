<?php

namespace App\Helpers;

class FieldValidator
{

    public static function validateField($field, $value, $rowIndex)
    {
        $errors = [];

        // Skip validation if value is empty
        if (empty($value)) {
            return $errors;
        }

        switch ($field) {
            case 'name':
                if (!preg_match('/^[a-zA-Z0-9\s\-\'\.]+$/', $value)) {
                    $errors[] = [
                        (string) $rowIndex,
                        "Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods.",
                        $value
                    ];
                }
                break;

            case 'code':
                if (!preg_match('/^[a-zA-Z0-9\-_]+$/', $value)) {
                    $errors[] = [
                        (string) $rowIndex,
                        "Code can only contain letters, numbers, hyphens, and underscores. No spaces or special characters allowed.",
                        $value
                    ];
                }
                break;

            case 'street1':
            case 'street2':
                if (!preg_match('/^[a-zA-Z0-9\s\.,\-]+$/', $value)) {
                    $errors[] = [
                        (string) $rowIndex,
                        "Street address can only contain letters, numbers, spaces, periods, hyphens, and commas.",
                        $value
                    ];
                }
                break;

            case 'neighborhood':
                if (!preg_match('/^[a-zA-Z0-9\s\-]+$/', $value)) {
                    $errors[] = [
                        (string) $rowIndex,
                        "Neighborhood can only contain letters, numbers, spaces, and hyphens.",
                        $value
                    ];
                }
                break;

            case 'building':
                if (!preg_match('/^[a-zA-Z0-9\s\-\/]+$/', $value)) {
                    $errors[] = [
                        (string) $rowIndex,
                        "Building can only contain letters, numbers, spaces, hyphens, and forward slashes.",
                        $value
                    ];
                }
                break;

            case 'security_access_code':
                if (!preg_match('/^[a-zA-Z0-9]+$/', $value)) {
                    $errors[] = [
                        (string) $rowIndex,
                        "Security access code can only contain letters and numbers. No special characters or spaces allowed.",
                        $value
                    ];
                }
                break;

            case 'postal_code':
                if (!preg_match('/^[a-zA-Z0-9\s\-]+$/', $value)) {
                    $errors[] = [
                        (string) $rowIndex,
                        "Postal code can only contain letters, numbers, spaces, and hyphens.",
                        $value
                    ];
                }
                break;

            case 'city':
                if (!preg_match("/^[a-zA-Z\s]+$/", $value) || strlen($value) > 50) {
                    $errors[] = [
                        (string) $rowIndex,
                        "City name should not contain special characters and must be 50 characters or less.",
                        $value
                    ];
                }
                break;

            case 'state':
                if (!preg_match('/^[a-zA-Z\s\-]+$/', $value)) {
                    $errors[] = [
                        (string) $rowIndex,
                        "State can only contain letters, spaces, and hyphens.",
                        $value
                    ];
                }
                break;

            case 'latitude':
            case 'longitude':
                if (!is_numeric($value)) {
                    $errors[] = [
                        (string) $rowIndex,
                        ucfirst($field) . " must be a valid number.",
                        $value
                    ];
                } elseif ($field === 'latitude' && ($value < -90 || $value > 90)) {
                    $errors[] = [
                        (string) $rowIndex,
                        "Latitude must be between -90 and 90 degrees.",
                        $value
                    ];
                } elseif ($field === 'longitude' && ($value < -180 || $value > 180)) {
                    $errors[] = [
                        (string) $rowIndex,
                        "Longitude must be between -180 and 180 degrees.",
                        $value
                    ];
                }
                break;

            case 'phone':
                if (!preg_match('/^\+[0-9\s\-]+$/', $value)) {
                    $errors[] = [
                        (string) $rowIndex,
                        "Phone number must start with + and contain only numbers, spaces, and hyphens.",
                        $value
                    ];
                } else {
                    $digits = preg_replace('/[^0-9]/', '', $value);
                    if (strlen($digits) < 7 || strlen($digits) > 15) {
                        $errors[] = [
                            (string) $rowIndex,
                            "Phone number must be between 7 and 15 digits (excluding + and formatting).",
                            $value
                        ];
                    }
                }
                break;

            case 'country':
                if (!preg_match('/^[A-Z]{2}$/i', $value)) {
                    $errors[] = [
                        (string) $rowIndex,
                        "Country must be a valid 2-letter ISO code (e.g., US, GB).",
                        $value
                    ];
                }
                break;

            case 'license':
                // UK driving license format: 16 alphanumeric characters, no spaces or special characters
                if (!preg_match('/^[A-Z0-9]{16}$/', strtoupper($value))) {
                    $errors[] = [
                        (string) $rowIndex,
                        "Invalid license number format. Driving license must be 16 alphanumeric characters, no spaces or special characters allowed.",
                        $value
                    ];
                }
                break;
        }

        return $errors;
    }
}
