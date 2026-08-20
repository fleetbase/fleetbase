// screenshots/src/resolve.mjs
//
// Turn a stable fixture handle into the public_id a detail-page URL needs.
//
// The seeders assign a fresh Str::uuid() to every record on every run, and public_id is
// generated from it, so detail URLs cannot be written into the manifest. What IS stable is
// the human-meaningful field the seeder sets deliberately: a driver's name, an order's
// internal_id. Look the record up by that, once, before the browser starts.

/**
 * @param {{apiHost: string, namespace?: string, token: string}} api
 * @param {{resource: string, query: string, match: {field: string, value: string}}} spec
 * @returns {Promise<string>} the record's public_id
 */
export async function resolvePublicId({ apiHost, namespace = 'int/v1', token }, spec) {
    const base = `${apiHost}/${namespace}/${spec.resource}`;
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

    // The internal index endpoints accept ?query= for fuzzy search, which keeps the response
    // small. Not every resource honours it, so fall back to paging and filtering locally
    // rather than concluding the record does not exist.
    let rows = await getRows(`${base}?query=${encodeURIComponent(spec.query)}&limit=50`, headers);
    if (rows.length === 0) rows = await getRows(`${base}?limit=200`, headers);

    const { field, value } = spec.match;
    const hits = rows.filter((row) => String(row?.[field]) === String(value));

    // Exactly one, or stop. A screenshot of the wrong driver is worse than no screenshot:
    // it is wrong in a way that survives review, because nothing about it looks broken.
    if (hits.length !== 1) {
        const sample = rows
            .slice(0, 10)
            .map((row) => `${row?.[field] ?? '?'}=${row?.public_id ?? '?'}`)
            .join(', ');
        throw new Error(
            `resolve(${spec.resource}): expected exactly 1 record with ${field}="${value}", got ${hits.length}. ` +
                `Checked ${rows.length} records. Candidates: ${sample || 'none'}`
        );
    }

    const publicId = hits[0]?.public_id;
    if (!publicId) {
        throw new Error(`resolve(${spec.resource}): matched a record with no public_id for ${field}="${value}"`);
    }

    return publicId;
}

async function getRows(url, headers) {
    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} for ${url}`);
    }
    const body = await response.json();
    // Internal endpoints answer either a bare array or a JSON:API-ish { data: [...] }.
    const rows = Array.isArray(body) ? body : (body?.data ?? []);
    return Array.isArray(rows) ? rows : [];
}

/**
 * Resolve every entry in the manifest that declares a `resolve` block.
 *
 * Runs before the browser launches so a data problem costs a few seconds rather than a
 * whole capture pass, and returns a plain { [entryId]: publicId } map that url() callbacks
 * read from.
 */
export async function resolveAll(api, entries) {
    const ids = {};

    for (const entry of entries) {
        if (!entry.resolve) continue;
        ids[entry.id] = await resolvePublicId(api, entry.resolve);
    }

    return ids;
}

/**
 * Cross-check the resolver against what the seeder says it created.
 *
 * DemoSeeder echoes a SEEDED_FIXTURES={...} line for exactly this purpose. Two independent
 * paths agreeing is what distinguishes "resolved the right record" from "resolved a record".
 * A disagreement means the demo data and the manifest have drifted apart, which is precisely
 * when a silent wrong-record screenshot would otherwise ship.
 */
export function assertFixturesAgree(resolvedIds, seededFixtures) {
    if (!seededFixtures || Object.keys(seededFixtures).length === 0) return;

    const mismatches = [];
    for (const [id, publicId] of Object.entries(resolvedIds)) {
        const expected = seededFixtures[id];
        if (expected && expected !== publicId) {
            mismatches.push(`${id}: resolved ${publicId}, seeder reported ${expected}`);
        }
    }

    if (mismatches.length > 0) {
        throw new Error(`resolved ids disagree with SEEDED_FIXTURES:\n  ${mismatches.join('\n  ')}`);
    }
}
