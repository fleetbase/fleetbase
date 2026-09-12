// screenshots/src/determinism.mjs
//
// Everything that makes two runs of the same UI produce the same pixels.
//
// The failure mode this guards against is not "the screenshot is wrong" — it is
// "the screenshot is byte-different but visually identical", which turns every CI
// run into a pull request full of noise on the public marketing site. The ERD
// workflow already learned this lesson the expensive way (see 49371ff): mermaid
// renders identical input to SVGs that differ in Bezier control points, so the job
// opened a fresh PR after every merge. Browsers are worse than mermaid.
//
// The layers here, in order of how much they buy:
//   1. no network variance   — every third-party request is cached or aborted
//   2. no time variance      — Date is pinned
//   3. no animation variance — transitions zeroed, capture gated on quiescence
//   4. no raster variance    — fixed color profile, LCD text and hinting off

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, '..', 'fixtures');

// The seeders build their fixtures from Carbon::parse('2026-01-15 08:00:00', 'Asia/Singapore').
// Anything rendered relative to "now" (created/updated columns, "3 days ago" cells) is a
// function of this constant, so it is part of the output contract: changing it re-renders
// every screenshot that shows a date.
export const FROZEN_TIME = new Date('2026-01-20T08:00:00+08:00');

// Must match the seeders' timezone. A runner in UTC renders every Singapore timestamp
// eight hours earlier, which is a real visual diff for a reason that has nothing to do
// with the console.
export const TIMEZONE = 'Asia/Singapore';

// Keep in sync with screenshots/package.json. The parity Docker image is
// mcr.microsoft.com/playwright:v<VERSION>-noble; ubuntu-latest runners are noble.
export const PLAYWRIGHT_VERSION = '1.62.1';

