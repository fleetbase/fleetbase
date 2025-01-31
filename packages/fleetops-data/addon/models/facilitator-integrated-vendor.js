import FacilitatorModel from './facilitator';
import { attr } from '@ember-data/model';

export default class FacilitatorIntegratedVendorModel extends FacilitatorModel {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') created_by_uuid;

    /** @attributes */
    @attr('string') host;
    @attr('string') namespace;
    @attr('string') provider;
    @attr('boolean') sandbox;
    @attr('raw') credentials;
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @dynamic */
    @attr('string') name;
    @attr('string') photo_url;
    @attr('string') status;
    @attr('string') type;
    @attr('string') address;
    @attr('string') internal_id;
    @attr('string') email;
    @attr('string') phone;
    @attr('raw') provider_settings;
    @attr('raw') service_types;
    @attr('raw') supported_countries;
}
