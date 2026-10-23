// /b?u=<url>  loads a page as the real thing, with the auto-clicker panel injected.
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { rewriteHtml } = require('./rewrite');
const { isPrivateHost, parseHttp, param, userAgentFor } = require('./util');

const SRC = path.join(__dirname, '..', 'src');
const MAX_BYTES = 4000000;
const read = (...p) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

function buildInjection() {
  const panel = JSON.stringify({
    css: read('client', 'panel.css'), html: read('client', 'panel.html'),
    engines: config.ENGINES, defaultEngine: config.DEFAULT_ENGINE
  }).replace(/</g, '\\u003c');
  const safe = s => s.replace(/<\/script/gi, '<\\/script');
  return '<script>window.__AC_PANEL=' + panel + ';</script>' +
    '<script>' + safe(read('shared', 'search.js')) + '</script>' +
    '<script>' + safe(read('client', 'clicker.js')) + '</script>';
}

function transform(html, finalUrl) {
  html = html.replace(/<meta[^>]+http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi, '');
  html = rewriteHtml(html, finalUrl);
  const base = '<base href="' + finalUrl.replace(/"/g, '&quot;') + '">';
  html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + base) : base + html;
  const inject = buildInjection();
  const i = html.toLowerCase().lastIndexOf('</body>');
  return i >= 0 ? html.slice(0, i) + inject + html.slice(i) : html + inject;
}

module.exports = async function browse(req, res) {
  const target = parseHttp(param(req, 'u'));
  if (!target || isPrivateHost(target.hostname)) {
    res.statusCode = 302; res.setHeader('location', '/'); return res.end();
  }
  try {
    const r = await fetch(target.href, {
      redirect: 'follow',
      headers: {
        'user-agent': userAgentFor(target, req),
        'accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'accept-language': req.headers['accept-language'] || 'en-US,en;q=0.9'
      }
    });
    if (isPrivateHost(new URL(r.url).hostname)) { res.statusCode = 400; return res.end('Blocked url'); }
    const type = r.headers.get('content-type') || '';
    if (!type.includes('html')) {                 // images, PDFs, downloads: pass through
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > MAX_BYTES) { res.statusCode = 302; res.setHeader('location', target.href); return res.end(); }
      res.statusCode = r.status;
      res.setHeader('content-type', type || 'application/octet-stream');
      return res.end(buf);
    }
    const html = transform(await r.text(), r.url);
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(html);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Could not load ' + target.href + '\n' + err.message);
  }
};
