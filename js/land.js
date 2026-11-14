/* The living landscape: contour lines drawn from noise, shaped by the quiz answers.
   Rwanda answers raise rolling hills; South Africa answers flatten it into bushveld with a river. */

window.Land = (() => {
  /* ---------- Perlin noise (3D) ---------- */
  const perm = new Uint8Array(512);
  (function seed(s) {
    const a = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const j = s % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = a[i & 255];
  })(20261113);

  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const mix = (a, b, t) => a + t * (b - a);
  function grad(h, x, y, z) {
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
  function noise(x, y, z) {
    const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
    const X = fx & 255, Y = fy & 255, Z = fz & 255;
    x -= fx; y -= fy; z -= fz;
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return mix(
      mix(mix(grad(perm[AA] & 15, x, y, z), grad(perm[BA] & 15, x - 1, y, z), u),
          mix(grad(perm[AB] & 15, x, y - 1, z), grad(perm[BB] & 15, x - 1, y - 1, z), u), v),
      mix(mix(grad(perm[AA + 1] & 15, x, y, z - 1), grad(perm[BA + 1] & 15, x - 1, y, z - 1), u),
          mix(grad(perm[AB + 1] & 15, x, y - 1, z - 1), grad(perm[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
  }
  function fbm(x, y, z) {
    let sum = 0, amp = 0.55, f = 1;
    for (let o = 0; o < 4; o++) { sum += amp * noise(x * f, y * f, z + o * 7.1); f *= 2.03; amp *= 0.5; }
    return sum;
  }

  /* ---------- Shape of the land ---------- */
  const DEFAULTS = { hills: 0.5, river: 0.25, warmth: 0.5, levels: 11, ox: 0, oy: 0, oz: 0 };

  function sampleGrid(cols, rows, aspect, p, t, zone) {
    const z = zone || { x0: 0.08, x1: 0.92, y0: 0.1, y1: 0.9 };
    const vals = new Float32Array((cols + 1) * (rows + 1));
    const freq = 1.0 + p.hills * 2.6;
    const amp = 0.5 + p.hills * 0.42;
    let max = -Infinity, maxI = 0, maxJ = 0;
    for (let j = 0; j <= rows; j++) {
      const ny = j / rows;
      for (let i = 0; i <= cols; i++) {
        const nx = (i / cols) * aspect;
        let v = 0.5 + fbm(nx * freq + p.ox, ny * freq + p.oy, t + p.oz) * amp;
        // flatter land sinks gently toward one side, like a plain running to a river
        v += (1 - p.hills) * 0.12 * (0.5 - ny);
        if (p.river > 0.01) {
          const cy = 0.64 + 0.09 * Math.sin(nx * 2.3 + p.ox) + 0.04 * Math.sin(nx * 5.3 + p.oy);
          const d = ny - cy;
          v -= p.river * 0.32 * Math.exp(-(d * d) / 0.005);
        }
        vals[j * (cols + 1) + i] = v;
        if (v > max && i > cols * z.x0 && i < cols * z.x1 && j > rows * z.y0 && j < rows * z.y1) { max = v; maxI = i; maxJ = j; }
      }
    }
    return { vals, peak: { i: maxI, j: maxJ, v: max } };
  }

  /* ---------- Marching squares ---------- */
  function contour(ctx, vals, cols, rows, cell, ox, oy, level) {
    const w = cols + 1;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = vals[j * w + i], b = vals[j * w + i + 1];
        const c = vals[(j + 1) * w + i + 1], d = vals[(j + 1) * w + i];
        const k = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
        if (k === 0 || k === 15) continue;
        const x0 = ox + i * cell, y0 = oy + j * cell, x1 = x0 + cell, y1 = y0 + cell;
        const T = () => [x0 + cell * (level - a) / (b - a), y0];
        const R = () => [x1, y0 + cell * (level - b) / (c - b)];
        const Bm = () => [x0 + cell * (level - d) / (c - d), y1];
        const L = () => [x0, y0 + cell * (level - a) / (d - a)];
        const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
        switch (k) {
          case 1: case 14: seg(L(), Bm()); break;
          case 2: case 13: seg(Bm(), R()); break;
          case 3: case 12: seg(L(), R()); break;
          case 4: case 11: seg(T(), R()); break;
          case 6: case 9: seg(T(), Bm()); break;
          case 7: case 8: seg(L(), T()); break;
          case 5: seg(L(), T()); seg(Bm(), R()); break;
          case 10: seg(T(), R()); seg(L(), Bm()); break;
        }
      }
    }
  }

  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const blend = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
  const css = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const C = { sand: rgb('#f4ede1'), sage: rgb('#a9bd9c'), orange: rgb('#f2712a'), slate: rgb('#3a4a6b'), ink: rgb('#121a30') };

  /* Draw the land into a rectangle. style: 'night' (screen) or 'paper' (print). */
  function draw(ctx, rect, p, t, style, scale, zone) {
    const cell = (style === 'paper' ? 7 : (rect.w / scale < 700 ? 12 : 10)) * scale;
    const cols = Math.ceil(rect.w / cell), rows = Math.ceil(rect.h / cell);
    const aspect = rect.w / rect.h;
    const { vals, peak } = sampleGrid(cols, rows, aspect, p, t, zone);
    const n = Math.round(p.levels);
    const lo = 0.12, hi = 0.92;
    const warmFrom = Math.round(n * (0.78 - p.warmth * 0.3)); // warmer answers turn more lines orange
    ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const level = lo + (hi - lo) * (k + 0.5) / n;
      const index = k % 4 === 3;
      let col, alpha, lw;
      if (style === 'paper') {
        col = k >= warmFrom ? C.orange : blend(C.slate, rgb('#5f7a5a'), (1 - p.warmth) * 0.6);
        alpha = k >= warmFrom ? 0.95 : 0.55 + 0.35 * (k / n);
        lw = (index ? 2.6 : 1.3) * scale;
      } else {
        const base = blend(C.sage, C.sand, p.warmth);
        col = k >= warmFrom ? C.orange : base;
        alpha = k >= warmFrom ? 0.55 + 0.3 * (k - warmFrom) / Math.max(1, n - warmFrom) : 0.12 + 0.22 * (k / n);
        lw = (index ? 1.6 : 0.9) * scale;
      }
      ctx.strokeStyle = css(col, alpha);
      ctx.lineWidth = lw;
      ctx.beginPath();
      contour(ctx, vals, cols, rows, cell, rect.x, rect.y, level);
      ctx.stroke();
    }
    return { x: rect.x + peak.i * cell, y: rect.y + peak.j * cell };
  }

  function drawMark(ctx, pt, scale, pulse, color, label) {
    const r = 7 * scale;
    ctx.save();
    if (pulse != null) {
      ctx.strokeStyle = css(C.orange, 0.5 * (1 - pulse));
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r + pulse * 26 * scale, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = css(C.orange, 1);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, r * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = css(C.orange, 1); ctx.lineWidth = 1.5 * scale;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, r * 1.6, 0, Math.PI * 2); ctx.stroke();
    if (label) {
      ctx.font = `600 ${11 * scale}px "DM Sans", sans-serif`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'middle';
      ctx.fillText(label, pt.x + r * 2.6, pt.y);
    }
    ctx.restore();
  }

  /* ---------- Live background ---------- */
  function Live(canvas) {
    const ctx = canvas.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cur = { ...DEFAULTS }, target = { ...DEFAULTS };
    let t = 0, last = 0, w = 0, h = 0, dpr = 1, showMark = false, dirty = true, mp = null;
    const markLabel = 'YOUR MARK';

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      dirty = true; mp = null;
    }
    function frame(now) {
      requestAnimationFrame(frame);
      if (now - last < 33) return; // ~30 fps is plenty for slow drift
      const dt = Math.min(100, now - last); last = now;
      let moving = false;
      for (const k in target) {
        const d = target[k] - cur[k];
        if (Math.abs(d) > 0.0005) { cur[k] += d * 0.045; moving = true; }
      }
      if (!reduce) { t += dt * 0.00004; moving = true; }
      if (!moving && !dirty) return;
      dirty = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // keep "your mark" in open land: right of the question panel, above the meter (phones: the strip above the panel)
      const zone = w <= 820 ? { x0: 0.15, x1: 0.7, y0: 0.2, y1: 0.28 } : { x0: Math.min(0.85, 900 / w), x1: 0.9, y0: 0.14, y1: 0.55 };
      const peak = draw(ctx, { x: 0, y: 0, w: canvas.width, h: canvas.height }, cur, t, 'night', dpr, zone);
      mp = mp ? { x: mp.x + (peak.x - mp.x) * 0.06, y: mp.y + (peak.y - mp.y) * 0.06 } : peak; // glide, don't jump
      if (showMark) drawMark(ctx, mp, dpr, reduce ? null : (now / 1800) % 1, 'rgba(244,237,225,.85)', markLabel);
    }
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(frame);
    return {
      set(p) { Object.assign(target, p); dirty = true; },
      reset() { target = { ...DEFAULTS }; dirty = true; },
      params() { return { ...target }; },
      mark(on) { showMark = on; dirty = true; }
    };
  }

  /* ---------- The keepsake print (1080 × 1350) ---------- */
  function print(canvas, p, meta) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, s = W / 1080;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f4ede1'; ctx.fillRect(0, 0, W, H);

    const m = 70 * s, top = 132 * s, mapH = 860 * s;
    const rect = { x: m, y: top, w: W - 2 * m, h: mapH };

    // header
    ctx.fillStyle = '#3a4a6b';
    ctx.font = `600 ${20 * s}px "DM Sans", sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('IMPACT INTERNSHIP  ·  FIELD PRINT', m, 92 * s);
    ctx.textAlign = 'right';
    ctx.fillText(meta.number, W - m, 92 * s);
    ctx.textAlign = 'left';

    // map
    ctx.save();
    ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
    const peak = draw(ctx, rect, p, p.oz, 'paper', s);
    drawMark(ctx, peak, s * 1.4, null, '#121a30', 'YOUR MARK');
    ctx.restore();
    ctx.strokeStyle = '#3a4a6b'; ctx.lineWidth = 1.5 * s;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    // corner ticks
    ctx.lineWidth = 3 * s;
    for (const [x, y, dx, dy] of [[rect.x, rect.y, 1, 1], [rect.x + rect.w, rect.y, -1, 1], [rect.x, rect.y + rect.h, 1, -1], [rect.x + rect.w, rect.y + rect.h, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, y + dy * 28 * s); ctx.lineTo(x, y); ctx.lineTo(x + dx * 28 * s, y); ctx.stroke();
    }

    // title
    ctx.fillStyle = '#121a30';
    let size = 76;
    ctx.font = `400 ${size * s}px "Fraunces", Georgia, serif`;
    while (ctx.measureText(meta.title).width > rect.w && size > 40) { size -= 4; ctx.font = `400 ${size * s}px "Fraunces", Georgia, serif`; }
    ctx.fillText(meta.title, m, top + mapH + 104 * s);
    ctx.fillStyle = '#d95a17';
    ctx.font = `italic 400 ${34 * s}px "Fraunces", Georgia, serif`;
    ctx.fillText(meta.place, m, top + mapH + 156 * s);

    ctx.fillStyle = '#3a4a6b';
    ctx.font = `500 ${21 * s}px "DM Sans", sans-serif`;
    ctx.fillText(meta.line, m, H - 70 * s);
    ctx.textAlign = 'right';
    ctx.fillText('impact-internship.com', W - m, H - 70 * s);
    ctx.textAlign = 'left';
  }

  return { Live, print, DEFAULTS };
})();
