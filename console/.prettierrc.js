'use strict';

module.exports = {
    trailingComma: 'es5',
    tabWidth: 4,
    semi: true,
    singleQuote: true,
    printWidth: 190,
    overrides: [
        {
            files: '*.{hbs,js,ts}',
            options: {
                singleQuote: false,
            },
        },
    ],
};
