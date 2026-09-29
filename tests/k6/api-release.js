// tests/k6/api-release.js
//
// Fleetbase release benchmark + rate-limit isolation gate.
//
// Two phases, run back to back so their numbers do not contaminate each other:
//
//   1. throughput       Ramping arrival rate against the public order API with the LOAD
//                       key, which the stack lists in THROTTLE_UNLIMITED_API_KEYS so the
//                       run measures the API rather than the rate limiter. Mix (default):
//                       create 20% / update 20% / list 30% / get 30%.
//
//   2. noisy_neighbour  The incident this gate exists for: one tenant (NOISY key, normal
//                       per-key limit) floods create/update far above its limit, while a
//                       different tenant (VICTIM key) sends a steady trickle and an
//                       anonymous visitor loads a public console route. The NOISY tenant
//                       must be throttled (429 + Retry-After); nobody else may be.
//                       Before the fix every consumer behind the load balancer shared one
//                       IP bucket, so the victim and the console got 429s too.
//
// Everything is configurable through -e VAR=value; see tests/k6/README.md.
// handleSummary() writes summary.json, report.md and report.html to K6_REPORT_DIR.

import http from 'k6/http';
import exec from 'k6/execution';
import { check } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { buildReports } from './lib/report.js';

/* ----------------------------------------------------------------------------
 | Configuration
 * ------------------------------------------------------------------------- */

function env(name, fallback) {
    const value = __ENV[name];
    return value === undefined || value === '' ? fallback : value;
}

function num(name, fallback) {
    const value = Number(env(name, fallback));
    if (!Number.isFinite(value)) {
        throw new Error(`${name} must be a number, got "${__ENV[name]}"`);
    }
    return value;
}

// "90s", "3m", "3m30s", "1h" -> seconds.
function seconds(name, fallback) {
    const raw = String(env(name, fallback)).trim();
    if (/^\d+(\.\d+)?$/.test(raw)) {
        return Number(raw);
    }
    const re = /(\d+(?:\.\d+)?)(h|m|s)/g;
    let total = 0;
    let matched = '';
    let m;
    while ((m = re.exec(raw)) !== null) {
        total += Number(m[1]) * { h: 3600, m: 60, s: 1 }[m[2]];
        matched += m[0];
    }
    if (matched !== raw || total <= 0) {
        throw new Error(`${name} must be a duration like 90s or 3m30s, got "${raw}"`);
    }
    return total;
}

const BASE_URL = env('BASE_URL', 'http://localhost:8000').replace(/\/+$/, '');
const KEYS = {
    load: env('K6_LOAD_KEY', ''),
    noisy: env('K6_NOISY_KEY', ''),
    victim: env('K6_VICTIM_KEY', ''),
};

const ENABLED = env('SCENARIOS', 'throughput,noisy_neighbour')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const RUN_THROUGHPUT = ENABLED.includes('throughput');
const RUN_NOISY = ENABLED.includes('noisy_neighbour');

const CFG = {
    baseUrl: BASE_URL,
    requestTimeout: env('REQUEST_TIMEOUT', '30s'),

    // Throughput
    peakRate: num('THROUGHPUT_PEAK_RATE', 50),
    throughputSec: seconds('THROUGHPUT_DURATION', '3m30s'),
    throughputVUs: num('THROUGHPUT_VUS', 50),
    throughputMaxVUs: num('THROUGHPUT_MAX_VUS', 300),
    mix: env('THROUGHPUT_MIX', 'create:20,update:20,list:30,get:30'),
    seedOrders: num('SEED_ORDERS', 10),

    // Noisy neighbour
    noisyRate: num('NOISY_RATE', 10),
    noisySec: seconds('NOISY_DURATION', '90s'),
    noisyWarmupSec: seconds('NOISY_WARMUP', '15s'),
    noisyMaxVUs: num('NOISY_MAX_VUS', 150),
    victimRate: num('VICTIM_RATE', 1),
    publicProbePath: env('PUBLIC_PROBE_PATH', '/int/v1/settings/branding'),
    publicProbeEverySec: seconds('PUBLIC_PROBE_EVERY', '2s'),
    gapSec: seconds('PHASE_GAP', '10s'),

    // Latency budgets (ms) for the LOAD key's throughput phase.
    readP95: num('READ_P95_MS', 800),
    writeP95: num('WRITE_P95_MS', 1500),
    readP99: num('READ_P99_MS', 0), // 0 = report only
    writeP99: num('WRITE_P99_MS', 0),
    maxErrorRate: num('MAX_ERROR_RATE', 0.01),

    // Report metadata
    version: env('RELEASE_VERSION', 'local'),
    sha: env('GIT_SHA', ''),
    ref: env('GIT_REF', ''),
    runUrl: env('RUN_URL', ''),
    rateLimit: env('K6_RATE_LIMIT', ''),
    // k6 does not create directories: an explicit K6_REPORT_DIR must already exist.
    reportDir: env('K6_REPORT_DIR', '.').replace(/\/+$/, '') || '.',
};

