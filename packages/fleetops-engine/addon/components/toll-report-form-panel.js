import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task, timeout } from 'ember-concurrency';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import ENV from '@fleetbase/console/config/environment';
import Point from '@fleetbase/fleetops-data/utils/geojson/point'; 

export default class TollReportFormPanelComponent extends Component {
    @service session;
    @service store;
    @service notifications;
    @service intl;
    @service hostRouter;
    @service contextPanel;
    @service fetch;
    // @service fileService; // Inject the file-service

    @tracked uploadQueue = [];

    /**
     * Overlay context.
     * @type {any}
     */
    @tracked context;

    /**
     * Fuel Report status
     * @type {Array}
     */
    // @tracked statusOptions = ['draft', 'pending-approval', 'approved', 'rejected', 'revised', 'submitted', 'in-review', 'confirmed', 'processed', 'archived', 'cancelled'];
    @tracked statusOptions = [
        { value: 'draft', translationKey: 'statuses.draft' },
        { value: 'pending-approval', translationKey: 'statuses.pending-approval' },
        { value: 'approved', translationKey: 'statuses.approved' },
        { value: 'rejected', translationKey: 'statuses.rejected' },
        { value: 'revised', translationKey: 'statuses.revised' },
        { value: 'submitted', translationKey: 'statuses.submitted' },
        { value: 'in-review', translationKey: 'statuses.in-review' },
        { value: 'confirmed', translationKey: 'statuses.confirmed' },
        { value: 'processed', translationKey: 'statuses.processed' },
        { value: 'archived', translationKey: 'statuses.archived' },
        { value: 'cancelled', translationKey: 'statuses.cancelled' }
      ];
    /**
     * Permission needed to update or create record.
     *
     * @memberof DriverFormPanelComponent
     */
    @tracked savePermission;

    @tracked fuelReportFileId = null;
    @tracked fuelReportFile = null;
    @tracked selectedFiles = [];    // Files selected by the user
    @tracked uploadedFiles = []; 
    @tracked failedUploads = [];    // Files that failed to upload
    @tracked uploadProgress = {};   // Track progress for each file
    @tracked isSaving = false;
    /**
     * Fuel Report Types
     * @type {Array}
     */
    // @tracked fuelReportTypes = ['Fuel', 'Toll', 'Parking'];
    @tracked fuelReportTypes = [
     
        { value: 'Toll', translationKey: 'fuelReportTypes.Toll' },
    ]

    /**
     * Fuel Report Payment Types
     * @type {Array}
     */
    // @tracked reportPaymentOptions = ['Card', 'Other'];
    @tracked reportPaymentOptions = [
        { value: 'Card', translationKey: 'paymentOptions.Card' },
        { value: 'Other', translationKey: 'paymentOptions.Other' },
    ]

    @tracked cardTypeOptions;

