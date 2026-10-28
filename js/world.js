// 3D 世界构建：前景可行走平台（Z≈0）+ 背墙拱窗 + 纵深巴别塔与装饰 + 机关网格
(function () {
  const W = {};
  const texCache = {};
  function stoneTex(color, rx, ry, seed = 7) {
    const k = 's' + color + seed;
    if (!texCache[k]) texCache[k] = PX.stoneCanvas(color, seed);
    return PX.tex(texCache[k], rx, ry);
  }
  function woodTex(color, rx, ry) {
    const k = 'w' + color;
    if (!texCache[k]) texCache[k] = PX.woodCanvas(color);
    return PX.tex(texCache[k], rx, ry);
  }
  W.stoneTex = stoneTex; W.woodTex = woodTex;

  function lam(opts) { return new THREE.MeshLambertMaterial(opts); }
  function box(w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; m.receiveShadow = true; return m; }

  // 找到 x 处、y 以下的最高支撑面
  function floorBelow(level, x, y) {
    let best = level.bounds.y1 - 4;
    level.walls.forEach(w => { if (x >= w[0] && x <= w[1] && w[3] < y - 0.1 && w[3] > best) best = w[3]; });
    level.plats.forEach(p => { if (x >= p[0] && x <= p[1] && p[2] < y - 0.1 && p[2] > best) best = p[2]; });
    return best;
  }

  // 巴别塔巨大圆塔半径（产生微妙的圆柱弧面透视，非单纯平面横版）
  const TOWER_RADIUS = 160;
  let currentCenterX = 35;
  function arcZ(x, z0 = 0) {
    const dx = x - currentCenterX;
    return z0 - (dx * dx) / (2 * TOWER_RADIUS);
  }
  function arcYaw(x) {
    return -(x - currentCenterX) / TOWER_RADIUS;
  }
  W.arcZ = arcZ; W.arcYaw = arcYaw;

  W.build = function (game, level) {
    const th = level.theme;
    const root = new THREE.Group();
    const anim = [];   // {update(dt,t)}
    game.scene.add(root);
    currentCenterX = (level.bounds.x1 + level.bounds.x2) / 2;

    // 天空、雾、光
    game.scene.background = PX.tex(PX.skyCanvas(th.sky[0], th.sky[1]));
    game.scene.background.repeat.set(1, 1);
    game.scene.fog = new THREE.Fog(th.fog, 70, 240);

    const hemi = new THREE.HemisphereLight(0xfff6e8, 0x8a7a68, 0.78); root.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d0, 0.72);
    sun.position.set(18, 30, 26); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 120;
    sun.shadow.bias = -0.0015;
    root.add(sun); root.add(sun.target);
    game.sunLight = sun;
    game.doorways = [];

    const stoneMatFor = (w, h, seed) => lam({ map: stoneTex(th.stone, Math.max(1, w / 2), Math.max(1, h / 2), seed) });

    // ── 序章·真实大地地表与巴别巨塔山峦根基（消除浮空岛感觉） ──
    if (level.id === 1) {
      // 1. 无垠古苏美尔冲积平原/红土荒原基底（真实连绵大地）
      const groundGeo = new THREE.PlaneGeometry(280, 180, 24, 20);
      const groundTex = PX.tex(PX.stoneCanvas(th.stone, 55), 18, 12);
      const earthMat = lam({ map: groundTex });
      const earthMesh = new THREE.Mesh(groundGeo, earthMat);
      earthMesh.rotation.x = -Math.PI / 2;
      earthMesh.position.set(35, -8.0, -35);
      earthMesh.receiveShadow = true;
      root.add(earthMesh);

      // 2. 地平线远景：起伏连绵的荒漠沙丘与古河床
      const duneGeo = new THREE.PlaneGeometry(320, 26, 32, 1);
      const duneMat = lam({ color: PX.shade(th.stone, -0.08) });
      const dunes = new THREE.Mesh(duneGeo, duneMat);
      dunes.position.set(35, 5.0, -90);
      root.add(dunes);

      // 3. 右侧天际：巴别巨塔的通天巨构根基（从大地向上冲破天穹）
      const towerBaseGeo = new THREE.CylinderGeometry(140, 155, 65, 48, 1, true, -Math.PI * 0.4, Math.PI * 0.8);
      const towerStoneTex = PX.tex(PX.stoneCanvas(PX.shade(th.stone, -0.1), 19), 32, 12);
      const towerBaseMat = lam({ map: towerStoneTex, side: THREE.DoubleSide });
      const towerBase = new THREE.Mesh(towerBaseGeo, towerBaseMat);
      towerBase.position.set(120, 22, -115);
      root.add(towerBase);
    } else if (level.id >= 2 && level.id <= 4) {
      // ── 塔内楼层穹顶与巨柱回廊（强化真切的塔内一层纵深感） ──
      const wallH = (level.bounds.y2 - level.bounds.y1) + 12;
      const midY = (level.bounds.y1 + level.bounds.y2) / 2;
      const innerWallGeo = new THREE.PlaneGeometry(level.bounds.x2 - level.bounds.x1 + 50, wallH, 16, 2);
      const innerWallMat = lam({ map: stoneTex(PX.shade(th.wall, -0.22), 8, 4, 17), side: THREE.DoubleSide });
      const innerWall = new THREE.Mesh(innerWallGeo, innerWallMat);
      innerWall.position.set(currentCenterX, midY, -18);
      root.add(innerWall);

      // 支撑上一层的巨型石砌托梁与拱券回廊天花
      const topCeil = box(level.bounds.x2 - level.bounds.x1 + 35, 3.0, 16, lam({ map: stoneTex(PX.shade(th.stone, 0.12), 12, 1, 91) }));
      topCeil.position.set(currentCenterX, level.bounds.y2 + 3, -6);
      root.add(topCeil);

      // 巨型圆拱石柱支撑
      for (let cx = level.bounds.x1 + 10; cx <= level.bounds.x2 - 8; cx += 16) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, wallH, 14), lam({ map: stoneTex(PX.shade(th.stone, -0.06), 1, 6, 73) }));
        pillar.position.set(cx, midY, -9);
        root.add(pillar);
      }
    }

    // ── 实体墙 / 地面（顺应巴别塔圆弧分段并微调深浅与偏转角） ──
    level.walls.forEach((w, i) => {
      const [x1, x2, y1, y2, kind] = w;
      const ww = x2 - x1, hh = y2 - y1;
      const step = 8;
      const segs = Math.max(1, Math.ceil(ww / step));
      for (let s = 0; s < segs; s++) {
        const sx1 = x1 + s * (ww / segs);
        const sx2 = x1 + (s + 1) * (ww / segs);
        const sww = sx2 - sx1;
        const smidX = (sx1 + sx2) / 2;
        const m = box(sww, hh, 4.2, stoneMatFor(sww, hh, 3 + i + s));
        m.position.set(smidX, (y1 + y2) / 2, arcZ(smidX, -0.6));
        m.rotation.y = arcYaw(smidX);
        root.add(m);

        // 顶部压条
        const capCol = kind === 'ground' ? PX.shade(th.stone, 0.18) : PX.shade(th.stone, 0.25);
        const cap = box(sww + 0.06, 0.18, 4.3, lam({ color: capCol }));
        cap.position.set(smidX, y2 - 0.09, arcZ(smidX, -0.6));
        cap.rotation.y = arcYaw(smidX);
        root.add(cap);
      }
      if (level.clouds && kind === 'stone' && y1 > level.bounds.y1 - 1) {
        // 悬空石台底部的倒锥
        const mid = (x1 + x2) / 2;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(ww * 0.42, 3.2, 8), stoneMatFor(4, 4, 9));
        cone.rotation.x = Math.PI; cone.scale.z = 0.35;
        cone.position.set(mid, y1 - 1.6, arcZ(mid, -0.6));
        cone.rotation.y = arcYaw(mid);
        root.add(cone);
      }
    });

    // ── 平台 ──
    level.plats.forEach((p, i) => {
      const [x1, x2, y, kind] = p;
      const ww = x2 - x1;
      const step = 8;
      const segs = Math.max(1, Math.ceil(ww / step));
      if (kind === 'wood') {
        for (let s = 0; s < segs; s++) {
          const sx1 = x1 + s * (ww / segs);
          const sx2 = x1 + (s + 1) * (ww / segs);
          const sww = sx2 - sx1;
          const smidX = (sx1 + sx2) / 2;
          const m = box(sww, 0.42, 2.6, lam({ map: woodTex(th.wood, sww / 2, 1) }));
          m.position.set(smidX, y - 0.21, arcZ(smidX, -0.3));
          m.rotation.y = arcYaw(smidX);
          root.add(m);
        }
        // 托架
        const beamMat = lam({ color: PX.shade(th.wood, -0.35) });
        for (let x = x1 + 0.4; x <= x2 - 0.3; x += Math.max(2.5, ww / Math.ceil(ww / 3.5))) {
          const b = box(0.22, 1.0, 0.22, beamMat); b.position.set(x, y - 0.9, arcZ(x, -1.2)); b.rotation.y = arcYaw(x); root.add(b);
          const d = box(0.16, 1.2, 0.16, beamMat); d.position.set(x + 0.32, y - 0.7, arcZ(x + 0.32, -1.2)); d.rotation.z = 0.7; d.rotation.y = arcYaw(x); root.add(d);
        }
        // 栏杆
        for (let s = 0; s < segs; s++) {
          const sx1 = x1 + s * (ww / segs);
          const sx2 = x1 + (s + 1) * (ww / segs);
          const sww = sx2 - sx1;
          const smidX = (sx1 + sx2) / 2;
          const rail = box(sww, 0.08, 0.08, beamMat); rail.position.set(smidX, y + 0.75, arcZ(smidX, -1.3)); rail.rotation.y = arcYaw(smidX); root.add(rail);
        }
        for (let x = x1 + 0.2; x <= x2; x += 1.2) { const post = box(0.08, 0.75, 0.08, beamMat); post.position.set(x, y + 0.38, arcZ(x, -1.3)); post.rotation.y = arcYaw(x); root.add(post); }
      } else {
        for (let s = 0; s < segs; s++) {
          const sx1 = x1 + s * (ww / segs);
          const sx2 = x1 + (s + 1) * (ww / segs);
          const sww = sx2 - sx1;
          const smidX = (sx1 + sx2) / 2;
          const m = box(sww, 1.0, 3.2, stoneMatFor(sww, 1, 11 + i + s));
          m.position.set(smidX, y - 0.5, arcZ(smidX, -0.4));
          m.rotation.y = arcYaw(smidX);
          root.add(m);
          const cap = box(sww + 0.2, 0.16, 3.3, lam({ color: PX.shade(th.stone, 0.25) }));
          cap.position.set(smidX, y - 0.08, arcZ(smidX, -0.4));
          cap.rotation.y = arcYaw(smidX);
          root.add(cap);
        }
        // 下方拱柱
        const below = floorBelow(level, (x1 + x2) / 2, y);
        const hgt = y - 1 - below;
        if (hgt > 1.2 && hgt < 14) {
          const n = Math.max(1, Math.round(ww / 6));
          for (let k = 0; k <= n; k++) {
            const x = x1 + 0.5 + (ww - 1) * (k / n);
            const fb = floorBelow(level, x, y);
            const hh = y - 1 - fb;
            if (hh < 1 || hh > 14) continue;
            const col = box(0.7, hh, 0.7, lam({ map: stoneTex(PX.shade(th.stone, -0.05), 0.5, hh / 2, 21) }));
            col.position.set(x, fb + hh / 2, arcZ(x, -1.7)); col.rotation.y = arcYaw(x); root.add(col);
            const cap2 = box(1.1, 0.3, 1.0, lam({ color: PX.shade(th.stone, 0.2) })); cap2.position.set(x, y - 1.15, arcZ(x, -1.7)); cap2.rotation.y = arcYaw(x); root.add(cap2);
          }
        }
      }
    });

    // ── 背墙（带拱窗，顺沿圆柱弧度微弧分布） ──
    level.backWalls.forEach((b, i) => {
      const [x1, x2, y1, y2] = b;
      const ww = x2 - x1, hh = y2 - y1;
      const step = 8;
      const segs = Math.max(1, Math.ceil(ww / step));
      for (let s = 0; s < segs; s++) {
        const sx1 = x1 + s * (ww / segs);
        const sx2 = x1 + (s + 1) * (ww / segs);
        const sww = sx2 - sx1;
        const smidX = (sx1 + sx2) / 2;
        const c = PX.archWallCanvas(th.wall, 3 + i + s, th.accent);
        const t = PX.tex(c, sww / 4, hh / 4.5);
        t.offset.y = 1 - ((hh / 4.5) % 1);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(sww, hh), lam({ map: t, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide }));
        m.position.set(smidX, (y1 + y2) / 2, arcZ(smidX, -2.75));
        m.rotation.y = arcYaw(smidX);
        m.receiveShadow = true;
        root.add(m);
      }
    });

    // ── 梯子 ──
    game.ladders.forEach(ld => {
      const g = new THREE.Group();
      const h = ld.y1 - ld.y0;
      const mat = lam({ color: PX.shade(th.wood, ld.trigger ? 0.05 : -0.1) });
      const railL = box(0.12, h + 0.8, 0.12, mat); railL.position.set(-0.36, h / 2 + 0.4, 0);
      const railR = railL.clone(); railR.position.x = 0.36;
      g.add(railL, railR);
      for (let y = 0.35; y < h + 0.6; y += 0.45) { const r = box(0.72, 0.08, 0.1, mat); r.position.set(0, y, 0); g.add(r); }
      g.position.set(ld.x, ld.y0, -0.55);
      if (ld.trigger) { g.scale.y = 0.02; g.position.y = ld.y1; g.userData.rope = true; ld.unroll = 0; g.children.forEach(c => c.position.y -= h + 0.4); }
      root.add(g); ld.mesh = g;
    });

    // ── 机关 ──
    buildMechanisms(game, level, root, anim, th);

    // ── 装饰 ──
    level.decor.forEach(d => buildDecor(d, level, root, anim, th));

    // ── 纵深远景 ──
    buildFar(level, root, anim, th);

    return { root, anim };
  };

  function glyphPlane(text, size, fg, bg) {
    const t = PX.tex(PX.glyphCanvas(text, fg, bg, 64));
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
    return new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  }
  W.glyphPlane = glyphPlane;

  function buildMechanisms(game, level, root, anim, th) {
    // 踏板
    game.plates.forEach(p => {
      const g = new THREE.Group();
      const base = box(p.w + 0.3, 0.12, 1.6, lam({ color: '#5a4a3a' })); base.position.y = 0.04; g.add(base);
      const col = p.lang ? LANG.LANGS[p.lang].color : '#c8a040';
      const top = box(p.w, 0.16, 1.4, lam({ color: col, emissive: new THREE.Color(col), emissiveIntensity: 0.08 }));
      top.position.y = 0.14; g.add(top);
      const label = glyphPlane(p.lang ? p.lang : '⚖' + p.need, 0.9, '#fff6d8', null);
      label.position.set(0, 0.9, 0.7); g.add(label);
      g.position.set(p.x, p.y, 0.0);
      root.add(g); p.mesh = g; p.top = top; p.label = label;
    });
    // 闸门
    game.gates.forEach(gt => {
      const g = new THREE.Group();
      const door = box(0.7, gt.h, 2.6, lam({ map: stoneTex(PX.shade(th.stone, -0.25), 0.5, gt.h / 2, 31) }));
      door.position.y = gt.h / 2; g.add(door);
      for (let y = 0.4; y < gt.h; y += 0.7) { const bar = box(0.78, 0.1, 2.7, lam({ color: '#4a4038' })); bar.position.y = y; g.add(bar); }
      const trig = Array.isArray(gt.trigger) ? gt.trigger : [gt.trigger];
      const lbl = glyphPlane(trig.length > 1 ? '⚖⚖' : '◈', 0.8, '#ffe9a8'); lbl.position.set(0, gt.h * 0.6, 1.36); g.add(lbl);
      g.position.set(gt.x, gt.y, -0.2); root.add(g); gt.mesh = g;
      // 门框
      const fm = lam({ color: PX.shade(th.stone, -0.1) });
      const top = box(1.5, 0.4, 3.0, fm); top.position.set(gt.x, gt.y + gt.h + 0.2, -0.3); root.add(top);
    });
    // 升降台
    game.lifts.forEach(lf => {
      const g = new THREE.Group();
      const w = lf.x2 - lf.x1;
      const plat = box(w, 0.36, 2.0, lam({ map: woodTex(th.wood, w / 2, 1) })); plat.position.y = -0.18; g.add(plat);
      const railMat = lam({ color: PX.shade(th.wood, -0.3) });
      const r1 = box(0.1, 0.9, 0.1, railMat); r1.position.set(-w / 2 + 0.1, 0.45, -0.9); g.add(r1);
      const r2 = r1.clone(); r2.position.x = w / 2 - 0.1; g.add(r2);
      const r3 = box(w, 0.08, 0.08, railMat); r3.position.set(0, 0.9, -0.9); g.add(r3);
      // 升降台吊环拉绳（拉动缆绳即可驱动动力齿轮）
      const pullRope = box(0.04, 1.2, 0.04, lam({ color: '#d4af37' }));
      pullRope.position.set(0, 1.7, -0.2);
      g.add(pullRope);
      const ringGeo = new THREE.TorusGeometry(0.12, 0.035, 8, 16);
      const ringMat = new THREE.MeshStandardMaterial({ color: '#ffd24a', metalness: 0.8, roughness: 0.3 });
      const pullRing = new THREE.Mesh(ringGeo, ringMat);
      pullRing.position.set(0, 1.1, -0.2);
      pullRing.rotation.x = Math.PI / 2;
      g.add(pullRing);
      lf.pullRing = pullRing;
      g.position.set((lf.x1 + lf.x2) / 2, lf.y0, 0);
      root.add(g); lf.mesh = g;
      // 绳索与滑轮
      const topY = lf.y1 + 3.4;
      const ropeMat = lam({ color: '#c8a870' });
      const ropes = [];
      [-w / 2 + 0.2, w / 2 - 0.2].forEach(dx => { const r = box(0.06, 1, 0.06, ropeMat); r.position.set((lf.x1 + lf.x2) / 2 + dx, 0, -0.2); root.add(r); ropes.push({ m: r, dx }); });
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 14), lam({ color: '#7a5030' }));
      wheel.rotation.x = Math.PI / 2; wheel.position.set((lf.x1 + lf.x2) / 2, topY, -0.2); root.add(wheel);
      const spoke = box(1.0, 0.12, 0.34, lam({ color: '#5a3a20' })); wheel.add(spoke); spoke.rotation.x = Math.PI / 2;
      const beam = box(w + 3.2, 0.4, 0.4, lam({ color: PX.shade(th.wood, -0.2) })); beam.position.set((lf.x1 + lf.x2) / 2 - (lf.style === 'crane' ? 1.2 : 0), topY + 0.6, -0.2); root.add(beam);
      if (lf.style === 'crane') {
        const mast = box(0.45, topY + 0.8 - lf.y0, 0.45, lam({ color: PX.shade(th.wood, -0.25) }));
        mast.position.set(lf.x1 - 1.6, (topY + 0.8 + lf.y0) / 2, -1.6); root.add(mast);
        const brace = box(0.25, 3.2, 0.25, lam({ color: PX.shade(th.wood, -0.25) })); brace.position.set(lf.x1 - 0.6, topY - 0.6, -1.0); brace.rotation.z = -0.7; root.add(brace);
      } else {
        // 井架
        [lf.x1 - 0.3, lf.x2 + 0.3].forEach(x => { const post = box(0.3, topY + 0.6, 0.3, lam({ color: PX.shade(th.wood, -0.25) })); post.position.set(x, (topY + 0.6) / 2, -0.6); root.add(post); });
        const roof = box(w + 1.6, 0.3, 1.6, lam({ color: th.accent })); roof.position.set((lf.x1 + lf.x2) / 2, topY + 1.0, -0.4); root.add(roof);
      }
      lf.ropes = ropes; lf.wheel = wheel; lf.topY = topY;
    });
    // 吊桥
    game.bridges.forEach(b => {
      const w = b.x2 - b.x1;
      const geo = new THREE.BoxGeometry(w, 0.32, 2.0); geo.translate(w / 2, -0.16, 0);
      const m = new THREE.Mesh(geo, lam({ map: woodTex(th.wood, w / 2, 1) })); m.castShadow = true; m.receiveShadow = true;
      m.position.set(b.x1, b.y, -0.2); m.scale.x = 0.001; root.add(m); b.mesh = m;
      const post = box(0.3, 1.6, 0.3, lam({ color: '#6b4423' })); post.position.set(b.x1, b.y + 0.8, -1.0); root.add(post);
      const post2 = post.clone(); post2.position.x = b.x2; root.add(post2);
    });
    // 修筑点
    game.builds.forEach(b => {
      const g = new THREE.Group();
      const w = b.x2 - b.x1;
      const ghost = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, 2.0), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.18, depthWrite: false }));
      ghost.position.set(w / 2, -0.15, -0.2); g.add(ghost);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.3, 2.0)), new THREE.LineDashedMaterial({ color: '#ffd24a', dashSize: 0.2, gapSize: 0.15 }));
      edges.computeLineDistances(); edges.position.copy(ghost.position); g.add(edges);
      const sign = glyphPlane('⚒', 0.8, '#fff1c0'); sign.position.set(w / 2, 1.1, 0.4); g.add(sign);
      const nPl = Math.ceil(w / 0.5);
      const planks = [];
      for (let i = 0; i < nPl; i++) {
        const pl = box(0.46, 0.3, 2.0, lam({ map: woodTex(th.wood, 0.3, 1) }));
        pl.position.set(0.25 + i * 0.5, -0.15, -0.2); pl.visible = false; g.add(pl); planks.push(pl);
      }
      g.position.set(b.x1, b.y, 0); root.add(g);
      b.mesh = g; b.ghost = ghost; b.edges = edges; b.sign = sign; b.planks = planks;
    });
    // 石碑
    game.steles.forEach(s => {
      const t = PX.tex(PX.steleCanvas(s.langs, false));
      const m = box(1.1, 1.7, 0.4, [lam({ color: '#8a8070' }), lam({ color: '#8a8070' }), lam({ color: '#9a9080' }), lam({ color: '#6a6050' }), lam({ map: t }), lam({ color: '#8a8070' })]);
      m.position.set(s.x, s.y + 0.85, -0.9); root.add(m); s.mesh = m;
      const base = box(1.5, 0.25, 0.8, lam({ color: '#6a6050' })); base.position.set(s.x, s.y + 0.12, -0.9); root.add(base);
    });
    // 拉杆
    game.levers.forEach(l => {
      const g = new THREE.Group();
      const base = box(0.8, 0.3, 0.6, lam({ color: '#5a4a3a' })); base.position.y = 0.15; g.add(base);
      const stick = new THREE.Group(); const s = box(0.12, 1.1, 0.12, lam({ color: '#8a5a2b' })); s.position.y = 0.55; stick.add(s);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lam({ color: '#c83a2a' })); knob.position.y = 1.1; stick.add(knob);
      stick.position.y = 0.3; stick.rotation.z = 0.6; g.add(stick);
      g.position.set(l.x, l.y, -0.6); root.add(g); l.mesh = g; l.stick = stick;
    });
    // 符文石收集物
    game.runes.forEach(r => {
      const t = PX.tex(PX.itemCanvas('rune'));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
      m.position.set(r.x, r.y + 0.8, 0.2); root.add(m);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: '#ffe68a', transparent: true, opacity: 0.35, depthWrite: false }));
      glow.position.set(r.x, r.y + 0.8, 0.1); root.add(glow);
      r.mesh = m; r.glow = glow;
    });
    // 检查点
    game.checkpoints.forEach(c => {
      const pole = box(0.08, 2.0, 0.08, lam({ color: '#6b4423' })); pole.position.set(c.x, c.y + 1, -0.9); root.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshLambertMaterial({ color: '#9a9a9a', side: THREE.DoubleSide }));
      flag.position.set(c.x + 0.42, c.y + 1.7, -0.9); root.add(flag); c.flag = flag;
    });
    // 出口
    if (game.exit) {
      const e = game.exit, g = new THREE.Group();
      const pm = lam({ color: PX.shade(th.stone, 0.15) });
      const pmDark = lam({ color: PX.shade(th.stone, -0.12) });
      const keystoneMat = lam({ color: PX.shade(th.accent || th.stone, 0.25) });

      // 真正石砖砌筑的拱门立柱 (Pillars)
      const p1 = box(0.65, 3.2, 0.9, pm); p1.position.set(-1.3, 1.6, 0); g.add(p1);
      const p2 = box(0.65, 3.2, 0.9, pm); p2.position.set(1.3, 1.6, 0); g.add(p2);
      // 柱头托梁 (Imposts)
      const imp1 = box(0.85, 0.32, 1.0, pmDark); imp1.position.set(-1.3, 3.2, 0); g.add(imp1);
      const imp2 = box(0.85, 0.32, 1.0, pmDark); imp2.position.set(1.3, 3.2, 0); g.add(imp2);

      // 11 块辐射楔形石砖砌成的拱圈 (Radial Voussoirs)
      const numStones = 11;
      const archR = 1.3;
      for (let i = 0; i < numStones; i++) {
        const theta = (i / (numStones - 1)) * Math.PI;
        const isKeystone = (i === 5);
        const bw = isKeystone ? 0.48 : 0.38;
        const bh = isKeystone ? 0.58 : 0.42;
        const bz = isKeystone ? 1.08 : 0.92;
        const stoneMesh = box(bw, bh, bz, isKeystone ? keystoneMat : (i % 2 === 0 ? pm : pmDark));
        stoneMesh.position.set(Math.cos(Math.PI - theta) * archR, 3.2 + Math.sin(Math.PI - theta) * archR, 0);
        stoneMesh.rotation.z = Math.PI / 2 - theta;
        g.add(stoneMesh);
      }

      const door = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.6), new THREE.MeshBasicMaterial({ color: '#fff2b0', transparent: true, opacity: 0.55, depthWrite: false }));
      door.position.set(0, 1.9, -0.1); g.add(door);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 14, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4c0', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 8; g.add(beam);
      const sign = glyphPlane('↑', 0.9, '#ffffff'); sign.position.set(0, 4.7, 0.2); g.add(sign);
      
      g.position.set(e.x, e.y, arcZ(e.x, -1.4));
      g.rotation.y = arcYaw(e.x);
      root.add(g); e.mesh = g; e.door = door;
    }
  }

  function buildDecor(d, level, root, anim, th) {
    const baseZ = d.z !== undefined ? d.z : -2.3;
    const z = W.arcZ ? W.arcZ(d.x, baseZ) : baseZ;
    const rotY = W.arcYaw ? W.arcYaw(d.x) : 0;
    if (d.t === 'palm') {
      const g = new THREE.Group();
      const tm = lam({ color: '#b07840' });
      for (let i = 0; i < 6; i++) { const s = box(0.4 - i * 0.03, 0.75, 0.4 - i * 0.03, tm); s.position.set(i * i * 0.025, 0.37 + i * 0.72, 0); g.add(s); }
      const lm = lam({ color: '#5aa040' });
      for (let i = 0; i < 6; i++) { const lf = box(2.2, 0.12, 0.6, lm); lf.position.set(0.9, 4.6, 0); const p = new THREE.Group(); p.add(lf); p.position.set(0.9, 0, 0); p.rotation.y = i * Math.PI / 3; p.rotation.z = -0.35; const pp = new THREE.Group(); pp.add(p); pp.position.set(-0.9 + 0.9, 0, 0); g.add(pp); lf.position.set(1.1, 0, 0); p.position.set(0.9, 4.5, 0); }
      g.position.set(d.x, d.y, z); root.add(g);
      anim.push({ update: (dt, t) => { g.rotation.z = Math.sin(t * 0.8 + d.x) * 0.02; } });
    } else if (d.t === 'building') {
      const g = new THREE.Group();
      const ww = d.w || 6.8, hh = d.h || 4.2, dd = d.d || 5.2;
      const wallMat = lam({ map: stoneTex(PX.shade(th.wall, 0.05), ww / 2, hh / 2, 41) });
      const roofMat = lam({ color: th.accent });
      const woodTrimMat = lam({ color: PX.shade(th.wood, -0.2) });

      // 正面外墙（两侧实体墙 + 中央门洞空开）
      const doorW = 1.6, doorH = 2.4;
      const sideW = (ww - doorW) / 2;
      const wallL = box(sideW, hh, 0.45, wallMat); wallL.position.set(-sideW / 2 - doorW / 2, hh / 2, 0); g.add(wallL);
      const wallR = box(sideW, hh, 0.45, wallMat); wallR.position.set(sideW / 2 + doorW / 2, hh / 2, 0); g.add(wallR);
      const wallTop = box(ww, hh - doorH, 0.45, wallMat); wallTop.position.set(0, hh - (hh - doorH) / 2, 0); g.add(wallTop);

      // 门框柱与门额梁
      const p1 = box(0.18, doorH, 0.52, woodTrimMat); p1.position.set(-doorW / 2, doorH / 2, 0); g.add(p1);
      const p2 = box(0.18, doorH, 0.52, woodTrimMat); p2.position.set(doorW / 2, doorH / 2, 0); g.add(p2);
      const lintel = box(doorW + 0.36, 0.22, 0.55, woodTrimMat); lintel.position.set(0, doorH, 0); g.add(lintel);

      // 屋顶覆盖（覆盖前后纵深）
      const roof = box(ww + 0.8, 0.42, dd + 0.8, roofMat);
      roof.position.set(0, hh + 0.21, -dd / 2); g.add(roof);

      // 室内纵深结构（Z = -dd/2 处）
      const floorMat = lam({ map: stoneTex(PX.shade(th.stone, -0.12), 3, 2, 12) });
      const floor = box(ww - 0.4, 0.18, dd - 0.2, floorMat);
      floor.position.set(0, 0.09, -dd / 2); g.add(floor);

      const backWallMat = lam({ map: stoneTex(PX.shade(th.wall, -0.2), 3, 2, 33) });
      const backWall = box(ww - 0.4, hh, 0.35, backWallMat);
      backWall.position.set(0, hh / 2, -dd + 0.2); g.add(backWall);

      // 室内专属陈设
      if (d.interiorType === 'council') {
        // 议事石炉与篝火闪烁
        const hearth = box(1.3, 0.75, 0.9, lam({ color: '#2d1b0c' }));
        hearth.position.set(0, 0.38, -dd + 1.1); g.add(hearth);
        const hearthLight = new THREE.PointLight(0xffa033, 1.4, 9);
        hearthLight.position.set(0, 1.2, -dd + 1.2); g.add(hearthLight);
        anim.push({ update: (dt, t) => { hearthLight.intensity = 1.2 + Math.sin(t * 13) * 0.3; } });
        // 长者石座与陶土泥板台
        const table = box(2.4, 0.7, 0.9, woodTrimMat);
        table.position.set(0, 0.35, -dd * 0.5); g.add(table);
      } else if (d.interiorType === 'granary') {
        // 储粮架
        const shelf = box(ww - 1.6, 2.2, 0.7, woodTrimMat);
        shelf.position.set(0, 1.1, -dd + 1.0); g.add(shelf);
      }

      // 注册门洞供角色进出 Z 轴纵深
      if (level.doorways) {
        level.doorways.push({
          id: d.id || ('door_' + d.x),
          x: d.x,
          y: d.y,
          name: d.name || '村落建筑',
          interiorType: d.interiorType
        });
      }

      g.position.set(d.x, d.y, 0); root.add(g);
    } else if (d.t === 'hut') {
      const g = new THREE.Group();
      const body = box(3.2, 2.4, 2.6, lam({ map: stoneTex(PX.shade(th.wall, 0.05), 1.5, 1.2, 41) })); body.position.y = 1.2; g.add(body);
      const roof = box(3.6, 0.35, 3.0, lam({ color: th.accent })); roof.position.y = 2.55; g.add(roof);
      const door = box(0.8, 1.3, 0.05, lam({ color: '#5a3a20' })); door.position.set(0.5, 0.65, 1.31); g.add(door);
      const win = box(0.6, 0.5, 0.05, lam({ color: '#3a2a20' })); win.position.set(-0.8, 1.5, 1.31); g.add(win);
      g.position.set(d.x, d.y, z); root.add(g);
    } else if (d.t === 'banner') {
      const g = new THREE.Group();
      const pole = box(1.6, 0.1, 0.1, lam({ color: '#6b4423' })); g.add(pole);
      const t = PX.tex(PX.bannerCanvas(th.banner, th.gold ? '#ffffff' : '#f0c050'));
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.6), new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
      const piv = new THREE.Group(); cloth.position.y = -1.3; piv.add(cloth); g.add(piv);
      g.position.set(d.x, d.y, -2.5); root.add(g);
      anim.push({ update: (dt, t) => { piv.rotation.x = Math.sin(t * 1.3 + d.x) * 0.08; piv.rotation.z = Math.sin(t * 0.9 + d.x * 0.3) * 0.03; } });
    } else if (d.t === 'torch') {
      const g = new THREE.Group();
      const post = box(0.16, 0.8, 0.16, lam({ color: '#4a3a2a' })); post.position.y = 1.6; g.add(post);
      const bowl = box(0.4, 0.18, 0.4, lam({ color: '#6a5a40' })); bowl.position.y = 2.05; g.add(bowl);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 6), new THREE.MeshBasicMaterial({ color: '#ffb030' }));
      flame.position.y = 2.4; g.add(flame);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), new THREE.MeshBasicMaterial({ color: '#ffd080', transparent: true, opacity: 0.25, depthWrite: false })); glow.position.set(0, 2.4, -0.1); g.add(glow);
      g.position.set(d.x, d.y, -2.3); root.add(g);
      anim.push({ update: (dt, t) => { const s = 1 + Math.sin(t * 13 + d.x) * 0.15; flame.scale.set(s, 1 + Math.sin(t * 17 + d.x) * 0.2, s); glow.material.opacity = 0.2 + Math.sin(t * 9 + d.x) * 0.06; } });
    } else if (d.t === 'cypress') {
      const g = new THREE.Group();
      const trunk = box(0.25, 0.8, 0.25, lam({ color: '#5a3a20' })); trunk.position.y = 0.4; g.add(trunk);
      const fol = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4.2, 7), lam({ color: '#3d7a3a' })); fol.position.y = 2.7; fol.castShadow = true; g.add(fol);
      g.position.set(d.x, d.y, z); root.add(g);
    } else if (d.t === 'waterwheel') {
      const g = new THREE.Group();
      const wm = lam({ color: '#7a5030' });
      const rim = new THREE.Mesh(new THREE.TorusGeometry(d.r, 0.16, 6, 28), wm); g.add(rim);
      const rim2 = rim.clone(); rim2.position.z = 0.9; g.add(rim2);
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        const sp = box(d.r * 2, 0.14, 0.14, wm); sp.rotation.z = a; sp.position.z = 0.45; if (i < 6) g.add(sp);
        const pad = box(0.9, 0.12, 1.1, lam({ color: '#9a6a3a' })); pad.position.set(Math.cos(a) * d.r, Math.sin(a) * d.r, 0.45); pad.rotation.z = a + Math.PI / 2; g.add(pad);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 10), lam({ color: '#4a3020' })); hub.rotation.x = Math.PI / 2; hub.position.z = 0.45; g.add(hub);
      g.position.set(d.x, d.y, z); root.add(g);
      anim.push({ update: (dt) => { g.rotation.z -= dt * 0.45; } });
    } else if (d.t === 'waterfall') {
      const h = d.y0 - d.y1;
      const t = PX.tex(PX.waterfallCanvas(), 1, h / 4);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.9 }));
      m.position.set(d.x, (d.y0 + d.y1) / 2, z);
      m.rotation.y = rotY;
      root.add(m);

      // 真正石砌高空泄水拱口（避免瀑布凭空断开露馅）
      const spoutBox = box(d.w + 1.2, 1.8, 2.2, lam({ color: PX.shade(th.stone, -0.15) }));
      spoutBox.position.set(d.x, d.y0 - 0.7, z - 0.6);
      spoutBox.rotation.y = rotY;
      root.add(spoutBox);
      const spoutMouth = box(d.w + 0.2, 0.9, 0.4, lam({ color: '#16222e' }));
      spoutMouth.position.set(d.x, d.y0 - 0.7, z + 0.5);
      spoutMouth.rotation.y = rotY;
      root.add(spoutMouth);

      const foam = new THREE.Mesh(new THREE.CircleGeometry(d.w * 0.8, 16), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 }));
      foam.scale.y = 0.35; foam.position.set(d.x, d.y1 + 0.2, z + 0.05); foam.rotation.y = rotY; root.add(foam);
      anim.push({ update: (dt, tt) => { t.offset.y += dt * 1.6; foam.scale.x = 1 + Math.sin(tt * 6 + d.x) * 0.08; } });
    } else if (d.t === 'statue') {
      const g = new THREE.Group();
      const mm = lam({ color: '#f2efe8' });
      const ped = box(1.8, 1.0, 1.4, lam({ map: stoneTex('#d8d2c4', 1, 0.5, 51) })); ped.position.y = 0.5; g.add(ped);
      const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 2.4, 8), mm); robe.position.y = 2.2; robe.castShadow = true; g.add(robe);
      const chest = box(1.0, 0.8, 0.6, mm); chest.position.y = 3.6; g.add(chest);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), mm); head.position.y = 4.3; g.add(head);
      const arm = box(0.22, 1.3, 0.22, mm); arm.position.set(0.6, 4.1, 0.1); arm.rotation.z = -0.5; g.add(arm);
      const scroll = box(0.5, 0.18, 0.18, lam({ color: '#e8dcb0' })); scroll.position.set(0.95, 4.75, 0.1); g.add(scroll);
      const arm2 = box(0.22, 1.0, 0.22, mm); arm2.position.set(-0.55, 3.2, 0.1); arm2.rotation.z = 0.2; g.add(arm2);
      g.position.set(d.x, d.y, z); root.add(g);
    } else if (d.t === 'shelf') {
      const t = PX.tex(PX.shelfCanvas(), d.w / 2.5, d.h / 2.5);
      const m = box(d.w, d.h, 0.7, [lam({ color: '#4a2c16' }), lam({ color: '#4a2c16' }), lam({ color: '#5a3a20' }), lam({ color: '#3a2010' }), lam({ map: t }), lam({ color: '#4a2c16' })]);
      m.position.set(d.x, d.y + d.h / 2, -2.25); root.add(m);
    } else if (d.t === 'armillary') {
      const g = new THREE.Group();
      const gold = lam({ color: '#e0b040', emissive: new THREE.Color('#a07010'), emissiveIntensity: d.big ? 0.5 : 0.15 });
      const thick = d.big ? 0.14 : 0.06;
      const rings = [];
      for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(d.r * (1 - i * 0.12), thick, 6, 40), gold); r.rotation.set(i * 0.9, i * 0.6, 0); g.add(r); rings.push(r); }
      const core = new THREE.Mesh(new THREE.SphereGeometry(d.r * 0.22, 14, 10), lam({ color: d.big ? '#fff2c0' : '#3a6aa0', emissive: new THREE.Color(d.big ? '#ffd060' : '#000000'), emissiveIntensity: 0.6 }));
      g.add(core);
      if (!d.big) { const stand = box(0.15, d.r * 1.3, 0.15, gold); stand.position.y = -d.r * 0.9; g.add(stand); const foot = box(0.9, 0.15, 0.6, gold); foot.position.y = -d.r * 1.55; g.add(foot); }
      g.position.set(d.x, d.y, z); root.add(g);
      const dir = d.reverse ? -1 : 1;
      g.userData.armillary = true; g.userData.speed = 1;
      anim.push({ armillary: g, update: (dt) => { const s = g.userData.speed; rings.forEach((r, i) => { r.rotation.y += dt * 0.3 * (i + 1) * dir * s; r.rotation.x += dt * 0.12 * dir * s; }); } });
    } else if (d.t === 'cornice') {
      const w = d.x2 - d.x1;
      const m = box(w, 0.5, 1.4, lam({ map: stoneTex(PX.shade(th.stone, 0.05), w / 2, 0.3, 61) }));
      m.position.set((d.x1 + d.x2) / 2, d.y + 0.25, -0.9); root.add(m);
      for (let x = d.x1 + 1; x < d.x2; x += 3) { const c = box(0.4, 0.5, 1.0, lam({ color: PX.shade(th.stone, -0.1) })); c.position.set(x, d.y - 0.25, -0.9); root.add(c); }
    } else if (d.t === 'aqueduct') {
      const w = (level.bounds.x2 - level.bounds.x1) + 120;
      const c = PX.archWallCanvas(PX.shade(th.far, 0.05), 77, null);
      const step = 16;
      const segs = Math.ceil(w / step);
      const startX = ((level.bounds.x1 + level.bounds.x2) / 2) - w / 2;
      for (let s = 0; s < segs; s++) {
        const sx = startX + (s + 0.5) * step;
        const t = PX.tex(c, step / 8, 1);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(step, 8), new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide }));
        m.position.set(sx, d.y + 4, arcZ(sx, d.z));
        m.rotation.y = arcYaw(sx);
        root.add(m);
      }
    } else if (d.t === 'relic_can') {
      // 违和感奇迹物：精加工铝合金食品罐头 / 文明冷库遗物
      const g = new THREE.Group();
      const canMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.2, metalness: 0.85 });
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.75, 16), canMat);
      can.position.y = 0.38;
      const stripeMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.12, 16), stripeMat);
      stripe.position.y = 0.38;
      g.add(can); g.add(stripe);
      const glowMat = new THREE.MeshBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0.4 });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), glowMat);
      glow.position.y = 0.4;
      g.add(glow);
      g.position.set(d.x, d.y, 0.2); root.add(g);
      anim.push({ update: (dt, t) => { glow.scale.setScalar(1 + Math.sin(t * 3) * 0.12); glowMat.opacity = 0.3 + Math.sin(t * 3) * 0.15; } });
    } else if (d.t === 'relic_radio') {
      // 违和感奇迹物：发光的真空铜管 / 未来千里传音装置
      const g = new THREE.Group();
      const baseMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.4, metalness: 0.6 });
      const baseMesh = box(0.9, 0.3, 0.6, baseMat); baseMesh.position.y = 0.15; g.add(baseMesh);
      const glassMat = new THREE.MeshStandardMaterial({ color: '#67e8f9', roughness: 0.1, transparent: true, opacity: 0.7 });
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 12), glassMat);
      tube.position.y = 0.75; g.add(tube);
      const wireMat = new THREE.MeshBasicMaterial({ color: '#fbbf24' });
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), wireMat);
      wire.position.y = 0.75; g.add(wire);
      g.position.set(d.x, d.y, 0.2); root.add(g);
      anim.push({ update: (dt, t) => { wireMat.color.setHSL(0.12 + Math.sin(t * 4) * 0.03, 1, 0.55 + Math.sin(t * 5) * 0.2); } });
    }
  }

  function buildFar(level, root, anim, th) {
    const cx = (level.bounds.x1 + level.bounds.x2) / 2;
    // 远处巴别塔
    const tower = new THREE.Group();
    const farMat = (rx) => new THREE.MeshLambertMaterial({ map: PX.tex(PX.towerFarCanvas(th.far), rx, 1) });
    let y = -20, r = 38;
    for (let i = 0; i < 11; i++) {
      const h = 14 - i * 0.6;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r, h, 24, 1, true), farMat(Math.round(r / 3)));
      m.position.y = y + h / 2; tower.add(m);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.6, r + 0.6, 1.0, 24), new THREE.MeshLambertMaterial({ color: PX.shade(th.far, 0.2) }));
      ring.position.y = y + h; tower.add(ring);
      y += h; r *= 0.84;
    }
    const crown = new THREE.Mesh(new THREE.ConeGeometry(r * 1.2, 10, 12), new THREE.MeshLambertMaterial({ color: PX.shade(th.far, 0.3) }));
    crown.position.y = y + 5; tower.add(crown);
    tower.position.set(cx + 20, level.bounds.y1 - 10, -150);
    root.add(tower);

    // 中景建筑群
    const rr = PX.rng(level.id * 31 + 5);
    for (let i = 0; i < 26; i++) {
      const w = 4 + rr() * 9, h = 4 + rr() * 16, d = 4 + rr() * 6;
      const x = level.bounds.x1 - 40 + rr() * (level.bounds.x2 - level.bounds.x1 + 80);
      const z = -24 - rr() * 40;
      const baseY = level.clouds ? level.bounds.y1 + 2 + rr() * 6 : level.bounds.y1 - 2;
      const col = PX.shade(th.far, (rr() - 0.5) * 0.2);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ map: PX.tex(PX.towerFarCanvas(col), Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(h / 5))) }));
      m.position.set(x, baseY + h / 2, z); root.add(m);
      if (rr() < 0.5) { const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6), new THREE.MeshLambertMaterial({ color: th.accent })); roof.position.set(x, baseY + h + 0.3, z); root.add(roof); }
      if (rr() < 0.35) { const tr = new THREE.Mesh(new THREE.ConeGeometry(1.2, 5, 6), new THREE.MeshLambertMaterial({ color: '#4a8a44' })); tr.position.set(x + w / 2 + 1, baseY + h + 2.5, z); root.add(tr); }
    }

    // 地面/海面/云海
    if (level.clouds) {
      for (let i = 0; i < 40; i++) {
        const t = PX.tex(PX.cloudCanvas(i + 3)); t.magFilter = THREE.LinearFilter;
        const s = 10 + rr() * 18;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.95, fog: true }));
        m.position.set(level.bounds.x1 - 30 + rr() * (level.bounds.x2 - level.bounds.x1 + 60), level.bounds.y1 - 2 + rr() * 5, -4 - rr() * 60);
        root.add(m);
        const sp = 0.3 + rr() * 0.5;
        anim.push({ update: (dt) => { m.position.x += dt * sp; if (m.position.x > level.bounds.x2 + 40) m.position.x = level.bounds.x1 - 40; } });
      }
    } else {
      const gcol = level.id === 2 ? '#7fc4dc' : PX.shade(th.stone, -0.1);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(800, 300), new THREE.MeshLambertMaterial({ color: gcol }));
      g.rotation.x = -Math.PI / 2; g.position.set(cx, level.bounds.y1 - 2, -150); root.add(g);
    }
    // 天空的云
    for (let i = 0; i < 14; i++) {
      const t = PX.tex(PX.cloudCanvas(i + 40)); t.magFilter = THREE.LinearFilter;
      const s = 14 + rr() * 20;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.85 }));
      m.position.set(level.bounds.x1 - 40 + rr() * (level.bounds.x2 - level.bounds.x1 + 80), level.bounds.y2 + rr() * 30, -70 - rr() * 60);
      root.add(m);
      const sp = 0.4 + rr() * 0.6;
      anim.push({ update: (dt) => { m.position.x += dt * sp; if (m.position.x > level.bounds.x2 + 60) m.position.x = level.bounds.x1 - 60; } });
    }
  }

  window.WORLD = W;
})();
