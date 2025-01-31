export function initialize() {
    // Check if the script already exists
    // Only insert the script tag if it doesn't already exist
    if (!document.querySelector('script[data-socketcluster-client]')) {
        const socketClusterClientScript = document.createElement('script');
        socketClusterClientScript.setAttribute('data-socketcluster-client', '1');
        socketClusterClientScript.src = '/assets/socketcluster-client.min.js';
        document.body.appendChild(socketClusterClientScript);
    }
}

export default {
    initialize,
};
