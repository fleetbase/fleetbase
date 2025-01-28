import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import isObject from '@fleetbase/ember-core/utils/is-object';
import isModel from '@fleetbase/ember-core/utils/is-model';
import getCustomFieldTypeMap from '../utils/get-custom-field-type-map';

export default class CustomFieldComponent extends Component {
    @service fetch;
    @tracked orderConfig;
    @tracked customField;
    @tracked order;
    @tracked customFieldComponent;
    @tracked value;
    @tracked file;
    @tracked uploadedFile;
    acceptedFileTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword',
        'application/pdf',
        'application/x-pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-flv',
        'video/x-ms-wmv',
        'audio/mpeg',
        'video/x-msvideo',
        'application/zip',
        'application/x-tar',
    ];

    /**
     * A map defining the available custom field types and their corresponding components.
     */
    customFieldTypeMap = getCustomFieldTypeMap();

    constructor(owner, { customField, orderConfig, order }) {
        super(...arguments);
        this.customField = customField;
        this.value = customField.value;
        this.orderConfig = orderConfig;
        this.order = order;
        this.customFieldComponent = typeof customField.component === 'string' ? customField.component : 'input';
    }

    @action removeFile() {
        if (isModel(this.uploadedFile)) {
            this.uploadedFile.destroyRecord();
        }

        this.uploadedFile = undefined;
        this.value = undefined;

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(undefined, this.customField);
        }
    }

    @action onFileAddedHandler(file) {
        // since we have dropzone and upload button within dropzone validate the file state first
        // as this method can be called twice from both functions
        if (['queued', 'failed', 'timed_out', 'aborted'].indexOf(file.state) === -1) {
            return;
        }

        // set file for progress state
        this.file = file;

        // Queue and upload immediatley
        this.fetch.uploadFile.perform(
            file,
            {
                path: 'uploads/fleet-ops/order-files',
                type: 'order_file',
            },
            (uploadedFile) => {
                this.file = undefined;
                this.value = `file:${uploadedFile.id}`;
                this.uploadedFile = uploadedFile;
                if (typeof this.args.onChange === 'function') {
                    this.args.onChange(this.value, this.customField);
                }
            },
            () => {
                // remove file from queue
                if (file.queue && typeof file.queue.remove === 'function') {
                    file.queue.remove(file);
                }
                this.file = undefined;
            }
        );
    }

    @action onChangeHandler(event, otherValue) {
        const isRawInput = typeof event === 'string' || typeof event === 'number';
        const isMoneyInput = this.customFieldComponent === 'money-input' && isObject(event);
        const isEventInput = event instanceof window.Event;
        const isDateTimeInput = this.customFieldComponent === 'date-time-input' && typeof otherValue === 'string';

        if (isDateTimeInput) {
            const value = otherValue;
            this.value = value;

            if (typeof this.args.onChange === 'function') {
                this.args.onChange(value, this.customField);
            }
            return;
        }

        if (isRawInput) {
            this.value = event;

            if (typeof this.args.onChange === 'function') {
                this.args.onChange(event, this.customField);
            }
            return;
        }

        if (isMoneyInput) {
            const value = event.newValue;
            if (typeof this.args.onChange === 'function') {
                this.args.onChange(value, this.customField);
            }
            return;
        }

        if (isEventInput) {
            const value = event.target.value;
            this.value = value;

            if (typeof this.args.onChange === 'function') {
                this.args.onChange(value, this.customField);
            }
            return;
        }
    }
}
