/* Studio interactions — loader, distance-field flow hero, reveals, nav.
   Dependency-free; respects prefers-reduced-motion. */
(function () {
  'use strict';

  // signal that JS is running so CSS can safely hide-then-reveal content
  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    /(^|[?&])nomotion/.test(location.search);
  if (/(^|[?&])flat/.test(location.search)) document.documentElement.classList.add('flat');

  /* ---- Loader ---------------------------------------------------------- */
  function initLoader() {
    var loader = document.querySelector('.loader');
    if (!loader) return;
    var seen = /(^|[?&])noloader/.test(location.search);
    try { seen = seen || sessionStorage.getItem('zw-loader') === '1'; } catch (e) { /* private mode */ }
    if (reduceMotion || seen) {
      loader.remove();
      document.body.classList.remove('is-loading');
      return;
    }
    document.body.classList.add('is-loading');
    var count = loader.querySelector('.loader__count');
    var bar = loader.querySelector('.loader__bar');
    var start = performance.now();
    var DURATION = 1400;

    function tick(now) {
      var t = Math.min((now - start) / DURATION, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      var pct = Math.round(eased * 100);
      if (count) count.textContent = String(pct).padStart(3, '0');
      if (bar) bar.style.transform = 'scaleX(' + eased + ')';
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        loader.classList.add('is-done');
        document.body.classList.remove('is-loading');
        try { sessionStorage.setItem('zw-loader', '1'); } catch (e) { /* ignore */ }
        setTimeout(function () { loader.remove(); }, 1000);
      }
    }
    requestAnimationFrame(tick);
  }

  /* ---- Distance-field flow hero ----------------------------------------
     Particles follow a nominal flow that is modulated around moving
     obstacles — a small homage to dynamical-systems obstacle avoidance.
     The cursor is a live obstacle: the flow bends around it and glows
     nearby, clicks send out a ripple. Runs on the homepage hero and, by
     injecting a canvas, on every subpage's .page-hero. */
  function initFlowField() {
    var host = document.querySelector('.hero__canvas');
    if (!host) {
      var pageHero = document.querySelector('.page-hero');
      if (pageHero) {
        host = document.createElement('div');
        host.className = 'hero__canvas';
        host.setAttribute('aria-hidden', 'true');
        pageHero.insertBefore(host, pageHero.firstChild);
      }
    }
    if (!host) return;
    var canvas = document.createElement('canvas');
    host.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var particles = [];
    var obstacles = [];
    var running = true;
    var inView = true;
    var tabVisible = !document.hidden;
    var pointer = { x: 0, y: 0, active: false, r: 90 };
    var ripples = [];

    function resize() {
      W = host.clientWidth;
      H = host.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pointer.r = Math.min(Math.min(W, H) * 0.16, 120);
      seed();
    }

    function seed() {
      var n = Math.min(Math.round((W * H) / 7000), 420);
      particles = [];
      for (var i = 0; i < n; i++) particles.push(spawn(true));
      obstacles = [
        { x: W * 0.30, y: H * 0.38, r: Math.min(W, H) * 0.10, ax: 0.00023, ay: 0.00031, px: 0.6, py: 0.8 },
        { x: W * 0.62, y: H * 0.60, r: Math.min(W, H) * 0.14, ax: 0.00017, ay: 0.00026, px: 2.1, py: 0.2 },
        { x: W * 0.82, y: H * 0.30, r: Math.min(W, H) * 0.08, ax: 0.00029, ay: 0.00021, px: 4.0, py: 3.1 }
      ];
    }

    function spawn(anywhere) {
      return {
        x: anywhere ? Math.random() * W : -10,
        y: Math.random() * H,
        vx: 0, vy: 0,
        life: 120 + Math.random() * 240
      };
    }

    function step(now) {
      if (!running) return;
      if (!(inView && tabVisible)) { requestAnimationFrame(step); return; }

      ctx.fillStyle = 'rgba(11, 11, 13, 0.14)';
      ctx.fillRect(0, 0, W, H);

      var i, o;
      for (i = 0; i < obstacles.length; i++) {
        o = obstacles[i];
        o.x += Math.sin(now * o.ax + o.px) * 0.35;
        o.y += Math.cos(now * o.ay + o.py) * 0.28;
      }

      // distance-field contour rings around obstacles
      ctx.lineWidth = 1;
      for (i = 0; i < obstacles.length; i++) {
        o = obstacles[i];
        for (var k = 0; k < 3; k++) {
          var rr = o.r + k * 26;
          ctx.strokeStyle = 'rgba(242, 240, 234, ' + (0.05 - k * 0.014) + ')';
          ctx.beginPath();
          ctx.arc(o.x, o.y, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // cursor field: contour rings that track the pointer
      if (pointer.active) {
        for (var pk = 0; pk < 3; pk++) {
          ctx.strokeStyle = 'rgba(232, 111, 67, ' + (0.18 - pk * 0.05) + ')';
          ctx.beginPath();
          ctx.arc(pointer.x, pointer.y, pointer.r * 0.5 + pk * 20, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // click ripples
      for (i = ripples.length - 1; i >= 0; i--) {
        var age = now - ripples[i].t;
        if (age > 900 || age < 0) { ripples.splice(i, 1); continue; }
        var prog = age / 900;
        ctx.strokeStyle = 'rgba(232, 111, 67, ' + (0.45 * (1 - prog)) + ')';
        ctx.beginPath();
        ctx.arc(ripples[i].x, ripples[i].y, prog * Math.min(W, H) * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }

      var speedBase = 0.55;
      for (i = 0; i < particles.length; i++) {
        var p = particles[i];
        // nominal flow: gentle rightward stream with slight vertical wave
        var fx = speedBase;
        var fy = Math.sin((p.x * 0.004) + now * 0.0003) * 0.12;

        // modulate around each obstacle (repulsion + tangential deflection)
        var glow = 0;
        for (var j = 0; j < obstacles.length; j++) {
          o = obstacles[j];
          var dx = p.x - o.x, dy = p.y - o.y;
          var d = Math.sqrt(dx * dx + dy * dy) || 1;
          var gamma = d / o.r; // >1 outside
          if (gamma < 3) {
            var w = Math.max(0, (3 - gamma) / 2);
            var nx = dx / d, ny = dy / d;
            var tx = -ny, ty = nx;
            if (tx * fx + ty * fy < 0) { tx = ny; ty = -nx; }
            fx += (nx * 0.9 + tx * 0.8) * w * w;
            fy += (ny * 0.9 + ty * 0.8) * w * w;
            glow = Math.max(glow, w);
          }
        }

        // the cursor is a live obstacle the flow steers around
        if (pointer.active) {
          var mdx = p.x - pointer.x, mdy = p.y - pointer.y;
          var md = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
          var mgamma = md / pointer.r;
          if (mgamma < 3) {
            var mw = Math.max(0, (3 - mgamma) / 2);
            var mnx = mdx / md, mny = mdy / md;
            var mtx = -mny, mty = mnx;
            if (mtx * fx + mty * fy < 0) { mtx = mny; mty = -mnx; }
            fx += (mnx * 1.15 + mtx * 0.95) * mw * mw;
            fy += (mny * 1.15 + mty * 0.95) * mw * mw;
            glow = Math.max(glow, mw);
          }
        }

        p.vx += (fx - p.vx) * 0.08;
        p.vy += (fy - p.vy) * 0.08;
        var px = p.x, py = p.y;
        p.x += p.vx * 2.1;
        p.y += p.vy * 2.1;
        p.life -= 1;

        if (p.x > W + 12 || p.y < -12 || p.y > H + 12 || p.life <= 0) {
          particles[i] = spawn(false);
          continue;
        }

        ctx.strokeStyle = glow > 0.25
          ? 'rgba(232, 111, 67, ' + Math.min(0.10 + glow * 0.5, 0.75) + ')'
          : 'rgba(242, 240, 234, 0.20)';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      requestAnimationFrame(step);
    }

    if (reduceMotion) {
      // static impression: faint contour rings only
      resize();
      ctx.fillStyle = 'rgba(11, 11, 13, 1)';
      ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < obstacles.length; i++) {
        var o = obstacles[i];
        for (var k = 0; k < 4; k++) {
          ctx.strokeStyle = 'rgba(242, 240, 234, ' + (0.07 - k * 0.015) + ')';
          ctx.beginPath();
          ctx.arc(o.x, o.y, o.r + k * 26, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
    }, { threshold: 0 });
    io.observe(host);
    document.addEventListener('visibilitychange', function () {
      tabVisible = !document.hidden;
    });

    function updatePointer(e) {
      var rect = host.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      if (x >= -40 && x <= W + 40 && y >= -40 && y <= H + 40) {
        pointer.x = x; pointer.y = y; pointer.active = true;
      } else {
        pointer.active = false;
      }
    }
    window.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('pointerdown', function (e) {
      updatePointer(e);
      if (pointer.active) ripples.push({ x: pointer.x, y: pointer.y, t: performance.now() });
    }, { passive: true });
    window.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'touch') pointer.active = false;
    }, { passive: true });
    window.addEventListener('blur', function () { pointer.active = false; });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    resize();
    requestAnimationFrame(step);
  }

  /* ---- Header + nav ------------------------------------------------------ */
  function initHeader() {
    var header = document.querySelector('.site-header');
    if (header) {
      var onScroll = function () {
        header.classList.toggle('is-scrolled', window.scrollY > 24);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    var toggle = document.querySelector('.nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.querySelectorAll('.nav-overlay a').forEach(function (a) {
        a.addEventListener('click', function () {
          document.body.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // active section highlight (one-pager)
    var sections = document.querySelectorAll('main section[id]');
    var links = document.querySelectorAll('.site-nav a[href^="#"]');
    if (sections.length && links.length && 'IntersectionObserver' in window) {
      var map = {};
      links.forEach(function (l) { map[l.getAttribute('href').slice(1)] = l; });
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && map[e.target.id]) {
            links.forEach(function (l) { l.classList.remove('is-active'); });
            map[e.target.id].classList.add('is-active');
          }
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      sections.forEach(function (s) { sio.observe(s); });
    }
  }

  /* ---- Scroll reveals ------------------------------------------------------ */
  function initReveals() {
    var items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---- Lazy video playback --------------------------------------------------- */
  function initVideos() {
    var vids = document.querySelectorAll('video[data-autoplay]');
    if (!vids.length) return;
    if (reduceMotion) {
      // no autoplaying motion: show a still frame with opt-in controls
      vids.forEach(function (v) { v.controls = true; });
      return;
    }
    if (!('IntersectionObserver' in window)) {
      vids.forEach(function (v) { v.play().catch(function () {}); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { v.play().catch(function () {}); }
        else { v.pause(); }
      });
    }, { threshold: 0.2 });
    vids.forEach(function (v) { io.observe(v); });
  }

  /* ---- Latest notes (data/posts.json) ------------------------------------------ */
  function initNotes() {
    var mount = document.querySelector('[data-latest-posts]');
    if (!mount) return;
    var limit = parseInt(mount.getAttribute('data-limit') || '3', 10);
    fetch('data/posts.json')
      .then(function (r) { return r.json(); })
      .then(function (posts) {
        posts.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        mount.innerHTML = '';
        posts.slice(0, limit).forEach(function (post) {
          var a = document.createElement('a');
          a.className = 'note-row';
          a.href = 'post.html?post=' + encodeURIComponent(post.slug);
          a.innerHTML =
            '<time></time>' +
            '<div><h3></h3><p></p></div>' +
            '<span class="note-row__arrow" aria-hidden="true">→</span>';
          var time = a.querySelector('time');
          time.setAttribute('datetime', post.date);
          time.textContent = post.date;
          a.querySelector('h3').textContent = post.title;
          a.querySelector('p').textContent = post.excerpt;
          mount.appendChild(a);
        });
      })
      .catch(function () {
        mount.innerHTML = '<p class="muted">Notes are unavailable right now.</p>';
      });
  }

  /* ---- Footer year ----------------------------------------------------------------- */
  function initYear() {
    document.querySelectorAll('[data-current-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initLoader();
    initFlowField();
    initHeader();
    initReveals();
    initVideos();
    initNotes();
    initYear();
  });
})();
