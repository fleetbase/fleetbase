import FacilitatorModel from './facilitator';
import { attr } from '@ember-data/model';
import { notEmpty } from '@ember/object/computed';

export default class FacilitatorVendorModel extends FacilitatorModel {
    /** @ids */
    @attr('string') uuid;
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') type_uuid;
    @attr('string') connect_company_uuid;
    @attr('string') logo_uuid;
    @attr('string') internal_id;
    @attr('string') business_id;

    /** @attributes */
    @attr('string') name;
    @attr('string') email;
    @attr('string') website_url;
    @attr('string') phone;
    @attr('string') address;
    @attr('string') address_street;
    @attr('string') place_uuid;
    @attr('string') country;
    @attr('string') status;
    @attr('string') slug;
    @attr('string') type;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @notEmpty('place_uuid') has_place;
}
