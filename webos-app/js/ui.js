/* Shared UI helpers: icons, cards, meta line, track/scroll layout. */
(function () {
  var el = N.el, ui = N.ui = {};
  var NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink';

  ui.icon = function (name, cls) {
    var s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'ico' + (cls ? ' ' + cls : ''));
    var u = document.createElementNS(NS, 'use'); u.setAttributeNS(XL, 'xlink:href', '#i-' + name); u.setAttribute('href', '#i-' + name);
    s.appendChild(u); return s;
  };
  ui.setIcon = function (svg, name) {
    var u = svg.firstChild; u.setAttributeNS(XL, 'xlink:href', '#i-' + name); u.setAttribute('href', '#i-' + name);
  };
  ui.btn = function (text, fn, cls, icon) {
    var b = el('button', 'btn f fl' + (cls ? ' ' + cls : ''));
    if (icon) b.appendChild(ui.icon(icon));
    b.appendChild(el('span', '', text)); b.onclick = fn; return b;
  };
  ui.pill = function (text, fn, cur) {
    var b = el('button', 'pill f fl' + (cur ? ' cur' : ''), text); b.onclick = fn; return b;
  };
  ui.clock = function () {
    var c = el('div', 'clock tab');
    function tick() { var d = new Date(), h = d.getHours(), m = d.getMinutes(); c.textContent = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
    tick(); c._t = setInterval(tick, 20000); return c;
  };

  /* ---------- images ---------- */
  ui.posterUrl = function (p) {
    var po = p && p.image && p.image.poster; if (!po) return '';
    return (po.webp && (po.webp.large || po.webp.medium)) || (po.jpg && (po.jpg.large || po.jpg.medium)) || '';
  };
  ui.coverUrl = function (p) { var c = p && p.image && p.image.cover; return c ? (c.webp || c.jpg || '') : ''; };
  ui.load = function (c) {
    if (c._on || !c._src) return; c._on = true;
    var im = c._im; if (!im) return;
    im.onload = function () { im.classList.add('in'); };
    im.onerror = function () { if (im.parentNode) im.parentNode.removeChild(im); c._im = null; };
    im.src = c._src;
  };
  ui.unload = function (c) {
    if (!c._on) return; c._on = false;
    var im = c._im; if (im) { im.classList.remove('in'); im.onload = null; im.removeAttribute('src'); }
  };

  /* ---------- cards ---------- */
  // kind: poster | land | top | grid | tile ; returns the focusable .card element
  ui.card = function (post, kind, o) {
    o = o || {}; var c = el('div', 'card f k-' + (kind === 'poster' ? 'p' : kind)), po = post.options || {};
    var url = kind === 'land' ? (ui.coverUrl(post) || ui.posterUrl(post)) : ui.posterUrl(post);
    if (kind === 'tile') url = o.image || '';
    c._post = post; c._src = url;
    var holder = c;
    if (kind === 'top') {
      c.appendChild(el('div', 'rank', String(o.rank)));
      c.appendChild(el('div', 'rank hi', String(o.rank)));
      holder = el('div', 'pbox'); c.appendChild(holder);
      if (o.rank >= 10) c.classList.add('wide');
    }
    var ph = el('div', 'ph'); ph.appendChild(el('span', '', kind === 'tile' ? '' : N.title(post))); holder.appendChild(ph);
    if (url) { var im = el('img', 'im'); im.alt = ''; im.decoding = 'async'; holder.appendChild(im); c._im = im; }
    if (kind === 'tile') {
      c.appendChild(el('div', 'shade')); c.appendChild(el('div', 'tn', o.name)); c.appendChild(el('div', 'tc tab', o.count !== undefined ? String(o.count) : ''));
    } else if (kind !== 'land') {
      ui.badge(holder, po);
    }
    c._holder = holder;
    if (o.caption && kind !== 'tile' && kind !== 'land') c.appendChild(ui.caption(post));
    return c;
  };
  // title + rating line under a poster
  ui.rating = function (post) {
    var sc = post.score || {}, v = (sc.imdb && sc.imdb.score) || (sc['30nama'] && sc['30nama'].score) || '';
    return v ? String(v) : '';
  };
  // caption: title, then the two ratings as tinted chips (IMDb yellow, 30nama red), then year and type
  ui.caption = function (post) {
    var cap = el('div', 'cap'), r = el('div', 'cr tab'), pi = post.info || {}, sc = post.score || {};
    cap.appendChild(el('div', 'ct', N.title(post)));
    var im = sc.imdb && sc.imdb.score, s3 = sc['30nama'] && sc['30nama'].score;
    if (im) r.appendChild(el('span', 'rt imdb', String(im)));
    if (s3) r.appendChild(el('span', 'rt n30', String(s3)));
    var bits = [];
    if (pi.year) bits.push(String(pi.year));
    bits.push(ui.typeLabel(post));
    r.appendChild(el('span', 'ry', bits.join('  \u00b7  ')));
    cap.appendChild(r); cap._r = r; return cap;
  };

  /* ---------- focused-poster overlay: genre, next episode, summary, like / watchlist ---------- */
  var ovT = null, nextT = null;
  function ovBtn(kind, post, c) {
    var b = el('div', 'ob ' + kind); b.appendChild(ui.icon(kind === 'watch' ? 'bookmark' : 'heart'));
    function paint() { b.classList.toggle('on', N.lists.has(kind, post.id)); }
    b.onclick = function (e) { e.stopPropagation(); N.lists.toggle(kind, post); paint(); };
    b._paint = paint; paint(); return b;
  }
  ui.cardFocus = function (c) {
    clearTimeout(ovT); clearTimeout(nextT);
    if (!c || !c._post || !c.classList.contains('card') || /k-(tile|face|rev|land)/.test(c.className)) return;
    var post = c._post;
    // first visit: build the info box only once the selection rests on this poster (no text layout while scrolling)
    if (!c._ov) { ovT = setTimeout(function () { if (c.classList.contains('focus')) { buildOv(c, post); } }, 240); return; }
    buildOv(c, post);
  };
  function buildOv(c, post) {
    if (!c._ov) {
      var h = c._holder || c, ov = el('div', 'ov'), pi = post.info || {}, g = (post.genre || []).slice(0, 2).map(function (x) { return x.name; }).join(' \u00b7 ');
      var top = el('div', 'obs'); top.appendChild(ovBtn('watch', post, c)); top.appendChild(ovBtn('like', post, c)); ov.appendChild(top);
      var info = el('div', 'oi');
      if (g) info.appendChild(el('div', 'og', g));
      var nx = el('div', 'onx'); nx.style.display = 'none'; info.appendChild(nx); ov._nx = nx;
      var pl = N.plot(post); if (pl) info.appendChild(el('div', 'op', pl));
      if (pi.seasons && (post.options || {}).is_series) info.appendChild(el('div', 'os', pi.seasons + ' ' + N.t('seasons')));
      ov.appendChild(info); h.appendChild(ov); c._ov = ov; ov._btns = top;
    } else { var bs = c._ov._btns.children; for (var i = 0; i < bs.length; i++) bs[i]._paint(); }
    // next episode (TMDB) after a short dwell, only for series
    if (!c._nextDone && (post.options || {}).is_series && N.tmdb && N.tmdb.enabled()) {
      nextT = setTimeout(function () {
        c._nextDone = true;
        N.tmdb.details(post).then(function (d) {
          if (!d || !d.next || !c._ov) return; var nx = c._ov._nx;
          nx.textContent = N.t('nextEp') + ' \u00b7 S' + d.next.s + 'E' + d.next.e + (d.next.d ? ' \u00b7 ' + d.next.d : ''); nx.style.display = '';
        }).catch(function () {});
      }, 700);
    }
  }


  /* ---------- watchlist / liked (kept on the TV) ---------- */
  var LK = { watch: 'watchlist', like: 'liked' };
  function slim(p) { return { id: p.id, title: p.title, plot: p.plot, image: p.image, info: p.info, score: p.score, genre: p.genre, options: p.options }; }
  N.lists = {
    all: function (n) { return N.store.get(LK[n], []) || []; },
    has: function (n, id) { var a = N.lists.all(n); for (var i = 0; i < a.length; i++) if (a[i].id === id) return true; return false; },
    toggle: function (n, post) {
      var a = N.lists.all(n), i, on = true;
      for (i = 0; i < a.length; i++) if (a[i].id === post.id) { a.splice(i, 1); on = false; break; }
      if (on) a.unshift(slim(post));
      N.store.set(LK[n], a);
      N.toast(N.t(on ? (n === 'watch' ? 'addedWatch' : 'addedLike') : (n === 'watch' ? 'removedWatch' : 'removedLike')) + ' \u00b7 ' + N.title(post), 2200);
      if (N.onListChange) N.onListChange(n, post, on);
      return on;
    }
  };
  ui.badge = function (c, po) {
    var b = null;
    if (po.coming_soon) { b = el('div', 'bdg soon'); b.appendChild(ui.icon('history')); b.appendChild(el('span', '', N.t('soonTag'))); }
    else if (po.free_stream) { b = el('div', 'bdg free', N.t('free')); }
    if (b) c.appendChild(b);
  };
  // grid cell: poster + title under it. Returns the cell; cell.card is the focusable.
  ui.cell = function (post) {
    var cell = el('div', 'gcell'), c = ui.card(post, 'grid', { caption: true });
    cell.appendChild(c); cell.card = c; c._cell = cell; return cell;
  };
  // episode tiles (typographic; the API has no stills)
  ui.epName = function (it) {
    var i = (it && it.info) || {}, t = i.title || i.name || (it && it.title);
    if (t && typeof t === 'object') t = (N.lang === 'fa' && t.local) ? t.local : (t.english || t.local);
    return t ? String(t) : '';
  };
  // episode numbers may be combined ("11,12"): order by the leading number, show "11–12"
  ui.epNum = function (v) { var n = parseInt(String(v === undefined || v === null ? '' : v), 10); return isNaN(n) ? 0 : n; };
  ui.epLabel = function (v, fallback) {
    var s = (v === undefined || v === null || v === '') ? String(fallback === undefined ? '' : fallback) : String(v);
    return s.replace(/\s*[,&+\-–]\s*/g, '–');
  };
  ui.epCmp = function (a, b) {
    var ai = (a && a.info) || {}, bi = (b && b.info) || {};
    return (ui.epNum(ai.season) - ui.epNum(bi.season)) || (ui.epNum(ai.episode) - ui.epNum(bi.episode));
  };
  /* Season / episode picker (details page + player): a row of season chips with episode counts over a compact,
     row-wrapping episode list (4 per row, `rows` rows visible, scrolled a row at a time). Seasons switch when a chip is selected.
     o: { items, rows, now (playing index or -1), progress(idx) 0..1, watched(idx), onPick(idx), downFromLast() } */
  ui.epPicker = function (o) {
    var items = o.items, ROWS = o.rows || 3, COLS = 4, RH = 120; // row pitch: 104 item + 16 gap
    var root = el('div', 'epk'), tabs = el('div', 'epk-tabs'), tin = el('div', 'epk-tin'), meta = el('div', 'epk-meta tab'),
      win = el('div', 'epk-win'), grid = el('div', 'epk-grid'), bar = el('div', 'epk-bar'), thumb = el('i');
    tabs.appendChild(tin); win.appendChild(grid); bar.appendChild(thumb);
    root.appendChild(tabs); root.appendChild(meta); root.appendChild(win); root.appendChild(bar);
    win.style.height = (ROWS * RH - 16 + 20) + 'px'; bar.style.height = (ROWS * RH - 16) + 'px';
    var seasons = [], map = {}, mem = {}, chips = [], tiles = [], byIdx = {}, cur = null, vr = 0, swT = null, tx = 0;
    function seasonOf(idx) { var i = items[idx] && items[idx].info; return (i && i.season) || 1; }
    items.forEach(function (it, i) { var s = seasonOf(i); if (!map[s]) { map[s] = []; seasons.push(s); } map[s].push(i); });
    function chipOf(s) { for (var q = 0; q < chips.length; q++) if (chips[q]._s === s) return chips[q]; return null; }
    seasons.forEach(function (s, si) {
      var c = ui.pill('', function () { api.focusEp(); }, false); c.className += ' epk-s'; c._s = s;
      c.appendChild(el('span', 'sl', N.t('season') + ' ' + s)); c.appendChild(el('span', 'sc tab', String(map[s].length)));
      c.onfocus2 = function () { show(s); revealChip(c); };
      c.onnav = function (dir) {
        if (dir === 'down') { flush(); return target() || true; }
        if (dir === 'up') return true;
        return chips[si + ui.step(dir)] || true;
      };
      tin.appendChild(c); chips.push(c);
    });
    // keep the selected chip inside the chip strip (many seasons); the pointer never scrolls it
    function revealChip(c) {
      if (N.nav.hovering) return;
      var w = tabs.getBoundingClientRect(), r = c.getBoundingClientRect(), d = 0;
      if (r.right > w.right - 8) d = (w.right - 8) - r.right; else if (r.left < w.left + 8) d = (w.left + 8) - r.left;
      if (d) { tx += d; tin.style.transform = 'translateX(' + tx + 'px)'; tabs.classList.toggle('scr', Math.abs(tx) > 1); }
    }
    function nRows() { return Math.ceil(tiles.length / COLS); }
    function setRow(r, inst) {
      r = Math.max(0, Math.min(r, nRows() - ROWS)); if (r === vr && !inst) return; vr = r;
      if (inst) grid.style.transition = 'none';
      grid.style.transform = r ? 'translateY(' + (-r * RH) + 'px)' : '';
      var n = nRows(); bar.style.visibility = n > ROWS ? 'visible' : 'hidden';
      if (n > ROWS) { thumb.style.height = (ROWS / n * 100) + '%'; thumb.style.top = (r / n * 100) + '%'; }
      if (inst) { void grid.offsetWidth; grid.style.transition = ''; }
    }
    function reveal(k) { var r = Math.floor(k / COLS); if (r < vr) setRow(r); else if (r >= vr + ROWS) setRow(r - ROWS + 1); }
    win.onwheel = function (e) { if (tiles.length) setRow(vr + (e.deltaY > 0 ? 1 : -1)); if (e.preventDefault) e.preventDefault(); };
    function tile(idx, k) {
      var it = items[idx], i = it.info || {}, n = ui.epLabel(i.episode, idx + 1), t = el('div', 'eq f');
      t.appendChild(el('div', 'eq-n tab' + (n.length > 3 ? ' sm' : ''), /^\d$/.test(n) ? '0' + n : n));
      var x = el('div', 'eq-x'), ti = el('div', 'eq-t', ui.epName(it) || (N.t('episode') + ' ' + n)), sub = el('div', 'eq-s');
      ti.dir = 'auto'; x.appendChild(ti); x.appendChild(sub); t.appendChild(x);
      var pr = o.progress ? o.progress(idx) : 0, w = o.watched ? o.watched(idx) : false, dur = Number(i.duration || i.time || 0);
      if (dur > 600) dur = dur / 60; dur = Math.round(dur);
      if (idx === o.now) { t.classList.add('now'); sub.appendChild(el('span', 'np', N.t('nowPlaying'))); if (dur) sub.appendChild(el('span', 'tab', ' · ' + dur + ' ' + N.t('min'))); }
      else if (w) { t.classList.add('seen'); sub.appendChild(ui.icon('check', 'ck')); sub.appendChild(el('span', '', N.t('watched'))); }
      else if (pr > 0 && dur) sub.appendChild(el('span', 'tab', Math.max(1, Math.round(dur * (1 - Math.min(1, pr)))) + ' ' + N.t('minLeft')));
      else if (dur) sub.appendChild(el('span', 'tab', dur + ' ' + N.t('min')));
      if (pr > 0 && !w) { var pb = el('div', 'eq-p'), pi = el('i'); pi.style.width = Math.round(Math.min(1, pr) * 100) + '%'; pb.appendChild(pi); t.appendChild(pb); }
      t.onclick = function () { if (o.onPick) o.onPick(idx); };
      t.onfocus2 = function () { mem[cur] = idx; if (!N.nav.hovering) reveal(k); };
      t.onnav = function (dir) {
        if (dir === 'up') return k >= COLS ? tiles[k - COLS] : (chipOf(cur) || true);
        if (dir === 'down') {
          if (k + COLS < tiles.length) return tiles[k + COLS];
          if (Math.floor(k / COLS) < nRows() - 1) return tiles[tiles.length - 1]; // short last row
          return o.downFromLast ? (o.downFromLast() || true) : true;
        }
        return tiles[k + ui.step(dir)] || true;
      };
      byIdx[idx] = t; return t;
    }
    function build(s) {
      grid.innerHTML = ''; tiles = []; byIdx = {};
      map[s].forEach(function (idx, k) { var t = tile(idx, k); grid.appendChild(t); tiles.push(t); });
      meta.textContent = N.t('season') + ' ' + s + '  ·  ' + tiles.length + ' ' + N.t('episodes');
      var tg = target(); vr = -1; setRow(tg ? Math.floor(tiles.indexOf(tg) / COLS) : 0, true);
    }
    // switch the list to season s (a short fade unless now)
    function show(s, now) {
      if (s === cur) return; cur = s;
      for (var q = 0; q < chips.length; q++) chips[q].classList.toggle('cur', chips[q]._s === s);
      clearTimeout(swT); swT = null;
      if (now) { build(s); win.classList.remove('sw'); return; }
      win.classList.add('sw'); swT = setTimeout(function () { swT = null; build(s); win.classList.remove('sw'); }, 160);
    }
    function flush() { if (swT) { clearTimeout(swT); swT = null; build(cur); win.classList.remove('sw'); } }
    // tile to focus in the shown season: the remembered episode (an index; tiles are rebuilt on every switch), else the first
    function target() { var i = mem[cur]; return (i !== undefined && byIdx[i]) || tiles[0] || null; }
    var api = {
      el: root,
      // show idx's season with idx as the remembered episode; returns the tile to focus
      open: function (idx) {
        if (!items[idx]) idx = map[seasons[0]][0];
        var s = seasonOf(idx); mem[s] = idx; cur = null; tx = 0; tin.style.transform = ''; tabs.classList.remove('scr');
        show(s, true); var c = chipOf(s); if (c) revealChip(c); return target();
      },
      remember: function (idx) { if (items[idx]) mem[seasonOf(idx)] = idx; },
      focusEp: function () { flush(); var t = target(); if (t) N.nav.focus(t, true); },
      stop: function () { clearTimeout(swT); swT = null; }
    };
    return api;
  };
  ui.skelCard = function (kind) { var c = el('div', 'card skel k-' + (kind || 'p')); return c; };

  /* ---------- text bits ---------- */
  ui.typeLabel = function (post, withSeasons) {
    var po = post.options || {}, pi = post.info || {}, s;
    if (po.title_type === 'anime') s = N.t('anime'); else if (po.is_series) s = N.t('series'); else s = N.t('movie');
    if (withSeasons && po.is_series && pi.seasons) s += ' · ' + pi.seasons + ' ' + N.t('seasons');
    return s;
  };
  ui.duration = function (min) {
    min = Number(min); if (!min) return '';
    var h = Math.floor(min / 60), m = min % 60;
    if (N.lang === 'fa') return (h ? h + ' ساعت ' : '') + (m ? m + ' دقیقه' : '');
    return (h ? h + 'h ' : '') + (m ? m + 'm' : '');
  };
  // Meta line: [IMDb 7.8] 30nama-score · year · duration · [age] · genres
  ui.meta = function (post, nGenres) {
    var m = el('div', 'meta'), pi = post.info || {}, sc = post.score || {}, bits = 0;
    function dot() { if (m.lastChild) m.appendChild(el('i', 'dot-s')); }
    // same rating chips as on the tiles: IMDb on yellow, 30nama on red
    if (sc.imdb && sc.imdb.score) { var ri = el('span', 'rt imdb tab'); ri.appendChild(el('small', '', 'IMDb')); ri.appendChild(document.createTextNode(String(sc.imdb.score))); m.appendChild(ri); }
    if (sc['30nama'] && sc['30nama'].score) { var r3 = el('span', 'rt n30 tab'); r3.appendChild(el('small', '', '30nama')); r3.appendChild(document.createTextNode(String(sc['30nama'].score))); m.appendChild(r3); }
    if (pi.year) { dot(); m.appendChild(el('span', 'tab', pi.year + (pi.year_end && pi.year_end !== pi.year && (post.options || {}).is_series ? '–' + pi.year_end : ''))); }
    var d = ui.duration(pi.time && pi.time.default); if (d) { dot(); m.appendChild(el('span', 'tab', d)); }
    if (pi.age) { dot(); m.appendChild(el('span', 'age', pi.age)); }
    if (post.genre && post.genre.length) {
      dot(); m.appendChild(el('span', '', post.genre.slice(0, nGenres || 2).map(function (g) { return g.name; }).join(', ')));
    }
    return m;
  };

  /* ---------- layout: start-anchored tracks, vertical scroll ---------- */
  var START = 184;
  // cards: array of elements with known widths; sets card._x (logical start) and track._total
  ui.layoutTrack = function (track, cards, widths, gap) {
    var x = START; gap = gap === undefined ? 24 : gap;
    for (var i = 0; i < cards.length; i++) { cards[i]._x = x; x += widths[i] + gap; }
    track._total = x - gap; track._s = null;
  };
  ui.slideTo = function (track, x) {
    if (N.nav.hovering) return; // pointer hover never scrolls
    var s = Math.max(0, x - START), max = Math.max(0, (track._total || 0) - 1824);
    if (s > max) s = max;
    if (track._s === s) return; track._s = s;
    track.style.transform = 'translateX(' + (N.isRtl() ? s : -s) + 'px)';
  };
  function topIn(e, box) { var t = 0; while (e && e !== box) { t += e.offsetTop; e = e.offsetParent; } return t; }
  ui.topIn = topIn;
  // keep `target` row at (at most) `anchor` px from the top of the screen
  ui.vscroll = function (box, target, anchor) {
    if (N.nav.hovering) return box._ty || 0;
    var ty = -Math.max(0, topIn(target, box) - anchor);
    if (box._ty === ty) return ty; box._ty = ty;
    box.style.transform = 'translateY(' + ty + 'px)'; return ty;
  };
  // is `dir` ('left'|'right') towards the end edge in the current direction?
  ui.step = function (dir) { var r = N.isRtl(); return (dir === 'right') !== r ? 1 : -1; };
})();
