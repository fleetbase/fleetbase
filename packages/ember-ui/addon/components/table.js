import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { isArray } from '@ember/array';
import { later } from '@ember/runloop';
import { filter, alias } from '@ember/object/computed';
import { isEqual } from '@fleetbase/ember-core/decorators/is-equal';
import { inject as service } from '@ember/service';


export default class TableComponent extends Component {
    @service intl;
    @tracked tableNode;
    @tracked allRowsToggled = false;
    @alias('args.rows') rows;
    @alias('args.columns') columns;
    @filter('args.columns.@each.hidden', (column) => !column.hidden) visibleColumns;
    @filter('args.rows.@each.checked', (row) => row.checked) selectedRows;
    @isEqual('selectedRows.length', 'rows.length') allRowsSelected;
    
    /**
     * Formats a column label for translation by converting spaces to hyphens and making it lowercase
     * @param {String} label - The column label to format
     * @return {String} The formatted translation key
     */
    getTranslationKey(column) {
        // First check if column has a translation_key property (add this to your column definitions)
        if (column && typeof column === 'object' && column.translation_key) {
            return `fleet-ops.common.${column.translation_key}`;
        }
        
        // Then check if column is an object with a key property
        if (column && typeof column === 'object' && column.key) {
            return `fleet-ops.common.${column.key.toLowerCase().replace(/ /g, '-')}`;
        }
        
        // Fallback to using the label if no key exists
        if (column && typeof column === 'object' && column.label) {
            // Make sure to handle case when label might be undefined or null
            if (!column.label) {
                return 'fleet-ops.common.unknown';
            }
            
            // Convert label to a standardized format
            const formattedLabel = String(column.label).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            return `fleet-ops.common.${formattedLabel}`;
        }
        
        // If column is just a string
        if (typeof column === 'string') {
            const formattedLabel = column.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            return `fleet-ops.common.${formattedLabel}`;
        }
        
        return 'fleet-ops.common.unknown';
    }
    
    /**
     * Check if a translation exists for the given key
     * @param {String} key - The translation key to check
     * @return {Boolean} Whether the translation exists
     */
    hasTranslation(key) {
        // Ensure key is a string
        if (typeof key !== 'string') {
            return false;
        }
        
        // Check if the key exists in the translations
        return this.intl.exists(key);
    }
    
    /**
     * Translates a column label using the intl service with fallback handling
     * @param {Object} column - The column object
     * @return {String} The translated text
     */
    @action
    formatTranslationKey(column) {
        // Get the primary translation key
        const primaryKey = this.getTranslationKey(column);
        
        // If the primary key has a translation, use it
        if (this.hasTranslation(primaryKey)) {
            return primaryKey;
        }
        
        // Try alternate translation key formats
        if (column && typeof column === 'object') {
            // Try with original label without modification
            if (column.label) {
                const altKey = `fleet-ops.common.${column.label}`;
                if (this.hasTranslation(altKey)) {
                    return altKey;
                }
            }
            
            // Try with valuePath if available
            if (column.valuePath) {
                const valuePathKey = `fleet-ops.common.${column.valuePath.toLowerCase().replace(/\./g, '-')}`;
                if (this.hasTranslation(valuePathKey)) {
                    return valuePathKey;
                }
            }
        }
        
        // If no translation found, use a debug key that will show the missing translation
        // but in a more controlled way
        if (column && typeof column === 'object' && column.label) {
            return column.label;
        }
        
        return primaryKey;
    }
    @action setupComponent(tableNode) {
        const { onSetup } = this.args;

        this.tableNode = tableNode;

        later(
            this,
            () => {
                if (typeof onSetup === 'function') {
                    onSetup(this, tableNode);
                }
            },
            100
        );
    }

    @action addRow(row) {
        if (isArray(row)) {
            return this.addRows(row);
        }

        this.rows.pushObject(row);
        return this;
    }

    @action addRows(rows = []) {
        this.rows.pushObjects(rows);
        return this;
    }

    @action removeRow(row) {
        if (isArray(row)) {
            return this.removeRows(row);
        }

        this.rows.removeObject(row);
        return this.resetRowCheckboxes();
    }

    @action removeRows(rows = []) {
        this.rows.removeObjects(rows);
        return this.resetRowCheckboxes();
    }

    @action resetRowCheckboxes() {
        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows.objectAt(i);
            set(row, 'checked', row.checked === true);
        }

        return this;
    }

    @action selectAllRows() {
        this.allRowsToggled = !this.allRowsToggled;

        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows.objectAt(i);
            set(row, 'checked', this.allRowsToggled);
        }
    }

    @action untoggleSelectAll() {
        this.allRowsToggled = false;
    }

    @action toggleSelectAll() {
        this.allRowsToggled = true;
    }
}
