/*
===========================================================================
               Internationalization Key Validation Script
===========================================================================

Script Purpose:
----------------
This Node.js script checks the usage of internationalization keys in your Ember project's JavaScript and Handlebars files. It ensures that all keys referenced in your project files are present in the specified YAML translation file. This helps prevent missing translations during runtime.

Usage:
------
To use this script, run it with Node.js from the command line, providing the path to your Ember project directory and the path to the YAML translation file. Optionally, you can include the '--silent' flag to suppress error throwing and allow the script to run to completion even if there are missing translations.

Example Command:
----------------
node intl-lint.js --silent

Script Behavior:
----------------
1. The script recursively processes all JavaScript (.js) and Handlebars (.hbs) files in the specified Ember project directory.
2. It extracts translation keys using regular expressions tailored for Handlebars and JavaScript files.
3. For each key found, it checks if the key exists in the specified YAML translation file.
4. If any missing keys are detected, the script logs them and optionally throws an error.

Script Options:
---------------
- Ember Project Path: The root directory of your Ember project. Modify the 'projectPath' variable to set the path.
- Translation File Path: The path to the YAML translation file. Modify the 'translationFilePath' variable to set the path.
- Silent Mode: Include the '--silent' flag to suppress error throwing and allow the script to run to completion even if there are missing translations.

Authors:
---------
- Fleetbase Pte Ltd <hello@fleetbase.io>
- Ronald A. Richardson <ron@fleetbase.io>

Contact:
---------
If you encounter issues or have questions, feel free to contact the authors or raise an issue on the project repository.

License:
--------
This script is open-source and distributed under the MIT license. Refer to the LICENSE file for details.

===========================================================================
*/

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const silentMode = process.argv.includes('--silent');

function findTranslationKeys(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Regular expression for finding translation keys
    let regex;
    if (filePath.endsWith('.hbs')) {
        // Regular expression for finding translation keys in Handlebars files
        regex = /\{\{\s*t\s+["'`]([^"']+?)["'`]\s*}}|\(t\s+["'`]([^"']+?)["'`]\)/g;
    } else if (filePath.endsWith('.js')) {
        // Regular expression for finding translation keys in JavaScript files
        regex = /this\.intl\.t\s*\(\s*["'`]([^"']+?)["'`]\s*(?:,\s*\{.*?\}\s*)?\)/g;
    } else {
        console.log(`Unsupported file type: ${filePath}`);
        return [];
    }

    const keys = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
        // Matched key will be in one of the capturing groups 1 or 2
        const key = match[1] || match[2];
        if (key.trim() !== '') {
            keys.push(key);
        }
    }

    // Log the number of translation keys found in the file
    console.log(`Found ${keys.length} translation key(s) in file: ${filePath}`);

    return keys;
}

function checkKeysInTranslationFile(keys, translationFilePath) {
    console.log(`Checking if translation keys exist in file: ${translationFilePath}`);

    const translationContent = fs.readFileSync(translationFilePath, 'utf8');
    const translationData = yaml.load(translationContent);

    const missingKeys = keys.filter((key) => {
        const nestedKeys = key.split('.');
        let currentLevel = translationData;

        for (const nestedKey of nestedKeys) {
            if (currentLevel && currentLevel.hasOwnProperty(nestedKey)) {
                currentLevel = currentLevel[nestedKey];
            } else {
                return true; // Missing key found
            }
        }

        return false; // All nested keys found
    });

    return missingKeys;
}

function processDirectory(directoryPath, translationFilePath) {
    const files = fs.readdirSync(directoryPath);

    for (const file of files) {
        const filePath = path.join(directoryPath, file);

        if (fs.statSync(filePath).isDirectory()) {
            // Recursively process subdirectories
            processDirectory(filePath, translationFilePath);
        } else if (file.endsWith('.js') || file.endsWith('.hbs')) {
            console.log(`Checking file: ${filePath}`);
            // Process JavaScript and Handlebars files
            const keys = findTranslationKeys(filePath);
            if (keys.length === 0) {
                console.log('');
                continue;
            }
            const missingKeys = checkKeysInTranslationFile(keys, translationFilePath);

            if (missingKeys.length > 0) {
                console.error(`File: ${filePath}`);
                missingKeys.forEach((missingKey) => {
                    console.error(`🚫 Missing Translation: ${missingKey}`);

                    if (!silentMode) {
                        throw new Error(`🚫 Missing Translation: ${missingKey}`);
                    }
                });
            } else {
                console.log(`All translation keys found in file: ${filePath}`);
            }
            console.log('');
        }
    }
}

function checkTranslationsInProject(projectPath, translationFilePath) {
    console.log(`⏳ Starting translation key check in project: ${projectPath}`);
    processDirectory(projectPath, translationFilePath);
    console.log('✅ Translation key check completed.');
}

const projectPath = path.join(__dirname, '../app');
const translationFilePath = path.join(__dirname, '../translations/en-us.yaml');

try {
    checkTranslationsInProject(projectPath, translationFilePath);
} catch (error) {
    console.error('🚫 Translation key check failed:', error.message);
    process.exit(1); // Exit with an error code
}
