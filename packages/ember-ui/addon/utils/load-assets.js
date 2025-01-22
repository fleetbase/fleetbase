import { later } from '@ember/runloop';

export default function loadAssets(assets = { basePath: '', scripts: [], stylesheets: [], globalIndicatorKey: null }, callback = null) {
    // Set global indicator key if applicable
    if (assets.globalIndicatorKey && typeof assets.globalIndicatorKey === 'string') {
        window[assets.globalIndicatorKey] = false;
    }

    // Prepare base path
    const path = `/${assets.basePath ? assets.basePath + '/' : ''}`;

    // Define exports on window
    const exportsScript = document.createElement('script');
    exportsScript.innerHTML = 'window.exports = window.exports || {};';
    document.body.appendChild(exportsScript);

    // Insert scripts
    for (let i = 0; i < assets.scripts.length; i++) {
        const script = document.createElement('script');
        script.src = path + assets.scripts[i];
        document.body.appendChild(script);
    }

    // Insert stylesheets
    for (let i = 0; i < assets.stylesheets.length; i++) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = path + assets.stylesheets[i];
        document.body.appendChild(link);
    }

    // Update global indicator key
    later(
        this,
        () => {
            if (assets.globalIndicatorKey && typeof assets.globalIndicatorKey === 'string') {
                window[assets.globalIndicatorKey] = true;
            }

            if (typeof callback === 'function') {
                callback();
            }
        },
        300
    );
}
