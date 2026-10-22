/*
  Downloads the page at TARGET_URL, removes what stops sites from loading
  elsewhere (CSP meta tags; response headers are never forwarded), and
  serves it as the real page with the auto-clicker panel injected.
  Used by server.js (local) and api/index.js (Vercel).
*/
const fs = require('fs');
const path = require('path');
const { TARGET_URL } = require('../config');

const CLIENT_DIR = path.join(__dirname, '..', 'src', 'client');

function buildInjection() {
  const read = name => fs.readFileSync(path.join(CLIENT_DIR, name), 'utf8');
  const panel = JSON.stringify({ css: read('panel.css'), html: read('panel.html') })
    .replace(/</g, '\\u003c');
  const clicker = read('clicker.js').replace(/<\/script/gi, '<\\/script');
  return '<script>window.__AC_PANEL=' + panel + ';</script><script>' + clicker + '</script>';
}

function transform(html, finalUrl) {
  html = html.replace(/<meta[^>]+http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi, '');
  const base = '<base href="' + finalUrl.replace(/"/g, '&quot;') + '">';
  html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + base) : base + html;
  const inject = buildInjection();
  const i = html.toLowerCase().lastIndexOf('</body>');
  return i >= 0 ? html.slice(0, i) + inject + html.slice(i) : html + inject;
}

module.exports = async function handler(req, res) {
  const p = (req.url || '/').split('?')[0];
  if (p !== '/' && p !== '/api' && p !== '/api/') { res.statusCode = 404; return res.end('Not found'); }
  try {
    const r = await fetch(TARGET_URL, {
      redirect: 'follow',
      headers: {
        'user-agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'accept-language': req.headers['accept-language'] || 'en-US,en;q=0.9'
      }
    });
    const type = r.headers.get('content-type') || '';
    if (!type.includes('html')) {
      res.statusCode = r.status;
      res.setHeader('content-type', type || 'application/octet-stream');
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    const html = transform(await r.text(), r.url);
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(html);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Could not load ' + TARGET_URL + '\n' + err.message);
  }
};
