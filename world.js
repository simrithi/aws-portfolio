/* The whole site as a 3D world: a Three.js scene the camera flies through as you scroll.
   Progressive enhancement: without WebGL (or with reduced motion) the normal page is untouched. */
(function () {
  'use strict';
  if (!window.THREE) return;
  var T = THREE;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('world');
  if (!canvas || reduced) return;
  var renderer;
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { return; }
  if (!renderer.getContext()) return;
  document.documentElement.classList.add('gl');

  renderer.outputEncoding = T.sRGBEncoding;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, innerWidth < 760 ? 1.25 : 1.75));
  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(50, 1, 0.1, 600);
  scene.fog = new T.Fog(0xffffeb, 70, 230);
  scene.add(new T.HemisphereLight(0xffffff, 0x8fb3a8, 0.95));
  var sun = new T.DirectionalLight(0xffffff, 0.85); sun.position.set(6, 12, 9); scene.add(sun);

  var IDS = ['top', 'about', 'moments', 'watch', 'writing', 'skills', 'projects', 'journey', 'contact'];
  var PAL = [0xffffeb, 0x1a1a1a, 0x034f46, 0xffffeb, 0xf0d7ff, 0x034f46, 0xffffeb, 0xf0d7ff, 0x1a1a1a];
  var DZ = 90, N = IDS.length;
  var pointer = { x: 0, y: 0 }, aspect = 1;
  var tmpColor = new T.Color();

  /* ---------- small helpers ---------- */
  function stationGroup(i) { var g = new T.Group(); g.position.z = -i * DZ; scene.add(g); return g; }
  function mat(color, o) { o = o || {}; return new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.5, metalness: 0.1, flatShading: true }, o)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function confetti(g, count, spreadX) {
    return; /* floating shapes removed */
    var shapes = [new T.IcosahedronGeometry(1, 0), new T.OctahedronGeometry(1, 0), new T.TorusGeometry(0.8, 0.3, 8, 16), new T.BoxGeometry(1.2, 1.2, 1.2)];
    var cols = [0xf0d7ff, 0x9be7d8, 0xffd6e8, 0x8d5fd3, 0xffd479];
    for (var k = 0; k < count; k++) {
      var m = new T.Mesh(shapes[k % shapes.length], mat(cols[k % cols.length], { transparent: true, opacity: 0.9 }));
      var side = k % 2 ? 1 : -1;
      m.position.set(side * rnd(11, spreadX), rnd(-7, 9), rnd(-30, 30));
      var s = rnd(0.7, 2.1); m.scale.setScalar(s);
      m.userData = { spin: rnd(0.002, 0.012), bob: rnd(0.4, 1.2), ph: rnd(0, 6.28), y0: m.position.y };
      g.add(m); floaters.push(m);
    }
  }
  var floaters = [];

  /* ---------- station 0: terrain ---------- */
  var g0 = stationGroup(0);
  var tGeo = new T.PlaneGeometry(170, 170, 70, 70); tGeo.rotateX(-Math.PI / 2);
  var tBase = tGeo.attributes.position.array.slice();
  var terrain = new T.Mesh(tGeo, new T.MeshBasicMaterial({ color: 0x034f46, wireframe: true, transparent: true, opacity: 0.4 }));
  terrain.position.set(0, -10, -10); terrain.visible = false; /* netted wave removed */
  confetti(g0, 10, 26);

  /* ---------- station 1: about: orbit rings and drifting particles ---------- */
  var g1 = stationGroup(1);
  var rings = [];
  [14, 19, 25].forEach(function (r, k) {
    var ring = new T.Mesh(new T.TorusGeometry(r, 0.07, 8, 120), new T.MeshBasicMaterial({ color: [0xf0d7ff, 0x9be7d8, 0xffd6e8][k], transparent: true, opacity: 0.7 }));
    ring.rotation.set(1.1 + k * 0.4, k * 0.5, 0); g1.add(ring); rings.push(ring);
  });
  var pGeo = new T.BufferGeometry(), pPos = new Float32Array(900 * 3);
  for (var p = 0; p < 900; p++) { pPos[p * 3] = rnd(-45, 45); pPos[p * 3 + 1] = rnd(-22, 22); pPos[p * 3 + 2] = rnd(-45, 45); }
  pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3));
  var particles = new T.Points(pGeo, new T.PointsMaterial({ color: 0xf0d7ff, size: 0.28, transparent: true, opacity: 0.85 }));
  g1.add(particles);
  confetti(g1, 6, 24);

  /* ---------- station 2: the gallery ring (the cards: stories and tech details open as a 3D book) ---------- */
  var g2 = stationGroup(2);
  var ringGroup = new T.Group(); g2.add(ringGroup);
  var cardMeshes = [], cardEls = $$('#r3Ring .r3-card');
  var CW = 4.6, CH = 6.1;
  var TX = {
    'tx-varshik': ['#1d7a6c', '#0a2f2a'], 'tx-career': ['#8d5fd3', '#2b1250'], 'tx-flash': ['#3a3a3a', '#0d0d0d'],
    'tx-ledger': ['#2f6bd3', '#0e1f4a'], 'tx-surge': ['#e0568f', '#4a0f2a'], 'tx-raft': ['#c98a1f', '#3d2205'], 'tx-cansat': ['#3b4a8f', '#0c1230']
  };
  function wrapText(ctx, text, x, y, maxW, lh) {
    var words = text.split(' '), line = '';
    for (var n = 0; n < words.length; n++) {
      var test = line + words[n] + ' ';
      if (ctx.measureText(test).width > maxW && n > 0) { ctx.fillText(line, x, y); line = words[n] + ' '; y += lh; } else line = test;
    }
    ctx.fillText(line, x, y); return y;
  }
  function cardTexture(el) {
    var c = document.createElement('canvas'); c.width = 512; c.height = 680; var ctx = c.getContext('2d');
    var tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
    var face = $('.r3-face', el);
    function frame() { ctx.strokeStyle = 'rgba(255,255,235,.9)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 506, 674); }
    if (face.classList.contains('txt')) {
      var cls = Object.keys(TX).filter(function (k) { return face.classList.contains(k); })[0] || 'tx-varshik', cols = TX[cls];
      var g = ctx.createLinearGradient(0, 0, 512, 680); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 680);
      var rg = ctx.createRadialGradient(400, 90, 10, 400, 90, 300); rg.addColorStop(0, 'rgba(255,255,255,.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, 512, 680);
      ctx.fillStyle = '#ffffeb'; ctx.font = '600 24px ui-monospace, Consolas, monospace'; ctx.fillText(($('.tx-k', face) || {}).textContent.toUpperCase(), 36, 64);
      ctx.font = '400 84px "EB Garamond", Georgia, serif'; var yb = wrapText(ctx, ($('strong', face) || {}).textContent, 36, 440, 440, 82);
      ctx.font = 'italic 400 36px "EB Garamond", Georgia, serif'; ctx.fillText(($('.tx-t', face) || {}).textContent, 36, yb + 52);
      var m = ($('.tx-m', face) || {}).textContent; ctx.font = '600 24px ui-monospace, Consolas, monospace';
      var mw = ctx.measureText(m).width + 36; ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(36, yb + 80, mw, 44); ctx.fillStyle = '#ffffeb'; ctx.fillText(m, 54, yb + 111);
      frame(); tex.needsUpdate = true;
    } else {
      ctx.fillStyle = '#134'; ctx.fillRect(0, 0, 512, 680);
      var im = new Image(); im.onload = function () {
        var s = Math.max(512 / im.width, 680 / im.height), w = im.width * s, h = im.height * s;
        ctx.drawImage(im, (512 - w) / 2, (680 - h) / 2, w, h);
        var gr = ctx.createLinearGradient(0, 470, 0, 680); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.78)'); ctx.fillStyle = gr; ctx.fillRect(0, 470, 512, 210);
        ctx.fillStyle = '#fff'; ctx.font = '400 40px "EB Garamond", Georgia, serif'; wrapText(ctx, el.dataset.title, 28, 618, 460, 42); frame(); tex.needsUpdate = true;
      };
      im.src = $('img', face).src;
    }
    return tex;
  }
  function buildGallery() {
    var n = cardEls.length || 1, step = Math.PI * 2 / n, R = (CW / 2) / Math.tan(Math.PI / n) + 2.2;
    cardEls.forEach(function (el, i) {
      var m = new T.Mesh(new T.PlaneGeometry(CW, CH), new T.MeshBasicMaterial({ map: cardTexture(el), side: T.DoubleSide }));
      var back = new T.Mesh(new T.PlaneGeometry(CW, CH), new T.MeshBasicMaterial({ color: 0x0a2f2a, side: T.BackSide })); back.position.z = -0.02; m.add(back);
      var a = i * step; m.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); m.rotation.y = a;
      m.userData = { el: el, a: a, R: R, out: 0 }; ringGroup.add(m); cardMeshes.push(m);
    });
    ringGroup.userData.R = R;
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(buildGallery);
  var ringVel = 0.0015, ringDrag = false, ringMoved = 0;

  /* ---------- station 3: the robot driving, as a video in the scene ---------- */
  var g3 = stationGroup(3), video = document.createElement('video');
  video.src = 'assets/video/pipesense-robot.mp4'; video.muted = true; video.loop = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.preload = 'none';
  var vTex = new T.VideoTexture(video); vTex.encoding = T.sRGBEncoding;
  var vPlane = new T.Mesh(new T.PlaneGeometry(10.6, 6), new T.MeshBasicMaterial({ map: vTex }));
  var vFrame = new T.Mesh(new T.PlaneGeometry(11, 6.4), new T.MeshBasicMaterial({ color: 0x1a1a1a })); vFrame.position.z = -0.05;
  var vGroup = new T.Group(); vGroup.add(vFrame); vGroup.add(vPlane); vGroup.position.set(15, 1, 0); vGroup.rotation.y = -0.45; g3.add(vGroup);
  confetti(g3, 6, 22);

  /* ---------- station 4: writing: paper planes ---------- */
  var g4 = stationGroup(4), papers = [];
  for (var q = 0; q < 7; q++) {
    var paper = new T.Mesh(new T.PlaneGeometry(3.4, 4.4), new T.MeshStandardMaterial({ color: 0xffffff, side: T.DoubleSide, roughness: 0.9 }));
    paper.position.set((q % 2 ? 1 : -1) * rnd(13, 22), rnd(-6, 8), rnd(-24, 24)); paper.rotation.set(rnd(-0.6, 0.6), rnd(0, 6), rnd(-0.5, 0.5));
    paper.userData = { spin: rnd(0.003, 0.009), ph: rnd(0, 6) }; g4.add(paper); papers.push(paper);
  }

  /* ---------- station 5: skills as an orbiting sphere of labels ---------- */
  var g5 = stationGroup(5), skillGroup = new T.Group(); g5.add(skillGroup);
  var skillSprites = [];
  function labelTexture(text, hot) {
    var c = document.createElement('canvas'); c.width = 320; c.height = 84; var ctx = c.getContext('2d');
    ctx.fillStyle = hot ? '#f0d7ff' : 'rgba(255,255,235,.92)'; var r = 38; ctx.beginPath(); ctx.moveTo(r, 4); ctx.arcTo(316, 4, 316, 80, r); ctx.arcTo(316, 80, 4, 80, r); ctx.arcTo(4, 80, 4, 4, r); ctx.arcTo(4, 4, 316, 4, r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#034f46'; ctx.font = '600 34px Figtree, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 160, 44);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  }
  function buildSkills() {
    var btns = $$('.toolbox button'), n = btns.length, golden = Math.PI * (3 - Math.sqrt(5));
    btns.forEach(function (b, i) {
      var y = 1 - (i / (n - 1)) * 2, rad = Math.sqrt(1 - y * y), th = golden * i, R = 11;
      var s = new T.Sprite(new T.SpriteMaterial({ map: labelTexture(b.textContent, false), transparent: true, depthWrite: false }));
      s.position.set(Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R); s.scale.set(4.2, 1.1, 1);
      s.userData = { btn: b, text: b.textContent, base: s.scale.clone() }; skillGroup.add(s); skillSprites.push(s);
    });
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(buildSkills);

  /* ---------- station 6: projects: the robot and the satellite ---------- */
  var g6 = stationGroup(6);
  function buildRobot() {
    var r = new T.Group();
    var chassis = new T.Mesh(new T.BoxGeometry(3.2, 0.25, 4.2), mat(0xcfe9f2, { transparent: true, opacity: 0.6, flatShading: false })); r.add(chassis);
    var board = new T.Mesh(new T.BoxGeometry(2.2, 0.18, 1.8), mat(0x1f8a5b)); board.position.set(0, 0.28, -0.4); r.add(board);
    var chip = new T.Mesh(new T.BoxGeometry(0.7, 0.14, 0.7), mat(0x222222)); chip.position.set(0.3, 0.42, -0.4); r.add(chip);
    var batt = new T.Mesh(new T.BoxGeometry(1.4, 0.45, 0.6), mat(0x2d2d2d)); batt.position.set(0, 0.45, 1.15); r.add(batt);
    var cam = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.5, 20), mat(0x111111)); cam.rotation.x = Math.PI / 2; cam.position.set(0, 0.35, -2.2); r.add(cam);
    var led = new T.Mesh(new T.TorusGeometry(0.62, 0.08, 8, 24), new T.MeshBasicMaterial({ color: 0xffffff })); led.position.set(0, 0.35, -2.46); r.add(led);
    var wheels = [];
    [-1, 1].forEach(function (s) {
      var w = new T.Mesh(new T.CylinderGeometry(0.95, 0.95, 0.5, 24), mat(0xffd21f, { flatShading: false })); w.rotation.z = Math.PI / 2; w.position.set(s * 1.85, -0.1, 0.4);
      var tire = new T.Mesh(new T.TorusGeometry(0.95, 0.16, 8, 24), mat(0x1a1a1a)); tire.rotation.y = Math.PI / 2; w.add(tire); r.add(w); wheels.push(w);
    });
    var caster = new T.Mesh(new T.SphereGeometry(0.35, 14, 14), mat(0xffffff)); caster.position.set(0, -0.4, -1.8); r.add(caster);
    r.userData = { wheels: wheels }; return r;
  }
  function buildSat() {
    var s = new T.Group();
    var body = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 6.4, 36), mat(0xf2c230, { metalness: 0.5, roughness: 0.35, flatShading: false })); s.add(body);
    [-2.2, 0, 2.2].forEach(function (y) { var b = new T.Mesh(new T.CylinderGeometry(1.64, 1.64, 0.14, 36), mat(0x1a1a1a)); b.position.y = y; s.add(b); });
    var cap = new T.Mesh(new T.CylinderGeometry(1.6, 1.2, 0.5, 36), mat(0xd9d9d9, { metalness: 0.7, flatShading: false })); cap.position.y = 3.4; s.add(cap);
    var ant = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.6, 8), mat(0xffffff)); ant.position.y = 4.9; s.add(ant);
    var tip = new T.Mesh(new T.SphereGeometry(0.2, 12, 12), new T.MeshBasicMaterial({ color: 0xff4b6e })); tip.position.y = 6.2; s.add(tip);
    for (var k = 0; k < 3; k++) { var fin = new T.Mesh(new T.BoxGeometry(0.1, 1.4, 1), mat(0x1a1a1a)); fin.position.set(Math.cos(k * 2.09) * 1.7, -3.6, Math.sin(k * 2.09) * 1.7); fin.rotation.y = -k * 2.09; s.add(fin); }
    s.userData = { tip: tip }; return s;
  }
  var robot = buildRobot(), sat = buildSat();
  robot.position.set(-17, -1, 0); robot.scale.setScalar(1.7); sat.position.set(17, 0, 0); sat.scale.setScalar(1.3); sat.rotation.z = 0.35;
  g6.add(robot); g6.add(sat); confetti(g6, 4, 24);

  /* ---------- station 7: journey: a glowing helix with a node per step ---------- */
  var g7 = stationGroup(7);
  var pts = []; for (var k2 = 0; k2 <= 60; k2++) { var an = k2 * 0.42; pts.push(new T.Vector3(Math.cos(an) * 8, (k2 - 30) * 0.28 + Math.sin(an * 0.5) * 1.5, 38 - k2 * 1.2 + Math.sin(an) * 8)); }
  var curve = new T.CatmullRomCurve3(pts);
  g7.add(new T.Mesh(new T.TubeGeometry(curve, 240, 0.12, 8, false), new T.MeshBasicMaterial({ color: 0x8d5fd3 })));
  var nodes = []; for (var j = 0; j < 6; j++) { var nd = new T.Mesh(new T.SphereGeometry(0.9, 18, 18), mat(j === 0 ? 0xffd479 : 0x034f46, { flatShading: false, emissive: 0x2b1250, emissiveIntensity: 0.4 })); nd.position.copy(curve.getPoint(j / 5)); g7.add(nd); nodes.push(nd); }
  confetti(g7, 5, 24);

  /* ---------- station 8: contact: a globe with a pin on Chennai ---------- */
  var g8 = stationGroup(8), globe = new T.Group();
  globe.add(new T.Mesh(new T.SphereGeometry(7, 28, 18), new T.MeshBasicMaterial({ color: 0xf0d7ff, wireframe: true, transparent: true, opacity: 0.55 })));
  globe.add(new T.Mesh(new T.SphereGeometry(6.9, 28, 18), new T.MeshBasicMaterial({ color: 0x0f2a26 })));
  var lat = 13.08 * Math.PI / 180, lon = 80.27 * Math.PI / 180;
  var pin = new T.Mesh(new T.SphereGeometry(0.34, 12, 12), new T.MeshBasicMaterial({ color: 0xff7a8a }));
  pin.position.set(7.1 * Math.cos(lat) * Math.sin(lon), 7.1 * Math.sin(lat), 7.1 * Math.cos(lat) * Math.cos(lon)); globe.add(pin);
  var pulse = new T.Mesh(new T.RingGeometry(0.5, 0.62, 28), new T.MeshBasicMaterial({ color: 0xff7a8a, side: T.DoubleSide, transparent: true, opacity: 0.8 }));
  pulse.position.copy(pin.position); pulse.lookAt(pin.position.clone().multiplyScalar(2)); globe.add(pulse);
  globe.position.set(13, 0, 0); g8.add(globe); confetti(g8, 5, 24);

  /* ---------- scroll to camera ---------- */
  var anchors = [], idxSmooth = 0, clear = new T.Color(PAL[0]);
  function el(id) { return id === 'top' ? $('.hero') : document.getElementById(id); }
  function measure() {
    anchors = IDS.map(function (id) { var e = el(id), r = e.getBoundingClientRect(); return r.top + scrollY + r.height / 2; });
  }
  function targetIndex() {
    var s = scrollY + innerHeight / 2;
    if (s <= anchors[0]) return 0;
    for (var i = 0; i < anchors.length - 1; i++) if (s < anchors[i + 1]) return i + (s - anchors[i]) / (anchors[i + 1] - anchors[i]);
    return anchors.length - 1;
  }
  function dist(idx) {
    var base = [26, 30, 0, 30, 28, 34, 36, 34, 34], a = Math.floor(idx), b = Math.min(a + 1, N - 1), f = idx - a;
    var ringD = Math.max(31, 25 / (0.93 * aspect));
    function d(i) { return i === 2 ? ringD : base[i] * (aspect < 1 ? 1.25 : 1); }
    return d(a) * (1 - f) + d(b) * f;
  }
  function resize() { var w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); measure(); }
  addEventListener('resize', resize); addEventListener('load', measure); setInterval(measure, 2500); resize();

  /* ---------- pointer: parallax, hover, click, drag ---------- */
  var ray = new T.Raycaster(), mouse = new T.Vector2(), hovered = null, down = null, downCard = null;
  function interactive(t) { return t && t.closest && t.closest('a, button, input, select, label, video, iframe, [role="button"], .vguide, .voice-dock, .r3open, .spot-panel, .tile, .vid, .post, .sys, .portrait, .toolbox, .j-wrap, .wins, .stats, .about-top, .nav, .banner'); }
  function inGalleryZone(t) { var m = $('#moments'); return m && m.contains(t) && !interactive(t); }
  function setMouse(e) { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = -(e.clientY / innerHeight) * 2 + 1; }
  addEventListener('pointermove', function (e) {
    pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1; setMouse(e);
    if (down) { var dx = e.clientX - down.x; ringGroup.rotation.y += dx * 0.0065; ringVel = dx * 0.0065; ringMoved += Math.abs(dx); down.x = e.clientX; }
  }, { passive: true });
  addEventListener('pointerdown', function (e) {
    if (!inGalleryZone(e.target)) return;
    down = { x: e.clientX }; ringMoved = 0; var hint = $('#r3Hint'); if (hint) hint.classList.add('gone');
    setMouse(e); ray.setFromCamera(mouse, camera); var dh = ray.intersectObjects(cardMeshes)[0]; downCard = dh ? dh.object : hovered;
  });
  function release(e) {
    if (!down) return; down = null;
    var pick = downCard || hovered; downCard = null;
    if (ringMoved < 6 && pick && window.__openCard) { window.__openCard(pick.userData.el); }
  }
  addEventListener('pointerup', release); addEventListener('pointercancel', function () { down = null; });
  addEventListener('click', function (e) {
    var sk = $('#skills'); if (!sk || !sk.contains(e.target) || interactive(e.target)) return;
    setMouse(e); ray.setFromCamera(mouse, camera);
    var hit = ray.intersectObjects(skillSprites)[0];
    if (hit) { hit.object.userData.btn.click(); if (window.__sfx) window.__sfx.click(); }
  });
  window.__worldSpin = function () { ringVel = 0.3; if (window.__sfx) window.__sfx.whoosh(); };

  /* ---------- render loop ---------- */
  var forced = null; window.__worldAt = function (i) { forced = i; };
  var clock = new T.Clock(), running = true, vidOn = false;
  document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) loop(); });
  function loop() {
    if (!running) return; requestAnimationFrame(loop);
    var t = clock.getElapsedTime();
    var target = forced !== null ? forced : targetIndex(); idxSmooth += (target - idxSmooth) * (forced !== null ? 1 : 0.07);
    var i0 = Math.floor(idxSmooth), i1 = Math.min(i0 + 1, N - 1), f = idxSmooth - i0;
    // camera flies down the stations
    var cz = -idxSmooth * DZ + dist(idxSmooth);
    camera.position.set(Math.sin(idxSmooth * 1.4) * 2.2 + pointer.x * 1.6, 2.4 + Math.cos(idxSmooth * 1.1) * 1.4 - pointer.y * 1.2, cz);
    camera.lookAt(pointer.x * 1.2, 0.5 - pointer.y * 0.6, cz - 30);
    // background colour follows the section under the viewport centre
    tmpColor.set(PAL[i0]); clear.copy(tmpColor).lerp(new T.Color(PAL[i1]), f); renderer.setClearColor(clear, 1); scene.fog.color.copy(clear);
    // terrain waves (hidden)
    if (false) {
    var pos = tGeo.attributes.position, arr = pos.array;
    for (var v = 0; v < arr.length; v += 3) { var x = tBase[v], z = tBase[v + 2]; arr[v + 1] = Math.sin(x * 0.11 + t * 0.7) * 2.2 + Math.cos(z * 0.09 + t * 0.55) * 2 + Math.sin((x + z) * 0.05 + t * 0.3) * 2.4; }
    pos.needsUpdate = true;
    }
    // ambient motion
    floaters.forEach(function (m) { m.rotation.x += m.userData.spin; m.rotation.y += m.userData.spin * 1.3; m.position.y = m.userData.y0 + Math.sin(t * m.userData.bob + m.userData.ph) * 1.2; });
    rings.forEach(function (r, k) { r.rotation.z += 0.0025 * (k + 1); r.rotation.x += 0.0008; });
    particles.rotation.y += 0.0007;
    papers.forEach(function (p) { p.rotation.y += p.userData.spin; p.position.y += Math.sin(t + p.userData.ph) * 0.004; });
    // gallery ring: drag inertia, slow spin, hover
    if (!down) { ringGroup.rotation.y += ringVel; ringVel += (0.0016 - ringVel) * 0.03; }
    ray.setFromCamera(mouse, camera);
    var inZone = Math.abs(idxSmooth - 2) < 0.7, hit = null;
    if (inZone && !down) { var hs = ray.intersectObjects(cardMeshes); hit = hs[0] ? hs[0].object : null; }
    if (hit !== hovered) { hovered = hit; document.body.style.cursor = hit ? 'pointer' : ''; }
    cardMeshes.forEach(function (m) {
      var want = m === hovered ? 1.4 : 0; m.userData.out += (want - m.userData.out) * 0.12;
      var R = m.userData.R + m.userData.out; m.position.set(Math.sin(m.userData.a) * R, m.userData.out * 0.15, Math.cos(m.userData.a) * R);
      var sc = 1 + m.userData.out * 0.08; m.scale.setScalar(sc);
    });
    // skills sphere
    skillGroup.rotation.y += 0.0032; skillGroup.rotation.x = Math.sin(t * 0.2) * 0.12;
    var skHit = null; if (Math.abs(idxSmooth - 5) < 0.7) { var sh = ray.intersectObjects(skillSprites); skHit = sh[0] ? sh[0].object : null; }
    skillSprites.forEach(function (s) { var on = s === skHit, k = s.scale.x / s.userData.base.x, goal = on ? 1.45 : 1; s.scale.copy(s.userData.base).multiplyScalar(k + (goal - k) * 0.18); if (on !== !!s.userData.on) { s.userData.on = on; s.material.map = labelTexture(s.userData.text, on); s.material.needsUpdate = true; } });
    if (skHit) document.body.style.cursor = 'pointer';
    // robot and satellite
    robot.rotation.y += 0.008; robot.position.y = -1 + Math.sin(t * 0.9) * 0.6; robot.userData.wheels.forEach(function (w) { w.rotation.x -= 0.05; });
    sat.rotation.y += 0.006; sat.position.y = Math.sin(t * 0.7 + 1) * 0.7; sat.userData.tip.scale.setScalar(1 + Math.sin(t * 5) * 0.35);
    // journey nodes, globe
    nodes.forEach(function (n, k) { n.scale.setScalar(1 + Math.sin(t * 2 + k) * 0.12); });
    globe.rotation.y = t * 0.12 - 1.1; var ps = 1 + (t * 0.8 % 1) * 1.6; pulse.scale.setScalar(ps); pulse.material.opacity = 0.8 * (1 - (t * 0.8 % 1));
    // robot video only plays when you are near it
    var near = Math.abs(idxSmooth - 3) < 1.2; if (near && !vidOn) { vidOn = true; video.play().catch(function () {}); } else if (!near && vidOn) { vidOn = false; video.pause(); }
    vGroup.position.y = 1 + Math.sin(t * 0.8) * 0.4;
    renderer.render(scene, camera);
  }
  loop();
  document.documentElement.dataset.world = 'on';
})();
