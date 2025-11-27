const fs = require('fs');
const path = require('path');

/**
 * Generate extensions.json manifest in public/
 */
function generateExtensionsManifest(projectRoot, extensions) {
    console.log('[fleetbase-extensions-generator] Generating extensions manifest...');

    const publicDir = path.join(projectRoot, 'public');

    // Create public directory if it doesn't exist
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    // Build the manifest
    const manifest = extensions.map((ext) => ({
        name: ext.name,
        version: ext.version,
        route: ext.fleetbase?.route,
    }));

    const manifestFile = path.join(publicDir, 'extensions.json');

    try {
        fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
        console.log('[fleetbase-extensions-generator]   ✓ Generated public/extensions.json');
    } catch (error) {
        console.error('[fleetbase-extensions-generator]   ! Failed to write extensions manifest:', error.message);
    }
}

module.exports = generateExtensionsManifest;
