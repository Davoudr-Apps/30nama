/* Launch screen (#splash): six looks, picked in Settings > Display (store 'splash', default 'curtain').
   Every look starts from the same plain dark frame as the webOS splashBackground (splash.png), then animates with opacity/transform only.
   Built synchronously at script load so it is up before the first paint; app.js decides when it leaves (min 1.2 s, gives up at 10 s). */
(function () {
  var LOOKS = ['mosaic', 'persian', 'light', 'curtain', 'aurora', 'leader'];
  N.SPLASHES = LOOKS;

  function cube(cls) { return '<div class="sp-cube ' + (cls || '') + '">' + N.ui.logo().outerHTML.replace(/lg-m/g, 'sp-m-' + (cls || 'x')) + '</div>'; }
  var WM = '<div class="sp-wm"><b>30</b>nama</div>', DOTS = '<div class="dots3"><i></i><i></i><i></i></div>';

  // poster URLs from the last Home kept on the TV (homeCache); empty when there is none
  function cachedPosters(max) {
    var out = [], seen = {};
    (function walk(o, d) {
      if (!o || typeof o !== 'object' || d > 6 || out.length >= max) return;
      var po = o.image && o.image.poster;
      if (po) { var u = (po.webp && (po.webp.medium || po.webp.large)) || (po.jpg && (po.jpg.medium || po.jpg.large)); if (u && !seen[u]) { seen[u] = 1; out.push(u); } return; }
      for (var k in o) if (o.hasOwnProperty(k)) walk(o[k], d + 1);
    })(N.store.get('homeCache', null), 0);
    return out;
  }

  var B = {
    mosaic: function () {
      var ps = cachedPosters(18), h = '<div class="sp-wall' + (ps.length ? '' : ' plain') + '">';
      for (var i = 0; i < 40; i++) {
        h += '<div class="t">' + (ps.length ? '<img alt="" decoding="async" src="' + String(ps[(i * 7) % ps.length]).replace(/"/g, '&quot;') + '">' : '') + '</div>';
      }
      return h + '</div><div class="sp-vig"></div><div class="sp-tile">' + cube('mo') + '</div>' + WM;
    },
    persian: function () {
      return '<div class="sp-row">' + cube('pe') + '<div class="sp-fa"><div class="n">سی‌نما</div><div class="l">30NAMA</div></div></div><div class="sp-bar"><i></i></div>';
    },
    light: function () {
      return '<div class="sp-bg"></div>' + cube('li') + WM + '<div class="sp-line"></div>';
    },
    curtain: function () {
      return '<div class="sp-stage"></div><div class="sp-mid">' + cube('cu') + WM + '</div><div class="sp-cur l"></div><div class="sp-cur r"></div><div class="sp-lb t"></div><div class="sp-lb b"></div>';
    },
    aurora: function () {
      return '<div class="sp-blob a"></div><div class="sp-blob b"></div><div class="sp-blob c"></div><div class="sp-card"><div class="sp-tile">' + cube('au') + '</div>' + WM + '</div>';
    },
    leader: function () {
      return '<div class="sp-x h"></div><div class="sp-x v"></div><div class="sp-ring"></div><div class="sp-disk"></div>' + cube('le') + '<div class="sp-cap">30NAMA</div>';
    }
  };

  N.splashLook = function () { var v = N.store.get('splash', 'curtain'); return LOOKS.indexOf(v) >= 0 ? v : 'curtain'; };
  N.splashBuild = function (look) {
    var s = document.getElementById('splash'); if (!s) return null;
    look = LOOKS.indexOf(look) >= 0 ? look : 'curtain';
    s.className = 'sp-' + look + (N.store.get('calm', false) ? ' still' : '');
    s.innerHTML = B[look]() + DOTS;
    return s;
  };

  // Settings preview: play a look once over the app; any key or click ends it early
  var pv = null;
  N.splashPreview = function (look) {
    if (pv) pv.end();
    var s = N.splashBuild(look); if (!s) return;
    s.style.display = 'flex';
    var t = setTimeout(end, 2800);
    function swallow(e) { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); end(); }
    function end() {
      if (!pv) return; pv = null; clearTimeout(t);
      window.removeEventListener('keydown', swallow, true); window.removeEventListener('click', swallow, true);
      s.classList.add('out');
      setTimeout(function () { if (!pv) { s.style.display = 'none'; s.innerHTML = ''; } }, 450);
    }
    pv = { end: end };
    setTimeout(function () { if (pv) { window.addEventListener('keydown', swallow, true); window.addEventListener('click', swallow, true); } }, 0);
  };

  N.splashBuild(N.splashLook());
})();
