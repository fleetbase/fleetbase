// screenshots/src/encode.mjs
//
// PNG in, WebP out, with the encoder settings pinned.
//
// Playwright always emits PNG (never JPEG — a lossy intermediate would add its own noise on
// top of the browser's). The published library on fleetbase.io is WebP, so the conversion
// happens exactly once, here, with options that are part of the output contract: changing
// any of them re-encodes all ~150 files.

import sharp from 'sharp';

// quality 88 is where the existing library sits by inspection (a 2880x1800 console
// screenshot lands in the 50-500 KB range, which is what the current files measure).
// smartSubsample is off because it makes chroma decisions from image content, and content
// here includes antialiased text — small render differences would change the subsampling
// decision and cascade into a much larger byte difference than the pixels justify.
export const WEBP_OPTIONS = {
    quality: 88,
    alphaQuality: 100,
    effort: 6,
    smartSubsample: false,
    nearLossless: false,
};

export async function pngToWebp(pngBuffer) {
    return sharp(pngBuffer).webp(WEBP_OPTIONS).toBuffer();
}

/**
 * Decode to raw RGBA for pixel comparison.
 *
 * ensureAlpha() matters: the published files and freshly captured ones can disagree about
 * whether they carry an alpha channel, and pixelmatch requires both buffers to have the
 * same stride. Without it a comparison of two identical images throws on a length mismatch.
 */
export async function toRaw(buffer) {
    const image = sharp(buffer).ensureAlpha();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, channels: info.channels };
}
