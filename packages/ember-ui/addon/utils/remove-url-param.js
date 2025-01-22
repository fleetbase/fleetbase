export default function removeUrlParam(key, callback) {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete(key);

    // Update the URL with the removed parameter
    history.replaceState(null, null, '?' + urlParams.toString());

    // Call the provided callback
    if (callback && typeof callback === 'function') {
        callback();
    }
}
