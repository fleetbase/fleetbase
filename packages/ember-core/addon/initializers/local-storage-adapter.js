import Store from '@ember-data/store';
import { importData, exportData } from 'ember-local-storage/helpers/import-export';

export function initialize() {
    if (!Store.prototype._emberLocalStoragePatched) {
        Store.reopen({
            _emberLocalStoragePatched: true,
            importData: function (json, options) {
                return importData(this, json, options);
            },
            exportData: function (types, options) {
                return exportData(this, types, options);
            },
        });
    }
}

export default {
    name: 'local-storage-adapter',
    initialize: initialize,
};