const MIX = CFG.mix.split(',').map((part) => {
    const [op, weight] = part.split(':').map((s) => s.trim());
    if (!['create', 'update', 'list', 'get'].includes(op) || !(Number(weight) >= 0)) {
        throw new Error(`THROUGHPUT_MIX entry "${part}" must be create|update|list|get:<weight>`);
    }
    return { op, weight: Number(weight) };
});
const MIX_TOTAL = MIX.reduce((sum, e) => sum + e.weight, 0);

if (RUN_THROUGHPUT && !KEYS.load) throw new Error('K6_LOAD_KEY is required for the throughput scenario');
if (RUN_NOISY && (!KEYS.noisy || !KEYS.victim)) {
    throw new Error('K6_NOISY_KEY and K6_VICTIM_KEY are required for the noisy_neighbour scenario');
}
if (RUN_NOISY && KEYS.noisy === KEYS.victim) {
    throw new Error('K6_NOISY_KEY and K6_VICTIM_KEY must be different credentials');
}

/* ----------------------------------------------------------------------------
 | Endpoints (the `endpoint` tag; `name` groups URLs so ids do not explode cardinality)
 * ------------------------------------------------------------------------- */

export const ENDPOINTS = {
    create: 'POST /v1/orders',
    update: 'PUT /v1/orders/:id',
    list: 'GET /v1/orders',
    get: 'GET /v1/orders/:id',
    places: 'GET /v1/places',
    public: `GET ${CFG.publicProbePath}`,
};
const READ_OPS = ['list', 'get'];
const WRITE_OPS = ['create', 'update'];
const VICTIM_OPS = ['list', 'get', 'create', 'update', 'places'];

/* ----------------------------------------------------------------------------
 | Custom metrics
 * ------------------------------------------------------------------------- */

const victimThrottled = new Counter('victim_throttled'); // 429s seen by the VICTIM tenant
const victimRequests = new Counter('victim_requests');
const publicThrottled = new Counter('public_probe_throttled'); // 429s on the anonymous console route
const publicRequests = new Counter('public_probe_requests');
const noisyThrottled = new Counter('noisy_throttled'); // 429s seen by the NOISY tenant (expected)
const noisyRequests = new Counter('noisy_requests');
const noisyMissingRetryAfter = new Counter('noisy_429_missing_retry_after');
const noisyMissingRateHeaders = new Counter('noisy_429_missing_ratelimit_headers');
const unexpectedStatus = new Rate('unexpected_status'); // non-2xx that is not an expected 429

/* ----------------------------------------------------------------------------
 | Scenarios + thresholds
 * ------------------------------------------------------------------------- */

const throughputStages = [
    { duration: `${Math.round(CFG.throughputSec * 0.15)}s`, target: Math.max(1, Math.round(CFG.peakRate * 0.2)) },
    { duration: `${Math.round(CFG.throughputSec * 0.25)}s`, target: CFG.peakRate },
    { duration: `${Math.round(CFG.throughputSec * 0.5)}s`, target: CFG.peakRate },
    { duration: `${Math.round(CFG.throughputSec * 0.1)}s`, target: 0 },
];

