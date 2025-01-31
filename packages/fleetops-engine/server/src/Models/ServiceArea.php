<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\FleetOps\Casts\MultiPolygon as MultiPolygonCast;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialTrait;
use Fleetbase\LaravelMysqlSpatial\Types\LineString;
use Fleetbase\LaravelMysqlSpatial\Types\MultiPolygon;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\LaravelMysqlSpatial\Types\Polygon;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\SendsWebhooks;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Support\Arr;

/**
 * @var Point        $location
 * @var MultiPolygon $border
 */
class ServiceArea extends Model
{
    use HasUuid;
    use HasPublicId;
    use SendsWebhooks;
    use TracksApiCredential;
    use SpatialTrait;
    use HasApiModelBehavior;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'service_areas';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'sa';

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = [];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['_key', 'company_uuid', 'name', 'type', 'parent_uuid', 'border', 'color', 'stroke_color', 'status'];

    /**
     * The attributes that are spatial columns.
     *
     * @var array
     */
    protected $spatialFields = ['border'];

    /**
     * Relationships to load with model.
     *
     * @var array
     */
    protected $with = ['zones'];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = [];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'border' => MultiPolygonCast::class,
    ];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function zones()
    {
        return $this->hasMany(Zone::class)->without(['serviceArea']);
    }

    /**
     * Sets the status attribute for the model.
     *
     * @param string|null $status the status value, defaults to 'active' if not provided
     *
     * @return void
     */
    public function setStatusAttribute(?string $status = 'active')
    {
        $this->attributes['status'] = $status;
    }

    /**
     * Sets the type attribute for the model.
     *
     * @param string|null $type the type value, defaults to 'country' if not provided
     *
     * @return void
     */
    public function setTypeAttribute(?string $type = 'country')
    {
        $this->attributes['type'] = $type;
    }

    /**
     * Creates a polygon from a given point and radius.
     *
     * @param Point $point  the central point from which to create the polygon
     * @param int   $meters The radius in meters for the polygon. Default is 500 meters.
     *
     * @return Polygon returns a Polygon object
     */
    public static function createPolygonFromPoint(Point $point, int $meters = 500): Polygon
    {
        $coordinates = array_map(
            function ($coord) {
                return new Point(...$coord);
            },
            Utils::coordsToCircle($point->getLat(), $point->getLng(), $meters)
        );

        return new Polygon([new LineString($coordinates)]);
    }

    /**
     * Creates a multi-polygon from a given point and radius.
     *
     * @param Point $point  the central point from which to create the multi-polygon
     * @param int   $meters The radius in meters for the multi-polygon. Default is 500 meters.
     *
     * @return MultiPolygon returns a MultiPolygon object
     */
    public static function createMultiPolygonFromPoint(Point $point, int $meters = 500): MultiPolygon
    {
        $coordinates = Utils::coordsToCircle($point->getLat(), $point->getLng(), $meters);

        // first and last positions should be equivalent
        if (Arr::first($coordinates) !== Arr::last($coordinates)) {
            $coordinates[] = Arr::first($coordinates);
        }

        // conver the coordinate pairs to points
        $coordinates = array_map(
            function ($coord) {
                return new Point(...$coord);
            },
            $coordinates
        );

        $polygon = new Polygon([new LineString($coordinates)]);

        return new MultiPolygon([$polygon]);
    }

    /**
     * Retrieves the location attribute as a point.
     *
     * @return Point returns the centroid of the border as a Point object
     */
    public function getLocationAttribute(): Point
    {
        $centroid = $this->getCentroid();

        return new Point($centroid->x(), $centroid->y());
    }

    /**
     * Retrieves the latitude component of the location attribute.
     *
     * @return float returns the latitude value
     */
    public function getLatitudeAttribute(): float
    {
        return $this->location->getLat();
    }

    /**
     * Retrieves the longitude component of the location attribute.
     *
     * @return float returns the longitude value
     */
    public function getLongitudeAttribute(): float
    {
        return $this->location->getLng();
    }

    /**
     * Creates a polygon from the center point of the current object.
     *
     * @param int $meters The radius in meters for the polygon. Default is 500 meters.
     *
     * @return \League\Geotools\Polygon\Polygon returns a Polygon object
     */
    public function createPolygonFromCenter(int $meters = 500): \League\Geotools\Polygon\Polygon
    {
        $coordinates = Utils::coordsToCircle($this->latitude, $this->longitude, $meters);

        return new \League\Geotools\Polygon\Polygon($coordinates);
    }

    /**
     * Converts the border attribute to a MultiPolygon object.
     *
     * @return \League\Geotools\Polygon\MultiPolygon returns a MultiPolygon object representing the border
     */
    public function asMultiPolygon(): \League\Geotools\Polygon\MultiPolygon
    {
        $polygons = [];

        if (is_iterable($this->border)) {
            foreach ($this->border as $polygon) {
                $coordinates = [];
                foreach ($polygon as $lineString) {
                    foreach ($lineString as $point) {
                        $coordinates[] = [$point->getLat(), $point->getLng()];
                    }
                }

                if (count($coordinates)) {
                    $polygons[] = new \League\Geotools\Polygon\Polygon($coordinates);
                }
            }
        }

        if (empty($polygons)) {
            return null;
        }

        return new \League\Geotools\Polygon\MultiPolygon($polygons);
    }

    /**
     * Converts the border's coordinates to an array of \Brick\Geo\Point objects.
     *
     * @return \Brick\Geo\Point[] an array of \Brick\Geo\Point objects representing the coordinates
     */
    public function toGeosCoordinates(): array
    {
        $coordinates = [];

        if (is_iterable($this->border)) {
            foreach ($this->border as $polygon) {
                foreach ($polygon as $lineString) {
                    foreach ($lineString as $point) {
                        $coordinates[] = \Brick\Geo\Point::fromText('POINT (' . $point->getLat() . ' ' . $point->getLng() . ')');
                    }
                }
            }
        }

        return $coordinates;
    }

    /**
     * Converts the border's coordinates to an array of \Brick\Geo\LineString objects.
     *
     * @return \Brick\Geo\LineString[] an array of \Brick\Geo\LineString objects
     */
    public function toGeosLineStrings(): array
    {
        $lineStrings = [];
        if (is_iterable($this->border)) {
            foreach ($this->border as $polygon) {
                $points = [];

                foreach ($polygon as $lineString) {
                    foreach ($lineString as $point) {
                        $points[] = \Brick\Geo\Point::fromText('POINT (' . $point->getLat() . ' ' . $point->getLng() . ')');
                    }
                }

                if ($points) {
                    $lineStrings[] = \Brick\Geo\LineString::of(...$points);
                }
            }
        }

        return $lineStrings;
    }

    /**
     * Converts the first LineString from the border into a \Brick\Geo\Polygon.
     *
     * @return \Brick\Geo\Polygon a \Brick\Geo\Polygon object created from the first line string of the border
     */
    public function toGeosPolygon(): ?\Brick\Geo\Polygon
    {
        $lineString = Arr::first($this->toGeosLineStrings());

        if (empty($lineString)) {
            return null;
        }

        return \Brick\Geo\Polygon::of($lineString);
    }

    /**
     * Converts the border's coordinates to a \Brick\Geo\MultiPolygon object.
     *
     * @return \Brick\Geo\MultiPolygon a \Brick\Geo\MultiPolygon object representing the border
     */
    public function toGeosMultiPolygon(): ?\Brick\Geo\MultiPolygon
    {
        $polygons = [];

        if (is_iterable($this->border)) {
            foreach ($this->border as $polygon) {
                $points = [];

                foreach ($polygon as $lineString) {
                    foreach ($lineString as $point) {
                        $points[] = \Brick\Geo\Point::fromText('POINT (' . $point->getLat() . ' ' . $point->getLng() . ')');
                    }
                }

                $lineString = \Brick\Geo\LineString::of(...$points);
                $polygons[] = \Brick\Geo\Polygon::of($lineString);
            }
        }

        if (empty($polygons)) {
            return null;
        }

        return \Brick\Geo\MultiPolygon::of(...$polygons);
    }

    /**
     * Calculates the centroid of the border as a \Brick\Geo\Point.
     *
     * @return \Brick\Geo\Point the centroid of the border as a \Brick\Geo\Point object
     */
    public function getCentroid(): \Brick\Geo\Point
    {
        $geometryEngine       = new \Brick\Geo\Engine\GEOSEngine();
        $borderAsMultiPolygon = $this->toGeosMultiPolygon();

        if ($borderAsMultiPolygon instanceof \Brick\Geo\Geometry) {
            return $geometryEngine->centroid($borderAsMultiPolygon);
        }

        return \Brick\Geo\Point::fromText('POINT (0 0)');
    }

    /**
     * Converts the border attribute to a Polygon object.
     *
     * @return \League\Geotools\Polygon\Polygon returns the first Polygon object from the border
     */
    public function asPolygon(): ?\League\Geotools\Polygon\Polygon
    {
        $polygons = [];

        if (is_iterable($this->border)) {
            foreach ($this->border as $polygon) {
                $coordinates = [];
                foreach ($polygon as $point) {
                    $coordinates[] = [$point->getLat(), $point->getLng()];
                }
                $polygons[] = new \League\Geotools\Polygon\Polygon($coordinates);
            }
        }

        return Arr::first($polygons);
    }

    /**
     * Checks if a given point is included within the border.
     *
     * @param Point $point the point to check
     *
     * @return bool returns true if the point is inside the polygon, false otherwise
     */
    public function includesPoint(Point $point): bool
    {
        $latitude   = $point->getLat();
        $longitude  = $point->getLng();
        $coordinate = new \League\Geotools\Coordinate\Coordinate([$latitude, $longitude]);

        return $this->asPolygon()->pointInPolygon($coordinate);
    }

    /**
     * Checks if a set of points are all included within the border.
     *
     * @param array $coordinates an array of coordinates to check
     *
     * @return bool returns true if all points are inside the polygon, false otherwise
     */
    public function includesPoints(array $coordinates = []): bool
    {
        foreach ($coordinates as $coord) {
            $point         = Utils::getPointFromMixed($coord);
            $includesPoint = $this->includesPoint($point);

            if (!$includesPoint) {
                return false;
            }
        }

        return true;
    }
}
