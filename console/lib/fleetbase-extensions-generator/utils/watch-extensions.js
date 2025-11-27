const path = require('path');
const chokidar = require('chokidar');

/**
 * Watch extension.js files for changes and regenerate on change
 */
function watchExtensions(projectRoot, extensions, regenerateCallback) {
    const isDevelopment = process.env.EMBER_ENV !== 'production';

    if (!isDevelopment) {
        return;
    }

    const extensionFiles = [];

    for (const extension of extensions) {
        const extensionPath = path.join(projectRoot, 'node_modules', extension.name, 'addon', 'extension.js');
        extensionFiles.push(extensionPath);
    }

    if (extensionFiles.length === 0) {
        return;
    }

    console.log('[fleetbase-extensions-generator] Watching', extensionFiles.length, 'extension file(s) for changes');

    const watcher = chokidar.watch(extensionFiles, {
        persistent: true,
        ignoreInitial: true,
    });

    watcher.on('change', (filePath) => {
        console.log('[fleetbase-extensions-generator] Extension file changed:', filePath);
        console.log('[fleetbase-extensions-generator] Regenerating extension files...');
        regenerateCallback();
        console.log('[fleetbase-extensions-generator] ✓ Regeneration complete');
    });

    return watcher;
}

module.exports = watchExtensions;
