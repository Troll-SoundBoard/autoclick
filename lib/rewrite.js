// Points a page's CSS, images, scripts and fonts at our own /__p route, so the site's CDN
// sees a normal request from the site itself instead of from a stranger.
const SKIP = /^(data:|blob:|javascript:|about:|#|mailto:|tel:)/i;

function proxied(abs, origin) { return '/__p?u=' + encodeURIComponent(abs) + '&r=' + encodeURIComponent(origin); }

function toProxy(value, base, origin) {
  value = (value || '').replace(/&amp;/g, '&').trim();
  if (!value || SKIP.test(value)) return null;
  try {
    const abs = new URL(value, base).href;
    return /^https?:/i.test(abs) ? proxied(abs, origin) : null;
  } catch (e) { return null; }
}

// url(...) and @import inside CSS text
function rewriteCss(css, base, origin) {
  css = css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (m, q, u) => {
    const p = toProxy(u, base, origin); return p ? 'url("' + p + '")' : m;
  });
  return css.replace(/@import\s+(['"])([^'"]+)\1/gi, (m, q, u) => {
    const p = toProxy(u, base, origin); return p ? '@import "' + p + '"' : m;
  });
}

function rewriteTag(tag, base, origin) {
  const name = (tag.match(/^<(\w+)/) || [])[1].toLowerCase();
  if (name === 'link' && !/rel\s*=\s*["']?[^"'>]*(stylesheet|icon|preload|modulepreload)/i.test(tag)) return tag;
  tag = tag.replace(/\s(integrity|crossorigin|nonce)(\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/gi, '');
  tag = tag.replace(/\s(src|href|poster|data-src)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi, (m, attr, whole, a, b, c) => {
    if (attr.toLowerCase() === 'href' && name !== 'link') return m;
    const p = toProxy(a !== undefined ? a : b !== undefined ? b : c, base, origin);
    return p ? ' ' + attr + '="' + p + '"' : m;
  });
  tag = tag.replace(/\s(srcset|data-srcset)\s*=\s*("([^"]*)"|'([^']*)')/gi, (m, attr, whole, a, b) => {
    const list = (a !== undefined ? a : b).split(',').map(part => {
      const bits = part.trim().split(/\s+/);
      const p = toProxy(bits[0], base, origin);
      return p ? [p].concat(bits.slice(1)).join(' ') : part.trim();
    });
    return ' ' + attr + '="' + list.join(', ') + '"';
  });
  return tag;
}

function rewriteHtml(html, base) {
  const origin = new URL(base).origin;
  html = html.replace(/<(img|source|video|audio|track|script|link)\b[^>]*>/gi, t => rewriteTag(t, base, origin));
  return html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, a, css, c) => a + rewriteCss(css, base, origin) + c);
}

module.exports = { rewriteHtml, rewriteCss };
