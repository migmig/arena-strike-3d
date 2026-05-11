/**
 * Cloudflare Pages Function — POST /api/telemetry
 *
 * Receives batched TelemetrySystem payloads (sendBeacon or fetch keepalive).
 * If a D1 binding named `TELEMETRY_DB` is configured in the Pages project,
 * events are inserted into a `telemetry_events` table. Otherwise the payload
 * is logged to the worker console (visible in `wrangler pages deployment tail`).
 *
 * D1 schema (run once):
 *   CREATE TABLE telemetry_events (
 *     id INTEGER PRIMARY KEY AUTOINCREMENT,
 *     session_id TEXT NOT NULL,
 *     event_type TEXT NOT NULL,
 *     payload TEXT NOT NULL,
 *     ts INTEGER NOT NULL,
 *     received_at INTEGER NOT NULL
 *   );
 *   CREATE INDEX idx_telemetry_session ON telemetry_events(session_id);
 *   CREATE INDEX idx_telemetry_type ON telemetry_events(event_type);
 */

interface Env {
  TELEMETRY_DB?: D1Database;
  TELEMETRY_ORIGIN_ALLOW?: string;
}

interface TelemetryPayload {
  sessionId: string;
  events: Array<{ type: string; ts: number; [k: string]: unknown }>;
}

const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENTS = 200;

function corsHeaders(env: Env, requestOrigin: string | null): HeadersInit {
  const allow = env.TELEMETRY_ORIGIN_ALLOW ?? '*';
  const origin = allow === '*' ? '*' : requestOrigin && allow.split(',').map((s) => s.trim()).includes(requestOrigin) ? requestOrigin : allow.split(',')[0] ?? '*';
  return {
    'access-control-allow-origin': origin ?? '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

export const onRequestOptions: PagesFunction<Env> = ({ env, request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(env, request.headers.get('origin')) });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const headers = corsHeaders(env, request.headers.get('origin'));

  const ct = request.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return new Response('unsupported media type', { status: 415, headers });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return new Response('payload too large', { status: 413, headers });
  }

  let parsed: TelemetryPayload;
  try {
    parsed = (await request.json()) as TelemetryPayload;
  } catch {
    return new Response('invalid json', { status: 400, headers });
  }

  if (!parsed || typeof parsed.sessionId !== 'string' || !Array.isArray(parsed.events)) {
    return new Response('invalid payload', { status: 400, headers });
  }
  if (parsed.events.length === 0 || parsed.events.length > MAX_EVENTS) {
    return new Response('invalid event count', { status: 400, headers });
  }

  const receivedAt = Date.now();
  const session = parsed.sessionId.slice(0, 64);

  if (env.TELEMETRY_DB) {
    const stmt = env.TELEMETRY_DB.prepare(
      'INSERT INTO telemetry_events (session_id, event_type, payload, ts, received_at) VALUES (?, ?, ?, ?, ?)',
    );
    const batch = parsed.events.map((e) =>
      stmt.bind(session, String(e.type).slice(0, 32), JSON.stringify(e), Number(e.ts) || receivedAt, receivedAt),
    );
    try {
      await env.TELEMETRY_DB.batch(batch);
    } catch (err) {
      console.error('telemetry: D1 write failed', err);
      return new Response('db error', { status: 500, headers });
    }
  } else {
    console.log(`telemetry session=${session} events=${parsed.events.length}`);
  }

  return new Response(null, { status: 204, headers });
};
