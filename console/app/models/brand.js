import Model, { attr } from '@ember-data/model';

export default class BrandModel extends Model {
    /** @ids */
    @attr('string') uuid;
    @attr('string') logo_uuid;
    @attr('string') icon_uuid;

    /** @attributes */
    @attr('string') default_theme;
    @attr('string') logo_url;
    @attr('string') icon_url;
}
