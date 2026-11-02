/* Player: Tizen AVPlay when available, else <video> + hls.js. Own WebVTT overlay. */
(function () {
  var K = N.keys, $ = N.$;
  var P = N.player = {
    open: false, items: [], index: 0, post: null, be: null, paused: false,
    tracks: null, subCache: {}, hbTimer: null, tickTimer: null, osdTimer: null,
    panelOpen: false, seekAcc: 0, seekTimer: null, skip: null, resume: null
  };
  var hasAV = function () { return !!(window.webapis && window.webapis.avplay); };

  /* ---------- backends ---------- */
  function avBackend() {
    var av = webapis.avplay, state = { dur: 0, cur: 0 };
    return {
      name: 'avplay',
      load: function (url, startSec, cb) {
        $('avplayObj').style.display = 'block';
        document.body.classList.add('av'); document.documentElement.classList.add('avh');
        try { av.close(); } catch (e) {}
        try { av.open(String(url)); } catch (e) { P.onError('open ' + (e && e.message || e)); return; }
        av.setDisplayRect(0, 0, 1920, 1080);
        try { av.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX'); } catch (e) {}
        av.setListener({
          onbufferingstart: function () { P.spin(true); },
          onbufferingcomplete: function () { P.spin(false); },
          oncurrentplaytime: function (ms) { state.cur = ms / 1000; },
          onstreamcompleted: function () { P.onEnded(); },
          onevent: function () {},
          onerror: function (err) { P.onError(String(err)); },
          onsubtitlechange: function () {}
        });
        av.prepareAsync(function () {
          try { state.dur = av.getDuration() / 1000; } catch (e) {}
          av.play();
          if (startSec > 5) { try { av.seekTo(Math.floor(startSec * 1000)); } catch (e) {} }
          P.spin(false);
          if (cb) cb();
        }, function (err) { P.onError(String(err)); });
      },
      play: function () { try { av.play(); } catch (e) {} },
      pause: function () { try { av.pause(); } catch (e) {} },
      seek: function (sec) { try { state.cur = sec; av.seekTo(Math.max(0, Math.floor(sec * 1000))); } catch (e) {} },
      time: function () { return state.cur; },
      buffered: function () { return 0; },
      duration: function () { return state.dur; },
      audioTracks: function () {
        var out = [];
        try {
          var info = av.getTotalTrackInfo();
          for (var i = 0; i < info.length; i++) if (info[i].type === 'AUDIO') {
            var lang = ''; try { lang = JSON.parse(info[i].extra_info).language; } catch (e) {}
            out.push({ id: info[i].index, label: langName(lang) || ('Track ' + (out.length + 1)) });
          }
        } catch (e) {}
        return out;
      },
      setAudio: function (id) { try { av.setSelectTrack('AUDIO', id); } catch (e) {} },
      stop: function () {
        try { av.stop(); } catch (e) {}
        try { av.close(); } catch (e) {}
        $('avplayObj').style.display = 'none'; document.body.classList.remove('av'); document.documentElement.classList.remove('avh');
      }
    };
  }
  function videoBackend() {
    var v = $('video'), hls = null;
    return {
      name: 'video',
      load: function (url, startSec, cb) {
        var started = false;
        function go() {
          if (started) return; started = true;
          if (startSec > 5) { try { v.currentTime = startSec; } catch (e) {} }
          var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
          P.spin(false); if (cb) cb();
        }
        v.onwaiting = function () { P.spin(true); };
        v.onplaying = function () { P.spin(false); };
        v.onended = function () { P.onEnded(); };
        v.onerror = function () { P.onError('video error'); };
        v.onloadedmetadata = go;
        var src = N.proxied(url);
        if (window.Hls && Hls.isSupported()) {
          hls = new Hls({ enableWorker: false });
          hls.on(Hls.Events.ERROR, function (ev, d) { if (d && d.fatal) P.onError('hls ' + d.details); });
          hls.on(Hls.Events.MANIFEST_PARSED, function () {
            // start on the highest rendition (Auto stays available in the Quality menu)
            var best = -1, bh = -1; (hls.levels || []).forEach(function (l, i) { var h = (l.height || 0) * 10000 + (l.bitrate || 0) / 1000; if (h > bh) { bh = h; best = i; } });
            if (best >= 0 && hls.levels.length > 1) { hls.startLevel = best; hls.nextLevel = best; P.hlsLevel = best; }
            setTimeout(go, 0);
          });
          hls.loadSource(src); hls.attachMedia(v);
        } else { v.src = src; }
      },
      play: function () { v.play(); },
      pause: function () { v.pause(); },
      seek: function (s) { v.currentTime = Math.max(0, s); },
      time: function () { return v.currentTime || 0; },
      buffered: function () { try { var b = v.buffered, t = v.currentTime || 0; for (var i = 0; i < b.length; i++) if (b.start(i) <= t + 0.5 && b.end(i) >= t) return b.end(i); } catch (e) {} return 0; },
      duration: function () { return isFinite(v.duration) ? v.duration : 0; },
      audioTracks: function () {
        if (!hls || !hls.audioTracks) return [];
        return hls.audioTracks.map(function (t, i) { return { id: i, label: langName(t.lang) || t.name || ('Track ' + (i + 1)) }; });
      },
      setAudio: function (id) { if (hls) hls.audioTrack = id; },
      levels: function () { return hls && hls.levels && hls.levels.length > 1 ? hls.levels.map(function (l, i) { return { id: i, h: l.height || 0, label: l.height ? l.height + 'p' : 'Level ' + (i + 1) }; }) : []; },
      setLevel: function (i) { if (hls) { hls.currentLevel = i; P.hlsLevel = i; } },
      stop: function () {
        try { v.pause(); } catch (e) {}
        if (hls) { hls.destroy(); hls = null; }
        v.removeAttribute('src'); try { v.load(); } catch (e) {}
      }
    };
  }
  var LANGS = { eng: 'English', en: 'English', per: 'Persian', fas: 'Persian', fa: 'Persian', fre: 'French', fra: 'French', ger: 'German', deu: 'German', spa: 'Spanish', jpn: 'Japanese', ja: 'Japanese', kor: 'Korean', tur: 'Turkish', ara: 'Arabic', rus: 'Russian' };
  function langName(l) { if (!l) return ''; var s = String(l).toLowerCase(); return LANGS[s] || LANGS[s.slice(0, 3)] || String(l); }

  /* m3u8 may be a string, or an array of quality entries {label, default|6ch|2ch} (original app maps over it, 'Auto' = adaptive). */
  function entryUrl(e) {
    if (!e) return null;
    if (typeof e === 'string') return e;
    if (e instanceof Array) return entryUrl(e[0]);
    return entryUrl(e['default'] || e.file || e.url || e.src || e.link || e.m3u8 || e.path || e.source);
  }
  // quality choices: the file's own entries (1080p, 720p, Auto...), or the HLS renditions when there is a single adaptive entry
  P.qualities = function () {
    var m = (P.items[P.index] || {}).file, out = []; m = m && m.m3u8;
    if (m instanceof Array) m.forEach(function (e) { var u = entryUrl(e); if (u) out.push({ v: 'u:' + u, url: u, label: String((e && e.label) || 'Auto'), h: parseInt(String((e && e.label) || '').replace(/\D/g, ''), 10) || 0 }); });
    if (out.length > 1) return out;
    var lv = P.be && P.be.levels ? P.be.levels() : [];
    if (!lv.length) return out;
    var q = [{ v: 'l:-1', level: -1, label: 'Auto', h: 0 }];
    lv.sort(function (a, b) { return b.h - a.h; }).forEach(function (l) { q.push({ v: 'l:' + l.id, level: l.id, label: l.label, h: l.h }); });
    return q;
  };
  P.qualityNow = function () {
    if (P.hlsLevel !== undefined && P.hlsLevel !== null && P.qualities()[0] && P.qualities()[0].level !== undefined) return 'l:' + P.hlsLevel;
    return 'u:' + P.curUrl;
  };
  P.setQuality = function (q) {
    if (!P.be || !q) return;
    if (q.level !== undefined) { P.be.setLevel(q.level); N.toast(N.t('quality') + ': ' + q.label); paintCtl(); return; }
    if (q.url === P.curUrl) return;
    var t = P.be.time(), wasPaused = P.paused, be = P.be;
    P.curUrl = q.url; P.curQ = q.label; P.spin(true);
    be.stop();
    be.load(q.url, Math.max(t, 6), function () { if (wasPaused) be.pause(); });
    N.toast(N.t('quality') + ': ' + q.label); paintCtl();
  };
  P.pickUrl = function (m) {
    if (!(m instanceof Array)) return entryUrl(m);
    // Always prefer the highest fixed quality (e.g. 2160p); Auto only as fallback
    var best = null, bestH = -1, auto = null, i, e, u;
    for (i = 0; i < m.length; i++) {
      e = m[i]; u = entryUrl(e); if (!u) continue;
      if (e && /^(auto|خودکار)$/i.test(String(e.label || ''))) { auto = u; continue; }
      var h = parseInt(String(e && e.label || '').replace(/\D/g, ''), 10) || 0;
      if (h > bestH) { best = u; bestH = h; }
    }
    return best || auto;
  };

  /* ---------- subtitles: two independent tracks, drawn by N.subs ---------- */
  function subUrl(v) {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (v instanceof Array) return subUrl(v[0]);
    return v.url || v.file || v.src || v.link || v.vtt || null;
  }
  function ts(s) {
    var m = /^(?:(\d+):)?(\d+):(\d+)[.,](\d+)$/.exec(s.trim()); if (!m) return null;
    return (+m[1] || 0) * 3600 + (+m[2]) * 60 + (+m[3]) + Number('0.' + m[4]);
  }
  // WebVTT and SRT (same cue shape once the "-->" line is found)
  P.parseVTT = function (text) {
    var cues = [], blocks = text.replace(/\r/g, '').replace(/^﻿/, '').split(/\n\n+/);
    blocks.forEach(function (b) {
      var lines = b.split('\n'), i = 0;
      while (i < lines.length && lines[i].indexOf('-->') < 0) i++;
      if (i >= lines.length) return;
      var parts = lines[i].split('-->'), s = ts(parts[0]), e = ts(parts[1].trim().split(/\s+/)[0]);
      if (s === null || e === null) return;
      var txt = lines.slice(i + 1).join('\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\{\\an?\d\}/g, '').replace(/^\s+|\s+$/g, '');
      if (txt) cues.push({ s: s, e: e, t: txt });
    });
    cues.sort(function (a, b) { return a.s - b.s; });
    return cues;
  };
  function newTracks() { return [{ lang: 'off', cues: [], delay: 0 }, { lang: 'off', cues: [], delay: 0 }]; }
  P.tracks = newTracks();
  function availableSubs(item) {
    var s = item && item.file && item.file.subtitle, out = [];
    if (s) ['fa', 'en'].forEach(function (l) { if (subUrl(s[l])) out.push(l); });
    if (s) for (var k in s) if (s.hasOwnProperty(k) && out.indexOf(k) < 0 && subUrl(s[k])) out.push(k);
    return out;
  }
  P.availableSubs = function () { return availableSubs(P.items[P.index]); };
  function loadTrack(n, lang) {
    var tr = P.tracks[n]; tr.lang = lang; tr.cues = [];
    if (lang === 'off') return Promise.resolve();
    var item = P.items[P.index], u = item && item.file && subUrl(item.file.subtitle && item.file.subtitle[lang]);
    if (!u) { tr.lang = 'off'; return Promise.resolve(); }
    if (P.subCache[u]) { tr.cues = P.subCache[u]; return Promise.resolve(); }
    return fetch(N.proxied(u)).then(function (r) { return r.text(); }).then(function (t) {
      P.subCache[u] = P.parseVTT(t); if (tr.lang === lang) tr.cues = P.subCache[u];
    }).catch(function () { N.toast(N.t('subFailed')); });
  }
  // n: 0 = first subtitle, 1 = second. The same language never shows twice.
  P.setSub = function (lang, n, noSave) {
    n = n || 0;
    var other = P.tracks[1 - n];
    if (lang !== 'off' && other.lang === lang) { other.lang = 'off'; other.cues = []; if (!noSave) N.store.set(n ? 'sub' : 'sub2', 'off'); }
    if (!noSave) N.store.set(n ? 'sub2' : 'sub', lang);
    var p = loadTrack(n, lang); P.tick(); return p;
  };
  P.setDelay = function (n, d) { P.tracks[n].delay = d; P.tick(); };
  var SAMPLE = { fa: 'زیرنویس به این شکل نمایش داده می‌شود', en: 'This is how subtitles will look' };
  function sample(lang) { return SAMPLE[lang] || SAMPLE[N.lang] || SAMPLE.en; }
  function renderSub(t) {
    var T = P.tracks, a = '', b = '', h = $('subtitle');
    if (T[0].lang !== 'off') a = N.subs.cueAt(T[0].cues, t - T[0].delay);
    if (T[1].lang !== 'off') b = N.subs.cueAt(T[1].cues, t - T[1].delay);
    // while the panel is open, always show something to style
    var pv = P.panelOpen && !a && !b;
    if (pv) {
      a = sample(T[0].lang !== 'off' ? T[0].lang : (T[1].lang !== 'off' ? '' : N.lang));
      if (T[1].lang !== 'off') b = sample(T[1].lang);
      if (T[0].lang === 'off' && T[1].lang !== 'off') a = '';
    }
    h.classList.toggle('preview', pv);
    N.subs.render(h, a, b);
  }
  // lift the subtitles above the controls while they are on screen; centre them in the free area while the panel is open
  function layoutSubs() {
    var h = $('subtitle'), pos = h._pos || 80, lift = 0;
    if ($('player').classList.contains('osd-on') && !P.panelOpen) lift = Math.max(0, 290 - pos);
    if (epsOpen) lift = Math.max(0, 440 - pos);
    h.style.bottom = pos + 'px';
    h.style.transform = lift ? 'translateY(' + (-lift) + 'px)' : '';
  }
  P.layoutSubs = layoutSubs;

  /* ---------- lifecycle ---------- */
  var SCRUB_W = 1424, glyphT = null, unState = null, epsOpen = false;
  P.spin = function (on) { $('player-spin').classList.toggle('hidden', !on); };
  P.start = function (post, items, index, resume) {
    if (N.rail && N.rail.open) N.rail.close(false);
    pointerHooks(); backHooks();
    var h = $('subtitle'); if (!h._l) { N.subs.host(h); h._layout = layoutSubs; }
    if (!P.post || !post || P.post.id !== post.id) P.tracks = newTracks(); // sync offsets belong to one title
    P.post = post; P.items = items; P.resume = resume || null; P.open = true;
    $('player').classList.remove('hidden');
    document.body.classList.add('playing');
    N.nav.pushHandler(P.onKey);
    P.playIndex(index);
    clearInterval(P.tickTimer); P.tickTimer = setInterval(P.tick, 250);
  };
  function seriesLine(item, i) {
    var info = item.info || {};
    if (P.items.length > 1 || info.season) return 'S' + (info.season || 1) + ' · E' + N.ui.epLabel(info.episode, i + 1) + (N.ui.epName(item) ? ' — ' + N.ui.epName(item) : '');
    return '';
  }
  P.playIndex = function (i) {
    var item = P.items[i]; if (!item) return;
    P.reportNow();
    if (P.be) P.be.stop();
    P.index = i; P.paused = false;
    P.tracks[0].cues = []; P.tracks[1].cues = [];
    P.hideSkip(); P.hideUpNext(true); P.closeEps(true); P.closePanel(true);
    var m3u8 = item.file && P.pickUrl(item.file.m3u8); P.hlsLevel = null;
    if (typeof m3u8 === 'string') m3u8 = m3u8.replace(/^\s+|\s+$/g, '');
    if (!m3u8 || typeof m3u8 !== 'string') { var raw = ''; try { raw = JSON.stringify(item.file && item.file.m3u8).slice(0, 160); } catch (e) {} N.toast(N.t('noStream') + ' ' + raw, 6000); return P.close(); }
    $('osd-title').textContent = N.title(P.post);
    $('osd-sub').textContent = seriesLine(item, i);
    buildCtl();
    var start = 0, info = item.info || {};
    if (P.resume && String(P.resume.file_id) === String(info.file_id)) start = Number(P.resume.time) || 0;
    P.resume = null;
    P.be = hasAV() ? avBackend() : videoBackend();
    P.spin(true); P.glyph(false);
    clearTimeout(P.loadT);
    var be0 = P.be;
    P.loadT = setTimeout(function () { if (P.be === be0 && P.loading) P.onError('timeout'); }, 25000);
    P.loading = true;
    P.curUrl = m3u8; P.curQ = '';
    (function () { var qs = P.qualities(); qs.forEach(function (q) { if (q.url === m3u8) P.curQ = q.label; }); })();
    try { P.be.load(m3u8, start, function () {
      paintCtl();
      P.loading = false; clearTimeout(P.loadT);
      var subs = availableSubs(item);
      var w1 = N.store.get('sub', 'off'), w2 = N.store.get('sub2', 'off');
      if (subs.indexOf(w1) < 0) w1 = 'off';
      if (subs.indexOf(w2) < 0 || w2 === w1) w2 = 'off';
      P.setSub(w1, 0, true); P.setSub(w2, 1, true);
      P.showOsd();
    }); } catch (e) { P.onError(String(e && e.message || e)); }
    clearInterval(P.hbTimer); P.hbTimer = setInterval(P.report, N.config.heartbeatMs);
    P.seekAcc = 0; $('scrub').classList.remove('seeking');
    P.tick();
  };
  P.close = function () {
    if (!P.open) return;
    P.reportNow();
    clearInterval(P.hbTimer); clearInterval(P.tickTimer); clearTimeout(P.osdTimer); clearTimeout(P.seekTimer);
    if (P.be) P.be.stop();
    P.be = null;
    P.closePanel(true); P.closeEps(true); P.hideUpNext(true); P.hideSkip();
    P.open = false; $('player').classList.add('hidden'); document.body.classList.remove('playing');
    $('player').classList.remove('osd-on'); $('osd').classList.add('off');
    N.subs.render($('subtitle'), '', '');
    N.nav.popHandler(P.onKey);
    if (N.onPlayerClosed) N.onPlayerClosed();
  };
  P.onError = function (m) { P.loading = false; clearTimeout(P.loadT); N.toast(N.t('playErr') + ': ' + m, 6000); P.spin(false); P.showOsd(); };
  P.onEnded = function () { if (P.index + 1 < P.items.length) P.playIndex(P.index + 1); else P.close(); };

  /* ---------- progress reporting (observer) ---------- */
  P.report = function () {
    if (!P.be || !N.isLoggedIn()) return;
    var item = P.items[P.index], info = item.info || {}, u = N.session.user || {};
    N.api.call('observer', {
      post_id: info.post_id || (P.post && P.post.id), file_id: info.file_id,
      user_id: u.user_id || u.id || '', time: Math.floor(P.be.time()), duration: Math.floor(P.be.duration()),
      token: (item.options && item.options.token) || ''
    }).catch(function () {});
  };
  P.reportNow = function () { if (P.be && P.be.time() > 1) P.report(); };

  /* ---------- scrubber / OSD ---------- */
  function setT(id, txt) { var e = $(id); if (e._t !== txt) { e._t = txt; e.textContent = txt; } }
  function drawScrub(t, d, buf) {
    var f = d ? Math.max(0, Math.min(1, t / d)) : 0, b = d ? Math.max(0, Math.min(1, buf / d)) : 0, sc = $('scrub');
    sc.querySelector('.fill').style.transform = 'scaleX(' + f.toFixed(4) + ')';
    sc.querySelector('.buf').style.transform = 'scaleX(' + b.toFixed(4) + ')';
    var x = f * SCRUB_W; sc.querySelector('.thumb').style.transform = 'translateX(' + x.toFixed(1) + 'px)';
    return x;
  }
  function clockNow() { var d = new Date(), h = d.getHours(), m = d.getMinutes(); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function tn(v) { if (typeof v === 'string' && v.indexOf(':') > 0) { var p = v.split(':'), r = 0; for (var i = 0; i < p.length; i++) r = r * 60 + (parseFloat(p[i]) || 0); return r; } return Number(v); }
  var marksKey = '';
  function drawMarks(d) {
    var o = (P.items[P.index] || {}).options || {}, key = P.index + '|' + Math.round(d);
    if (!d || key === marksKey) return; marksKey = key;
    var box = $('scrub').querySelector('.marks'); box.innerHTML = '';
    function seg(a, b, cls) {
      a = tn(a); b = tn(b); if (!(b > a) || a >= d) return;
      var m = N.el('i', cls); m.style.left = (a / d * 100).toFixed(3) + '%'; m.style.width = (Math.min(b, d) - a) / d * 100 + '%'; box.appendChild(m);
    }
    seg(o.previously_start, o.previously_end, 'recap'); seg(o.intro_start, o.intro_end, 'intro');
    if (tn(o.end) > 0) seg(o.end, d, 'cred');
  }
  P.tick = function () {
    if (!P.be) return;
    var t = P.be.time(), d = P.be.duration(), tt = t;
    drawMarks(d);
    renderSub(t);
    if (P.seekAcc && d) tt = Math.max(0, Math.min(d, t + P.seekAcc));
    var x = drawScrub(tt, d, P.be.buffered());
    setT('osd-t1', N.fmtTime(tt)); setT('osd-t2', d ? '-' + N.fmtTime(Math.max(0, d - tt)) : '');
    setT('osd-clock', clockNow());
    if (d) { var end = new Date(Date.now() + (d - tt) * 1000), eh = end.getHours(), em = end.getMinutes(); setT('osd-ends', N.t('endsAt') + ' ' + (eh < 10 ? '0' : '') + eh + ':' + (em < 10 ? '0' : '') + em); }
    if (P.seekAcc) {
      setT('bub-t', N.fmtTime(tt)); setT('bub-d', (P.seekAcc > 0 ? '+' : '') + P.seekAcc + 's');
      $('scrub').querySelector('.bubble').style.transform = 'translateX(' + x.toFixed(1) + 'px)';
    }
    var o = (P.items[P.index] || {}).options || {}, show = null;
    var isS = tn(o.intro_end) > 0 && t >= tn(o.intro_start) && t < tn(o.intro_end) - 1;
    var isP = !isS && tn(o.previously_end) > 0 && t >= tn(o.previously_start) && t < tn(o.previously_end) - 1;
    if (isS) show = { label: N.t('skipIntro'), to: tn(o.intro_end) };
    else if (isP) show = { label: N.t('skipRecap'), to: tn(o.previously_end) };
    P.skip = show;
    if (show) { show.from = isS ? tn(o.intro_start) : tn(o.previously_start); P.showSkip(show.label, Math.max(0, Math.min(1, (t - show.from) / Math.max(1, show.to - show.from)))); } else P.hideSkip();
    // up next at credits
    var hasNext = P.index + 1 < P.items.length;
    if (hasNext && tn(o.end) > 0 && t >= tn(o.end) && !unState) P.showUpNext();
    else if (unState && tn(o.end) > 0 && t < tn(o.end) - 3 && !unState.dismissed) P.hideUpNext(true);
  };
  // the pill never takes focus by itself: OK keeps toggling pause; Up focuses it (then OK skips; Down/Back/seek keys release it)
  P.skipFocus = false;
  // [>>| icon]  Skip intro  [▲ / OK key chip], with the remaining intro as a thin line underneath
  P.showSkip = function (label, frac) {
    var b = $('skip-btn');
    if (!b._ic) {
      b.innerHTML = ''; var ic = N.el('span', 'sk-i'); ic.appendChild(N.ui.icon('next')); b.appendChild(ic);
      b._tx = b.appendChild(N.el('span', 'sk-t')); b._k = b.appendChild(N.el('span', 'sk-k'));
      var pr = N.el('span', 'sk-p'); b._p = pr.appendChild(N.el('i')); b.appendChild(pr); b._ic = 1;
    }
    if (b._tx._t !== label) { b._tx._t = label; b._tx.textContent = label; }
    var k = P.skipFocus ? 'OK' : '\u25b2'; if (b._k._t !== k) { b._k._t = k; b._k.textContent = k; }
    if (frac !== undefined) b._p.style.transform = 'scaleX(' + (1 - frac).toFixed(3) + ')';
    b.classList.toggle('focus', P.skipFocus); b.classList.add('show');
  };
  P.hideSkip = function () { P.skipFocus = false; var b = $('skip-btn'); b.classList.remove('show', 'focus'); P.skip = null; };
  P.setSkipFocus = function (on) { P.skipFocus = on; if (P.skip) P.showSkip(P.skip.label); };
  // pointer (Magic Remote): the pill and the Up Next buttons work with a click too
  function pointerHooks() {
    var b = $('skip-btn'); if (b._hk) return; b._hk = 1;
    b.onmouseenter = function () { if (P.skip) { P.setSkipFocus(true); P.showOsd(); } };
    b.onmouseleave = function () { if (P.skip) P.setSkipFocus(false); };
    b.onclick = function (e) { e.stopPropagation(); if (P.skip && P.be) { P.be.seek(P.skip.to); P.setSkipFocus(false); } };
    $('un-play').onclick = function (e) { e.stopPropagation(); P.hideUpNext(true); P.playIndex(P.index + 1); };
    $('un-cred').onclick = function (e) { e.stopPropagation(); P.hideUpNext(); };
    // timeline: hover shows the time under the pointer, click jumps there
    var sc = $('scrub'), hit = N.el('div', 'hit'); sc.appendChild(hit);
    function fracAt(e) { var r = sc.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); }
    hit.onmousemove = function (e) {
      if (!P.be || !osdOn()) return; var d = P.be.duration(); if (!d) return; var f = fracAt(e);
      P.showOsd(); P.ctlFocus = -1; paintCtl(); sc.classList.add('hovering');
      setT('bub-t', N.fmtTime(f * d)); var dd = Math.round(f * d - P.be.time()); setT('bub-d', (dd > 0 ? '+' : dd < 0 ? '\u2212' : '') + N.fmtTime(Math.abs(dd)));
      sc.querySelector('.bubble').style.transform = 'translateX(' + (f * SCRUB_W).toFixed(1) + 'px)';
    };
    hit.onmouseleave = function () { sc.classList.remove('hovering'); };
    hit.onclick = function (e) {
      e.stopPropagation(); if (!P.be || !osdOn()) { P.showOsd(); return; }
      var d = P.be.duration(); if (!d) return; var t = fracAt(e) * d;
      clearTimeout(P.seekTimer); P.seekAcc = 0; sc.classList.remove('seeking');
      P.be.seek(Math.min(t, d - 2)); P.showOsd(); P.tick();
    };
    // any pointer movement over the video brings the controls back
    var lastMv = 0;
    $('player').addEventListener('mousemove', function () { var n = Date.now(); if (n - lastMv > 300 && !P.panelOpen) { lastMv = n; P.showOsd(); } });
  }
  function osdOn() { return !$('osd').classList.contains('off'); }
  P.showOsd = function () {
    if (P.panelOpen) return;
    $('osd').classList.remove('off'); $('player').classList.add('osd-on'); $('scrub').classList.add('act'); clearTimeout(P.osdTimer);
    layoutSubs();
    P.osdTimer = setTimeout(function () {
      if (!P.paused && !P.panelOpen && !epsOpen) P.hideChrome(true);
    }, P.ctlFocus >= 0 ? 8000 : 4500);
  };
  P.hideChrome = function (auto) {
    clearTimeout(P.osdTimer); $('osd').classList.add('off'); $('player').classList.remove('osd-on'); $('scrub').classList.remove('act');
    P.ctlFocus = -1; P.backFocus = false; $('pback').classList.remove('focus'); paintCtl(); layoutSubs();
    if (!auto && $('upnext').classList.contains('show')) P.hideUpNext(); // keeps autoplay countdown semantics: dismissed
  };
  P.glyph = function (kind) { // kind: 'play' | 'pause' | false
    var g = $('pglyph'); clearTimeout(glyphT);
    g.classList.remove('pulse', 'hold');
    if (!kind) return;
    N.ui.setIcon(g.firstChild, kind);
    void g.offsetWidth;
    if (kind === 'pause') { g.classList.add('pulse'); glyphT = setTimeout(function () { g.classList.remove('pulse'); g.classList.add('hold'); }, 600); }
    else g.classList.add('pulse');
  };
  P.togglePause = function () {
    if (!P.be) return;
    P.paused = !P.paused;
    if (P.paused) P.be.pause(); else P.be.play();
    P.glyph(P.paused ? 'pause' : 'play');
    paintCtl();
    P.showOsd();
  };
  P.seekBy = function (sec) {
    if (!P.be) return;
    P.seekAcc += sec; clearTimeout(P.seekTimer);
    $('scrub').classList.add('seeking'); P.showOsd(); P.tick();
    P.seekTimer = setTimeout(function () {
      var d = P.be.duration(), t = P.be.time() + P.seekAcc; P.seekAcc = 0;
      $('scrub').classList.remove('seeking');
      if (d) t = Math.min(t, d - 2);
      P.be.seek(Math.max(0, t));
    }, 700);
  };

  /* ---------- control bar ----------
     Focus lives on the scrubber (ctlFocus -1) or on one of the buttons. Down from the scrubber enters the bar, Up leaves it. */
  P.ctlFocus = -1;
  var ctlBtns = [];
  function ctlBtn(id, icon, label, fn, group) {
    var b = N.el('div', 'cb' + (label ? ' wl' : '') + ' ' + group); b._id = id;
    b.appendChild(N.ui.icon(icon)); if (label) b.appendChild(N.el('span', '', label));
    b._fn = fn; b.onclick = function () { P.ctlFocus = ctlBtns.indexOf(b); paintCtl(); fn(); };
    b.onmouseenter = function () { P.ctlFocus = ctlBtns.indexOf(b); paintCtl(); P.showOsd(); };
    return b;
  }
  function buildCtl() {
    var bar = $('ctl'); bar.innerHTML = ''; ctlBtns = [];
    // [-10  play/pause  +10  ends at] ...... [subtitles  episodes  next]; the bar is always left-to-right like a media timeline
    var L = N.el('div', 'grp gl'), C = N.el('div', 'grp gc'), R = N.el('div', 'grp gr');
    ctlBtns.push(ctlBtn('rw', 'rw10', '', function () { P.seekBy(-10); }, 'ic'));
    ctlBtns.push(ctlBtn('pp', 'pause', '', function () { P.togglePause(); }, 'big'));
    ctlBtns.push(ctlBtn('ff', 'ff10', '', function () { P.seekBy(10); }, 'ic'));
    ctlBtns.forEach(function (b) { C.appendChild(b); });
    var r = [];
    r.push(ctlBtn('q', 'hd', N.t('quality'), function () { P.openPanel('q'); }, 'qb'));
    r.push(ctlBtn('subs', 'cc', N.t('subsAudio'), function () { P.openPanel(); }, ''));
    if (P.items.length > 1) r.push(ctlBtn('eps', 'list', N.t('episodes'), function () { P.hideChrome(true); P.openEps(); }, ''));
    if (P.index + 1 < P.items.length) r.push(ctlBtn('next', 'next', N.t('nextEpisode'), function () { P.playIndex(P.index + 1); }, ''));
    r.forEach(function (b) { R.appendChild(b); ctlBtns.push(b); });
    var tm = N.el('div', 'ctime'); tm.appendChild(N.el('span', 'tab', '')).id = 'osd-ends';
    L.appendChild(tm);
    L.insertBefore(C, L.firstChild); bar.appendChild(L); bar.appendChild(R);
    marksKey = '';
    P.ctlFocus = -1; paintCtl();
  }
  function paintCtl() {
    for (var i = 0; i < ctlBtns.length; i++) ctlBtns[i].classList.toggle('focus', i === P.ctlFocus);
    $('scrub').classList.toggle('foc', P.ctlFocus < 0);
    var qb = null; for (var j = 0; j < ctlBtns.length; j++) if (ctlBtns[j]._id === 'q') qb = ctlBtns[j];
    if (qb) { var qs = P.qualities ? P.qualities() : []; qb.style.display = qs.length > 1 ? '' : 'none'; var lab = qb.lastChild, cq = '';
      qs.forEach(function (q) { if (q.v === P.qualityNow()) cq = q.label; }); lab.textContent = cq || P.curQ || N.t('quality'); }
    var pp = ctlBtns[ctlIndex('pp')]; if (pp) { N.ui.setIcon(pp.firstChild, P.paused ? 'play' : 'pause'); pp.classList.toggle('paused', !!P.paused); }
  }
  function ctlIndex(id) { for (var i = 0; i < ctlBtns.length; i++) if (ctlBtns[i]._id === id) return i; return 0; }
  P.focusCtl = function (id) { P.ctlFocus = ctlIndex(id); paintCtl(); P.showOsd(); };

  /* ---------- up next ---------- */
  P.showUpNext = function () {
    var next = P.items[P.index + 1]; if (!next) return;
    var u = $('upnext'), auto = N.store.get('autoplay', true);
    var info = next.info || {};
    u.querySelector('.u1').textContent = N.t('nextEpisode');
    u.querySelector('.u2').textContent = 'S' + (info.season || 1) + ' · E' + N.ui.epLabel(info.episode, P.index + 2);
    u.querySelector('.u3').textContent = N.ui.epName(next) || N.title(P.post);
    var cv = N.ui.coverUrl(P.post) || N.ui.posterUrl(P.post);
    u.querySelector('.th').style.backgroundImage = cv ? 'url("' + cv + '")' : '';
    $('un-play').textContent = N.t('playNow'); $('un-cred').textContent = N.t('credits');
    unState = { sel: 'play', dismissed: false, auto: auto, active: false };
    uSel();
    u.classList.remove('hold', 'count'); u.classList.add('show');
    if (auto) { void u.offsetWidth; u.classList.add('count'); }
    u.querySelector('.cd').style.display = auto ? '' : 'none';
    u.querySelector('.cd').onanimationend = function () { if (unState && unState.auto) { P.hideUpNext(true); P.playIndex(P.index + 1); } };
  };
  function uSel() {
    var on = !!unState && unState.active;
    $('un-play').classList.toggle('focus', on && unState.sel === 'play');
    $('un-cred').classList.toggle('focus', on && unState.sel === 'cred');
  }
  P.hideUpNext = function (force) {
    var u = $('upnext');
    u.classList.remove('show', 'count', 'hold');
    if (force) unState = null; else if (unState) unState.dismissed = true;
  };

  /* ---------- Subtitles & Audio panel: everything about subtitles, without leaving playback ---------- */
  P.openPanel = function (focusKey) {
    if (P.panelOpen || !P.be) return;
    var S = N.subs, m = $('spanel'); m.innerHTML = '';
    var head = N.el('div', 'sp-h'); head.appendChild(N.el('div', 'sp-t', N.t('subsAudio')));
    head.appendChild(N.el('div', 'sp-k', N.t('panelHint'))); m.appendChild(head);
    var body = N.el('div', 'sp-b scroll'); body.setAttribute('data-mv', '200'); m.appendChild(body);
    function sec(t) { body.appendChild(N.el('div', 'sp-s', t)); }
    var avail = availableSubs(P.items[P.index]);
    var r1, r2;
    var qs = P.qualities(), qRow = null;
    if (qs.length > 1) {
      sec(N.t('quality'));
      qRow = S.seg(N.t('quality'), qs.map(function (q) { return { v: q.v, label: q.label }; }), function () { return P.qualityNow(); },
        function (v) { qs.forEach(function (q) { if (q.v === v) P.setQuality(q); }); });
      qRow.classList.add('many'); body.appendChild(qRow);
    }
    sec(N.t('subtitles'));
    if (!avail.length) body.appendChild(N.el('div', 'sp-n', N.t('noSubs')));
    else {
      r1 = S.seg(N.t('sub1'), S.langOpts(avail, function () { return P.tracks[1].lang; }), function () { return P.tracks[0].lang; }, function (v) { P.setSub(v, 0); if (r2) r2.repaint(); });
      r2 = S.seg(N.t('sub2'), S.langOpts(avail, function () { return P.tracks[0].lang; }), function () { return P.tracks[1].lang; }, function (v) { P.setSub(v, 1); r1.repaint(); });
      body.appendChild(r1); body.appendChild(r2);
      body.appendChild(S.seg(N.t('onTop'), [{ v: 1, label: N.t('sub1') }, { v: 2, label: N.t('sub2') }],
        function () { return S.style().top; }, function (v) { S.set('top', v); P.tick(); }));
    }
    var audio = P.be.audioTracks();
    if (audio.length > 1) {
      sec(N.t('audio'));
      if (P.audioId === undefined || P.audioId === null) P.audioId = audio[0].id;
      body.appendChild(S.seg(N.t('audioTrack'), audio.map(function (a) { return { v: a.id, label: a.label }; }),
        function () { return P.audioId; }, function (v) { P.audioId = v; P.be.setAudio(v); }));
    }
    sec(N.t('appearance'));
    S.styleRows(body);
    if (avail.length) {
      sec(N.t('sync'));
      var fmt = function (v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + 's'; };
      [0, 1].forEach(function (n) {
        body.appendChild(S.slider(N.t(n ? 'sync2' : 'sync1'), { min: -10, max: 10, step: 0.25, center: true, fmt: fmt },
          function () { return P.tracks[n].delay; }, function (v) { P.setDelay(n, v); }));
      });
    }
    body.appendChild(S.action(N.t('resetStyle'), function () { S.reset(); S.repaintIn(body); P.tick(); N.toast(N.t('resetDone')); }, 'reset'));
    m.classList.add('open'); P.panelOpen = true; $('player').classList.add('panel-on');
    clearTimeout(P.osdTimer); $('osd').classList.add('off'); $('player').classList.remove('osd-on'); $('scrub').classList.remove('act');
    layoutSubs(); P.tick();
    N.nav.pushScope(m); body.scrollTop = 0;
    N.nav.focus((focusKey === 'q' && qRow) || body.querySelector('.crow'), true);
  };
  P.closePanel = function (silent) {
    if (!P.panelOpen) return;
    $('spanel').classList.remove('open'); $('player').classList.remove('panel-on'); P.panelOpen = false;
    N.nav.popScope(); N.nav.clear(); layoutSubs(); P.tick();
    if (!silent) P.showOsd();
  };

  /* ---------- episodes sheet (series, Down) ---------- */
  P.openEps = function () {
    if (P.items.length < 2) return;
    var box = $('player-eps'), tr = box.querySelector('.eptrack'); tr.innerHTML = '';
    var cur = P.items[P.index], season = (cur.info && cur.info.season) || 1, tiles = [], focusEl = null;
    var hd = box.querySelector('.peps-h'); if (!hd) { hd = N.el('div', 'peps-h'); box.insertBefore(hd, tr); }
    P.items.forEach(function (it, i) {
      if (((it.info && it.info.season) || 1) !== season) return;
      var t = N.ui.epTile(it, i, {}); t.onclick = function () { P.closeEps(); P.playIndex(i); };
      t.onfocus2 = function () { N.ui.slideTo(tr, t._x); };
      if (i === P.index) { t.classList.add('now'); t.appendChild(N.el('div', 'np', N.t('nowPlaying'))); focusEl = t; }
      tr.appendChild(t); tiles.push(t);
    });
    hd.textContent = N.t('season') + ' ' + season + '  \u00b7  ' + tiles.length + ' ' + N.t('episodes');
    N.ui.layoutTrack(tr, tiles, tiles.map(function () { return 360; }));
    // start from a clean transform (nothing left over from a previous season); put the current episode at the start edge without animating
    var f0 = focusEl || tiles[0];
    tr.style.transition = 'none'; tr.style.transform = ''; tr._s = null; N.ui.slideTo(tr, f0 ? f0._x : 184); void tr.offsetWidth; tr.style.transition = '';
    box.classList.add('open'); epsOpen = true; N.nav.pushScope(box);
    N.nav.focus(f0, true); $('osd').classList.remove('off'); $('player').classList.add('osd-on', 'eps-on'); layoutSubs();
  };
  P.closeEps = function (silent) {
    if (!epsOpen) return;
    $('player-eps').classList.remove('open'); $('player').classList.remove('eps-on'); epsOpen = false; N.nav.popScope(); N.nav.clear(); layoutSubs(); if (!silent) P.showOsd();
  };

  /* ---------- leaving: one Back press asks, Yes goes to the main page ---------- */
  P.backFocus = false;
  function setBackFocus(on) { P.backFocus = on; $('pback').classList.toggle('focus', on); if (on) { P.ctlFocus = -1; paintCtl(); $('scrub').classList.remove('foc'); } else paintCtl(); P.showOsd(); }
  P.askExit = function () {
    if (!P.open || P.asking) return;
    if (P.panelOpen) { P.closePanel(); return; }
    if (epsOpen) { P.closeEps(); return; }
    P.asking = true; var wasPaused = P.paused;
    if (!wasPaused) { P.paused = true; if (P.be) P.be.pause(); paintCtl(); }
    clearTimeout(P.osdTimer);
    N.confirm({ title: N.t('leaveTitle'), body: N.t('leaveBody'), ok: N.t('yes'), cancel: N.t('no'), okFirst: true,
      onOk: function () { P.asking = false; P.close(); if (N.go) N.go('home', {}, { reset: true }); },
      onCancel: function () { P.asking = false; setBackFocus(false); if (!wasPaused && P.be) { P.paused = false; P.be.play(); paintCtl(); } P.showOsd(); }
    });
  };
  function backHooks() {
    var b = $('pback'); if (b._hk) return; b._hk = 1;
    b.onclick = function (e) { e.stopPropagation(); P.askExit(); };
    b.onmouseenter = function () { setBackFocus(true); };
    b.onmouseleave = function () { setBackFocus(false); };
  }

  /* ---------- keys ---------- */
  P.onKey = function (e) {
    if (!P.open || P.asking) return false; // the yes/no dialog handles its own keys
    var k = e.keyCode, back = k === K.BACK || k === K.TIZEN_BACK || k === K.ESC || k === K.BACKSPACE;
    if (P.panelOpen) {
      if (back) { P.closePanel(); return true; }
      if (k === K.PLAYPAUSE) { P.togglePause(); return true; }
      return false; // spatial nav moves between rows; rows take Left/Right themselves
    }
    if (epsOpen) {
      if (back || k === K.DOWN) { P.closeEps(); return true; }
      return false;
    }
    if (back) { P.askExit(); return true; } // one press: ask to leave
    if (P.backFocus) {
      if (k === K.ENTER) { P.askExit(); return true; }
      if (k === K.DOWN) { setBackFocus(false); return true; }
      if (k === K.LEFT || k === K.RIGHT || k === K.UP) { P.showOsd(); return true; }
      setBackFocus(false);
    }
    if (k === K.STOP) { P.close(); return true; }
    // colour keys: red = subtitles panel, green = subtitles on/off
    if (k === K.RED) { P.openPanel(); return true; }
    if (k === K.GREEN) { toggleSubs(); return true; }
    if (k === K.PLAYPAUSE) { P.togglePause(); return true; }
    if (k === K.PLAY) { if (P.paused) P.togglePause(); return true; }
    if (k === K.PAUSE) { if (!P.paused) P.togglePause(); return true; }
    if (k === K.RW) { P.seekBy(-30); return true; }
    if (k === K.FF) { P.seekBy(30); return true; }
    var osdWasOn = osdOn();
    P.showOsd();
    // in the control bar
    if (P.ctlFocus >= 0) {
      if (k === K.LEFT || k === K.RIGHT) { var dd = k === K.RIGHT ? 1 : -1, ni = P.ctlFocus + dd; while (ctlBtns[ni] && ctlBtns[ni].style.display === 'none') ni += dd; if (ni >= 0 && ni < ctlBtns.length) { P.ctlFocus = ni; paintCtl(); } return true; }
      if (k === K.UP) { P.ctlFocus = -1; paintCtl(); return true; }
      if (k === K.ENTER) { var b = ctlBtns[P.ctlFocus]; if (b) b._fn(); return true; }
      return true;
    }
    var unShown = unState && $('upnext').classList.contains('show');
    if (k === K.UP && !P.skipFocus && !(unShown && unState.active) && (unShown || P.skip)) {
      // Up focuses the pill / Up Next card
      if (unShown) { unState.active = true; $('upnext').classList.add('hold'); uSel(); } else P.setSkipFocus(true);
      return true;
    }
    if (P.skipFocus) {
      if (k === K.ENTER) { if (P.skip) P.be.seek(P.skip.to); P.setSkipFocus(false); return true; }
      if (k === K.DOWN) { P.setSkipFocus(false); return true; }
      P.setSkipFocus(false); // any other key releases it and keeps its normal meaning
    }
    if (unShown && unState.active) {
      if (k === K.DOWN || k === K.UP) { unState.active = false; uSel(); return true; }
    }
    if (unShown) {
      if (k === K.ENTER && unState.active) {
        var sel = unState.sel; P.hideUpNext(sel !== 'cred');
        if (sel === 'play') P.playIndex(P.index + 1);
        return true;
      }
      $('upnext').classList.add('hold');
      if (unState.active && (k === K.LEFT || k === K.RIGHT)) { unState.sel = unState.sel === 'play' ? 'cred' : 'play'; uSel(); return true; }
    }
    if (k === K.ENTER) { P.togglePause(); return true; }
    if (k === K.LEFT) { P.seekBy(-10); return true; }
    if (k === K.RIGHT) { P.seekBy(10); return true; }
    if (k === K.UP) { if (osdWasOn) setBackFocus(true); return true; } // first Up shows the bar, the next one reaches the back button. Up only brings up the progress bar (done by showOsd above); the panel is the red key / its button
    if (k === K.DOWN) { P.focusCtl('subs'); return true; }
    return true;
  };
  // green key: off <-> last used pair
  function toggleSubs() {
    var T = P.tracks, avail = availableSubs(P.items[P.index]);
    if (!avail.length) { N.toast(N.t('noSubs')); return; }
    if (T[0].lang !== 'off' || T[1].lang !== 'off') { P._lastSubs = [T[0].lang, T[1].lang]; P.setSub('off', 0); P.setSub('off', 1); N.toast(N.t('subtitles') + ': ' + N.t('off')); return; }
    var l = P._lastSubs || [avail[0], 'off'];
    P.setSub(l[0], 0); P.setSub(l[1], 1);
    N.toast(N.t('subtitles') + ': ' + [l[0], l[1]].filter(function (x) { return x !== 'off'; }).map(N.subs.langLabel).join(' + '));
  }
})();
