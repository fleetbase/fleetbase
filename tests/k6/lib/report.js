// tests/k6/lib/report.js
//
// Turns k6's handleSummary() data into a Markdown and a self-contained HTML report.
// No remote imports: everything here is plain JavaScript that runs inside k6's goja VM.

const ROLE_LABEL = {
    load: 'Throughput (LOAD key, unthrottled)',
    noisy: 'Noisy tenant (NOISY key, normal limit)',
    victim: 'Victim tenant (VICTIM key, different org)',
    public: 'Anonymous console route',
};

function metric(data, name) {
    return (data.metrics && data.metrics[name]) || null;
}

function value(data, name, field, fallback) {
    const m = metric(data, name);
    if (!m || !m.values || m.values[field] === undefined || m.values[field] === null) {
        return fallback === undefined ? null : fallback;
    }
    return m.values[field];
}

function ms(v) {
    if (v === null || v === undefined || Number.isNaN(v)) return '–';
    if (v >= 1000) return `${(v / 1000).toFixed(2)} s`;
    if (v >= 100) return `${Math.round(v)} ms`;
    return `${v.toFixed(1)} ms`;
}

function pct(v) {
    if (v === null || v === undefined || Number.isNaN(v)) return '–';
    if (v === 0) return '0%';
    if (v < 0.001) return '<0.1%';
    return `${(v * 100).toFixed(v < 0.1 ? 2 : 1)}%`;
}

