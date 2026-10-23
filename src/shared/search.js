// Turns whatever you typed into a URL: a real address stays one, anything else becomes a search.
function acResolve(input, engineKey, engines) {
  input = (input || '').trim();
  if (!input) return null;
  let u = null;
  if (/^https?:\/\//i.test(input)) u = input;
  else if (!/\s/.test(input) &&
    (/^localhost(:\d+)?([\/?#]|$)/i.test(input) || /^[\w-]+(\.[\w-]+)*\.[a-z]{2,}(:\d+)?([\/?#].*)?$/i.test(input))) u = 'https://' + input;
  if (u) { try { new URL(u); return u; } catch (e) { /* fall through to search */ } }
  const keys = Object.keys(engines);
  const e = engines[engineKey] || engines[keys[0]];
  return e.url.replace('{q}', encodeURIComponent(input));
}
