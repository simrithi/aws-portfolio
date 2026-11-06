(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function cssColor(name, fallback) {
    var v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallback;
  }

  /* ---------- Hero terrain: ridge lines that lift toward the pointer ---------- */
  (function ridges() {
    var cv = $('#ridges'), ctx = cv.getContext('2d');
    var w = 0, h = 0, dpr = 1, rows = 30, t = 0, visible = true;
    var ptr = { x: -999, y: -999, tx: -999, ty: -999 };
    var bg, accent;
    function colors() { bg = cssColor('--bg', '#0a1216'); accent = cssColor('--accent', '#3fd6c9'); }
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rows = w < 700 ? 20 : 30;
      colors(); draw();
    }
    function smooth(a) { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); }
    function height(x, r) {
      return Math.sin(x * 0.0042 + r * 0.7 + t * 0.00035) * 0.5 +
             Math.sin(x * 0.011 - r * 0.31 + t * 0.0006) * 0.3 +
             Math.sin(x * 0.024 + r * 1.9 - t * 0.0004) * 0.2;
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      var top = h * 0.2, span = h * 0.7, step = 7;
      for (var r = 0; r < rows; r++) {
        var base = top + span * (r / (rows - 1));
        var amp = 26 + r * 1.5;
        var line = new Path2D();
        for (var x = -step; x <= w + step; x += step) {
          var mask = 0.18 + 0.82 * smooth((x / w - 0.3) / 0.55);
          var y = base - height(x, r) * amp * mask;
          var dx = x - ptr.x, dy = base - ptr.y;
          y -= 70 * Math.exp(-(dx * dx) / (2 * 130 * 130)) * Math.exp(-(dy * dy) / (2 * 150 * 150));
          if (x <= 0) line.moveTo(x, y); else line.lineTo(x, y);
        }
        var area = new Path2D(line);
        area.lineTo(w + step, h); area.lineTo(-step, h); area.closePath();
        ctx.fillStyle = bg; ctx.fill(area);
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.12 + 0.6 * (r / (rows - 1));
        ctx.lineWidth = 1.2;
        ctx.stroke(line);
        ctx.globalAlpha = 1;
      }
    }
    var last = 0;
    function loop(now) {
      requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      if (now - last < 33) return;      // about 30 fps is plenty for slow terrain
      last = now; t = now;
      ptr.x += (ptr.tx - ptr.x) * 0.12; ptr.y += (ptr.ty - ptr.y) * 0.12;
      draw();
    }
    addEventListener('resize', size);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { colors(); draw(); });
    cv.parentElement.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect();
      ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top;
      if (ptr.x < -900) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
    });
    cv.parentElement.addEventListener('pointerleave', function () { ptr.tx = ptr.ty = -999; });
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(cv);
    size();
    if (!reduced) requestAnimationFrame(loop);
  })();

  /* ---------- Scroll reveal ---------- */
  if (!reduced && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.block h2, .section-sub, .stats > div, .tool-group, .tile, .timeline li, .wins li, .mail, .socials').forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.setProperty('--d', (i % 4) * 0.07 + 's');
      io.observe(el);
    });
  }

  /* ---------- About statement: words light up as you read down the page ---------- */
  (function statement() {
    var el = $('#statement');
    if (!el) return;
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (wd) {
      var s = document.createElement('span');
      s.className = 'w'; s.textContent = wd + ' ';
      el.appendChild(s);
    });
    if (reduced) { $$('.w', el).forEach(function (s) { s.classList.add('lit'); }); return; }
    var wio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        e.target.classList.toggle('lit', e.isIntersecting || e.boundingClientRect.top < 0);
      });
    }, { rootMargin: '0px 0px -38% 0px' });
    $$('.w', el).forEach(function (s) { wio.observe(s); });
  })();

  /* ---------- Nav highlight ---------- */
  (function navSpy() {
    var links = $$('.nav nav a');
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var nio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { links.forEach(function (a) { a.classList.remove('on'); }); var a = map[e.target.id]; if (a) a.classList.add('on'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) nio.observe(s); });
  })();

  /* ---------- Magnetic buttons and spotlight cards ---------- */
  if (!reduced && matchMedia('(hover: hover)').matches) {
    $$('.mag').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.18) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.25) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }
  $$('.spot').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Skills toolbox: pick a tool, see where it was used ---------- */
  (function toolbox() {
    var out = $('#usedIn');
    var names = { varshik: 'Varshik', careerlens: 'CareerLens', flashsale: 'FlashSale', pipesense: 'PipeSense', novac: 'Novac internship' };
    var buttons = $$('.toolbox button');
    function clear() { $$('.hl').forEach(function (n) { n.classList.remove('hl'); }); }
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') === 'true';
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        clear();
        if (on) { out.textContent = 'Tap anything above.'; return; }
        b.setAttribute('aria-pressed', 'true');
        var ids = b.dataset.in.split(' ').filter(Boolean);
        out.textContent = '';
        if (!ids.length) { out.textContent = b.textContent + ' is part of my coursework and hackathon work.'; return; }
        out.appendChild(document.createTextNode(b.textContent + ' is used in '));
        ids.forEach(function (id) {
          var a = document.createElement('a');
          a.href = '#' + id; a.textContent = names[id] || id;
          out.appendChild(a);
          var n = document.getElementById(id); if (n) n.classList.add('hl');
        });
      });
    });
  })();

  /* ---------- Creative feature: the rising flood ---------- */
  (function flood() {
    var MAX = 60, STORY_AT = 24, RISE_TARGET = 36, RISE_MS = 6500, RAIN_MS = 9000;
    var drop = $('#drop'), dropLabel = $('#dropLabel'), hint = $('#dropHint');
    var water = $('#water'), marker = $('#marker'), gauge = $('#gauge');
    var track = $('#gaugeTrack'), handle = $('#gaugeHandle'), read = $('#gaugeRead');
    var cv = $('#rain'), ctx = cv.getContext('2d');
    var risky = $$('[data-risk]');
    var level = 0, flooded = false, raf = 0, rainUntil = 0, drops = [], rings = [], looping = false;

    setTimeout(function () { hint.classList.add('gone'); }, 12000);

    function setLevel(v) {
      level = Math.max(0, Math.min(MAX, v));
      root.style.setProperty('--level', level.toFixed(2));
      root.style.setProperty('--handle', (100 - level / MAX * 100).toFixed(2) + '%');
      var m = (level / MAX * 3).toFixed(1);
      read.textContent = m + ' m';
      handle.setAttribute('aria-valuenow', Math.round(level / MAX * 100));
      handle.setAttribute('aria-valuetext', m + ' metres');
      if (flooded && level >= STORY_AT && marker.hidden && !storyClosed) marker.hidden = false;
      updateRisk();
    }
    var storyClosed = false;

    function updateRisk() {
      var top = innerHeight * (1 - level / 100);
      risky.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var wet = flooded && level > 2 && (r.top + r.height / 2) > top && r.bottom > 0 && r.top < innerHeight;
        if (el.classList.contains('wet') !== wet) {
          el.classList.toggle('wet', wet);
          var chip = el.querySelector('.risk-chip');
          if (chip) chip.textContent = wet ? chip.dataset.wet : chip.dataset.dry;
        }
      });
    }

    function animateTo(target, ms, done) {
      cancelAnimationFrame(raf);
      var from = level, start = performance.now();
      if (reduced) { setLevel(target); if (done) done(); return; }
      (function step(now) {
        var k = Math.min((now - start) / ms, 1);
        var e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        setLevel(from + (target - from) * e);
        if (k < 1) raf = requestAnimationFrame(step); else if (done) done();
      })(start);
    }

    function resize() {
      var d = devicePixelRatio || 1;
      cv.width = innerWidth * d; cv.height = innerHeight * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    addEventListener('resize', resize); resize();

    function rainFrame(now) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      var waterTop = innerHeight * (1 - level / 100);
      if (now < rainUntil && drops.length < 170) {
        for (var i = 0; i < 4; i++) drops.push({ x: Math.random() * innerWidth, y: -20, v: 14 + Math.random() * 10, l: 10 + Math.random() * 14 });
      }
      ctx.strokeStyle = 'rgba(' + cssColor('--water-a', '63,182,214') + ',.85)';
      ctx.lineWidth = 1.4; ctx.beginPath();
      drops = drops.filter(function (d) {
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + d.l);
        d.y += d.v;
        if (level > 1 && d.y >= waterTop && rings.length < 40) { rings.push({ x: d.x, y: waterTop + 6, r: 2, a: .7 }); return false; }
        return d.y < innerHeight;
      });
      ctx.stroke();
      rings = rings.filter(function (g) {
        g.r += 0.9; g.a -= 0.025;
        ctx.strokeStyle = 'rgba(' + cssColor('--water-a', '63,182,214') + ',' + Math.max(g.a, 0) + ')';
        ctx.beginPath(); ctx.ellipse(g.x, g.y, g.r * 2, g.r * 0.5, 0, 0, 6.283); ctx.stroke();
        return g.a > 0;
      });
      if (drops.length || rings.length || now < rainUntil) requestAnimationFrame(rainFrame); else looping = false;
    }
    function startRain() {
      if (reduced) return;
      rainUntil = performance.now() + RAIN_MS;
      if (!looping) { looping = true; requestAnimationFrame(rainFrame); }
    }

    function start() {
      flooded = true; storyClosed = false;
      document.body.classList.add('flooded');
      drop.setAttribute('aria-pressed', 'true');
      drop.setAttribute('aria-label', 'Let the water drain');
      drop.classList.add('used'); dropLabel.textContent = 'Let it drain';
      hint.classList.add('gone');
      water.classList.add('on'); gauge.hidden = false;
      startRain();
      animateTo(RISE_TARGET, RISE_MS);
    }
    function stop() {
      flooded = false;
      drop.setAttribute('aria-pressed', 'false');
      drop.setAttribute('aria-label', 'Make it rain. Floods the page and reveals why I build what I build.');
      dropLabel.textContent = 'Make it rain';
      marker.hidden = true;
      animateTo(0, reduced ? 1 : 3000, function () {
        water.classList.remove('on'); gauge.hidden = true;
        document.body.classList.remove('flooded');
        updateRisk();
      });
    }
    drop.addEventListener('click', function () { flooded ? stop() : start(); });
    $('#drain').addEventListener('click', stop);
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && flooded) stop(); });

    // Water level follows the page as it scrolls, so labels stay honest.
    var ticking = false;
    function onFrameScroll() { if (!flooded || ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; updateRisk(); }); }
    document.addEventListener('scroll', onFrameScroll, { passive: true });

    // Draggable gauge: the visitor controls the water.
    function fromPointer(e) {
      var r = track.getBoundingClientRect();
      var k = 1 - (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      setLevel(k * MAX);
    }
    var dragging = false;
    track.addEventListener('pointerdown', function (e) { dragging = true; track.setPointerCapture(e.pointerId); fromPointer(e); });
    track.addEventListener('pointermove', function (e) { if (dragging) fromPointer(e); });
    track.addEventListener('pointerup', function () { dragging = false; });
    track.addEventListener('pointercancel', function () { dragging = false; });
    handle.addEventListener('keydown', function (e) {
      var d = { ArrowUp: 2, ArrowRight: 2, ArrowDown: -2, ArrowLeft: -2, PageUp: 10, PageDown: -10 }[e.key];
      if (e.key === 'Home') { setLevel(0); e.preventDefault(); }
      else if (e.key === 'End') { setLevel(MAX); e.preventDefault(); }
      else if (d) { cancelAnimationFrame(raf); setLevel(level + d); e.preventDefault(); }
    });
    marker.addEventListener('keydown', function (e) { if (e.key === 'Escape') { marker.hidden = true; storyClosed = true; } });
    setLevel(0);
  })();
})();
