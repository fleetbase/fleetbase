import { get } from '@ember/object';
import { isArray } from '@ember/array';

/**
 * Handles error log download functionality
 * @param {Object} context - The controller/component context
 * @param {Object} modal - The modal instance
 * @param {Object} results - The results containing error information
 */
export function handleErrorLogDownload(context, modal, results) {
    const errorMessage = results?.message;
    
    context.modalsManager.setOption('errorLogUrl', results.error_log_url);
    context.modalsManager.setOption('acceptButtonText', context.intl.t('common.download-error-log'));
    context.modalsManager.setOption('acceptButtonIcon', 'download');
    context.modalsManager.setOption('acceptButtonScheme', 'primary');
    context.modalsManager.setOption('keepOpen', true);
    context.modalsManager.setOption('isProcessing', false);
    context.modalsManager.setOption('isErrorState', true);
    context.modalsManager.setOption('errorMessage', errorMessage);

    modal.stopLoading();
}

/**
 * Handles successful import of data
 * @param {Object} context - The controller/component context
 * @param {Object} results - The import results
 * @param {Object} modal - The modal instance
 */
export function handleSuccessfulImport(context, results, modal) {
    const places = get(results, 'places');
    const entities = get(results, 'entities');
    const message = get(results, 'message');
    const errorLogUrl = get(results, 'error_log_url');
    
    if (isArray(places)) {
        context.isMultipleDropoffOrder = true;
        context.waypoints = places.map((_place) => {
            const place = context.store.createRecord('place', _place);
            return context.store.createRecord('waypoint', { place });
        });
    }

    if (isArray(entities)) {
        context.entities = entities.map((entity) => {
            return context.store.createRecord('entity', entity);
        });
    }
    
    if (errorLogUrl && message) {
        context.notifications.error(message);
    } else {
        context.notifications.success(context.intl.t('fleet-ops.operations.orders.index.new.import-success'));
    }
    
    context.isCsvImportedOrder = true;
    
    context.hostRouter.transitionTo('console.fleet-ops.operations.orders.index', { 
        queryParams: { layout: 'table', t: Date.now() } 
    }).then(() => {
        context.hostRouter.refresh();
    });

    modal.done();
}

/**
 * Downloads a file from a URL
 * @param {string} url - The URL of the file to download
 * @param {Function} [onComplete=null] - Callback function to execute after download
 */
export function downloadFile(url, onComplete = null) {
    try {
        fetch(url)
            .then(response => response.blob())
            .then(blob => {
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                const filename = url.split('/').pop() || 'error_log.xlsx';
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
                
                if (typeof onComplete === 'function') {
                    setTimeout(onComplete, 500);
                }
            })
            .catch(error => {
                console.error('Fetch download failed, trying direct method:', error);
                directDownload(url, onComplete);
            });
    } catch (error) {
        console.error('Download error:', error);
        directDownload(url, onComplete);
    }
}

/**
 * Fallback direct download method
 * @param {string} url - The URL of the file to download
 * @param {Function} [onComplete=null] - Callback function to execute after download
 */
function directDownload(url, onComplete = null) {
    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop() || 'error_log.xlsx';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (typeof onComplete === 'function') {
        setTimeout(onComplete, 500);
    }
}

export default {
    handleErrorLogDownload,
    handleSuccessfulImport,
    downloadFile
};