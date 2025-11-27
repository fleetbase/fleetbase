const Plugin = require('broccoli-plugin');
const fs = require('fs');
const path = require('path');
const recast = require('recast');
const babelParser = require('recast/parsers/babel');
const builders = recast.types.builders;

/**
 * RouterGeneratorPlugin
 * 
 * Automatically mounts discovered extensions in the Ember router.
 * Reads router.map.js template and generates app/router.js with all engine mounts.
 * 
 * Handles two types of mounts:
 * 1. Console extensions: Mounted under /console route
 * 2. Root extensions: Mounted at root level (fleetbase.mount === 'root')
 * 
 * Uses AST manipulation to preserve existing router code and only add new mounts.
 */
class RouterGeneratorPlugin extends Plugin {
    constructor(inputNodes, options = {}) {
        super(inputNodes, {
            annotation: options.annotation || 'RouterGeneratorPlugin',
            persistentOutput: true,
        });
        
        this.projectRoot = options.projectRoot || process.cwd();
        this.routerMapFile = options.routerMapFile || path.join(this.projectRoot, 'router.map.js');
    }

    /**
     * Get the mount path for an extension
     */
    getExtensionMountPath(extensionName) {
        const segments = extensionName.split('/');
        let mountName = segments[1] || segments[0];
        return mountName.replace('-engine', '');
    }

    /**
     * Get the route path for an extension
     * Uses fleetbase.route if specified, otherwise uses mount path
     */
    getExtensionRoute(extension) {
        if (extension.fleetbase && extension.fleetbase.route) {
            return extension.fleetbase.route;
        }
        return this.getExtensionMountPath(extension.name);
    }

    /**
     * Check if an engine is already mounted in the AST
     */
    isEngineMounted(functionBody, engineName) {
        return functionBody.some(statement => {
            if (statement.type !== 'ExpressionStatement') return false;
            const expr = statement.expression;
            if (expr.type !== 'CallExpression') return false;
            if (!expr.arguments || expr.arguments.length === 0) return false;
            return expr.arguments[0].value === engineName;
        });
    }

    /**
     * Create an AST node for mounting an engine
     */
    createMountExpression(engineName, route) {
        return builders.expressionStatement(
            builders.callExpression(
                builders.memberExpression(
                    builders.thisExpression(),
                    builders.identifier('mount')
                ),
                [
                    builders.literal(engineName),
                    builders.objectExpression([
                        builders.property('init', builders.identifier('as'), builders.literal(route)),
                        builders.property('init', builders.identifier('path'), builders.literal(route)),
                    ])
                ]
            )
        );
    }

    /**
     * Add console extensions to the /console route
     */
    addConsoleExtensions(ast, extensions) {
        let addedCount = 0;

        recast.visit(ast, {
            visitCallExpression: (path) => {
                const node = path.value;
                
                // Look for this.route('console', function() { ... })
                if (node.type === 'CallExpression' &&
                    node.callee.property &&
                    node.callee.property.name === 'route' &&
                    node.arguments[0] &&
                    node.arguments[0].value === 'console') {
                    
                    // Find the function expression
                    const functionExpression = node.arguments.find(arg => arg.type === 'FunctionExpression');
                    
                    if (functionExpression) {
                        // Add each console extension
                        extensions.forEach(extension => {
                            const route = this.getExtensionRoute(extension);
                            
                            // Check if already mounted
                            if (!this.isEngineMounted(functionExpression.body.body, extension.name)) {
                                functionExpression.body.body.push(
                                    this.createMountExpression(extension.name, route)
                                );
                                addedCount++;
                            }
                        });
                    }
                }

                return false;  // Don't traverse children
            }
        });

        return addedCount;
    }

    /**
     * Add root extensions to the root map
     */
    addRootExtensions(ast, extensions) {
        let addedCount = 0;

        recast.visit(ast, {
            visitCallExpression: (path) => {
                const node = path.value;
                
                // Look for Router.map(function() { ... })
                if (node.type === 'CallExpression' &&
                    node.callee.property &&
                    node.callee.property.name === 'map') {
                    
                    // Find the function expression
                    const functionExpression = node.arguments.find(arg => arg.type === 'FunctionExpression');
                    
                    if (functionExpression) {
                        // Add each root extension
                        extensions.forEach(extension => {
                            const route = this.getExtensionRoute(extension);
                            
                            // Check if already mounted
                            if (!this.isEngineMounted(functionExpression.body.body, extension.name)) {
                                functionExpression.body.body.push(
                                    this.createMountExpression(extension.name, route)
                                );
                                addedCount++;
                            }
                        });
                    }
                }

                return false;  // Don't traverse children
            }
        });

        return addedCount;
    }

    async build() {
        console.log('[RouterGenerator] Generating app/router.js...');
        
        // Read discovered extensions from cache
        const extensionsCacheFile = path.join(this.inputPaths[0], 'extensions.json');
        if (!fs.existsSync(extensionsCacheFile)) {
            console.warn('[RouterGenerator] No extensions cache found, skipping');
            return;
        }

        const extensions = JSON.parse(fs.readFileSync(extensionsCacheFile, 'utf8'));
        
        // Separate console and root extensions
        const consoleExtensions = extensions.filter(ext => 
            !ext.fleetbase || ext.fleetbase.mount !== 'root'
        );
        const rootExtensions = extensions.filter(ext => 
            ext.fleetbase && ext.fleetbase.mount === 'root'
        );

        // Read router.map.js template
        if (!fs.existsSync(this.routerMapFile)) {
            console.error('[RouterGenerator] router.map.js not found at:', this.routerMapFile);
            return;
        }

        const routerFileContents = fs.readFileSync(this.routerMapFile, 'utf8');
        
        // Parse the router file
        const ast = recast.parse(routerFileContents, { parser: babelParser });

        // Add extensions to the AST
        const consoleAdded = this.addConsoleExtensions(ast, consoleExtensions);
        const rootAdded = this.addRootExtensions(ast, rootExtensions);

        // Generate the output code
        const output = recast.print(ast, { quote: 'single' }).code;
        
        // Write to output path
        const outputPath = path.join(this.outputPath, 'router.js');
        fs.writeFileSync(outputPath, output, 'utf8');

        console.log(`[RouterGenerator] Generated app/router.js (${consoleAdded} console mounts, ${rootAdded} root mounts)`);
    }
}

module.exports = RouterGeneratorPlugin;
