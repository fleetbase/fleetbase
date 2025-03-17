<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Casts\PolymorphicType;
use Fleetbase\FleetOps\Casts\Point;
use Fleetbase\FleetOps\Support\Geocoding;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialTrait;
use Fleetbase\LaravelMysqlSpatial\Types\Point as SpatialPoint;
use Fleetbase\Models\File;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasMetaAttributes;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Fleetbase\Traits\SendsWebhooks;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Place extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;
    use Searchable;
    use SendsWebhooks;
    use TracksApiCredential;
    use SpatialTrait;
    use HasMetaAttributes;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'places';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'place';

    /**
     * The attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['name', 'street1', 'street2', 'country', 'province', 'district', 'city', 'postal_code', 'phone', 'public_id', 'code'];

    /**
     * The attributes that are spatial columns.
     *
     * @var array
     */
    protected $spatialFields = ['location'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        '_key',
        '_import_id',
        'company_uuid',
        'owner_uuid',
        'owner_type',
        'avatar_url',
        'name',
        'type',
        'street1',
        'street2',
        'city',
        'province',
        'postal_code',
        'neighborhood',
        'district',
        'building',
        'security_access_code',
        'country',
        'location',
        'meta',
        'phone',
        'code'
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['country_name', 'address', 'address_html'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [
        'id',
        '_key',
        'connect_company_uuid',
        'owner_uuid',
        'owner_type',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'meta'          => Json::class,
        'location'      => Point::class,
        'owner_type'    => PolymorphicType::class,
    ];

    /**
     * Attributes that is filterable on this model.
     *
     * @var array
     */
    protected $filterParams = ['vendor', 'contact', 'vendor_uuid', 'vendor_name'];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\MorphTo
     */
    public function owner()
    {
        return $this->morphTo(__FILE__, 'owner_type', 'owner_uuid')->withDefault(
            [
                'name' => 'N/A',
            ]
        );
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function company()
    {
        return $this->belongsTo(\Fleetbase\Models\Company::class);
    }

    /**
     * Get the country data for the model instance.
     */
    public function getCountryDataAttribute(): array
    {
        return $this->fromCache(
            'country_data',
            function () {
                if (empty($this->country)) {
                    return [];
                }

                return Utils::getCountryData($this->country);
            }
        );
    }

    /**
     * Returns the full country name.
     */
    public function getCountryNameAttribute(): ?string
    {
        return data_get($this, 'country_data.name.common');
    }

    /**
     * Get avatar url.
     *
     * @return string|null
     */
    public function getAvatarUrlAttribute($value)
    {
        if (!$value) {
            return static::getAvatar();
        }

        if (Str::isUuid($value)) {
            return static::getAvatar($value);
        }

        return $value;
    }

    /**
     * Get an avatar url by key.
     *
     * @param string $key
     */
    public static function getAvatar($key = 'basic-building'): ?string
    {
        if (Str::isUuid($key)) {
            $file = File::where('uuid', $key)->first();
            if ($file) {
                return $file->url;
            }

            return null;
        }

        return static::getAvatarOptions()->get($key);
    }

    /**
     * Get all avatar options for a vehicle.
     *
     * @return \Illuminate\Support\Collection
     */
    public static function getAvatarOptions()
    {
        $options = [
            'basic-building.png',
        ];

        // Get custom avatars
        $customAvatars = collect(File::where('type', 'place-avatar')->get()->mapWithKeys(
            function ($file) {
                $key = str_replace(['.svg', '.png'], '', 'Custom: ' . $file->original_filename);

                return [$key => $file->uuid];
            }
        )->toArray());

        // Create default avatars included from fleetbase
        $avatars = collect($options)->mapWithKeys(
            function ($option) {
                $key = str_replace(['.svg', '.png'], '', $option);

                return [$key => Utils::assetFromS3('static/place-icons/' . $option)];
            }
        );

        return $customAvatars->merge($avatars);
    }

    /**
     * Returns a Point instance from the location of the model.
     */
    public function getLocationAsPoint(): SpatialPoint
    {
        return Utils::getPointFromCoordinates($this->location);
    }

    /**
     * Fills empty address attributes with Google address attributes.
     *
     * @return Place $this
     */
    public function fillWithGoogleAddress(\Geocoder\Provider\GoogleMaps\Model\GoogleAddress $address): Place
    {
        $formattedAddress = $address->getFormattedAddress();

        if (empty($this->street1) && $address) {
            $streetAddress = trim($address->getStreetAddress() ?? $address->getStreetNumber() . ' ' . $address->getStreetName());

            if (empty($streetAddress) && $formattedAddress) {
                // fallback use `formattedAddress`
                $streetAddress = explode(',', $formattedAddress, 3);
                $streetAddress = isset($streetAddress[2]) ? trim($streetAddress[0] . ', ' . $streetAddress[1]) : $formattedAddress;
            }

            $this->setAttribute('street1', $streetAddress);
        }

        if (empty($this->postal_code) && $address) {
            $this->setAttribute('postal_code', $address->getPostalCode());
        }

        if (empty($this->neighborhood) && $address) {
            $this->setAttribute('neighborhood', $address->getNeighborhood());
        }

        if (empty($this->city) && $address) {
            $this->setAttribute('city', $address->getLocality());
        }

        if (empty($this->building) && $address) {
            $this->setAttribute('building', $address->getStreetNumber());
        }

        if (empty($this->country) && $address) {
            $this->setAttribute('country', $address->getCountry() instanceof \Geocoder\Model\Country ? $address->getCountry()->getCode() : null);
        }

        if ($coordinates = $address->getCoordinates()) {
            $this->setAttribute('location', new SpatialPoint($coordinates->getLatitude(), $coordinates->getLongitude()));
        }

        return $this;
    }

    /**
     * Returns an array of address attributes using Google address object.
     */
    public static function getGoogleAddressArray(?\Geocoder\Provider\GoogleMaps\Model\GoogleAddress $address): array
    {
        $attributes = [];

        if (!$address instanceof \Geocoder\Provider\GoogleMaps\Model\GoogleAddress) {
            return $attributes;
        }

        $stretAddress = $address->getStreetAddress() ?? $address->getStreetNumber() . ' ' . $address->getStreetName();
        $coordinates  = $address->getCoordinates();

        $attributes['name']         = $stretAddress;
        $attributes['street1']      = $stretAddress;
        $attributes['postal_code']  = $address->getPostalCode();
        $attributes['neighborhood'] = $address->getNeighborhood();
        $attributes['city']         = $address->getLocality();
        $attributes['building']     = $address->getStreetNumber();
        $attributes['country']      = $address->getCountry() instanceof \Geocoder\Model\Country ? $address->getCountry()->getCode() : null;
        $attributes['location']     = new SpatialPoint($coordinates->getLatitude(), $coordinates->getLongitude());

        return $attributes;
    }

    /**
     * Create a new Place instance from a Google Address instance and optionally save it to the database.
     *
     * @return \Fleetbase\Models\Place|null
     */
    public static function createFromGoogleAddress(\Geocoder\Provider\GoogleMaps\Model\GoogleAddress $address, bool $saveInstance = false): ?Place
    {
        $instance = (new static())->fillWithGoogleAddress($address);

        if ($saveInstance) {
            $instance->save();
        }

        return $instance;
    }

    /**
     * Inserts a new Place record into the database with attributes from a Google Maps address.
     *
     * @return string The UUID of the new record
     */
    public static function insertFromGoogleAddress(\Geocoder\Provider\GoogleMaps\Model\GoogleAddress $address)
    {
        $values = static::getGoogleAddressArray($address);

        return static::insertGetUuid($values);
    }

    /**
     * Create a new Place instance from a geocoding lookup.
     *
     * @param bool $saveInstance
     *
     * @return \Fleetbase\Models\Place|null
     */
    public static function createFromGeocodingLookup(string $address, $saveInstance = false): ?Place
    {
        $results = \Geocoder\Laravel\Facades\Geocoder::geocode($address)->get();

        if ($results->isEmpty() || !$results->first()) {
            return (new static())->newInstance(['street1' => $address]);
        }

        return static::createFromGoogleAddress($results->first(), $saveInstance);
    }

    /**
     * Create a new Place instance from a geocoding lookup.
     *
     * @param bool $saveInstance
     *
     * @return \Fleetbase\Models\Place|null
     */
    public static function createFromReverseGeocodingLookup(SpatialPoint $point, $saveInstance = false): ?Place
    {
        $results = Geocoding::reverseFromCoordinates($point->getLat(), $point->getLng());
        $place   = $results->first();

        if (!$place) {
            $place = (new static())->newInstance(['location' => $point]);
        }

        if ($saveInstance) {
            $place->save();
        }

        return $place;
    }

    /**
     * Creates a new Place instance from given coordinates.
     *
     * @param SpatialPoint|array $coordinates
     * @param bool               $saveInstance
     *
     * @return \Fleetbase\Models\Place|null
     */
    public static function createFromCoordinates($coordinates, array $attributes = [], $saveInstance = false): ?Place
    {
        $instance = new Place();
        $point    = Utils::getPointFromMixed($coordinates);

        if ($coordinates instanceof SpatialPoint) {
            $latitude               = $coordinates->getLat();
            $longitude              = $coordinates->getLng();
        } elseif ($point instanceof SpatialPoint) {
            $latitude               = $point->getLat();
            $longitude              = $point->getLng();
        }

        $instance->setAttribute('location', new SpatialPoint($latitude, $longitude));
        $instance->fill($attributes);

        $results = \Geocoder\Laravel\Facades\Geocoder::reverse($latitude, $longitude)->get();

        if ($results->isEmpty()) {
            return null;
        }

        $instance->fillWithGoogleAddress($results->first());

        if ($saveInstance) {
            $instance->save();
        }

        return $instance;
    }

    /**
     * Inserts a new place into the database using latitude and longitude coordinates.
     *
     * @param SpatialPoint|array        $coordinates
     * @param SpatialPoint|string|array $coordinates the coordinates to use for the new place
     *
     * @return mixed returns the UUID of the new place on success or false on failure
     */
    public static function insertFromCoordinates($coordinates, array $attributes = [])
    {
        $attributes = array_merge([], $attributes);
        $point      = Utils::getPointFromMixed($coordinates);

        if ($coordinates instanceof SpatialPoint) {
            $attributes['location'] = $coordinates;
            $latitude               = $coordinates->getLat();
            $longitude              = $coordinates->getLng();
        } elseif ($point instanceof SpatialPoint) {
            $attributes['location'] = $point;
            $latitude               = $point->getLat();
            $longitude              = $point->getLng();
        }

        $results = \Geocoder\Laravel\Facades\Geocoder::reverse($latitude, $longitude)->get();

        if (!$results->count() === 0) {
            return false;
        }

        $address = static::getGoogleAddressArray($results->first());
        $values  = array_merge($attributes, $address);

        return static::insertGetUuid($values);
    }

    /**
     * Creates a Place object from mixed input.
     *
     * @param array $attributes
     * @param bool  $saveInstance
     *
     * @return \Fleetbase\Models\Place|null
     */
    public static function createFromMixed($place, $attributes = [], $saveInstance = true): ?Place
    {
        // If place is already an instance
        if ($place instanceof Place) {
            return $place;
        }

        // If $place is a string
        if (is_string($place)) {
            // Check if $place is a valid public_id, return matching Place object if found
            if (Utils::isPublicId($place)) {
                return Place::where('public_id', $place)->first();
            }

            // Check if $place is a valid uuid, return matching Place object if found
            if (Str::isUuid($place)) {
                return Place::where('uuid', $place)->first();
            }

            // Attempt to find by address or name
            $resolvedFromSearch = static::query()
                ->where('company_uuid', session('company'))
                ->where(function ($q) use ($place) {
                    $q->where('street1', $place);
                    $q->orWhere('name', $place);
                })
                ->first();

            if ($resolvedFromSearch) {
                return $resolvedFromSearch;
            }

            // Return a new Place object created from a geocoding lookup
            return static::createFromGeocodingLookup($place, $saveInstance);
        }
        // If $place is an array of coordinates
        elseif (Utils::isCoordinatesStrict($place)) {
            return static::createFromCoordinates($place, $attributes, $saveInstance);
        }
        // If $place is an array
        elseif (is_array($place)) {
            // If $place is an array of coordinates, create a new Place object
            if (Utils::isCoordinatesStrict($place)) {
                return static::createFromCoordinates($place, $attributes, $saveInstance);
            }

            // Get uuid if set
            $uuid = data_get($place, 'uuid');

            // If $place has a valid uuid and a matching Place object exists, return the uuid
            if (Str::isUuid($uuid) && $existingPlace = Place::where('uuid', $uuid)->first()) {
                return $existingPlace;
            }

            // Otherwise, create a new Place object with the given attributes
            return Place::create($place);
        }
        // If $place is a GoogleAddress object
        elseif ($place instanceof \Geocoder\Provider\GoogleMaps\Model\GoogleAddress) {
            return static::createFromGoogleAddress($place, $saveInstance);
        }

        return null;
    }

    /**
     * Inserts a new place into the database from mixed data.
     *
     * @param mixed $place the data to use to create the new place
     *
     * @return string|bool the UUID of the newly created place or false if the place was not created
     */
    public static function insertFromMixed($place)
    {
        if (Utils::isCoordinatesStrict($place)) {
            // create a place from coordinates using reverse loopup
            return Place::insertFromCoordinates($place);
        } elseif (is_string($place)) {
            if (Utils::isPublicId($place)) {
                $resolvedPlace = Place::where('public_id', $place)->first();

                if ($resolvedPlace) {
                    return $resolvedPlace->uuid;
                }
            }

            if (Str::isUuid($place)) {
                $resolvedPlace = Place::where('uuid', $place)->first();

                if ($resolvedPlace) {
                    return $resolvedPlace->uuid;
                }
            }

            return Place::insertFromGeocodingLookup($place);
        } elseif (is_array($place) || is_object($place)) {
            // if place already exists just return uuid
            if (static::isValidPlaceUuid(data_get($place, 'uuid'))) {
                return data_get($place, 'uuid');
            }

            // if place already exists using `public_id` then resolve and return uuid
            if (static::isValidPlacePublicId(data_get($place, 'public_id'))) {
                $resolvedPlace = static::where('public_id', data_get($place, 'public_id'))->first();

                if ($resolvedPlace) {
                    return $resolvedPlace->uuid;
                }
            }

            $values = $place;

            // create a new place
            return static::insertGetUuid((array) $values);
        } elseif ($place instanceof \Geocoder\Provider\GoogleMaps\Model\GoogleAddress) {
            return static::insertFromGoogleAddress($place);
        }
    }

    public static function isValidPlaceUuid($uuid): bool
    {
        return is_string($uuid) && Str::isUuid($uuid) && Place::where('uuid', $uuid)->exists();
    }

    public static function isValidPlacePublicId($publicId): bool
    {
        return is_string($publicId) && Utils::isPublicId($publicId) && Place::where('public_id', $publicId)->exists();
    }

    /**
     * Inserts a new row into the database and returns the UUID of the inserted row.
     *
     * @param array $values Associative array of values to be inserted
     *
     * @return string|false Returns the UUID of the inserted row if successful, false otherwise
     */
    public static function insertGetUuid($values = [])
    {
        $instance   = new static();
        $fillable   = $instance->getFillable();
        $insertKeys = array_keys($values);
        // clean insert data
        foreach ($insertKeys as $key) {
            if (!in_array($key, $fillable)) {
                unset($values[$key]);
            }
        }

        $values['uuid']         = $uuid = static::generateUuid();
        $values['public_id']    = static::generatePublicId('place');
        $values['created_at']   = Carbon::now()->toDateTimeString();
        $values['company_uuid'] = session('company');
        $values['_key']         = session('api_key', 'console');

        if (isset($values['location'])) {
            $values['location'] = Utils::parsePointToWkt($values['location']);
        }

        // check if place already exists
        $existing = DB::table($instance->getTable())
            ->select(['uuid'])->where([
                'company_uuid' => session('company'),
                'name'         => $values['name'] ?? null,
                'street1'      => $values['street1'] ?? null,
            ])
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            unset($values['uuid'], $values['created_at'], $values['_key'], $values['company_uuid']);
            static::where('uuid', $existing->uuid)->update($values);

            return $existing->uuid;
        }

        if (isset($values['meta']) && (is_object($values['meta']) || is_array($values['meta']))) {
            $values['meta'] = json_encode($values['meta']);
        }

        $result = static::insert($values);

        return $result ? $uuid : false;
    }

    /**
     * Create a new Place instance from an import row.
     *
     * @param array       $row      the import row to create a Place from
     * @param int         $importId the ID of the import the row is associated with
     * @param string|null $country  an optional country to append to the address if it doesn't already contain it
     *
     * @return Place|null the newly created Place instance, or null if no valid address could be found
     */
    public static function createFromImportRow(array $row, ?string $importId = null, $country = null): ?Place
    {
        $addressFields = [
            'street_number' => ['alias' => ['number', 'house_number', 'st_number']],
            'street2'       => ['alias' => ['unit', 'unit_number']],
            'city'          => ['alias' => ['town']],
            'neighborhood'  => ['alias' => ['district']],
            'province'      => ['alias' => ['state']],
            'postal_code'   => ['alias' => ['postal', 'zip', 'zip_code']],
            'phone'         => ['alias' => ['phone', 'mobile', 'phone_number', 'number', 'cell', 'cell_phone', 'mobile_number', 'contact_number', 'tel', 'telephone', 'telephone_number']],
            'location'      => ['alias' => ['position']],
            'latitude'      => ['alias' => ['lat', 'x']],
            'longitude'     => ['alias' => ['lon', 'lng', 'long', 'y']],
        ];
        $address   = '';
        $latitude  = null;
        $longitude = null;

        foreach ($addressFields as $field => $options) {
            if ($field === 'phone') {
                continue;
            }

            if ($field === 'latitude') {
                $latitude = Utils::or($row, array_merge([$field], $options['alias']));
                continue;
            }

            if ($field === 'longitude') {
                $longitude = Utils::or($row, array_merge([$field], $options['alias']));
                continue;
            }

            $value = Utils::or($row, array_merge([$field], $options['alias']));
            if ($value) {
                $address .= $value . ' ';
            }
        }

        $address = rtrim($address);

        // if latitude and longitude provided
        if ($latitude && $longitude) {
            $address = $latitude . ', ' . $longitude;
        }

        // if no address
        if (!$address) {
            return null;
        }

        $place = Place::createFromGeocodingLookup($address, false);
        foreach ($addressFields as $field => $options) {
            if ($place->isFillable($field) && empty($place->{$field})) {
                $value = Utils::or($row, array_merge([$field], $options['alias']));

                if ($value) {
                    $place->{$field} = $value;
                }
            }
        }

        if ($country && !Str::contains($address, $country)) {
            $address .= ' ' . $country;
        }

        // set the phone number if found
        $place->phone = Utils::or($row, $addressFields['phone']['alias']);

        // set meta data
        $meta = collect($row)->except(['name', ...$addressFields['street_number']['alias'], ...$addressFields['street2']['alias'], ...$addressFields['city']['alias'], ...$addressFields['neighborhood']['alias'], ...$addressFields['province']['alias'], ...$addressFields['postal_code']['alias'], ...$addressFields['phone']['alias']])->toArray();
        $place->setMeta($meta);

        // Handle location
        if (empty($place->location)) {
            if ($latitude && $longitude) {
                $place->location = new SpatialPoint($latitude, $longitude);
            } else {
                $place->location = new SpatialPoint(0, 0);
            }
        }

        // set the import id
        if ($importId) {
            $place->setAttribute('_import_id', $importId);
        }

        return $place;
    }

    /**
     * Creates a new Place instance from an imported row of data. This function primarily processes a
     * single or multiple column import to create a Place. Single column imports are expected to contain
     * an address, which is then geocoded. For multiple columns, the import is handled by another method,
     * `createFromImportRow`, assuming these columns directly map to the Place model's attributes.
     *
     * In cases where geocoding is necessary and succeeds, the newly created Place is optionally saved
     * to the database based on the $saveInstance parameter. If geocoding fails or no data is geocodable,
     * the address or data is passed to `createFromMixed` for handling.
     *
     * @param array $row          an associative array representing a row of data to import, typically with keys
     *                            as column names and values as the data entries
     * @param bool  $saveInstance Optional. Whether to save the newly created Place instance to the
     *                            database. Defaults to false, meaning the Place instance is not saved
     *                            unless specified.
     *
     * @return Place Returns a Place instance populated with the provided data or with data derived
     *               from the geocoding results. If the import data cannot directly create a valid Place,
     *               an attempt is made to handle it as mixed data.
     *
     * @throws \Throwable Throws an exception if the geocoding request fails, which should be handled
     *                    by the caller to manage any import or data entry errors.
     *
     * Example:
     * $data = ['address' => '123 Main St, Anytown, USA'];
     * $place = Place::createFromImport($data, true);
     */
    public static function createFromImport(array $row, bool $saveInstance = false): Place
    {
        // Filter array for null key values
        $row = array_filter($row);

        // Handle single column imports
        if (count(array_keys($row)) === 1) {
            // Get the single column name
            $columnName = array_keys($row)[0];

            // Handle when only address column is provided
            if (isset($row[$columnName])) {
                $address = $row[$columnName];

                // Store geocoding results
                $geocodingResults = collect();

                // Try geocoding query
                try {
                    $geocodingResults = Geocoding::query($address, null, null);
                } catch (\Throwable $e) {
                    return static::createFromMixed($address, ['company_uuid' => session('company')], $saveInstance);
                }

                if ($geocodingResults->count()) {
                    $place = $geocodingResults->first();
                    if ($place instanceof Place) {
                        // Set session values
                        $place->setAttribute('company_uuid', session('company'));
                        if ($saveInstance === true) {
                            $place->save();
                        }

                        return $place;
                    }
                }

                // If no geocoding results provided create place from string
                return static::createFromMixed($address, ['company_uuid' => session('company')], $saveInstance);
            }
        }

        // Handle multiple column import with address values
        $place = static::createFromImportRow($row);
        if ($place instanceof Place) {
            $place->setAttribute('company_uuid', session('company'));
            if ($saveInstance === true) {
                $place->save();
            }
        }

        return $place;
    }

    /**
     * Returns a formatted string representation of the address for this Place instance.
     *
     * @param array $except  an optional array of address components to exclude from the returned string
     * @param bool  $useHtml whether to format the returned string as HTML
     *
     * @return string the formatted address string
     */
    public function toAddressString($except = [], $useHtml = false)
    {
        return Utils::getAddressStringForPlace($this, $useHtml, $except);
    }

    /**
     * Get the full place address as a string.
     *
     * @param bool $useHtml whether to use HTML formatting for the address string
     *
     * @return string the full address as a string
     */
    public function getAddressString($useHtml = false)
    {
        return $this->toAddressString($useHtml);
    }

    /**
     * Get the vendor's address as an HTML string.
     *
     * @return string the vendor's address as an HTML string
     */
    public function getAddressHtmlAttribute()
    {
        return $this->getAddressString(true);
    }

    /**
     * Get the vendor's address as a string.
     *
     * @return string the vendor's address as a string
     */
    public function getAddressAttribute()
    {
        return $this->getAddressString();
    }
}
