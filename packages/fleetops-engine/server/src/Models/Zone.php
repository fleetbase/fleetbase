<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\FleetOps\Casts\Polygon as PolygonCast;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialTrait;
use Fleetbase\LaravelMysqlSpatial\Types\LineString;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\LaravelMysqlSpatial\Types\Polygon;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\SendsWebhooks;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Support\Arr;

class Zone extends Model
{
    use HasUuid;
    use HasPublicId;
    use SendsWebhooks;
    use TracksApiCredential;
    use SpatialTrait;
    use HasApiModelBehavior;

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'zone';

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'zones';

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = [];

    /**
     * The attributes that are spatial columns.
     *
     * @var array
     */
    protected $spatialFields = ['border'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['_key', 'company_uuid', 'service_area_uuid', 'name', 'description', 'border', 'color', 'stroke_color', 'status'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'border' => PolygonCast::class,
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['type'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function serviceArea()
    {
        return $this->belongsTo(ServiceArea::class);
    }

    /**
     * The type of area.
     *
     * @return string
     */
    public function getTypeAttribute()
    {
        return 'zone';
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
     * Calculates the centroid of the border as a \Brick\Geo\Point.
     *
     * @return \Brick\Geo\Point the centroid of the border as a \Brick\Geo\Point object
     */
    public function getCentroid(): \Brick\Geo\Point
    {
        $geometryEngine  = new \Brick\Geo\Engine\GEOSEngine();
        $borderAsPolygon = $this->toGeosPolygon();

        if ($borderAsPolygon instanceof \Brick\Geo\Geometry) {
            return $geometryEngine->centroid($borderAsPolygon);
        }

        return \Brick\Geo\Point::fromText('POINT (0 0)');
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
            foreach ($this->border as $lineString) {
                $points = [];

                foreach ($lineString as $point) {
                    $points[] = \Brick\Geo\Point::fromText('POINT (' . $point->getLat() . ' ' . $point->getLng() . ')');
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
     * Creates a polygon from a given point and radius.
     *
     * @param Point $point  the central point from which to create the polygon
     * @param int   $meters The radius in meters for the polygon. Default is 500 meters.
     *
     * @return Polygon returns a Polygon object
     */
    public static function createPolygonFromPoint(Point $point, int $meters = 500): Polygon
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

        return new Polygon([new LineString($coordinates)]);
    }
}
