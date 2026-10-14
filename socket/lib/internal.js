'use strict';

/**
 * The internal HTTP listener (SOCKETCLUSTER_INTERNAL_PORT, default 8001). Only the API
 * talks to it, and it must never be published outside the private network.
 *
 *   POST /publish  signed with the publish key
 *        body {"channels": ["order.x", "company.y"], "data": {...}}
 *          or {"channel": "order.x", "data": {...}}
 *        202 {"published": n} | 400 bad body | 401 bad signature | 413 body over 2 MB
 *   GET  /stats    signed with the publish key (empty body) -> counters JSON
 */

const { verifyRequest } = require('./signing');
const { isValidChannel } = require('./rules');
const { describeError } = require('./logger');

const MAX_BODY_BYTES = 2 * 1024 * 1024;

function sendJson(res, status, payload, extraHeaders = {}) {
    if (res.headersSent) {
        return;
    }
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store',
        ...extraHeaders,
    });
    res.end(body);
}

/**
 * Reads the request body up to `limit` bytes.
 *
 * @returns {Promise<{ ok: true, body: Buffer } | { ok: false, status: number }>}
 */
function readBody(req, limit) {
    return new Promise((resolve) => {
        const declared = Number(req.headers['content-length']);
        if (Number.isFinite(declared) && declared > limit) {
            resolve({ ok: false, status: 413 });
            return;
        }
        const chunks = [];
        let size = 0;
        let done = false;
        const finish = (result) => {
            if (!done) {
                done = true;
                resolve(result);
            }
        };
        req.on('data', (chunk) => {
            if (done) {
                return;
            }
            size += chunk.length;
            if (size > limit) {
                finish({ ok: false, status: 413 });
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => finish({ ok: true, body: Buffer.concat(chunks) }));
        req.on('error', () => finish({ ok: false, status: 400 }));
        req.on('aborted', () => finish({ ok: false, status: 400 }));
    });
}

/**
 * Parses and validates a publish body.
 *
 * @returns {{ ok: true, channels: string[], data: any } | { ok: false, error: string }}
 */
function parsePublishBody(raw) {
    let body;
    try {
        body = JSON.parse(raw.toString('utf8'));
    } catch (error) {
        return { ok: false, error: 'invalid_json' };
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        return { ok: false, error: 'invalid_body' };
    }

    let channels;
    if (body.channels !== undefined) {
        if (!Array.isArray(body.channels)) {
            return { ok: false, error: 'invalid_channels' };
        }
        channels = body.channels;
    } else if (body.channel !== undefined) {
        channels = [body.channel];
    } else {
        return { ok: false, error: 'missing_channels' };
    }

    if (channels.length === 0) {
        return { ok: false, error: 'missing_channels' };
    }
    if (!channels.every(isValidChannel)) {
        return { ok: false, error: 'invalid_channel' };
    }

    return {
        ok: true,
        channels: [...new Set(channels)],
        data: body.data === undefined ? null : body.data,
    };
}

/**
 * @param {object} options
 * @param {object} options.config
 * @param {object} options.agServer
 * @param {string|null} options.publishKey null when auth is disabled
 * @param {import('./stats').Stats} options.stats
 * @param {object} options.logger
 * @param {() => object} options.gauges live values merged into /stats
 */
function createInternalHandler({ agServer, publishKey, stats, logger, gauges = () => ({}) }) {
    async function authenticate(req, res) {
        const read = await readBody(req, MAX_BODY_BYTES);
        if (!read.ok) {
            if (read.status === 413) {
                stats.increment('publish_too_large');
                sendJson(res, 413, { error: 'payload_too_large' }, { Connection: 'close' });
            } else {
                sendJson(res, 400, { error: 'bad_request' }, { Connection: 'close' });
            }
            return null;
        }
        if (!publishKey) {
            sendJson(res, 503, { error: 'auth_disabled' });
            return null;
        }
        const verdict = verifyRequest(publishKey, {
            timestamp: req.headers['x-fleetbase-timestamp'],
            signature: req.headers['x-fleetbase-signature'],
            rawBody: read.body,
        });
        if (!verdict.ok) {
            stats.increment('internal_unauthorized');
            logger.warn({ event: 'socket_internal_unauthorized', path: req.url.split('?')[0], reason: verdict.reason });
            sendJson(res, 401, { error: 'invalid_signature' });
            return null;
        }
        return read.body;
    }

    async function handlePublish(req, res) {
        const raw = await authenticate(req, res);
        if (raw === null) {
            return;
        }
        const parsed = parsePublishBody(raw);
        if (!parsed.ok) {
            stats.increment('publish_rejected');
            sendJson(res, 400, { error: parsed.error });
            return;
        }
        try {
            await Promise.all(parsed.channels.map((channel) => agServer.exchange.transmitPublish(channel, parsed.data)));
        } catch (error) {
            stats.increment('publish_failed');
            logger.error({ event: 'socket_publish_failed', error: describeError(error) });
            sendJson(res, 500, { error: 'publish_failed' });
            return;
        }
        stats.increment('publish_requests');
        stats.increment('published_channels', parsed.channels.length);
        sendJson(res, 202, { published: parsed.channels.length });
    }

    async function handleStats(req, res) {
        const raw = await authenticate(req, res);
        if (raw === null) {
            return;
        }
        sendJson(res, 200, stats.snapshot(gauges()));
    }

    return function internalHandler(req, res) {
        const path = (req.url || '/').split('?')[0];
        let handler = null;
        if (path === '/publish') {
            handler = req.method === 'POST' ? handlePublish : null;
        } else if (path === '/stats') {
            handler = req.method === 'GET' ? handleStats : null;
        } else {
            req.resume();
            sendJson(res, 404, { error: 'not_found' });
            return;
        }
        if (!handler) {
            req.resume();
            sendJson(res, 405, { error: 'method_not_allowed' });
            return;
        }
        handler(req, res).catch((error) => {
            logger.error({ event: 'socket_internal_error', path, error: describeError(error) });
            sendJson(res, 500, { error: 'internal_error' });
        });
    };
}

module.exports = {
    MAX_BODY_BYTES,
    createInternalHandler,
    parsePublishBody,
    readBody,
};
