'use strict';

module.exports = {
    root: true,
    parser: '@babel/eslint-parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        requireConfigFile: false,
        babelOptions: {
            plugins: [['@babel/plugin-proposal-decorators', { decoratorsBeforeExport: true }]],
        },
    },
    plugins: ['ember'],
    extends: ['eslint:recommended', 'plugin:ember/recommended', 'plugin:prettier/recommended'],
    ignorePatterns: ['prebuild.js'],
    env: {
        browser: true,
    },
    globals: {
        socketClusterClient: 'readonly',
        L: 'readonly',
        module: 'readonly',
        require: 'readonly',
    },
    rules: {
        'ember/no-array-prototype-extensions': 'off',
        'ember/no-computed-properties-in-native-classes': 'off',
        'ember/no-controller-access-in-routes': 'off',
        'ember/no-empty-glimmer-component-classes': 'off',
        'ember/no-get': 'off',
        'ember/classic-decorator-no-classic-methods': 'off',
        'n/no-unpublished-require': [
            'error',
            {
                allowModules: [
                    'ember-cli',
                    'tailwindcss',
                    '@tailwindcss/forms',
                    'postcss-import',
                    'postcss-preset-env',
                    'postcss-each',
                    'postcss-mixins',
                    'postcss-conditionals-renewed',
                    'autoprefixer',
                    'broccoli-funnel',
                    'ember-auto-import',
                ],
            },
        ],
        'no-prototype-builtins': 'off',
    },
    overrides: [
        {
            files: [
                './.eslintrc.js',
                './.prettierrc.js',
                './.stylelintrc.js',
                './.template-lintrc.js',
                './ember-cli-build.js',
                './testem.js',
                './blueprints/*/index.js',
                './config/**/*.js',
                './lib/*/index.js',
                './server/**/*.js',
            ],
            parserOptions: {
                sourceType: 'script',
            },
            env: {
                browser: false,
                node: true,
            },
            extends: ['plugin:n/recommended'],
        },
    ],
};
