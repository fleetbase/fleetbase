import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';

export default class EntityModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') internal_id;
    @attr('string') _import_id;
    @attr('string') payload_uuid;
    @attr('string') company_uuid;
    @attr('string') customer_uuid;
    @attr('string') supplier_uuid;
    @attr('string') driver_assigned_uuid;
    @attr('string') tracking_number_uuid;
    @attr('string') destination_uuid;
    @attr('string') photo_uuid;

    /** @relationships */
    @belongsTo('payload') payload;
    @belongsTo('customer', { polymorphic: true, async: false }) customer;
    @belongsTo('vendor') supplier;
    @belongsTo('driver') driver;
    @belongsTo('tracking-number') trackingNumber;
    @belongsTo('place') destination;
    @belongsTo('file') photo;

    /** @attributes */
    @attr('string') name;
    @attr('string') type;
    @attr('string') description;
    @attr('string', {
        defaultValue: 'https://flb-assets.s3-ap-southeast-1.amazonaws.com/static/parcels/medium.png',
    })
    photo_url;
    @attr('string', {
        defaultValue: 'USD',
    })
    currency;
    @attr('string') barcode;
    @attr('string') tracking;
    @attr('string') qr_code;
    @attr('string') weight;
    @attr('string', {
        defaultValue: 'g',
    })
    weight_unit;
    @attr('string') length;
    @attr('string') width;
    @attr('string') height;
    @attr('string', {
        defaultValue: 'cm',
    })
    dimensions_unit;
    @attr('string') declared_value;
    @attr('string') sku;
    @attr('string') price;
    @attr('string') sale_price;
    @attr('string') slug;
    @attr('raw') meta;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('length', 'width', 'height', 'dimensions_unit') get dimensions() {
        return this.length + 'x' + this.width + 'x' + this.height + ' ' + this.dimensions_unit;
    }

    @computed('length', 'dimensions_unit') get displayLength() {
        return this.length + this.dimensions_unit;
    }

    @computed('width', 'dimensions_unit') get displayWidth() {
        return this.width + this.dimensions_unit;
    }

    @computed('height', 'dimensions_unit') get displayHeight() {
        return this.height + this.dimensions_unit;
    }

    @computed('weight', 'weight_unit') get displayWeight() {
        return this.weight + this.weight_unit;
    }

    @computed('updated_at') get updatedAgo() {
        if (!isValidDate(this.updated_at)) {
            return null;
        }
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        if (!isValidDate(this.updated_at)) {
            return null;
        }
        return formatDate(this.updated_at, 'PPP p');
    }

    @computed('updated_at') get updatedAtShort() {
        if (!isValidDate(this.updated_at)) {
            return null;
        }
        return formatDate(this.updated_at, 'dd, MMM');
    }

    @computed('created_at') get createdAgo() {
        if (!isValidDate(this.created_at)) {
            return null;
        }
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        if (!isValidDate(this.created_at)) {
            return null;
        }
        return formatDate(this.created_at, 'PPP p');
    }

    @computed('created_at') get createdAtShort() {
        if (!isValidDate(this.created_at)) {
            return null;
        }
        return formatDate(this.created_at, 'dd, MMM');
    }
}
