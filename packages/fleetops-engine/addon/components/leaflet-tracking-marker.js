import MarkerLayer from 'ember-leaflet/components/marker-layer';
import { isArray } from '@ember/array';

const arrayFromLatLng = (latlng) => {
    if (isArray(latlng)) {
        return latlng;
    }

    const latitude = latlng.lat;
    const longitude = latlng.lng;

    return [latitude, longitude];
};

const L = window.leaflet || window.L;
const oldIE = L.DomUtil.TRANSFORM === 'msTransform';
L.TrackingMarker = L.Marker.extend({
    // eslint-disable-next-line ember/avoid-leaking-state-in-ember-objects
    options: {
        bearingAngle: 0,
        rotationOrigin: '',
    },

    initialize: function (latlng, options) {
        L.Marker.prototype.initialize.call(this);

        L.Util.setOptions(this, options);
        this._latlng = L.latLng(latlng);

        var duration = options.duration || 2000;
        var iconOptions = this.options.icon && this.options.icon.options;
        var iconAnchor = iconOptions && this.options.icon.options.iconAnchor;
        if (iconAnchor) {
            iconAnchor = iconAnchor[0] + 'px ' + iconAnchor[1] + 'px';
        }

        this.options.duration = duration;
        this.options.rotationOrigin = this.options.rotationOrigin || iconAnchor || 'center';
        this.options.bearingAngle = this.options.bearingAngle || 0;

        // Ensure marker keeps rotated during dragging
        this.on('drag', function (e) {
            e.target._applyRotation();
        });

        this.on('move', this.slideCancel, this);

        this._slideToUntil = 0;
        this._slideToDuration = duration;
        this._slideToLatLng = [0, 0];
        this._slideFromLatLng = [0, 0];
        this._slideKeepAtCenter = false;
        this._slideDraggingWasAllowed = false;
        this._slideFrame = 0;
    },

    slideTo: function (latlng, options = {}) {
        if (!this._map) return;

        // Convert latlng to L.LatLng
        latlng = L.latLng(latlng);

        const duration = options.duration || this.options.duration;
        this._slideToDuration = duration;
        this._slideToUntil = performance.now() + duration;
        this._slideFromLatLng = this.getLatLng();
        this._previousPosition = arrayFromLatLng(this._slideFromLatLng);
        this._slideToLatLng = latlng;
        this._nextPosition = arrayFromLatLng(latlng);
        this._slideKeepAtCenter = !!options.keepAtCenter;
        this._slideDraggingWasAllowed = this._slideDraggingWasAllowed !== undefined ? this._slideDraggingWasAllowed : this._map.dragging.enabled();

        if (this._slideKeepAtCenter) {
            this._map.dragging.disable();
            this._map.doubleClickZoom.disable();
            this._map.options.touchZoom = 'center';
            this._map.options.scrollWheelZoom = 'center';
        }

        this.fire('movestart');
        this._slideTo();

        return this;
    },

    _slideTo: function () {
        if (!this._map) return;

        var remaining = this._slideToUntil - performance.now();

        if (remaining < 0) {
            this.setLatLng(this._slideToLatLng);
            this.fire('moveend');
            if (this._slideDraggingWasAllowed) {
                this._map.dragging.enable();
                this._map.doubleClickZoom.enable();
                this._map.options.touchZoom = true;
                this._map.options.scrollWheelZoom = true;
            }
            this._slideDraggingWasAllowed = false;
            return this;
        }

        var startPoint = this._map.latLngToContainerPoint(this._slideFromLatLng);
        var endPoint = this._map.latLngToContainerPoint(this._slideToLatLng);
        var percentDone = (this._slideToDuration - remaining) / this._slideToDuration;

        var currPoint = endPoint.multiplyBy(percentDone).add(startPoint.multiplyBy(1 - percentDone));
        var currLatLng = this._map.containerPointToLatLng(currPoint);
        this.setLatLng(currLatLng);

        if (this._slideKeepAtCenter) {
            this._map.panTo(currLatLng, { animate: false });
        }

        this._slideFrame = L.Util.requestAnimFrame(this._slideTo, this);
    },

    // 🍂method slideCancel(): this
    // Cancels the sliding animation from `slideTo`, if applicable.
    slideCancel: function () {
        L.Util.cancelAnimFrame(this._slideFrame);
    },

    onRemove: function (map) {
        L.Marker.prototype.onRemove.call(this, map);
    },

    _setPos: function (pos) {
        L.Marker.prototype._setPos.call(this, pos);
        this._applyRotation();
    },

    _applyRotation: function () {
        if (this.options.bearingAngle) {
            this._icon.style[L.DomUtil.TRANSFORM + 'Origin'] = this.options.rotationOrigin;

            if (oldIE) {
                // for IE 9, use the 2D rotation
                this._icon.style[L.DomUtil.TRANSFORM] = 'rotate(' + this.options.bearingAngle + 'deg)';
            } else {
                // for modern browsers, prefer the 3D accelerated version
                this._icon.style[L.DomUtil.TRANSFORM] += ' rotateZ(' + this.options.bearingAngle + 'deg)';
            }
        }
    },

    setRotationAngle: function (angle) {
        this.options.bearingAngle = angle;
        this.update();
        return this;
    },

    setRotationOrigin: function (origin) {
        this.options.rotationOrigin = origin;
        this.update();
        return this;
    },
});

