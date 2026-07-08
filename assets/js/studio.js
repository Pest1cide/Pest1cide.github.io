/* Studio interactions — loader, per-page hero scenes, reveals, nav.
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

  /* ---- Hero scenes -------------------------------------------------------
     Every page hero gets a themed, interactive canvas animation. A shared
     harness handles canvas setup, self-healing sizing, pointer tracking,
     pausing when hidden, and a static frame under prefers-reduced-motion.
     Scenes by page (body[data-page]):
       home, 404   flow    — distance-field particle flow; the cursor is a
                             live obstacle the streams bend around
       research    arm     — planar 2-link arm solving IK toward the cursor,
                             a nod to one-step IK from distance fields
       projects    agents  — robots crossing a shared space with mutual
                             collision avoidance (multi-agent planning)
       interests   topo    — drifting topographic contours; the cursor
                             lifts the terrain (mountains, rides)
       blog, post  notes   — a constellation of drifting ideas; the cursor
                             links the ones nearby
     All scenes except `flow` repaint the full frame every tick and draw
     fading trails from explicit point buffers, so nothing can accumulate
     or leave marks behind the cursor. */

  var INK = '242, 240, 234';
  var ORANGE = '232, 111, 67';

  /* — flow: the original distance-field particle field — */
  function makeFlow(env) {
    var ctx = env.ctx;
    var particles = [], obstacles = [];

    function spawn(anywhere) {
      return {
        x: anywhere ? Math.random() * env.W : -10,
        y: Math.random() * env.H,
        vx: 0, vy: 0,
        life: 120 + Math.random() * 240
      };
    }

    function drawRings(alphaBase, alphaStep) {
      ctx.lineWidth = 1;
      for (var i = 0; i < obstacles.length; i++) {
        var o = obstacles[i];
        for (var k = 0; k < 3; k++) {
          ctx.strokeStyle = 'rgba(' + INK + ', ' + (alphaBase - k * alphaStep) + ')';
          ctx.beginPath();
          ctx.arc(o.x, o.y, o.r + k * 26, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    return {
      seed: function () {
        var n = Math.min(Math.round((env.W * env.H) / 5200), 460);
        particles = [];
        for (var i = 0; i < n; i++) particles.push(spawn(true));
        obstacles = [
          { x: env.W * 0.30, y: env.H * 0.38, r: Math.min(env.W, env.H) * 0.10, ax: 0.00023, ay: 0.00031, px: 0.6, py: 0.8 },
          { x: env.W * 0.62, y: env.H * 0.60, r: Math.min(env.W, env.H) * 0.14, ax: 0.00017, ay: 0.00026, px: 2.1, py: 0.2 },
          { x: env.W * 0.82, y: env.H * 0.30, r: Math.min(env.W, env.H) * 0.08, ax: 0.00029, ay: 0.00021, px: 4.0, py: 3.1 }
        ];
      },
      still: function () {
        ctx.fillStyle = 'rgba(11, 11, 13, 1)';
        ctx.fillRect(0, 0, env.W, env.H);
        drawRings(0.08, 0.02);
        // static streamline impression so the hero isn't near-blank
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(' + INK + ', 0.20)';
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          var inside = false;
          for (var j = 0; j < obstacles.length; j++) {
            var dx = p.x - obstacles[j].x, dy = p.y - obstacles[j].y;
            if (dx * dx + dy * dy < obstacles[j].r * obstacles[j].r * 2) { inside = true; break; }
          }
          if (inside) continue;
          var fy = Math.sin(p.x * 0.004) * 0.25;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + 8, p.y + fy * 8);
          ctx.stroke();
        }
      },
      step: function (now) {
        ctx.fillStyle = 'rgba(11, 11, 13, 0.14)';
        ctx.fillRect(0, 0, env.W, env.H);

        var i, o;
        for (i = 0; i < obstacles.length; i++) {
          o = obstacles[i];
          o.x += Math.sin(now * o.ax + o.px) * 0.35;
          o.y += Math.cos(now * o.ay + o.py) * 0.28;
        }
        // per-frame alpha is calibrated against the 0.14 trail-clear so the
        // rings settle at ~0.10 visible alpha instead of saturating
        drawRings(0.015, 0.004);

        var speedBase = 0.55;
        for (i = 0; i < particles.length; i++) {
          var p = particles[i];
          var fx = speedBase;
          var fy = Math.sin((p.x * 0.004) + now * 0.0003) * 0.12;

          var glow = 0;
          for (var j = 0; j < obstacles.length; j++) {
            o = obstacles[j];
            var dx = p.x - o.x, dy = p.y - o.y;
            var d = Math.sqrt(dx * dx + dy * dy) || 1;
            var gamma = d / o.r;
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

          if (env.pointer.active) {
            var mdx = p.x - env.pointer.x, mdy = p.y - env.pointer.y;
            var md = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
            var mgamma = md / env.pointer.r;
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

          if (p.x > env.W + 12 || p.y < -12 || p.y > env.H + 12 || p.life <= 0) {
            particles[i] = spawn(false);
            continue;
          }

          ctx.strokeStyle = glow > 0.25
            ? 'rgba(' + ORANGE + ', ' + Math.min(0.10 + glow * 0.5, 0.75) + ')'
            : 'rgba(' + INK + ', 0.30)';
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }
    };
  }

  /* — arm: planar 2-link arm reaching for the cursor via analytic IK — */
  function makeArm(env) {
    var ctx = env.ctx;
    var base = { x: 0, y: 0 }, l1 = 0, l2 = 0;
    var a1 = -2.0, a2 = 1.3;         // smoothed joint angles
    var trace = [];                   // recent end-effector positions

    function geom() {
      // on narrow heroes, raise the base and size links from the height so
      // the arm isn't confined to the gradient-darkened bottom edge
      var narrow = env.W < 600;
      base.x = env.W * (narrow ? 0.58 : 0.68);
      base.y = env.H * (narrow ? 0.92 : 0.99);
      var L = narrow ? env.H : Math.min(env.W, env.H);
      l1 = L * (narrow ? 0.34 : 0.40);
      l2 = L * (narrow ? 0.27 : 0.32);
    }

    function targetAt(now) {
      if (env.pointer.active) return { x: env.pointer.x, y: env.pointer.y };
      var t = now * 0.00021;
      var R = (l1 + l2);
      return {
        x: base.x + Math.cos(t + 1.6) * R * 0.55,
        y: base.y - R * 0.35 - Math.abs(Math.sin(t * 0.7)) * R * 0.45
      };
    }

    function solve(tx, ty) {
      if (!(l1 > 0 && l2 > 0)) return [a1, a2];   // degenerate 0-size host
      var dx = tx - base.x, dy = ty - base.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var rMin = Math.abs(l1 - l2) * 1.05 + 1;
      var rMax = (l1 + l2) * 0.98;
      var dc = Math.min(Math.max(d, rMin), rMax);
      var c2 = (dc * dc - l1 * l1 - l2 * l2) / (2 * l1 * l2);
      c2 = Math.min(Math.max(c2, -1), 1);
      var q2 = Math.acos(c2);
      var q1 = Math.atan2(dy, dx) - Math.atan2(l2 * Math.sin(q2), l1 + l2 * Math.cos(q2));
      return [q1, q2];
    }

    function lerpAngle(a, b, t) {
      var d = b - a;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      return a + d * t;
    }

    function pose() {
      var j1 = { x: base.x + Math.cos(a1) * l1, y: base.y + Math.sin(a1) * l1 };
      var ee = { x: j1.x + Math.cos(a1 + a2) * l2, y: j1.y + Math.sin(a1 + a2) * l2 };
      return { j1: j1, ee: ee };
    }

    function drawScene(tgt, animate) {
      ctx.fillStyle = 'rgba(11, 11, 13, 1)';
      ctx.fillRect(0, 0, env.W, env.H);

      // workspace annulus — the configuration-space boundary
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(' + INK + ', 0.07)';
      ctx.beginPath();
      ctx.arc(base.x, base.y, l1 + l2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(' + INK + ', 0.05)';
      ctx.beginPath();
      ctx.arc(base.x, base.y, Math.abs(l1 - l2), 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(' + INK + ', 0.04)';
      ctx.beginPath();
      ctx.arc(base.x, base.y, (l1 + l2) * 0.62, 0, Math.PI * 2);
      ctx.stroke();

      var p = pose();

      // fading end-effector trace (explicit buffer — cannot accumulate)
      if (animate) {
        trace.push({ x: p.ee.x, y: p.ee.y });
        if (trace.length > 70) trace.shift();
        for (var i = 1; i < trace.length; i++) {
          var a = (i / trace.length) * 0.5;
          ctx.strokeStyle = 'rgba(' + ORANGE + ', ' + a + ')';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(trace[i - 1].x, trace[i - 1].y);
          ctx.lineTo(trace[i].x, trace[i].y);
          ctx.stroke();
        }
      }

      // target marker
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(' + ORANGE + ', 0.45)';
      ctx.beginPath();
      ctx.arc(tgt.x, tgt.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(' + ORANGE + ', 0.25)';
      ctx.beginPath();
      ctx.arc(tgt.x, tgt.y, 18, 0, Math.PI * 2);
      ctx.stroke();

      // links
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(' + INK + ', 0.55)';
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(p.j1.x, p.j1.y);
      ctx.lineTo(p.ee.x, p.ee.y);
      ctx.stroke();

      // joints + end effector
      ctx.fillStyle = 'rgba(' + INK + ', 0.6)';
      ctx.beginPath(); ctx.arc(base.x, base.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.j1.x, p.j1.y, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(' + ORANGE + ', 0.9)';
      ctx.beginPath(); ctx.arc(p.ee.x, p.ee.y, 4, 0, Math.PI * 2); ctx.fill();
    }

    return {
      seed: function () { geom(); trace = []; },
      still: function () {
        var tgt = targetAt(0);
        var q = solve(tgt.x, tgt.y);
        a1 = q[0]; a2 = q[1];
        drawScene(tgt, false);
      },
      step: function (now) {
        var tgt = targetAt(now);
        var q = solve(tgt.x, tgt.y);
        if (isFinite(a1) && isFinite(a2)) {
          a1 = lerpAngle(a1, q[0], 0.07);
          a2 = lerpAngle(a2, q[1], 0.07);
        } else {
          // never let a transient NaN freeze the arm forever
          a1 = q[0]; a2 = q[1];
        }
        drawScene(tgt, true);
      }
    };
  }

  /* — agents: robots crossing a shared space, avoiding each other — */
  function makeAgents(env) {
    var ctx = env.ctx;
    var bots = [];

    function edgePoint() {
      var m = 30, side = Math.floor(Math.random() * 4);
      if (side === 0) return { x: Math.random() * env.W, y: -m };
      if (side === 1) return { x: env.W + m, y: Math.random() * env.H };
      if (side === 2) return { x: Math.random() * env.W, y: env.H + m };
      return { x: -m, y: Math.random() * env.H };
    }

    function makeBot(anywhere) {
      var start = anywhere
        ? { x: Math.random() * env.W, y: Math.random() * env.H }
        : edgePoint();
      return {
        x: start.x, y: start.y,
        vx: 0, vy: 0,
        goal: edgePoint(),
        speed: 0.9 + Math.random() * 0.6,
        trail: []
      };
    }

    return {
      seed: function () {
        var n = Math.min(Math.max(Math.round((env.W * env.H) / 46000), 10), 24);
        bots = [];
        for (var i = 0; i < n; i++) bots.push(makeBot(true));
      },
      still: function () {
        ctx.fillStyle = 'rgba(11, 11, 13, 1)';
        ctx.fillRect(0, 0, env.W, env.H);
        for (var i = 0; i < bots.length; i++) {
          var b = bots[i];
          ctx.strokeStyle = 'rgba(' + INK + ', 0.07)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.goal.x, b.goal.y);
          ctx.stroke();
          ctx.fillStyle = 'rgba(' + INK + ', 0.5)';
          ctx.beginPath(); ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2); ctx.fill();
        }
      },
      step: function () {
        ctx.fillStyle = 'rgba(11, 11, 13, 1)';
        ctx.fillRect(0, 0, env.W, env.H);
        ctx.lineWidth = 1.2;

        for (var i = 0; i < bots.length; i++) {
          var b = bots[i];
          var gx = b.goal.x - b.x, gy = b.goal.y - b.y;
          var gd = Math.sqrt(gx * gx + gy * gy) || 1;
          var fx = (gx / gd) * b.speed;
          var fy = (gy / gd) * b.speed;

          // mutual avoidance: repulse + tangential detour, like a velocity obstacle
          var conflict = 0;
          for (var j = 0; j < bots.length; j++) {
            if (j === i) continue;
            var dx = b.x - bots[j].x, dy = b.y - bots[j].y;
            var d = Math.sqrt(dx * dx + dy * dy) || 1;
            if (d < 90) {
              var w = (90 - d) / 90;
              var nx = dx / d, ny = dy / d;
              var tx = -ny, ty = nx;
              if (tx * fx + ty * fy < 0) { tx = ny; ty = -nx; }
              fx += (nx * 1.1 + tx * 0.6) * w * w;
              fy += (ny * 1.1 + ty * 0.6) * w * w;
              conflict = Math.max(conflict, w);
            }
          }

          // the cursor is a moving obstacle to route around
          if (env.pointer.active) {
            var mdx = b.x - env.pointer.x, mdy = b.y - env.pointer.y;
            var md = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
            var rr = env.pointer.r * 1.4;
            if (md < rr) {
              var mw = (rr - md) / rr;
              var mnx = mdx / md, mny = mdy / md;
              var mtx = -mny, mty = mnx;
              if (mtx * fx + mty * fy < 0) { mtx = mny; mty = -mnx; }
              fx += (mnx * 1.3 + mtx * 0.7) * mw * mw;
              fy += (mny * 1.3 + mty * 0.7) * mw * mw;
              conflict = Math.max(conflict, mw);
            }
          }

          b.vx += (fx - b.vx) * 0.08;
          b.vy += (fy - b.vy) * 0.08;
          b.x += b.vx * 1.8;
          b.y += b.vy * 1.8;

          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > 26) b.trail.shift();

          if (gd < 18) { bots[i] = makeBot(false); continue; }

          // fading trail from an explicit buffer
          for (var k = 1; k < b.trail.length; k++) {
            var a = (k / b.trail.length) * 0.3;
            ctx.strokeStyle = conflict > 0.15
              ? 'rgba(' + ORANGE + ', ' + a * 1.6 + ')'
              : 'rgba(' + INK + ', ' + a + ')';
            ctx.beginPath();
            ctx.moveTo(b.trail[k - 1].x, b.trail[k - 1].y);
            ctx.lineTo(b.trail[k].x, b.trail[k].y);
            ctx.stroke();
          }
          ctx.fillStyle = conflict > 0.15
            ? 'rgba(' + ORANGE + ', 0.9)'
            : 'rgba(' + INK + ', 0.6)';
          ctx.beginPath(); ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2); ctx.fill();
        }
      }
    };
  }

  /* — topo: drifting topographic contours; the cursor lifts the terrain — */
  function makeTopo(env) {
    var ctx = env.ctx;
    var waves = [];
    var CELL = 24;
    var LEVELS = [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5];

    function field(x, y, t) {
      var v = 0;
      for (var i = 0; i < waves.length; i++) {
        var w = waves[i];
        v += w.a * Math.sin(x * w.kx + y * w.ky + t * w.s + w.p);
      }
      if (env.pointer.active) {
        var dx = x - env.pointer.x, dy = y - env.pointer.y;
        v += 1.6 * Math.exp(-(dx * dx + dy * dy) / (2 * 95 * 95));
      }
      return v;
    }

    function drawContours(t) {
      ctx.fillStyle = 'rgba(11, 11, 13, 1)';
      ctx.fillRect(0, 0, env.W, env.H);

      var cols = Math.ceil(env.W / CELL) + 1;
      var rows = Math.ceil(env.H / CELL) + 1;
      var grid = new Array(cols * rows);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          grid[r * cols + c] = field(c * CELL, r * CELL, t);
        }
      }

      ctx.lineWidth = 1;
      for (var li = 0; li < LEVELS.length; li++) {
        var level = LEVELS[li];
        ctx.strokeStyle = li === 3
          ? 'rgba(' + ORANGE + ', 0.28)'
          : 'rgba(' + INK + ', 0.15)';
        ctx.beginPath();
        for (r = 0; r < rows - 1; r++) {
          for (c = 0; c < cols - 1; c++) {
            var x0 = c * CELL, y0 = r * CELL;
            var v00 = grid[r * cols + c] - level;
            var v10 = grid[r * cols + c + 1] - level;
            var v01 = grid[(r + 1) * cols + c] - level;
            var v11 = grid[(r + 1) * cols + c + 1] - level;
            var idx = (v00 > 0 ? 8 : 0) | (v10 > 0 ? 4 : 0) | (v11 > 0 ? 2 : 0) | (v01 > 0 ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            // edge interpolation points
            var top = { x: x0 + CELL * (v00 / (v00 - v10 || 1e-6)), y: y0 };
            var bottom = { x: x0 + CELL * (v01 / (v01 - v11 || 1e-6)), y: y0 + CELL };
            var left = { x: x0, y: y0 + CELL * (v00 / (v00 - v01 || 1e-6)) };
            var right = { x: x0 + CELL, y: y0 + CELL * (v10 / (v10 - v11 || 1e-6)) };
            var segs = MS_SEGMENTS[idx];
            for (var s = 0; s < segs.length; s += 2) {
              var p1 = pick(segs[s], top, right, bottom, left);
              var p2 = pick(segs[s + 1], top, right, bottom, left);
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
            }
          }
        }
        ctx.stroke();
      }
    }

    function pick(which, top, right, bottom, left) {
      if (which === 0) return top;
      if (which === 1) return right;
      if (which === 2) return bottom;
      return left;
    }

    // marching-squares segment table: edge pairs per case (0=top 1=right 2=bottom 3=left)
    var MS_SEGMENTS = {
      1: [3, 2], 2: [2, 1], 3: [3, 1], 4: [0, 1], 5: [3, 0, 2, 1], 6: [0, 2], 7: [3, 0],
      8: [0, 3], 9: [0, 2], 10: [0, 1, 2, 3], 11: [0, 1], 12: [3, 1], 13: [2, 1], 14: [3, 2]
    };

    return {
      seed: function () {
        waves = [];
        var n = 5;
        for (var i = 0; i < n; i++) {
          var ang = Math.random() * Math.PI * 2;
          var wl = 170 + Math.random() * 260;        // wavelength in px
          var k = (Math.PI * 2) / wl;
          waves.push({
            a: 0.45 + Math.random() * 0.35,
            kx: Math.cos(ang) * k,
            ky: Math.sin(ang) * k,
            s: (Math.random() * 0.00016 + 0.00006) * (Math.random() < 0.5 ? -1 : 1),
            p: Math.random() * Math.PI * 2
          });
        }
      },
      warm: 1,   // each frame is a pure function of time; no warm-up needed
      still: function () { drawContours(0); },
      step: function (now) { drawContours(now); }
    };
  }

  /* — notes: a constellation of drifting ideas; the cursor links them — */
  function makeNotes(env) {
    var ctx = env.ctx;
    var nodes = [];

    return {
      seed: function () {
        var n = Math.min(Math.max(Math.round((env.W * env.H) / 15000), 30), 90);
        nodes = [];
        for (var i = 0; i < n; i++) {
          nodes.push({
            x: Math.random() * env.W,
            y: Math.random() * env.H,
            vx: (Math.random() - 0.5) * 0.45,
            vy: (Math.random() - 0.5) * 0.45
          });
        }
      },
      warm: 1,   // nodes barely move per frame; one paint is enough
      still: function () { this.step(0); },
      step: function () {
        ctx.fillStyle = 'rgba(11, 11, 13, 1)';
        ctx.fillRect(0, 0, env.W, env.H);
        ctx.lineWidth = 1;

        var i, j, dx, dy, d;
        for (i = 0; i < nodes.length; i++) {
          var nd = nodes[i];
          nd.x += nd.vx;
          nd.y += nd.vy;
          if (nd.x < -20) nd.x = env.W + 20;
          if (nd.x > env.W + 20) nd.x = -20;
          if (nd.y < -20) nd.y = env.H + 20;
          if (nd.y > env.H + 20) nd.y = -20;
        }

        // idea links
        for (i = 0; i < nodes.length; i++) {
          for (j = i + 1; j < nodes.length; j++) {
            dx = nodes[i].x - nodes[j].x;
            dy = nodes[i].y - nodes[j].y;
            d = dx * dx + dy * dy;
            if (d < 120 * 120) {
              var a = (1 - Math.sqrt(d) / 120) * 0.20;
              ctx.strokeStyle = 'rgba(' + INK + ', ' + a + ')';
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.stroke();
            }
          }
        }

        // the cursor links the thoughts around it
        if (env.pointer.active) {
          for (i = 0; i < nodes.length; i++) {
            dx = nodes[i].x - env.pointer.x;
            dy = nodes[i].y - env.pointer.y;
            d = Math.sqrt(dx * dx + dy * dy);
            if (d < 170) {
              var pa = (1 - d / 170) * 0.35;
              ctx.strokeStyle = 'rgba(' + ORANGE + ', ' + pa + ')';
              ctx.beginPath();
              ctx.moveTo(env.pointer.x, env.pointer.y);
              ctx.lineTo(nodes[i].x, nodes[i].y);
              ctx.stroke();
            }
          }
        }

        for (i = 0; i < nodes.length; i++) {
          ctx.fillStyle = 'rgba(' + INK + ', 0.65)';
          ctx.beginPath();
          ctx.arc(nodes[i].x, nodes[i].y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
  }

  var SCENES = {
    home: makeFlow,
    research: makeArm,
    projects: makeAgents,
    interests: makeTopo,
    blog: makeNotes,
    post: makeNotes
  };

  function initHeroScene() {
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
    var env = { ctx: ctx, W: 0, H: 0, pointer: { x: 0, y: 0, active: false, r: 90 } };
    var inView = true;
    var tabVisible = !document.hidden;

    var page = document.body.getAttribute('data-page') || '';
    var scene = (SCENES[page] || makeFlow)(env);

    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      // idempotent: skip when nothing changed (covers the ResizeObserver's
      // guaranteed initial notification, mobile URL-bar resize events, and
      // the load-time re-check without re-seeding the whole scene)
      if (w === env.W && h === env.H && canvas.width === w * dpr) return;
      env.W = w;
      env.H = h;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      env.pointer.r = Math.min(Math.min(w, h) * 0.16, 120);
      scene.seed();
      if (reduceMotion) {
        scene.still();
        return;
      }
      // warm-start: pre-run the simulation so the very first painted frame
      // already shows a developed scene instead of an empty canvas. Scenes
      // whose frames are pure functions of time opt down via scene.warm.
      var warm = typeof scene.warm === 'number' ? scene.warm : 60;
      var t0 = performance.now();
      for (var wf = warm; wf > 0; wf--) scene.step(t0 - wf * 16.7);
    }

    var resizeTimer;
    function scheduleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    }
    window.addEventListener('resize', scheduleResize);

    // Self-heal the canvas size: the injected subpage host can be measured
    // before layout/fonts settle; re-size (debounced) when its box changes.
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(scheduleResize);
      ro.observe(host);
    }
    window.addEventListener('load', resize);

    resize();

    if (reduceMotion) return;   // static frame only

    var io = new IntersectionObserver(function (entries) {
      // entries are delivered oldest-first; the last one is the current state
      inView = entries[entries.length - 1].isIntersecting;
    }, { threshold: 0 });
    io.observe(host);
    document.addEventListener('visibilitychange', function () {
      tabVisible = !document.hidden;
    });

    function updatePointer(e) {
      var rect = host.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      if (x >= -40 && x <= env.W + 40 && y >= -40 && y <= env.H + 40) {
        env.pointer.x = x;
        env.pointer.y = y;
        env.pointer.active = true;
      } else {
        env.pointer.active = false;
      }
    }
    window.addEventListener('pointermove', updatePointer, { passive: true });
    // touch: follow the finger while dragging, release cleanly on lift
    window.addEventListener('pointerdown', updatePointer, { passive: true });
    window.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'touch') env.pointer.active = false;
    }, { passive: true });
    window.addEventListener('blur', function () { env.pointer.active = false; });

    function step(now) {
      if (inView && tabVisible) scene.step(now);
      requestAnimationFrame(step);
    }
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
    initHeroScene();
    initHeader();
    initReveals();
    initVideos();
    initNotes();
    initYear();
  });
})();
