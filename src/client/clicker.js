/*
  Auto clicker panel. The server injects this into the loaded page,
  after defining window.__AC_PANEL = { css, html } from panel.css / panel.html.
*/
(function () {
  const PANEL = window.__AC_PANEL;
  if (!PANEL) return;
  if (window.__autoClicker) return;
  window.__autoClicker = true;

  const UNIT_MS = { ns:1e-6, us:1e-3, ms:1, s:1e3, min:6e4, h:3.6e6, d:8.64e7, w:6.048e8, mo:2.592e9, y:3.1536e10 };
  const DUR_MS = { s:1e3, min:6e4, h:3.6e6, d:8.64e7, y:3.1536e10 };
  const MAX_BURST = 2000;

  const host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;top:16px;right:16px;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<style>' + PANEL.css + '</style>' + PANEL.html;
  document.documentElement.appendChild(host);

  const $ = id => root.getElementById(id);
  const P = $('p');

  /* helpers */
  function fmtSpan(ms) {
    if (!isFinite(ms)) return '–';
    if (ms < 1e-3) return +(ms * 1e6).toPrecision(3) + ' ns';
    if (ms < 1) return +(ms * 1e3).toPrecision(3) + ' µs';
    if (ms < 1000) return +ms.toPrecision(3) + ' ms';
    const s = ms / 1000; if (s < 60) return +s.toPrecision(3) + ' s';
    const m = s / 60; if (m < 60) return +m.toPrecision(3) + ' min';
    const h = m / 60; if (h < 24) return +h.toPrecision(3) + ' h';
    const d = h / 24; if (d < 365) return +d.toPrecision(3) + ' days';
    return +(d / 365).toPrecision(3) + ' years';
  }
  const fmtNum = n => n >= 1e6 ? n.toExponential(2).replace('e+', 'e') : Math.round(n).toLocaleString();
  const status = (m, k) => { const e = $('st'); e.textContent = m; e.className = 'st' + (k ? ' ' + k : ''); };
  const interval = () => { const n = parseFloat($('rn').value); return n > 0 ? UNIT_MS[$('ru').value] / n : NaN; };
  function rateNote() {
    const iv = interval();
    if (!isFinite(iv)) { $('rnote').textContent = 'Enter a number above zero.'; return; }
    const cps = 1000 / iv;
    let t = 'One click every ' + fmtSpan(iv) + '.';
    if (cps > 250000) t += ' Faster than a browser can run, so it will be capped.';
    $('rnote').textContent = t;
  }

  /* cursor + fixed point */
  let cursor = null, fixed = null, picking = false;
  document.addEventListener('mousemove', e => {
    if (e.composedPath().includes(host)) return;
    cursor = { x: e.clientX, y: e.clientY };
  }, true);
  const mode = () => root.querySelector('input[name=tg]:checked').value;

  $('pick').addEventListener('click', e => {
    e.preventDefault(); picking = true; $('tf').checked = true;
    status('Click anywhere on the page to set the spot.');
  });
  document.addEventListener('click', e => {
    if (!picking || e.composedPath().includes(host)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    picking = false; fixed = { x: e.clientX, y: e.clientY };
    const m = $('mk'); m.style.left = fixed.x + 'px'; m.style.top = fixed.y + 'px'; m.hidden = false;
    status('Spot set at ' + fixed.x + ', ' + fixed.y + '. It follows the window, not the scroll position.');
  }, true);

  /* clicking */
  function deliver(n) {
    const pt = mode() === 'fixed' ? fixed : cursor;
    if (!pt) { status('Move your cursor over the page first, then press the hotkey.', 'w'); return 0; }
    const el = document.elementFromPoint(pt.x, pt.y);
    if (!el || el === host) { status('Nothing to click at that spot. Move the cursor off the panel.', 'w'); return 0; }
    const base = { bubbles: true, cancelable: true, composed: true, view: window, clientX: pt.x, clientY: pt.y, button: 0 };
    const pbase = Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true }, base);
    for (let i = 0; i < n; i++) {
      el.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ buttons: 1 }, pbase)));
      el.dispatchEvent(new MouseEvent('mousedown', Object.assign({ buttons: 1 }, base)));
      el.dispatchEvent(new PointerEvent('pointerup', pbase));
      el.dispatchEvent(new MouseEvent('mouseup', base));
      el.dispatchEvent(new MouseEvent('click', base));
    }
    return n;
  }

  let running = false, timer = null, startAt = 0, endAt = Infinity, nextAt = 0, ivMs = 1000, sent = 0, capped = false;

  function start() {
    const iv = interval();
    if (!isFinite(iv)) return status('Enter a speed above zero.', 'w');
    if (mode() === 'fixed' && !fixed) return status('Pick a spot first.', 'w');
    let dur = Infinity;
    if (!$('fe').checked) {
      const d = parseFloat($('dn').value);
      if (!(d > 0)) return status('Enter a duration above zero, or tick “Keep clicking”.', 'w');
      dur = d * DUR_MS[$('du').value];
    }
    ivMs = iv; sent = 0; capped = false;
    startAt = performance.now(); nextAt = startAt; endAt = startAt + dur;
    running = true; P.classList.add('on'); $('go').textContent = 'Stop clicking';
    $('fs').disabled = true; status('Clicking…');
    tick();
  }
  function stop(msg, kind) {
    if (!running) return;
    running = false; clearTimeout(timer);
    P.classList.remove('on'); $('go').textContent = 'Start clicking';
    $('fs').disabled = false; render(); status(msg || 'Stopped.', kind);
  }
  function tick() {
    if (!running) return;
    const now = performance.now();
    if (now >= endAt) return stop('Done. Sent ' + fmtNum(sent) + ' clicks.');
    if (now >= nextAt) {
      const due = Math.floor((now - nextAt) / ivMs) + 1;
      let n = due;
      if (n > MAX_BURST) { n = MAX_BURST; capped = true; nextAt = now + ivMs; } else nextAt += due * ivMs;
      sent += deliver(n);
    }
    const t = performance.now();
    timer = setTimeout(tick, Math.min(Math.max(nextAt - t, 0), 250, Math.max(endAt - t, 0)));
  }
  const toggle = () => running ? stop() : start();

  function render() {
    $('count').textContent = fmtNum(sent);
    if (!running) return;
    const now = performance.now(), el = now - startAt, cps = el > 0 ? sent / (el / 1000) : 0;
    $('sEl').textContent = fmtSpan(el);
    $('sRate').textContent = cps >= 10 ? Math.round(cps).toLocaleString() : +cps.toPrecision(3);
    $('sNext').textContent = ivMs > 50 ? fmtSpan(Math.max(nextAt - now, 0)) : 'continuous';
    $('sLeft').textContent = isFinite(endAt) ? fmtSpan(Math.max(endAt - now, 0)) : 'no limit';
    if (capped) status('At the browser’s speed limit. You asked for faster than a page can run.', 'w');
  }
  setInterval(render, 100);

  /* hotkey */
  let hotkey = 'F6', listening = false;
  try { hotkey = localStorage.getItem('autoclicker.hotkey') || 'F6'; } catch (e) {}
  const MODS = /^(Shift|Control|Alt|Meta)(Left|Right)$/;
  const comboOf = e => [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Meta', e.code].filter(Boolean).join('+');
  const friendly = c => c.replace(/(^|\+)Key/, '$1').replace(/(^|\+)Digit/, '$1');
  const showKey = () => { $('kshow').textContent = friendly(hotkey); };
  showKey();
  document.addEventListener('keydown', e => {
    if (MODS.test(e.code)) return;
    if (listening) {
      e.preventDefault(); e.stopPropagation();
      listening = false; $('kbtn').classList.remove('l'); $('kbtn').textContent = 'Change';
      if (e.code !== 'Escape') {
        hotkey = comboOf(e); showKey();
        try { localStorage.setItem('autoclicker.hotkey', hotkey); } catch (err) {}
        status('Hotkey set to ' + friendly(hotkey) + '.');
      }
      return;
    }
    if (picking && e.key === 'Escape') { picking = false; status('Cancelled.'); return; }
    const t = e.composedPath()[0];
    const typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if (typing && !(e.ctrlKey || e.altKey || e.metaKey) && !/^F\d+$/.test(e.code)) return;
    if (e.repeat) return;
    if (comboOf(e) === hotkey) { e.preventDefault(); e.stopPropagation(); toggle(); }
  }, true);
  $('kbtn').addEventListener('click', () => { listening = true; $('kbtn').classList.add('l'); $('kbtn').textContent = 'Press a key…'; });

  /* navigation: keep every page, link and search inside the proxy */
  // location.origin is ours; plain '/b' would resolve against the site's <base href>.
  const go = abs => location.assign(location.origin + '/b?u=' + encodeURIComponent(abs));
  let engineKey = PANEL.defaultEngine;
  try { engineKey = localStorage.getItem('ac.engine') || engineKey; } catch (e) {}
  if (!PANEL.engines[engineKey]) engineKey = PANEL.defaultEngine;
  const navigate = text => { const u = window.acResolve && window.acResolve(text, engineKey, PANEL.engines); if (u) go(u); };

  $('nav').value = document.baseURI;
  $('navgo').addEventListener('click', () => navigate($('nav').value));
  $('nav').addEventListener('keydown', e => { if (e.key === 'Enter') navigate($('nav').value); });
  ['keydown', 'keyup', 'keypress'].forEach(t => $('nav').addEventListener(t, e => e.stopPropagation()));
  $('home').addEventListener('click', () => location.assign(location.origin + '/'));

  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.composedPath().includes(host)) return;
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href],area[href]');
    if (!a) return;
    const href = (a.getAttribute('href') || '').trim();
    if (/^(javascript:|mailto:|tel:|data:|blob:)/i.test(href)) return;
    e.preventDefault();
    if (href.charAt(0) === '#') {              // in-page link: <base> would otherwise send us to the real site
      const id = decodeURIComponent(href.slice(1));
      const el = id && (document.getElementById(id) || document.getElementsByName(id)[0]);
      if (el) el.scrollIntoView(); else if (!id) window.scrollTo(0, 0);
      return;
    }
    try {
      let u = new URL(href, document.baseURI);
      if (/(^|\.)google\.[a-z.]+$/i.test(u.hostname) && u.pathname === '/url') {   // unwrap Google result links
        const q = u.searchParams.get('q') || u.searchParams.get('url');
        if (q) u = new URL(q, document.baseURI);
      }
      if (/^https?:$/.test(u.protocol)) go(u.href);
    } catch (err) {}
  });
  document.addEventListener('submit', e => {
    const f = e.target;
    if (e.defaultPrevented || !f || f.tagName !== 'FORM' || (f.getAttribute('method') || 'get').toLowerCase() !== 'get') return;
    e.preventDefault();
    try {
      const u = new URL(f.getAttribute('action') || '', document.baseURI);
      u.search = new URLSearchParams(new FormData(f)).toString();
      go(u.href);
    } catch (err) {}
  });

  /* ui wiring */
  $('go').addEventListener('click', toggle);
  $('rn').addEventListener('input', rateNote);
  $('ru').addEventListener('change', rateNote);
  $('chips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b || running) return;
    $('rn').value = b.dataset.n; $('ru').value = b.dataset.u; rateNote();
  });
  $('fe').addEventListener('change', () => { $('dn').disabled = $('du').disabled = $('fe').checked; });
  $('min').addEventListener('click', e => { e.stopPropagation(); const b = $('bd'); b.hidden = !b.hidden; $('min').textContent = b.hidden ? '+' : '–'; });
  rateNote();

  /* drag the panel by its header */
  $('hd').addEventListener('mousedown', e => {
    if (e.target.id === 'min') return;
    const r = host.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    const mv = ev => { host.style.left = Math.max(0, ev.clientX - dx) + 'px'; host.style.top = Math.max(0, ev.clientY - dy) + 'px'; host.style.right = 'auto'; };
    const up = () => { document.removeEventListener('mousemove', mv, true); document.removeEventListener('mouseup', up, true); };
    document.addEventListener('mousemove', mv, true); document.addEventListener('mouseup', up, true);
    e.preventDefault();
  });
})();
