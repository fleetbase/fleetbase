import Model, { attr, belongsTo } from '@ember-data/model';
import { computed, action } from '@ember/object';
import { format as formatDate, formatDistanceToNow, isValid as isValidDate } from 'date-fns';

export default class OrderConfigModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') author_uuid;
    @attr('string') category_uuid;
    @attr('string') icon_uuid;

    /** @relationships */
    @belongsTo('user') author;
    @belongsTo('category') category;
    @belongsTo('file') icon;

    /** @attributs */
    @attr('string') name;
    @attr('string') namespace;
    @attr('string') description;
    @attr('string') key;
    @attr('string') status;
    @attr('string') version;
    @attr('string') type;
    @attr('boolean', { defaultValue: false }) core_service;
    @attr('array') tags;
    @attr('array') entities;
    @attr('object') flow;
    @attr('object') meta;

    /** @computed */
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

        return formatDate(this.updated_at, 'PP HH:mm');
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

        return formatDate(this.created_at, 'PP HH:mm');
    }

    @computed('created_at') get createdAtShort() {
        if (!isValidDate(this.created_at)) {
            return null;
        }

        return formatDate(this.created_at, 'dd, MMM');
    }

    /** @methods */
    /**
     * Adds a new tag to the tags array.
     *
     * This method takes a tag and adds it to the 'tags' array property
     * of the current instance. The 'pushObject' method is used, which is
     * typically available in Ember.js or similar frameworks that extend
     * JavaScript array functionalities.
     *
     * @param {string} tag - The tag to be added to the tags array.
     */
    @action addTag(tag) {
        this.tags.push(tag);
        this.tags = [...this.tags];
    }

    /**
     * Removes a tag from the tags array at a specific index.
     *
     * This method takes an index and removes the element at that position
     * from the 'tags' array property of the current instance. The 'removeAt'
     * method is used, which is typically available in Ember.js or similar
     * frameworks that provide extended array functionalities.
     *
     * @param {number} index - The index of the tag to be removed from the tags array.
     */
    @action removeTag(index) {
        this.tags.removeAt(index);
        this.tags = [...this.tags];
    }
}
