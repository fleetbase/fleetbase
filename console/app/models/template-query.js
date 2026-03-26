import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { format, formatDistanceToNow } from 'date-fns';

export default class TemplateQueryModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') uuid;
    @attr('string') company_uuid;
    @attr('string') template_uuid;

    /** @relationships */
    @belongsTo('template', { async: false, inverse: 'queries' }) template;

    /** @attributes */
    @attr('string') name;
    @attr('string') label;
    @attr('string') description;

    /**
     * The fully-qualified PHP model class this query runs against.
     * e.g. "Fleetbase\\Models\\Order", "Fleetbase\\Ledger\\Models\\Invoice"
     */
    @attr('string') resource_type;

    /**
     * JSON object of filter conditions applied to the query.
     * e.g. { "status": "completed", "created_at_gte": "2024-12-01" }
     */
    @attr('object') filters;

    @attr('string') sort_by;
    @attr('string', { defaultValue: 'desc' }) sort_direction;
    @attr('number') limit;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */

    /**
     * The variable name available in the template for iterating this query's results.
     * Derived from the `name` field — lowercased and underscored.
     * e.g. name "December Orders" → variable "{december_orders}"
     */
    @computed('name') get variableName() {
        if (!this.name) return '';
        return this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    @computed('variableName') get variableToken() {
        return `{${this.variableName}}`;
    }

    @computed('resource_type') get resourceTypeLabel() {
        if (!this.resource_type) return '';
        // Extract the short class name from the fully-qualified namespace
        const parts = this.resource_type.split('\\');
        return parts[parts.length - 1];
    }

    @computed('updated_at') get updatedAgo() {
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        return format(this.updated_at, 'yyyy-MM-dd HH:mm');
    }

    @computed('updated_at') get updatedAtShort() {
        return format(this.updated_at, 'PP');
    }

    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        return format(this.created_at, 'yyyy-MM-dd HH:mm');
    }

    @computed('created_at') get createdAtShort() {
        return format(this.created_at, 'PP');
    }
}
