import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class TableCellIssueCategoryComponent extends Component {
    @service intl;

    get translatedCategory() {

        const category = this.args.row[this.args.column.valuePath];

        // Normalize the category: lowercase and replace spaces/slashes with hyphens
        const normalizedType = category
            ?.toLowerCase()
            .replace(/[\s/]+/g, '-');

        return this.intl.t(`statuses.${normalizedType}`, { default: category });
    }
}
