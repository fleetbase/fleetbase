// screenshots/src/capture.mjs
//
// The capture loop: one browser context per theme, one page per entry.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
    applyInitScripts,
    contextOptions,
    ensureTheme,
    installRoutes,
    waitForBoot,
    waitForQuiescence,
} from './determinism.mjs';
import { domHash } from './domhash.mjs';
import { pngToWebp } from './encode.mjs';

/**
 * The output filename for an entry in a given theme.
 *
 * The manifest's defaultTheme owns the unsuffixed name. That is not cosmetic: the ~150
 * files already published on fleetbase.io are dark, and every reference to them in the
 * site's source is a literal string like '/images/screenshots/fleet-ops/x.webp'. Suffixing
 * dark would rename all of them and break every page that renders one.
 */
export function fileNameFor(manifest, entry, theme) {
    return theme === manifest.defaultTheme ? `${entry.file}.webp` : `${entry.file}-${theme}.webp`;
}

function urlFor(entry, ids) {
    const url = typeof entry.url === 'function' ? entry.url({ ids, publicId: ids[entry.id] }) : entry.url;
    if (!url) throw new Error(`[${entry.id}] produced no URL`);
    return url;
}

/**
 * Screenshot until two consecutive captures agree.
 *
 * This is the cheapest possible insurance against a settle condition that is subtly wrong.
 * If the page is still moving, two captures 250ms apart differ, and we find out here —
 * where the error names the entry — instead of three steps later as an unexplained diff in
 * a pull request.
 */
async function captureStable(page, { attempts = 4, gapMs = 250, entryId }) {
    let previous = await page.screenshot({ type: 'png', animations: 'disabled' });

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        await page.waitForTimeout(gapMs);
        const next = await page.screenshot({ type: 'png', animations: 'disabled' });
        if (next.equals(previous)) return next;
        previous = next;
    }

    throw new Error(
        `[${entryId}] never stopped changing across ${attempts} captures ${gapMs}ms apart. ` +
            'Something on the page is still animating or polling; add a waitFor/extraSettleMs, ' +
            'or extend the freeze CSS in src/determinism.mjs.'
    );
}

/**
 * Capture every entry in every theme.
 *
 * @returns {Promise<Array<{id, file, theme, hash, bytes, url}>>}
 */
export async function captureAll({
    browser,
    manifest,
    ids,
    baseUrl,
    apiHost,
    token,
    tileCache,
    outDir,
    log = () => {},
}) {
    const captured = [];
    const blocked = new Set();

    await mkdir(outDir, { recursive: true });

    for (const theme of manifest.themes) {
        const context = await browser.newContext(
            contextOptions({ viewport: manifest.viewport, theme })
        );
        await applyInitScripts(context, { token, theme, apiHost });

        const page = await context.newPage();
        await installRoutes(page, {
            baseUrl,
            apiHost,
            tileCache,
            onBlocked: (url, reason) => blocked.add(`${reason}: ${url}`),
        });

        // Boot once against the console root before capturing anything. This pays for the
        // extension manager's lazy engine load, settles the session, and gives ensureTheme
        // a booted app to verify against — so a theme problem surfaces once here rather
        // than as sixteen wrong-theme screenshots.
        await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
        await waitForBoot(page);
        const themeResult = await ensureTheme(page, theme);
        log(`theme "${theme}" active${themeResult.repaired ? ' (repaired via persisted option)' : ''}`);

        for (const entry of manifest.entries) {
            const url = urlFor(entry, ids);
            const file = fileNameFor(manifest, entry, theme);

            if (entry.viewport) await page.setViewportSize(entry.viewport);

            await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded' });
            await waitForBoot(page);
            await waitForQuiescence(page, entry);

            const png = await captureStable(page, { entryId: `${entry.id}/${theme}` });
            const hash = await domHash(page);
            const webp = await pngToWebp(png);

            await writeFile(path.join(outDir, file), webp);
            captured.push({ id: entry.id, file, theme, hash, bytes: webp.length, url });
            log(`captured ${file} (${(webp.length / 1024).toFixed(0)} KB) from ${url}`);

            if (entry.viewport) await page.setViewportSize(manifest.viewport);
        }

        await context.close();
    }

    // Surfaced rather than thrown: a blocked request may be perfectly fine (an analytics
    // beacon), but if a screenshot looks wrong this list is the first place to look.
    if (blocked.size > 0) {
        log(`blocked ${blocked.size} third-party request(s):`);
        for (const entry of [...blocked].slice(0, 20)) log(`  - ${entry}`);
    }

    return captured;
}
