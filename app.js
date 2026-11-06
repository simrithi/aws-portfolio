// The rising flood: tap the raindrop, rain falls, the water climbs the viewport,
// and a high-water mark appears with the story behind Varshik.
// The water and rain layers ignore pointer events, so navigation always works.
(function () {
  var MAX_LEVEL = 38;      // percent of viewport height the water reaches
  var RISE_MS = 7000;
  var RAIN_MS = 9000;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var root = document.documentElement;
  var drop = document.getElementById('drop');
  var dropLabel = document.getElementById('dropLabel');
  var water = document.getElementById('water');
  var marker = document.getElementById('marker');
  var gauge = document.getElementById('gauge');
  var gaugeValue = document.getElementById('gaugeValue');
  var drain = document.getElementById('drain');
  var hintLine = document.getElementById('hintLine');
  var canvas = document.getElementById('rain');
  var ctx = canvas.getContext('2d');

  var level = 0;           // current percent
  var raf = null;
  var rainUntil = 0;
  var drops = [];
  var flooded = false;

  drop.classList.add('fresh');
  setTimeout(function () { drop.classList.remove('fresh'); }, 6000);

  function setLevel(v) {
    level = v;
    root.style.setProperty('--level', v.toFixed(2));
    root.style.setProperty('--marker-bottom', Math.max(v, 0).toFixed(2));
    gaugeValue.textContent = (v / MAX_LEVEL * 2.4).toFixed(1) + ' m';
  }

  function animateTo(target, ms, done) {
    cancelAnimationFrame(raf);
    var from = level, start = performance.now();
    if (reduced) { setLevel(target); if (done) done(); return; }
    (function step(now) {
      var t = Math.min((now - start) / ms, 1);
      var eased = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setLevel(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(step); else if (done) done();
    })(start);
  }

  function resize() {
    var r = window.devicePixelRatio || 1;
    canvas.width = innerWidth * r; canvas.height = innerHeight * r;
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }
  addEventListener('resize', resize); resize();

  function rainLoop(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    var waterTop = innerHeight * (1 - level / 100);
    if (now < rainUntil && drops.length < 160) {
      for (var i = 0; i < 4; i++) drops.push({ x: Math.random() * innerWidth, y: -20, v: 14 + Math.random() * 10, l: 10 + Math.random() * 14 });
    }
    ctx.strokeStyle = 'rgba(92, 195, 224, .75)'; ctx.lineWidth = 1.4; ctx.beginPath();
    drops = drops.filter(function (d) {
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + d.l);
      d.y += d.v;
      return d.y < waterTop + 10;
    });
    ctx.stroke();
    if (drops.length || now < rainUntil) requestAnimationFrame(rainLoop);
  }

  function startRain() {
    if (reduced) return;
    rainUntil = performance.now() + RAIN_MS;
    requestAnimationFrame(rainLoop);
  }

  function flood() {
    flooded = true;
    drop.setAttribute('aria-pressed', 'true');
    drop.classList.add('used');
    dropLabel.textContent = 'Let it drain';
    drop.setAttribute('aria-label', 'Let the water drain');
    water.classList.add('on');
    gauge.hidden = false;
    if (hintLine) hintLine.style.visibility = 'hidden';
    startRain();
    animateTo(MAX_LEVEL, RISE_MS, function () {
      marker.hidden = false;
    });
    // Show the story a little before the water finishes, so it is not a long wait.
    setTimeout(function () { if (flooded) marker.hidden = false; }, reduced ? 0 : RISE_MS * 0.55);
  }

  function drainAway() {
    flooded = false;
    drop.setAttribute('aria-pressed', 'false');
    dropLabel.textContent = 'Make it rain';
    drop.setAttribute('aria-label', 'Make it rain. Reveals a story about why I build what I build.');
    marker.hidden = true;
    animateTo(0, reduced ? 1 : 3500, function () {
      water.classList.remove('on');
      gauge.hidden = true;
      if (hintLine) hintLine.style.visibility = 'visible';
    });
  }

  drop.addEventListener('click', function () { flooded ? drainAway() : flood(); });
  drain.addEventListener('click', drainAway);
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && flooded) drainAway(); });
})();
