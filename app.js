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

  window.__sfx = sfx;

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

  /* ================= Hero: rotating word + cursor glow ================= */
  (function heroLive() {
    var words = $$('.rot span'), i = 0, hero = $('.hero'), spot = $('.hero .spot');
    if (words.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInterval(function () {
        var cur = words[i]; i = (i + 1) % words.length; var nx = words[i];
        cur.classList.remove('on'); cur.classList.add('out');
        nx.classList.remove('out'); nx.style.transition = 'none'; nx.style.transform = 'translateY(70%)'; void nx.offsetWidth; nx.style.transition = ''; nx.style.transform = ''; nx.classList.add('on');
        setTimeout(function () { cur.classList.remove('out'); }, 700);
      }, 2600);
    }
    if (hero && spot) hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect(); spot.style.transform = 'translate(' + (e.clientX - r.left) + 'px,' + (e.clientY - r.top) + 'px)';
    }, { passive: true });
  })();

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

    var ids = ['top', 'about', 'moments', 'watch', 'writing', 'skills', 'projects', 'journey', 'contact'];
    var labels = { top: 'Top', about: 'About', moments: 'Moments', watch: 'Watch', writing: 'Writing', skills: 'Skills', projects: 'Projects', journey: 'Journey', contact: 'Contact' };
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
    var names = { varshik: 'Varshik', careerlens: 'CareerLens', flashsale: 'FlashSale', pipesense: 'PipeSense', novac: 'my Novac internship', ledgerlite: 'LedgerLite', surge: 'Surge', raftkv: 'RaftKV' };
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
    function renderTech(card) {
      var box = $('#r3Tech'), detail = $('#r3Detail'), ht = $('#r3HearTech'), raw = card.dataset.tech, d = null;
      try { d = raw ? JSON.parse(raw) : null; } catch (e) {}
      if (!d) { box.hidden = true; detail.classList.remove('has-tech'); if (ht) ht.hidden = true; $('#r3Kicker').textContent = 'The story'; return; }
      var ul = $('#r3Bullets'); ul.textContent = '';
      d.bul.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      var st = $('#r3Stack'); st.textContent = '';
      (d.stack || []).forEach(function (t) { var s = document.createElement('span'); s.textContent = t; st.appendChild(s); });
      var lk = $('#r3Links'); lk.textContent = '';
      (d.links || []).forEach(function (l) { var a = document.createElement('a'); a.href = l[1]; a.textContent = l[0]; a.rel = 'noopener'; a.target = '_blank'; lk.appendChild(a); });
      box.hidden = false; detail.classList.add('has-tech'); if (ht) ht.hidden = false; $('#r3Kicker').textContent = 'The story';
    }

    /* ---------- the card opens like a 3D book ---------- */
    var ov = $('#r3Open'), oFly = $('#r3oFly'), oCenter = $('#r3oCenter'), oTilt = $('#r3oTilt'), oBook = $('#r3oBook'), oFront = $('#r3oFront'), oBack = $('#r3oBack'), oPage = $('#r3oPage'), openerCard = null, openT = 0;
    function mk(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
    function say2(text) {
      if (!('speechSynthesis' in window)) return;
      try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.rate = 1.02; u.pitch = 1.06; speechSynthesis.speak(u); } catch (e) {}
    }
    function techBlock(d) {
      var wrap = mk('div', 'o-tech');
      wrap.appendChild(mk('p', 'o-kicker', 'Under the hood'));
      if (d.img) { var im = mk('img', 'o-arch'); im.src = d.img; im.alt = d.imgAlt || ''; im.loading = 'lazy'; wrap.appendChild(im); }
      var ul = mk('ul'); d.bul.forEach(function (t) { ul.appendChild(mk('li', null, t)); }); wrap.appendChild(ul);
      var st = mk('div', 'o-chips'); (d.stack || []).forEach(function (t) { st.appendChild(mk('span', null, t)); }); wrap.appendChild(st);
      if (d.links && d.links.length) { var lk = mk('p', 'o-links'); d.links.forEach(function (l) { var a = mk('a', null, l[0]); a.href = l[1]; a.target = '_blank'; a.rel = 'noopener'; lk.appendChild(a); }); wrap.appendChild(lk); }
      return wrap;
    }
    function openBook(card) {
      if (!ov) return; openerCard = card; clearTimeout(openT);
      var d = card.dataset, tech = null; try { tech = d.tech ? JSON.parse(d.tech) : null; } catch (e) {}
      var face = $('.r3-face', card), faceRect = face.getBoundingClientRect();
      oBook.classList.remove('open'); oCenter.classList.remove('spread');
      oFront.className = face.className + ' r3o-cfront'; oFront.innerHTML = face.innerHTML; oFront.removeAttribute('style');
      // left page (back of the cover): technical details, or the photo itself
      oBack.textContent = '';
      if (tech) { oBack.appendChild(techBlock(tech)); }
      else {
        var img = $('img', face);
        if (img) { var big = mk('img', 'o-photo'); big.src = img.src; big.alt = img.alt; oBack.appendChild(big); }
        oBack.appendChild(mk('p', 'o-cap', d.title));
      }
      // right page: the story
      oPage.textContent = '';
      oPage.appendChild(mk('p', 'o-kicker', 'The story'));
      var t = mk('h3', null, d.title); t.id = 'r3oTitle'; oPage.appendChild(t);
      oPage.appendChild(mk('p', 'o-story', d.story));
      var btns = mk('div', 'o-btns');
      var b1 = mk('button', 'hear', 'Hear this story'); b1.type = 'button'; b1.addEventListener('click', function () { say2(d.title + '. ' + d.story); }); btns.appendChild(b1);
      if (tech) { var b2 = mk('button', 'hear', 'Hear the tech'); b2.type = 'button'; b2.addEventListener('click', function () { say2(d.title + ', under the hood. ' + tech.bul.join(' ')); }); btns.appendChild(b2); }
      oPage.appendChild(btns);
      if (tech) { var m = techBlock(tech); m.classList.add('o-tech-m'); oPage.appendChild(m); }
      ov.hidden = false; ov.setAttribute('aria-labelledby', 'r3oTitle');
      requestAnimationFrame(function () { ov.classList.add('show'); });
      var spread = matchMedia('(min-width: 761px)').matches;
      if (!reduced && oFly.animate) {
        var br = oBook.getBoundingClientRect(), s = faceRect.width / br.width;
        var dx = (faceRect.left + faceRect.width / 2) - (innerWidth / 2), dy = (faceRect.top + faceRect.height / 2) - (innerHeight / 2);
        oFly.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' }, { transform: 'none' }], { duration: 850, easing: 'cubic-bezier(.16,1,.3,1)' });
        sfx.whoosh();
      }
      openT = setTimeout(function () { oBook.classList.add('open'); if (spread) oCenter.classList.add('spread'); sfx.chime(); }, reduced ? 0 : 800);
      $('#r3oClose').focus({ preventScroll: true });
    }
    function closeBook() {
      if (!ov || ov.hidden) return; clearTimeout(openT);
      oBook.classList.remove('open'); oCenter.classList.remove('spread'); ov.classList.remove('show');
      try { speechSynthesis.cancel(); } catch (e) {}
      setTimeout(function () { ov.hidden = true; if (openerCard) openerCard.focus({ preventScroll: true }); }, reduced ? 0 : 420);
    }
    if (ov) {
      $('#r3oClose').addEventListener('click', closeBook);
      ov.addEventListener('click', function (e) { if (!e.target.closest('.r3o-book') && !e.target.closest('.r3o-close')) closeBook(); });
      addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBook(); });
      liquid(oTilt, ov, { rot: 6, move: 8, grow: 0, ripples: false });
    }

    function select(i, silent) {
      cards.forEach(function (c, k) { c.classList.toggle('sel', k === i); });
      target = nearest(-i * step); auto = false;
      $('#r3Title').textContent = cards[i].dataset.title; $('#r3Story').textContent = cards[i].dataset.story; renderTech(cards[i]);
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
      c.addEventListener('click', function () { if (moved < 8) { select(i); openBook(c); } });
      c.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); openBook(c); }
        if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % N); cards[(i + 1) % N].focus(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + N) % N); cards[(i - 1 + N) % N].focus(); }
      });
      var face = $('.r3-face', c);
      liquid(face, c, { rot: 12, move: 6, grow: .05, layerBox: face, layer: function () { return face; } });
    });
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.05 }).observe(wrap);
    addEventListener('resize', function () { layout(); apply(); });
    layout(); apply(); requestAnimationFrame(loop);
    window.__openCard = function (card) { var idx = cards.indexOf(card); if (idx > -1) { select(idx); openBook(card); } };
    return { spin: function () { if (window.__worldSpin) { window.__worldSpin(); return; } auto = true; target = null; vel = 22; if (hint) hint.classList.add('gone'); sfx.whoosh(); } };
  })();


  /* ================= Hear the story, video and YouTube facade ================= */
  (function media() {
    var hb = $('#r3Hear'); if (hb) { hb.hidden = true; hb.addEventListener('click', function () {
      if (!('speechSynthesis' in window)) return;
      try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance($('#r3Title').textContent + '. ' + $('#r3Story').textContent); u.rate = 1.02; u.pitch = 1.08; speechSynthesis.speak(u); } catch (e) {}
    }); }
    var ht = $('#r3HearTech'); if (ht) ht.addEventListener('click', function () {
      if (!('speechSynthesis' in window)) return;
      var txt = $('#r3Title').textContent + ', under the hood. ' + $$('#r3Bullets li').map(function (l) { return l.textContent; }).join(' ');
      try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(txt); u.rate = 1.02; u.pitch = 1.06; speechSynthesis.speak(u); } catch (e) {}
    });
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

  /* ================= Voice assistant: answers, tour, log, controls ================= */
  (function voice() {
    var dock = $('#voiceDock'), mic = $('#micBtn'), say = $('#say'), form = $('#cmdForm'), input = $('#cmdInput'), snd = $('#sndBtn'), bars = $$('#wave i'), heroMic = $('#heroMic');
    var guide = $('#vguide'), guideBtn = $('#guideBtn'), log = $('#vlog'), rateEl = $('#vRate'), voiceEl = $('#vVoice'), speakEl = $('#vSpeak'), keepEl = $('#vKeep'), tryEl = $('#vTry');
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var rec = null, listening = false, keepOn = false, speaking = false, stream = null, aCtx = null, analyser = null, rafId = 0, sayT = 0;
    var tourId = 0, lastSpoken = '', voices = [], PKEY = 'simrithi-voice';
    var prefs = { rate: 1, voice: '', speak: true };
    try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(PKEY)) || {}); } catch (e) {}
    function savePrefs() { try { localStorage.setItem(PKEY, JSON.stringify(prefs)); } catch (e) {} }

    /* ---------- what the assistant knows (all from my resumes) ---------- */
    var DEMO = 'https://d24wvc44c3vaxz.cloudfront.net/'; var CLDEMO = 'https://main.d1afxz58feyue1.amplifyapp.com/';
    var KB = [
      { k: "whyvarshik", re: /why .*(flood|varshik)|inspiration|motivat|story behind|what inspired/, id: 'varshik', a: "I grew up in Tamil Nadu and saw what floods do to families. Varshik began with one question: what if we could see which roads will flood before it rains?", more: ["Tell me about Varshik", "Open the live demo"] },
      { k: "varshik", re: /varshik|flood|waterlog/, id: 'varshik', a: "Varshik is a street level flood risk map. Vision models on Amazon SageMaker score sixty metre road cells for waterlogging from dashcam frames, terrain and rainfall, and Amazon Bedrock writes plain language briefs. Its top risk cells matched Delhi's official flood hotspots, though the results are preliminary.", more: ["Why did you build it?", "Open the live demo", "Tell me about CareerLens"] },
      { k: "careerlens", re: /career ?lens|placement/, id: 'careerlens', a: "CareerLens is a serverless placement platform I built solo on AWS. About thirty Lambda functions, API Gateway, DynamoDB, Cognito and EventBridge power a student portal and a company portal, and an LLM turns messy placement notices into structured drives.", more: ["Tell me about FlashSale", "What are your cloud skills?"] },
      { k: "flashsale", re: /flash ?sale|oversell|inventory|redis|lua/, id: 'flashsale', a: "FlashSale is an inventory system that never oversells. One Redis Lua script makes check and decrement a single atomic step, a virtual waiting room admits buyers in batches, and RabbitMQ workers release unpaid stock. Zero oversells under Locust load tests.", more: ["Tell me about LedgerLite", "What are your backend skills?"] },
      { k: "pipesense", re: /pipe ?sense|robot|pipe inspection|datathon/, id: 'pipesense', a: "PipeSense is a pipe inspection robot. Three sensors fuse into one position estimate, an ESP32 drives it and YOLO detects seven defect types offline. We won first place out of three hundred teams at the Datathon with the Robotics Club and IEEE, and the patent is in progress.", more: ["Tell me about the satellite", "Spin the ring"] },
      { k: "ledgerlite", re: /ledger|payment|upi|saga|outbox/, id: 'ledgerlite', a: "LedgerLite is a UPI style distributed payment ledger in Java and Spring Boot. It uses idempotency keys, saga based transfers and the transactional outbox pattern, and survived random node kills with zero double debits.", more: ["Tell me about Surge", "Tell me about RaftKV"] },
      { k: "surge", re: /surge|ride|uber|h3|hexagon/, id: 'surge', a: "Surge is a real time ride matching engine in Go. It indexes live driver locations into Uber H3 hexagons, matches riders by ETA over gRPC, and computes surge from Kafka streams, validated with a fleet simulator across Chennai.", more: ["Tell me about RaftKV"] },
      { k: "raftkv", re: /raft|consensus|key ?value|distributed (store|database)/, id: 'raftkv', a: "RaftKV is a distributed key value store with the Raft consensus algorithm written from scratch: leader election, log replication, snapshots and linearizable reads, tested with Jepsen style partition and crash tests.", more: ["What are your backend skills?"] },
      { k: "cansat", re: /cansat|can-?sat|satellite|in-?space|defionix|ground station|flight software/, id: "moments", spin: true, a: "For the IN-SPACe CANSAT competition our team Defionix designed a seven U cylindrical satellite with a Raspberry Pi 5, IMU, barometer, NavIC GPS and a LoRa radio. I built the ground station and the flight software. We were a PDR finalist in the top thirty five in India and went all the way to the launch round, but funding fell short at the very end and we could not fly it.", more: ["Why did it not launch?", "Tell me about the ground station", "Tell me about PipeSense"] },
      { k: "funding", re: /funding|fail|failure|setback|lesson|did not launch|didn t launch|why .*(launch|fly)|couldn t|could not|what went wrong|biggest challenge/, id: "moments", spin: true, a: "We reached the launch round, then funding fell short at the very end, so we could not fly CAN-7USAT. The satellite hardware alone was about ninety seven thousand rupees and the ground station another one point six five lakh. I took one lesson from it: treat funding as part of the engineering plan from day one.", more: ["Tell me about the satellite", "What have you won?"] },
      { k: "writing", re: /article|blog|writing|wrote|written|publication|builder center article/, id: "writing", a: "I write about what I build on AWS Builder Center. My article is Varshik: Building an AI Powered Urban Flood Risk Analysis Platform on AWS, about running three vision models on one SageMaker endpoint.", more: ["Tell me about Varshik", "Open the live demo"] },
      { k: "ideathon", re: /ideathon|iit|delhi/, id: 'journey', a: "I led the pitch preparation and presentation for the team that placed in the top five out of three hundred teams at the IIT Delhi Ideathon 2026, and I also created the demo video.", more: ["How many hackathons?", "What have you won?"] },
      { k: "hackathons", re: /hackathon|competition|won|win|award|prize|achievement|accomplish/, id: 'journey', a: "I have taken part in more than ten hackathons, including AWS Bharat Builds, the Amazon ML Challenge, NPCI and Citi DRUNIX and Paytm Build for India. I won first place in the PipeSense Datathon, was a CANSAT PDR finalist, and placed in the top five at the IIT Delhi Ideathon.", more: ["Tell me about PipeSense", "Tell me about the satellite"] },
      { k: "patent", re: /patent|research|paper|publication|ergoguard|explainable|interpretab/, id: 'journey', a: "I am an inventor on a patent application for shipment clustering and route optimisation. My research covers explainable AI for cyber threat attribution, a drafted paper on ErgoGuard posture monitoring, and offline pipe defect detection.", more: ["What are your AI skills?"] },
      { k: "community", re: /aws|campus leader|student builder|builder center|community|300|cloud community/, id: 'moments', a: "I am an AWS Student Builder Campus Leader. I grew a three hundred plus student cloud community, ran sessions with live AWS demos and reached over two hundred students through pitches and tablings.", more: ["Spin the ring", "Show me the videos"] },
      { k: "novac", re: /novac|shriram|construction/, id: "journey", a: "At Novac Technology Solutions, part of the Shriram Group, I was a software engineering intern on the backend and cloud side of a production platform that manages more than twenty live construction projects. In a two person team I worked on REST API design, MongoDB data modelling, CI CD pipelines, deployment on AWS and production support.", more: ["What are your backend skills?", "What are your cloud skills?"] },
      { k: "internship", re: /intern|experience|work experience|job|fresher|role/, id: "journey", a: "I am looking for cloud and backend internships. So far I have interned at Novac Technology Solutions on the backend and cloud side, built and tested distributed systems and AWS projects, led a three hundred plus student community, contributed to open source, and taken a satellite design all the way to the launch round.", more: ["What are your backend skills?", "Tell me about the satellite", "How can I contact you?"] },
      { k: "opensource", re: /open ?source|aossie|osc|osconnect|livestream|live stream/, id: 'watch', a: "I contribute to open source with AOSSIE, and I am Community Lead and a frontend developer for Open Source Connect Global 2026, where I coordinate international livestream events and built parts of the official conference website.", more: ["Show me the videos"] },
      { k: "education", re: /cgpa|gpa|education|college|university|srm|degree|school|igcse|topper|marks|percentage|study|studying/, id: 'about', a: "I study B.Tech Computer Science and Engineering at SRM Institute of Science and Technology, Ramapuram, with a CGPA of 9.10 out of 10. In school I was the Cambridge IGCSE school topper in Tamil Nadu with ninety three point five percent.", more: ["Tell me about your community", "What are your skills?"] },
      { k: "cert", re: /certif|microsoft|sql server|coursera/, id: 'journey', a: "I am a Microsoft Certified SQL Server Professional, covering relational database design, advanced querying, security and BI integration.", more: ["What are your skills?"] },
      { k: "aiskills", re: /ai skill|machine learning|\bml\b|langchain|langgraph|agent|\brag\b|\bllm\b|faiss|yolo|bedrock|gemini/, id: 'skills', a: "On the AI side I work with Amazon Bedrock and the Gemini API, build multi agent systems with LangChain and LangGraph, run retrieval augmented generation with FAISS, and train and deploy vision models like YOLO on SageMaker.", more: ["What are your cloud skills?"] },
      { k: "cloudskills", re: /cloud skill|aws service|lambda|dynamodb|serverless|sagemaker|amplify|cloudfront|s3/, id: 'skills', a: "My AWS toolbox is Lambda, API Gateway, DynamoDB, S3 and CloudFront, Amplify, SageMaker, Bedrock, Cognito, EventBridge and CloudWatch, plus Docker and GitHub Actions for delivery.", more: ["What are your backend skills?", "Tell me about CareerLens"] },
      { k: "backend", re: /backend|back end|distributed|java|spring|golang|\bgo\b|kafka|grpc|microservice/, id: 'skills', a: "For backend and distributed systems I use Java and Spring Boot, Go with gRPC, Kafka, Redis, RabbitMQ, Nginx and PostgreSQL, and I test them with fault injection and load tests.", more: ["Tell me about LedgerLite", "Tell me about Surge"] },
      { k: "languages", re: /language|programming|python|kotlin|c\+\+|javascript/, id: 'skills', a: "I write Java, Python, JavaScript, Go, Kotlin, C, C plus plus and SQL, and I build front ends with React and Angular and mobile apps with Flutter and Kotlin Multiplatform.", more: ["What are your backend skills?"] },
      { k: "skills", re: /skill|superpower|tech stack|technolog|good at|expertise|strength/, id: 'skills', a: "My superpowers are cloud and backend engineering: AWS, distributed systems in Java and Go, AI and agentic systems, and explaining all of it clearly as a speaker and community leader.", more: ["What are your cloud skills?", "What are your AI skills?", "What are your backend skills?"] },
      { k: "contact", re: /contact|email|reach|hire|hiring|available|availability|internship|opportunit|open to|recruit|work with/, id: 'contact', a: "I am open to internships in cloud and backend engineering. The fastest way to reach me is email at simrithi dot work at gmail dot com, or message me on LinkedIn.", more: ["Open LinkedIn", "Open GitHub"] },
      { k: "location", re: /where|location|city|based|chennai|tamil nadu|india/, id: 'about', a: "I am based in Chennai, Tamil Nadu, and I grew up in Tamil Nadu.", more: ["Who are you?"] },
      { k: "site", re: /how (did you|was|is|were) .*(build|built|made|create)|this (site|website|portfolio|page)|tech behind|made with|under the hood/, id: 'top', a: "This site is plain HTML, CSS and JavaScript with no framework. The 3D ring is pure CSS 3D, the sounds are synthesized live with WebAudio, you are talking to the browser's speech recognition, and it is hosted on AWS Amplify.", more: ["Spin the ring", "Give me a tour"] },
      { k: "funfact", re: /fun fact|something (interesting|unique|cool)|surprise|different|unique|special|stand out/, id: 'moments', spin: true, a: "Fun fact: I built a satellite ground station, a pipe inspecting robot and a flood risk map, and I also teach other students how to do the same. Spin the ring to see the proof.", more: ["Tell me about the satellite", "Tell me about PipeSense"] },
      { k: "intro", re: /who are you|introduce|yourself|about (you|simrithi)|who is simrithi|hello|^hi\b|^hey\b/, id: 'about', a: "I am Simrithi, a cloud and backend focused Computer Science student at SRM in Chennai. I build on AWS and ship distributed systems that hold up under load, and I lead a three hundred plus student cloud community.", more: ["What are your skills?", "Show me your projects", "Give me a tour"] },
      { k: "thanks", re: /thank|thanks|awesome|great|nice|cool|wow/, a: "Anytime. Ask me anything else, or say give me a tour.", more: ["Give me a tour"] }
    ];
    var NAV = [
      [/watch|video|clip|youtube|stream|session/, 'watch', "Here are some clips of me at work."],
      [/article|writing|blog/, 'writing', "Here is my writing on AWS Builder Center."],
      [/moment|photo|picture|gallery|\bring\b|3d|three d/, 'moments', "Here is my world in 3D."],
      [/project|work|built|build/, 'projects', "Here is what I built."],
      [/skill|tool|superpower/, 'skills', "My tech superpowers."],
      [/journey|experience|timeline|career/, 'journey', "Where I have worked, led and competed."],
      [/contact|message/, 'contact', "Say hello. I would love to hear from you."],
      [/about|top|home|start|beginning/, 'about', "Back to the beginning."]
    ];
    var TOUR = [
      ['top', "Hi, I am Simrithi. Let me show you around."],
      ['about', "I study computer science in Chennai and build cloud systems that have to be right under pressure."],
      ['moments', "This is my world in 3D: my talks, my classrooms, my robot and a satellite."],
      ['watch', "Here are short clips of me teaching, and the Open Source Connect Global stream."],
      ['skills', "These are my tech superpowers. Tap any tool to see where I used it."],
      ['varshik', "Varshik, a flood risk map that finds waterlogged roads before the rain."],
      ['careerlens', "CareerLens, a serverless placement platform built solo on AWS."],
      ['flashsale', "FlashSale, inventory that can never oversell."],
      ['pipesense', "PipeSense, the pipe inspection robot that won first of three hundred teams."],
      ['journey', "My journey: an AWS campus leader, a CanSat team that reached the launch round, a backend and cloud intern at Novac, and an open source contributor."],
      ['contact', "That is the tour. I am open to cloud and backend internships. Say hello!"]
    ];

    /* ---------- speech out ---------- */
    function loadVoices() {
      if (!('speechSynthesis' in window)) return;
      voices = speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
      voiceEl.textContent = '';
      voices.forEach(function (v) { var o = document.createElement('option'); o.value = v.name; o.textContent = v.name.replace(/Microsoft |Google /, '') + ' (' + v.lang + ')'; voiceEl.appendChild(o); });
      var pick = voices.filter(function (v) { return v.name === prefs.voice; })[0] || voices.filter(function (v) { return /en-IN/i.test(v.lang); })[0] || voices.filter(function (v) { return /female|zira|aria|jenny|samantha|google uk english female/i.test(v.name); })[0] || voices[0];
      if (pick) { voiceEl.value = pick.name; prefs.voice = pick.name; }
    }
    if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
    var voiceMap = {}, clip = null, ownEl = $('#vOwn');
    if (prefs.own === undefined) prefs.own = true;
    if (ownEl) { ownEl.checked = prefs.own; ownEl.addEventListener('change', function () { prefs.own = ownEl.checked; savePrefs(); }); }
    try {
      fetch('assets/voice/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (m) {
        voiceMap = m || {};
        if (ownEl) { var has = Object.keys(voiceMap).length > 0; ownEl.disabled = !has; if (ownEl.parentNode) ownEl.parentNode.title = has ? 'Play my recorded answers instead of the computer voice' : 'No recordings yet. Use record-voice.html to add yours.'; }
      }).catch(function () { if (ownEl) ownEl.disabled = true; });
    } catch (e) {}
    function hasOwn(key) { return !!(prefs.own && key && voiceMap[key]); }
    function finishSpeech(done) { speaking = false; if (done) done(); if (keepOn && !listening) setTimeout(startListening, 250); }
    function ttsSpeak(text, done) {
      try {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text); u.rate = prefs.rate; u.pitch = 1.06;
        var v = voices.filter(function (x) { return x.name === prefs.voice; })[0]; if (v) u.voice = v;
        speaking = true; if (listening && rec) { try { rec.stop(); } catch (e) {} }
        var fin = function () { finishSpeech(done); };
        u.onend = fin; u.onerror = fin;
        speechSynthesis.speak(u);
      } catch (e) { if (done) done(); }
    }
    function speak(text, done, key) {
      lastSpoken = text;
      if (!prefs.speak || !sfx.isOn()) { if (done) setTimeout(done, Math.min(2600 + text.length * 22, 9000)); return; }
      if (hasOwn(key)) {
        try {
          if (window.speechSynthesis) speechSynthesis.cancel(); if (clip) clip.pause();
          clip = new Audio('assets/voice/' + voiceMap[key]); clip.playbackRate = Math.max(0.9, Math.min(prefs.rate, 1.25));
          speaking = true; if (listening && rec) { try { rec.stop(); } catch (e) {} }
          clip.onended = function () { finishSpeech(done); };
          clip.onerror = function () { clip = null; speaking = false; ttsSpeak(text, done); };
          var p = clip.play(); if (p && p.catch) p.catch(function () { clip = null; speaking = false; ttsSpeak(text, done); });
          return;
        } catch (e) {}
      }
      if (!('speechSynthesis' in window)) { if (done) setTimeout(done, Math.min(2600 + text.length * 22, 9000)); return; }
      ttsSpeak(text, done);
    }
    function hush() { tourId++; speaking = false; try { speechSynthesis.cancel(); } catch (e) {} if (clip) { try { clip.pause(); } catch (e) {} clip = null; } }

    /* ---------- UI helpers ---------- */
    function show(html, ms) { say.hidden = false; say.innerHTML = html; clearTimeout(sayT); sayT = setTimeout(function () { say.hidden = true; }, ms || 4200); }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    function go(id) {
      var t = document.getElementById(id); if (!t) return;
      t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); sfx.whoosh();
    }
    function logUser(text) {
      var li = document.createElement('li'); li.className = 'u'; li.textContent = text; log.appendChild(li); log.scrollTop = log.scrollHeight;
    }
    function logBot(text, more) {
      var li = document.createElement('li'); li.className = 'b'; var p = document.createElement('p'); p.textContent = text; li.appendChild(p);
      if (more && more.length) {
        var row = document.createElement('div'); row.className = 'chips2';
        more.forEach(function (m) { var b = document.createElement('button'); b.type = 'button'; b.textContent = m; b.addEventListener('click', function () { handle(m, true); }); row.appendChild(b); });
        li.appendChild(row);
      }
      log.appendChild(li); log.scrollTop = log.scrollHeight;
      while (log.children.length > 24) log.removeChild(log.firstChild);
      return li;
    }
    function reply(text, o) {
      o = o || {};
      var entry = logBot(text, o.more); if (hasOwn(o.k)) { entry.classList.add('own'); var tag = document.createElement('span'); tag.className = 'own-tag'; var clone = String(voiceMap[o.k]).indexOf('.clone.') > -1; tag.textContent = clone ? 'AI clone of my voice' : 'my voice'; if (clone) tag.classList.add('clone'); entry.insertBefore(tag, entry.firstChild); }
      show('<em>' + esc(text.length > 150 ? text.slice(0, 147) + '...' : text) + '</em>', Math.min(3500 + text.length * 40, 14000));
      if (o.id) go(o.id); if (o.spin) setTimeout(function () { ring.spin(); }, 700);
      speak(text, undefined, o.k);
    }

    /* ---------- tour ---------- */
    function startTour() {
      hush(); var my = ++tourId; logBot('Starting the guided tour. Say stop or press Escape to end it.');
      (function step(i) {
        if (my !== tourId) return;
        if (i >= TOUR.length) { show('<em>Tour complete.</em>', 3000); sfx.chime(); return; }
        var s = TOUR[i]; go(s.id || s[0]); show('<em>' + esc(s[1]) + '</em>', 8000);
        if (s[0] === 'moments') setTimeout(function () { if (my === tourId) ring.spin(); }, 900);
        setTimeout(function () { if (my === tourId) speak(s[1], function () { setTimeout(function () { step(i + 1); }, 500); }, 'tour' + i); }, 1100);
      })(0);
    }

    /* ---------- command handling ---------- */
    function handle(text, fromChip) {
      var raw = (text || '').trim(); if (!raw) return;
      var q = raw.toLowerCase().replace(/[^a-z0-9+ ]/g, ' ').replace(/\s+/g, ' ').trim();
      logUser(raw); if (!fromChip) sfx.chime();
      var m;
      if (/^(stop|cancel|enough|pause|shut up|be quiet|end tour|stop talking)\b/.test(q)) { hush(); reply('Okay, stopping.'); if (window.speechSynthesis) speechSynthesis.cancel(); return; }
      if (/\b(repeat|say that again|again|what did you say|come again)\b/.test(q) && lastSpoken) { logBot(lastSpoken); speak(lastSpoken); return; }
      if (/\b(faster|speed up|quicker)\b/.test(q)) { prefs.rate = Math.min(1.4, +(prefs.rate + 0.15).toFixed(2)); rateEl.value = prefs.rate; savePrefs(); reply('Speaking faster.'); return; }
      if (/\b(slower|slow down)\b/.test(q)) { prefs.rate = Math.max(0.8, +(prefs.rate - 0.15).toFixed(2)); rateEl.value = prefs.rate; savePrefs(); reply('Speaking slower.'); return; }
      if (/(change|switch|another|different|next) (the )?voice/.test(q)) {
        if (voices.length) { var i = (voices.map(function (v) { return v.name; }).indexOf(prefs.voice) + 1) % voices.length; prefs.voice = voices[i].name; voiceEl.value = prefs.voice; savePrefs(); }
        reply('This is my new voice. How do I sound?'); return;
      }
      if (/(keep|always) listening|conversation mode|hands free/.test(q)) { setKeep(true); reply('I will keep listening. Say stop listening to end this.'); return; }
      if (/(stop|end|turn off|no more) (keep )?listening|stop the mic/.test(q)) { setKeep(false); reply('I stopped listening.'); return; }
      if (/\b(tour|walk me through|guide me|show me around|take me around|overview)\b/.test(q)) { startTour(); return; }
      if (/\b(help|what can (i|you)|commands|options|what should i)\b/.test(q)) { openGuide(true); reply('Here is what you can ask me. Tap any suggestion, or just speak.', { more: ['Who are you?', 'What are your skills?', 'Give me a tour'] }); return; }
      if (/clear (the )?(log|chat|history)/.test(q)) { log.textContent = ''; show('Cleared'); return; }
      if (/\b(unmute|sound on|turn on sound)\b/.test(q)) { sfx.set(true); setSnd(); reply('Sound is on.'); return; }
      if (/\b(mute|sound off|silence)\b/.test(q)) { reply('Sound off.'); sfx.set(false); setSnd(); return; }
      if (/\b(spin|rotate)\b/.test(q)) { go('moments'); setTimeout(function () { ring.spin(); }, 650); reply('Spinning my world for you.'); return; }
      if (/career ?lens/.test(q) && /live|demo|open|try|launch|visit/.test(q)) { window.open(CLDEMO, '_blank', 'noopener'); reply('Opening the CareerLens live demo in a new tab.'); return; }
      if (/live demo|open varshik|try varshik|launch varshik/.test(q)) { window.open(DEMO, '_blank', 'noopener'); reply('Opening the Varshik live demo in a new tab.'); return; }
      if (/\bgithub\b/.test(q) && /open|show|take|go/.test(q)) { window.open('https://github.com/simrithi', '_blank', 'noopener'); reply('Opening my GitHub.'); return; }
      if (/\blinkedin\b/.test(q)) { window.open('https://www.linkedin.com/in/simrithi-s/', '_blank', 'noopener'); reply('Opening my LinkedIn.'); return; }
      if (/\b(scroll down|go down|next section|down)\b/.test(q)) { scrollBy({ top: innerHeight * 0.85, behavior: reduced ? 'auto' : 'smooth' }); sfx.whoosh(); logBot('Scrolling down.'); return; }
      if (/\b(scroll up|go up|previous|up)\b/.test(q)) { scrollBy({ top: -innerHeight * 0.85, behavior: reduced ? 'auto' : 'smooth' }); sfx.whoosh(); logBot('Scrolling up.'); return; }
      for (var k = 0; k < KB.length; k++) if (KB[k].re.test(q)) { reply(KB[k].a, { id: KB[k].id, spin: KB[k].spin, more: KB[k].more, k: KB[k].k }); return; }
      for (var n = 0; n < NAV.length; n++) if (NAV[n][0].test(q)) { reply(NAV[n][2], { id: NAV[n][1] }); return; }
      reply('I am not sure about "' + raw.slice(0, 60) + '". Try asking about my projects, skills, CGPA, the satellite, or say give me a tour.', { more: ['Who are you?', 'What are your skills?', 'Give me a tour'] });
    }

    /* ---------- guide panel ---------- */
    var TRY = {
      'About me': ['Who are you?', 'What is your CGPA?', 'Tell me about your community', 'Where are you from?'],
      'Projects': ['Tell me about Varshik', 'Tell me about CareerLens', 'What is PipeSense?', 'Tell me about the satellite', 'Tell me about LedgerLite', 'Tell me about RaftKV'],
      'Skills': ['What are your skills?', 'What are your AI skills?', 'What are your cloud skills?', 'What are your backend skills?'],
      'Hire me': ['Are you open to internships?', 'How can I contact you?', 'What have you won?'],
      'Controls': ['Give me a tour', 'Spin the ring', 'Repeat', 'Slower', 'Faster', 'Change voice', 'Keep listening', 'Mute']
    };
    Object.keys(TRY).forEach(function (cat) {
      var g = document.createElement('div'); g.className = 'try-group'; var h = document.createElement('h3'); h.textContent = cat; g.appendChild(h);
      var r = document.createElement('div'); r.className = 'chips2';
      TRY[cat].forEach(function (t) { var b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.addEventListener('click', function () { handle(t, true); }); r.appendChild(b); });
      g.appendChild(r); tryEl.appendChild(g);
    });
    function openGuide(on) {
      guide.hidden = !on; guideBtn.setAttribute('aria-expanded', on ? 'true' : 'false'); guideBtn.classList.toggle('on', on);
    }
    guideBtn.addEventListener('click', function () { openGuide(guide.hidden); });
    $('#vguideClose').addEventListener('click', function () { openGuide(false); });
    rateEl.value = prefs.rate; speakEl.checked = prefs.speak;
    rateEl.addEventListener('input', function () { prefs.rate = parseFloat(rateEl.value); savePrefs(); });
    voiceEl.addEventListener('change', function () { prefs.voice = voiceEl.value; savePrefs(); speak('Hi, this is how I sound.'); });
    speakEl.addEventListener('change', function () { prefs.speak = speakEl.checked; savePrefs(); if (!prefs.speak) { try { speechSynthesis.cancel(); } catch (e) {} } });
    function setKeep(v) { keepOn = v; keepEl.checked = v; if (v && !listening) startListening(); if (!v && listening && rec) { try { rec.stop(); } catch (e) {} } }
    keepEl.addEventListener('change', function () { setKeep(keepEl.checked); });
    function setSnd() { var on = sfx.isOn(); snd.setAttribute('aria-pressed', on ? 'true' : 'false'); snd.setAttribute('aria-label', on ? 'Sound on. Click to mute.' : 'Sound off. Click to turn on.'); }
    snd.addEventListener('click', function () { sfx.set(!sfx.isOn()); setSnd(); }); setSnd();
    form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; handle(v); });
    logBot('Hi, I am the voice of this portfolio. Tap the mic and ask me anything, hold the V key to talk, or pick a suggestion.', ['Who are you?', 'Give me a tour', 'What are your skills?']);

    /* ---------- mic meter + recognition ---------- */
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
    function startListening() {
      if (!SR) { show('Voice commands need Chrome or Edge. You can type a command in the box instead.', 6000); input.focus(); openGuide(true); return; }
      if (listening) return;
      hush();
      rec = new SR(); rec.lang = navigator.language || 'en-US'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      rec.onstart = function () { setListening(true); sfx.listen(); show('Listening… ask about my <em>projects</em>, <em>skills</em>, <em>CGPA</em> or say <em>give me a tour</em>', 6000); };
      rec.onresult = function (e) {
        var txt = '', fin = false;
        for (var i = e.resultIndex; i < e.results.length; i++) { txt += e.results[i][0].transcript; if (e.results[i].isFinal) fin = true; }
        show('<em>' + esc(txt) + '</em>', fin ? 1600 : 6000);
        if (fin) setTimeout(function () { handle(txt); }, 300);
      };
      rec.onerror = function (e) {
        setListening(false);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { keepOn = false; keepEl.checked = false; show('Microphone is blocked. Allow it in your browser, or type a command instead.', 6000); }
        else if (e.error === 'no-speech' && !keepOn) show('I did not hear anything. Tap the mic and try again.', 4000);
      };
      rec.onend = function () { setListening(false); if (keepOn && !speaking && !tourIdActive()) setTimeout(startListening, 350); };
      try { rec.start(); } catch (e) { setListening(false); }
    }
    function tourIdActive() { return false; }
    function toggle() {
      if (!listening) { startListening(); return; }
      keepOn = false; keepEl.checked = false; try { rec.stop(); } catch (e) {}
    }
    mic.addEventListener('click', toggle);
    if (heroMic) heroMic.addEventListener('click', toggle);
    if (!SR) mic.title = 'Voice needs Chrome or Edge. Type a command instead.';

    /* ---------- keyboard: hold V to talk, ? for the guide, Esc to hush ---------- */
    var vHeld = false;
    addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || ''; if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'v' || e.key === 'V') { if (!vHeld && !listening) { vHeld = true; startListening(); } }
      else if (e.key === '?') { openGuide(guide.hidden); }
      else if (e.key === '/') { e.preventDefault(); input.focus(); show('Type or dictate your question, then press Enter.', 3000); }
      else if (e.key === 'Escape') { hush(); if (!guide.hidden) openGuide(false); }
    });
    addEventListener('keyup', function (e) { if ((e.key === 'v' || e.key === 'V') && vHeld) { vHeld = false; if (listening && rec && !keepOn) { try { rec.stop(); } catch (er) {} } } });
  })();
})();
