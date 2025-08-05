import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { action, get } from '@ember/object';
import { isArray } from '@ember/array';
import { dasherize } from '@ember/string';
import { later } from '@ember/runloop';
import { pluralize } from 'ember-inflector';
import { format as formatDate } from 'date-fns';
import { parse as parseDate } from 'date-fns';
import getModelName from '../utils/get-model-name';
import getWithDefault from '../utils/get-with-default';
import humanize from '../utils/humanize';
import first from '../utils/first';

export default class CrudService extends Service {
    @service intl;
    /**
     * Inject the `fetch` service
     *
     * @var {Service}
     */
    @service fetch;

    /**
     * Inject the `modalsManager` service
     *
     * @var {Service}
     */
    @service modalsManager;

    /**
     * Inject the `notifications` service
     *
     * @var {Service}
     */
    @service notifications;

    /**
     * Inject the `store` service
     *
     * @var {Service}
     */
    @service store;

    /**
     * @service currentUser
     */
    @service currentUser;

    /**
     * Generic deletion modal with options
     *
     * @param {Model} model
     * @param {Object} options
     * @void
     */
    @action delete(model, options = {}) {
        const modelName = getModelName(model, get(options, 'modelName'), { humanize: true, capitalizeWords: true });
        //custom delete message for paking and toll
        const custom_model_actions = options.action_path ? options.action_path : null;
        const actionMap = {
            is_parking: {
                title: 'fleet-ops.management.parking.index.delete-parking-report-confirm',
                successMessage: 'fleet-ops.management.parking.index.delete-parking-report-success',
            },
            is_toll: {
                title: 'fleet-ops.management.toll-reports.index.delete-toll-report-confirm',
                successMessage: 'fleet-ops.management.toll-reports.index.delete-toll-report-success',
            },
        };
        
        const { title, successMessage } = actionMap[custom_model_actions] || {
            title: 'common.model-delete-confirmation',
            successMessage: 'common.model-delete-success',
        };
        
        const translatedTitle = this.intl.t(title, { modelName });
        const translatedSuccessMessage = this.intl.t(successMessage, { modelName });
        //end custom translation for parking and toll
        this.modalsManager.confirm({
            title: translatedTitle ,
            args: ['model'],
            model,
            confirm: (modal) => {
                if (typeof options.onConfirm === 'function') {
                    options.onConfirm(model);
                }

                modal.startLoading();

                return model
                    .destroyRecord()
                    .then((model) => {
                        if(translatedSuccessMessage != null) {
                            this.notifications.success(translatedSuccessMessage);
                        }
                        else{
                            this.notifications.success(options.successNotification || `${model.name ? modelName + " '" + model.name + "'" : "'" + modelName + "'"} has been deleted.`);
                        }
                        
                        if (typeof options.onSuccess === 'function') {
                            options.onSuccess(model);
                        }
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);

                        if (typeof options.onError === 'function') {
                            options.onError(error, model);
                        }
                    })
                    .finally(() => {
                        if (typeof options.callback === 'function') {
                            options.callback(model);
                        }
                    });
            },
            ...options,
        });
    }

    /**
     * Generic deletion modal with options
     *
     * @param {Array} selected an array of selected models for deletion
     * @param {Object} options
     * @void
     */
    @action bulkDelete(selected, options = {}) {
        if (!isArray(selected) || selected.length === 0) {
            return;
        }

        const firstModel = first(selected);
        const modelName = getModelName(firstModel, get(options, 'modelName'), { humanize: true, capitalizeWords: true });
        const record_count = selected.length;
        let translateddeleteSuccessMessage;
        if (record_count === 1) {
            translateddeleteSuccessMessage = this.intl.t('common.single-model-delete-success', { modelName });
        } else {
            translateddeleteSuccessMessage = this.intl.t('common.bulk-delete-success', { record_count: record_count, modelName });
        }
        // make sure all are the same type
        selected = selected.filter((m) => getModelName(m) === getModelName(firstModel));

        return this.bulkAction('delete', selected, {
            bulk_deleted_success: translateddeleteSuccessMessage,
            acceptButtonScheme: 'danger',
            acceptButtonIcon: 'trash',
            actionPath: `${dasherize(pluralize(modelName))}/bulk-delete`,
            actionMethod: `DELETE`,
            modelName,
            ...options,
        });
    }

    /**
     * Generic bulk action on multiple models modal with options
     *
     * @param {Array} selected an array of selected models for deletion
     * @param {Object} options
     * @void
     */
    @action bulkAction(verb, selected, options = {}) {
        if (!isArray(selected) || selected.length === 0) {
            return;
        }

        const firstModel = first(selected);
        const modelName = getModelName(firstModel, get(options, 'modelName'), { humanize: true, capitalizeWords: true });
        const count = selected.length;
        const actionMethod = (typeof options.actionMethod === 'string' ? options.actionMethod : `POST`).toLowerCase();
        const fetchParams = getWithDefault(options, 'fetchParams', {});
        const fetchOptions = getWithDefault(options, 'fetchOptions', {});
        const deleteSuccessMessage = options.bulk_deleted_success ? options.bulk_deleted_success : null;
        this.modalsManager.show('modals/bulk-action-model', {
            // title: `Bulk ${verb} ${pluralize(modelName)}`,
            acceptButtonText: humanize(verb),
            args: ['selected'],
            modelNamePath: 'name',
            verb,
            selected,
            count,
            modelName,
            remove: (model) => {
                selected.removeObject(model);
                this.modalsManager.setOption('selected', selected);
            },
            confirm: (modal) => {
                const selected = modal.getOption('selected');

                if (typeof options.onConfirm === 'function') {
                    options.onConfirm(selected);
                }

                modal.startLoading();

                return this.fetch[actionMethod](
                    options.actionPath,
                    {
                        ids: selected.map((model) => model.id),
                        ...fetchParams,
                    },
                    fetchOptions
                )
                    .then((response) => {
                        if(actionMethod == 'delete' && deleteSuccessMessage != null){
                            this.notifications.success(deleteSuccessMessage);
                        } 
                        else{
                        this.notifications.success(response.message ?? options.successNotification ?? `${count} ${pluralize(modelName, count)} were updated successfully.`);
                        }
                        if (typeof options.onSuccess === 'function') {
                            options.onSuccess(selected);
                        }
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);

                        if (typeof options.onError === 'function') {
                            options.onError(error, selected);
                        }
                    })
                    .finally(() => {
                        if (typeof options.callback === 'function') {
                            options.callback(selected);
                        }
                    });
            },
            ...options,
        });
    }

    /**
     * Toggles dialog to export resource data
     *
     * @void
     */
    @action export(modelName, options = {}, includeDateFilters = false) {
        modelName = modelName.toLowerCase();

        // set the model uri endpoint
        const modelEndpoint = dasherize(pluralize(modelName));
        const exportParams = options.params ?? {};

        const modalOptions = {
            title: this.intl.t('common.export'),
            acceptButtonText: 'Download',
            modalClass: 'modal-sm',
            format: 'csv',
            formatOptions: ['csv', 'xlsx', 'xls'],
            // setFormat: ({ target }) => {
            //     this.modalsManager.setOption('format', target.value || null);
            setFormat: (selectedValue) => {
                this.modalsManager.setOption('format', selectedValue || null);
            },
            includeFilters: includeDateFilters,
            startDate: null,
            createdAt: null,
            setStartDate: (input) => {
                let dateStr = input.formattedDate;
                this.modalsManager.setOption('createdAt', null);
                this.modalsManager.setOption('startDate', dateStr);
            },
            setCreatedAt: (input) => {
                let dateStr = input.formattedDate;
                this.modalsManager.setOption('startDate', null);
                this.modalsManager.setOption('createdAt', dateStr);
            },
            confirm: (modal, done) => {
                const format = modal.getOption('format') ?? 'csv';
                let filters = {};
                if (includeDateFilters) {
                    filters = {
                        start_date: modal.getOption('startDate') || null,
                        created_at: modal.getOption('createdAt') || null,
                    };
                }

                modal.startLoading();

                const now = new Date();
                const timestamp = formatDate(now, 'yyyy-MM-dd-HH:mm');

                return this.fetch
                    .download(
                        `${modelEndpoint}/export`,
                        {
                            format,
                            ...filters,
                            ...exportParams,
                        },
                        {
                            method: 'POST',
                            fileName: `${modelEndpoint}-${formatDate(new Date(), 'yyyy-MM-dd-HH:mm')}.${format}`,
                        }
                    )
                    .then(() => {
                        later(this, () => done(), 600);
                    })
                    .catch((error) => {
                        modal.stopLoading();
                        this.notifications.serverError(error, 'Unable to download API credentials export.');
                    });
            },
            ...options,
        };

        this.modalsManager.show('modals/export-form', modalOptions);
    }

    /**
     * Prompts a spreadsheet upload for an import process.
     *
     * @param {String} modelName
     * @param {Object} [options={}]
     * @memberof CrudService
     */
    @action import(modelName, options = {}) {
        // always lowercase modelname
        modelName = modelName.toLowerCase();

        // set the model uri endpoint
        const modelEndpoint = dasherize(pluralize(modelName));

        // function to check if queue is empty
        const checkQueue = () => {
            const uploadQueue = this.modalsManager.getOption('uploadQueue');

            if (uploadQueue.length) {
                this.modalsManager.setOption('acceptButtonDisabled', false);
            } else {
                this.modalsManager.setOption('acceptButtonDisabled', true);
            }
        };

        this.modalsManager.show('modals/import-form', {
            title: this.intl.t('fleet-ops.common.import'),
            acceptButtonText: this.intl.t('common.start-import'),
            acceptButtonScheme: 'magic',
            acceptButtonIcon: 'upload',
            acceptButtonDisabled: true,
            isProcessing: false,
            uploadQueue: [],
            fileQueueColumns: [
                { name: 'Type', valuePath: 'extension', key: 'type' },
                { name: 'File Name', valuePath: 'name', key: 'fileName' },
                { name: 'File Size', valuePath: 'size', key: 'fileSize' },
                { name: 'Upload Date', valuePath: 'file.lastModifiedDate', key: 'uploadDate' },
                { name: '', valuePath: '', key: 'delete' },
            ],
            acceptedFileTypes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
            queueFile: (file) => {
                const uploadQueue = this.modalsManager.getOption('uploadQueue');

                uploadQueue.pushObject(file);
                checkQueue();
            },

            removeFile: (file) => {
                const { queue } = file;
                const uploadQueue = this.modalsManager.getOption('uploadQueue');

                uploadQueue.removeObject(file);
                queue.remove(file);
                checkQueue();
            },
            confirm: async (modal) => {
                const uploadQueue = this.modalsManager.getOption('uploadQueue');
                const uploadedFiles = [];
                const uploadTask = (file) => {
                    return new Promise((resolve) => {
                        this.fetch.uploadFile.perform(
                            file,
                            {
                                path: `uploads/import-sources/${this.currentUser.companyId}/${modelEndpoint}`,
                                type: 'import-source',
                            },
                            (uploadedFile) => {
                                uploadedFiles.pushObject(uploadedFile);
                                resolve(uploadedFile);
                            }
                        );
                    });
                };

                if (!uploadQueue.length) {
                    return this.notifications.warning(this.intl.t('common.import-warn'));
                }

                modal.startLoading();
                modal.setOption('acceptButtonText', 'Uploading...');

                for (let i = 0; i < uploadQueue.length; i++) {
                    const file = uploadQueue.objectAt(i);
                    await uploadTask(file);
                }

                this.modalsManager.setOption('acceptButtonText', 'Processing...');
                this.modalsManager.setOption('isProcessing', true);

                const files = uploadedFiles.map((file) => file.id);

                try {
                    const response = await this.fetch.post(`${modelEndpoint}/import`, { files });
                    if (typeof options.onImportCompleted === 'function') {
                        options.onImportCompleted(response, files);
                    }
                } catch (error) {
                    return this.notifications.serverError(error);
                }
            },
            ...options,
        });
    }
}
