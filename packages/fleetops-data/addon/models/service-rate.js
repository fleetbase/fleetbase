import Model, { attr, hasMany, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { getOwner } from '@ember/application';
import { isArray } from '@ember/array';
import { format as formatDate, formatDistanceToNow } from 'date-fns';
import isModel from '@fleetbase/ember-core/utils/is-model';

export default class ServiceRate extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') service_area_uuid;
    @attr('string') zone_uuid;
    @attr('string') order_config_uuid;

    /** @relationships */
    @hasMany('service-rate-fee') rate_fees;
    @hasMany('service-rate-parcel-fee') parcel_fees;
    @belongsTo('service-area') service_area;
    @belongsTo('zone') zone;

    /** @attributes */
    @attr('string') service_area_name;
    @attr('string') zone_name;
    @attr('string') service_name;
    @attr('string') service_type;
    @attr('string') base_fee;
    @attr('string') per_meter_flat_rate_fee;
    @attr('string') per_meter_unit;
    @attr('string') algorithm;
    @attr('string') rate_calculation_method;
    @attr('string') cod_calculation_method;
    @attr('string') cod_flat_fee;
    @attr('string') cod_percent;
    @attr('string') peak_hours_calculation_method;
    @attr('string') peak_hours_flat_fee;
    @attr('string') peak_hours_percent;
    @attr('string') peak_hours_start;
    @attr('string') peak_hours_end;
    @attr('string') currency;
    @attr('string') duration_terms;
    @attr('string') estimated_days;
    @attr('boolean') has_cod_fee;
    @attr('boolean') has_peak_hours_fee;
    @attr('raw') meta;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('updated_at') get updatedAgo() {
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        return formatDate(this.updated_at, 'PPP p');
    }

    @computed('updated_at') get updatedAtShort() {
        return formatDate(this.updated_at, 'dd, MMM');
    }

    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        return this.created_at ? formatDate(this.created_at, 'PPP p') : null;
    }

    @computed('created_at') get createdAtShort() {
        return this.created_at ? formatDate(this.created_at, 'dd, MMM') : null;
    }

    @computed('rate_calculation_method') get isFixedMeter() {
        return this.rate_calculation_method === 'fixed_meter';
    }

    @computed('rate_calculation_method') get isPerMeter() {
        return this.rate_calculation_method === 'per_meter';
    }

    @computed('rate_calculation_method') get isPerDrop() {
        return this.rate_calculation_method === 'per_drop';
    }

    @computed('rate_calculation_method') get isAlgorithm() {
        return this.rate_calculation_method === 'algo';
    }

    @computed('service_type') get isParcelService() {
        return this.service_type === 'parcel';
    }

    @computed('peak_hours_calculation_method') get hasPeakHoursFlatFee() {
        return this.peak_hours_calculation_method === 'flat';
    }

    @computed('peak_hours_calculation_method') get hasPeakHoursPercentageFee() {
        return this.peak_hours_calculation_method === 'percentage';
    }

    @computed('cod_calculation_method') get hasCodFlatFee() {
        return this.cod_calculation_method === 'flat';
    }

    @computed('cod_calculation_method') get hasCodPercentageFee() {
        return this.cod_calculation_method === 'percentage';
    }

    /** @methods */
    setServiceRateFees(fees = []) {
        if (!isArray(fees)) {
            return this;
        }

        let serviceRateFees = [];
        let owner = getOwner(this);
        let store = owner.lookup('service:store');

        for (let i = 0; i < fees.length; i++) {
            let rateFee = fees.objectAt(i);

            rateFee.currency = this.currency;

            if (isModel(rateFee)) {
                serviceRateFees.pushObject(rateFee);
            } else {
                serviceRateFees.pushObject(store.createRecord('service-rate-fee', rateFee));
            }
        }

        this.rate_fees.pushObjects(serviceRateFees);

        return this;
    }

    clearServiceRateFees() {
        this.rate_fees.clear();

        return this;
    }

    setServiceRateParcelFees(fees = []) {
        if (!isArray(fees)) {
            return this;
        }

        let serviceRateParcelFees = [];
        let owner = getOwner(this);
        let store = owner.lookup('service:store');

        for (let i = 0; i < fees.length; i++) {
            let parcelFee = fees.objectAt(i);

            parcelFee.currency = this.currency;

            if (isModel(parcelFee)) {
                serviceRateParcelFees.pushObject(parcelFee);
            } else {
                serviceRateParcelFees.pushObject(store.createRecord('service-rate-parcel-fee', parcelFee));
            }
        }

        this.parcel_fees.pushObjects(serviceRateParcelFees);
        return this;
    }
}
