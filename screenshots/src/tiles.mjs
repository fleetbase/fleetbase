// screenshots/src/tiles.mjs
//
// A read-through disk cache for map tiles and OSRM routing responses.
//
// Two things make these worth caching rather than fetching each run. They are the only
// remaining network dependency in the capture (so they are the only thing that can turn a
// green run red for reasons outside this repo), and OSRM in particular answers the same
// query with slightly different geometry over time, which redraws the route polyline and
// shows up as a real-looking visual diff.
//
// Deliberately NOT committed to git: OpenStreetMap's tile usage policy forbids bulk
// downloading and redistribution. The cache lives in screenshots/.cache (gitignored) and is
// carried between CI runs by actions/cache, which is storage the project already owns.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Hosts whose responses are cacheable. Anything not listed here is aborted by
// determinism.mjs rather than allowed through — see the comment there about why an
// unpinned request is worse than a missing one.
const CACHEABLE = [
    /\.tile\.openstreetmap\.org$/i,
    /^tile\.openstreetmap\.org$/i,
    /\.basemaps\.cartocdn\.com$/i,
    /^basemaps\.cartocdn\.com$/i,
    /\.tile\.opentopomap\.org$/i,
    /^router\.project-osrm\.org$/i,
    /^unpkg\.com$/i, // leaflet marker sprites, when the engine loads them from the CDN
];

export class TileCache {
    /**
     * @param {{dir: string, offline?: boolean, userAgent?: string}} options
     *   offline: never reach the network; a miss aborts the request. Use in CI once the
     *   cache is warm, so a run cannot silently depend on a tile server being up.
     */
    constructor({ dir, offline = false, userAgent = 'fleetbase-screenshots (+https://fleetbase.io)' }) {
        this.dir = dir;
        this.offline = offline;
        this.userAgent = userAgent;
        this.stats = { hit: 0, miss: 0, fetched: 0, failed: 0 };
    }

    handles(url) {
        try {
            const { hostname } = new URL(url);
            return CACHEABLE.some((pattern) => pattern.test(hostname));
        } catch {
            return false;
        }
    }

    // Content-addressed by full URL. Tile coordinates are already in the path, but so are
    // subdomain rotations (a.tile, b.tile) that return identical bytes — hashing the whole
    // URL keeps the mapping honest and the directory flat.
    pathFor(url) {
        const { hostname } = new URL(url);
        const digest = createHash('sha256').update(url).digest('hex');
        return path.join(this.dir, hostname, `${digest.slice(0, 2)}`, digest);
    }

    async get(url) {
        const file = this.pathFor(url);

        try {
            const [body, meta] = await Promise.all([
                readFile(file),
                readFile(`${file}.json`, 'utf8').then(JSON.parse),
            ]);
            this.stats.hit += 1;
            return { body, contentType: meta.contentType };
        } catch {
            this.stats.miss += 1;
        }

        if (this.offline) return null;

        try {
            const response = await fetch(url, { headers: { 'User-Agent': this.userAgent } });
            if (!response.ok) {
                this.stats.failed += 1;
                return null;
            }

            const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
            const body = Buffer.from(await response.arrayBuffer());

            await mkdir(path.dirname(file), { recursive: true });
            await writeFile(file, body);
            await writeFile(`${file}.json`, JSON.stringify({ url, contentType }));

            this.stats.fetched += 1;
            return { body, contentType };
        } catch {
            this.stats.failed += 1;
            return null;
        }
    }

    summary() {
        const { hit, miss, fetched, failed } = this.stats;
        return `tiles: ${hit} cached, ${miss} missed (${fetched} fetched, ${failed} failed)`;
    }
}
