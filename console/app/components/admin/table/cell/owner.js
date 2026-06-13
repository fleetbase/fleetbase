import Component from '@glimmer/component';

export default class AdminTableCellOwnerComponent extends Component {
    get owner() {
        return this.resolveBelongsTo(this.args.row?.owner);
    }

    resolveBelongsTo(record) {
        if (!record) {
            return null;
        }

        if (record.content) {
            return record.content;
        }

        if (record.isPending || record.isFulfilled === false || typeof record.then === 'function') {
            return null;
        }

        return record;
    }
}
