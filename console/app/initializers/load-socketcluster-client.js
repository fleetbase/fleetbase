export function initialize() {
    const socketClusterClientScript = document.createElement('script');
    socketClusterClientScript.src = '/assets/socketcluster-client.min.js';
    document.body.appendChild(socketClusterClientScript);
}

export default {
    initialize,
};
