(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(hover: hover)').matches;
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function cssColor(name, fallback) { var v = getComputedStyle(root).getPropertyValue(name).trim(); return v || fallback; }

  /* ================= Sound: tiny WebAudio synth, no files ================= */
  var sfx = (function () {
    var ctx = null, KEY = 'simrithi-sound';
    var on = true;
    try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) {}
    function ensure() {
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(f0, f1, dur, type, vol, delay) {
      var c = ensure(); if (!c || !on) return;
      var t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    function noise(dur, vol) {
      var c = ensure(); if (!c || !on) return;
      var n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 2200; g.gain.value = vol;
      s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
    }
    return {
      click: function () { noise(0.03, 0.18); tone(1100, 700, 0.05, 'triangle', 0.09); },
      drop: function () { tone(820, 240, 0.2, 'sine', 0.11); tone(1250, 480, 0.12, 'sine', 0.05, 0.05); },
      chime: function () { tone(660, 0, 0.35, 'sine', 0.09); tone(990, 0, 0.45, 'sine', 0.07, 0.09); },
      whoosh: function () { noise(0.28, 0.07); tone(300, 900, 0.25, 'sine', 0.04); },
      listen: function () { tone(520, 780, 0.12, 'sine', 0.09); },
      unlock: ensure,
      isOn: function () { return on; },
      set: function (v) { on = v; try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) {} if (v) { ensure(); this.chime(); } }
    };
  })();

  /* ================= Water ripples on every click ================= */
  function waterRipple(x, y) {
    if (reduced) return;
    var w = document.createElement('div'); w.className = 'wr'; w.setAttribute('aria-hidden', 'true');
    w.style.setProperty('--x', x + 'px'); w.style.setProperty('--y', y + 'px');
    w.innerHTML = '<i></i><i></i><i></i>';
    document.body.appendChild(w);
    setTimeout(function () { w.remove(); }, 1700);
  }
  document.addEventListener('pointerdown', function (e) {
    sfx.unlock();
    if (e.target.closest && e.target.closest('input')) return;
    waterRipple(e.clientX, e.clientY);
    var interactive = e.target.closest && e.target.closest('a, button, [role="button"], .r3-card');
    if (interactive) sfx.click(); else sfx.drop();
  }, { passive: true });

  /* ================= Liquid motion: spring, wobble, press-down, ripples ================= */
  function liquid(el, zone, o) {
    o = o || {};
    if (reduced || !finePointer) return;
    var rot = o.rot == null ? 10 : o.rot, move = o.move == null ? 10 : o.move, grow = o.grow == null ? 0.03 : o.grow;
    var p = { x: 0, y: 0, rx: 0, ry: 0, s: 1 }, v = { x: 0, y: 0, rx: 0, ry: 0, s: 0 }, t = { x: 0, y: 0, rx: 0, ry: 0, s: 1 };
    var raf = 0, hovering = false, pressed = false, lastRip = 0, layer = null, nx = 0, ny = 0;
    el.style.transition = 'none';
    function rippleLayer() {
      if (layer) return layer;
      layer = document.createElement('span'); layer.className = 'rip-layer'; layer.setAttribute('aria-hidden', 'true');
      (o.layer ? o.layer() : el).appendChild(layer); return layer;
    }
    function ripple(x, y) {
      var now = performance.now(); if (now - lastRip < 140) return; lastRip = now;
      var r = document.createElement('span'); r.className = 'ripple';
      r.style.setProperty('--x', x + 'px'); r.style.setProperty('--y', y + 'px');
      rippleLayer().appendChild(r); r.addEventListener('animationend', function () { r.remove(); });
    }
    function aim() {
      var k = pressed ? 1.7 : 1;
      t.ry = nx * rot * 2 * k; t.rx = -ny * rot * 2 * k; t.x = nx * move * 2; t.y = ny * move * 2 + (pressed ? 4 : 0);
      t.s = pressed ? 0.94 : (hovering ? 1 + grow : 1);
    }
    function step() {
      var k = 0.12, d = 0.8, calm = true;
      ['x', 'y', 'rx', 'ry', 's'].forEach(function (a) {
        v[a] += (t[a] - p[a]) * k; v[a] *= d; p[a] += v[a];
        if (Math.abs(v[a]) > 0.001 || Math.abs(t[a] - p[a]) > 0.001) calm = false;
      });
      el.style.transform = 'translate3d(' + p.x.toFixed(2) + 'px,' + p.y.toFixed(2) + 'px,0) rotateX(' + p.rx.toFixed(2) + 'deg) rotateY(' + p.ry.toFixed(2) + 'deg) scale(' + p.s.toFixed(4) + ')';
      raf = (calm && !hovering && !pressed) ? 0 : requestAnimationFrame(step);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(step); }
    zone.addEventListener('pointerenter', function () { hovering = true; aim(); v.s += 0.02; kick(); });
    zone.addEventListener('pointermove', function (e) {
      var r = zone.getBoundingClientRect(); nx = (e.clientX - r.left) / r.width - .5; ny = (e.clientY - r.top) / r.height - .5;
      aim(); if (o.onmove) o.onmove(nx + .5, ny + .5, e, r);
      if (o.ripples !== false) { var rr = (o.layerBox || el).getBoundingClientRect(); ripple(e.clientX - rr.left, e.clientY - rr.top); }
      kick();
    });
    zone.addEventListener('pointerdown', function () { pressed = true; aim(); kick(); });
    function release() { if (!pressed) return; pressed = false; aim(); v.s += 0.03; kick(); }
    zone.addEventListener('pointerup', release); zone.addEventListener('pointercancel', release);
    window.addEventListener('pointerup', release);
    zone.addEventListener('pointerleave', function () { hovering = false; pressed = false; nx = ny = 0; aim(); v.s -= 0.015; kick(); });
  }

  /* ================= Hero terrain lines ================= */
  (function ridges() {
    var cv = $('#ridges'); if (!cv) return;
    var ctx = cv.getContext('2d'), w = 0, h = 0, dpr = 1, rows = 30, t = 0, visible = true, bg, accent;
    var ptr = { x: -999, y: -999, tx: -999, ty: -999 };
    function colors() { bg = cssColor('--bg', '#ffffeb'); accent = cssColor('--accent', '#034f46'); }
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2); w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rows = w < 700 ? 20 : 30; colors(); draw();
    }
    function smooth(a) { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); }
    function height(x, r) {
      return Math.sin(x * 0.0042 + r * 0.7 + t * 0.00035) * 0.5 + Math.sin(x * 0.011 - r * 0.31 + t * 0.0006) * 0.3 + Math.sin(x * 0.024 + r * 1.9 - t * 0.0004) * 0.2;
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      var top = h * 0.2, span = h * 0.7, step = 7;
      for (var r = 0; r < rows; r++) {
        var base = top + span * (r / (rows - 1)), amp = 26 + r * 1.5, line = new Path2D();
        for (var x = -step; x <= w + step; x += step) {
          var mask = 0.18 + 0.82 * smooth((x / w - 0.3) / 0.55), y = base - height(x, r) * amp * mask;
          var dx = x - ptr.x, dy = base - ptr.y;
          y -= 70 * Math.exp(-(dx * dx) / (2 * 130 * 130)) * Math.exp(-(dy * dy) / (2 * 150 * 150));
          if (x <= 0) line.moveTo(x, y); else line.lineTo(x, y);
        }
        var area = new Path2D(line); area.lineTo(w + step, h); area.lineTo(-step, h); area.closePath();
        ctx.fillStyle = bg; ctx.fill(area);
        ctx.strokeStyle = accent; ctx.globalAlpha = 0.12 + 0.6 * (r / (rows - 1)); ctx.lineWidth = 1.2; ctx.stroke(line); ctx.globalAlpha = 1;
      }
    }
    var last = 0;
    function loop(now) {
      requestAnimationFrame(loop);
      if (!visible || document.hidden || now - last < 33) return;
      last = now; t = now; ptr.x += (ptr.tx - ptr.x) * 0.12; ptr.y += (ptr.ty - ptr.y) * 0.12; draw();
    }
    addEventListener('resize', size);
    cv.parentElement.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect(); ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top;
      if (ptr.x < -900) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
    });
    cv.parentElement.addEventListener('pointerleave', function () { ptr.tx = ptr.ty = -999; });
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(cv);
    size(); if (!reduced) requestAnimationFrame(loop);
  })();

  /* ================= Scroll reveal ================= */
  if (!reduced && 'IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.block h2, .section-sub, .stats > div, .tool-group, .wins li, .mail, .socials, .sys, .about-top .origin').forEach(function (el, i) {
      el.classList.add('reveal'); el.style.setProperty('--d', (i % 4) * 0.07 + 's'); rio.observe(el);
    });
  }

  /* ================= About statement: words light up ================= */
  (function statement() {
    var el = $('#statement'); if (!el) return;
    var words = el.textContent.trim().split(/\s+/); el.textContent = '';
    words.forEach(function (wd) { var s = document.createElement('span'); s.className = 'w'; s.textContent = wd + ' '; el.appendChild(s); });
    if (reduced) { $$('.w', el).forEach(function (s) { s.classList.add('lit'); }); return; }
    var wio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('lit', e.isIntersecting || e.boundingClientRect.top < 0); });
    }, { rootMargin: '0px 0px -38% 0px' });
    $$('.w', el).forEach(function (s) { wio.observe(s); });
  })();

  /* ================= Number count-up ================= */
  function countUp(el) {
    var to = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10), suf = el.dataset.suffix || '';
    var start = performance.now(), dur = 1700;
    (function tick(now) {
      var k = Math.min((now - start) / dur, 1), e = 1 - Math.pow(1 - k, 4);
      el.textContent = (to * e).toFixed(dec) + (k >= 1 ? suf : (suf === '+' ? '+' : ''));
      if (k < 1) requestAnimationFrame(tick);
    })(start);
  }
  (function counters() {
    var els = $$('[data-count]'); if (!els.length) return;
    if (reduced || !('IntersectionObserver' in window)) return;
    els.forEach(function (el) { el.textContent = (0).toFixed(parseInt(el.dataset.dec || '0', 10)) + (el.dataset.suffix || ''); });
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    els.forEach(function (el) { cio.observe(el); });
  })();

  /* ================= Scroll progress, section dots, nav spy ================= */
  (function scrollUi() {
    var bar = $('#progress'), ticking = false;
    function upd() {
      ticking = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(scrollY / max, 1) : 0).toFixed(4) + ')';
    }
    document.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();

    var ids = ['top', 'about', 'moments', 'watch', 'skills', 'projects', 'journey', 'contact'];
    var labels = { top: 'Top', about: 'About', moments: 'Moments', watch: 'Watch', skills: 'Skills', projects: 'Projects', journey: 'Journey', contact: 'Contact' };
    var dots = $('#dots'), dotEls = {};
    ids.forEach(function (id) {
      var a = document.createElement('a'); a.href = '#' + id; a.dataset.l = labels[id]; a.setAttribute('aria-label', labels[id]);
      dots.appendChild(a); dotEls[id] = a;
    });
    var links = {}; $$('.nav nav a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        Object.keys(dotEls).forEach(function (k) { dotEls[k].classList.toggle('on', k === id); });
        $$('.nav nav a').forEach(function (a) { a.classList.remove('on'); }); if (links[id]) links[id].classList.add('on');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  })();

  /* ================= Magnetic buttons, spotlight cursor glow ================= */
  if (!reduced && finePointer) {
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
      var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ================= Skills toolbox ================= */
  (function toolbox() {
    var out = $('#usedIn');
    var names = { varshik: 'Varshik', careerlens: 'CareerLens', flashsale: 'FlashSale', pipesense: 'PipeSense', novac: 'the Novac internship', ledgerlite: 'LedgerLite', surge: 'Surge', raftkv: 'RaftKV' };
    var buttons = $$('.toolbox button');
    function clear() { $$('.hl').forEach(function (n) { n.classList.remove('hl'); }); }
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') === 'true';
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); clear();
        if (on) { out.textContent = 'Tap anything above.'; return; }
        b.setAttribute('aria-pressed', 'true');
        var ids = b.dataset['in'].split(' ').filter(Boolean); out.textContent = '';
        if (!ids.length) { out.textContent = b.dataset.note || (b.textContent + ' is part of my coursework and hackathon work.'); return; }
        out.appendChild(document.createTextNode(b.textContent + ' is used in '));
        ids.forEach(function (id) {
          var a = document.createElement('a'); a.href = '#' + id; a.textContent = names[id] || id; out.appendChild(a);
          var n = document.getElementById(id); if (n) n.classList.add('hl');
        });
      });
    });
  })();

  /* ================= Varshik tabs ================= */
  (function vtabs() {
    var img = $('#vimg'); if (!img) return;
    $$('.vtabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.vtabs button').forEach(function (x) { x.setAttribute('aria-selected', 'false'); }); b.setAttribute('aria-selected', 'true');
        img.src = b.dataset.img; img.width = b.dataset.w; img.height = b.dataset.h; img.alt = b.dataset.alt;
      });
    });
  })();

  /* ================= Project spotlights ================= */
  (function spotlights() {
    var panels = $$('.spot-panel'); if (!panels.length) return;
    if ('IntersectionObserver' in window) {
      panels.forEach(function (pn, i) {
        if (i === 0) return;
        new IntersectionObserver(function (es) {
          panels[i - 1].classList.toggle('under', es[0].isIntersecting && es[0].boundingClientRect.top < innerHeight * 0.55);
        }, { rootMargin: '0px 0px -50% 0px', threshold: [0, 0.01] }).observe(pn);
      });
    }
    $$('[data-liquid]').forEach(function (v) { liquid(v, v.closest('.spot-panel'), { rot: 7, move: 14, grow: .02, layerBox: v }); });
    $$('.sys').forEach(function (s) { liquid(s, s, { rot: 6, move: 6, grow: .02, ripples: false }); });
    $$('[data-liquid-solo]').forEach(function (v) { liquid(v, v, { rot: 9, move: 10, grow: .03, layerBox: v }); });
  })();

  /* ================= Journey ================= */
  (function journey() {
    var items = $$('#jList li'), num = $('#jNum'), now = $('#jNow'), list = $('#jList'); if (!items.length) return;
    var shown = 1; var tot = $('#jTotal'); if (tot) tot.textContent = '/ 0' + items.length;
    function roll(to) {
      if (reduced) { num.textContent = '0' + to; shown = to; return; }
      var from = shown, start = performance.now(); shown = to;
      (function tick(n) { var k = Math.min((n - start) / 420, 1); num.textContent = '0' + Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(tick); })(start);
    }
    function setActive(i) {
      items.forEach(function (li, k) { li.classList.toggle('active', k === i); });
      roll(i + 1); now.textContent = items[i].dataset.short || '';
      list.style.setProperty('--p', (items.length > 1 ? i / (items.length - 1) : 0).toFixed(3));
    }
    setActive(0);
    if (!('IntersectionObserver' in window)) return;
    var jio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) setActive(items.indexOf(e.target)); }); }, { rootMargin: '-42% 0px -48% 0px' });
    items.forEach(function (li) { jio.observe(li); });
  })();

  /* ================= Achievements: drag to scroll ================= */
  (function wins() {
    var w = $('#wins'); if (!w) return;
    var down = false, sx = 0, sl = 0;
    w.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') return; down = true; sx = e.clientX; sl = w.scrollLeft; w.classList.add('dragging'); w.setPointerCapture(e.pointerId); });
    w.addEventListener('pointermove', function (e) { if (down) w.scrollLeft = sl - (e.clientX - sx); });
    function end() { down = false; w.classList.remove('dragging'); }
    w.addEventListener('pointerup', end); w.addEventListener('pointercancel', end);
  })();

  /* ================= Creative feature: the 3D ring of my world ================= */
  var ring = (function ring3d() {
    var wrap = $('#ring3d'), el = $('#r3Ring'); if (!wrap || !el) return { spin: function () {} };
    var cards = $$('.r3-card', el), N = cards.length, step = 360 / N;
    var rot = 0, vel = 0, drag = false, lastX = 0, lastT = 0, moved = 0, visible = false, target = null, auto = true, R = 400, hint = $('#r3Hint');
    function layout() {
      var cw = cards[0].getBoundingClientRect().width || 220;
      R = Math.round((cw / 2) / Math.tan(Math.PI / N) + 46);
      cards.forEach(function (c, i) { c.style.transform = 'rotateY(' + (i * step) + 'deg) translateZ(' + R + 'px)'; });
    }
    function apply() { el.style.transform = 'translateZ(' + (-R) + 'px) rotateY(' + rot.toFixed(2) + 'deg)'; }
    function nearest(deg) { var d = ((deg - rot) % 360 + 540) % 360 - 180; return rot + d; }
    function loop() {
      if (visible) {
        if (target !== null && !drag) { rot += (target - rot) * 0.1; vel = 0; if (Math.abs(target - rot) < 0.05) target = null; }
        else if (!drag) { rot += vel; vel *= 0.95; if (auto && Math.abs(vel) < 0.05 && !reduced) rot += 0.14; }
        apply();
      }
      requestAnimationFrame(loop);
    }
    function select(i, silent) {
      cards.forEach(function (c, k) { c.classList.toggle('sel', k === i); });
      target = nearest(-i * step); auto = false;
      $('#r3Title').textContent = cards[i].dataset.title; $('#r3Story').textContent = cards[i].dataset.story;
      if (hint) hint.classList.add('gone'); if (!silent) sfx.chime();
      var hb = $('#r3Hear'); if (hb) hb.hidden = false;
    }
    wrap.addEventListener('pointerdown', function (e) {
      drag = true; moved = 0; lastX = e.clientX; lastT = performance.now(); target = null; auto = true; vel = 0; wrap.classList.add('drag');
      wrap.setPointerCapture(e.pointerId);
    });
    wrap.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - lastX, now = performance.now(), dt = Math.max(now - lastT, 1);
      rot += dx * 0.32; vel = (dx * 0.32) / dt * 16; moved += Math.abs(dx); lastX = e.clientX; lastT = now;
      if (moved > 8 && hint) hint.classList.add('gone');
    });
    function up() { drag = false; wrap.classList.remove('drag'); }
    wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
    cards.forEach(function (c, i) {
      c.addEventListener('click', function () { if (moved < 8) select(i); });
      c.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); }
        if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % N); cards[(i + 1) % N].focus(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + N) % N); cards[(i - 1 + N) % N].focus(); }
      });
      var face = $('.r3-face', c);
      liquid(face, c, { rot: 12, move: 6, grow: .05, layerBox: face, layer: function () { return face; } });
    });
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.05 }).observe(wrap);
    addEventListener('resize', function () { layout(); apply(); });
    layout(); apply(); requestAnimationFrame(loop);
    return { spin: function () { auto = true; target = null; vel = 22; if (hint) hint.classList.add('gone'); sfx.whoosh(); } };
  })();


  /* ================= Hear the story, video and YouTube facade ================= */
  (function media() {
    var hb = $('#r3Hear'); if (hb) { hb.hidden = true; hb.addEventListener('click', function () {
      if (!('speechSynthesis' in window)) return;
      try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance($('#r3Title').textContent + '. ' + $('#r3Story').textContent); u.rate = 1.02; u.pitch = 1.08; speechSynthesis.speak(u); } catch (e) {}
    }); }
    $$('.vid video').forEach(function (v) {
      v.addEventListener('play', function () { $$('.vid video').forEach(function (o) { if (o !== v) o.pause(); }); });
    });
    $$('.yt').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + b.dataset.id + '?autoplay=1&rel=0';
        f.title = 'Open Source Connect Global 2026 session'; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
        f.loading = 'lazy'; b.replaceWith(f);
      });
    });
  })();

  /* ================= Voice and typed commands ================= */
  (function voice() {
    var dock = $('#voiceDock'), mic = $('#micBtn'), say = $('#say'), form = $('#cmdForm'), input = $('#cmdInput'), snd = $('#sndBtn'), bars = $$('#wave i'), heroMic = $('#heroMic');
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, listening = false, stream = null, aCtx = null, analyser = null, rafId = 0, sayT = 0;
    function show(html, ms) {
      say.hidden = false; say.innerHTML = html; clearTimeout(sayT); sayT = setTimeout(function () { say.hidden = true; }, ms || 4200);
    }
    function speak(text) {
      if (!sfx.isOn() || !('speechSynthesis' in window)) return;
      try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.rate = 1.02; u.pitch = 1.08; speechSynthesis.speak(u); } catch (e) {}
    }
    function go(id, line) {
      var t = document.getElementById(id); if (!t) return;
      t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      if (line) { show('<em>' + line + '</em>'); speak(line); }
      sfx.whoosh();
    }
    var intents = [
      [/help|what can i say|commands/, function () { show('Try: about, moments, skills, projects, journey, contact, spin the ring, Varshik, or mute.', 7000); speak('Try about, moments, skills, projects, journey, contact, or spin the ring.'); }],
      [/unmute|sound on|turn on sound/, function () { sfx.set(true); setSnd(); show('Sound on'); }],
      [/mute|silence|quiet|sound off/, function () { show('Sound off'); sfx.set(false); setSnd(); }],
      [/watch|video|clip|youtube|stream|session/, function () { go('watch', 'Here are some clips of me at work.'); }],
      [/spin|ring|3d|three d|moment|photo|picture|gallery/, function () { go('moments'); setTimeout(function () { ring.spin(); }, 650); show('<em>Spinning my world for you.</em>'); speak('Spinning my world for you.'); }],
      [/varshik|flood/, function () { go('varshik', 'Varshik, my flood risk map.'); }],
      [/career ?lens|placement/, function () { go('careerlens', 'CareerLens, my serverless placement platform.'); }],
      [/flash ?sale|inventory|oversell/, function () { go('flashsale', 'FlashSale, inventory that never oversells.'); }],
      [/pipe|robot/, function () { go('pipesense', 'PipeSense, my pipe inspection robot.'); }],
      [/ledger|payment/, function () { go('ledgerlite', 'LedgerLite, a distributed payment ledger.'); }],
      [/surge|ride/, function () { go('surge', 'Surge, real time ride matching.'); }],
      [/raft|key value/, function () { go('raftkv', 'RaftKV, a Raft key value store.'); }],
      [/project|work|built|build/, function () { go('projects', 'Here is what I built.'); }],
      [/skill|superpower|tech|stack|tool/, function () { go('skills', 'My tech superpowers.'); }],
      [/journey|experience|timeline|career|intern|achievement/, function () { go('journey', 'Where I have worked, led and competed.'); }],
      [/contact|email|hire|reach|message/, function () { go('contact', 'Say hello, I would love to hear from you.'); }],
      [/about|who|yourself|introduc|hello|^hi$/, function () { go('about', 'I am Simrithi, a computer science student in Chennai. I build on AWS and lead a three hundred plus student cloud community.'); }],
      [/github|code/, function () { window.open('https://github.com/simrithi', '_blank', 'noopener'); show('<em>Opening GitHub.</em>'); }],
      [/linkedin/, function () { window.open('https://www.linkedin.com/in/simrithi-s/', '_blank', 'noopener'); show('<em>Opening LinkedIn.</em>'); }],
      [/top|home|start|beginning/, function () { go('top'); show('<em>Back to the top.</em>'); }],
      [/down|next|scroll/, function () { scrollBy({ top: innerHeight * 0.85, behavior: reduced ? 'auto' : 'smooth' }); sfx.whoosh(); }],
      [/up|previous|back/, function () { scrollBy({ top: -innerHeight * 0.85, behavior: reduced ? 'auto' : 'smooth' }); sfx.whoosh(); }]
    ];
    function run(text) {
      var q = (text || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); if (!q) return;
      for (var i = 0; i < intents.length; i++) if (intents[i][0].test(q)) { intents[i][1](q); return; }
      show('I did not catch "' + q.replace(/</g, '') + '". Try projects, skills, journey, contact or spin the ring.', 5200);
    }
    function setSnd() { var on = sfx.isOn(); snd.setAttribute('aria-pressed', on ? 'true' : 'false'); snd.setAttribute('aria-label', on ? 'Sound on. Click to mute.' : 'Sound off. Click to turn on.'); }
    snd.addEventListener('click', function () { sfx.set(!sfx.isOn()); setSnd(); }); setSnd();
    form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; show('You typed: <em>' + v.replace(/</g, '') + '</em>', 1400); setTimeout(function () { run(v); }, 250); });

    function meter() {
      if (!analyser) return;
      var data = new Uint8Array(analyser.frequencyBinCount); analyser.getByteFrequencyData(data);
      var sum = 0; for (var i = 0; i < data.length; i++) sum += data[i]; var level = sum / data.length / 255;
      bars.forEach(function (b, k) { var v = data[(k * 2 + 1) % data.length] / 255; b.style.height = (4 + Math.max(v, level) * 26).toFixed(1) + 'px'; });
      rafId = requestAnimationFrame(meter);
    }
    function stopMeter() {
      cancelAnimationFrame(rafId); bars.forEach(function (b) { b.style.height = ''; });
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null;
      if (aCtx) { try { aCtx.close(); } catch (e) {} aCtx = null; } analyser = null;
    }
    function startMeter() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
        if (!listening) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
        stream = s; aCtx = new (window.AudioContext || window.webkitAudioContext)(); var src = aCtx.createMediaStreamSource(s);
        analyser = aCtx.createAnalyser(); analyser.fftSize = 64; src.connect(analyser); meter();
      }).catch(function () {});
    }
    function setListening(v) {
      listening = v; mic.setAttribute('aria-pressed', v ? 'true' : 'false'); dock.classList.toggle('live', v);
      if (v) startMeter(); else stopMeter();
    }
    function toggle() {
      if (!SR) { show('Voice commands need Chrome or Edge. You can type a command in the box instead.', 6000); input.focus(); return; }
      if (listening) { try { rec.stop(); } catch (e) {} return; }
      rec = new SR(); rec.lang = navigator.language || 'en-US'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      rec.onstart = function () { setListening(true); sfx.listen(); show('Listening… try <em>"projects"</em>, <em>"skills"</em> or <em>"spin the ring"</em>', 6000); try { speechSynthesis.cancel(); } catch (e) {} };
      rec.onresult = function (e) {
        var txt = '', fin = false;
        for (var i = e.resultIndex; i < e.results.length; i++) { txt += e.results[i][0].transcript; if (e.results[i].isFinal) fin = true; }
        show('<em>' + txt.replace(/</g, '') + '</em>', fin ? 1600 : 6000);
        if (fin) setTimeout(function () { run(txt); }, 350);
      };
      rec.onerror = function (e) {
        setListening(false);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') show('Microphone is blocked. Allow it in your browser, or type a command instead.', 6000);
        else if (e.error === 'no-speech') show('I did not hear anything. Tap the mic and try again.', 4000);
      };
      rec.onend = function () { setListening(false); };
      try { rec.start(); } catch (e) { setListening(false); }
    }
    mic.addEventListener('click', toggle);
    if (heroMic) heroMic.addEventListener('click', toggle);
    if (!SR) mic.title = 'Voice needs Chrome or Edge. Type a command instead.';
  })();
})();