export const LAUNCH_ARGS = [
    // sRGB everywhere. Without this Chromium picks up the display profile, and a runner
    // image change shifts every pixel by a hair — enough to trip a pixel comparison on
    // all 32 files at once.
    '--force-color-profile=srgb',
    // Subpixel antialiasing and font hinting are the two largest sources of "same text,
    // different bytes". Turning both off costs a little crispness and buys reproducibility.
    '--disable-lcd-text',
    '--font-render-hinting=none',
    // GPU rasterization is not deterministic across machines; software raster is.
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-partial-raster',
    '--disable-skia-runtime-opts',
    // Scrollbar gutters differ between the host and the container image.
    '--hide-scrollbars',
    '--mute-audio',
    // Same reason console/testem.js sets it: required to run Chromium inside a container.
    ...(process.env.CI ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
];

// 1440x900 at deviceScaleFactor 2 => 2880x1800, which is exactly the dimensions of the
// screenshots already published on fleetbase.io, and the same logical viewport
// console/testem.js uses in CI. Matching it means compare.mjs can diff against the
// existing files instead of declaring all 66 of them resized.
export const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
export const DEVICE_SCALE_FACTOR = 2;

/**
 * Context options for a capture session.
 *
 * `colorScheme` is the primary theme lever and it works because of how the theme service
 * resolves: persisted user option -> initialTheme -> prefers-color-scheme -> 'dark'. A
 * freshly seeded demo user has never toggled the theme, so there is no persisted option
 * and prefers-color-scheme decides. ensureTheme() below verifies that rather than trusting
 * it, and repairs the case where an option does exist.
 */
export function contextOptions({ viewport = DEFAULT_VIEWPORT, theme = 'dark' } = {}) {
    return {
        viewport,
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
        locale: 'en-US',
        timezoneId: TIMEZONE,
        colorScheme: theme === 'light' ? 'light' : 'dark',
        reducedMotion: 'reduce',
        forcedColors: 'none',
        // The console is served from a different origin than the API in the compose stack;
        // capture is a trusted local context, so do not let a CSP block the init scripts.
        bypassCSP: true,
    };
}

const FREEZE_CSS = `
*, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
    caret-color: transparent !important;
}
/* Leaflet animates tile fade-in and zoom independently of the global transition rules. */
.leaflet-fade-anim .leaflet-tile,
.leaflet-zoom-anim .leaflet-zoom-animated {
    transition: none !important;
}
/* A blinking cursor in a focused search field is a one-pixel-column diff that recurs at
   random depending on where in the blink cycle the capture lands. */
input, textarea { caret-color: transparent !important; }
`;

/**
 * Install everything that has to be in place BEFORE the app's first script runs:
 * the session, the pre-user theme option, and the frozen clock.
 *
 * All of it goes through addInitScript so it survives the in-app reloads and redirects
 * (/login -> /onboard -> /) that the console performs during boot.
 */
export async function applyInitScripts(context, { token, theme, apiHost }) {
    // ember-simple-auth's adaptive store reads this key on boot. The shape is the login
    // response body with the authenticator name injected — see the precedent test at
    // console/tests/unit/models/report-test.js:414. The token must be a genuine Sanctum
    // token: authenticator:fleetbase.restore() re-validates it via GET auth/session on
    // every boot and invalidates the session if the server says no.
    const session = JSON.stringify({
        authenticated: { authenticator: 'authenticator:fleetbase', token, type: 'user' },
    });

    // currentUser.id is 'anon' until the user model resolves, and the theme service reads
    // the option during ApplicationRoute.activate() — i.e. possibly while still anon. This
    // covers the pre-user window; ensureTheme() covers the post-user one.
    const userOptions = JSON.stringify({ 'anon:theme': theme });

    await context.addInitScript(
        ({ session, userOptions, styles }) => {
            window.localStorage.setItem('ember_simple_auth-session', session);
            window.localStorage.setItem('@fleetbase/storage:user-options', userOptions);

            // Both are caches with their own TTLs. A stale entry from an earlier run is a
            // silent source of "why did this screenshot not change".
            window.localStorage.removeItem('fleetbase_runtime_config');
            window.localStorage.removeItem('fleetbase_runtime_config_version');
            window.localStorage.removeItem('@fleetbase/storage:local-cache');

            const inject = () => {
                if (document.getElementById('flb-screenshot-freeze')) return;
                const el = document.createElement('style');
                el.id = 'flb-screenshot-freeze';
                el.textContent = styles;
                (document.head || document.documentElement).appendChild(el);
            };
            inject();
            document.addEventListener('DOMContentLoaded', inject);
        },
        { session, userOptions, styles: FREEZE_CSS }
    );

    // setFixedTime, deliberately, rather than install()+pauseAt(). install() replaces the
    // timer functions and stops them advancing until told to, which stalls Ember's runloop
    // and ember-concurrency tasks — the app never finishes booting. setFixedTime pins only
    // Date.now()/new Date(), which is all that relative-time rendering reads, and leaves
    // timers running normally.
    for (const page of context.pages()) await page.clock.setFixedTime(FROZEN_TIME);
    context.on('page', (page) => page.clock.setFixedTime(FROZEN_TIME).catch(() => {}));

    return { apiHost };
}

// Hosts the console legitimately talks to. Everything else is aborted rather than allowed
// through: a request that succeeds today and 503s tomorrow is exactly how non-determinism
// gets back in, and an abort shows up immediately as a broken image instead of silently
// changing a run three weeks later.
function isLocalOrigin(url, { baseUrl, apiHost }) {
    try {
        const { origin } = new URL(url);
        return origin === new URL(baseUrl).origin || origin === new URL(apiHost).origin;
    } catch {
        return false;
    }
}

// The DEFAULT_*_IMAGE values in console/config/environment.js are compile-time constants
// baked into the bundle, and they are NOT in the runtime-config allowlist (which carries
// only API_HOST, API_NAMESPACE, SOCKETCLUSTER_*, OSRM_HOST and EXTENSIONS). So they cannot
// be pointed at a local file by configuration — they have to be intercepted.
const AVATAR_PATTERN = /flb-assets|s3[.-][a-z0-9-]*\.amazonaws\.com/i;

const CONTENT_TYPES = { '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

async function avatarFor(url) {
    // Match on the basename so a bucket or region rename — flb-assets is reachable under both
    // s3-ap-southeast-1.amazonaws.com and s3.ap-southeast-1.amazonaws.com today — does not
    // silently break the map.
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');

    for (const candidate of [name, 'fallback-placeholder-1.png']) {
        try {
            const body = await readFile(path.join(FIXTURES, 'avatars', candidate));
            const contentType = CONTENT_TYPES[path.extname(candidate).toLowerCase()] ?? 'application/octet-stream';
            return { body, contentType };
        } catch {
            /* try the next candidate */
        }
    }

    return null;
}

/**
 * Route every request the page makes into one of four buckets: local (allow), known
 * remote asset (serve from fixtures), tile/routing (serve from the disk cache), or
 * unknown third party (abort loudly).
 */
export async function installRoutes(page, { baseUrl, apiHost, tileCache, onBlocked }) {
    await page.route('**/*', async (route) => {
        const request = route.request();
        const url = request.url();

        if (url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
        if (isLocalOrigin(url, { baseUrl, apiHost })) return route.continue();

        if (AVATAR_PATTERN.test(url)) {
            const asset = await avatarFor(url);
            if (asset) return route.fulfill({ status: 200, contentType: asset.contentType, body: asset.body });
            onBlocked?.(url, 'no avatar fixture');
            return route.abort();
        }

        if (tileCache?.handles(url)) {
            const hit = await tileCache.get(url);
            if (hit) return route.fulfill({ status: 200, contentType: hit.contentType, body: hit.body });
            onBlocked?.(url, 'tile cache miss in offline mode');
            return route.abort();
        }

        onBlocked?.(url, 'unpinned third-party origin');
        return route.abort();
    });
}

/**
 * Verify the app actually landed on the theme we asked for, and repair it if not.
 *
 * body[data-theme] is the Tailwind hook (console/tailwind.config.js sets
 * darkMode: ['class','[data-theme="dark"]']), so it is both the thing to assert on and
 * the thing that has to be right. The repair path exists because a user who HAS a
 * persisted theme option beats prefers-color-scheme, and we cannot know that user's uuid
 * until the app has loaded them.
 */
export async function ensureTheme(page, theme) {
    await page.waitForFunction(() => Boolean(document.body?.dataset?.theme), null, { timeout: 30_000 });
    const actual = await page.evaluate(() => document.body.dataset.theme);
    if (actual === theme) return { theme: actual, repaired: false };

    // Write the option for whichever user id the bucket has actually adopted, then reload
    // so the theme service re-resolves from persisted state rather than from a DOM poke
    // (a poke leaves the service's own bookkeeping disagreeing with the DOM).
    const repaired = await page.evaluate((wanted) => {
        const KEY = '@fleetbase/storage:user-options';
        let bucket = {};
        try {
            bucket = JSON.parse(window.localStorage.getItem(KEY)) || {};
        } catch {
            bucket = {};
        }
        const ids = new Set(['anon']);
        for (const key of Object.keys(bucket)) {
            const id = key.split(':')[0];
            if (id) ids.add(id);
        }
        for (const id of ids) bucket[`${id}:theme`] = wanted;
        window.localStorage.setItem(KEY, JSON.stringify(bucket));
        return [...ids];
    }, theme);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
        (wanted) => document.body?.dataset?.theme === wanted,
        theme,
        { timeout: 30_000 }
    );
    return { theme, repaired: true, ids: repaired };
}

/**
 * Block until the app has finished booting.
 *
 * #boot-loader is the canonical signal: console/app/utils/remove-boot-loader.js removes it,
 * and every route that renders a real screen calls that (routes/console.js:39,
 * routes/virtual.js:27, routes/application.js:89, routes/auth/login.js:12). Waiting on it
 * covers both the authenticated and the logged-out path.
 *
 * .overloader is the session service's transient full-screen veil, injected during
 * handleAuthentication() and removed on a 600-1800ms timer. Capturing through it produces
 * a screenshot of a spinner that looks, in a diff, exactly like a real UI change.
 */
export async function waitForBoot(page, { timeout = 60_000 } = {}) {
    await page.waitForFunction(() => !document.getElementById('boot-loader'), null, { timeout });
    await page.waitForFunction(() => !document.querySelector('.overloader'), null, { timeout });
    await page.waitForFunction(() => Boolean(document.body?.dataset?.theme), null, { timeout });
}

/**
 * Block until nothing on the page is still moving.
 *
 * Ordering matters: content first (the selector and row count the manifest declares), then
 * the entry's own interaction, then the asynchronous tails — fonts, images, and map tiles —
 * which only start once the content that references them exists.
 */
export async function waitForQuiescence(page, entry, { timeout = 45_000 } = {}) {
    if (entry.waitFor) {
        await page.waitForSelector(entry.waitFor, { state: 'visible', timeout });
    }

    if (entry.expectRows) {
        const { selector, min } = entry.expectRows;
        // An empty table screenshots as a perfectly successful run. This is the check that
        // turns "the seeder did not populate this resource" into a failure instead of a
        // published screenshot of an empty state.
        await page
            .waitForFunction(
                ({ selector, min }) => document.querySelectorAll(selector).length >= min,
                { selector, min },
                { timeout }
            )
            .catch(() => {
                throw new Error(
                    `[${entry.id}] expected at least ${min} rows matching "${selector}"; ` +
                        'the fixture data is missing or the selector is stale'
                );
            });
    }

    if (typeof entry.interact === 'function') {
        await entry.interact(page);
        if (entry.waitForAfterInteract) {
            await page.waitForSelector(entry.waitForAfterInteract, { state: 'visible', timeout });
        }
    }

    await page.evaluate(() => document.fonts?.ready).catch(() => {});

    // Every <img> either finished or failed. `complete` is true for both, which is what we
    // want — a broken avatar should not hang the run, it should show up in the screenshot
    // and be caught by review.
    await page.waitForFunction(
        () => [...document.images].every((img) => img.complete),
        null,
        { timeout }
    );

    if (entry.map?.settleTiles) await waitForTiles(page, { timeout });

    if (entry.extraSettleMs) await page.waitForTimeout(entry.extraSettleMs);
}

/**
 * Leaflet adds .leaflet-tile-loaded to each tile as it decodes. Waiting for "no unloaded
 * tiles" alone is not enough: panning and lazy tile creation mean the set can grow after it
 * momentarily looks complete. Requiring the count to hold steady across two samples is the
 * cheap fix.
 */
async function waitForTiles(page, { timeout = 45_000, sampleMs = 250 } = {}) {
    const deadline = Date.now() + timeout;
    let previous = -1;

    while (Date.now() < deadline) {
        const { loaded, pending } = await page.evaluate(() => ({
            loaded: document.querySelectorAll('.leaflet-tile-loaded').length,
            pending: document.querySelectorAll('.leaflet-tile:not(.leaflet-tile-loaded)').length,
        }));

        if (pending === 0 && loaded === previous && loaded > 0) return;
        previous = loaded;
        await page.waitForTimeout(sampleMs);
    }

    throw new Error('map tiles did not settle');
}