// constant-arrival-rate takes an integer rate per timeUnit; express fractional req/s
// (e.g. VICTIM_RATE=0.2 on a slow local stack) per minute instead.
function arrival(perSecond) {
    if (Number.isInteger(perSecond)) return { rate: perSecond, timeUnit: '1s' };
    return { rate: Math.max(1, Math.round(perSecond * 60)), timeUnit: '1m' };
}

const noisyStart = RUN_THROUGHPUT ? CFG.throughputSec + CFG.gapSec : 0;
const bystanderStart = noisyStart + CFG.noisyWarmupSec;
const bystanderSec = Math.max(1, CFG.noisySec - CFG.noisyWarmupSec);

const scenarios = {};
if (RUN_THROUGHPUT) {
    scenarios.throughput = {
        executor: 'ramping-arrival-rate',
        exec: 'throughput',
        startRate: 1,
        timeUnit: '1s',
        preAllocatedVUs: CFG.throughputVUs,
        maxVUs: CFG.throughputMaxVUs,
        stages: throughputStages,
        tags: { role: 'load' },
    };
}
if (RUN_NOISY) {
    scenarios.noisy_flood = {
        executor: 'constant-arrival-rate',
        exec: 'noisyFlood',
        ...arrival(CFG.noisyRate),
        duration: `${CFG.noisySec}s`,
        startTime: `${noisyStart}s`,
        preAllocatedVUs: Math.min(CFG.noisyMaxVUs, Math.max(5, CFG.noisyRate * 2)),
        maxVUs: CFG.noisyMaxVUs,
        tags: { role: 'noisy' },
    };
    // The victim and the anonymous probe start after the flood has had time to exhaust
    // the NOISY bucket, so every one of their requests lands while it is being throttled.
    scenarios.victim = {
        executor: 'constant-arrival-rate',
        exec: 'victim',
        ...arrival(CFG.victimRate),
        duration: `${bystanderSec}s`,
        startTime: `${bystanderStart}s`,
        preAllocatedVUs: Math.max(2, Math.ceil(CFG.victimRate * 4)),
        maxVUs: Math.max(10, Math.ceil(CFG.victimRate * 20)),
        tags: { role: 'victim' },
    };
    scenarios.public_probe = {
        executor: 'constant-arrival-rate',
        exec: 'publicProbe',
        rate: 1,
        timeUnit: `${CFG.publicProbeEverySec}s`,
        duration: `${bystanderSec}s`,
        startTime: `${bystanderStart}s`,
        preAllocatedVUs: 2,
        maxVUs: 10,
        tags: { role: 'public' },
    };
}

// Submetric names are referenced by the report, so they are built in one place.
export function sub(metric, tags) {
    return `${metric}{${Object.entries(tags)
        .map(([k, v]) => `${k}:${v}`)
        .join(',')}}`;
}

// GATES are real pass/fail criteria. INFO entries only exist so k6 keeps the tagged
// submetric in the summary data (k6 only summarises submetrics that have a threshold);
// endpoint values therefore avoid braces and commas, which the submetric syntax reserves.
// they can never fail and the report does not list them as gates.
const GATES = {};
const INFO = {};
const ROWS = []; // { role, op, endpoint } — one report row each

function addRow(role, op) {
    const tags = { role, endpoint: ENDPOINTS[op] };
    ROWS.push({ role, op, endpoint: ENDPOINTS[op] });
    INFO[sub('http_req_duration', tags)] = ['max>=0'];
    INFO[sub('http_reqs', tags)] = ['count>=0'];
    INFO[sub('http_req_failed', tags)] = ['rate>=0'];
}

GATES.http_req_failed = [`rate<${CFG.maxErrorRate}`];

if (RUN_THROUGHPUT) {
    ['create', 'update', 'list', 'get'].forEach((op) => addRow('load', op));
    READ_OPS.concat(WRITE_OPS).forEach((op) => {
        const isRead = READ_OPS.includes(op);
        const rules = [`p(95)<${isRead ? CFG.readP95 : CFG.writeP95}`];
        const p99 = isRead ? CFG.readP99 : CFG.writeP99;
        if (p99 > 0) rules.push(`p(99)<${p99}`);
        GATES[sub('http_req_duration', { role: 'load', op })] = rules;
    });
    INFO.dropped_iterations = ['count>=0'];
}

