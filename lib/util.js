const GOOGLE = /(^|\.)google\.[a-z.]+$/i;

function isPrivateHost(h) {
  if (process.env.ALLOW_PRIVATE) return false;      // for local testing only
  return h === 'localhost' || /\.(local|internal)$/.test(h) || h === '[::1]' || /^\[(fc|fd|fe80)/i.test(h) ||
    /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
}

function parseHttp(raw) {
  try { const u = new URL(raw); return /^https?:$/.test(u.protocol) ? u : null; } catch (e) { return null; }
}

function param(req, name) { return new URL(req.url, 'http://x').searchParams.get(name); }

// Google only gives scripts-free results pages to old text browsers, so ask like one.
function userAgentFor(u, req) {
  if (GOOGLE.test(u.hostname) && u.pathname === '/search') return 'Lynx/2.8.9rel.1 libwww-FM/2.14 SSL-MM/1.4.1 OpenSSL/1.1.1w';
  return req.headers['user-agent'] || 'Mozilla/5.0';
}

module.exports = { isPrivateHost, parseHttp, param, userAgentFor };
