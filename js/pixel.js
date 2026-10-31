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
    } else if (type === 'dates') {
      // 椰枣蜜饯串（深红琥珀色光泽）
      p(2, 2, 8, 8, '#4a1e0c'); p(3, 3, 6, 6, '#8b3814'); p(4, 4, 4, 4, '#c45a22');
      p(3, 4, 2, 2, '#e07d38'); p(6, 6, 2, 2, '#e07d38'); p(5, 2, 2, 2, '#5c7a28');
    } else if (type === 'meat') {
      // 腌熏肉干（带草绳捆扎的深色熏肉）
      p(1, 3, 10, 6, '#3a1818'); p(2, 4, 8, 4, '#8a2828'); p(3, 4, 6, 3, '#b83e3e');
      p(5, 2, 2, 8, '#d4a359'); p(4, 5, 4, 1, '#d4a359'); p(7, 4, 2, 1, '#e86868');
    } else if (type === 'water') {
      // 陶土双耳水罐（两河流域陶壶 + 蓝水波）
      p(4, 1, 4, 2, '#8a4824'); p(3, 3, 6, 7, '#b86638'); p(2, 5, 8, 4, '#b86638');
      p(4, 4, 4, 5, '#4aa8d8'); p(5, 5, 2, 3, '#88d2f4'); p(2, 4, 1, 3, '#8a4824'); p(9, 4, 1, 3, '#8a4824');
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
  function worldFilter(tex) { tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; return tex; }
  PX.tex = function (canvas, rx = 1, ry = 1) {
    const t = nearest(new THREE.CanvasTexture(canvas));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
  };
  PX.worldTex = function (canvas, rx = 1, ry = 1) {
    const t = worldFilter(new THREE.CanvasTexture(canvas));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
  };

  PX.sandCanvas = function (base = '#dfbe84', seed = 13) {
    const c = cv(32, 32), o = c.getContext('2d'), r = rng(seed);
    o.fillStyle = base; o.fillRect(0, 0, 32, 32);
    // 柔软的风成波纹与沙丘流线（温润的黄沙与细微深浅光影）
    for (let y = 0; y < 32; y += 4) {
      o.fillStyle = shade(base, (r() - 0.5) * 0.08);
      o.fillRect(0, y, 32, 2);
    }
    // 细腻沙粒与金色微尘散点
    for (let i = 0; i < 48; i++) {
      o.fillStyle = shade(base, (r() - 0.5) * 0.16);
      o.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1);
    }
    // 浅金高光沙粒
    for (let i = 0; i < 24; i++) {
      o.fillStyle = shade(base, 0.14);
      o.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1);
    }
    return c;
  };

  // 1. 古代美索不达米亚晒制泥砖（Adobe Mud Brick，草茎纤维杂质、烘干微裂纹与风化夯土质感）
  PX.adobeBrickCanvas = function (base = '#c89e6c', seed = 21) {
    const c = cv(32, 32), o = c.getContext('2d'), r = rng(seed);
    o.fillStyle = base; o.fillRect(0, 0, 32, 32);
    const mortar = shade(base, -0.32);
    const highlight = shade(base, 0.18);
    const shadow = shade(base, -0.18);

    // 4 行交错排列的两河凸面泥砖 (Plano-convex Bricks)
    for (let row = 0; row < 4; row++) {
      const y = row * 8;
      const xOff = (row % 2 === 0) ? 0 : 8;
      // 水平粘土灰缝
      o.fillStyle = mortar;
      o.fillRect(0, y + 7, 32, 1);
      
      for (let bx = -8 + xOff; bx < 32 + 8; bx += 16) {
        const x1 = Math.max(0, bx);
        const x2 = Math.min(32, bx + 15);
        if (x2 <= x1) continue;
        const bw = x2 - x1;

        // 竖向泥浆缝
        if (bx >= 0 && bx < 32) {
          o.fillStyle = mortar;
          o.fillRect(bx, y, 1, 7);
        }
        // 泥砖顶部微凸高光与底部阴影
        o.fillStyle = highlight;
        o.fillRect(x1 + 1, y, bw - 2, 1);
        o.fillStyle = shadow;
        o.fillRect(x1 + 1, y + 6, bw - 2, 1);

        // 砖面草茎碎末杂质 (Straw bits)
        for (let s = 0; s < 3; s++) {
          o.fillStyle = r() > 0.5 ? '#6a4422' : '#d8b872';
          const sx = x1 + 2 + Math.floor(r() * Math.max(1, bw - 4));
          const sy = y + 2 + Math.floor(r() * 4);
          o.fillRect(sx, sy, 2, 1);
        }
      }
    }
    return c;
  };

  // 2. 精密切割琢石砌体（Dressed Ashlar Stone，带斜角倒边、方石缝与细密凿痕）
  PX.ashlarStoneCanvas = function (base = '#c8b8a0', seed = 7) {
    const c = cv(32, 32), o = c.getContext('2d'), r = rng(seed);
    o.fillStyle = base; o.fillRect(0, 0, 32, 32);
    const joint = shade(base, -0.42);
    const bevelHi = shade(base, 0.24);
    const bevelLo = shade(base, -0.22);

    for (let row = 0; row < 3; row++) {
      const y = row * 11;
      const xShift = (row % 2) * 11;
      // 深度石缝
      o.fillStyle = joint;
      o.fillRect(0, y + 10, 32, 1);

      for (let bx = -11 + xShift; bx < 32 + 11; bx += 22) {
        if (bx >= 0 && bx < 32) {
          o.fillStyle = joint;
          o.fillRect(bx, y, 1, 10);
        }
        // 石块倒角与高光
        o.fillStyle = bevelHi;
        o.fillRect(Math.max(0, bx + 1), y, Math.min(32, bx + 21) - Math.max(0, bx + 1), 1);
        o.fillStyle = bevelLo;
        o.fillRect(Math.max(0, bx + 1), y + 9, Math.min(32, bx + 21) - Math.max(0, bx + 1), 1);

        // 细密石凿纹理 (Chisel marks)
        for (let i = 0; i < 6; i++) {
          o.fillStyle = shade(base, (r() - 0.5) * 0.22);
          const cx = Math.max(1, Math.min(30, bx + 2 + Math.floor(r() * 18)));
          const cy = y + 2 + Math.floor(r() * 6);
          o.fillRect(cx, cy, 2, 1);
        }
      }
    }
    return c;
  };

  // 3. 高山雪松古木（Ancient Cedar & Acacia Timber，饱满深沉琥珀木色、纵向木纹纤维与青铜铆钉）
  PX.ancientCedarCanvas = function (base = '#5c381e', seed = 15) {
    const c = cv(32, 16), o = c.getContext('2d'), r = rng(seed);
    o.fillStyle = base; o.fillRect(0, 0, 32, 16);
    // 深色木缝与木板拼合线
    o.fillStyle = '#261408'; o.fillRect(0, 7, 32, 1); o.fillRect(0, 15, 32, 1);
    o.fillRect(15, 0, 1, 7); o.fillRect(31, 8, 1, 7);

    // 纵向木质纤维拉丝纹路
    const grainDark = shade(base, -0.3);
    const grainLight = shade(base, 0.22);
    for (let x = 0; x < 32; x += 2) {
      if (r() > 0.4) {
        o.fillStyle = r() > 0.5 ? grainDark : grainLight;
        o.fillRect(x, Math.floor(r() * 6), 1 + Math.floor(r() * 3), 1);
        o.fillRect(x, 8 + Math.floor(r() * 6), 1 + Math.floor(r() * 3), 1);
      }
    }
    // 年轮节疤 (Knot whorl)
    o.fillStyle = '#221106';
    o.fillRect(8, 3, 2, 2);
    o.fillStyle = grainLight;
    o.fillRect(7, 2, 4, 1); o.fillRect(7, 5, 4, 1);

    // 古代青铜铆钉 (Bronze structural studs)
    const studMat = '#d89b38';
    const studShd = '#1a0e06';
    [2, 13, 18, 29].forEach(sx => {
      o.fillStyle = studShd; o.fillRect(sx, 6, 2, 2); o.fillRect(sx, 14, 2, 2);
      o.fillStyle = studMat; o.fillRect(sx, 6, 1, 1); o.fillRect(sx, 14, 1, 1);
    });

    return c;
  };

  // 4. 玄武岩/闪长岩雕像专属石材（Basalt / Diorite，皇家黑曜光泽与泥板黄金铭文）
  PX.basaltStatueCanvas = function (seed = 42) {
    const c = cv(32, 32), o = c.getContext('2d'), r = rng(seed);
    o.fillStyle = '#22201e'; o.fillRect(0, 0, 32, 32);
    // 闪长岩矿物晶粒 (Feldspar/Hornblende flecks)
    for (let i = 0; i < 40; i++) {
      o.fillStyle = shade('#2a2724', (r() - 0.5) * 0.35);
      o.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1);
    }
    // 石雕阴影折痕
    o.fillStyle = '#141312'; o.fillRect(0, 0, 1, 32); o.fillRect(0, 31, 32, 1);
    o.fillStyle = '#423e38'; o.fillRect(1, 0, 31, 1); o.fillRect(31, 0, 1, 31);
    // 贯穿腰腹的楔形文字贴金铭文饰带 (Gold Leaf Cuneiform Band)
    o.fillStyle = '#8a6218'; o.fillRect(0, 14, 32, 5);
    o.fillStyle = '#ffd24a';
    o.fillRect(2, 15, 3, 1); o.fillRect(3, 16, 2, 1); o.fillRect(2, 17, 3, 1);
    o.fillRect(8, 15, 1, 3); o.fillRect(10, 16, 2, 1);
    o.fillRect(14, 15, 4, 1); o.fillRect(16, 16, 2, 2);
    o.fillRect(21, 15, 2, 3); o.fillRect(24, 16, 3, 1);
    o.fillRect(29, 15, 2, 1); o.fillRect(28, 17, 3, 1);
    return c;
  };

  // 5. 村落古代鹅卵石路（Cobblestone & Sandy Earth Path）
  PX.cobblePathCanvas = function (base = '#c4b294', seed = 33) {
    const c = cv(32, 32), o = c.getContext('2d'), r = rng(seed);
    o.fillStyle = shade(base, -0.22); o.fillRect(0, 0, 32, 32);
    const stoneCol = base;
    // 错落圆形河卵石
    for (let cy = 2; cy < 32; cy += 6) {
      for (let cx = (cy % 4) ? 2 : 5; cx < 32; cx += 6) {
        const sw = 4 + Math.floor(r() * 2), sh = 3 + Math.floor(r() * 2);
        o.fillStyle = shade(stoneCol, (r() - 0.5) * 0.2);
        o.beginPath();
        o.roundRect ? o.roundRect(cx, cy, sw, sh, 1) : o.fillRect(cx, cy, sw, sh);
        o.fill();
        // 磨损脚踏高光
        o.fillStyle = shade(stoneCol, 0.25);
        o.fillRect(cx + 1, cy, sw - 2, 1);
      }
    }
    return c;
  };

  // 6. 近东彩色编织物（Woven Striped Kilim & Awning Textile）
  PX.stripedTextileCanvas = function (c1 = '#b83226', c2 = '#e2ab3c', c3 = '#2a5a78') {
    const c = cv(32, 32), o = c.getContext('2d');
    o.fillStyle = c1; o.fillRect(0, 0, 32, 32);
    o.fillStyle = c2;
    for (let x = 0; x < 32; x += 8) o.fillRect(x, 0, 3, 32);
    o.fillStyle = c3;
    for (let x = 4; x < 32; x += 8) o.fillRect(x, 0, 1, 32);
    // 编织经纬线暗纹
    o.fillStyle = 'rgba(0,0,0,0.15)';
    for (let y = 0; y < 32; y += 2) o.fillRect(0, y, 32, 1);
    // 底部挂穗 (Fringes)
    o.fillStyle = '#fff0d0';
    for (let x = 0; x < 32; x += 2) o.fillRect(x, 30, 1, 2);
    return c;
  };

  // 7. 活水波光质感（Irrigation Water Surface）
  PX.waterCanvas = function () {
    const c = cv(32, 32), o = c.getContext('2d'), r = rng(77);
    o.fillStyle = '#2f8cb8'; o.fillRect(0, 0, 32, 32);
    // 荡漾水纹与清澈反光
    for (let y = 0; y < 32; y += 3) {
      o.fillStyle = '#4db8e2';
      o.fillRect(Math.floor(r() * 16), y, 10 + Math.floor(r() * 10), 1);
      o.fillStyle = '#8ce2f8';
      o.fillRect(Math.floor(r() * 20), y + 1, 4 + Math.floor(r() * 6), 1);
    }
    return c;
  };

  PX.stoneCanvas = function (base, seed = 7) {
    return PX.ashlarStoneCanvas(base, seed);
  };

  PX.woodCanvas = function (base = '#5c381e') {
    return PX.ancientCedarCanvas(base, 15);
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
