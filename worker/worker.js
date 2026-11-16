/* Find Your Impact: sign-up Worker (Cloudflare).

   What it does
   - POST /lead     saves one sign-up in the D1 database and emails it to LEAD_TO.
   - GET  /         a setup check: says what is connected (never shows addresses or keys).
   - Every day (Cron Trigger) it emails a CSV of any sign-up whose email did not go out,
     for example because the daily email limit was reached.

   Settings (Worker → Settings → Variables and Secrets / Bindings). Nothing private lives in this file.
   - DB               D1 binding to the "impact-fair" database (required)
   - LEAD_TO          the inbox that receives the sign-ups (plain-text variable, required)
   - ALLOWED_ORIGINS  comma-separated site addresses allowed to send sign-ups,
                      e.g. https://debruynbrycedbb.github.io,http://localhost:8767 (required)
   - RESEND_API_KEY   secret: send through Resend (way A, no domain needed)
   - EMAIL + MAIL_FROM  send_email binding + sender address on a domain set up in Cloudflare
                      Email Service (way B). Used instead of Resend when both are set.
   - EMAIL_DAILY_CAP  optional number, default 90 (Resend's free plan allows 100 a day)
*/

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FIELDS = {
  name: 120, email: 200, school: 160, study_year: 40, phone: 40,
  study: 80, destination: 80, priorities: 300, learns_by: 60, start: 20,
  match: 80, second_match: 80, print_no: 20, source: 10
};
const LABELS = [
  ['name', 'Name'], ['email', 'Email'], ['phone', 'WhatsApp'], ['school', 'School'], ['study_year', 'Study year'],
  ['match', 'Match'], ['destination', 'Destination'], ['second_match', 'Second match'],
  ['study', 'Studies'], ['people_nature', 'People ↔ nature (0–100)'], ['learns_by', 'Works best by'],
  ['priorities', 'Priorities'], ['months', 'Months'], ['start', 'Could leave'],
  ['marketing', 'Wants news'], ['print_no', 'Print'], ['source', 'Played on'], ['created_at', 'Signed up']
];
const CSV_COLS = ['created_at', 'name', 'email', 'phone', 'school', 'study_year', 'match', 'destination', 'second_match',
  'study', 'people_nature', 'learns_by', 'priorities', 'months', 'start', 'marketing', 'print_no', 'source'];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);

    if (req.method === 'OPTIONS') return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });

    if (req.method === 'GET' && url.pathname === '/') {
      let table = false;
      try { table = !!(await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='fair_leads'").first('name')); } catch { /* no DB */ }
      return json({
        ok: true,
        database: !!env.DB,
        table,
        inbox_set: EMAIL_RE.test(env.LEAD_TO || '') || 'LEAD_TO is not an email address',
        sends_with: mailer(env) || 'nothing yet: add RESEND_API_KEY, or EMAIL + MAIL_FROM',
        allowed_sites: (env.ALLOWED_ORIGINS || '').split(',').filter(Boolean).length
      });
    }

    if (req.method === 'POST' && url.pathname === '/lead') {
      if (!cors) return json({ ok: false, error: 'This site is not allowed to send sign-ups.' }, 403);
      try {
        return json(await saveLead(req, env), 200, cors);
      } catch (e) {
        const status = e.status || 500;
        if (status === 500) console.error(e);
        return json({ ok: false, error: status === 500 ? 'Server error' : e.message }, status, cors);
      }
    }

    return json({ ok: false, error: 'Not found' }, 404, cors || {});
  },

  /* Daily catch-up: one email with a CSV of every sign-up that was saved but not emailed. */
  async scheduled(_event, env) {
    const { results } = await env.DB.prepare('SELECT * FROM fair_leads WHERE emailed = 0 ORDER BY received_at').all();
    if (!results.length || !mailer(env)) return;
    const csv = [CSV_COLS.join(','), ...results.map(r => CSV_COLS.map(c => csvCell(r[c])).join(','))].join('\n');
    await send(env, {
      subject: `Find Your Impact: ${results.length} sign-up${results.length === 1 ? '' : 's'} not emailed yet`,
      text: `These sign-ups were saved but their email did not go out (usually the daily email limit). They are all in the attached CSV.`,
      html: `<p>These sign-ups were saved but their email did not go out (usually the daily email limit). They are all in the attached CSV.</p>`,
      attachment: { filename: `sign-ups-${new Date().toISOString().slice(0, 10)}.csv`, content: btoa(unescape(encodeURIComponent(csv))) }
    });
    const ids = results.map(r => r.id);
    await env.DB.batch(ids.map(id => env.DB.prepare('UPDATE fair_leads SET emailed = 1 WHERE id = ?').bind(id)));
  }
};