    /**
     * Loading state for file uploads.
     * @type {boolean}
     */
    @tracked isUploading = false;
    /**
     * Constructs the component and applies initial state.
     */
    @tracked isModalOpen = false;
    @tracked selectedFile = null;
    @tracked errors = {
        report_type: null,
        payment_method: null,
        // Add other fields here if needed
    };
    @tracked acceptedFileTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/svg',
        'image/jpg',
    ];

    constructor(owner, { fuelReport = null }) {
        super(...arguments);
        this.fuelReport = fuelReport;
       
        // console.log('fuel report', fuelReport);
        this.savePermission = fuelReport && fuelReport.isNew ? 'fleet-ops create fuel-report' : 'fleet-ops update fuel-report';
        applyContextComponentArguments(this);
    }
    @action
        validateFields() {
        let isValid = true;

        // Validate Payment Method
        if (!this.fuelReport.payment_method) {
            this.errors.payment_method = this.intl.t('validation.required.payment_method');
            isValid = false;
        } else {
            this.errors.payment_method = null;
        }

    return isValid;
    }
    /**
     * Sets the overlay context.
     *
     * @action
     * @param {OverlayContextObject} overlayContext
     */
    @action setOverlayContext(overlayContext) {
        this.context = overlayContext;
        contextComponentCallback(this, 'onLoad', ...arguments);
    }
    get translatedStatusOptions() {
        return this.statusOptions.map(status => ({
          value: status,
          translationKey: `statuses.${camelize(status)}`
        }));
    }
    get selectedStatus() {
        return this.statusOptions.find(status => status.value === this.fuelReport.status);
    }
    get selectedfuelReportTypes() {
        return this.fuelReportTypes.find(report_type => report_type.value === this.fuelReport.report_type);
    }
    get selectedpaymentOptions() {
        return this.reportPaymentOptions.find(payment_method => payment_method.value === this.fuelReport.payment_method);
    }
    get fuelReportFiles() {
    if (!Array.isArray(this.fuelReport.files)) {
        this.fuelReport.files = [];
    }
    return this.fuelReport.files;
}
    @action
    updatefuelReportTypes(selectedfuelReportTypes) {
        this.fuelReport.report_type = selectedfuelReportTypes.value;
    }
    @action
    updateStatus(selectedStatus) {
        this.fuelReport.status = selectedStatus.value;
    }
    @action
    updatepaymentOptions(selectedpaymentOptions) {
        this.fuelReport.payment_method = selectedpaymentOptions.value;
    }

    @task *loadFuelReport() {
        this.fuelReport = yield this.store.findRecord('fuel-report', reportId);
        this.fuelReport.reporter = yield this.store.findRecord('user', this.fuelReport.reported_by_uuid);
    }
    @action
    updateReporterId(newReporterId) {
        console.log('Updating reporter ID:', newReporterId);
        this.fuelReport.reported_by_uuid = newReporterId;
    }
    /**
     * Task to save fuel report.
     *
     * @return {void}
     * @memberof FuelReportFormPanelComponent
     */
    @task *queueFile(file) { 
        // since we have dropzone and upload button within dropzone validate the file state first
        // as this method can be called twice from both functions
        if (['queued', 'failed', 'timed_out', 'aborted'].indexOf(file.state) === -1) {
            return;
        }
        if (this.uploadQueue.some(qf => qf.file.name === file.name && qf.file.size === file.size)) {
            this.notifications.warning(`File "${file.name}" is already in the upload queue.`);
            return;
        }
        let queuedFile = {
            id: file.id || Date.now(),
            file,
            status: 'queued',
            progress: 0,
            error: null,
            uploadedFile: null,
          };
        // Queue and upload immediatley
        // this.uploadQueue.pushObject(queuedFile);
        // console.log("up",this.uploadQueue)
        yield this.fetch.uploadFile.perform(
            queuedFile.file,
            {
                path: "uploads/fleet-ops/fuel-report-files",
                type: 'fuel-report-files',
            },
            (uploadedFile) => {
                // console.log("Inside uploadedFile",uploadedFile)
                queuedFile.uploadedFile=uploadedFile
                this.uploadQueue.pushObject(queuedFile);
                // console.log("Inside uploadQueue",this.uploadQueue)
                this.uploadQueue.removeObject(file);
            },(event) => {
                if (event.lengthComputable) { 
                    queuedFile.progress = Math.round((event.loaded / event.total) * 100);
                }
              },
            () => {
                this.uploadQueue.removeObject(file);
                // remove file from queue
                if (file.queue && typeof file.queue.remove === 'function') {
                    file.queue.remove(file);
                }
            }
        );
    }
   
    @task *save() {
        // Perform validation
        const isValid = this.validateFields();
        if (!isValid) {
            this.notifications.warning(this.intl.t('validation.form_invalid')); // Notify the user
            return;
        }
    
        // console.log("Inside save, isNew:", this.fuelReport.isNew, "UploadQueue:", this.uploadQueue);
    
        // Optional: Run a callback before save
        contextComponentCallback(this, 'onBeforeSave', this.fuelReport);
    
        try {
            this.isSaving = true;
            this.fuelReport.report_type = "Toll";
            this.fuelReport.reported_by_uuid = this.fuelReport.reported_by_uuid;
            this.fuelReport = yield this.fuelReport.save();
            // Save the fuel report first if it's new
            if (this.fuelReport.isNew) {
                this.fuelReport.reported_by_uuid = this.fuelReport.reported_by_uuid;
                this.fuelReport = yield this.fuelReport.save(); // Persist to get an ID
            }
            
            // Map uploadQueue to include the saved fuelReport ID as subject_uuid
            if (this.uploadQueue && this.uploadQueue.length > 0) {
                // console.log("uploadQueue",this.uploadQueue)
                const associatedFiles = this.uploadQueue.map(file => ({
                    // Assuming file.path is the path obtained after moving the file
                    name: file.uploadedFile.original_filename || file.uploadedFile.name || 'Unnamed file',
                    path: file.uploadedFile.path, // Path to the uploaded file
                    subject_uuid: this.fuelReport.id, // Associate with fuelReport ID
                    subject_type: 'fleet-ops:fuelreports', // Ensure this matches backend expectations
                    type: "fuel-report-files",
                    original_filename: file.uploadedFile.original_filename || file.uploadedFile.name || 'Unnamed file'
                }));
    
                // console.log("Files to be attached:", associatedFiles);
    
                // Optionally, save files one by one if they require API calls
                associatedFiles.forEach(fileData => {
                    let fileRecord = this.store.createRecord('file', fileData);
                    this.fuelReport.get('files').pushObject(fileRecord);
                });
    
    
                // Assign updated files to the fuelReport
                yield Promise.all(
                    associatedFiles.map(file => this.store.createRecord('file', file).save())
                );
            }
    
            // console.log("Fuel report files after updating:", this.fuelReport.files);
    
            // Save the fuel report again with updated files
           
    
            this.notifications.success(
                this.intl.t('fleet-ops.component.toll-report-form-panel.success-message')
            );
    
            // Optional: Run a callback after save
            contextComponentCallback(this, 'onAfterSave', this.fuelReport);
        } catch (error) {
            // console.error('Error saving fuel report:', error);
            this.notifications.serverError(error);
        } finally {
            this.isSaving = false;
        }
    }
    
    
     /**
     * Task to save the fuel report if it's new.
     *
     * @return {Promise<void>}
     */
    @task *ensureFuelReportIsSaved() {
        if (this.fuelReport.isNew) {
            yield this.save.perform();
        }
    }
    /**
     * Getter to determine if the current report type is 'fuel'.
     * @return {boolean}
     */
    get isFuelReport() { 
        return this.fuelReport.report_type === 'Toll';
    }
    /**
     * View the details of the fuel-report.
     *
     * @action
     */
    @action onViewDetails() { 
        const isActionOverrided = contextComponentCallback(this, 'onViewDetails', this.fuelReport);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.fuelReport, 'viewing');
        }
    }

    /**
     * Handles cancel button press.
     *
     * @action
     * @returns {any}
     */
    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.fuelReport);
    }
    
    // Helper method to check if a file is an image
    isImage(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
        return imageExtensions.includes(extension);
    }
    
    /**
     * 
     * @param {UploadFile[]} files 
     */
    
    @action async uploadFuelReportFile(file) { 
        try { 
            // Proceed with file upload
            await this.fetch.uploadFile.perform(
                file,
                {
                    path: "uploads/fleet-ops/fuel-report-files",
                    subject_uuid: this.fuelReport.id,
                    subject_type: "fleet-ops:fuelreports",
                    type: "fuel-report-files"
                },
                (uploadedFile) => {
                    if (uploadedFile && uploadedFile.id) {
                        this.fuelReport.files.pushObject({
                            id: uploadedFile.id,
                            name: uploadedFile.name,
                            // Add only necessary properties
                        });
                    }
                }
            );
            
            this.notifications.success(this.intl.t('common.file-upload-success'));
        } catch (error) {
            this.notifications.serverError(error);
        } 
    }

    /**
     * Action triggered when a file is removed.
     *
     * @param {File} file - The file to be removed.
     * @returns {Promise} - A promise representing the file destruction operation.
     */
    @action 
    async removeFile(file) {
        // if (!confirm(`Are you sure you want to delete the file "${file.original_filename}"?`)) {
        //     return;
        // }
        const message = this.intl.t('common.file-delete-confirmation', {
            filename: file.original_filename
        });
        
        if (!confirm(message)) {
            return;
        }
       
        this.fuelReport.files.removeObject(file);
        try {
            const apiUrl = `${ENV.API_HOST}/v1/files/${file.public_id}`;
            const authToken = this.session.data?.authenticated?.token; // Safely access nested properties

            if (!authToken) {
                throw new Error('Authentication token not found.');
            }

            const response = await fetch(apiUrl, {
                method: 'DELETE',
                headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`, // Include auth header if required
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || this.intl.t('common.file-delete-failed'));
            }

            // let data = await response.json();
            // Trigger a success notification
            this.notifications.success(this.intl.t('common.file-delete-success'), {
                autoClear: true,
                clearDuration: 3000, // Duration in milliseconds
            });

            // return data;
            
            // Optionally, show a success notification to the user
          } catch (error) {
            // console.error('Failed to delete file:', error);
            // Revert the UI change
            // this.fuelReport.files.pushObject(file);
            // Optionally, show an error notification to the user
            this.notifications.serverError(error.message || this.intl.t('common.file-delete-failed'));
          }
    }
    
    @action
    async openViewFileModal(file) { 
    }
  
    @action
    closeViewFileModal() {
    //   console.log('Closing modal');
      this.isModalOpen = false;
      this.selectedFile = null;
    }

     /**
     * Ember Concurrency task to handle file uploads.
     */
    @task
    *uploadFile(file) {
        try {
        // Generate a preview for the image
        const preview = yield this.generatePreview(file);

        // Perform the upload (replace with your actual upload logic)
        const uploadedFilePath = yield this.fetch.uploadFile.perform(
            file,
            {
            path: "uploads/fleet-ops/fuel-report-files",
            type: 'fuel-report-files',
            },
            (uploadedFile) => {
            // console.log("Uploaded File:", uploadedFile);
            
            // Add the uploaded file with its preview to uploadedFiles
            this.uploadedFiles.pushObject({
                name: uploadedFile.name || file.name,
                path: uploadedFile.path || '',
                preview: uploadedFile.preview || preview,
            });

            // Remove the original file from the uploadQueue
            this.uploadQueue.removeObject(file);
            },
            () => {
            // console.error("Upload callback failed for file:", file);
            // Remove the file from the uploadQueue on failure
            this.uploadQueue.removeObject(file);
            
            // Optionally, remove the file from the underlying queue
            if (file.queue && typeof file.queue.remove === 'function') {
                file.queue.remove(file);
            }
            }
        );
        } catch (error) {
        // console.error("Error during file upload:", error);
        // Handle errors, e.g., notify the user
        this.uploadQueue.removeObject(file);
        }
    }

    /**
     * Generates a preview URL for an image file using FileReader.
     * @param {File} file - The image file to generate a preview for.
     * @returns {Promise<string>} - The data URL of the image.
     */
    generatePreview(file) {
        return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            resolve(event.target.result);
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsDataURL(file);
        });
    }
    /**
         * Handles the selection from an autocomplete. Updates the place properties with the selected data.
         * If a coordinates input component is present, updates its coordinates too.
         *
         * @action
         * @param {Object} selected - The selected item from the autocomplete.
         * @param {Object} selected.location - The location data of the selected item.
         * @memberof PlaceFormPanelComponent
         */
        @action onAutocomplete(selected) {
            this.fuelReport.setProperties({ ...selected });
    
            if (this.coordinatesInputComponent) {
                this.coordinatesInputComponent.updateCoordinates(selected.location);
            }
        }
    
        /**
         * Performs reverse geocoding given latitude and longitude. Updates place properties with the geocoding result.
         *
         * @action
         * @param {Object} coordinates - The latitude and longitude coordinates.
         * @param {number} coordinates.latitude - Latitude value.
         * @param {number} coordinates.longitude - Longitude value.
         * @returns {Promise} A promise that resolves with the reverse geocoding result.
         * @memberof PlaceFormPanelComponent
         */
        @action onReverseGeocode({ latitude, longitude }) {
            return this.fetch.get('geocoder/reverse', { coordinates: [latitude, longitude].join(','), single: true }).then((result) => {
                if (isBlank(result)) {
                    return;
                }
    
                this.fuelReport.setProperties({ ...result });
            });
        }
    
        /**
         * Sets the coordinates input component.
         *
         * @action
         * @param {Object} coordinatesInputComponent - The coordinates input component to be set.
         * @memberof PlaceFormPanelComponent
         */
        @action setCoordinatesInput(coordinatesInputComponent) {
            this.coordinatesInputComponent = coordinatesInputComponent;
        }
    
        /**
         * Updates the place coordinates with the given latitude and longitude.
         *
         * @action
         * @param {Object} coordinates - The latitude and longitude coordinates.
         * @param {number} coordinates.latitude - Latitude value.
         * @param {number} coordinates.longitude - Longitude value.
         * @memberof PlaceFormPanelComponent
         */
        @action updateFuelCoordinates({ latitude, longitude }) {
            const location = new Point(longitude, latitude);
    
            this.fuelReport.setProperties({ location });
        }
    }
