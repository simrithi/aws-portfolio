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

  /* ---------- Varshik diagram tabs ---------- */
  (function vtabs() {
    var img = $('#vimg');
    if (!img) return;
    $$('.vtabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.vtabs button').forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
        b.setAttribute('aria-selected', 'true');
        img.src = b.dataset.img; img.width = b.dataset.w; img.height = b.dataset.h; img.alt = b.dataset.alt;
      });
    });
  })();

  /* ---------- Creative feature: the superpower card pack ---------- */
  (function cards() {
    var KEY = 'simrithi-cards-v1';
    var CARDS = [
      { id: 'cloud', name: 'Cloud Builder', rarity: 'Rare', icon: 'cloud', text: 'Varshik, CareerLens and the Novac CRM all run on AWS. Lambda, DynamoDB, SageMaker, Bedrock, CloudFront.' },
      { id: 'seer', name: 'Flood Seer', rarity: 'Epic', icon: 'drop-fill', text: 'Varshik scores 60 m road cells for waterlogging risk. Top-risk cells matched Delhi\'s official hotspots.' },
      { id: 'community', name: 'Community Builder', rarity: 'Epic', icon: 'users-three', text: 'Grew a 300+ student cloud community. Recognised by AWS as a top Student Builder Campus Leader.' },
      { id: 'guardian', name: 'Last Unit Guardian', rarity: 'Rare', icon: 'lock-key', text: 'FlashSale uses atomic Redis Lua so two buyers never claim the last item. Zero oversells under load.' },
      { id: 'hacker', name: 'Hackathon Regular', rarity: 'Rare', icon: 'rocket-launch', text: '10+ hackathons, including AWS Bharat Builds and Amazon ML Challenge. Top 5 of 300 at IIT Delhi Ideathon.' },
      { id: 'pipe', name: 'Pipe Whisperer', rarity: 'Epic', icon: 'wrench', text: 'PipeSense won 1st of 300 teams at the Datathon. Three sensors, 7 defect types, patent in progress.' },
      { id: 'shipper', name: 'Shipper', rarity: 'Common', icon: 'trophy', text: 'Took a CRM from Figma to production on AWS. 20+ live construction projects now run on it.' },
      { id: 'voice', name: 'Stage Voice', rarity: 'Common', icon: 'microphone-stage', text: 'Runs workshops with live AWS demos, pitched to 200+ students and leads Open Source Connect Global 2026.' }
    ];
    var LEGEND = { id: 'origin', name: 'Why I Build', rarity: 'Legendary', icon: 'star-fill', text: 'I grew up in Tamil Nadu and saw what floods do to families. I lost friends to them. Varshik began with one question: what if we could see which roads will flood before it rains?' };

    var deck = $('#deck'), stage = $('#stage'), list = $('#collection');
    var btnOpen = $('#openPack'), btnReset = $('#resetDeck'), sub = $('#deckSub');
    var owned = load();
    var opener = null, pending = 0;

    function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(owned)); } catch (e) {} }
    function have(id) { return owned.indexOf(id) > -1; }
    function count() { return CARDS.filter(function (c) { return have(c.id); }).length; }
    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

    function cardEl(c, o) {
      o = o || {};
      var el = document.createElement('div');
      el.setAttribute('role', 'button'); el.tabIndex = o.locked ? -1 : 0;
      el.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === el) { e.preventDefault(); el.click(); } });
      el.className = 'card' + (o.small ? ' sm' : '') + (o.up ? ' up' : '') + (o.locked ? ' locked' : '');
      el.dataset.rarity = c ? c.rarity : 'Common';
      el.setAttribute('aria-label', o.locked ? 'Locked card' : (c ? c.name + ', ' + c.rarity + '. ' + c.text : 'Face-down card. Click to reveal.'));
      var more = c && c.id === 'origin' ? '<a class="more" href="https://d24wvc44c3vaxz.cloudfront.net/" rel="noopener">Open Varshik</a>' : '';
      el.innerHTML =
        '<span class="tilt"><span class="flip">' +
        '<span class="face back"></span>' +
        '<span class="face front">' + (c ? (
          '<span class="top"><span>' + c.rarity + '</span><span>Superpower</span></span>' +
          '<span class="art"><i style="--i:url(assets/icons/' + c.icon + '.svg)"></i></span>' +
          '<h4>' + c.name + '</h4><p>' + c.text + '</p>' + more) : '') +
        '<span class="foil"></span></span></span></span>';
      if (o.badge) { var b = document.createElement('span'); b.className = 'new' + (o.badge === 'Duplicate' ? ' dup' : ''); b.textContent = o.badge; el.appendChild(b); }
      if (!reduced) tilt(el);
      return el;
    }

    function tilt(el) {
      var t = el.querySelector('.tilt');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', ((x - .5) * 22).toFixed(1) + 'deg');
        el.style.setProperty('--rx', ((.5 - y) * 22).toFixed(1) + 'deg');
        el.style.setProperty('--px', (x * 100).toFixed(0) + '%');
        el.style.setProperty('--py', (y * 100).toFixed(0) + '%');
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    }


    function chestSVG() {
      var map = [
        '..kkkkkkkkkkkk..',
        '.kbbbbbbbbbbbbk.',
        'kbdbbbbbbbbbbdbk',
        'kbbbbbbbbbbbbbbk',
        'kbbbbbbbbbbbbbbk',
        'kkkkkkggggkkkkkk',
        'kdbbbbgyygbbbbdk',
        'kbbbbbgkkgbbbbbk',
        'kbbbbbbbbbbbbbbk',
        'kbdbbbbbbbbbbdbk',
        'kbbbbbbbbbbbbbbk',
        'kbbbbbbbbbbbbbbk',
        'kdddddddddddddbk',
        'kkkkkkkkkkkkkkkk'
      ];
      var pal = { k: '#2b1a0c', b: '#a9763a', d: '#7a5230', g: '#cfcfcf', y: '#f5c542' };
      var out = '<svg viewBox="0 0 16 14" shape-rendering="crispEdges" aria-hidden="true">';
      map.forEach(function (row, y) {
        for (var x = 0; x < 16; x++) { var ch = row.charAt(x); if (pal[ch]) out += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + pal[ch] + '"/>'; }
      });
      return out + '</svg>';
    }
    $$('[data-chest]').forEach(function (n) { n.innerHTML = chestSVG(); });

    function toast(c, legendary) {
      var old = $('.toast', deck); if (old) old.remove();
      var t = document.createElement('div');
      t.className = 'toast'; t.setAttribute('role', 'status');
      t.innerHTML = '<span class="ico-frame"><i style="--i:url(assets/icons/' + c.icon + '.svg);-webkit-mask:url(assets/icons/' + c.icon + '.svg) center / contain no-repeat;mask:url(assets/icons/' + c.icon + '.svg) center / contain no-repeat"></i></span><div><b>' + (legendary ? 'Challenge Complete!' : 'Advancement Made!') + '</b><span>' + c.name + '</span></div>';
      deck.appendChild(t);
      setTimeout(function () { t.remove(); }, 4700);
    }

    function renderCollection() {
      list.textContent = '';
      CARDS.concat([LEGEND]).forEach(function (c) {
        var li = document.createElement('li');
        var got = c.id === 'origin' ? have('origin') : have(c.id);
        var el = got ? cardEl(c, { small: true, up: true }) : cardEl(null, { small: true, locked: true });
        if (got && c.id === 'origin') el.classList.add('glow');
        li.appendChild(el); list.appendChild(li);
      });
      var n = count();
      $('#collCount').textContent = n + '/8';
      $('#packCount').textContent = n + '/8';
      if (n === 8 && have('origin')) sub.textContent = 'Complete. You found everything, including the secret card.';
      else if (n === 8) sub.textContent = 'All 8 collected. Open one more chest, something is glowing.';
      else sub.textContent = 'Open a chest. Collect all 8 to unlock a secret.';
      btnOpen.hidden = n === 8 && have('origin');
    }

    function showPack() {
      stage.textContent = ''; pending = 0;
      var p = document.createElement('button');
      p.type = 'button'; p.className = 'foil-pack';
      p.innerHTML = chestSVG() + '<strong>Loot chest</strong><small>Click to open</small>';
      p.addEventListener('click', tear);
      stage.appendChild(p); p.focus();
    }

    function draw() {
      var unseen = shuffle(CARDS.filter(function (c) { return !have(c.id); }));
      var picks = unseen.slice(0, 3);
      var rest = shuffle(CARDS.filter(function (c) { return picks.indexOf(c) < 0; }));
      while (picks.length < 3) picks.push(rest.shift());
      if (count() === 8 && !have('origin')) picks = [shuffle(CARDS)[0], shuffle(CARDS)[1], LEGEND];
      return picks;
    }

    function tear() {
      var p = $('.foil-pack', stage);
      if (!p || p.classList.contains('tear')) return;
      p.classList.add('tear');
      var picks = draw();
      setTimeout(function () {
        stage.textContent = ''; pending = picks.length;
        picks.forEach(function (c, i) {
          var isNew = !have(c.id);
          var el = cardEl(c, { badge: isNew ? 'New' : 'Duplicate' });
          el.querySelector('.new').hidden = true;
          if (c.id === 'origin') el.classList.add('glow');
          el.style.opacity = '0'; el.style.transform = 'translateY(30px)';
          stage.appendChild(el);
          setTimeout(function () { el.style.transition = 'opacity .5s, transform .6s var(--ease)'; el.style.opacity = '1'; el.style.transform = 'none'; }, 80 + i * 140);
          el.addEventListener('click', function (e) {
            if (e.target.closest('a')) return;
            if (el.classList.contains('up')) return;
            el.classList.add('up');
            var nb = el.querySelector('.new'); if (nb) nb.hidden = false;
            if (isNew && owned.indexOf(c.id) < 0) { owned.push(c.id); save(); toast(c, c.id === 'origin'); }
            pending--;
            if (c.id === 'origin') burst();
            if (pending === 0) { renderCollection(); btnOpen.textContent = count() === 8 && !have('origin') ? 'Open the glowing chest' : 'Open another chest'; }
          });
        });
        sub.textContent = 'Click each card to flip it. Move your pointer over it to tilt.';
      }, reduced ? 0 : 650);
    }

    function burst() {
      if (reduced) return;
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:95;pointer-events:none';
      cv.width = innerWidth; cv.height = innerHeight; deck.appendChild(cv);
      var x = cv.getContext('2d'), ps = [], cols = ['#ffd479', '#3fd6c9', '#e58bff', '#7aa2ff', '#fff'];
      for (var i = 0; i < 160; i++) ps.push({ x: innerWidth / 2, y: innerHeight / 2, vx: (Math.random() - .5) * 18, vy: Math.random() * -16 - 4, s: 4 + Math.random() * 6, c: cols[i % 5], r: Math.random() * 6 });
      var f = 0;
      (function step() {
        x.clearRect(0, 0, cv.width, cv.height);
        ps.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += .45; p.r += .2; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); x.restore(); });
        if (++f < 110) requestAnimationFrame(step); else cv.remove();
      })();
    }

    function openDeck() {
      opener = document.activeElement;
      deck.hidden = false; document.body.style.overflow = 'hidden';
      renderCollection(); showPack(); btnOpen.textContent = 'Open a chest';
    }
    function closeDeck() {
      deck.hidden = true; document.body.style.overflow = '';
      if (opener && opener.focus) opener.focus();
    }
    $('#packBtn').addEventListener('click', openDeck);
    $('#heroPack').addEventListener('click', openDeck);
    $('#deckClose').addEventListener('click', closeDeck);
    deck.addEventListener('click', function (e) { if (e.target === deck) closeDeck(); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && !deck.hidden) closeDeck(); });
    btnOpen.addEventListener('click', showPack);
    btnReset.addEventListener('click', function () { owned = []; save(); renderCollection(); showPack(); btnOpen.textContent = 'Open a chest'; });
    renderCollection();
  })();
})();
