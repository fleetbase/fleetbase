import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { comparePair } from '../src/compare.mjs';
import { decide } from '../src/domhash.mjs';

const WIDTH = 200;
const HEIGHT = 100;

/** A solid canvas with an optional filled rectangle, encoded as WebP like a real capture. */
async function image({ background = { r: 20, g: 24, b: 32 }, rect } = {}) {
    let pipeline = sharp({
        create: { width: WIDTH, height: HEIGHT, channels: 4, background: { ...background, alpha: 1 } },
    });

    if (rect) {
        const overlay = await sharp({
            create: {
                width: rect.width,
                height: rect.height,
                channels: 4,
                background: { r: 240, g: 240, b: 240, alpha: 1 },
            },
        })
            .png()
            .toBuffer();
        pipeline = pipeline.composite([{ input: overlay, top: rect.top, left: rect.left }]);
    }

    return pipeline.webp({ quality: 88, effort: 6 }).toBuffer();
}

test('a missing published file is always new', async () => {
    const result = await comparePair(await image(), null);
    assert.equal(result.status, 'new');
    assert.deepEqual(result.dimensions, { width: WIDTH, height: HEIGHT });
});

test('identical captures compare as unchanged', async () => {
    const buffer = await image();
    const result = await comparePair(buffer, buffer);
    assert.equal(result.status, 'unchanged');
    assert.equal(result.ratio, 0);
});

test('different dimensions compare as resized rather than throwing', async () => {
    const wider = await sharp({
        create: { width: WIDTH * 2, height: HEIGHT, channels: 4, background: { r: 20, g: 24, b: 32, alpha: 1 } },
    })
        .webp()
        .toBuffer();

    const result = await comparePair(wider, await image());
    assert.equal(result.status, 'resized');
    assert.deepEqual(result.previousDimensions, { width: WIDTH, height: HEIGHT });
});

test('a change smaller than the ratio floor is absorbed as noise', async () => {
    // 4x4 of 20000 pixels is 0.02%, an order of magnitude under the 0.2% floor — the scale of
    // residual antialiasing, not of a UI change.
    const before = await image();
    const after = await image({ rect: { top: 0, left: 0, width: 4, height: 4 } });

    const result = await comparePair(after, before);
    assert.equal(result.status, 'unchanged');
    assert.ok(result.ratio < 0.002, `expected a sub-threshold ratio, got ${result.ratio}`);
});

test('a change larger than the ratio floor is reported as changed', async () => {
    // 100x50 of 20000 pixels is 25% — about the scale of a table row appearing.
    const before = await image();
    const after = await image({ rect: { top: 10, left: 10, width: 100, height: 50 } });

    const result = await comparePair(after, before);
    assert.equal(result.status, 'changed');
    assert.ok(result.ratio > 0.002);
    assert.ok(result.diff instanceof Buffer, 'a changed pair should emit a diff image');
});

test('decide: new and resized always publish', () => {
    assert.equal(decide({ status: 'new' }).include, true);
    assert.equal(decide({ status: 'resized' }).include, true);
});

test('decide: unchanged pixels never publish', () => {
    const verdict = decide({ status: 'unchanged', pixelChanged: false, hashBefore: 'a', hashAfter: 'b' });
    assert.equal(verdict.include, false);
    assert.equal(verdict.reason, 'unchanged');
});

test('decide: pixels and DOM both changed is a real change', () => {
    const verdict = decide({ status: 'changed', pixelChanged: true, hashBefore: 'a', hashAfter: 'b' });
    assert.equal(verdict.include, true);
});

test('decide: pixels changed with an identical DOM is render noise', () => {
    // The runner-font-bump case. Without this, one image-library-wide raster shift opens a
    // pull request containing every file and no actual UI change.
    const verdict = decide({ status: 'changed', pixelChanged: true, hashBefore: 'a', hashAfter: 'a' });
    assert.equal(verdict.include, false);
    assert.match(verdict.reason, /render noise/);
});

test('decide: with no DOM baseline, trust the pixels', () => {
    // First run on a new branch. Degrading to pixel-only must never be stricter than the
    // pixel gate alone, or a real change would be silently dropped.
    assert.equal(decide({ status: 'changed', pixelChanged: true, hashAfter: 'b' }).include, true);
    assert.equal(decide({ status: 'changed', pixelChanged: true, hashBefore: 'a' }).include, true);
});