if (RUN_NOISY) {
    ['create', 'update'].forEach((op) => addRow('noisy', op));
    VICTIM_OPS.forEach((op) => addRow('victim', op));
    addRow('public', 'public');

    // The isolation gate.
    GATES.victim_throttled = ['count==0'];
    GATES.public_probe_throttled = ['count==0'];
    // Guard against a vacuous pass: the flood must actually be throttled, and the
    // bystanders must actually have sent traffic during it.
    GATES.noisy_throttled = ['count>0'];
    GATES.noisy_429_missing_retry_after = ['count==0'];
    GATES.victim_requests = ['count>0'];
    GATES.public_probe_requests = ['count>0'];
    INFO.noisy_requests = ['count>=0'];
    ['create', 'update'].forEach((op) => {
        INFO[sub('noisy_throttled', { op })] = ['count>=0'];
    });
    INFO.noisy_429_missing_ratelimit_headers = ['count>=0'];
}
INFO.unexpected_status = ['rate>=0'];

export const options = {
    scenarios,
    thresholds: Object.assign({}, INFO, GATES),
    summaryTrendStats: ['avg', 'min', 'med', 'p(50)', 'p(90)', 'p(95)', 'p(99)', 'max', 'count'],
    // 200-399 is success. The NOISY tenant's requests additionally accept 429 per request
    // (see noisyParams), so http_req_failed counts every other failure.
    setupTimeout: env('SETUP_TIMEOUT', '120s'),
    teardownTimeout: '30s',
    discardResponseBodies: false,
    userAgent: `fleetbase-k6-release/${CFG.version}`,
    tags: { release: CFG.version },
};

/* ----------------------------------------------------------------------------
 | HTTP helpers
 * ------------------------------------------------------------------------- */

const OK = http.expectedStatuses({ min: 200, max: 399 });
const OK_OR_THROTTLED = http.expectedStatuses({ min: 200, max: 399 }, 429);

function params(key, op, extra) {
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
    if (key) headers.Authorization = `Bearer ${key}`;
    return Object.assign(
        {
            headers,
            timeout: CFG.requestTimeout,
            responseCallback: OK,
            tags: { endpoint: ENDPOINTS[op], op, name: ENDPOINTS[op] },
        },
        extra || {}
    );
}

let seq = 0;
function orderBody(role) {
    seq += 1;
    // Coordinates (not a street address) so no geocoder is needed. Small jitter keeps the
    // places distinct without depending on an external service.
    const jitter = () => (Math.random() - 0.5) * 0.02;
    return JSON.stringify({
        pickup: {
            name: `k6 pickup ${role}`,
            street1: '1 Benchmark Street',
            latitude: 1.2966 + jitter(),
            longitude: 103.852 + jitter(),
        },
        dropoff: {
            name: `k6 dropoff ${role}`,
            street1: '2 Benchmark Street',
            latitude: 1.3048 + jitter(),
            longitude: 103.8318 + jitter(),
        },
        meta: { source: 'k6', role, vu: exec.vu.idInTest, seq },
    });
}

function updateBody(role) {
    return JSON.stringify({ notes: `k6 ${role} update ${Date.now()}`, meta: { source: 'k6', role, touched_at: Date.now() } });
}

function parseId(res) {
    try {
        const id = res.json('id');
        return typeof id === 'string' ? id : null;
    } catch (e) {
        return null;
    }
}

function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

// Per-VU pool of orders this VU created, on top of the seed pool from setup().
const created = { load: [], noisy: [], victim: [] };
function orderIdFor(role, data) {
    const pool = created[role].concat((data.seed && data.seed[role]) || []);
    return pool.length ? pick(pool) : null;
}
function remember(role, id) {
    if (!id) return;
    created[role].push(id);
    if (created[role].length > 50) created[role].shift();
}