/* ---------- saving a sign-up ---------- */
async function saveLead(req, env) {
  if (Number(req.headers.get('content-length') || 0) > 8000) throw err(413, 'Too large');
  let b;
  try { b = await req.json(); } catch { throw err(400, 'Invalid data'); }
  if (b.website) return { ok: true }; // hidden "website" field: only bots fill it in

  const lead = {};
  for (const [k, max] of Object.entries(FIELDS)) lead[k] = String(b[k] ?? '').trim().slice(0, max);
  lead.id = /^[\w-]{6,64}$/.test(b.id || '') ? b.id : crypto.randomUUID();
  lead.created_at = isNaN(Date.parse(b.created_at)) ? new Date().toISOString() : new Date(b.created_at).toISOString();
  lead.people_nature = clampInt(b.people_nature, 0, 100);
  lead.months = clampInt(b.months, 1, 24);
  lead.consent = b.consent === true ? 1 : 0;
  lead.marketing = b.marketing === true ? 1 : 0;

  if (lead.name.length < 2) throw err(400, 'Name missing');
  if (!EMAIL_RE.test(lead.email)) throw err(400, 'Email not valid');
  if (lead.school.length < 2) throw err(400, 'School missing');
  if (!lead.consent) throw err(400, 'Consent missing');

  // Light flood protection. A busy stand shares one Wi-Fi address, so the limit is generous.
  const ip = req.headers.get('cf-connecting-ip') || '';
  lead.ip_hash = await sha256(ip + '|' + new Date().toISOString().slice(0, 10));
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM fair_leads WHERE ip_hash = ? AND received_at > ?').bind(lead.ip_hash, since).first('n');
  if (recent >= 60) throw err(429, 'Too many sign-ups, try again in a few minutes');

  lead.received_at = new Date().toISOString();
  const cols = ['id', 'created_at', 'received_at', 'name', 'email', 'school', 'study_year', 'phone', 'consent', 'marketing', 'study',
    'people_nature', 'destination', 'priorities', 'learns_by', 'months', 'start', 'match', 'second_match', 'print_no', 'source', 'ip_hash'];
  const ins = await env.DB.prepare(`INSERT OR IGNORE INTO fair_leads (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
    .bind(...cols.map(c => lead[c] ?? null)).run();
  if (!ins.meta.changes) return { ok: true, duplicate: true }; // already saved (the device retried)

  // Email it, unless today's cap is reached; the daily catch-up sends anything left over.
  let emailed = false;
  if (mailer(env)) {
    const cap = Number(env.EMAIL_DAILY_CAP) || 90;
    const today = new Date().toISOString().slice(0, 10);
    const sent = await env.DB.prepare('SELECT COUNT(*) AS n FROM fair_leads WHERE emailed = 1 AND received_at >= ?').bind(today).first('n');
    if (sent < cap) {
      try {
        await send(env, leadEmail(lead));
        await env.DB.prepare('UPDATE fair_leads SET emailed = 1 WHERE id = ?').bind(lead.id).run();
        emailed = true;
      } catch (e) { console.error('email failed', e); }
    }
  }
  return { ok: true, emailed };
}

/* ---------- the email ---------- */
function leadEmail(l) {
  const val = k => k === 'marketing' ? (l[k] ? 'Yes' : 'No') : k === 'source' ? (l[k] === 'kiosk' ? 'Stand screen' : 'Own phone') : l[k];
  const rows = LABELS.filter(([k]) => val(k) !== '' && val(k) != null);
  return {
    subject: `New sign-up: ${l.name} · ${l.match || 'no match'}${l.destination ? ` (${l.destination})` : ''}`,
    replyTo: l.email,
    text: rows.map(([k, label]) => `${label}: ${val(k)}`).join('\n') + '\n\nReply to this email to answer the student directly.',
    html: `<div style="font-family:Arial,sans-serif;color:#121a30">
      <h2 style="margin:0 0 4px">${esc(l.name)}</h2>
      <p style="margin:0 0 16px;color:#f2712a">${esc(l.match)}${l.destination ? ` · ${esc(l.destination)}` : ''}</p>
      <table style="border-collapse:collapse;font-size:14px">${rows.map(([k, label]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#3a4a6b;vertical-align:top">${esc(label)}</td><td style="padding:4px 0">${esc(val(k))}</td></tr>`).join('')}
      </table>
      <p style="margin-top:16px;font-size:13px;color:#3a4a6b">Reply to this email to answer the student directly.</p></div>`
  };
}

function mailer(env) {
  if (!EMAIL_RE.test(env.LEAD_TO || '')) return null;
  if (env.EMAIL && env.MAIL_FROM) return 'cloudflare';
  if (env.RESEND_API_KEY) return 'resend';
  return null;
}

async function send(env, m) {
  if (mailer(env) === 'cloudflare') {
    return env.EMAIL.send({
      to: env.LEAD_TO, from: { email: env.MAIL_FROM, name: 'Find Your Impact' },
      subject: m.subject, text: m.text, html: m.html, ...(m.replyTo ? { replyTo: m.replyTo } : {}),
      ...(m.attachment ? { attachments: [{ ...m.attachment, type: 'text/csv', disposition: 'attachment' }] } : {})
    });
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Find Your Impact <onboarding@resend.dev>', to: [env.LEAD_TO],
      subject: m.subject, text: m.text, html: m.html, ...(m.replyTo ? { reply_to: m.replyTo } : {}),
      ...(m.attachment ? { attachments: [m.attachment] } : {})
    })
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/* ---------- helpers ---------- */
function corsHeaders(req, env) {
  const origin = req.headers.get('origin');
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return null;
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const err = (status, message) => Object.assign(new Error(message), { status });
const clampInt = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"` : s; };
async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
