// 像素美术工厂：角色、物资图标、平台/墙体/书架/旗帜等程序化纹理
(function () {
  const PX = {};

  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  PX.canvas = cv;

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
  }
  PX.shade = shade;

  // 可复现的伪随机
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; }; }
  PX.rng = rng;

  // ───────────────────────── 角色 ─────────────────────────
  // 16x24 像素角色，脚底在最底行。朝右为默认朝向。
  const tmp = cv(16, 24), tctx = tmp.getContext('2d');
  const sil = cv(16, 24), sctx = sil.getContext('2d');

  function drawBody(ctx, pal, pose, frame, carry) {
    const p = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const skin = pal.skin, hair = pal.hair, coat = pal.coat, coatD = shade(pal.coat, -0.28);
    const pants = pal.pants, shoes = pal.shoes, acc = pal.accent;
    let bob = 0, lx = 0, rx = 0, lLift = 0, rLift = 0, lean = 0;
    if (pose === 'idle') bob = frame % 2;
    if (pose === 'walk') {
      const W = [[-1, 1, 0], [0, 0, 1], [1, -1, 0], [0, 0, 1]][frame % 4];
      lx = W[0]; rx = W[1]; bob = W[2];
    }
    if (pose === 'push') { lean = 1; const W = [[-1, 1], [1, -1]][frame % 2]; lx = W[0]; rx = W[1]; }
    if (pose === 'jump' || pose === 'fall') { lLift = 1; rLift = 2; lx = -1; rx = 1; }
    if (pose === 'climb') { lLift = frame % 2 ? 2 : 0; rLift = frame % 2 ? 0 : 2; }
    const back = pose === 'climb';

    // 腿与鞋
    p(6 + lx, 18 - lLift, 2, 4, shade(pants, -0.15));
    p(8 + rx, 18 - rLift, 2, 4, pants);
    p(5 + lx, 22 - lLift, 3, 2, shade(shoes, -0.1));
    p(8 + rx, 22 - rLift, 3, 2, shoes);

    const by = bob, bx = lean;
    // 身体
    p(5 + bx, 11 + by, 6, 7, coat);
    p(5 + bx, 11 + by, 1, 7, coatD);
    p(5 + bx, 15 + by, 6, 1, shade(pal.coat, -0.45));
    if (!back) p(6 + bx, 11 + by, 4, 1, acc);
    if (pal.robe) p(5 + bx, 17 + by, 6, 1, coat);

    // 手臂
    const arm = (x, y, w, h, c) => p(x + bx, y + by, w, h, c);
    if (back) {
      if (frame % 2) { arm(4, 5, 1, 7, coatD); arm(4, 4, 1, 1, skin); arm(11, 12, 1, 4, coatD); arm(11, 16, 1, 1, skin); }
      else { arm(11, 5, 1, 7, coatD); arm(11, 4, 1, 1, skin); arm(4, 12, 1, 4, coatD); arm(4, 16, 1, 1, skin); }
    } else if (pose === 'hand') {
      arm(3, 2, 1, 10, coatD); arm(3, 1, 1, 1, skin); arm(2, 0, 1, 1, skin);
      arm(10, 12, 1, 4, coat); arm(10, 16, 1, 1, skin);
    } else if (carry) {
      arm(3, 3, 1, 9, coatD); arm(12, 3, 1, 9, coat); arm(3, 2, 1, 1, skin); arm(12, 2, 1, 1, skin);
    } else if (pose === 'push' || pose === 'operate') {
      arm(4, 12, 1, 3, coatD); arm(10, 13, 3, 1, coat); arm(13, 13, 1, 1, skin);
    } else if (pose === 'hammer') {
      arm(4, 12, 1, 4, coatD); arm(4, 16, 1, 1, skin);
      if (frame % 2 === 0) { arm(10, 6, 1, 6, coat); arm(10, 5, 1, 1, skin); arm(10, 2, 1, 3, '#6b4423'); arm(9, 1, 4, 2, '#8a8f99'); }
      else { arm(10, 13, 3, 1, coat); arm(13, 13, 1, 1, skin); arm(14, 12, 1, 4, '#6b4423'); arm(13, 15, 3, 2, '#8a8f99'); }
    } else if (pose === 'jump' || pose === 'fall') {
      arm(3, 8, 1, 4, coatD); arm(12, 8, 1, 4, coat); arm(3, 7, 1, 1, skin); arm(12, 7, 1, 1, skin);
    } else {
      arm(4, 12, 1, 4, coatD); arm(4, 16, 1, 1, skin);
      arm(10, 12, 1, 4, coat); arm(10, 16, 1, 1, skin);
    }

    // 头
    const hy = by, hx = bx;
    const h = (x, y, w, hh, c) => p(x + hx, y + hy, w, hh, c);
    h(4, 3, 8, 8, skin);
    if (back) {
      h(4, 2, 8, 9, hair); h(4, 10, 8, 1, shade(hair, -0.2));
    } else {
      h(4, 2, 8, 3, hair); h(4, 5, 2, 4, hair); h(4, 9, 1, 1, hair);
      if (pal.longHair) { h(3, 4, 2, 9, hair); }
      if (pose === 'stun') {
        h(8, 6, 1, 1, '#2a1e1a'); h(9, 7, 1, 1, '#2a1e1a'); h(8, 8, 1, 1, '#2a1e1a');
        h(10, 6, 1, 1, '#2a1e1a'); h(11, 7, 1, 1, '#2a1e1a'); h(10, 8, 1, 1, '#2a1e1a');
      } else {
        h(8, 6, 1, 2, '#2a1e1a'); h(10, 6, 1, 2, '#2a1e1a');
        h(8, 6, 1, 1, '#4a3a3a');
        h(11, 9, 1, 1, shade(skin, -0.15));
      }
      if (pal.beard) { h(7, 9, 5, 2, pal.beard); }
    }
    // 帽子
    const hat = pal.hat;
    if (hat === 'beret') { h(3, 1, 9, 2, pal.hatColor); h(4, 0, 6, 1, pal.hatColor); h(7, -1, 1, 1, shade(pal.hatColor, -0.3)); h(3, 3, 9, 1, shade(pal.hatColor, -0.25)); }
    else if (hat === 'cap') { h(4, 1, 8, 2, pal.hatColor); h(back ? 3 : 9, 3, 4, 1, shade(pal.hatColor, -0.25)); }
    else if (hat === 'hood') {
      h(3, 1, 10, 2, pal.hatColor); h(3, 3, 2, 9, pal.hatColor); h(12, 3, 1, 5, pal.hatColor);
      if (back) h(4, 3, 8, 8, pal.hatColor);
      h(3, 1, 10, 1, shade(pal.hatColor, 0.15));
    }
    else if (hat === 'band') { h(4, 3, 8, 1, pal.hatColor); h(4, 2, 8, 1, hair); }
    else if (hat === 'turban') { h(3, 0, 10, 4, pal.hatColor); h(4, 1, 8, 1, shade(pal.hatColor, 0.2)); h(10, 2, 2, 1, acc); }
  }

  PX.drawChar = function (ctx, pal, pose, frame, carry) {
    tctx.clearRect(0, 0, 16, 24);
    tctx.save(); tctx.translate(0, 1); drawBody(tctx, pal, pose, frame, carry); tctx.restore();
    // 深色描边
    sctx.clearRect(0, 0, 16, 24);
    sctx.globalCompositeOperation = 'source-over';
    sctx.drawImage(tmp, 0, 0);
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = '#2b1d1a'; sctx.fillRect(0, 0, 16, 24);
    sctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => ctx.drawImage(sil, dx, dy));
    ctx.drawImage(tmp, 0, 0);
  };

  PX.portrait = function (pal, size = 64) {
    const c = cv(16, 24); PX.drawChar(c.getContext('2d'), pal, 'idle', 0, false);
    const out = cv(size, size), o = out.getContext('2d');
    o.imageSmoothingEnabled = false;
    // 截取头肩（x 1..15, y 0..15）
    o.drawImage(c, 1, 0, 14, 15, size * 0.06, size * 0.1, size * 0.88, size * 0.94);
    return out.toDataURL();
  };

  PX.drawPortraitToCanvas = function (cvs, pal) {
    if (!cvs || !cvs.getContext) return;
    const ctx = cvs.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const c = cv(16, 24);
    PX.drawChar(c.getContext('2d'), pal, 'idle', 0, false);
    ctx.drawImage(c, 1, 0, 14, 15, cvs.width * 0.05, cvs.height * 0.05, cvs.width * 0.9, cvs.height * 0.9);
  };

  // ───────────────────────── 物资图标 ─────────────────────────
  function drawItem(ctx, type) {
    const p = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    ctx.clearRect(0, 0, 12, 12);
    if (type === 'bread') {
      p(3, 3, 6, 1, '#5a3214'); p(2, 4, 8, 1, '#5a3214'); p(1, 5, 10, 4, '#5a3214'); p(2, 9, 8, 1, '#5a3214');
      p(3, 4, 6, 1, '#e3a24c'); p(2, 5, 8, 3, '#d9933f'); p(2, 8, 8, 1, '#a8642a');
      p(3, 5, 1, 2, '#f6d08f'); p(6, 5, 1, 2, '#f6d08f'); p(9, 5, 1, 2, '#f6d08f'); p(4, 4, 3, 1, '#f3c27a');
    } else if (type === 'wood') {
      p(0, 3, 10, 7, '#3b2412');
      p(1, 4, 8, 5, '#8a5a2b'); p(1, 4, 8, 1, '#b07a3e'); p(2, 6, 3, 1, '#6e4420'); p(5, 7, 3, 1, '#6e4420');
      p(8, 2, 4, 9, '#3b2412'); p(9, 3, 2, 7, '#e8c48a'); p(9, 5, 2, 3, '#c79a5a'); p(10, 6, 1, 1, '#8a5a2b');
    } else if (type === 'stone') {
      p(2, 3, 8, 1, '#3d3f47'); p(1, 4, 10, 6, '#3d3f47'); p(2, 10, 8, 1, '#3d3f47');
      p(2, 4, 8, 6, '#9aa0ab'); p(2, 4, 8, 2, '#c3c8d0'); p(3, 7, 3, 1, '#7c828d'); p(7, 8, 2, 1, '#7c828d'); p(8, 5, 1, 1, '#e6e9ee');
    } else if (type === 'rune') {
      p(3, 1, 6, 10, '#5a4a2a'); p(4, 2, 4, 8, '#f3dc8a'); p(5, 3, 2, 1, '#b08a2a'); p(5, 5, 2, 3, '#b08a2a'); p(4, 6, 4, 1, '#b08a2a');
    }
  }
  const itemCanvasCache = {};
  PX.itemCanvas = function (type) {
    if (!itemCanvasCache[type]) { const c = cv(12, 12); drawItem(c.getContext('2d'), type); itemCanvasCache[type] = c; }
    return itemCanvasCache[type];
  };
  const itemUrlCache = {};
  PX.itemURL = function (type) {
    if (!itemUrlCache[type]) {
      const c = cv(36, 36), o = c.getContext('2d'); o.imageSmoothingEnabled = false;
      o.drawImage(PX.itemCanvas(type), 0, 0, 36, 36); itemUrlCache[type] = c.toDataURL();
    }
    return itemUrlCache[type];
  };

  // ───────────────────────── 纹理 ─────────────────────────
  function nearest(tex) { tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; return tex; }
  PX.tex = function (canvas, rx = 1, ry = 1) {
    const t = nearest(new THREE.CanvasTexture(canvas));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
  };

  PX.stoneCanvas = function (base, seed = 7) {
    const c = cv(32, 32), o = c.getContext('2d'), r = rng(seed);
    o.fillStyle = base; o.fillRect(0, 0, 32, 32);
    const mortar = shade(base, -0.28);
    for (let row = 0; row < 4; row++) {
      const y = row * 8, off = row % 2 ? 8 : 0;
      o.fillStyle = mortar; o.fillRect(0, y + 7, 32, 1);
      for (let x = off; x < 32 + 16; x += 16) { o.fillRect((x) % 32, y, 1, 7); }
      for (let i = 0; i < 10; i++) { o.fillStyle = shade(base, (r() - 0.5) * 0.18); o.fillRect(Math.floor(r() * 32), y + Math.floor(r() * 6), 2, 1); }
      o.fillStyle = shade(base, 0.12); o.fillRect(0, y, 32, 1);
    }
    return c;
  };

  PX.woodCanvas = function (base = '#a8723d') {
    const c = cv(32, 16), o = c.getContext('2d');
    o.fillStyle = base; o.fillRect(0, 0, 32, 16);
    o.fillStyle = shade(base, -0.35); o.fillRect(0, 7, 32, 1); o.fillRect(0, 15, 32, 1);
    o.fillRect(11, 0, 1, 7); o.fillRect(25, 8, 1, 7);
    o.fillStyle = shade(base, 0.15); o.fillRect(0, 0, 32, 1); o.fillRect(0, 8, 32, 1);
    o.fillStyle = shade(base, -0.15); o.fillRect(4, 3, 4, 1); o.fillRect(16, 11, 5, 1); o.fillRect(28, 4, 2, 1);
    return c;
  };

  PX.crateCanvas = function () {
    const c = cv(16, 16), o = c.getContext('2d');
    o.fillStyle = '#5a3a1c'; o.fillRect(0, 0, 16, 16);
    o.fillStyle = '#b07a3e'; o.fillRect(1, 1, 14, 14);
    o.fillStyle = '#8a5a2b'; o.fillRect(1, 5, 14, 1); o.fillRect(1, 10, 14, 1);
    o.fillStyle = '#6e4420';
    for (let i = 0; i < 14; i++) { o.fillRect(1 + i, 1 + i, 1, 1); }
    o.fillStyle = '#d8a060'; o.fillRect(1, 1, 14, 1);
    o.fillStyle = '#5a3a1c'; o.fillRect(0, 0, 16, 1); o.fillRect(0, 15, 16, 1); o.fillRect(0, 0, 1, 16); o.fillRect(15, 0, 1, 16);
    return c;
  };

  // 真正的石砖砌成拱窗背墙（9块辐射拱石 + 锁心石 + 拱腿托梁）
  PX.archWallCanvas = function (base, seed = 3, archColor) {
    const c = cv(64, 64), o = c.getContext('2d'), r = rng(seed);
    o.drawImage(PX.stoneCanvas(base, seed), 0, 0); o.drawImage(PX.stoneCanvas(base, seed + 1), 32, 0);
    o.drawImage(PX.stoneCanvas(base, seed + 2), 0, 32); o.drawImage(PX.stoneCanvas(base, seed + 3), 32, 32);
    
    const cx = 32, cy = 24, rIn = 14, rOut = 21;
    
    // 挖空拱窗开口
    o.globalCompositeOperation = 'destination-out';
    o.fillRect(cx - rIn, cy, rIn * 2, 36);
    o.beginPath(); o.arc(cx, cy, rIn, Math.PI, 0); o.fill();
    o.globalCompositeOperation = 'source-over';
    
    // 左右拱腿两侧的砖块立边与托梁 (Imposts)
    const stoneColA = shade(base, 0.2);
    const stoneColB = shade(base, 0.05);
    const mortarCol = shade(base, -0.4);
    const keystoneCol = archColor || shade(base, 0.35);

    // 左右柱身侧边石砖与水平灰缝
    for (let y = cy + 2; y < 60; y += 7) {
      o.fillStyle = (y % 14 === 2) ? stoneColA : stoneColB;
      o.fillRect(cx - rOut, y, rOut - rIn, 6);
      o.fillRect(cx + rIn, y, rOut - rIn, 6);
      o.fillStyle = mortarCol;
      o.fillRect(cx - rOut, y + 6, rOut - rIn, 1);
      o.fillRect(cx + rIn, y + 6, rOut - rIn, 1);
    }

    // 左右拱趾托梁 (Imposts)
    o.fillStyle = shade(base, 0.28);
    o.fillRect(cx - rOut - 2, cy - 2, (rOut - rIn) + 3, 3);
    o.fillRect(cx + rIn - 1, cy - 2, (rOut - rIn) + 3, 3);
    o.fillStyle = mortarCol;
    o.fillRect(cx - rOut - 2, cy + 1, (rOut - rIn) + 3, 1);
    o.fillRect(cx + rIn - 1, cy + 1, (rOut - rIn) + 3, 1);

    // 辐射石砖拱圈 (Voussoirs)
    const numStones = 9;
    for (let i = 0; i < numStones; i++) {
      const isKeystone = (i === 4);
      const a0 = Math.PI - (i / numStones) * Math.PI;
      const a1 = Math.PI - ((i + 1) / numStones) * Math.PI;
      const curROut = isKeystone ? rOut + 3 : rOut;
      
      o.beginPath();
      o.arc(cx, cy, curROut, a0, a1, true);
      o.arc(cx, cy, rIn, a1, a0, false);
      o.closePath();
      o.fillStyle = isKeystone ? keystoneCol : (i % 2 === 0 ? stoneColA : stoneColB);
      o.fill();
      
      // 灰缝分隔线
      o.strokeStyle = mortarCol;
      o.lineWidth = 1;
      o.beginPath();
      o.moveTo(cx + Math.cos(a0) * rIn, cy + Math.sin(a0) * rIn);
      o.lineTo(cx + Math.cos(a0) * curROut, cy + Math.sin(a0) * curROut);
      o.stroke();
    }

    // 拱圈内沿深度阴影
    o.strokeStyle = 'rgba(0,0,0,0.35)';
    o.lineWidth = 1;
    o.beginPath();
    o.arc(cx, cy, rIn, Math.PI, 0);
    o.stroke();

    // 窗台底座
    o.fillStyle = shade(base, -0.25);
    o.fillRect(cx - rOut - 1, 58, (rOut * 2) + 2, 3);
    
    return c;
  };

  PX.shelfCanvas = function () {
    const c = cv(32, 32), o = c.getContext('2d'), r = rng(11);
    o.fillStyle = '#4a2c16'; o.fillRect(0, 0, 32, 32);
    const cols = ['#a83a32', '#2f5a8a', '#3f7a3a', '#c8a040', '#7a3a7a', '#d8d0b8', '#8a5a2b'];
    for (let row = 0; row < 4; row++) {
      const y = row * 8;
      o.fillStyle = '#6e4420'; o.fillRect(0, y + 7, 32, 1);
      let x = 1;
      while (x < 31) {
        const w = 1 + Math.floor(r() * 3), h = 4 + Math.floor(r() * 3);
        o.fillStyle = cols[Math.floor(r() * cols.length)]; o.fillRect(x, y + 7 - h, w, h);
        o.fillStyle = 'rgba(255,255,255,0.25)'; o.fillRect(x, y + 7 - h, w, 1);
        x += w + (r() < 0.15 ? 2 : 0);
      }
    }
    o.fillStyle = '#2e1a0c'; o.fillRect(0, 0, 1, 32); o.fillRect(31, 0, 1, 32);
    return c;
  };

  PX.bannerCanvas = function (color = '#b8322c', emblem = '#f0c050') {
    const c = cv(16, 32), o = c.getContext('2d');
    o.fillStyle = color; o.fillRect(1, 0, 14, 28);
    o.fillStyle = shade(color, -0.3); o.fillRect(1, 0, 1, 28); o.fillRect(14, 0, 1, 28);
    o.fillStyle = color; for (let x = 1; x < 15; x++) { const d = Math.abs(x - 7.5); o.fillRect(x, 28, 1, Math.max(0, 4 - d * 0.6)); }
    o.fillStyle = emblem; o.fillRect(0, 1, 16, 1); o.fillRect(0, 26, 16, 1);
    // 太阳纹
    o.fillRect(6, 9, 4, 4); o.fillRect(7, 6, 2, 2); o.fillRect(7, 14, 2, 2); o.fillRect(3, 10, 2, 2); o.fillRect(11, 10, 2, 2);
    o.fillRect(4, 7, 1, 1); o.fillRect(11, 7, 1, 1); o.fillRect(4, 14, 1, 1); o.fillRect(11, 14, 1, 1);
    return c;
  };

  PX.glyphCanvas = function (text, fg = '#ffe9a8', bg = null, size = 64) {
    const c = cv(size, size), o = c.getContext('2d');
    if (bg) { o.fillStyle = bg; o.fillRect(0, 0, size, size); }
    o.fillStyle = fg; o.textAlign = 'center'; o.textBaseline = 'middle';
    o.font = `bold ${Math.floor(size * 0.6)}px "Segoe UI Symbol","Noto Sans Symbols","Segoe UI",sans-serif`;
    o.fillText(text, size / 2, size / 2 + 2);
    return c;
  };

  PX.steleCanvas = function (glyphs, lit) {
    const c = cv(32, 48), o = c.getContext('2d');
    o.fillStyle = '#2b2622'; o.fillRect(2, 2, 28, 46);
    o.fillStyle = lit ? '#e9dcb8' : '#b8ad98'; o.fillRect(3, 3, 26, 44);
    o.fillStyle = lit ? '#fff3c8' : '#cfc5ae'; o.fillRect(3, 3, 26, 3);
    o.fillStyle = lit ? '#e8a020' : '#5c5346';
    o.textAlign = 'center'; o.textBaseline = 'middle';
    o.font = 'bold 13px "Segoe UI Symbol","Segoe UI",sans-serif';
    glyphs.forEach((g, i) => o.fillText(g, 16, 16 + i * 15));
    return c;
  };

  PX.skyCanvas = function (top, bottom) {
    const c = cv(4, 256), o = c.getContext('2d');
    const g = o.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, top); g.addColorStop(1, bottom);
    o.fillStyle = g; o.fillRect(0, 0, 4, 256); return c;
  };

  PX.waterfallCanvas = function () {
    const c = cv(16, 64), o = c.getContext('2d'), r = rng(5);
    o.fillStyle = '#9fd8f0'; o.fillRect(0, 0, 16, 64);
    for (let i = 0; i < 40; i++) { o.fillStyle = r() < 0.5 ? '#e8f8ff' : '#6fbfe6'; o.fillRect(Math.floor(r() * 16), Math.floor(r() * 64), 1, 3 + Math.floor(r() * 6)); }
    return c;
  };

  PX.cloudCanvas = function (seed = 1) {
    const c = cv(64, 32), o = c.getContext('2d'), r = rng(seed);
    o.fillStyle = '#ffffff';
    for (let i = 0; i < 9; i++) { const x = 10 + r() * 44, y = 14 + r() * 8, rad = 6 + r() * 8; o.beginPath(); o.arc(x, y, rad, 0, Math.PI * 2); o.fill(); }
    o.fillStyle = '#dde8f5'; o.fillRect(6, 24, 52, 4);
    o.globalCompositeOperation = 'destination-out'; o.fillRect(0, 28, 64, 4);
    return c;
  };

  PX.towerFarCanvas = function (base) {
    const c = cv(64, 64), o = c.getContext('2d');
    o.fillStyle = base; o.fillRect(0, 0, 64, 64);
    o.fillStyle = shade(base, -0.25);
    for (let i = 0; i < 4; i++) { const x = 4 + i * 16; o.fillRect(x, 24, 8, 30); o.beginPath(); o.arc(x + 4, 24, 4, Math.PI, 0); o.fill(); }
    o.fillStyle = shade(base, 0.2); o.fillRect(0, 0, 64, 4); o.fillRect(0, 58, 64, 2);
    return c;
  };

  window.PX = PX;
})();
