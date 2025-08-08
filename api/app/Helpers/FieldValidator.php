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
                if (!preg_match('/^[A-Z0-9\s\-]{5,20}$/i', $value)) {
                    $errors[] = [
                        (string) $rowIndex,
                        "Invalid license number format. Only alphanumeric characters, spaces, and hyphens are allowed. License number must be between 5 and 20 characters.",
                        $value
                    ];
                }
                break;

            case 'task':
                if (strlen($value) > 255) {
                    $errors[] = [
                        (string) $rowIndex,
                        'Task cannot be longer than 255 characters.',
                        $value
                    ];
                } elseif (!preg_match('/^[\p{L}\p{N}\p{P}\p{S}\s]+$/u', $value)) {
                    $errors[] = [
                        (string) $rowIndex,
                        'Task contains invalid characters. Only letters, numbers, and special characters are allowed.',
                        $value
                    ];
                }
                break;

            case 'plate_number':
            case 'license_plate':
                if (strlen($value) > 15) {
                    $errors[] = [
                        (string) $rowIndex,
                        'Plate number cannot be longer than 15 characters.',
                                $value
                            ];
                        } elseif (!preg_match('/^[a-zA-Z0-9]+$/', $value)) {
                            $errors[] = [
                                (string) $rowIndex,
                                'Plate number can only contain alphanumeric characters.',
                                $value
                            ];
                        }
                        break;
        
            case 'vin':
            case 'vin_number':
                if (strlen($value) !== 17) {
                    $errors[] = [
                        (string) $rowIndex,
                        'VIN must be exactly 17 characters long.',
                                $value
                            ];
                        } elseif (!preg_match('/^[A-HJ-NPR-Z0-9]{17}$/i', $value)) {
                            $errors[] = [
                                (string) $rowIndex,
                                'VIN contains invalid characters. Only alphanumeric characters are allowed (excluding I, O, Q).',
                                $value
                            ];
                        }
                        break;
        
            case 'make':
            case 'vehicle_make':
                if (strlen($value) > 50) {
                    $errors[] = [
                        (string) $rowIndex,
                        'Make cannot be longer than 50 characters.',
                                $value
                            ];
                        } elseif (!preg_match('/^[a-zA-Z\s]+$/', $value)) {
                            $errors[] = [
                                (string) $rowIndex,
                                'Make can only contain letters and spaces.',
                                $value
                            ];
                        }
                        break;
        
            case 'model':
            case 'vehicle_model':
                if (strlen($value) > 50) {
                    $errors[] = [
                        (string) $rowIndex,
                        'Model cannot be longer than 50 characters.',
                                $value
                            ];
                        } elseif (!preg_match('/^[a-zA-Z0-9\s\-]+$/', $value)) {
                            $errors[] = [
                                (string) $rowIndex,
                                'Model can only contain alphanumeric characters, spaces, and hyphens.',
                                $value
                            ];
                        }
                        break;
        
            case 'year':
            case 'vehicle_year':
                $currentYear = (int) date('Y');
                if (!preg_match('/^(19[9-9]\d|20[0-9]{2})$/', $value) || (int) $value < 1990 || (int) $value > $currentYear) {
                    $errors[] = [
                        (string) $rowIndex,
                                "Year must be a 4-digit number between 1990 and {$currentYear}.",
                                $value
                            ];
                        }
                        break;
    
        }

        return $errors;
    }
}