function int(v) {
    if (v === null || v === undefined) return '–';
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fixed(v, digits) {
    if (v === null || v === undefined || Number.isNaN(v)) return '–';
    return v.toFixed(digits);
}

function esc(s) {
    return String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function mdCell(s) {
    // Backslashes first, so an escaped pipe cannot be un-escaped by the input.
    return String(s).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

function stats(data, sub, tags, durationSec) {
    const count = value(data, sub('http_reqs', tags), 'count', 0);
    const duration = sub('http_req_duration', tags);
    const lat = (stat) => (count ? value(data, duration, stat) : null);
    return {
        count,
        rps: durationSec ? count / durationSec : null,
        avg: lat('avg'),
        p50: lat('p(50)'),
        p90: lat('p(90)'),
        p95: lat('p(95)'),
        p99: lat('p(99)'),
        max: lat('max'),
        errorRate: count ? value(data, sub('http_req_failed', tags), 'rate', 0) : null,
    };
}

function change(current, previous) {
    if (current === null || current === undefined || !previous) return null;
    return (current - previous) / previous;
}

// The throughput phase: overall, reads vs writes, and every catalogue endpoint.
function performance(data, ctx) {
    if (!ctx.runThroughput) return null;
    const { cfg, sub } = ctx;
    const sec = ctx.throughputSec;
    const setup = data.setup_data || {};
    const baseline = ctx.baseline && Array.isArray(ctx.baseline.endpoints) ? ctx.baseline : null;
    const baselineByEndpoint = {};
    (baseline ? baseline.endpoints : []).forEach((row) => (baselineByEndpoint[row.endpoint] = row));
    const budget = (kind) => (kind === 'read' ? cfg.readP95 : cfg.writeP95);

    const endpoints = (ctx.loadRows || [])
        .map((row) => {
            const st = stats(data, sub, { role: 'load', endpoint: row.endpoint }, sec);
            const prev = baselineByEndpoint[row.endpoint];
            return Object.assign({ op: row.op, kind: row.kind, endpoint: row.endpoint }, st, {
                skipped: (setup.skipped && setup.skipped[row.op]) || null,
                overBudget: st.p95 !== null && st.p95 > budget(row.kind),
                p95Change: prev ? change(st.p95, prev.p95) : null,
                p99Change: prev ? change(st.p99, prev.p99) : null,
            });
        })
        .sort((a, b) => (b.p95 || -1) - (a.p95 || -1));

    const scope = (label, tags) => {
        const st = stats(data, sub, tags, sec);
        const key = tags.kind || 'overall';
        const prev = baseline && baseline[key];
        return Object.assign({ label, key }, st, {
            baselineP95: prev ? prev.p95 : null,
            p95Change: prev ? change(st.p95, prev.p95) : null,
            p99Change: prev ? change(st.p99, prev.p99) : null,
        });
    };

    return {
        overall: scope('All requests', { role: 'load' }),
        read: scope('Reads', { role: 'load', kind: 'read' }),
        write: scope('Writes', { role: 'load', kind: 'write' }),
        endpoints: endpoints.filter((row) => row.count > 0),
        skipped: endpoints.filter((row) => row.count === 0).map((row) => ({ endpoint: row.endpoint, reason: row.skipped || 'no requests' })),
        baselineVersion: baseline ? baseline.version : null,
        budgets: { read: cfg.readP95, write: cfg.writeP95, enforced: cfg.enforceBudgets },
    };
}

// The latency regression gate: aggregate read and write p95 against the previous release.
// Evaluated here (the baseline is only known at summary time) and handed to the workflow
// as gate.json; k6 thresholds cannot compare against a previous run.
function regressionGate(perf, cfg) {
    const base = { maxRegression: cfg.maxRegression, minRegressionMs: cfg.minRegressionMs };
    if (!perf) return Object.assign(base, { evaluated: false, regressed: false, reason: 'throughput phase did not run', checks: [] });
    if (!perf.baselineVersion) return Object.assign(base, { evaluated: false, regressed: false, reason: 'no previous release metrics to compare against', checks: [] });

    const checks = [perf.read, perf.write]
        .filter((row) => row.count > 0 && row.p95 !== null && row.baselineP95)
        .map((row) => {
            const deltaMs = row.p95 - row.baselineP95;
            return {
                scope: row.label,
                p95: row.p95,
                baselineP95: row.baselineP95,
                change: row.p95Change,
                deltaMs,
                regressed: row.p95Change > cfg.maxRegression && deltaMs > cfg.minRegressionMs,
            };
        });

    return Object.assign(base, {
        evaluated: checks.length > 0,
        regressed: checks.some((check) => check.regressed),
        reason: checks.length ? null : 'no comparable read or write traffic',
        baselineVersion: perf.baselineVersion,
        checks,
    });
}

// Compact per-release metrics: published with the release so the next one can compare.
function metricsDocument(r) {
    const strip = (row) => ({ count: row.count, rps: row.rps, avg: row.avg, p50: row.p50, p90: row.p90, p95: row.p95, p99: row.p99, max: row.max, errorRate: row.errorRate });
    return {
        version: r.meta.version,
        sha: r.meta.sha,
        startedAt: r.meta.startedAt,
        overall: r.perf ? strip(r.perf.overall) : null,
        read: r.perf ? strip(r.perf.read) : null,
        write: r.perf ? strip(r.perf.write) : null,
        endpoints: r.perf ? r.perf.endpoints.map((row) => Object.assign({ endpoint: row.endpoint, kind: row.kind }, strip(row))) : [],
    };
}

function delta(v) {
    if (v === null || v === undefined || Number.isNaN(v)) return '–';
    const sign = v > 0 ? '+' : '';
    const text = `${sign}${(v * 100).toFixed(Math.abs(v) < 0.1 ? 1 : 0)}%`;
    if (v >= 0.2) return `🔺 ${text}`;
    if (v <= -0.2) return `🟢 ${text}`;
    return text;
}

// Collect everything both renderers need, once.
function collect(data, ctx) {
    const { cfg, rows, gates, sub } = ctx;
    const activeSec = { load: ctx.throughputSec, noisy: cfg.noisySec, victim: ctx.bystanderSec, public: ctx.bystanderSec };

    const endpointRows = rows.map((row) => {
        const tags = { role: row.role, endpoint: row.endpoint };
        const count = value(data, sub('http_reqs', tags), 'count', 0);
        const lat = (stat) => (count ? value(data, sub('http_req_duration', tags), stat) : null);
        return {
            role: row.role,
            op: row.op,
            endpoint: row.endpoint,
            count,
            rps: activeSec[row.role] ? count / activeSec[row.role] : null,
            p50: lat('p(50)'),
            p95: lat('p(95)'),
            p99: lat('p(99)'),
            max: lat('max'),
            throttled: row.role === 'noisy' ? value(data, sub('noisy_throttled', { op: row.op }), 'count', 0) : null,
            errorRate: count ? value(data, sub('http_req_failed', tags), 'rate', 0) : null,
        };
    });

    const thresholdRows = [];
    gates.forEach((name) => {
        const m = metric(data, name);
        const results = (m && m.thresholds) || {};
        const exprs = Object.keys(results);
        if (!exprs.length) {
            thresholdRows.push({ name, expr: '(no data)', ok: false, observed: '–' });
        }
        exprs.forEach((expr) => {
            thresholdRows.push({ name, expr, ok: results[expr].ok !== false, observed: observed(m, expr) });
        });
    });

    const iso = ctx.runNoisy
        ? {
              noisyRequests: value(data, 'noisy_requests', 'count', 0),
              noisyThrottled: value(data, 'noisy_throttled', 'count', 0),
              missingRetryAfter: value(data, 'noisy_429_missing_retry_after', 'count', 0),
              missingRateHeaders: value(data, 'noisy_429_missing_ratelimit_headers', 'count', 0),
              victimRequests: value(data, 'victim_requests', 'count', 0),
              victimThrottled: value(data, 'victim_throttled', 'count', 0),
              publicRequests: value(data, 'public_probe_requests', 'count', 0),
              publicThrottled: value(data, 'public_probe_throttled', 'count', 0),
          }
        : null;
    if (iso) {
        iso.limiterEngaged = iso.noisyThrottled > 0 && iso.missingRetryAfter === 0;
        iso.victimIsolated = iso.victimRequests > 0 && iso.victimThrottled === 0;
        iso.publicIsolated = iso.publicRequests > 0 && iso.publicThrottled === 0;
        iso.pass = iso.limiterEngaged && iso.victimIsolated && iso.publicIsolated;
    }

    const setup = data.setup_data || {};
    const checks = metric(data, 'checks');

    const perf = performance(data, ctx);

    return {
        perf,
        gate: regressionGate(perf, cfg),
        meta: {
            version: cfg.version,
            sha: cfg.sha,
            shortSha: cfg.sha ? cfg.sha.slice(0, 12) : '',
            ref: cfg.ref,
            runUrl: cfg.runUrl,
            baseUrl: cfg.baseUrl,
            startedAt: setup.startedAt || '',
            setupCompleted: Boolean(data.setup_data),
            durationSec: data.state && data.state.testRunDurationMs ? data.state.testRunDurationMs / 1000 : null,
            // What the limiter actually advertised to the NOISY key beats what the mint predicted.
            rateLimit: (setup.throttle && setup.throttle.noisyLimit) || cfg.rateLimit || '',
            throttleActive: setup.throttle ? setup.throttle.active : undefined,
            loadBypassed: setup.throttle ? setup.throttle.loadBypassed : undefined,
        },
        config: configRows(ctx),
        endpointRows,
        thresholdRows,
        allPass: thresholdRows.every((t) => t.ok),
        iso,
        totals: {
            requests: value(data, 'http_reqs', 'count', 0),
            failed: value(data, 'http_req_failed', 'rate', 0),
            dropped: value(data, 'dropped_iterations', 'count', 0),
            checksPass: checks ? checks.values.passes : null,
            checksFail: checks ? checks.values.fails : null,
        },
    };
}

function observed(m, expr) {
    if (!m || !m.values) return '–';
    const match = /^\s*([a-z]+(?:\(\d+(?:\.\d+)?\))?)/.exec(expr);
    if (!match) return '–';
    const key = match[1];
    const v = m.values[key];
    if (v === undefined) return '–';
    if (m.type === 'trend') return ms(v);
    if (m.type === 'rate') return pct(v);
    return int(v);
}

function configRows(ctx) {
    const { cfg } = ctx;
    const rows = [['Base URL', cfg.baseUrl]];
    if (ctx.runThroughput) {
        rows.push([
            'Throughput',
            cfg.throughputMode === 'rate'
                ? `ramping arrival rate to ${cfg.peakRate} req/s over ${cfg.throughputSec}s (${cfg.throughputVUs}–${cfg.throughputMaxVUs} VUs)`
                : `ramping to ${cfg.peakVUs} concurrent virtual users over ${cfg.throughputSec}s (request rate is what the API sustains)`,
        ]);
        rows.push(['Endpoints', 'weighted catalogue across orders, places, contacts, drivers, vehicles, fleets, vendors, service areas/rates, issues and fuel reports']);
        rows.push(['Latency budget (p95)', `reads < ${cfg.readP95} ms, writes < ${cfg.writeP95} ms`]);
    } else {
        rows.push(['Throughput', 'skipped']);
    }
    if (ctx.runNoisy) {
        rows.push(['Noisy flood', `${cfg.noisyRate} req/s for ${cfg.noisySec}s (create/update)`]);
        rows.push(['Victim', `${cfg.victimRate} req/s for ${ctx.bystanderSec}s, starting ${cfg.noisyWarmupSec}s into the flood`]);
        rows.push(['Public probe', `GET ${cfg.publicProbePath} every ${cfg.publicProbeEverySec}s, anonymous`]);
    } else {
        rows.push(['Noisy neighbour', 'skipped']);
    }
    rows.push(['Max error rate', pct(cfg.maxErrorRate) + ' (expected 429s on the noisy tenant excluded)']);
    return rows;
}

/* ------------------------------------------------------------------------- */

function markdown(r) {
    const out = [];
    const badge = (ok) => (ok ? '✅ PASS' : '❌ FAIL');
    out.push(`# Fleetbase API performance — ${r.meta.version}`);
    out.push('');
    const facts = [];
    if (r.perf) {
        facts.push(`**p95:** ${ms(r.perf.overall.p95)}`);
        facts.push(`**p99:** ${ms(r.perf.overall.p99)}`);
        facts.push(`**Throughput:** ${fixed(r.perf.overall.rps, 1)} req/s`);
        facts.push(`**Errors:** ${pct(r.perf.overall.errorRate)}`);
    }
    facts.push(`**Thresholds:** ${badge(r.allPass)}`);
    if (r.iso) facts.push(`**Rate-limit isolation:** ${badge(r.iso.pass)}`);
    out.push(facts.join(' · '));
    out.push('');
    if (!r.meta.setupCompleted) {
        out.push('> ⚠️ `setup()` did not complete (timed out or aborted), so no scenario traffic was generated. See the k6 log.');
        out.push('');
    }
    const meta = [];
    meta.push(['Release', `\`${r.meta.version}\``]);
    if (r.meta.sha) meta.push(['Commit', `\`${r.meta.shortSha}\``]);
    if (r.meta.ref) meta.push(['Ref', `\`${r.meta.ref}\``]);
    if (r.meta.startedAt) meta.push(['Started', r.meta.startedAt]);
    if (r.meta.durationSec) meta.push(['Duration', `${Math.round(r.meta.durationSec)}s`]);
    if (r.meta.throttleActive === false) meta.push(['Per-key limit', 'throttling inactive for the NOISY key']);
    else if (r.meta.rateLimit) meta.push(['Per-key limit', `${r.meta.rateLimit} req/min`]);
    if (r.meta.runUrl) meta.push(['Run', `[workflow run](${r.meta.runUrl})`]);
    out.push('| | |');
    out.push('|---|---|');
    meta.forEach(([k, v]) => out.push(`| ${k} | ${v} |`));
    out.push('');

    if (r.perf) {
        const p = r.perf;
        const vs = p.baselineVersion ? ` vs ${p.baselineVersion}` : '';
        out.push('## Performance');
        out.push('');
        out.push('| Scope | Requests | req/s | avg | p50 | p90 | p95 | p99 | max | Errors |' + (p.baselineVersion ? ` p95${vs} | p99${vs} |` : ''));
        out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|' + (p.baselineVersion ? '---:|---:|' : ''));
        [p.overall, p.read, p.write].forEach((row) => {
            const cmp = p.baselineVersion ? ` ${delta(row.p95Change)} | ${delta(row.p99Change)} |` : '';
            out.push(`| **${row.label}** | ${int(row.count)} | ${fixed(row.rps, 2)} | ${ms(row.avg)} | ${ms(row.p50)} | ${ms(row.p90)} | ${ms(row.p95)} | ${ms(row.p99)} | ${ms(row.max)} | ${pct(row.errorRate)} |${cmp}`);
        });
        out.push('');
        out.push(`### Endpoints (slowest p95 first)`);
        out.push('');
        out.push('| Endpoint | Requests | req/s | p50 | p90 | p95 | p99 | max | Errors |' + (p.baselineVersion ? ` p95${vs} |` : '') + ' Budget |');
        out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|' + (p.baselineVersion ? '---:|' : '') + '---|');
        p.endpoints.forEach((row) => {
            const cmp = p.baselineVersion ? ` ${delta(row.p95Change)} |` : '';
            out.push(
                `| \`${mdCell(row.endpoint)}\` | ${int(row.count)} | ${fixed(row.rps, 2)} | ${ms(row.p50)} | ${ms(row.p90)} | ${ms(row.p95)} | ${ms(row.p99)} | ${ms(row.max)} | ${pct(row.errorRate)} |${cmp} ${row.overBudget ? '⚠️ over' : '✓'} |`
            );
        });
        out.push('');
        out.push(
            `_Budgets (p95): reads < ${p.budgets.read} ms, writes < ${p.budgets.write} ms — ${p.budgets.enforced ? 'enforced: a breach fails the run' : 'report only'}. ` +
                (p.baselineVersion ? `Changes are against ${p.baselineVersion}; 🔺/🟢 mark a change of 20% or more._` : 'No previous release metrics were available to compare against._')
        );
        out.push('');
        if (p.skipped.length) {
            out.push('**Not measured:** ' + p.skipped.map((row) => `\`${mdCell(row.endpoint)}\` (${row.reason})`).join(', '));
            out.push('');
        }
    }

    if (r.gate) {
        const g = r.gate;
        const limits = `more than ${Math.round(g.maxRegression * 100)}% and more than ${g.minRegressionMs} ms slower p95`;
        if (!g.evaluated) {
            out.push(`### Regression gate — not evaluated`);
            out.push('');
            out.push(`_${g.reason}._`);
        } else {
            out.push(`### Regression gate vs ${g.baselineVersion} — ${g.regressed ? '❌ REGRESSED' : '✅ PASS'}`);
            out.push('');
            out.push('| Scope | p95 | Baseline p95 | Change | Result |');
            out.push('|---|---:|---:|---:|---|');
            g.checks.forEach((c) => out.push(`| ${c.scope} | ${ms(c.p95)} | ${ms(c.baselineP95)} | ${delta(c.change)} (${c.deltaMs >= 0 ? '+' : ''}${ms(c.deltaMs)}) | ${c.regressed ? '❌ regressed' : '✅ ok'} |`));
            out.push('');
            out.push(`_A scope regresses when it is ${limits} than the previous release. On a release PR a regression is re-measured once before it fails the check._`);
        }
        out.push('');
    }

    const sections = [...new Set(r.endpointRows.map((row) => row.role))];
    if (sections.length) {
        out.push('## Rate-limit isolation traffic');
        out.push('');
    }
    sections.forEach((role) => {
        out.push(`### ${ROLE_LABEL[role] || role}`);
        out.push('');
        const noisy = role === 'noisy';
        out.push(`| Endpoint | Requests | req/s | p50 | p95 | p99 | max | Errors |${noisy ? ' 429s |' : ''}`);
        out.push(`|---|---:|---:|---:|---:|---:|---:|---:|${noisy ? '---:|' : ''}`);
        r.endpointRows
            .filter((row) => row.role === role)
            .forEach((row) => {
                const extra = noisy ? ` ${int(row.throttled)} |` : '';
                out.push(
                    `| \`${mdCell(row.endpoint)}\` | ${int(row.count)} | ${fixed(row.rps, 2)} | ${ms(row.p50)} | ${ms(row.p95)} | ${ms(row.p99)} | ${ms(row.max)} | ${pct(row.errorRate)} |${extra}`
                );
            });
        if (role === 'noisy') {
            out.push('');
            out.push('_Noisy errors exclude the expected 429 responses (the 429s column); latencies include them._');
        }
        out.push('');
    });

    if (r.iso) {
        const i = r.iso;
        out.push(`### Isolation result — ${badge(i.pass)}`);
        out.push('');
        out.push('One tenant floods the API far above its per-key limit while a second tenant and an anonymous console visitor keep working. Only the flooding tenant may be throttled.');
        out.push('');
        out.push('| Check | Observed | Result |');
        out.push('|---|---|---|');
        out.push(`| Noisy tenant is throttled | ${int(i.noisyThrottled)} of ${int(i.noisyRequests)} requests got 429 (${pct(i.noisyRequests ? i.noisyThrottled / i.noisyRequests : 0)}) | ${badge(i.noisyThrottled > 0)} |`);
        out.push(`| Every 429 carries \`Retry-After\` | ${int(i.missingRetryAfter)} missing | ${badge(i.missingRetryAfter === 0)} |`);
        out.push(`| Every 429 carries \`X-RateLimit-*\` | ${int(i.missingRateHeaders)} missing | ${i.missingRateHeaders === 0 ? '✅ PASS' : '⚠️ WARN'} |`);
        out.push(`| Victim tenant never throttled | ${int(i.victimThrottled)} × 429 in ${int(i.victimRequests)} requests | ${badge(i.victimIsolated)} |`);
        out.push(`| Anonymous console route never throttled | ${int(i.publicThrottled)} × 429 in ${int(i.publicRequests)} requests | ${badge(i.publicIsolated)} |`);
        out.push('');
    }

    out.push(`## Thresholds — ${badge(r.allPass)}`);
    out.push('');
    out.push('| Metric | Threshold | Observed | Result |');
    out.push('|---|---|---:|---|');
    r.thresholdRows.forEach((t) => out.push(`| \`${mdCell(t.name)}\` | \`${mdCell(t.expr)}\` | ${t.observed} | ${badge(t.ok)} |`));
    out.push('');

    out.push('## Run');
    out.push('');
    out.push('| | |');
    out.push('|---|---|');
    r.config.forEach(([k, v]) => out.push(`| ${k} | ${mdCell(v)} |`));
    out.push(`| Total requests | ${int(r.totals.requests)} (failed ${pct(r.totals.failed)}) |`);
    if (r.totals.dropped) out.push(`| Dropped iterations | ${int(r.totals.dropped)} (the API could not keep up with the arrival rate) |`);
    if (r.totals.checksPass !== null) out.push(`| Checks | ${int(r.totals.checksPass)} passed, ${int(r.totals.checksFail)} failed |`);
    out.push('');
    return out.join('\n');
}

/* ------------------------------------------------------------------------- */

function html(r) {
    const badge = (ok, warn) => `<span class="badge ${ok ? 'pass' : warn ? 'warn' : 'fail'}">${ok ? 'PASS' : warn ? 'WARN' : 'FAIL'}</span>`;
    const parts = [];
    const sections = [...new Set(r.endpointRows.map((row) => row.role))];
    const maxP95 = Math.max(1, ...r.endpointRows.map((row) => row.p95 || 0));

    parts.push(`<header><p class="eyebrow">Fleetbase API performance</p><h1>${esc(r.meta.version)}</h1>`);
    parts.push('<div class="summary">');
    if (r.perf) {
        parts.push(`<div class="tile"><span>p95</span><strong>${ms(r.perf.overall.p95)}</strong></div>`);
        parts.push(`<div class="tile"><span>p99</span><strong>${ms(r.perf.overall.p99)}</strong></div>`);
        parts.push(`<div class="tile"><span>Throughput</span><strong>${fixed(r.perf.overall.rps, 1)} req/s</strong></div>`);
    }
    parts.push(`<div class="tile"><span>Thresholds</span>${badge(r.allPass)}</div>`);
    if (r.iso) parts.push(`<div class="tile"><span>Rate-limit isolation</span>${badge(r.iso.pass)}</div>`);
    parts.push(`<div class="tile"><span>Requests</span><strong>${int(r.totals.requests)}</strong></div>`);
    parts.push(`<div class="tile"><span>Failed</span><strong>${pct(r.totals.failed)}</strong></div>`);
    if (r.meta.throttleActive === false) parts.push('<div class="tile"><span>Per-key limit</span><strong>inactive</strong></div>');
    else if (r.meta.rateLimit) parts.push(`<div class="tile"><span>Per-key limit</span><strong>${esc(r.meta.rateLimit)}/min</strong></div>`);
    parts.push('</div>');
    const meta = [];
    if (r.meta.sha) meta.push(`commit <code>${esc(r.meta.shortSha)}</code>`);
    if (r.meta.ref) meta.push(`ref <code>${esc(r.meta.ref)}</code>`);
    if (r.meta.startedAt) meta.push(esc(r.meta.startedAt));
    if (r.meta.durationSec) meta.push(`${Math.round(r.meta.durationSec)}s`);
    if (r.meta.runUrl) meta.push(`<a href="${esc(r.meta.runUrl)}">workflow run</a>`);
    parts.push(`<p class="meta">${meta.join(' · ')}</p>`);
    if (!r.meta.setupCompleted) parts.push('<p class="alert"><code>setup()</code> did not complete (timed out or aborted), so no scenario traffic was generated. See the k6 log.</p>');
    parts.push('</header>');

    if (r.perf) {
        const p = r.perf;
        const vs = p.baselineVersion ? ` vs ${esc(p.baselineVersion)}` : '';
        const maxP95 = Math.max(1, ...p.endpoints.map((row) => row.p95 || 0));
        parts.push('<section><h2>Performance</h2><div class="scroll"><table>');
        parts.push(`<thead><tr><th>Scope</th><th class="n">Requests</th><th class="n">req/s</th><th class="n">avg</th><th class="n">p50</th><th class="n">p90</th><th class="n">p95</th><th class="n">p99</th><th class="n">max</th><th class="n">Errors</th>${p.baselineVersion ? `<th class="n">p95${vs}</th><th class="n">p99${vs}</th>` : ''}</tr></thead><tbody>`);
        [p.overall, p.read, p.write].forEach((row) => {
            parts.push(
                `<tr><th scope="row">${esc(row.label)}</th><td class="n">${int(row.count)}</td><td class="n">${fixed(row.rps, 2)}</td><td class="n">${ms(row.avg)}</td><td class="n">${ms(row.p50)}</td><td class="n">${ms(row.p90)}</td><td class="n">${ms(row.p95)}</td><td class="n">${ms(row.p99)}</td><td class="n">${ms(row.max)}</td><td class="n">${pct(row.errorRate)}</td>` +
                    (p.baselineVersion ? `<td class="n">${esc(delta(row.p95Change))}</td><td class="n">${esc(delta(row.p99Change))}</td>` : '') +
                    '</tr>'
            );
        });
        parts.push('</tbody></table></div>');
        parts.push('<h3>Endpoints (slowest p95 first)</h3><div class="scroll"><table>');
        parts.push(`<thead><tr><th>Endpoint</th><th class="n">Requests</th><th class="n">req/s</th><th class="n">p50</th><th class="n">p90</th><th class="n">p95</th><th class="n">p99</th><th class="n">max</th><th class="n">Errors</th>${p.baselineVersion ? `<th class="n">p95${vs}</th>` : ''}<th>Budget</th></tr></thead><tbody>`);
        p.endpoints.forEach((row) => {
            const width = row.p95 ? Math.max(2, Math.round((row.p95 / maxP95) * 100)) : 0;
            parts.push(
                `<tr><td><code>${esc(row.endpoint)}</code></td><td class="n">${int(row.count)}</td><td class="n">${fixed(row.rps, 2)}</td><td class="n">${ms(row.p50)}</td><td class="n">${ms(row.p90)}</td>` +
                    `<td class="n bar"><span style="--w:${width}%"></span>${ms(row.p95)}</td><td class="n">${ms(row.p99)}</td><td class="n">${ms(row.max)}</td><td class="n${row.errorRate ? ' bad' : ''}">${pct(row.errorRate)}</td>` +
                    (p.baselineVersion ? `<td class="n">${esc(delta(row.p95Change))}</td>` : '') +
                    `<td>${row.overBudget ? '<span class="badge warn">OVER</span>' : '<span class="badge pass">OK</span>'}</td></tr>`
            );
        });
        parts.push('</tbody></table></div>');
        parts.push(
            `<p class="note">Budgets (p95): reads &lt; ${p.budgets.read} ms, writes &lt; ${p.budgets.write} ms — ${p.budgets.enforced ? 'enforced' : 'report only'}. ` +
                (p.baselineVersion ? `Changes are against ${esc(p.baselineVersion)}.` : 'No previous release metrics were available to compare against.') +
                '</p>'
        );
        if (p.skipped.length) {
            parts.push(`<p class="note">Not measured: ${p.skipped.map((row) => `<code>${esc(row.endpoint)}</code> (${esc(row.reason)})`).join(', ')}</p>`);
        }
        parts.push('</section>');
    }

    sections.forEach((role) => {
        parts.push(`<section><h2>${esc(ROLE_LABEL[role] || role)}</h2><div class="scroll"><table>`);
        const noisy = role === 'noisy';
        parts.push(`<thead><tr><th>Endpoint</th><th class="n">Requests</th><th class="n">req/s</th><th class="n">p50</th><th class="n">p95</th><th class="n">p99</th><th class="n">max</th><th class="n">Errors</th>${noisy ? '<th class="n">429s</th>' : ''}</tr></thead><tbody>`);
        r.endpointRows
            .filter((row) => row.role === role)
            .forEach((row) => {
                const width = row.p95 ? Math.max(2, Math.round((row.p95 / maxP95) * 100)) : 0;
                parts.push(
                    `<tr><td><code>${esc(row.endpoint)}</code></td><td class="n">${int(row.count)}</td><td class="n">${fixed(row.rps, 2)}</td><td class="n">${ms(row.p50)}</td>` +
                        `<td class="n bar"><span style="--w:${width}%"></span>${ms(row.p95)}</td><td class="n">${ms(row.p99)}</td><td class="n">${ms(row.max)}</td>` +
                        `<td class="n${row.errorRate ? ' bad' : ''}">${pct(row.errorRate)}</td>${noisy ? `<td class="n">${int(row.throttled)}</td>` : ''}</tr>`
                );
            });
        parts.push('</tbody></table></div>');
        if (role === 'noisy') parts.push('<p class="note">Noisy errors exclude the expected 429 responses (the 429s column); latencies include them.</p>');
        parts.push('</section>');
    });

    if (r.iso) {
        const i = r.iso;
        parts.push(`<section><h2>Rate-limit isolation ${badge(i.pass)}</h2>`);
        parts.push('<p class="note">One tenant floods the API far above its per-key limit while a second tenant and an anonymous console visitor keep working. Only the flooding tenant may be throttled.</p>');
        parts.push('<div class="scroll"><table><thead><tr><th>Check</th><th>Observed</th><th>Result</th></tr></thead><tbody>');
        const rows = [
            ['Noisy tenant is throttled', `${int(i.noisyThrottled)} of ${int(i.noisyRequests)} requests got 429 (${pct(i.noisyRequests ? i.noisyThrottled / i.noisyRequests : 0)})`, badge(i.noisyThrottled > 0)],
            ['Every 429 carries <code>Retry-After</code>', `${int(i.missingRetryAfter)} missing`, badge(i.missingRetryAfter === 0)],
            ['Every 429 carries <code>X-RateLimit-*</code>', `${int(i.missingRateHeaders)} missing`, badge(i.missingRateHeaders === 0, true)],
            ['Victim tenant never throttled', `${int(i.victimThrottled)} × 429 in ${int(i.victimRequests)} requests`, badge(i.victimIsolated)],
            ['Anonymous console route never throttled', `${int(i.publicThrottled)} × 429 in ${int(i.publicRequests)} requests`, badge(i.publicIsolated)],
        ];
        rows.forEach(([a, b, c]) => parts.push(`<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`));
        parts.push('</tbody></table></div></section>');
    }

    parts.push(`<section><h2>Thresholds ${badge(r.allPass)}</h2><div class="scroll"><table><thead><tr><th>Metric</th><th>Threshold</th><th class="n">Observed</th><th>Result</th></tr></thead><tbody>`);
    r.thresholdRows.forEach((t) => parts.push(`<tr><td><code>${esc(t.name)}</code></td><td><code>${esc(t.expr)}</code></td><td class="n">${esc(t.observed)}</td><td>${badge(t.ok)}</td></tr>`));
    parts.push('</tbody></table></div></section>');

    parts.push('<section><h2>Run</h2><div class="scroll"><table><tbody>');
    r.config.forEach(([k, v]) => parts.push(`<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`));
    if (r.totals.dropped) parts.push(`<tr><th scope="row">Dropped iterations</th><td>${int(r.totals.dropped)} (the API could not keep up with the arrival rate)</td></tr>`);
    if (r.totals.checksPass !== null) parts.push(`<tr><th scope="row">Checks</th><td>${int(r.totals.checksPass)} passed, ${int(r.totals.checksFail)} failed</td></tr>`);
    parts.push('</tbody></table></div></section>');

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>API Performance ${esc(r.meta.version)}</title>
<style>
:root{--bg:#f7f7f5;--card:#fff;--fg:#1b1d21;--muted:#646973;--line:#e3e4e8;--pass:#157347;--pass-bg:#e3f4ea;--fail:#b42318;--fail-bg:#fde8e7;--warn:#8a5a00;--warn-bg:#fdf1d8;--bar:#c9d6f2}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121316;--card:#1b1d21;--fg:#e8e9ec;--muted:#9aa0aa;--line:#2c2f36;--pass:#5fd394;--pass-bg:#15351f;--fail:#ff8a80;--fail-bg:#3d1714;--warn:#ffc861;--warn-bg:#3a2c0b;--bar:#2e3d63}}
:root[data-theme="dark"]{--bg:#121316;--card:#1b1d21;--fg:#e8e9ec;--muted:#9aa0aa;--line:#2c2f36;--pass:#5fd394;--pass-bg:#15351f;--fail:#ff8a80;--fail-bg:#3d1714;--warn:#ffc861;--warn-bg:#3a2c0b;--bar:#2e3d63}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:1040px;margin:0 auto;padding:32px 16px 64px}
header{margin-bottom:24px}.eyebrow{margin:0;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-size:12px}
h1{margin:4px 0 16px;font-size:28px}h3{font-size:14px;margin:18px 0 8px}h2{font-size:17px;margin:0 0 12px;display:flex;gap:10px;align-items:center}
.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.tile span{color:var(--muted);font-size:12px}.tile strong{font-size:18px}
.meta{color:var(--muted);margin:14px 0 0}
section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin-top:16px}
.scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
thead th{color:var(--muted);font-weight:600;font-size:12px}tbody tr:last-child>*{border-bottom:0}
tbody th{color:var(--muted);font-weight:500;width:1%}td.n,th.n{text-align:right}td.bad{color:var(--fail);font-weight:600}
td.bar{position:relative}td.bar span{position:absolute;right:0;top:50%;transform:translateY(-50%);height:60%;width:var(--w);background:var(--bar);border-radius:3px;z-index:-1;opacity:.6}
td.bar{isolation:isolate}
code{font:12.5px ui-monospace,SFMono-Regular,Menlo,monospace}
.badge{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.03em}
.pass{color:var(--pass);background:var(--pass-bg)}.fail{color:var(--fail);background:var(--fail-bg)}.warn{color:var(--warn);background:var(--warn-bg)}
.note{color:var(--muted);margin:8px 0 0;font-size:13px}.alert{margin:14px 0 0;padding:10px 14px;border-radius:8px;color:var(--fail);background:var(--fail-bg)}a{color:inherit}
</style>
</head>
<body><main>
${parts.join('\n')}
</main></body>
</html>
`;
}

export function buildReports(data, ctx) {
    const r = collect(data, ctx);
    return { markdown: markdown(r), html: html(r), metrics: metricsDocument(r), gate: r.gate, result: r };
}
