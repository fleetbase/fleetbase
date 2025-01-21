import FacilitatorModel from './facilitator';
import { attr } from '@ember-data/model';

export default class FacilitatorContactModel extends FacilitatorModel {
    /** @ids */
    @attr('string') uuid;
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') photo_uuid;

    /** @attributes */
    @attr('string') photo_url;
    @attr('string') name;
    @attr('string') title;
    @attr('string') email;
    @attr('string') phone;
    @attr('string') type;
    @attr('string') slug;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;
}