function call(role, op, key, data, extra) {
    const p = params(key, op, extra);
    let res;
    switch (op) {
        case 'create':
            res = http.post(`${BASE_URL}/v1/orders`, orderBody(role), p);
            if (res.status === 201 || res.status === 200) {
                remember(role, parseId(res));
            }
            return res;
        case 'update': {
            const id = orderIdFor(role, data);
            if (!id) return call(role, 'create', key, data, extra);
            return http.put(`${BASE_URL}/v1/orders/${id}`, updateBody(role), p);
        }
        case 'get': {
            const id = orderIdFor(role, data);
            if (!id) return call(role, 'list', key, data, extra);
            return http.get(`${BASE_URL}/v1/orders/${id}`, p);
        }
        case 'list':
            return http.get(`${BASE_URL}/v1/orders?limit=10`, p);
        case 'places':
            return http.get(`${BASE_URL}/v1/places?limit=10`, p);
        case 'public':
            return http.get(`${BASE_URL}${CFG.publicProbePath}`, p);
        default:
            throw new Error(`unknown op ${op}`);
    }
}

/* ----------------------------------------------------------------------------
 | Lifecycle
 * ------------------------------------------------------------------------- */

function probeHeaders(key) {
    const res = http.get(`${BASE_URL}/v1/orders?limit=1`, params(key, 'list', { tags: { endpoint: 'setup', op: 'setup', name: 'setup' }, responseCallback: OK_OR_THROTTLED }));
    return {
        status: res.status,
        limit: res.headers['X-Ratelimit-Limit'] || null,
    };
}

function seed(role, key, count) {
    const ids = [];
    for (let i = 0; i < count; i += 1) {
        const res = http.post(`${BASE_URL}/v1/orders`, orderBody(role), params(key, 'create', { tags: { endpoint: 'setup', op: 'setup', name: 'setup' } }));
        const id = res.status === 201 || res.status === 200 ? parseId(res) : null;
        if (!id) {
            exec.test.abort(`setup: could not create a seed order for the ${role} key (HTTP ${res.status}): ${String(res.body).slice(0, 300)}`);
        }
        ids.push(id);
    }
    return ids;
}

export function setup() {
    const health = http.get(`${BASE_URL}/health`, { timeout: '30s', tags: { endpoint: 'setup', op: 'setup', name: 'setup' } });
    if (health.status !== 200) {
        exec.test.abort(`setup: ${BASE_URL}/health answered ${health.status}`);
    }

    const info = { startedAt: new Date().toISOString(), seed: {}, throttle: {} };

    // Read the limiter's behaviour from the outside. A throttled consumer carries
    // X-RateLimit-Limit on every response; an unlimited one (THROTTLE_UNLIMITED_API_KEYS
    // or an unlimited organization override) and a globally disabled limiter carry none.
    if (RUN_NOISY) {
        const noisy = probeHeaders(KEYS.noisy);
        info.throttle.noisyLimit = noisy.limit;
        info.throttle.active = noisy.limit !== null;
        if (noisy.status === 401) exec.test.abort('setup: K6_NOISY_KEY was rejected (401)');
        const victim = probeHeaders(KEYS.victim);
        if (victim.status === 401) exec.test.abort('setup: K6_VICTIM_KEY was rejected (401)');
    }
    if (RUN_THROUGHPUT) {
        const load = probeHeaders(KEYS.load);
        if (load.status === 401) exec.test.abort('setup: K6_LOAD_KEY was rejected (401)');
        info.throttle.loadLimit = load.limit;
        info.throttle.loadBypassed = load.limit === null;
        // Throughput through a throttled key would benchmark the limiter, not the API:
        // fail fast with the real reason instead of a wall of 429s.
        if (!info.throttle.loadBypassed) {
            exec.test.abort(
                `setup: K6_LOAD_KEY is rate limited (X-RateLimit-Limit: ${load.limit}). ` +
                    'Add it to THROTTLE_UNLIMITED_API_KEYS and reload the application before benchmarking.'
            );
        }
        info.seed.load = seed('load', KEYS.load, CFG.seedOrders);
    }
    if (RUN_NOISY) {
        if (!info.throttle.active) {
            console.warn('setup: the NOISY key carries no X-RateLimit-Limit header — throttling looks disabled; the isolation gate will fail (noisy_throttled must be > 0).');
        }
        info.seed.noisy = seed('noisy', KEYS.noisy, 2);
        info.seed.victim = seed('victim', KEYS.victim, 3);
    }
    return info;
}

