/* Subtitles: style model (persisted), dual-track renderer, and the remote-friendly control rows
   (segmented / swatches / slider) shared by the in-player panel and Settings. */
(function () {
  var el = N.el;
  var S = N.subs = {};

  /* ---------- style model ---------- */
  S.TEXT = [
    { v: '#ffffff', k: 'cWhite' }, { v: '#ffe14d', k: 'cYellow' }, { v: '#8fe6ff', k: 'cCyan' }, { v: '#b5f29a', k: 'cGreen' }
  ];
  S.BG = [
    { v: 'none', k: 'bgNone' }, { v: '#000000', k: 'cBlack' }, { v: '#232833', k: 'cSlate' }, { v: '#0b2346', k: 'cNavy' }, { v: '#3d0f19', k: 'cWine' }
  ];
  var DEF = { size: 48, weight: 600, fontFa: 'vazir', fontEn: 'roboto', shape: 'line', color: '#ffffff', bg: '#000000', bgOp: 60, radius: 14, pos: 80, size2: 85, top: 1 };
  // subtitle fonts. Roboto/Inter/Vazirmatn ship with the app; the others are used when the TV has them
  // (or when their .woff2 is placed in fonts/: IRANYekan.woff2, IRANSansX.woff2), otherwise the next font in the stack takes over.
  S.FONTS_FA = [
    { v: 'vazir', label: 'Vazirmatn', ff: '"VzFD","Vz"' },
    { v: 'estedad', label: 'Estedad', ff: '"SubEstedad","VzFD"' },
    { v: 'sahel', label: 'Sahel', ff: '"SubSahel","VzFD"' },
    { v: 'shabnam', label: 'Shabnam', ff: '"SubShabnam","VzFD"' },
    // commercial fonts: listed only when the TV has them or their file was added to fonts/
    { v: 'yekan', label: 'IRANYekan', ff: '"SubIRANYekan","VzFD","Vz"', test: 'SubIRANYekan', optional: true },
    { v: 'sansx', label: 'IRANSansX', ff: '"SubIRANSansX","VzFD","Vz"', test: 'SubIRANSansX', optional: true }
  ];
  S.FONTS_EN = [
    { v: 'roboto', label: 'Roboto', ff: '"SubRoboto"' },
    { v: 'arial', label: 'Arial', ff: '"SubArimo"' }, // Arimo: free, metric-identical to Arial
    { v: 'inter', label: 'Inter', ff: '"SubInter"' },
    { v: 'helv', label: 'Helvetica Neue', ff: '"Helvetica Neue","SubHelvetica",Helvetica,"SubInter"', local: 'Helvetica Neue', test2: 'SubHelvetica', optional: true }
  ];
  function ffOf(list, v) { for (var i = 0; i < list.length; i++) if (list[i].v === v) return list[i].ff; return list[0].ff; }
  // is a font really there? web fonts: try loading; local ones: compare glyph widths against a fallback
  var okCache = {};
  S.fontOk = function (f, cb) {
    if (!f.test && !f.test2 && !f.local) return cb(true);
    if (okCache[f.v] !== undefined) return cb(okCache[f.v]);
    function localCheck() {
      if (!f.local) return cb(okCache[f.v] = false);
      try {
        var c = document.createElement('canvas').getContext('2d'), t = 'mmmmmmmmlli WQ@#', w = function (ff) { c.font = '40px ' + ff; return c.measureText(t).width; };
        cb(okCache[f.v] = (w('"' + f.local + '",monospace') !== w('monospace') || w('"' + f.local + '",serif') !== w('serif')));
      } catch (e) { cb(okCache[f.v] = false); }
    }
    var web = f.test || f.test2;
    if (!web) return localCheck();
    if (!document.fonts || !document.fonts.load) return cb(okCache[f.v] = false);
    document.fonts.load('40px "' + web + '"', '\u0633\u0644\u0627\u0645 Ag').then(function (l) { if (l && l.length) cb(okCache[f.v] = true); else localCheck(); }, localCheck);
  };
  S.defaults = function () { var o = {}; for (var k in DEF) o[k] = DEF[k]; return o; };
  S.style = function () {
    var s = N.store.get('subStyle', null) || {}, o = S.defaults();
    for (var k in s) if (o.hasOwnProperty(k) && s[k] !== null && s[k] !== undefined) o[k] = s[k];
    // migrate the old single "size" setting (38/46/54) once
    if (!N.store.get('subStyle', null)) { var old = N.store.get('subSize', null); if (old) o.size = old + 2; }
    return o;
  };
  var hosts = [], listeners = [];
  S.set = function (k, v) {
    var s = S.style(); s[k] = v; N.store.set('subStyle', s); S.applyAll();
    for (var i = 0; i < listeners.length; i++) try { listeners[i](k, v); } catch (e) {}
  };
  S.reset = function () { N.store.set('subStyle', S.defaults()); S.applyAll(); for (var i = 0; i < listeners.length; i++) try { listeners[i]('*'); } catch (e) {} };
  S.onChange = function (fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; };
  S.repaintIn = function (box) { var r = box.querySelectorAll('.crow'); for (var i = 0; i < r.length; i++) if (r[i].repaint) r[i].repaint(); };
  function rgba(hex, op) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + (op / 100).toFixed(2) + ')';
  }
  S.apply = function (host) {
    var s = S.style(), st = host.style, noBg = s.bg === 'none' || !s.bgOp;
    st.setProperty('--sub-size', s.size + 'px');
    st.setProperty('--sub-k2', (s.size2 / 100).toFixed(2));
    st.setProperty('--sub-color', s.color);
    st.setProperty('--sub-w', String(s.weight));
    var fa = ffOf(S.FONTS_FA, s.fontFa), en = ffOf(S.FONTS_EN, s.fontEn);
    st.setProperty('--sub-ff-fa', fa + ',' + en + ',sans-serif');
    st.setProperty('--sub-ff-en', en + ',' + fa + ',sans-serif');
    host.classList.toggle('block', s.shape === 'block');
    st.setProperty('--sub-bg', noBg ? 'transparent' : rgba(s.bg, s.bgOp));
    st.setProperty('--sub-r', s.radius + 'px');
    // the text keeps an outline while the box is see-through; a solid box needs none
    st.setProperty('--sub-shadow', noBg || s.bgOp < 45 ? '0 0 3px #000,0 0 6px #000,0 2px 4px #000' : 'none');
    host.classList.toggle('nobg', noBg);
    host._pos = s.pos; host._top = s.top;
    if (host._layout) host._layout();
  };
  S.applyAll = function () { for (var i = 0; i < hosts.length; i++) S.apply(hosts[i]); };

  /* ---------- renderer ----------
     host gets two lines (.sl.s1 / .sl.s2); render(host, t1, t2) only touches the DOM when the text changes. */
  S.host = function (host) {
    host.classList.add('subs'); host.innerHTML = '';
    var l1 = el('div', 'sl s1'), l2 = el('div', 'sl s2'), t1 = el('span', 'st'), t2 = el('span', 'st'), wrap = el('div', 'sw');
    l1.appendChild(t1); l2.appendChild(t2); l1.dir = l2.dir = 'auto'; l1.style.display = l2.style.display = 'none';
    wrap.appendChild(l1); wrap.appendChild(l2); wrap.style.display = 'none'; host.appendChild(wrap); host._w = wrap;
    host._l = [l1, l2]; host._t = [t1, t2]; host._v = ['', ''];
    hosts.push(host); S.apply(host); return host;
  };
  S.render = function (host, a, b) {
    var v = [a || '', b || ''];
    for (var i = 0; i < 2; i++) if (host._v[i] !== v[i]) {
      host._v[i] = v[i]; host._t[i].textContent = v[i]; host._l[i].style.display = v[i] ? '' : 'none';
      host._l[i].classList.toggle('fa', /[\u0600-\u06FF]/.test(v[i])); // Persian lines use the Persian font
    }
    host._w.style.display = v[0] || v[1] ? '' : 'none';
    // which track sits on top
    var top2 = host._top === 2;
    host._l[0].style.order = top2 ? 2 : 1; host._l[1].style.order = top2 ? 1 : 2;
  };

  /* ---------- cue lookup ---------- */
  S.cueAt = function (cs, t) {
    if (!cs || !cs.length) return '';
    var lo = 0, hi = cs.length - 1, idx = -1, out = [];
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (cs[mid].s <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1; }
    // overlapping cues: show every one still on screen, oldest first
    for (var j = idx; j >= 0 && j > idx - 6; j--) if (cs[j].e > t) out.unshift(cs[j].t);
    return out.join('\n');
  };

  /* ---------- control rows (TV remote: Up/Down between rows, Left/Right change the value, OK steps forward) ---------- */
  function row(label, cls) {
    var r = el('div', 'crow f ' + (cls || '')), lb = el('div', 'cl', label), c = el('div', 'cc');
    r.appendChild(lb); r.appendChild(c); r._c = c; return r;
  }
  function idxOf(opts, v) { for (var i = 0; i < opts.length; i++) if (opts[i].v === v) return i; return 0; }
  // seg: opts [{v,label}] ; swatch: opts [{v,color,label}] (v 'none' => crossed chip)
  function choice(kind, label, opts, get, set) {
    var r = row(label, kind), chips = [];
    opts.forEach(function (o) {
      var ch = el('div', 'ch'); ch._o = o;
      if (kind === 'sw') {
        var dot = el('i', 'dot' + (o.v === 'none' ? ' none' : ''));
        if (o.v !== 'none') dot.style.background = o.color || o.v;
        ch.appendChild(dot); if (o.label) { ch.appendChild(el('span', '', o.label)); ch.classList.add('wl'); }
      } else if (o.node) ch.appendChild(o.node); else ch.textContent = o.label;
      if (o.title) ch.title = o.title;
      // pointer (Magic Remote) picks a chip directly
      ch.onclick = function (e) { e.stopPropagation(); if (isDis(o)) return; set(o.v); paint(); };
      r._c.appendChild(ch); chips.push(ch);
    });
    // o.dis(): option unavailable right now (e.g. language already used by the other subtitle) -> shown dimmed, skipped by Left/Right
    function isDis(o) { return !!(o.dis && o.dis()); }
    function paint() { var i = idxOf(opts, get()); for (var k = 0; k < chips.length; k++) { chips[k].classList.toggle('on', k === i); chips[k].classList.toggle('dis', k !== i && isDis(opts[k])); } }
    function step(d) { var i = idxOf(opts, get()) + d; while (i >= 0 && i < opts.length && isDis(opts[i])) i += d; if (i < 0 || i >= opts.length) return; set(opts[i].v); paint(); }
    r.onnav = function (dir) { if (dir === 'left' || dir === 'right') { step(N.ui.step(dir)); return true; } return false; };
    r.onenter = function () { var i0 = idxOf(opts, get()), i = i0; do { i = (i + 1) % opts.length; } while (i !== i0 && isDis(opts[i])); set(opts[i].v); paint(); };
    r.repaint = paint; paint(); return r;
  }
  S.seg = function (label, opts, get, set) { return choice('seg', label, opts, get, set); };
  S.swatch = function (label, opts, get, set) { return choice('sw', label, opts, get, set); };
  // slider: o = {min, max, step, fmt(v)}
  S.slider = function (label, o, get, set) {
    var r = row(label, 'sld'), trk = el('div', 'trk'), fill = el('i', 'fill'), knob = el('i', 'knob'), val = el('div', 'val tab');
    var minus = el('div', 'pm', '−'), plus = el('div', 'pm', '+');
    trk.appendChild(fill); trk.appendChild(knob);
    r._c.appendChild(minus); r._c.appendChild(trk); r._c.appendChild(plus); r._c.appendChild(val);
    var zero = o.center ? (0 - o.min) / (o.max - o.min) : 0;
    function paint() {
      var v = get(), f = (v - o.min) / (o.max - o.min); f = Math.max(0, Math.min(1, f));
      var side = N.isRtl() ? 'right' : 'left';
      fill.style.left = fill.style.right = knob.style.left = knob.style.right = '';
      if (o.center) { var a = Math.min(f, zero), b = Math.max(f, zero); fill.style[side] = (a * 100) + '%'; fill.style.width = ((b - a) * 100) + '%'; }
      else { fill.style[side] = '0'; fill.style.width = (f * 100) + '%'; }
      knob.style[side] = 'calc(' + (f * 100) + '% - 11px)';
      val.textContent = o.fmt ? o.fmt(v) : String(v);
    }
    function step(d) {
      var v = Math.round((get() + d * o.step) * 1000) / 1000;
      v = Math.max(o.min, Math.min(o.max, v)); set(v); paint();
    }
    minus.onclick = function (e) { e.stopPropagation(); step(-1); };
    plus.onclick = function (e) { e.stopPropagation(); step(1); };
    r.onnav = function (dir) { if (dir === 'left' || dir === 'right') { step(N.ui.step(dir)); return true; } return false; };
    r.onenter = function () { if (o.center) { set(0); paint(); } };
    r.repaint = paint; paint(); return r;
  };
  S.action = function (label, fn, cls) {
    var r = el('div', 'crow act f ' + (cls || '')); r.appendChild(el('div', 'cl', label)); r.onenter = r.onclick = fn; return r;
  };

  /* the full style block (used by the player panel and Settings) */
  S.styleRows = function (box) {
    var rows = [];
    function add(r) { rows.push(r); box.appendChild(r); return r; }
    function sz(px) { var s = el('span', 'aa', 'A'); s.style.fontSize = px + 'px'; return s; }
    var sizeRow = add(S.seg(N.t('subSize'), [
      { v: 28, node: sz(14) }, { v: 33, node: sz(17) }, { v: 38, node: sz(20) }, { v: 44, node: sz(24) }, { v: 48, node: sz(28) }, { v: 54, node: sz(32) }, { v: 60, node: sz(36) }, { v: 68, node: sz(40) }
    ], function () { return S.style().size; }, function (v) { S.set('size', v); }));
    sizeRow.classList.add('many');
    add(S.seg(N.t('fontWeight'), [{ v: 400, label: N.t('wRegular') }, { v: 500, label: N.t('wMedium') }, { v: 700, label: N.t('wBold') }, { v: 800, label: N.t('wHeavy') }],
      function () { return S.style().weight; }, function (v) { S.set('weight', v); }));
    function fontRow(label, list, key) {
      var miss = {};
      var r = add(S.seg(label, list.map(function (f) { var sp = el('span', 'fnt', f.label); sp.style.fontFamily = f.ff + ',sans-serif'; return { v: f.v, node: sp, dis: function () { return !!miss[f.v]; } }; }),
        function () { return S.style()[key]; }, function (v) { S.set(key, v); }));
      r.classList.add('fonts');
      // optional (commercial) fonts disappear when they are not available
      list.forEach(function (f, i) {
        if (!f.optional) return;
        var ch = r._c.children[i]; ch.style.display = 'none'; miss[f.v] = true;
        S.fontOk(f, function (ok) { if (ok) { miss[f.v] = false; ch.style.display = ''; } else if (S.style()[key] === f.v) S.set(key, list[0].v); r.repaint(); });
      });
    }
    fontRow(N.t('fontFa'), S.FONTS_FA, 'fontFa');
    fontRow(N.t('fontEn'), S.FONTS_EN, 'fontEn');
    add(S.swatch(N.t('textColor'), S.TEXT.map(function (c) { return { v: c.v, title: N.t(c.k) }; }),
      function () { return S.style().color; }, function (v) { S.set('color', v); }));
    add(S.swatch(N.t('subBg'), S.BG.map(function (c) { return { v: c.v, title: N.t(c.k) }; }),
      function () { return S.style().bg; }, function (v) { S.set('bg', v); if (v !== 'none' && !S.style().bgOp) S.set('bgOp', 60); }));
    add(S.seg(N.t('bgShape'), [{ v: 'line', label: N.t('shapeLine') }, { v: 'block', label: N.t('shapeBlock') }],
      function () { return S.style().shape; }, function (v) { S.set('shape', v); }));
    add(S.slider(N.t('bgOpacity'), { min: 0, max: 100, step: 10, fmt: function (v) { return v + '%'; } },
      function () { return S.style().bgOp; }, function (v) { S.set('bgOp', v); }));
    add(S.seg(N.t('corners'), [{ v: 0, label: N.t('square') }, { v: 8, label: N.t('soft') }, { v: 14, label: N.t('rounded') }, { v: 24, label: N.t('round') }],
      function () { return S.style().radius; }, function (v) { S.set('radius', v); }));
    add(S.slider(N.t('subPos'), { min: 20, max: 420, step: 20, fmt: function (v) { return v + 'px'; } },
      function () { return S.style().pos; }, function (v) { S.set('pos', v); }));
    add(S.seg(N.t('size2'), [{ v: 100, label: '100%' }, { v: 85, label: '85%' }, { v: 70, label: '70%' }],
      function () { return S.style().size2; }, function (v) { S.set('size2', v); }));
    return rows;
  };
  // subtitle language rows for slot n (0/1); a language taken by the other slot is disabled, never swapped
  S.langOpts = function (avail, other) {
    var o = [{ v: 'off', label: N.t('off') }];
    avail.forEach(function (l) { o.push({ v: l, label: S.langLabel(l), dis: function () { return other() === l; } }); });
    return o;
  };
  S.langLabel = function (l) { return l === 'off' ? N.t('off') : l === 'en' ? N.t('english') : l === 'fa' ? N.t('persian') : String(l).toUpperCase(); };
})();
