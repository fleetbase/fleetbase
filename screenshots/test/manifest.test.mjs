import assert from 'node:assert/strict';
import test from 'node:test';
import manifest from '../manifests/fleet-ops.mjs';
import { fileNameFor } from '../src/capture.mjs';

test('every entry declares the fields the capture loop requires', () => {
    for (const entry of manifest.entries) {
        assert.ok(entry.id, 'entry is missing an id');
        assert.ok(entry.file, `[${entry.id}] is missing a file`);
        assert.ok(entry.url, `[${entry.id}] is missing a url`);
        assert.ok(entry.waitFor, `[${entry.id}] is missing a waitFor selector`);
    }
});

test('entry ids and output filenames are unique', () => {
    const ids = manifest.entries.map((entry) => entry.id);
    const files = manifest.entries.map((entry) => entry.file);
    assert.equal(new Set(ids).size, ids.length, 'duplicate entry id');
    assert.equal(new Set(files).size, files.length, 'duplicate output filename');
});

test('a dynamic url is always paired with a resolve block', () => {
    // A function url reads publicId, which only resolveAll() can supply. Without the pair the
    // URL renders as "undefined" and the run captures a 404 page that looks plausible.
    for (const entry of manifest.entries) {
        if (typeof entry.url === 'function') {
            assert.ok(entry.resolve, `[${entry.id}] has a dynamic url but no resolve block`);
            assert.ok(entry.resolve.resource, `[${entry.id}] resolve is missing a resource`);
            assert.ok(entry.resolve.match?.field, `[${entry.id}] resolve is missing match.field`);
        }
    }
});

test('list views assert a minimum row count', () => {
    // The check that turns "the seeder produced nothing for this resource" into a failed run
    // instead of a published screenshot of an empty state.
    const listEntries = manifest.entries.filter((entry) => entry.file.endsWith('-list'));
    assert.ok(listEntries.length > 0, 'expected at least one list entry');
    for (const entry of listEntries) {
        assert.ok(entry.expectRows?.min > 0, `[${entry.id}] is a list view with no expectRows.min`);
    }
});

test('the default theme owns the unsuffixed filename', () => {
    // Dark is the theme of every file already published on fleetbase.io, and the site
    // references those paths as literal strings. Suffixing dark would rename all of them.
    assert.equal(manifest.defaultTheme, 'dark');
    assert.ok(manifest.themes.includes('dark'));

    const entry = manifest.entries[0];
    assert.equal(fileNameFor(manifest, entry, 'dark'), `${entry.file}.webp`);
    assert.equal(fileNameFor(manifest, entry, 'light'), `${entry.file}-light.webp`);
});

test('the viewport renders at the dimensions the published library uses', () => {
    // 1440x900 at deviceScaleFactor 2 is 2880x1800 — measured on the current files. A
    // mismatch would make compare.mjs report every single file as "resized".
    assert.deepEqual(manifest.viewport, { width: 1440, height: 900 });
});
