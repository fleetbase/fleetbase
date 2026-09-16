'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const webpack = require('webpack');
const intlPolyfillContext = require('../../config/intl-polyfill-context');

test('FormatJS contexts retain extension base languages and omit unreachable regional data', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleetbase-intl-context-'));
    const packages = ['numberformat', 'pluralrules', 'datetimeformat', 'relativetimeformat'].map((name) => `@formatjs/intl-${name}`);
    const imports = packages.map((name) => `import(\`${name}/locale-data/\${lang}.js\`)`);
    const output = path.join(root, 'dist');
    let compiler;

    try {
        for (const name of [...packages, 'unrelated']) {
            const directory = path.join(root, 'node_modules', name, 'locale-data');
            await fs.mkdir(path.join(directory, 'nested'), { recursive: true });
            for (const language of ['en', 'fil', 'pt-BR', 'nested/en']) {
                await fs.writeFile(path.join(directory, `${language}.js`), `module.exports = ${JSON.stringify(language)};`);
            }
        }

        await fs.writeFile(
            path.join(root, 'entry.js'),
            `exports.load = lang => Promise.all([${imports.join(',')}]);\nexports.unrelated = lang => import(\`unrelated/locale-data/\${lang}.js\`);`
        );
        compiler = webpack({
            context: root,
            mode: 'development',
            target: 'node',
            devtool: false,
            entry: './entry.js',
            output: { path: output, filename: 'entry.cjs', library: { type: 'commonjs2' } },
            plugins: [intlPolyfillContext()],
        });
        const stats = await new Promise((resolve, reject) => compiler.run((error, result) => (error ? reject(error) : resolve(result))));
        assert.equal(stats.hasErrors(), false, stats.toString('errors-only'));

        const canonicalRoot = await fs.realpath(root);
        const modules = [...stats.compilation.modules].map((module) => module.resource);
        for (const name of packages) {
            const directory = path.join(canonicalRoot, 'node_modules', name, 'locale-data');
            assert.ok(modules.includes(path.join(directory, 'en.js')));
            assert.ok(modules.includes(path.join(directory, 'fil.js')), 'New extension languages remain available');
            assert.ok(!modules.includes(path.join(directory, 'pt-BR.js')));
            assert.ok(!modules.includes(path.join(directory, 'nested/en.js')));
        }
        assert.ok(modules.includes(path.join(canonicalRoot, 'node_modules/unrelated/locale-data/pt-BR.js')));

        const built = require(path.join(output, 'entry.cjs'));
        assert.deepEqual(
            (await built.load('fil')).map((module) => module.default),
            ['fil', 'fil', 'fil', 'fil']
        );
        assert.equal((await built.unrelated('pt-BR')).default, 'pt-BR');
    } finally {
        if (compiler) await new Promise((resolve, reject) => compiler.close((error) => (error ? reject(error) : resolve())));
        await fs.rm(root, { recursive: true, force: true });
    }
});