/* ----------------------------------------------------------------------------
 | Scenario functions
 * ------------------------------------------------------------------------- */

function weightedOp() {
    let r = Math.random() * MIX_TOTAL;
    for (const entry of MIX) {
        r -= entry.weight;
        if (r < 0) return entry.op;
    }
    return MIX[MIX.length - 1].op;
}

export function throughput(data) {
    const op = weightedOp();
    const res = call('load', op, KEYS.load, data);
    const ok = res.status >= 200 && res.status < 400;
    unexpectedStatus.add(!ok, { role: 'load', op });
    check(res, { [`load ${op} 2xx`]: () => ok });
}

export function noisyFlood(data) {
    const op = Math.random() < 0.5 ? 'create' : 'update';
    const res = call('noisy', op, KEYS.noisy, data, { responseCallback: OK_OR_THROTTLED });
    noisyRequests.add(1);
    const throttled = res.status === 429;
    noisyThrottled.add(throttled ? 1 : 0, { op });
    if (throttled) {
        const hasRetryAfter = Boolean(res.headers['Retry-After']);
        const hasRateHeaders = Boolean(res.headers['X-Ratelimit-Limit']) && res.headers['X-Ratelimit-Remaining'] !== undefined;
        noisyMissingRetryAfter.add(hasRetryAfter ? 0 : 1);
        noisyMissingRateHeaders.add(hasRateHeaders ? 0 : 1);
        check(res, {
            'noisy 429 carries Retry-After': () => hasRetryAfter,
            'noisy 429 carries X-RateLimit-*': () => hasRateHeaders,
        });
    } else {
        noisyMissingRetryAfter.add(0);
    }
    unexpectedStatus.add(!(throttled || (res.status >= 200 && res.status < 400)), { role: 'noisy', op });
}

export function victim(data) {
    // Rotate by the scenario-wide iteration number, not a per-VU counter: with several
    // VUs each would otherwise start at the first op and the rest would rarely run.
    const op = VICTIM_OPS[exec.scenario.iterationInTest % VICTIM_OPS.length];
    const res = call('victim', op, KEYS.victim, data);
    victimRequests.add(1);
    victimThrottled.add(res.status === 429 ? 1 : 0, { op });
    unexpectedStatus.add(!(res.status >= 200 && res.status < 400), { role: 'victim', op });
    check(res, {
        'victim never throttled': (r) => r.status !== 429,
        'victim 2xx': (r) => r.status >= 200 && r.status < 400,
    });
}

export function publicProbe(data) {
    const res = call('public', 'public', null, data);
    publicRequests.add(1);
    publicThrottled.add(res.status === 429 ? 1 : 0);
    unexpectedStatus.add(!(res.status >= 200 && res.status < 400), { role: 'public', op: 'public' });
    check(res, { 'public console route never throttled': (r) => r.status !== 429 });
}

/* ----------------------------------------------------------------------------
 | Report
 * ------------------------------------------------------------------------- */

export function handleSummary(data) {
    const reports = buildReports(data, {
        cfg: CFG,
        rows: ROWS,
        gates: Object.keys(GATES),
        runThroughput: RUN_THROUGHPUT,
        runNoisy: RUN_NOISY,
        throughputSec: CFG.throughputSec,
        bystanderSec,
        sub,
    });
    const dir = CFG.reportDir;
    return {
        stdout: `\n${reports.markdown}\n`,
        [`${dir}/summary.json`]: JSON.stringify(data, null, 2),
        [`${dir}/report.md`]: reports.markdown,
        [`${dir}/report.html`]: reports.html,
    };
}
