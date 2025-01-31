export function initialize() {
    // Add jointjs script
    const jointJsScript = document.createElement('script');
    jointJsScript.src = '/engines-dist/joint.min.js';
    document.body.appendChild(jointJsScript);

    // Add jointjs directed graph lib
    const jointJsDirectedGraphScript = document.createElement('script');
    jointJsDirectedGraphScript.src = '/engines-dist/DirectedGraph.min.js';
    document.body.appendChild(jointJsDirectedGraphScript);
}

export default {
    initialize,
    after: 'load-leaflet-assets',
};
