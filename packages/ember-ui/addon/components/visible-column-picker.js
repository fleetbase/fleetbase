import Component from '@glimmer/component';
import { filter } from '@ember/object/computed';
import { set, action } from '@ember/object';

export default class VisibleColumnPickerComponent extends Component {
    /**
     * Filter only columns that have a label.
     *
     * @memberof VisibleColumnPickerComponent
     */
    @filter('args.columns.@each.label', (column) => column.label) columnsWithLabels;

    /**
     * Callback to apply selection changes
     *
     * @memberof VisibleColumnPickerComponent
     */
    @action applyChanges() {
        const { onApply, columns } = this.args;

        if (typeof onApply === 'function') {
            onApply(columns);
        }
    }

    /**
     * Handle column selection
     *
     * @param {Object|Column} column
     * @param {Boolean} checked
     * @memberof VisibleColumnPickerComponent
     */
    @action selectColumn(column, checked) {
        const { onChange, columns } = this.args;

        // update column hidden state based on checkbox
        set(column, 'hidden', !checked);

        if (typeof onChange === 'function') {
            onChange(columns);
        }
    }
}
