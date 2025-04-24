import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class TableCellIssueTypeComponent extends Component {
    @service intl;

    get translatedType() {
        const type = this.args.row[this.args.column.valuePath];

        // Normalize the type: lowercase and replace spaces/slashes with hyphens
        const normalizedType = type
            ?.toLowerCase()
            .replace(/[\s/]+/g, '-');

        return this.intl.t(`statuses.${normalizedType}`, { default: type });
    }
}