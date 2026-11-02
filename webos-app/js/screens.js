/* Screens: login(QR), home, details, search, archive, settings. Each returns {destroy, back?, focusState?}. */
(function () {
  var S = N.screens = {};
  var el = N.el, ui = N.ui;

  function extractPosts(r) {
    if (!r) return [];
    var a = r.posts || r.items || r.list || (r instanceof Array ? r : []);
    return a.map(function (x) { return x && x.post ? x.post : x; }).filter(function (x) { return x && x.id; });
  }
  function userObj(r) { return (r && r.user_session) ? r : (r && r.user && r.user.user_session ? r.user : null); }
  function errorView(root, e, retry) {
    root.innerHTML = '';
    var w = el('div', 'center-msg'); w.appendChild(ui.icon('warn'));
    try { console.warn('screen error', e && e.message); } catch (x) {}
    w.appendChild(el('div', 'm', N.t('error') + '. ' + N.t('tryAgain')));
    var b = ui.btn(N.t('retry'), retry, 'primary'); w.appendChild(b); root.appendChild(w); N.nav.focus(b, true);
  }
  function instant(root, fn) { root.classList.add('noanim'); fn(); void root.offsetWidth; root.classList.remove('noanim'); }
  function skeletonHome(root) {
    var w = el('div', 'skel-wrap'), b = el('div', 'sk-bb');
    [[600, 64, 0], [420, 28, 20], [760, 28, 20], [760, 28, 12]].forEach(function (s) { var x = el('div', 'bar'); x.style.width = s[0] + 'px'; x.style.height = s[1] + 'px'; x.style.marginTop = s[2] + 'px'; b.appendChild(x); });
    w.appendChild(b);
    var r = el('div', 'sk-rows'); r.style.top = '640px';
    for (var i = 0; i < 7; i++) r.appendChild(ui.skelCard());
    w.appendChild(r); root.appendChild(w); return w;
  }
  function other(p) { var t = p.title || {}, o = N.lang === 'fa' ? t.english : t.local; return o && o !== N.title(p) ? o : ''; }

  /* ================= QR login ================= */
  S.login = function (root) {
    var dead = false, pollT = null, startT = 0, code = null;
    root.classList.add('login');
    N.stage.dim(0.55);
    var col = el('div', 'col'); root.appendChild(col);
    col.appendChild(el('div', 'eyebrow', N.t('signIn')));
    col.appendChild(el('div', 'h-xl', N.t('scanTitle')));
    var steps = el('div', 'steps');
    ['step1', 'step2', 'step3'].forEach(function (k, i) { var s = el('div', 'step'); s.appendChild(el('b', '', String(i + 1))); s.appendChild(el('span', '', N.t(k))); steps.appendChild(s); });
    col.appendChild(steps);
    var alt = el('div', 'alt'), codeEl = el('span', 'code', '');
    (function () { var parts = N.t('orVisit').split('30nama.com/auth'); alt.appendChild(document.createTextNode(parts[0])); alt.appendChild(el('span', 'latin', '30nama.com/auth')); alt.appendChild(document.createTextNode(parts[1] || '')); })();
    alt.appendChild(codeEl); col.appendChild(alt);
    var acts = el('div', 'acts'), guestB = ui.btn(N.t('guest'), function () { cleanup(); N.go('home', {}, { reset: true }); }, 'primary');
    var newB = ui.btn(N.t('refresh'), function () { cleanup(); dead = false; begin(); }, '');
    acts.appendChild(guestB); acts.appendChild(newB); col.appendChild(acts);
    var tile = el('div', 'qr-tile'), qrBox = el('div', 'qr'), okBox = el('div', 'ok'), exp = el('div', 'exp', N.t('expired'));
    okBox.appendChild(ui.icon('check')); tile.appendChild(qrBox); tile.appendChild(exp); tile.appendChild(okBox); root.appendChild(tile);
    var status = el('div', 'qr-status'); status.appendChild(el('i')); var stTxt = el('span', '', N.t('waiting')); status.appendChild(stTxt); root.appendChild(status);
    N.nav.focus(guestB, true);

    // backdrop: first hero cover (guest payload)
    N.getHome().then(function (h) {
      if (dead) return;
      var ps = (h.hero_header && h.hero_header.posts) || [], p = null;
      for (var i = 0; i < ps.length; i++) if (ui.coverUrl(ps[i])) { p = ps[i]; break; }
      if (p) N.stage.show(p, { immediate: true, done: function () { N.splashReady(); } }); else N.splashReady();
    }).catch(function () { N.splashReady(); });

    function cleanup() { dead = true; clearInterval(pollT); }
    function begin() {
      tile.classList.remove('dim', 'done'); qrBox.innerHTML = ''; codeEl.textContent = ''; status.style.visibility = 'visible';
      N.api.get('qrlogin_code').then(function (r) {
        if (dead) return;
        code = r.code; var link = r.url || (N.config.qrBase + code);
        var qr = qrcode(0, 'M'); qr.addData(link); qr.make();
        qrBox.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
        codeEl.textContent = code;
        startT = Date.now(); clearInterval(pollT);
        pollT = setInterval(function () {
          if (dead) return;
          if (Date.now() - startT > N.config.qrTimeoutMs) { // expired
            clearInterval(pollT); tile.classList.add('dim'); status.style.visibility = 'hidden'; N.nav.focus(newB, true); return;
          }
          N.api.call('qrlogin_login', { auth_code: code }).then(function (j) {
            if (dead || !j || !j.success) return; // CODE_NOT_USED -> keep polling
            var u = userObj(j.result);
            var token = u ? u.user_session : (j.result && (j.result.token || j.result.user_session));
            if (!token) return;
            cleanup();
            N.setSession(u || { user_session: token });
            // qrlogin_login returns only {token}; fetch the profile with it
            N.api.call('user', {}).then(function (uj) {
              var rr = uj && uj.success && uj.result;
              var full = rr && (rr.user_session ? rr : (rr.user || rr));
              if (full) { if (!full.user_session) full.user_session = token; N.setSession(full); }
            }).catch(function () {}).then(function () {
              tile.classList.add('done'); status.style.visibility = 'hidden'; N.dropHome();
              N.toast(N.t('welcome') + ' ' + ((N.session.user && N.session.user.user_name) || ''));
              setTimeout(function () { N.go('home', {}, { reset: true }); }, 400);
            });
          }).catch(function () {});
        }, N.config.qrPollMs);
      }).catch(function (e) {
        if (dead) return; tile.classList.add('dim'); exp.textContent = N.t('error'); status.style.visibility = 'hidden'; N.nav.focus(newB, true);
      });
    }
    begin();
    return { destroy: cleanup };
  };

  /* ================= Home ================= */
  S.home = function (root, params, restore) {
    var dead = false, st = { mode: 'hero', row: 0 };
    var heroes = [], defs = [], rowEls = [], tracks = [], cards = [], mem = [], tops = [], cwIds = {}, rowObjs = [], shownHero = null, tab = 'sug', cwView = null, cwCells = [], cwList0 = [], cwPosts0 = [];
    var bb, bbE, dotsEl, playBtn, detBtn, heroUi, rowsEl, noteBtn = null, noteEl = null;
    var curPost = null, curEb = '', curImm = false, shownKey = '', fT = null, bbT = null, flip = false, lastAct = Date.now(), advT = null, rowsTy = null, heroIdx = 0, heroNav = 0, heroT = null, chPrev = null, chNext = null;
    root.classList.add('home');
    var sk = skeletonHome(root);
    function act() { lastAct = Date.now(); }
    document.addEventListener('keydown', act);

    function load() {
      var cw = N.getCW();
      var tmOn = N.tmdb.enabled(), tmH = Promise.resolve([]);
      if (tmOn) { root.classList.add('tm'); N.tmdb.startHome(); tmH = N.tmdb.heroes(6, 3200).catch(function () { return []; }); }
      Promise.all([N.getHome(), cw, tmH]).then(function (res) { if (!dead) build(res[0], extractPosts(res[1]), res[1], res[2]); })
        .catch(function (e) { if (dead) return; N.splashReady(); errorView(root, e, function () { root.innerHTML = ''; sk = skeletonHome(root); load(); }); });
    }

    function cwNorm(x0, raw) {
      var c = x0.continue_watching || x0, t = Number(c.time || c.position || 0), d = Number(c.duration || 0);
      var season = c.season || (c.info && c.info.season), ep = c.episode || (c.info && c.info.episode);
      var parts = [];
      if (season && ep) parts.push('S' + season + ' · E' + N.ui.epLabel(ep));
      if (d && t) parts.push(Math.max(1, Math.round((d - t) / 60)) + ' ' + N.t('minLeft'));
      return { prog: d ? Math.min(1, t / d) : 0, label: parts.join(' · ') };
    }

    function build(h, cwPosts, cwRaw, tmHeroes) {
      root.removeChild(sk);
      heroes = ((h.hero_header && h.hero_header.posts) || []).slice(0, 8);
      if (tmHeroes && tmHeroes.length >= 3) heroes = tmHeroes;
      var cwList = (cwRaw && (cwRaw.posts || cwRaw.items || cwRaw.list || (cwRaw instanceof Array ? cwRaw : []))) || [];
      cwPosts.forEach(function (p) { cwIds[p.id] = true; });
      cwPosts0 = cwPosts; cwList0 = cwList;
      ['new_releases', 'suggested', 'top_10', 'movies', 'series', 'anime'].forEach(function (k) {
        var ps = h[k] && h[k].posts; if (ps && ps.length) defs.push({ key: k, title: N.t(k), kind: k === 'top_10' ? 'top' : 'poster', posts: k === 'top_10' ? ps.slice(0, 10) : ps });
      });
      root.appendChild(ui.clock());
      // billboard
      bb = el('div', 'bb'); bbE = {};
      ['eb:bb-eyebrow', 'title:bb-title', 'sub:bb-sub', 'meta:bb-i', 'plot:bb-plot'].forEach(function (s) {
        var p = s.split(':'), e = el('div', 'bb-i ' + p[1]); bbE[p[0]] = e; bb.appendChild(e);
      });
      bbE.meta.className = 'bb-i';
      root.appendChild(bb);
      // hero buttons + dots
      heroUi = el('div', 'hero-ui');
      playBtn = ui.btn(N.t('play'), function () { goDetails(heroes[heroIdx], true); }, 'primary', 'play');
      detBtn = ui.btn(N.t('details'), function () { goDetails(heroes[heroIdx], false); }, '', 'info');
      var br = el('div', 'br'); br.appendChild(playBtn); br.appendChild(detBtn); heroUi.appendChild(br);
      dotsEl = el('div', 'dots'); heroes.forEach(function () { dotsEl.appendChild(el('i')); }); heroUi.appendChild(dotsEl);
      root.appendChild(heroUi);
      if (heroes.length > 1) {
        chPrev = el('button', 'chev prev f'); chNext = el('button', 'chev next f');
        chPrev.onclick = function () { heroStep(-1); }; chNext.onclick = function () { heroStep(1); };
        chPrev.onfocus2 = chNext.onfocus2 = function () { if (st.mode !== 'hero') exitBrowse(); heroNav = lastAct = Date.now(); };
        root.appendChild(chPrev); root.appendChild(chNext);
      }
      playBtn.onfocus2 = detBtn.onfocus2 = function () { if (st.mode !== 'hero') exitBrowse(); else { curPost = heroes[heroIdx]; } };
      N.nav.hoverOk = hoverOk;
      // rows
      rowsEl = el('div', 'rows'); root.appendChild(rowsEl);
      defs.forEach(function (d) { var r = makeRow(d); pushRow(r); });
      if (!N.isLoggedIn()) {
        noteEl = el('div', 'guest-note'); noteEl.appendChild(el('div', 'gn-t', N.t('loginRequired')));
        noteBtn = ui.btn(N.t('signIn'), function () { N.go('login', {}, { reset: true }); }, '');
        noteBtn.onfocus2 = function () { if (st.mode !== 'browse') { st.mode = 'browse'; root.classList.add('browse'); document.body.classList.add('browsing'); N.stage.dim(0.72); } setRow(defs.length); curPost = null; };
        noteEl.appendChild(noteBtn); rowsEl.appendChild(noteEl);
      }
      recalcTops();
      root.onnav = onnav;
      N.nav.onSettle(follow);
      // initial state
      var start = 0, br = restore && restore.mode === 'browse' && cards[restore.row] && cards[restore.row][restore.idx];
      if (restore && typeof restore.hero === 'number' && heroes[restore.hero]) start = restore.hero;
      instant(root, function () { setRowsRest(); });
      if (params.tab === 'cw') { if (heroes.length) setHero(0, true, true); else N.splashReady(); setTab('cw', true); var rc0 = cwCells[(restore && restore.cwIdx) || 0]; if (rc0) N.nav.focus(rc0.card, true); advT = setInterval(autoAdvance, 1000); return; }
      if (heroes.length) setHero(start, true, !!br);
      else if (!br) N.splashReady();
      if (br) instant(root, function () { N.nav.focus(br, true); });
      else if (heroes.length) N.nav.focus(playBtn, true);
      else if (cards[0]) N.nav.focus(cards[0][0], true);
      advT = setInterval(autoAdvance, 1000);
      tmSetup();
      N.prefetchArchives();
    }

    // one row = {d, row, tr, cs, ws}; d.posts are cards in order. Closures resolve the row index lazily (rows can be inserted above).
    function addCard(r, p, i) {
      var d = r.d, c = ui.card(p, d.kind, { rank: i + 1, caption: true });
      if (d.kind === 'land') {
        var n = cwNorm(d.raw[i] || p), lb = n.label || N.title(p);
        c.appendChild(el('div', 'lbl', lb));
        if (n.prog > 0) { var pb = el('div', 'prog'), pi = el('i'); pi.style.transform = 'scaleX(' + n.prog.toFixed(3) + ')'; pb.appendChild(pi); c.appendChild(pb); }
      }
      c.onfocus2 = function () { onCardFocus(defs.indexOf(d), i); };
      c.onclick = function () { goDetails(p, false); };
      r.tr.appendChild(c); r.cs.push(c); r.ws.push(d.kind === 'land' ? 400 : d.kind === 'top' ? (i + 1 >= 10 ? 480 : 360) : 248);
      if (i < 10) ui.load(c);
    }
    function makeRow(d) {
      var row = el('div', 'hrow'), hd = el('div', 'hrow-h', d.title), tr = el('div', 'track'), r = { d: d, row: row, tr: tr, cs: [], ws: [] };
      row.appendChild(hd); row.appendChild(tr);
      d.posts.forEach(function (p, i) { addCard(r, p, i); });
      ui.layoutTrack(tr, r.cs, r.ws);
      return r;
    }
    function pushRow(r) { defs.push(r.d); rowEls.push(r.row); tracks.push(r.tr); cards.push(r.cs); mem.push(0); rowsEl.appendChild(r.row); rowObjs.push(r); }
    function recalcTops() { tops.length = 0; for (var k = 0; k < rowEls.length; k++) tops.push(rowEls[k].offsetTop); if (noteEl) tops.push(noteEl.offsetTop); }
    // insert a TMDB row at index `at`, keeping the current view stable
    function insertRowAt(r, at) {
      var curD = st.mode === 'browse' && defs[st.row] ? defs[st.row] : null;
      defs.splice(at, 0, r.d); rowEls.splice(at, 0, r.row); tracks.splice(at, 0, r.tr); cards.splice(at, 0, r.cs); mem.splice(at, 0, 0); rowObjs.splice(at, 0, r);
      rowsEl.insertBefore(r.row, rowEls[at + 1] || noteEl || null);
      recalcTops();
      instant(root, function () {
        if (curD) { st.row = -1; rowsTy = null; setRow(defs.indexOf(curD)); } else if (st.mode === 'hero') setRowsRest();
      });
      for (var k = 0; k < r.cs.length && k < 10; k++) ui.load(r.cs[k]);
    }
    var tmRows = {}, tmFeeds = [];
    function tmSetup() {
      if (!N.tmdb.enabled()) return;
      var TD = [['trend', 'trendingWeek', 5], ['fresh', 'newSeries', 5], ['pop', 'popularMovies', 5]];
      TD.forEach(function (x) {
        var f = N.tmdb.feed(x[0]); tmFeeds.push(f);
        function cb() {
          if (dead) return;
          var items = f.items.slice().sort(function (a, b) { return a.i - b.i; }), r = tmRows[x[0]];
          if (!r) {
            if (items.length < x[2]) return;
            var d = { key: 'tm_' + x[0], title: N.t(x[1]), kind: 'poster', posts: items.map(function (it) { return it.post; }) };
            r = tmRows[x[0]] = makeRow(d); r.n = items.length;
            var at = 0; while (at < defs.length && (defs[at].key === 'cw' || defs[at].key.indexOf('tm_') === 0)) at++;
            // keep trend < fresh < pop order
            var order = { tm_trend: 0, tm_fresh: 1, tm_pop: 2 };
            at = 0; while (at < defs.length && (defs[at].key === 'cw' || (order[defs[at].key] !== undefined && order[defs[at].key] < order[d.key]))) at++;
            insertRowAt(r, at);
          } else {
            var seen = {}; r.d.posts.forEach(function (p) { seen[p.id] = 1; });
            items.forEach(function (it) { if (!seen[it.post.id]) { seen[it.post.id] = 1; r.d.posts.push(it.post); addCard(r, it.post, r.d.posts.length - 1); } });
            ui.layoutTrack(r.tr, r.cs, r.ws);
          }
          if (f.done) f.unsubscribe(cb);
        }
        f.subscribe(cb);
      });
    }

    /* ---- Continue watching view (menu item) ---- */
    function setTab(t, inst) {
      if (t === tab && !inst) return; tab = t;
      root.classList.toggle('tab-cw', t === 'cw');
      if (t === 'cw') { buildCw(); N.stage.dim(0.6); }
      else { N.stage.dim(st.mode === 'browse' ? 0.6 : 0); }
    }
    function buildCw() {
      if (cwView) return;
      cwView = el('div', 'arch cwv'); root.appendChild(cwView);
      cwView.appendChild(el('div', 'ah head', N.t('continueWatching')));
      var g = posterGrid(cwView, cwPosts0, { empty: N.isLoggedIn() ? N.t('cwEmpty') : N.t('loginRequired'), top: 180 });
      cwCells = g.cells;
      cwCells.forEach(function (cell, i) {
        var n = cwNorm(cwList0[i] || cell.card._post);
        if (n.label) { var r = cell.card.querySelector('.cap .cr'); if (r) { r.innerHTML = ''; r.appendChild(el('span', 'ry', n.label)); } }
        if (n.prog > 0) { var pb = el('div', 'prog'), pi = el('i'); pi.style.transform = 'scaleX(' + n.prog.toFixed(3) + ')'; pb.appendChild(pi); cell.card._holder.appendChild(pb); }
      });
    }
    function hoverOk(e) {
      if (tab === 'cw' || !e.classList.contains('card')) return st.mode === 'hero' || !e.classList.contains('btn');
      return st.mode === 'browse'; // row posters take hover only while browsing (in hero mode they are just peeking)
    }

    function goDetails(p, play) { if (p) N.go('details', { id: p.id, autoplay: play ? 1 : 0 }); }

    /* ---- billboard + stage follow ---- */
    function eyebrowFor(p, key, rank) {
      if (key === 'hero') return (p._hero ? N.t('trendingNow') : N.t('featured')) + ' · ' + ui.typeLabel(p, true);
      if (key === 'top_10') return N.t('top10') + ' · #' + rank;
      if (key === 'cw') return N.t('continueWatching');
      return ui.typeLabel(p, true);
    }
    function fill(p, eb) {
      bbE.eb.textContent = eb; bbE.title.textContent = N.title(p);
      var o = other(p); bbE.sub.textContent = o; bbE.sub.style.display = o ? '' : 'none';
      bbE.meta.innerHTML = ''; bbE.meta.appendChild(ui.meta(p, 2)); bbE.plot.textContent = N.plot(p);
      bbE.title.classList.remove('has-logo'); shownHero = p;
      if (p._logo) {
        var im = el('img', 'logo'); im.alt = ''; im.decoding = 'async'; bbE.title.appendChild(im); bbE.title.classList.add('has-logo');
        im.onload = function () { im.classList.add('in'); };
        im.onerror = function () { if (im.parentNode) im.parentNode.removeChild(im); bbE.title.classList.remove('has-logo'); };
        im.src = p._logo;
      }
    }
    function swapBB(p, eb, first) {
      clearTimeout(bbT);
      if (first || document.body.classList.contains('calm')) { fill(p, eb); bb.classList.remove('out'); return; }
      bb.classList.add('out');
      bbT = setTimeout(function () {
        if (dead) return; fill(p, eb); bb.classList.remove('out', 'in-a', 'in-b'); bb.classList.add(flip ? 'in-a' : 'in-b'); flip = !flip;
      }, 120);
    }
    // while browsing rows the backdrop stays put (billboard is hidden anyway): no full-screen image swaps per move
    function follow() { clearTimeout(fT); if (dead || !curPost || st.mode === 'browse') return; if (N.nav.isFast()) return; fT = setTimeout(function () { apply(false); }, 60); }
    function apply(first) {
      if (dead || !curPost) return;
      var key = curPost.id + '|' + curEb;
      if (key !== shownKey) { var f = !shownKey; shownKey = key; swapBB(curPost, curEb, f); }
      N.stage.show(curPost, (curImm || first) ? { immediate: true, done: first ? function () { N.splashReady(); } : null } : {});
      curImm = false;
    }

    /* ---- hero mode ---- */
    function setHero(i, first, uiOnly) {
      heroIdx = i; var p = heroes[i]; if (!p) return;
      var kids = dotsEl.children; for (var k = 0; k < kids.length; k++) kids[k].classList.toggle('on', k === i);
      playBtn.lastChild.textContent = cwIds[p.id] ? N.t('resume') : N.t('play');
      if (uiOnly || st.mode !== 'hero') return;
      curPost = p; curEb = eyebrowFor(p, 'hero'); curImm = true; clearTimeout(fT); apply(!!first);
    }
    // manual slide change: dots/buttons update at once, billboard + backdrop settle after a short debounce
    function heroStep(d) {
      if (heroes.length < 2) return;
      var i = (heroIdx + d + heroes.length) % heroes.length;
      heroNav = lastAct = Date.now();
      heroIdx = i; var p = heroes[i];
      var kids = dotsEl.children; for (var k = 0; k < kids.length; k++) kids[k].classList.toggle('on', k === i);
      playBtn.lastChild.textContent = cwIds[p.id] ? N.t('resume') : N.t('play');
      curPost = p; curEb = eyebrowFor(p, 'hero'); curImm = true; clearTimeout(fT); clearTimeout(heroT);
      heroT = setTimeout(function () { if (!dead && st.mode === 'hero') apply(false); }, 200);
    }
    function autoAdvance() {
      if (dead || tab !== 'sug' || st.mode !== 'hero' || heroes.length < 2 || document.body.classList.contains('calm') || N.player.open || N.nav.cur === chPrev || N.nav.cur === chNext || rail_open() || document.querySelector('.modal')) return;
      if (Date.now() - lastAct < 9000 || Date.now() - heroNav < 12000) return;
      lastAct = Date.now(); setHero((heroIdx + 1) % heroes.length, false);
    }
    function rail_open() { return N.rail.open; }
    function setRowsRest() {
      rowsTy = 860 - (tops[0] || 0); rowsEl.style.transform = 'translateY(' + rowsTy + 'px)';
      for (var k = 0; k < rowEls.length; k++) { rowEls[k].classList.remove('past'); rowEls[k].classList.remove('cur'); }
      st.row = 0;
    }
    function exitBrowse() {
      st.mode = 'hero'; root.classList.remove('browse'); document.body.classList.remove('browsing'); setRowsRest(); N.stage.dim(0);
      var p = heroes[heroIdx]; curPost = p; curEb = eyebrowFor(p, 'hero'); curImm = true; lastAct = Date.now();
      clearTimeout(fT); apply(false);
    }

    /* ---- browse mode ---- */
    function windowRow(k, center) {
      var cs = cards[k], from = Math.max(0, center - 2), to = Math.min(cs.length - 1, center + 9);
      for (var i = from; i <= to; i++) ui.load(cs[i]);
    }
    function windowRows(ri) {
      for (var k = 0; k < cards.length; k++) {
        var d = Math.abs(k - ri);
        if (d <= 2) windowRow(k, mem[k] || 0);
        else if (d > 4) for (var i = 0; i < cards[k].length; i++) ui.unload(cards[k][i]);
      }
    }
    function setRow(ri) {
      if (N.nav.hovering) { windowRow(ri, mem[ri] || 0); return; } // pointer hover never scrolls
      var ty = 14 - tops[ri];
      if (rowsTy !== ty) { rowsTy = ty; rowsEl.style.transform = 'translateY(' + ty + 'px)'; }
      if (st.row !== ri || !rowEls[ri].classList.contains('cur')) {
        for (var k = 0; k < rowEls.length; k++) { rowEls[k].classList.toggle('past', k < ri); rowEls[k].classList.toggle('cur', k === ri); }
        st.row = ri; windowRows(ri);
      }
    }
    function onCardFocus(ri, i) {
      if (st.mode !== 'browse') { st.mode = 'browse'; root.classList.add('browse'); document.body.classList.add('browsing'); N.stage.dim(0.72); }
      mem[ri] = i; setRow(ri); ui.slideTo(tracks[ri], cards[ri][i]._x); windowRow(ri, i);
      var p = cards[ri][i]._post; curPost = p; curEb = eyebrowFor(p, defs[ri].key, i + 1);
      follow();
    }
    function onnav(dir, cur) {
      var s = (dir === 'left' || dir === 'right') ? ui.step(dir) : 0;
      if (cur === playBtn || cur === detBtn) {
        if (dir === 'down') { if (cards.length) return cards[0][mem[0] || 0]; return true; }
        if (dir === 'up') return chPrev || true;
        if (cur === playBtn) { if (s > 0) return detBtn; N.rail.enter(); return true; }
        if (s < 0) return playBtn; return chNext || true;
      }
      if (cur === chPrev || cur === chNext) {
        if (dir === 'down') return playBtn;
        if (dir === 'up') return true;
        if (cur === chPrev) { if (s > 0) return chNext; N.rail.enter(); return true; }
        if (s < 0) return detBtn; return true;
      }
      if (tab === 'cw') return false; // continue-watching grid: plain spatial navigation
      if (cur === noteBtn) {
        if (dir === 'up') return cards[cards.length - 1][mem[cards.length - 1] || 0];
        if (s < 0) { N.rail.enter(); } return true;
      }
      var ri = -1, i = -1;
      for (var r = 0; r < cards.length && ri < 0; r++) { var ix = cards[r].indexOf(cur); if (ix >= 0) { ri = r; i = ix; } }
      if (ri < 0) return false;
      if (s) {
        var ni = i + s;
        if (ni < 0) { N.rail.enter(); return true; }
        if (ni >= cards[ri].length) return true;
        return cards[ri][ni];
      }
      if (dir === 'down') {
        if (ri + 1 < cards.length) return cards[ri + 1][Math.min(mem[ri + 1] || 0, cards[ri + 1].length - 1)];
        return noteBtn || true;
      }
      if (dir === 'up') {
        if (ri === 0) return heroes.length ? playBtn : true;
        return cards[ri - 1][Math.min(mem[ri - 1] || 0, cards[ri - 1].length - 1)];
      }
      return true;
    }

    load();
    return {
      destroy: function () {
        dead = true; clearTimeout(fT); clearTimeout(bbT); clearTimeout(heroT); clearInterval(advT); document.removeEventListener('keydown', act);
        N.nav.offSettle(follow); N.stage.cancel();
        var c = root.querySelector('.clock'); if (c) clearInterval(c._t);
      },
      focusState: function () {
        if (tab === 'cw') { var ci = 0; for (var q = 0; q < cwCells.length; q++) if (cwCells[q].card === N.nav.cur) ci = q; return { tab: 'cw', cwIdx: ci, hero: heroIdx }; }
        if (st.mode === 'browse' && N.nav.cur) { for (var r = 0; r < cards.length; r++) { var ix = cards[r].indexOf(N.nav.cur); if (ix >= 0) return { mode: 'browse', row: r, idx: ix, hero: heroIdx }; } }
        return { mode: 'hero', hero: heroIdx };
      }
    };
  };

  /* ================= Details ================= */
  S.details = function (root, params) {
    var dead = false, epsOpen = false, lastFocus = null, swT = null, curS = null, sheetScope = null;
    root.classList.add('det');
    N.stage.details(true); N.stage.dim(0);
    var sk = el('div', 'skel-wrap'), skb = el('div', 'sk-bb'); skb.style.top = '240px';
    [[640, 64, 0], [420, 28, 20], [760, 28, 20]].forEach(function (s) { var x = el('div', 'bar'); x.style.width = s[0] + 'px'; x.style.height = s[1] + 'px'; x.style.marginTop = s[2] + 'px'; skb.appendChild(x); });
    sk.appendChild(skb); root.appendChild(sk);

    function load() {
      var wantStream = N.isLoggedIn();
      N.api.get('single', { post_id: params.id }).then(function (post) {
        if (dead) return;
        N.stage.show(post, { immediate: true });
        var free = post.options && post.options.free_stream;
        var sp = (wantStream || free) ? N.api.call('stream', { post_id: post.id, free_stream: wantStream ? 0 : 1 }).then(function (j) {
          return (j && j.success) ? j.result : null;
        }).catch(function () { return null; }) : Promise.resolve(null);
        return sp.then(function (st) { if (!dead) render(post, st); });
      }).catch(function (e) { if (!dead) errorView(root, e, function () { root.innerHTML = ''; root.appendChild(sk); load(); }); });
    }
    function render(post, st) {
      root.removeChild(sk);
      var items = (st && st.hls ? st.hls.slice() : []);
      items.sort(ui.epCmp);
      var resume = st && st.continue_watching && st.continue_watching.file_id ? st.continue_watching : null;
      var po = post.options || {}, isSeries = !!po.is_series;
      var tmOn = N.tmdb.enabled(), dpage = el('div', 'd-page'), col = el('div', 'det-col');
      if (tmOn) root.classList.add('tm');
      var eb = el('div', 'd-eyebrow d-fade', ui.typeLabel(post, true));
      if (po.persian_subtitle) eb.appendChild(el('em', '', N.t('persianSub')));
      col.appendChild(eb);
      var titleEl = el('div', 'd-title', N.title(post)); col.appendChild(titleEl);
      if (tmOn) { titleEl.textContent = ''; titleEl.appendChild(el('span', 'tt', N.title(post))); }
      var o = other(post); if (o) col.appendChild(el('div', 'd-alt', o));
      var tagEl = null; if (tmOn) { tagEl = el('div', 'd-tag'); tagEl.dir = 'auto'; col.appendChild(tagEl); }
      var meta = ui.meta(post, 3); meta.classList.add('d-meta'); col.appendChild(meta);
      var plot = el('div', 'd-plot d-fade', N.plot(post)); col.appendChild(plot);
      var btns = el('div', 'd-btns d-fade'); col.appendChild(btns);
      var castEl = null;
      if (post.cast && post.cast.length) { castEl = el('div', 'd-cast d-fade', N.t('cast') + ': ' + post.cast.slice(0, 6).map(function (x) { return x.name; }).join(', ')); col.appendChild(castEl); }
      dpage.appendChild(col); root.appendChild(dpage);

      var startIdx = 0;
      if (resume) items.forEach(function (it, i) { if (it.info && String(it.info.file_id) === String(resume.file_id)) startIdx = i; });
      function play(i, withResume) {
        // leaving for the player: remember where we were, and fully hide the episodes sheet (it would otherwise be drawn over the video)
        backToSheet = epsOpen; lastFocus = epsOpen ? null : N.nav.cur; if (epsOpen) { epMem[curS] = i; clearTimeout(swT); swT = null; hideEps(); }
        N.player.start(post, items, i, withResume ? resume : null);
      }
      var info0 = items[startIdx] && items[startIdx].info || {};
      var playLabel = resume ? N.t('resume') + (isSeries ? ' S' + (info0.season || 1) + '·E' + ui.epLabel(info0.episode, startIdx + 1) : '') : N.t('play');
      var playB;
      if (items.length) playB = ui.btn(playLabel, function () { play(startIdx, true); }, 'primary', 'play');
      else playB = ui.btn(N.t('play'), function () { N.toast(N.isLoggedIn() ? N.t('noStream') : N.t('playLogin'), 3500); }, 'primary', 'play');
      btns.appendChild(playB);
      var epB = null;
      if (isSeries && items.length) { epB = ui.btn(N.t('episodes'), function () { openEps(); }, '', 'list'); btns.appendChild(epB); }
      N.currentPost = post;
      function listBtn(n) {
        var b = ui.btn('', function () { N.lists.toggle(n, post); paintB(); }, 'icon ' + n, n === 'watch' ? 'bookmark' : 'heart');
        function paintB() { var on = N.lists.has(n, post.id); b.classList.toggle('on', on); b.lastChild.textContent = N.t(n === 'watch' ? (on ? 'inWatch' : 'addWatch') : (on ? 'liked1' : 'like')); }
        paintB(); b._paint = paintB; btns.appendChild(b); return b;
      }
      var wB = listBtn('watch'), lB = listBtn('like');
      N.onListChange = function () { wB._paint(); lB._paint(); };
      wB.onfocus2 = lB.onfocus2 = function () { setX(false); };

      /* episodes sheet */
      var sheet = null, tabs = null, wrap = null, track = null, tmeta = null, seasons = [], map = {}, epMem = {}, tileBy = {}, backToSheet = false;
      if (epB) {
        sheet = el('div', 'sheet-eps'); tabs = el('div', 'tabs'); wrap = el('div', 'eptrack-w'); track = el('div', 'eptrack'); wrap.appendChild(track);
        tmeta = el('div', 'tabs-meta tab'); sheet.appendChild(tabs); sheet.appendChild(tmeta); sheet.appendChild(wrap); root.appendChild(sheet);
        items.forEach(function (it, i) { var s = (it.info && it.info.season) || 1; if (!map[s]) { map[s] = []; seasons.push(s); } map[s].push(i); });
        seasons.forEach(function (s, si) {
          var t = ui.pill(N.t('season') + ' ' + s, function () { focusEp(); }, false); t._s = s;
          t.onfocus2 = function () { showSeason(s); };
          t.onnav = function (dir) {
            if (dir === 'down') { flush(); return epTarget(curS) || true; }
            if (dir === 'up') return true;
            var d = ui.step(dir), n = tabs.children[si + d]; return n || true;
          };
          tabs.appendChild(t);
        });
      }
      // tile to focus when entering season s: the remembered episode (an index, never a node: tiles are rebuilt on every season switch), else the first
      function epTarget(s) { var i = epMem[s]; return (i !== undefined && tileBy[i]) || track.firstChild; }
      function buildSeason(s) {
        track.innerHTML = ''; tileBy = {}; var tiles = [];
        map[s].forEach(function (idx) {
          var it = items[idx], prog = 0;
          if (resume && it.info && String(it.info.file_id) === String(resume.file_id) && Number(resume.duration) > 0) prog = Number(resume.time) / Number(resume.duration);
          var t = ui.epTile(it, idx, { progress: prog });
          t.onclick = function () { play(idx, true); };
          t.onfocus2 = function () { ui.slideTo(track, t._x); epMem[s] = idx; };
          t.onnav = function (dir) {
            if (dir === 'up') { for (var q = 0; q < tabs.children.length; q++) if (tabs.children[q]._s === curS) return tabs.children[q]; return true; }
            if (dir === 'down') return true;
            var d = ui.step(dir), i = tiles.indexOf(t); return tiles[i + d] || true;
          };
          t._idx = idx; tileBy[idx] = t; track.appendChild(t); tiles.push(t);
        });
        ui.layoutTrack(track, tiles, tiles.map(function () { return 360; }));
        // position the track for the remembered tile (no animation, nothing carried over from another season)
        var tg = epTarget(s);
        track.style.transition = 'none'; track._s = null; track.style.transform = ''; ui.slideTo(track, tg ? tg._x : 184); void track.offsetWidth; track.style.transition = '';
        tmeta.textContent = tiles.length + ' ' + N.t('episodes');
      }
      function showSeason(s, now) {
        if (s === curS) return; curS = s;
        for (var q = 0; q < tabs.children.length; q++) tabs.children[q].classList.toggle('cur', tabs.children[q]._s === s);
        clearTimeout(swT); swT = null;
        if (now) { buildSeason(s); wrap.classList.remove('sw'); return; }
        wrap.classList.add('sw'); swT = setTimeout(function () { swT = null; buildSeason(s); wrap.classList.remove('sw'); }, 160);
      }
      function flush() { if (swT) { clearTimeout(swT); swT = null; buildSeason(curS); wrap.classList.remove('sw'); } }
      function focusEp() { flush(); var t = epTarget(curS); if (t) N.nav.focus(t, true); }
      // open the sheet on episode index idx (default: resume/start episode); inst = no slide animation (restoring after playback)
      function openEps(idx, inst) {
        if (epsOpen || !sheet) return; epsOpen = true;
        if (idx === undefined || idx === null || !items[idx]) idx = startIdx;
        var s0 = (items[idx].info && items[idx].info.season) || seasons[0];
        epMem[s0] = idx; curS = null; showSeason(s0, true);
        if (inst) { root.classList.add('inst'); }
        root.classList.add('eps'); sheetScope = sheet; N.nav.pushScope(sheet);
        if (inst) { void root.offsetWidth; setTimeout(function () { root.classList.remove('inst'); }, 60); }
        N.nav.focus(epTarget(s0), true);
      }
      // hide the sheet completely (leave it for playback): visibility is hidden as soon as .eps goes away
      function hideEps() {
        if (!epsOpen) return; epsOpen = false; root.classList.remove('eps'); N.nav.popScope(); sheetScope = null;
      }
      function closeEps() {
        if (!epsOpen) return; epsOpen = false; root.classList.remove('eps'); N.nav.popScope(); sheetScope = null;
        N.nav.focus(epB, true);
      }
      btns.onnav = function (dir, cur) {
        if (dir === 'down') { var fx = xFirst(); if (fx) return fx; if (epB) { openEps(); return true; } return true; }
        if (dir === 'up') return true;
        return false;
      };
      function heroFocus() { setX(false); }
      playB.onfocus2 = heroFocus; if (epB) epB.onfocus2 = heroFocus;
      current.back = function () {
        if (rvOpen) { closeReview(); return true; }
        if (epsOpen) { closeEps(); return true; }
        if (xOn) { N.nav.focus(playB, true); heroFocus(); return true; }
        return false;
      };
      current.closeRv = function () { if (rvOpen) { N.nav.popScope(); rvOpen = null; } };

      /* ---------- TMDB extras (progressive; absent without a token) ---------- */
      var xEl = null, xRows = [], xOn = false, rvOpen = null;
      function setX(on) {
        if (on === xOn) return; xOn = on; root.classList.toggle('xs', on); N.stage.dim(on ? 0.55 : 0);
        if (!on) { dpage._ty = 0; dpage.style.transform = ''; for (var k = 0; k < xRows.length; k++) { xRows[k].tr.style.transition = 'none'; xRows[k].tr._s = null; ui.slideTo(xRows[k].tr, 0); xRows[k].mem = 0; xRows[k].el.classList.remove('cur'); void xRows[k].tr.offsetWidth; xRows[k].tr.style.transition = ''; } }
      }
      function xFirst() { var r = xRows[0]; return r ? r.cs[Math.min(r.mem, r.cs.length - 1)] : null; }
      function fmtDate(iso) {
        try { var d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString(N.lang === 'fa' ? 'fa-IR' : 'en-US', { month: 'short', day: 'numeric' }); } catch (e) { return iso; }
      }
      function statusText(s) {
        if (N.lang !== 'fa') return s;
        var m = { 'Returning Series': 'در حال پخش', 'Ended': 'پایان‌یافته', 'Canceled': 'لغو شده', 'In Production': 'در حال تولید', 'Planned': 'برنامه‌ریزی‌شده', 'Pilot': 'پایلوت' };
        return m[s] || s;
      }
      function xRowAdd(key, title, height) {
        var row = el('div', 'hrow'), hd = el('div', 'hrow-h', title), tr = el('div', 'track'), r = { key: key, el: row, tr: tr, cs: [], ws: [], mem: 0 };
        row.style.height = height + 'px'; row.appendChild(hd); row.appendChild(tr);
        xRows.push(r); xEl.appendChild(row); return r;
      }
      function xCard(r, c, w) {
        var i = r.cs.length;
        c.onfocus2 = function () { r.mem = i; ui.slideTo(r.tr, c._x); setX(true); ui.vscroll(dpage, r.el, 250); for (var k = 0; k < xRows.length; k++) xRows[k].el.classList.toggle('cur', xRows[k] === r); };
        r.tr.appendChild(c); r.cs.push(c); r.ws.push(w); ui.layoutTrack(r.tr, r.cs, r.ws);
      }
      function initials(n) { var p = String(n || '').split(/\s+/); return ((p[0] || '').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase(); }
      function faceCard(p, role) {
        var c = el('div', 'card f k-face'), ph = el('div', 'fph');
        ph.appendChild(el('span', '', initials(p.n)));
        if (p.p) { var im = el('img', 'im'); im.alt = ''; im.decoding = 'async'; im.onload = function () { im.classList.add('in'); }; im.src = N.tmdb.img(p.p, 'w185'); ph.appendChild(im); }
        c.appendChild(ph); c.appendChild(el('div', 'fnm', p.n)); c.appendChild(el('div', 'frl', role || ''));
        return c;
      }
      function revCard(rv) {
        var c = el('div', 'card f k-rev'), h = el('div', 'rvh');
        h.appendChild(el('span', 'rva', rv.a || '-'));
        if (rv.r) h.appendChild(el('span', 'rvr tab', '★ ' + rv.r));
        c.appendChild(h); c.appendChild(el('div', 'rvt', rv.t.replace(/\s+/g, ' ')));
        c.onclick = function () { openReview(rv); };
        return c;
      }
      function openReview(rv) {
        if (rvOpen) return;
        var m = el('div', 'rv-sheet'), box = el('div', 'rv-box'), hd = el('div', 'rv-h'), bodyW = el('div', 'rv-body'), txt = el('div', 'rv-text', rv.t), off = 0;
        txt.dir = 'auto';
        hd.appendChild(el('span', 'rva', rv.a || '-')); if (rv.r) hd.appendChild(el('span', 'rvr tab', '★ ' + rv.r)); if (rv.d) hd.appendChild(el('span', 'rvd tab', rv.d));
        bodyW.appendChild(txt); box.appendChild(hd); box.appendChild(bodyW);
        var cb = ui.btn(N.t('close'), function () { closeReview(); }, 'primary');
        cb.onnav = function (dir) {
          if (dir === 'up' || dir === 'down') {
            var mx = Math.max(0, txt.offsetHeight - bodyW.offsetHeight); off = Math.max(0, Math.min(mx, off + (dir === 'down' ? 200 : -200)));
            txt.style.transform = 'translateY(' + (-off) + 'px)'; return true;
          }
          return true;
        };
        var ft = el('div', 'rv-f'); ft.appendChild(cb); ft.appendChild(el('span', 'rv-hint', N.t('scrollHint'))); box.appendChild(ft);
        m.appendChild(box); root.appendChild(m); rvOpen = { el: m, prev: N.nav.cur };
        N.nav.pushScope(m); void m.offsetWidth; m.classList.add('show'); N.nav.focus(cb, true);
      }
      function closeReview() {
        if (!rvOpen) return; var o = rvOpen; rvOpen = null; N.nav.popScope(); o.el.classList.remove('show');
        setTimeout(function () { if (o.el.parentNode) o.el.parentNode.removeChild(o.el); }, 260);
        if (o.prev && o.prev.offsetWidth > 0) N.nav.focus(o.prev, true);
      }
      function xNav(dir, cur) {
        var ri = -1, i = -1, k;
        for (k = 0; k < xRows.length && ri < 0; k++) { var ix = xRows[k].cs.indexOf(cur); if (ix >= 0) { ri = k; i = ix; } }
        if (ri < 0) return false;
        var s2 = (dir === 'left' || dir === 'right') ? ui.step(dir) : 0;
        if (s2) { var ni = i + s2; if (ni < 0) { N.rail.enter(); return true; } return xRows[ri].cs[ni] || true; }
        if (dir === 'down') { var nr = xRows[ri + 1]; return nr ? nr.cs[Math.min(nr.mem, nr.cs.length - 1)] : true; }
        if (dir === 'up') { if (ri === 0) return playB; var pr = xRows[ri - 1]; return pr.cs[Math.min(pr.mem, pr.cs.length - 1)]; }
        return true;
      }
      function paintTmdb(d) {
        if (tagEl && d.tagline) { tagEl.textContent = d.tagline; tagEl.classList.add('in'); }
        if (d.logo) {
          var li = el('img', 'logo'); li.alt = ''; li.decoding = 'async';
          li.onload = function () { if (dead) return; titleEl.appendChild(li); void li.offsetWidth; li.classList.add('in'); titleEl.classList.add('has-logo'); };
          li.src = N.tmdb.img(d.logo, 'w500');
        }
        if (d.votes >= 5 && d.rating) { meta.appendChild(el('span', 'tmdb tab fadein', 'TMDB ' + d.rating.toFixed(1))); }
        if (d.next && isSeries) {
          eb.appendChild(el('span', 'd-next fadein', (d.next.e === 1 ? N.t('newSeason') + (d.next.s > 1 ? ' ' + d.next.s : '') : N.t('nextEp') + ' · ⁦S' + d.next.s + 'E' + d.next.e + '⁩') + ' · ' + fmtDate(d.next.d)));
        }
        var bits = [];
        if (isSeries && d.status) bits.push(statusText(d.status));
        if (!(post.info && post.info.time && post.info.time.default) && d.runtime) bits.push(ui.duration(d.runtime));
        if (d.nets.length) bits.push(d.nets.join(', '));
        if (bits.length && d.cast.length) {
          if (!castEl) { castEl = el('div', 'd-cast d-fade'); col.appendChild(castEl); }
          castEl.textContent = bits.join(' · '); castEl.classList.add('fadein');
        }
        if (d.bd) {
          var tb = N.tmdb.img(d.bd, 'w1280'), cv = ui.coverUrl(post);
          if (!cv) { post._bd = tb; N.stage.show(post, { immediate: true }); }
          else {
            var ci = new Image();
            ci.onload = function () { if (dead) return; if (ci.naturalWidth && ci.naturalWidth < 1280) { post._bd = tb; post._bdPref = true; N.stage.show(post, { immediate: true }); } };
            ci.src = cv;
          }
        }
        xEl = el('div', 'd-x'); xEl.appendChild(el('div', 'd-x-bg')); xEl.onnav = xNav; dpage.appendChild(xEl);
        if (d.cast.length) { var rc2 = xRowAdd('cast', N.t('cast'), 364); d.cast.forEach(function (p) { xCard(rc2, faceCard(p, p.c), 180); }); }
        if (d.crew.length) { var rr = xRowAdd('crew', N.t('crew'), 364); d.crew.forEach(function (p) { xCard(rr, faceCard(p, N.t(p.j)), 180); }); }
        if (d.reviews.length) { var rv = xRowAdd('rev', N.t('reviews'), 388); d.reviews.forEach(function (x) { xCard(rv, revCard(x), 520); }); }
        if (d.recs.length) {
          var recRow = null, got = {}, n = 0, queued = [];
          var addRec = function (p) {
            var c = ui.card(p, 'poster', { caption: true }); c.onclick = function () { N.go('details', { id: p.id }); }; xCard(recRow, c, 248); ui.load(c);
          };
          d.recs.slice(0, 20).forEach(function (it) {
            N.tmdb.resolve(it, function () { return !dead && n < 12; }).then(function (p) {
              if (dead || !p || p.id === post.id || got[p.id] || n >= 12) return;
              got[p.id] = 1; n++;
              if (!recRow) {
                queued.push(p); if (queued.length < 3) return;
                recRow = xRowAdd('rec', N.t('moreLikeThis'), 560); queued.forEach(addRec); return;
              }
              addRec(p);
            });
          });
        }
      }
      if (tmOn) N.tmdb.details(post).then(function (d) { if (!dead && d) paintTmdb(d); }).catch(function () {});
      current.onPlayerClosed = function () {
        if (backToSheet && sheet) { backToSheet = false; openEps(N.player.index, true); return; } // same season, on the episode just played (or the one autoplay moved to)
        var t = lastFocus && document.body.contains(lastFocus) && lastFocus.offsetWidth > 0 ? lastFocus : playB; N.nav.focus(t, true);
      };
      N.nav.focus(playB, true);
      if (params.autoplay) {
        if (items.length) play(startIdx, true); else N.toast(N.isLoggedIn() ? N.t('noStream') : N.t('playLogin'), 3500);
      }
    }
    var current = { destroy: function () { dead = true; N.onListChange = null; clearTimeout(swT); if (sheetScope) { N.nav.popScope(); sheetScope = null; } if (current.closeRv) current.closeRv(); } };
    load();
    return current;
  };

  /* ================= Search ================= */
  var KB = {
    en: { cols: 7, keys: 'abcdefghijklmnopqrstuvwxyz0123456789'.split('') },
    fa: { cols: 8, keys: 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی۰۱۲۳۴۵۶۷۸۹'.split('') }
  };
  S.search = function (root) {
    var dead = false, seq = 0, timer = null, q = '', kbLang = N.lang === 'fa' ? 'fa' : 'en', swT = null;
    root.classList.add('search');
    N.stage.dim(0.72);
    var panel = el('div', 'panel'); root.appendChild(panel);
    var field = el('div', 'qfield'), qt = el('span', 'qt'), ph = el('span', 'ph-t', N.t('searchPh')), caret = el('i', 'caret');
    field.appendChild(qt); field.appendChild(ph); field.appendChild(caret); panel.appendChild(field);
    var kb = el('div', 'kb ' + kbLang), grid = el('div', 'grid'), fn = el('div', 'fn');
    kb.appendChild(grid); kb.appendChild(fn); panel.appendChild(kb);
    panel.appendChild(el('div', 'kb-hint', N.t('kbHint')));
    var hid = el('input'); hid.type = 'text'; hid.setAttribute('autocomplete', 'off'); hid.style.cssText = 'position:absolute;left:-2000px;top:0;width:10px;height:10px';
    root.appendChild(hid);

    var res = el('div', 'results'), rh = el('div', 'rh'), rw = el('div', 'rgrid-w'), rg = el('div', 'rgrid');
    rw.appendChild(rg); res.appendChild(rh); res.appendChild(rw); root.appendChild(res);
    rw.reveal = function (e) { ui.vscroll(rw, e._cell || e, 300); };

    function key(label, cls, fn2) {
      var k = el('button', 'key f fl' + (cls ? ' ' + cls : ''));
      if (typeof label === 'string') k.textContent = label; else k.appendChild(label);
      k.onclick = fn2; return k;
    }
    function layout() {
      grid.innerHTML = ''; fn.innerHTML = ''; kb.className = 'kb ' + kbLang;
      var L = KB[kbLang]; grid.style.width = (L.cols * 72) + 'px'; grid.dir = kbLang === 'fa' ? 'rtl' : 'ltr';
      L.keys.forEach(function (c) { grid.appendChild(key(c, '', function () { type(c); })); });
      var sp = key(N.t('space'), 'sp', function () { type(' '); });
      fn.appendChild(sp);
      fn.appendChild(key('⌫', '', function () { q = q.slice(0, -1); changed(); }));
      fn.appendChild(key(N.t('clearK'), '', function () { q = ''; changed(); }));
      var lk = key(kbLang === 'en' ? 'فا' : 'EN', '', function () { kbLang = kbLang === 'en' ? 'fa' : 'en'; layout(); N.nav.focus(fn.children[3], true); });
      fn.appendChild(lk);
      var mic = key(ui.icon('mic'), '', function () { hid.value = q; N.nav.focus(hid); });
      fn.appendChild(mic);
      fn.style.width = (L.cols * 72) + 'px';
    }
    function type(c) { if (q.length < 60) { q += c; changed(); } }
    function changed() {
      qt.textContent = q; ph.style.display = q ? 'none' : '';
      clearTimeout(timer); timer = setTimeout(run, 500);
    }
    hid.oninput = function () { q = hid.value; changed(); };
    hid.onenter = function () { hid.blur(); var mic = fn.lastChild; N.nav.focus(mic, true); clearTimeout(timer); run(); };
    // physical keyboard (desktop testing / USB keyboards)
    function onKeyDown(e) {
      if (document.activeElement === hid || e.ctrlKey || e.altKey || e.metaKey || !e.key || e.key.length !== 1) return;
      if (N.player.open || document.querySelector('.modal')) return;
      type(e.key.toLowerCase());
    }
    document.addEventListener('keydown', onKeyDown);

    function show(posts, header, msg) {
      clearTimeout(swT); rg.classList.add('sw');
      swT = setTimeout(function () {
        if (dead) return; rg.innerHTML = ''; rh.textContent = header;
        if (msg) { var m = el('div', 'nores', msg); m.style.flexBasis = '100%'; m.style.position = 'relative'; m.style.top = '0'; m.style.marginBottom = '24px'; rg.appendChild(m); }
        posts.forEach(function (p, i) {
          var cell = ui.cell(p); if (i < 12) { cell.classList.add('fadein'); cell.style.animationDelay = (i * 15) + 'ms'; }
          cell.card.onclick = function () { N.go('details', { id: p.id }); };
          cell.card.onfocus2 = function () { if (i < 15) { for (var k = 0; k < rg.children.length && k < 40; k++) { var cc = rg.children[k].card; if (cc) ui.load(cc); } } };
          rg.appendChild(cell);
        });
        for (var k = 0; k < rg.children.length && k < 15; k++) if (rg.children[k].card) ui.load(rg.children[k].card);
        rw.style.transition = 'none'; rw._ty = null; rw.style.transform = ''; void rw.offsetWidth; rw.style.transition = '';
        rg.classList.remove('sw');
        for (var j = 0; j < rg.children.length; j++) if (rg.children[j].card) ui.load(rg.children[j].card);
      }, 120);
    }
    function popular(msg) {
      N.getHome().then(function (h) { if (dead) return; var ps = (h.suggested && h.suggested.posts) || (h.movies && h.movies.posts) || []; show(ps.slice(0, 15), N.t('popularNow'), msg); }).catch(function () {});
    }
    function run() {
      var qq = q.trim(); var my = ++seq;
      if (!qq) { popular(''); return; }
      N.api.get('search', { query: qq, streamonly: 0, page: 1 }).then(function (r) {
        if (dead || my !== seq) return;
        if (!r.posts || !r.posts.length) { popular(N.t('nothingFor') + ' “' + qq + '”'); return; }
        show(r.posts, N.t('topResults'), '');
      }).catch(function (e) { if (!dead && my === seq) popular(N.t('error') + '. ' + N.t('tryAgain')); });
    }
    layout(); popular('');
    N.nav.focus(grid.firstChild, true);
    return { destroy: function () { dead = true; clearTimeout(timer); clearTimeout(swT); document.removeEventListener('keydown', onKeyDown); } };
  };

  /* ================= Poster grid (5 columns, two rows per screen) ================= */
  function posterGrid(box, posts, o) {
    o = o || {}; var grid = el('div', 'ggrid'), cells = [];
    if (o.top) grid.style.top = o.top + 'px';
    box.appendChild(grid);
    box.reveal = function (e) { var ty = ui.vscroll(box, e._cell || e, 600); box.classList.toggle('scrolled', ty < 0); };
    if (!posts.length && o.empty) { var m = el('div', 'nores', o.empty); m.style.position = 'relative'; m.style.top = '0'; grid.appendChild(m); }
    posts.forEach(function (p, i) {
      var cell = ui.cell(p), c = cell.card; cells.push(cell); grid.appendChild(cell);
      c.onclick = function () { N.go('details', { id: p.id }); };
      c.onfocus2 = function () { for (var k = Math.max(0, i - 5); k < Math.min(cells.length, i + 15); k++) ui.load(cells[k].card); };
      if (i < 15) ui.load(c);
    });
    return { grid: grid, cells: cells };
  }

  /* ================= Watchlist / Liked ================= */
  S.list = function (root, params, restore) {
    var name = params.name === 'like' ? 'like' : 'watch', g = null;
    root.classList.add('archive', 'gridpage'); N.stage.dim(0.72);
    var box = el('div', 'arch'); root.appendChild(box);
    function paint() {
      box.innerHTML = ''; box._ty = null; box.style.transform = '';
      var posts = N.lists.all(name), head = el('div', 'head ah', N.t(name === 'like' ? 'liked' : 'watchlist'));
      head.appendChild(el('small', 'tab', posts.length ? String(posts.length) : '')); box.appendChild(head);
      box.appendChild(el('div', 'head lhint', N.t(name === 'like' ? 'likeHint' : 'watchHint')));
      g = posterGrid(box, posts, { empty: N.t('listEmpty'), top: 214 });
    }
    paint();
    var want = restore && restore.idx || 0;
    if (g.cells[want] || g.cells[0]) N.nav.focus((g.cells[want] || g.cells[0]).card, true);
    // removing the focused title from this list: rebuild and keep the position
    N.onListChange = function (n) {
      if (n !== name) return; var idx = 0; for (var i = 0; i < g.cells.length; i++) if (g.cells[i].card === N.nav.cur) idx = i;
      paint(); var c = g.cells[Math.min(idx, g.cells.length - 1)]; if (c) N.nav.focus(c.card, true); else N.nav.clear();
    };
    return {
      destroy: function () { N.onListChange = null; },
      focusState: function () { for (var i = 0; i < g.cells.length; i++) if (g.cells[i].card === N.nav.cur) return { idx: i }; return null; }
    };
  };

  /* ================= Archive ================= */
  var menuCache = null;
  N.getMenu = function () {
    if (menuCache) return Promise.resolve(menuCache);
    var st = N.store.get('menuSaved', null);
    var net = N.api.get('menu').then(function (m) { menuCache = m; N.store.set('menuSaved', { t: Date.now(), m: m }); return m; });
    if (st && st.m && Date.now() - st.t < 3 * 24 * 3600 * 1000) { net.catch(function () {}); return Promise.resolve(st.m); }
    return net;
  };
  // the IMDb Top 250 list, if 30nama's menu offers one (category or genre whose slug/name mentions 250)
  function top250Item(m) {
    var all = (m && m.categories || []).concat(m && m.genres || []), hit = null;
    all.forEach(function (c) { var t = (c.slug || '') + ' ' + (c.name || ''); if (!hit && /250/.test(t) && /imdb|top|برتر/i.test(t)) hit = c; });
    if (!hit) all.forEach(function (c) { if (!hit && /(^|[^0-9])250([^0-9]|$)/.test((c.slug || '') + ' ' + (c.name || ''))) hit = c; });
    return hit;
  }
  S.archive = function (root, params, restore) {
    if (params && params.slug) return archiveList(root, params, restore);
    var dead = false;
    root.classList.add('archive'); N.stage.dim(0.72);
    var box = el('div', 'arch'); root.appendChild(box);
    box.reveal = function (e) { var ty = ui.vscroll(box, e, 260); box.classList.toggle('scrolled', ty < 0); };
    var sk = el('div', 'msg', N.t('loading')); sk.style.cssText = 'position:absolute;top:300px;left:184px'; root.appendChild(sk);
    function show(m) {
      if (dead) return; root.removeChild(sk);
      box.appendChild(el('div', 'ah head', N.t('browse')));
      var cats = el('div', 'cats'); box.appendChild(cats);
      (m.categories || []).forEach(function (c) { cats.appendChild(ui.pill(c.name, function () { N.go('archive', { slug: c.slug, name: c.name }); }, false)); });
      box.appendChild(el('div', 'sec-h', N.t('genres')));
      var tiles = el('div', 'tiles'); box.appendChild(tiles);
      var all = [];
      (m.genres || []).forEach(function (g, i) {
        var im = g.image || {}, u = (im.webp && (im.webp.full || im.webp.thumb)) || (im.jpg && (im.jpg.full || im.jpg.thumb)) || '';
        var c = ui.card({ id: g.id, title: { english: g.name } }, 'tile', { image: u, name: g.name, count: g.count });
        c.onclick = function () { N.go('archive', { slug: g.slug, name: g.name }); };
        c.onfocus2 = function () { for (var k = Math.max(0, i - 4); k < Math.min(all.length, i + 12); k++) ui.load(all[k]); };
        tiles.appendChild(c); all.push(c); if (i < 8) ui.load(c);
      });
      N.nav.focus(cats.firstChild, true);
    }
    N.getMenu().then(function (m) { show(m); }).catch(function (e) { if (!dead) errorView(root, e, function () { N.go('archive', {}, { replace: true }); }); });
    return { destroy: function () { dead = true; } };
  };

  var SORTS = [['new', 'newest'], ['soon', 'soonTab'], ['favorite', 'popular'], ['update', 'updated']];
  /* "Newest" = newest releases. 30nama's orderby=date is the date a title was ADDED to the site, so old films added
     recently came first. The API's release-year key is not documented: try likely keys once, keep the first whose results
     really come back newest-year-first, otherwise fall back to date-added order sorted by year on the TV. */
  var NEW_KEYS = ['year', 'release_year', 'release', 'release_date', 'publish_year'];
  function yearOf(p) { return Number((p.info || {}).year) || 0; }
  function sortedByYear(posts) {
    var ys = (posts || []).map(yearOf).filter(Boolean); if (ys.length < 6) return false;
    var bad = 0; for (var i = 1; i < ys.length; i++) if (ys[i] > ys[i - 1]) bad++;
    return bad <= Math.floor(ys.length * 0.1) && ys[0] >= new Date().getFullYear() - 3;
  }
  function byYearDesc(r) { if (r && r.posts) r.posts = r.posts.slice().sort(function (a, b) { return yearOf(b) - yearOf(a); }); return r; }
  function isSoon(p) { return !!(p && p.options && p.options.coming_soon); }
  // bg = background prefetch: low-priority request queue (anything the user opens goes first)
  function archivePage(slug, sort, page, bg) {
    // Newest without the not-yet-streamable titles; they get their own "Soon" tab
    if (sort === 'new') return archivePage1(slug, 'new', page, bg).then(function (r) { return r && r.posts ? Object.assign({}, r, { posts: r.posts.filter(function (p) { return !isSoon(p); }) }) : r; });
    if (sort === 'soon') return soonList(slug, bg);
    if (sort === 'top250') return top250List(bg);
    return archivePage1(slug, sort, page, bg);
  }
  /* First page of every tab is also kept on the TV between launches: shown instantly, refreshed quietly behind it. */
  var KEEP_MS = 3 * 24 * 3600 * 1000, FRESH_MS = 10 * 60 * 1000;
  // background work (prefetch / quiet refresh) only while the app is on screen and nothing is playing
  N.bgOk = function () { return !document.hidden && !(N.player && N.player.open); };
  function slimPost(p) { return { id: p.id, title: p.title, plot: p.plot, image: p.image, info: p.info, score: p.score, genre: p.genre, options: p.options }; }
  function saved(k) { var e = N.store.get('ac.' + k, null); return e && e.r && Date.now() - e.t < KEEP_MS ? e : null; }
  function save(k, r) { if (r && r.posts) N.store.set('ac.' + k, { t: Date.now(), r: { posts: r.posts.map(slimPost), total: r.total, pages: r.pages } }); }
  function cached(k, persist, fetch) {
    var hit = N.archiveCache.get(k); if (hit) return hit;
    var fresh = function () { var pr = fetch(); if (persist) pr.then(function (r) { save(k, r); }, function () {}); return pr; };
    var old = persist && saved(k);
    if (old) {
      var shown = N.archiveCache.put(k, Promise.resolve(old.r));
      if (Date.now() - old.t > FRESH_MS && N.bgOk()) { var nf = fresh(); nf.then(function () { N.archiveCache.put(k, nf); }, function () {}); }
      return shown;
    }
    return N.archiveCache.put(k, fresh());
  }
  function imdbOf(p) { var sc = p.score || {}; return Number(sc.imdb && sc.imdb.score) || 0; }
  function top250List(bg) {
    return N.getMenu().then(function (m) {
      var it = top250Item(m); if (!it) return { posts: [], total: 0, pages: 1 };
      return cached('top250|' + it.slug, true, function () {
        var out = [], seen = {}, n = 1, total = 13;
        function step() {
          if (n > total) { out.sort(function (a, b) { return imdbOf(b) - imdbOf(a); }); return { posts: out.slice(0, 250), total: Math.min(250, out.length), pages: 1 }; }
          return archivePage0(it.slug, 'favorite', n++, bg).then(function (r) {
            if (r && r.pages) total = Math.min(13, r.pages);
            (r && r.posts || []).forEach(function (p) { if (!seen[p.id]) { seen[p.id] = 1; out.push(p); } });
            return step();
          }, function (e) { if (!out.length) throw e; n = total + 1; return step(); });
        }
        return step();
      });
    });
  }
  // "Soon": upcoming titles collected from the first pages of Newest (where they sit, sorted by year). One page.
  var SOON_PAGES = 6;
  function soonList(slug, bg) {
    return cached(slug + '|soon', true, function () {
      var out = [], seen = {}, n = 1, total = SOON_PAGES;
      function step() {
        if (n > total) return { posts: out.sort(function (a, b) { return yearOf(b) - yearOf(a); }), total: out.length, pages: 1 };
        return archivePage1(slug, 'new', n++, bg, true).then(function (r) {
          if (r && r.pages) total = Math.min(SOON_PAGES, r.pages);
          (r && r.posts || []).forEach(function (p) { if (isSoon(p) && !seen[p.id]) { seen[p.id] = 1; out.push(p); } });
          return step();
        }, function (e) { if (!out.length && n <= 2) throw e; n = total + 1; return step(); });
      }
      return step();
    });
  }
  // noSaved: Soon must read real pages, not a remembered copy of page 1
  function archivePage1(slug, sort, page, bg, noSaved) {
    var k = slug + '|' + sort + '|' + page;
    if (noSaved) { var h = N.archiveCache.get(k); return h || N.archiveCache.put(k, archivePage0(slug, sort, page, bg)); }
    return cached(k, page === 1 || (sort === 'new' && page <= 4), function () { return archivePage0(slug, sort, page, bg); });
  }
  // after Home is up: every tab of Movies / Series / Anime, one request at a time on the low-priority queue
  N.prefetchArchives = function () {
    if (N._pref || !N.store.get('newestKey', null)) return; N._pref = true;
    var jobs = [];
    ['new', 'favorite', 'update', 'soon'].forEach(function (so) { ['movies', 'series', 'anime'].forEach(function (sl) { jobs.push([sl, so]); }); });
    var i = 0;
    (function one() {
      if (i >= jobs.length) return;
      if (!N.bgOk()) { setTimeout(one, 5000); return; } // paused while watching / while the app is in the background
      var j = jobs[i++];
      var known = N.archiveCache.get(j[0] + '|' + (j[1] === 'soon' ? 'soon' : j[1] + '|1'));
      if (known) return one();
      archivePage(j[0], j[1], 1, true).then(function (r) {
        (r && r.posts || []).slice(0, 10).forEach(function (p) { var u = ui.posterUrl(p); if (u) { var im = new Image(); im.src = u; } });
        setTimeout(one, 1200);
      }, function () { setTimeout(one, 5000); });
    })();
  };
  // finding the release-year key: once for the whole app (shared promise), never in parallel.
  // Only a real answer from the server counts; a network / rate-limit error decides nothing.
  var keyHunt = null;
  function newestKey(slug) {
    var k = N.store.get('newestKey', null); if (k) return Promise.resolve(k);
    if (keyHunt) return keyHunt;
    var i = 0;
    function next() {
      if (i >= NEW_KEYS.length) { N.store.set('newestKey', 'client'); return 'client'; }
      var key = NEW_KEYS[i++];
      return N.api.get('archive', { slugs: slug, streamonly: 1, page: 1, orderby: key, order: 'desc' }).then(function (r) {
        if (r && sortedByYear(r.posts)) { N.store.set('newestKey', key); return key; }
        return next();
      }, function (e) {
        if (e && e.msg) return next();          // the server answered "no": try the next key
        throw e;                                // transient: stop, try again another time
      });
    }
    keyHunt = Promise.resolve().then(next).then(function (k) { keyHunt = null; return k; }, function (e) { keyHunt = null; throw e; });
    return keyHunt;
  }
  function archivePage0(slug, sort, page, bg) {
    function q(orderby) { return N.api.get('archive', { slugs: slug, streamonly: 1, page: page, orderby: orderby, order: 'desc' }, bg ? { bg: true } : null); }
    if (sort !== 'new') return q(sort);
    return newestKey(slug).then(function (k) { return k === 'client' ? q('date').then(byYearDesc) : q(k); },
      function () { return q('date').then(byYearDesc); }); // could not decide right now: date-added order, sorted by year
  }

  function archiveList(root, params, restore) {
    var dead = false, page = 1, pages = 1, loading = false, total = 0, cells = [], skels = [], sort = (restore && restore.sort !== 'date' && restore.sort) || 'new', fills = 0, wantIdx = restore && restore.idx || 0, restoring = !!(restore && restore.idx > 0), gen = 0, COLS = 5;
    root.classList.add('archive', 'gridpage'); N.stage.dim(0.72);
    var box = el('div', 'arch'); root.appendChild(box);
    var head = el('div', 'head ah'); head.textContent = params.name || params.slug; var cnt = el('small', 'tab', ''); head.appendChild(cnt); box.appendChild(head);
    var sorts = el('div', 'sorts side'), lastCell = null; root.appendChild(sorts);
    var grid = el('div', 'ggrid'); box.appendChild(grid);
    box.reveal = function (e) { var ty = ui.vscroll(box, e._cell || e, 600); box.classList.toggle('scrolled', ty < 0); };
    SORTS.forEach(function (s) {
      addSortPill(s);
    });
    function addSortPill(s, at) {
      var p = ui.pill(N.t(s[1]), function () { if (sort === s[0]) return; sort = s[0]; paint(); reset(); }, sort === s[0]); p._k = s[0];
      if (at) sorts.insertBefore(p, at); else sorts.appendChild(p);
      // Up/Down move through the tabs; towards the grid returns to the last poster
      p.onnav = function (dir) {
        if (dir === 'up') return p.previousSibling || true;
        if (dir === 'down') return p.nextSibling || true;
        if (ui.step(dir) < 0) return (lastCell && document.body.contains(lastCell) && lastCell) || (cells[0] ? cells[0].card : true);
        return true;
      };
      return p;
    }
    // IMDb Top 250 (Movies only, if 30nama has the list)
    if (params.slug === 'movies') N.getMenu().then(function (m) { if (!top250Item(m) || dead) return; addSortPill(['top250', 'top250']); paint(); }, function () {});
    function paint() { for (var i = 0; i < sorts.children.length; i++) sorts.children[i].classList.toggle('cur', sorts.children[i]._k === sort); }
    function addSkels(n) { for (var i = 0; i < n; i++) { var c = el('div', 'gcell'); c.appendChild(ui.skelCard('grid')); skels.push(c); grid.appendChild(c); } }
    function clearSkels() { skels.forEach(function (s) { if (s.parentNode) s.parentNode.removeChild(s); }); skels = []; }
    function reset() {
      gen++; loading = false; page = 1; pages = 1; cells = []; grid.innerHTML = ''; skels = []; box.style.transition = 'none'; box._ty = null; box.style.transform = ''; void box.offsetWidth; box.style.transition = ''; box.classList.remove('scrolled');
      wantIdx = 0; restoring = false; fills = 0; load();
    }
    function load() {
      if (loading) return; loading = true; var my = gen; addSkels(page === 1 ? 10 : 5);
      archivePage(params.slug, sort, page).then(function (r) {
        if (dead || my !== gen) return;
        loading = false; clearSkels();
        var first = cells.length === 0;
        total = r.total || total; pages = r.pages || 1; if (total) cnt.textContent = Number(total).toLocaleString('en-US') + ' ' + N.t('results');
        if (first && sort === 'soon' && !(r.posts || []).length) { var em = el('div', 'nores', N.t('soonEmpty')); em.style.position = 'relative'; em.style.top = '0'; grid.appendChild(em); }
        box.classList.toggle('soonpage', sort === 'soon');
        box.classList.toggle('toppage', sort === 'top250');
        (r.posts || []).forEach(function (p) {
          var cell = ui.cell(p), idx = cells.length, c = cell.card;
          c.onclick = function () { N.go('details', { id: p.id }); };
          if (sort === 'top250') c._holder.appendChild(el('div', 'rank-b tab', '#' + (idx + 1)));
          // from the last column, the arrow towards the tabs lands on the selected tab
          c.onnav = function (dir) {
            if ((dir === 'left' || dir === 'right') && ui.step(dir) > 0 && (idx % COLS === COLS - 1 || idx === cells.length - 1)) {
              for (var q = 0; q < sorts.children.length; q++) if (sorts.children[q]._k === sort) return sorts.children[q];
            }
            return false;
          };
          c.onfocus2 = function () {
            lastCell = c;
            var row = Math.floor(idx / COLS), rows = Math.ceil(cells.length / COLS);
            for (var k = Math.max(0, (row - 1) * COLS); k < Math.min(cells.length, (row + 3) * COLS); k++) ui.load(cells[k].card);
            if (row >= rows - 2 && page < pages) { page++; load(); }
          };
          cells.push(cell); grid.appendChild(cell);
        });
        for (var k = 0; k < Math.min(cells.length, 3 * COLS); k++) ui.load(cells[k].card);
        // Newest hides upcoming titles, so a page can come back short or empty (the newest years are often all "Soon"):
        // keep fetching until there are at least three rows, instead of waiting for a scroll that can't happen
        if (!restoring && sort === 'new' && cells.length < 3 * COLS && page < pages && fills < 15) { fills++; page++; load(); return; }
        if (first && !restoring) { if (cells[0]) N.nav.focus(cells[0].card, true); else N.nav.focus(sorts.firstChild, true); }
        if (!first && !restoring && !N.nav.cur && cells[0]) N.nav.focus(cells[0].card, true);
        if (restoring) {
          if (wantIdx < cells.length) { restoring = false; instant(root, function () { N.nav.focus(cells[wantIdx].card, true); }); }
          else if (page < pages) { page++; load(); } else { restoring = false; N.nav.focus(cells[0] ? cells[0].card : sorts.firstChild, true); }
        }
      }).catch(function (e) { if (my === gen) loading = false; if (!dead && my === gen) { clearSkels(); if (!cells.length) errorView(root, e, function () { N.go('archive', params, { replace: true }); }); } });
    }
    load();
    return {
      destroy: function () { dead = true; },
      focusState: function () { for (var i = 0; i < cells.length; i++) if (cells[i].card === N.nav.cur) return { idx: i, sort: sort }; return null; }
    };
  }

  /* ================= Settings ================= */
  S.settings = function (root, params, restore) {
    var dead = false, sec = (restore && restore.sec) || (params && params.section) || 'account', swT = null, secs = ['account', 'language', 'playback', 'subtitles', 'display', 'about'];
    root.classList.add('set'); N.stage.dim(0.72);
    root.appendChild(el('div', 'h-xl t', N.t('settings')));
    var list = el('div', 'slist'), pane = el('div', 'spane scroll'); pane.setAttribute('data-mv', '160'); root.appendChild(list); root.appendChild(pane);
    var rows = {};
    function fmtExpire(v) {
      if (v === undefined || v === null || v === '') return N.t('unknown');
      if (typeof v === 'number' || /^\d{9,13}$/.test(String(v))) { var n = Number(v); if (n < 1e11) n *= 1000; return new Date(n).toISOString().slice(0, 10); }
      return String(v);
    }
    function info(label, value) { var r = el('div', 'orow nof'); r.appendChild(el('span', '', label)); r.appendChild(el('div', 'v', value)); return r; }
    function action(label, fn, danger) { var r = el('div', 'orow f fl' + (danger ? ' danger' : '')); r.appendChild(el('span', '', label)); r.onclick = r.onenter = fn; return r; }
    var onOff = [{ v: true, label: N.t('on') }, { v: false, label: N.t('off') }];
    var builders = {
      account: function (p) {
        var u = N.session && N.session.user;
        p.appendChild(info(N.t('account'), u ? (u.user_name || u.user_email || 'user') : N.t('guestAcc')));
        if (u) {
          p.appendChild(info(N.t('userType'), u.user_type !== undefined ? String(u.user_type) : '-'));
          p.appendChild(info(N.t('expires'), fmtExpire(u.user_expire)));
          p.appendChild(action(N.t('logout'), function () {
            N.confirm({ title: N.t('logoutTitle'), body: N.t('logoutBody'), ok: N.t('logout'), danger: true, onOk: function () { N.logout(); } });
          }, true));
        } else p.appendChild(action(N.t('login'), function () { N.go('login', {}, { reset: true }); }));
      },
      language: function (p) {
        p.appendChild(N.subs.seg(N.t('language'), [{ v: 'en', label: 'English' }, { v: 'fa', label: 'فارسی' }], function () { return N.lang; }, function (v) {
          if (v === N.lang) return;
          N.setLang(v); N.dropHome(); N.rail.build();
          var idx = 0; for (var i = 0; i < pane.children.length; i++) if (pane.children[i] === N.nav.cur) idx = i;
          N.rerender();
        }));
      },
      playback: function (p) {
        var SB = N.subs, av = ['fa', 'en'], r1, r2, g1 = function () { return N.store.get('sub', 'off'); }, g2 = function () { return N.store.get('sub2', 'off'); };
        r1 = SB.seg(N.t('defSubs'), SB.langOpts(av, g2), g1, function (v) { N.store.set('sub', v); r2.repaint(); });
        r2 = SB.seg(N.t('defSubs2'), SB.langOpts(av, g1), g2, function (v) { N.store.set('sub2', v); r1.repaint(); });
        p.appendChild(r1); p.appendChild(r2);
        p.appendChild(SB.seg(N.t('autoplay'), onOff, function () { return N.store.get('autoplay', true); }, function (v) { N.store.set('autoplay', v); }));
      },
      subtitles: function (p) {
        var SB = N.subs, sample = el('div', 'subsample'), host = el('div', '');
        var cv = N.stage.currentSrc && N.stage.currentSrc(); if (cv) sample.style.backgroundImage = 'url("' + cv + '")';
        sample.appendChild(host); SB.host(host); p.appendChild(sample);
        function paintSample() {
          var a = N.store.get('sub', 'off'), b = N.store.get('sub2', 'off'), sm = { fa: 'زیرنویس به این شکل نمایش داده می‌شود', en: 'This is how subtitles will look' };
          if (a === 'off' && b === 'off') a = N.lang;
          SB.render(host, a !== 'off' ? sm[a] : '', b !== 'off' ? sm[b] : '');
        }
        paintSample();
        var rows = SB.styleRows(p);
        // "on top" only matters with two subtitles, but it is a style choice: keep it here too
        var top = SB.seg(N.t('onTop'), [{ v: 1, label: N.t('sub1') }, { v: 2, label: N.t('sub2') }], function () { return SB.style().top; }, function (v) { SB.set('top', v); paintSample(); });
        p.insertBefore(top, rows[0]);
        p.appendChild(SB.action(N.t('resetStyle'), function () { SB.reset(); SB.repaintIn(p); paintSample(); N.toast(N.t('resetDone')); }, 'reset'));
        p.appendChild(el('div', 'note', N.t('subStyleNote')));
      },
      display: function (p) {
        // themes as a vertical list: Up/Down to move, OK (or click) to pick
        p.appendChild(el('div', 'sp-s', N.t('theme')));
        var thRows = [];
        function paintTh() { var cur = N.store.get('theme', 'crimson'); thRows.forEach(function (r) { r.classList.toggle('sel', r._v === cur); }); }
        N.THEMES.forEach(function (t) {
          var r = el('div', 'crow thr f'), dot = el('i', 'dot'); r._v = t.v;
          dot.style.background = t.c || 'conic-gradient(#F0454A,#F5A524,#22C67A,#3B8BFF,#9B6BFF,#F0454A)';
          r.appendChild(dot); r.appendChild(el('div', 'cl', N.t('th_' + t.v)));
          if (t.v === 'media') r.appendChild(el('div', 'th-n', N.t('th_media_n')));
          r.appendChild(ui.icon('check', 'ck'));
          r.onenter = r.onclick = function () { N.setTheme(t.v); paintTh(); };
          p.appendChild(r); thRows.push(r);
        });
        paintTh();
        p.appendChild(el('div', 'sp-s', N.t('display')));
        p.appendChild(N.subs.seg(N.t('reduce'), onOff, function () { return N.store.get('calm', false); }, function (v) {
          N.store.set('calm', v); document.body.classList.toggle('calm', v);
        }));
      },
      about: function (p) {
        p.appendChild(info('30nama TV', ''));
        p.appendChild(info(N.t('version'), N.config.appVersion || N.config.version));
        p.appendChild(info(N.t('unofficial'), ''));
        p.appendChild(info(N.t('apiHost'), (N.api.host || '').replace(/^https?:\/\//, '').replace(/\/api.*$/, '')));
        p.appendChild(info(N.t('tmdb'), N.tmdb.mock() ? N.t('tmdbMock') : (N.tmdb.token() ? N.t('tmdbOn') : N.t('tmdbOff'))));
        if (N.tmdb.enabled()) {
          p.appendChild(action(N.t('clearCache'), function () { N.tmdb.clearCache(); N.toast(N.t('cleared')); }));
          p.appendChild(el('div', 'note', N.t('tmdbCredit')));
        }
      }
    };
    function showPane(s, now) {
      if (s === sec && pane.firstChild) return; sec = s;
      for (var k in rows) rows[k].classList.toggle('cur', k === s);
      clearTimeout(swT);
      function paintP() { pane.innerHTML = ''; pane.scrollTop = 0; builders[s](pane); pane.classList.remove('sw'); }
      if (now) paintP(); else { pane.classList.add('sw'); swT = setTimeout(function () { if (!dead) paintP(); }, 120); }
    }
    secs.forEach(function (s) {
      var r = el('button', 'srow f fl' + (s === sec ? ' cur' : ''), N.t(s === 'subtitles' ? 'subStyle' : s)); rows[s] = r;
      r.onfocus2 = function () { showPane(s); };
      r.onnav = function (dir) { if (dir === 'right' || dir === 'left') { if (ui.step(dir) > 0) { if (swT) { clearTimeout(swT); swT = null; pane.innerHTML = ''; builders[sec](pane); pane.classList.remove('sw'); } var f = pane.querySelector('.f'); return f || true; } return false; } return false; };
      list.appendChild(r);
    });
    showPane(sec, true);
    var restoreIdx = restore && restore.idx;
    if (restoreIdx !== undefined && restoreIdx !== null && pane.children[restoreIdx] && pane.children[restoreIdx].classList.contains('f')) N.nav.focus(pane.children[restoreIdx], true);
    else N.nav.focus(rows[sec], true);
    return {
      destroy: function () { dead = true; clearTimeout(swT); },
      back: function () {
        if (N.nav.cur && pane.contains(N.nav.cur)) { N.nav.focus(rows[sec], true); return true; }
        return false;
      },
      focusState: function () {
        var idx = null; if (N.nav.cur && pane.contains(N.nav.cur)) for (var i = 0; i < pane.children.length; i++) if (pane.children[i] === N.nav.cur) idx = i;
        return { sec: sec, idx: idx };
      }
    };
  };
})();
