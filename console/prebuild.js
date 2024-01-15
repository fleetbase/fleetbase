const fg = require('fast-glob');
const fs = require('fs');
const path = require('path');
const recast = require('recast');
const babelParser = require('recast/parsers/babel');
const builders = recast.types.builders;

function getExtensionMountPath(extensionName) {
    let extensionNameSegments = extensionName.split('/');
    let mountName = extensionNameSegments[1];

    if (typeof mountName !== 'string') {
        mountName = extensionNameSegments[0];
    }

    return mountName.replace('-engine', '');
}

function only(subject, props = []) {
    const keys = Object.keys(subject);
    const result = {};

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (props.includes(key)) {
            result[key] = subject[key];
        }
    }

    return result;
}

function getExtensions() {
    return new Promise((resolve, reject) => {
        const extensions = [];
        const seenPackages = new Set();

        return fg(['node_modules/*/package.json', 'node_modules/*/*/package.json'])
            .then((results) => {
                for (let i = 0; i < results.length; i++) {
                    const packagePath = results[i];
                    const packageJson = fs.readFileSync(packagePath);
                    let packageData = null;

                    try {
                        packageData = JSON.parse(packageJson);
                    } catch (e) {
                        console.warn(`Could not parse package.json at ${packagePath}:`, e);
                        continue;
                    }

                    if (!packageData || !packageData.keywords || !packageData.keywords.includes('fleetbase-extension') || !packageData.keywords.includes('ember-engine')) {
                        continue;
                    }

                    // If we've seen this package before, skip it
                    if (seenPackages.has(packageData.name)) {
                        continue;
                    }

                    seenPackages.add(packageData.name);
                    extensions.push(only(packageData, ['name', 'description', 'version', 'fleetbase', 'keywords', 'license', 'repository']));
                }

                resolve(extensions);
            })
            .catch(reject);
    });
}

function getRouterFileContents() {
    const routerFilePath = path.join(__dirname, 'router.map.js');
    const routerFileContents = fs.readFileSync(routerFilePath, 'utf-8');

    return routerFileContents;
}

(async () => {
    const extensions = await getExtensions();
    const routerFileContents = getRouterFileContents();
    const ast = recast.parse(routerFileContents, { parser: babelParser });

    recast.visit(ast, {
        visitCallExpression(path) {
            if (path.value.type === 'CallExpression' && path.value.callee.property.name === 'route' && path.value.arguments[0].value === 'console') {
                let functionExpression;

                // Find the function expression
                path.value.arguments.forEach((arg) => {
                    if (arg.type === 'FunctionExpression') {
                        functionExpression = arg;
                    }
                });

                if (functionExpression) {
                    // Check and add the new engine mounts
                    extensions.forEach((extension) => {
                        const mountPath = getExtensionMountPath(extension.name);
                        let route = mountPath;

                        if (extension.fleetbase && extension.fleetbase.route) {
                            route = extension.fleetbase.route;
                        }

                        // Check if engine is already mounted
                        const isMounted = functionExpression.body.body.some((expressionStatement) => {
                            return expressionStatement.expression.arguments[0].value === extension.name;
                        });

                        // If not mounted, append to the function body
                        if (!isMounted) {
                            functionExpression.body.body.push(
                                builders.expressionStatement(
                                    builders.callExpression(builders.memberExpression(builders.thisExpression(), builders.identifier('mount')), [
                                        builders.literal(extension.name),
                                        builders.objectExpression([
                                            builders.property('init', builders.identifier('as'), builders.literal(route)),
                                            builders.property('init', builders.identifier('path'), builders.literal(route)),
                                        ]),
                                    ])
                                )
                            );
                        }
                    });

                    return false;
                }
            }

            this.traverse(path);
        },
    });

    const output = recast.print(ast, { quote: 'single' }).code;
    fs.writeFileSync(path.join(__dirname, 'app/router.js'), output);
})();
