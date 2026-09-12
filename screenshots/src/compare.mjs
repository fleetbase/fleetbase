// screenshots/src/compare.mjs
//
// Decide whether a freshly captured screenshot differs from the published one in a way a
// human would notice.
//
// A byte comparison is useless here — two runs of the same UI produce different bytes, and
// that is the whole problem this pipeline exists to contain. So compare perceptually, with
// two tolerances stacked:
//
//   threshold 0.1   how different a single pixel must be to count as changed. Absorbs the
//                   sub-pixel antialiasing that survives determinism.mjs.
//   ratio 0.002     what fraction of pixels must have changed for the image to count as
//                   changed. Absorbs whatever the per-pixel threshold did not.
//
// 0.2% of a 2880x1800 image is ~10,000 pixels — about a third of a table row. Any real
// change (a moved column, a restyled badge, different data) is orders of magnitude above
// it; residual raster noise is orders of magnitude below.

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { toRaw } from './encode.mjs';

export const DEFAULT_PIXEL_THRESHOLD = 0.1;
export const DEFAULT_CHANGED_RATIO = 0.002;

/**
 * @returns {Promise<{status: 'new'|'resized'|'changed'|'unchanged', ratio: number,
 *                    changedPixels?: number, diff?: Buffer,
 *                    dimensions?: {width: number, height: number}}>}
 */
export async function comparePair(nextBuffer, currentBuffer, options = {}) {
    const {
        pixelThreshold = DEFAULT_PIXEL_THRESHOLD,
        changedRatio = DEFAULT_CHANGED_RATIO,
        emitDiff = true,
    } = options;

    if (!currentBuffer) {
        const { width, height } = await toRaw(nextBuffer);
        return { status: 'new', ratio: 1, dimensions: { width, height } };
    }

    const [next, current] = await Promise.all([toRaw(nextBuffer), toRaw(currentBuffer)]);

    // Different dimensions cannot be diffed pixel-for-pixel, and are always worth shipping:
    // either the viewport contract changed or the published file predates it.
    if (next.width !== current.width || next.height !== current.height) {
        return {
            status: 'resized',
            ratio: 1,
            dimensions: { width: next.width, height: next.height },
            previousDimensions: { width: current.width, height: current.height },
        };
    }

    const diff = emitDiff ? new PNG({ width: next.width, height: next.height }) : null;
    const changedPixels = pixelmatch(current.data, next.data, diff?.data ?? null, next.width, next.height, {
        threshold: pixelThreshold,
        // Antialiased pixels are the single largest source of false positives between two
        // renders of identical markup, and they are exactly what we do not want to ship on.
        includeAA: false,
    });

    const ratio = changedPixels / (next.width * next.height);
    const status = ratio > changedRatio ? 'changed' : 'unchanged';

    return {
        status,
        ratio,
        changedPixels,
        dimensions: { width: next.width, height: next.height },
        diff: status === 'changed' && diff ? PNG.sync.write(diff) : undefined,
    };
}

/**
 * Render the per-entry results as the markdown table that goes into the pull request body.
 *
 * This table is what makes an automated image PR reviewable. Without it a reviewer sees a
 * pile of binary files and has to take on faith that something changed; with it they can
 * see which screen, how much of it moved, and whether the DOM agreed.
 */
export function toMarkdownTable(results) {
    const rows = results.map((result) => {
        const pct = Number.isFinite(result.ratio) ? `${(result.ratio * 100).toFixed(2)}%` : '—';
        const dom = result.hashBefore
            ? result.hashBefore === result.hashAfter
                ? 'identical'
                : 'changed'
            : 'no baseline';
        return `| \`${result.file}\` | ${result.theme} | ${result.status} | ${pct} | ${dom} | ${result.included ? '✅' : '—'} |`;
    });

    return [
        '| File | Theme | Status | Pixels changed | DOM | Included |',
        '| --- | --- | --- | --- | --- | --- |',
        ...rows,
    ].join('\n');
}
