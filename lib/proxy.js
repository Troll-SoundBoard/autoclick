// /__p?u=<url>&r=<page origin>  fetches one asset (CSS, image, font, script) for the page.
const { rewriteCss } = require('./rewrite');
const { isPrivateHost, parseHttp, param } = require('./util');

const MAX_BYTES = 4000000;   // Vercel functions can't return much more than ~4.5 MB

module.exports = async function proxy(req, res) {
  const fail = (code, msg) => { res.statusCode = code; res.setHeader('content-type', 'text/plain'); res.end(msg); };
  // Only our own pages may use this, so it can't be used as an open proxy from other sites.
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin') return fail(403, 'Forbidden');
  const target = parseHttp(param(req, 'u'));
  if (!target || isPrivateHost(target.hostname)) return fail(400, 'Blocked url');
  const pageOrigin = (parseHttp(param(req, 'r')) || target).origin;
  try {
    const r = await fetch(target.href, {
      redirect: 'follow',
      headers: {
        'user-agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'accept': req.headers['accept'] || '*/*',
        'accept-language': req.headers['accept-language'] || 'en-US,en;q=0.9',
        'referer': pageOrigin + '/'
      }
    });
    if (isPrivateHost(new URL(r.url).hostname)) return fail(400, 'Blocked url');
    const type = r.headers.get('content-type') || 'application/octet-stream';
    let body = Buffer.from(await r.arrayBuffer());
    if (body.length > MAX_BYTES) {              // too big to pass through: let the browser fetch it directly
      res.statusCode = 302; res.setHeader('location', target.href); return res.end();
    }
    if (/text\/css/i.test(type)) body = Buffer.from(rewriteCss(body.toString('utf8'), r.url, pageOrigin), 'utf8');
    res.statusCode = r.status;
    res.setHeader('content-type', type);
    res.setHeader('cache-control', 'public, max-age=3600');
    res.end(body);
  } catch (err) { fail(502, 'Could not load ' + target.href); }
};
