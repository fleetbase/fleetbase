// screenshots/src/domhash.mjs
//
// A structural fingerprint of what the page is showing, independent of how it rasterized.
//
// This is the generalisation of the fix in 49371ff. The ERD workflow stopped opening empty
// pull requests by gating on database.mmd — the deterministic INPUT — rather than on the
// SVG the non-deterministic renderer produced from it. A screenshot has no equivalent
// checked-in input, so we manufacture one: hash the DOM with everything volatile stripped
// out, and treat "pixels changed but structure did not" as rendering noise.
//
// The case that makes this worth having is a runner image bumping its font package. Every
// glyph shifts a fraction of a pixel, every file trips the pixel gate at once, and without
// a second opinion the job opens a 32-file pull request that contains no UI change at all.

import { createHash } from 'node:crypto';

// Evaluated in the page. Written as a string rather than a function reference because it
// has to survive being passed through page.evaluate with no closure over module scope.
const EXTRACT = `(() => {
    const root = document.body;
    if (!root) return '';

    const clone = root.cloneNode(true);

    // Elements that exist only to render volatile state.
    for (const el of clone.querySelectorAll('#flb-screenshot-freeze, script, style, noscript')) {
        el.remove();
    }

    const VOLATILE_ATTRS = ['id', 'style', 'src', 'srcset', 'href', 'data-uuid', 'aria-owns', 'aria-controls', 'aria-labelledby', 'aria-describedby'];
    const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const PUBLIC_ID = /\\b[a-z_]+_[A-Za-z0-9]{8,}\\b/g;
    const ISO_DATE = /\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}(:\\d{2})?/g;
    const EMBER_ID = /\\bember\\d+\\b/g;

    const walk = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            for (const attr of VOLATILE_ATTRS) node.removeAttribute(attr);
            // Ember regenerates element ids and aria wiring on every render; class lists
            // that encode transient state (a hover, a focus ring) do the same.
            for (const attr of [...node.attributes]) {
                if (attr.name.startsWith('data-ebd-id') || attr.name.startsWith('data-test-selected')) {
                    node.removeAttribute(attr.name);
                }
            }
            for (const child of [...node.childNodes]) walk(child);
        }
    };
    walk(clone);

    return clone.innerHTML
        .replace(UUID, '<uuid>')
        .replace(PUBLIC_ID, '<pubid>')
        .replace(ISO_DATE, '<date>')
        .replace(EMBER_ID, 'ember<n>')
        .replace(/\\s+/g, ' ')
        .trim();
})()`;

/**
 * Compute the structural hash of the current page state.
 *
 * Returns null rather than throwing when extraction fails: a missing hash degrades the gate
 * to pixel-only, which is exactly the behaviour we want on a first run. Never harder to
 * ship than it was before this file existed.
 */
export async function domHash(page) {
    try {
        const markup = await page.evaluate(EXTRACT);
        if (!markup) return null;
        return createHash('sha256').update(markup).digest('hex');
    } catch {
        return null;
    }
}

/**
 * The gate itself.
 *
 * Truth table, and the reasoning for each row:
 *   new / resized        -> include. There is nothing to compare against.
 *   pixels same          -> skip. Nothing happened.
 *   pixels + DOM changed -> include. A real UI or data change.
 *   pixels only, no base -> include. First run on this branch; no second opinion available,
 *                           so trust the pixels rather than silently dropping a real change.
 *   pixels only, base ok -> skip, and say so out loud. Rendering noise.
 */
export function decide({ status, pixelChanged, hashBefore, hashAfter }) {
    if (status === 'new' || status === 'resized') return { include: true, reason: status };
    if (!pixelChanged) return { include: false, reason: 'unchanged' };

    const haveBaseline = Boolean(hashBefore) && Boolean(hashAfter);
    if (!haveBaseline) return { include: true, reason: 'changed (no dom baseline)' };

    if (hashBefore !== hashAfter) return { include: true, reason: 'changed' };

    return { include: false, reason: 'render noise (pixels differ, dom identical)' };
}