const computeBearing = (previousPosition = [0, 0], nextPosition) => {
    let bearing = Math.atan2(
        nextPosition[1] - previousPosition[1], // Longitude difference (x-axis)
        nextPosition[0] - previousPosition[0] // Latitude difference (y-axis)
    );
    bearing = bearing * (180 / Math.PI); // Convert from radians to degrees
    bearing = (bearing + 360) % 360; // Ensure the angle is between 0 and 360
    return bearing;
};

export default class LeafletTrackingMarkerComponent extends MarkerLayer {
    leafletOptions = [
        ...this.leafletOptions,

        /**
         * The previous point coordinates.
         * Allows the marker to automatically computes its rotation angle.
         * To set a fixed value, consider using rotationAngle property.
         *
         * @argument previousPosition
         * @type {LatLng}
         */
        'previousPosition',

        /**
         * The rotation center, as a transform-origin CSS rule.
         *
         * @argument rotationOrigin
         * @type {String}
         */
        'rotationOrigin',

        /**
         * Rotation angle, in degrees, clockwise. Allows setting the marker rotation angle manually,
         * replacing the rotation angle value that was automatically computed using the previousPosition property if provided.
         *
         * @argument rotationAngle
         * @type {Number}
         */
        'rotationAngle',

        /**
         * Required, duration in milliseconds marker will take to destination point.
         *
         * @argument duration
         * @type {Number}
         */
        'duration',

        /**
         * Makes map view follow marker.
         *
         * @argument keepAtCenter
         * @type {Boolean}
         */
        'keepAtCenter',

        /**
         * The Public ID of the marker's model.
         *
         * @argument publicId
         * @type {String}
         */
        'publicId',
    ];

    /**
     * The default value for the rotationOrigin.
     *
     * @memberof LeafletTrackingMarkerComponent
     */
    rotationOrigin = 'center';

    /**
     * The default value for the keepAtCenter.
     *
     * @memberof LeafletTrackingMarkerComponent
     */
    keepAtCenter = false;

    /**
     * The default value for the rotationAngle.
     *
     * @memberof LeafletTrackingMarkerComponent
     */
    rotationAngle = 0;

    getOption(key, defaultValue = null) {
        const value = this.options[key] ?? this[key];
        if (value === undefined) {
            return defaultValue;
        }

        return value;
    }

    _movestart(event) {
        const marker = event.target;
        const rotationOrigin = this.getOption('rotationOrigin');
        const previousPosition = marker._previousPosition;
        const position = marker._nextPosition;
        const moving = previousPosition?.[0] !== position[0] && previousPosition?.[1] !== position[1];

        if (rotationOrigin) {
            marker.setRotationOrigin(rotationOrigin);
        }

        if (moving) {
            const bearingAngle = computeBearing(previousPosition, position);
            marker.setRotationAngle(bearingAngle);
        }
    }

    createLayer() {
        const { rotationAngle, location } = this.args;
        const bearingAngle = rotationAngle ?? computeBearing([0, 0], location);
        return new L.TrackingMarker(...this.requiredOptions, { ...this.options, bearingAngle });
    }
}
