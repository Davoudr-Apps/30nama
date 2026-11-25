/* Continue watching: the 30nama server list merged with progress recorded on this TV by the player.
   Local entries (per account) are the reliable source: the server only learns about TV playback through `observer`
   heartbeats, and its list carries no reliable timestamp. Same title in both = the newer one wins (local when the server
   gives no time). Finished titles drop off; a title removed with the red key stays hidden until it is played again. */
(function () {
  var MAX = 60, DONE = 0.95;
  var cw = N.cw = { diag: { src: '-', server: null, local: 0, shown: 0, err: '', at: 0, keys: '', obs: '', obsAt: 0 } };

  function uid() { var u = N.session && N.session.user || {}; return String(u.user_id || u.id || u.user_name || 'guest'); }
  function key() { return 'cw.' + uid(); }
  function hkey() { return 'cwHide.' + uid(); }
  function load() { var a = N.store.get(key(), []); return a instanceof Array ? a : []; }
  function slim(p) { return { id: p.id, title: p.title, plot: p.plot, image: p.image, info: p.info, score: p.score, genre: p.genre, options: p.options }; }
  function finished(t, d) { return d > 0 && t >= d * DONE; }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function stamp(v) {
    if (v === undefined || v === null || v === '') return 0;
    if (typeof v === 'number' || /^\d{9,13}$/.test(String(v))) { var n = Number(v); return n < 1e11 ? n * 1000 : n; }
    var t = Date.parse(String(v).replace(' ', 'T')); return isNaN(t) ? 0 : t;
  }

  /* ---- recording (player) ---- */
  // post: the title, items/index: the player's playlist and position, t/d: seconds
  cw.record = function (post, items, index, t, d) {
    if (!post || !post.id) return;
    var it = items[index] || {}, info = it.info || {}, e = { id: post.id, post: slim(post), file_id: info.file_id, season: info.season, episode: info.episode, time: Math.floor(t), duration: Math.floor(d), at: Date.now() };
    if (finished(t, d)) {
      var nx = items[index + 1], ni = nx && nx.info;
      if (ni && ni.file_id) { e.file_id = ni.file_id; e.season = ni.season; e.episode = ni.episode; e.time = 0; e.duration = num(ni.duration); e.next = true; }
      else e.done = true; // kept as a marker so an older server entry for it does not come back
    } else if (t < 5) return; // just opened: not "in progress" yet
    var a = load().filter(function (x) { return x && x.id !== post.id; });
    a.unshift(e); if (a.length > MAX) a.length = MAX;
    N.store.set(key(), a);
    var h = N.store.get(hkey(), {}); if (h[post.id]) { delete h[post.id]; N.store.set(hkey(), h); }
  };
  cw.get = function (id) { var a = load(); for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i].done ? null : a[i]; return null; };
  cw.remove = function (id) {
    var h = N.store.get(hkey(), {}); h[id] = Date.now();
    var ks = Object.keys(h); if (ks.length > 150) delete h[ks[0]];
    N.store.set(hkey(), h);
    N.store.set(key(), load().filter(function (x) { return x && x.id !== id; }));
  };

  /* ---- server list ---- */
  function serverEntries(r) {
    var a = r && (r.posts || r.items || r.list || r.data || (r instanceof Array ? r : [])) || [];
    var out = [];
    a.forEach(function (x, i) {
      if (!x) return;
      var p = x.post || x, c = x.continue_watching || (x.post && x.post.continue_watching) || x;
      if (!p || !p.id) return;
      var ci = c.info || {};
      out.push({ id: p.id, post: p, file_id: c.file_id, season: c.season || ci.season, episode: c.episode || ci.episode,
        time: num(c.time || c.position || c.current_time), duration: num(c.duration),
        at: stamp(c.updated_at || c.update_date || c.last_update || c.date || c.created_at || x.updated_at), order: i, server: true });
    });
    return out;
  }

  // raw: result of the `continue_watching` action (or null). Resolves to entries, most recent first.
  cw.merge = function (raw, err) {
    var D = cw.diag, loc = load(), hide = N.store.get(hkey(), {}), srv = serverEntries(raw), byId = {}, out = [];
    D.at = Date.now(); D.err = err || ''; D.server = raw ? srv.length : null; D.local = loc.filter(function (x) { return x && !x.done; }).length;
    try { D.keys = raw ? (raw instanceof Array ? 'array' : Object.keys(raw).slice(0, 6).join(',')) : ''; } catch (e) { D.keys = ''; }
    loc.forEach(function (e) { if (e && e.id && !byId[e.id]) byId[e.id] = e; });
    srv.forEach(function (s) {
      var l = byId[s.id];
      if (l && !(s.at && s.at > l.at)) { if (!l.done) l.post = s.post; return; } // local progress is newer (or the server gives no time); server's post data is fuller
      if (hide[s.id] && !(s.at && s.at > hide[s.id])) return;
      if (finished(s.time, s.duration)) { if (l) l.done = true; return; }
      byId[s.id] = s;
    });
    var dated = [], undated = [];
    for (var k in byId) { var e = byId[k]; if (e.done) continue; (e.at ? dated : undated).push(e); }
    dated.sort(function (a, b) { return b.at - a.at; });
    undated.sort(function (a, b) { return a.order - b.order; });
    out = dated.concat(undated);
    var ns = 0, nl = 0; out.forEach(function (e) { if (e.server) ns++; else nl++; });
    D.src = ns && nl ? 'server+local' : ns ? 'server' : nl ? 'local' : (raw ? 'server (empty)' : 'none');
    D.shown = out.length;
    return out;
  };
  cw.obs = function (ok, msg) { cw.diag.obs = ok ? 'ok' : (msg || 'failed'); cw.diag.obsAt = Date.now(); };
})();
