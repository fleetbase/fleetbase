'use strict';

module.exports = {
    root: true,
    parser: 'babel-eslint',
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        ecmaFeatures: {
            legacyDecorators: true,
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
        'node/no-unpublished-require': [
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
        // node files
        {
            files: [
                './.eslintrc.js',
                './.prettierrc.js',
                './.template-lintrc.js',
                './ember-cli-build.js',
                './index.js',
                './testem.js',
                './blueprints/*/index.js',
                './config/**/*.js',
                './tests/dummy/config/**/*.js',
            ],
            parserOptions: {
                sourceType: 'script',
            },
            env: {
                browser: false,
                node: true,
            },
            plugins: ['node'],
            extends: ['plugin:node/recommended'],
        },
        {
            // test files
            files: ['tests/**/*-test.{js,ts}'],
            extends: ['plugin:qunit/recommended'],
        },
    ],
};
