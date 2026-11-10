// 3D 世界构建：前景可行走平台（Z≈0）+ 背墙拱窗 + 纵深巴别塔与装饰 + 机关网格
(function () {
  const W = {};
  const texCache = {};
  function stoneTex(color, rx, ry, seed = 7) {
    const k = 's' + color + seed;
    if (!texCache[k]) texCache[k] = PX.ashlarStoneCanvas(color, seed);
    return PX.worldTex ? PX.worldTex(texCache[k], rx, ry) : PX.tex(texCache[k], rx, ry);
  }
  function ashlarTex(color, rx, ry, seed = 7) {
    return stoneTex(color, rx, ry, seed);
  }
  function adobeTex(color, rx, ry, seed = 11) {
    const k = 'adobe_' + color + seed;
    if (!texCache[k]) texCache[k] = PX.adobeBrickCanvas(color, seed);
    return PX.worldTex ? PX.worldTex(texCache[k], rx, ry) : PX.tex(texCache[k], rx, ry);
  }
  function cedarTex(color, rx, ry, seed = 15) {
    const k = 'cedar_' + color + seed;
    if (!texCache[k]) texCache[k] = PX.ancientCedarCanvas(color, seed);
    return PX.worldTex ? PX.worldTex(texCache[k], rx, ry) : PX.tex(texCache[k], rx, ry);
  }
  function woodTex(color, rx, ry) {
    return cedarTex(color || '#5c381e', rx, ry);
  }
  function basaltTex(seed = 42) {
    const k = 'basalt_' + seed;
    if (!texCache[k]) texCache[k] = PX.basaltStatueCanvas(seed);
    return PX.worldTex ? PX.worldTex(texCache[k], 1, 1) : PX.tex(texCache[k], 1, 1);
  }
  function cobbleTex(color, rx, ry, seed = 33) {
    const k = 'cobble_' + color + seed;
    if (!texCache[k]) texCache[k] = PX.cobblePathCanvas(color, seed);
    return PX.worldTex ? PX.worldTex(texCache[k], rx, ry) : PX.tex(texCache[k], rx, ry);
  }
  function textileTex(c1, c2, c3, rx = 1, ry = 1) {
    const k = 'tex_' + c1 + c2 + c3;
    if (!texCache[k]) texCache[k] = PX.stripedTextileCanvas(c1, c2, c3);
    return PX.worldTex ? PX.worldTex(texCache[k], rx, ry) : PX.tex(texCache[k], rx, ry);
  }
  function waterTex(rx = 1, ry = 1) {
    const k = 'water';
    if (!texCache[k]) texCache[k] = PX.waterCanvas();
    return PX.worldTex ? PX.worldTex(texCache[k], rx, ry) : PX.tex(texCache[k], rx, ry);
  }
  function sandTex(color, rx, ry, seed = 13) {
    const k = 'sand_' + color + seed;
    if (!texCache[k]) texCache[k] = PX.sandCanvas(color, seed);
    return PX.worldTex ? PX.worldTex(texCache[k], rx, ry) : PX.tex(texCache[k], rx, ry);
  }
  W.stoneTex = stoneTex; W.ashlarTex = ashlarTex; W.adobeTex = adobeTex; W.cedarTex = cedarTex;
  W.woodTex = woodTex; W.basaltTex = basaltTex; W.cobbleTex = cobbleTex; W.textileTex = textileTex;
  W.waterTex = waterTex; W.sandTex = sandTex;

  function lam(opts = {}) {
    return new THREE.MeshLambertMaterial({
      transparent: true,
      opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
      ...opts
    });
  }
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
    if (window.OPEN_WORLD && (OPEN_WORLD.preparing || OPEN_WORLD.active)) return z0;
    const dx = x - currentCenterX;
    return z0 - (dx * dx) / (2 * TOWER_RADIUS);
  }
  function arcYaw(x) {
    if (window.OPEN_WORLD && (OPEN_WORLD.preparing || OPEN_WORLD.active)) return 0;
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
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 120;
    sun.shadow.bias = -0.0001;
    sun.shadow.normalBias = 0.02;
    root.add(sun); root.add(sun.target);
    game.sunLight = sun;
    game.doorways = [];

    const stoneMatFor = (w, h, seed) => lam({ map: stoneTex(th.stone, Math.max(1, w / 2), Math.max(1, h / 2), seed) });
    const sandMatFor = (w, h, seed) => lam({ map: sandTex(th.stone, Math.max(1, w / 2), Math.max(1, h / 2), seed) });

    // ── 序章·古代美索不达米亚沙漠绿洲大地（村落主要建在沙地上，层次分明） ──
    if (level.id === 1) {
      // 1. 无垠古苏美尔沙漠大地地基（真实挖开深井地表垂直孔洞，杜绝沙地封死井口）
      const sandMat = lam({ map: sandTex(th.stone, 24, 16, 55) });
      const wellHoleRadius = 2.1;
      const wellCenterX = 31.5;

      // 左段沙漠大地 (x: -140 ~ wellCenterX - 2.1)
      const desertW1 = (wellCenterX - wellHoleRadius) - (-140);
      const desertL = new THREE.Mesh(new THREE.PlaneGeometry(desertW1, 160, 16, 12), sandMat);
      desertL.rotation.x = -Math.PI / 2;
      desertL.position.set((-140 + wellCenterX - wellHoleRadius) / 2, -0.02, -35);
      desertL.receiveShadow = true;
      desertL.userData.isGround = true;
      root.add(desertL);

      // 右段沙漠大地 (x: wellCenterX + 2.1 ~ 220)
      const desertW2 = 220 - (wellCenterX + wellHoleRadius);
      const desertR = new THREE.Mesh(new THREE.PlaneGeometry(desertW2, 160, 16, 12), sandMat);
      desertR.rotation.x = -Math.PI / 2;
      desertR.position.set((wellCenterX + wellHoleRadius + 220) / 2, -0.02, -35);
      desertR.receiveShadow = true;
      desertR.userData.isGround = true;
      root.add(desertR);

      // 井后方沙漠大地 (x: 29.4 ~ 33.6, z: -115 ~ -2.1)
      const desertBack = new THREE.Mesh(new THREE.PlaneGeometry(wellHoleRadius * 2, 115 - wellHoleRadius), sandMat);
      desertBack.rotation.x = -Math.PI / 2;
      desertBack.position.set(wellCenterX, -0.02, (-115 - wellHoleRadius) / 2);
      desertBack.receiveShadow = true;
      desertBack.userData.isGround = true;
      root.add(desertBack);

      // 井前方沙漠大地 (x: 29.4 ~ 33.6, z: +2.1 ~ +45)
      const desertFront = new THREE.Mesh(new THREE.PlaneGeometry(wellHoleRadius * 2, 45 - wellHoleRadius), sandMat);
      desertFront.rotation.x = -Math.PI / 2;
      desertFront.position.set(wellCenterX, -0.02, (45 + wellHoleRadius) / 2);
      desertFront.receiveShadow = true;
      desertFront.userData.isGround = true;
      root.add(desertFront);

      // 八方旅人风格：主干鹅卵石与夯土大道（贯通村落中心大街，带纵深踏磨圆润鹅卵石质感）
      const streetMat = lam({ map: cobbleTex('#c4b094', 14, 2, 73) });
      const street = new THREE.Mesh(new THREE.PlaneGeometry(28, 4.4), streetMat);
      street.rotation.x = -Math.PI / 2;
      street.position.set(16, 0.01, -0.4);
      street.receiveShadow = true;
      street.userData.isWalkway = true;
      root.add(street);

      // 绿洲到村落的漫漫荒漠古朝圣干道 (Ancient Pilgrim Trail across Dunes, x: -58 .. 2)
      const trailMat = lam({ map: cobbleTex('#beaa8e', 24, 2, 41) });
      const trail = new THREE.Mesh(new THREE.PlaneGeometry(62, 4.2), trailMat);
      trail.rotation.x = -Math.PI / 2;
      trail.position.set(-28, 0.008, -0.4);
      trail.receiveShadow = true;
      trail.userData.isWalkway = true;
      root.add(trail);

      // 纵向巷道 1：工坊与议事厅之间的大道向背景延伸 (x ≈ 11.6, z: 0 ~ -4.8)
      const alley1Mat = lam({ map: cobbleTex('#b8a284', 1, 3, 29) });
      const alley1 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 5.2), alley1Mat);
      alley1.rotation.x = -Math.PI / 2;
      alley1.position.set(11.6, 0.015, -2.6);
      alley1.receiveShadow = true;
      alley1.userData.isWalkway = true;
      root.add(alley1);

      // 纵向巷道 2：议事厅与粮仓之间的大道向背景延伸 (x ≈ 20.4, z: 0 ~ -4.8)
      const alley2 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 5.2), alley1Mat);
      alley2.rotation.x = -Math.PI / 2;
      alley2.position.set(20.4, 0.015, -2.6);
      alley2.receiveShadow = true;
      alley2.userData.isWalkway = true;
      root.add(alley2);

      // 前景柔和沙丘流线与远景沙丘（仅在非连续大地图模式下启用，避免与主街和城区地面穿模）
      if (!(window.OPEN_WORLD && OPEN_WORLD.preparing)) {
        const fgDuneMat = lam({ color: PX.shade(th.stone, 0.06) });
        const fgDunes = new THREE.Mesh(new THREE.PlaneGeometry(280, 18, 20, 1), fgDuneMat);
        fgDunes.rotation.x = -Math.PI / 2 + 0.12;
        fgDunes.position.set(currentCenterX, -0.65, 5.5);
        root.add(fgDunes);

        const duneGeo = new THREE.PlaneGeometry(340, 36, 32, 1);
        const duneMat = lam({ color: PX.shade(th.stone, -0.08) });
        const dunes = new THREE.Mesh(duneGeo, duneMat);
        dunes.position.set(35, 6.0, -95);
        root.add(dunes);
      }

      // 3. 遥远地平线天际：巴别巨塔的宏伟通天剪影（立于 z = -185 远景，破开天际云层，绝不遮挡村庄视线）
      const towerGroup = new THREE.Group();
      towerGroup.position.set(88, -2, -185);
      if (window.OPEN_WORLD && OPEN_WORLD.preparing) towerGroup.visible = false;

      const farStoneMat = lam({ color: PX.shade(th.stone, -0.15) });
      const farAccentMat = lam({ color: PX.shade(th.accent, -0.1) });
      const farGoldMat = new THREE.MeshBasicMaterial({ color: '#f6b93b' });

      // 多阶层梯级巨塔底座与塔身
      const tiers = [
        { r1: 52, r2: 60, h: 28, y: 14 },
        { r1: 42, r2: 48, h: 26, y: 41 },
        { r1: 32, r2: 38, h: 24, y: 66 },
        { r1: 22, r2: 28, h: 22, y: 89 },
        { r1: 14, r2: 19, h: 26, y: 113 },
        { r1: 6, r2: 11, h: 22, y: 137 }
      ];

      tiers.forEach((tr, tIdx) => {
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(tr.r1, tr.r2, tr.h, 32), farStoneMat);
        cyl.position.y = tr.y;
        cyl.userData.isTowerShell = true;
        towerGroup.add(cyl);

        // 环形外凸挑檐
        const rim = new THREE.Mesh(new THREE.TorusGeometry(tr.r2 + 0.8, 1.2, 8, 32), farAccentMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = tr.y - tr.h / 2;
        rim.userData.isTowerShell = true;
        towerGroup.add(rim);

        // 盘旋向上的巨型外回廊步道剪影
        const ramp = new THREE.Mesh(new THREE.TorusGeometry((tr.r1 + tr.r2) / 2 + 1.8, 1.4, 8, 32, Math.PI * 1.4), farAccentMat);
        ramp.rotation.x = Math.PI / 2 + 0.12;
        ramp.rotation.z = tIdx * 1.1;
        ramp.position.y = tr.y;
        ramp.userData.isTowerShell = true;
        towerGroup.add(ramp);
      });

      // 塔尖神庙与金色光冕 (160m 穹顶之光)
      const summit = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 5.0, 10, 16), farAccentMat);
      summit.position.y = 153;
      summit.userData.isTowerShell = true;
      towerGroup.add(summit);

      const halo = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.45, 12, 32), farGoldMat);
      halo.position.y = 158;
      towerGroup.add(halo);

      root.add(towerGroup);
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
      topCeil.userData.isTowerShell = true;
      topCeil.userData.isRoof = true;
      topCeil.userData.isFrontOccluder = true;
      root.add(topCeil);

      // 巨型圆拱石柱支撑
      for (let cx = level.bounds.x1 + 10; cx <= level.bounds.x2 - 8; cx += 16) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, wallH, 14), lam({ map: stoneTex(PX.shade(th.stone, -0.06), 1, 6, 73) }));
        pillar.position.set(cx, midY, -9);
        pillar.userData.isFrontOccluder = true;
        root.add(pillar);
      }
    }

    // ── 实体墙 / 地面（顺应巴别塔圆弧分段并微调深浅与偏转角） ──
    level.walls.forEach((w, i) => {
      const [x1, x2, y1, y2, kind] = w;
      const ww = x2 - x1, hh = y2 - y1;
      if (window.OPEN_WORLD && OPEN_WORLD.preparing && y1 === 0 && (y2 === 10.5 || y2 === 12.0) && ((x1 === 44 && x2 === 76) || (x1 === 56 && x2 === 86))) return;
      const step = 8;
      const segs = Math.max(1, Math.ceil(ww / step));
      for (let s = 0; s < segs; s++) {
        const sx1 = x1 + s * (ww / segs);
        const sx2 = x1 + (s + 1) * (ww / segs);
        const sww = sx2 - sx1;
        const smidX = (sx1 + sx2) / 2;

        if (kind === 'ground') {
          // 沙地夯土大地：单层无缝沙地质感，顶部无重复压条，彻底根除 Z-Fighting 共面闪烁
          const m = box(sww, hh, 4.2, sandMatFor(sww, hh, 3 + i + s));
          m.position.set(smidX, (y1 + y2) / 2, arcZ(smidX, -0.6));
          m.rotation.y = arcYaw(smidX);
          m.userData.isFloor = true;
          m.userData.isGround = true;
          root.add(m);
        } else {
          // 石砌墙体：墙体主体与顶部压条在垂直高度上严格相接分离，绝不共面，根除闪烁
          const capH = 0.16;
          const bodyH = Math.max(0.1, hh - capH);
          const m = box(sww, bodyH, 4.2, stoneMatFor(sww, bodyH, 3 + i + s));
          m.position.set(smidX, y1 + bodyH / 2, arcZ(smidX, -0.6));
          m.rotation.y = arcYaw(smidX);
          m.userData.isFloor = true;
          m.userData.isGround = true;
          root.add(m);

          const cap = box(sww + 0.04, capH, 4.28, lam({ color: PX.shade(th.stone, 0.25) }));
          cap.position.set(smidX, y2 - capH / 2, arcZ(smidX, -0.6));
          cap.rotation.y = arcYaw(smidX);
          cap.userData.isFloor = true;
          cap.userData.isGround = true;
          root.add(cap);
        }
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

    // ── 平台（带爬梯垂直贯通开孔，彻底消除对爬梯通道的实体遮挡与卡落货物） ──
    level.plats.forEach((p, i) => {
      const [x1, x2, y, kind] = p;
      // 1. 西侧梯田台地 [-18, -4.5, 1.8, 'earth'] 已由 retaining_wall 装饰完整建模，避免重复盒体 Z-Fighting
      if (kind === 'earth' && Math.abs(y - 1.8) < 0.15) return;
      // 2. 村落三栋泥砖屋的屋顶平台 (y=4.62, stone) 与三层瞭望塔 (y=8.2, wood) 已由 building / watchtower_deck 建模，跳过重复石板与室内穿模立柱
      if (Math.abs(y - 4.62) < 0.12 && kind === 'stone' && x1 >= 5.0 && x2 <= 28.0) return;
      if (Math.abs(y - 8.2) < 0.15 && kind === 'wood' && x1 >= 14.0 && x2 <= 18.0) return;
      // 3. 阶梯踏步辅助支持面（已由 terrace_steps 阶梯模型渲染），跳过重复悬空厚石块避免与台阶穿模
      if (kind === 'stone' && y <= 3.1 && (x2 - x1) <= 2.6 && (x1 < 6.0 || (x1 >= 33.0 && x2 <= 35.8))) return;

      // 检查垂直穿过本平台的爬梯
      const holes = (game.ladders || []).filter(ld =>
        ld.x >= x1 + 0.25 && ld.x <= x2 - 0.25 && Math.abs(ld.y1 - y) < 0.45
      );

      // ── 巴别塔同心圆巨构楼板 (circleData)：渲染为真正 3D 圆柱楼板与同心圆压顶镶条 ──
      if (p[6] && p[6].isCircle) {
        const cData = p[6];
        const r = cData.r, cx = cData.cx, cz = cData.cz;
        const capH = 0.16;
        const bodyH = 0.84;
        const stoneMat = stoneMatFor(r * 2, bodyH, 11 + i);
        const capMat = lam({ color: PX.shade(th.stone, 0.25) });

        // 1. 主体圆柱石砌楼板
        const cylGeo = new THREE.CylinderGeometry(r, r, bodyH, 64);
        const cyl = new THREE.Mesh(cylGeo, stoneMat);
        cyl.position.set(cx, y - capH - bodyH / 2, cz);
        cyl.receiveShadow = true;
        cyl.userData.isFloor = true;
        cyl.userData.isGround = true;
        cyl.userData.isPlatform = true;
        cyl.userData.platY = y;
        cyl.userData.circleData = cData;
        root.add(cyl);

        // 2. 顶面石砌压顶圆盘（边缘略突出 0.15m）
        const capGeo = new THREE.CylinderGeometry(r + 0.15, r + 0.15, capH, 64);
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(cx, y - capH / 2, cz);
        cap.receiveShadow = true;
        cap.userData.isFloor = true;
        cap.userData.isGround = true;
        cap.userData.isPlatform = true;
        cap.userData.platY = y;
        cap.userData.circleData = cData;
        root.add(cap);

        // 3. 顶面同心圆装饰嵌条（青金石外圈、绿松石走廊中圈、黄金内圈）
        const rimRing = new THREE.Mesh(new THREE.RingGeometry(Math.max(0.1, r - 0.45), r + 0.05, 64), lam({ color: 0x224466 }));
        rimRing.rotation.x = -Math.PI / 2;
        rimRing.position.set(cx, y + 0.015, cz);
        rimRing.receiveShadow = true;
        root.add(rimRing);

        if (r > 10.0) {
          const midRing = new THREE.Mesh(new THREE.RingGeometry(r * 0.58, r * 0.62, 64), lam({ color: 0x367c76 }));
          midRing.rotation.x = -Math.PI / 2;
          midRing.position.set(cx, y + 0.015, cz);
          root.add(midRing);

          const innerRing = new THREE.Mesh(new THREE.RingGeometry(r * 0.25, r * 0.28, 48), lam({ color: 0xb89230 }));
          innerRing.rotation.x = -Math.PI / 2;
          innerRing.position.set(cx, y + 0.015, cz);
          root.add(innerRing);
        }

        // 4. 爬梯穿透孔洞安全框边与下沉梯井
        holes.forEach(h => {
          const frameMat = lam({ color: PX.shade(th.stone, -0.35) });
          const hatchFrame = box(1.6, 0.24, 1.6, frameMat);
          hatchFrame.position.set(h.x, y + 0.06, -0.55);
          root.add(hatchFrame);

          // 梯洞内嵌暗色深渊井口面
          const darkWell = box(1.3, 0.02, 1.3, lam({ color: 0x111111 }));
          darkWell.position.set(h.x, y + 0.01, -0.55);
          root.add(darkWell);
        });

        return;
      }

      // 计算除去梯洞后的实心平台段
      let spans = [];
      if (!holes.length) {
        spans.push([x1, x2]);
      } else {
        const sortedHoles = holes.slice().sort((a, b) => a.x - b.x);
        let curX = x1;
        sortedHoles.forEach(h => {
          const hx1 = Math.max(curX, h.x - 0.78);
          const hx2 = Math.min(x2, h.x + 0.78);
          if (hx1 > curX + 0.1) spans.push([curX, hx1]);
          curX = hx2;

          // 在梯洞四周增加安全护框边梁
          const hatchFrameMat = lam({ color: PX.shade(kind === 'wood' ? th.wood : th.stone, -0.3) });
          const frameL = box(0.14, 0.42, 2.6, hatchFrameMat);
          frameL.position.set(hx1, y - 0.21, arcZ(hx1, -0.3));
          frameL.rotation.y = arcYaw(hx1);
          root.add(frameL);
          const frameR = box(0.14, 0.42, 2.6, hatchFrameMat);
          frameR.position.set(hx2, y - 0.21, arcZ(hx2, -0.3));
          frameR.rotation.y = arcYaw(hx2);
          root.add(frameR);
        });
        if (curX < x2 - 0.1) spans.push([curX, x2]);
      }

      const beamMat = lam({ color: PX.shade(th.wood, -0.35) });
      // 采石场台地 (y=2.4) 直接落地成实心石砌台座，不悬空
      const isSolidTerrace = (kind === 'stone' && Math.abs(y - 2.4) < 0.15 && x1 >= 33.0 && x2 <= 42.0);

      spans.forEach(([sx1, sx2]) => {
        const sww = sx2 - sx1;
        const step = 8;
        const segs = Math.max(1, Math.ceil(sww / step));

        const platDepthWood = (p[5] !== undefined && p[4] !== undefined) ? (p[5] - p[4]) : 2.6;
        const platMidZWood = (p[5] !== undefined && p[4] !== undefined) ? ((p[4] + p[5]) / 2) : arcZ(segMid, -0.3);
        const southRailZWood = (p[5] !== undefined) ? (p[5] - 0.25) : arcZ(segMid, -1.3);

        if (kind === 'wood') {
          for (let s = 0; s < segs; s++) {
            const segX1 = sx1 + s * (sww / segs);
            const segX2 = sx1 + (s + 1) * (sww / segs);
            const segW = segX2 - segX1;
            const segMid = (segX1 + segX2) / 2;
            const m = box(segW, 0.42, platDepthWood, lam({ map: woodTex(th.wood, segW / 2, 1) }));
            m.position.set(segMid, y - 0.21, platMidZWood);
            m.rotation.y = arcYaw(segMid);
            m.userData.isFloor = true;
            m.userData.isGround = true;
            m.userData.isPlatform = true;
            m.userData.platY = y;
            root.add(m);
          }
          // 栏杆（避开梯洞，仅在平台南侧最外缘生成）
          for (let s = 0; s < segs; s++) {
            const segX1 = sx1 + s * (sww / segs);
            const segX2 = sx1 + (s + 1) * (sww / segs);
            const segW = segX2 - segX1;
            const segMid = (segX1 + segX2) / 2;
            const rail = box(segW, 0.08, 0.08, beamMat);
            rail.position.set(segMid, y + 0.75, southRailZWood);
            rail.rotation.y = arcYaw(segMid);
            root.add(rail);
          }
          for (let x = sx1 + 0.2; x <= sx2; x += 1.2) {
            const post = box(0.08, 0.75, 0.08, beamMat);
            post.position.set(x, y + 0.38, southRailZWood);
            post.rotation.y = arcYaw(x);
            root.add(post);
          }
        } else {
          // 石砌平台：主体与压条严格分高，支持全 3D 纵深大厦楼板
          const capH = 0.16;
          const totalSlabH = isSolidTerrace ? y : 1.0;
          const bodyH = Math.max(0.1, totalSlabH - capH);
          const platStoneD = (p[5] !== undefined && p[4] !== undefined) ? (p[5] - p[4]) : 3.2;
          const platStoneZ = (p[5] !== undefined && p[4] !== undefined) ? ((p[4] + p[5]) / 2) : arcZ(segMid, -0.4);

          for (let s = 0; s < segs; s++) {
            const segX1 = sx1 + s * (sww / segs);
            const segX2 = sx1 + (s + 1) * (sww / segs);
            const segW = segX2 - segX1;
            const segMid = (segX1 + segX2) / 2;
            const m = box(segW, bodyH, platStoneD, stoneMatFor(segW, bodyH, 11 + i + s));
            m.position.set(segMid, y - capH - bodyH / 2, platStoneZ);
            m.rotation.y = arcYaw(segMid);
            m.userData.isFloor = true;
            m.userData.isGround = true;
            m.userData.isPlatform = true;
            m.userData.platY = y;
            root.add(m);

            const cap = box(segW + 0.04, capH, platStoneD + 0.08, lam({ color: PX.shade(th.stone, 0.25) }));
            cap.position.set(segMid, y - capH / 2, platStoneZ);
            cap.rotation.y = arcYaw(segMid);
            cap.userData.isFloor = true;
            cap.userData.isGround = true;
            cap.userData.isPlatform = true;
            cap.userData.platY = y;
            root.add(cap);
          }
        }
      });

      // 托架与下方立柱（沿整个平台分布）
      const ww = x2 - x1;
      const isTowerPlat = (y >= 10.0 || (x1 >= 43.0 && y >= 5.0));

      if (isTowerPlat) {
        // 巴别巨构塔身支撑结构：彻底摒弃脚手架式临时木撑与通天细石柱，
        // 改为沉重雄伟的巨石牛腿叠涩托座 (Corbels) 与外侧城堞胸墙 (Parapets)，
        // 牢固嵌合入巴别塔巨型砌体内部！
        const corbelMat = lam({ map: stoneTex(PX.shade(th.stone, -0.15), 0.6, 1.2, 43) });
        const corbelStep = Math.max(3.2, ww / Math.max(1, Math.round(ww / 3.8)));
        for (let x = x1 + 0.8; x <= x2 - 0.7; x += corbelStep) {
          if (holes.some(h => Math.abs(h.x - x) < 0.9)) continue;
          // 悬挑三层逐级收缩的叠涩石梁托架 (Stepped Corbel Bracket)
          const cb1 = box(0.65, 0.45, 2.4, corbelMat);
          cb1.position.set(x, y - 0.35, arcZ(x, -0.6));
          cb1.rotation.y = arcYaw(x); root.add(cb1);

          const cb2 = box(0.55, 0.55, 1.9, corbelMat);
          cb2.position.set(x, y - 0.85, arcZ(x, -0.9));
          cb2.rotation.y = arcYaw(x); root.add(cb2);

          const cb3 = box(0.45, 0.65, 1.4, corbelMat);
          cb3.position.set(x, y - 1.45, arcZ(x, -1.2));
          cb3.rotation.y = arcYaw(x); root.add(cb3);
        }

        // 云之回廊及高空外露平台（y >= 32.0 且为石砌）：增加外缘石砌城堞胸墙 (Crenellated Parapet)
        if (kind === 'stone' && y >= 32.0) {
          const parapetMat = lam({ color: PX.shade(th.stone, 0.1) });
          spans.forEach(([sx1, sx2]) => {
            const sw = sx2 - sx1;
            if (sw < 1.5) return;
            const midP = (sx1 + sx2) / 2;
            // 沿外侧 z = +0.95 铺设厚重防风城垛矮墙，保护人物不产生视觉坠落感
            const pBase = box(sw, 0.55, 0.28, parapetMat);
            pBase.position.set(midP, y + 0.275, arcZ(midP, 0.95));
            pBase.rotation.y = arcYaw(midP); root.add(pBase);

            // 规律排列城齿垛口
            for (let cx = sx1 + 0.35; cx <= sx2 - 0.3; cx += 1.4) {
              const cren = box(0.7, 0.35, 0.32, parapetMat);
              cren.position.set(cx, y + 0.725, arcZ(cx, 0.95));
              cren.rotation.y = arcYaw(cx); root.add(cren);
            }
          });
        }
      } else if (kind === 'wood') {
        for (let x = x1 + 0.4; x <= x2 - 0.3; x += Math.max(2.5, ww / Math.ceil(ww / 3.5))) {
          if (holes.some(h => Math.abs(h.x - x) < 0.9)) continue;
          const b = box(0.22, 1.0, 0.22, beamMat); b.position.set(x, y - 0.9, arcZ(x, -1.2)); b.rotation.y = arcYaw(x); root.add(b);
          const d = box(0.16, 1.2, 0.16, beamMat); d.position.set(x + 0.32, y - 0.7, arcZ(x + 0.32, -1.2)); d.rotation.z = 0.7; d.rotation.y = arcYaw(x); root.add(d);
        }
      } else if (!isSolidTerrace) {
        const below = floorBelow(level, (x1 + x2) / 2, y);
        const hgt = y - 1 - below;
        if (hgt > 1.2 && hgt < 14) {
          const n = Math.max(1, Math.round(ww / 6));
          for (let k = 0; k <= n; k++) {
            const x = x1 + 0.5 + (ww - 1) * (k / n);
            if (holes.some(h => Math.abs(h.x - x) < 0.9)) continue;
            // 绝不在村落三屋范围内生成穿透室内的石柱
            if (x >= 4.8 && x <= 28.2 && y < 10) continue;
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

    // ── 背墙（沉实厚重石砌基座墙，真实 0.5m 纵深厚度，消除共面闪烁） ──
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
        const wallMat = lam({ map: stoneTex(PX.shade(th.wall, -0.05), sww / 3, hh / 3, 21 + i * 7 + s) });
        const m = box(sww, hh, 0.5, wallMat);
        m.position.set(smidX, (y1 + y2) / 2, arcZ(smidX, -3.2));
        m.rotation.y = arcYaw(smidX);
        m.receiveShadow = true;
        m.castShadow = true;
        root.add(m);

        // 顶部门楣挑檐石 (Cornice trim)
        const trimMat = lam({ color: PX.shade(th.wall, 0.22) });
        const trim = box(sww + 0.2, 0.35, 0.7, trimMat);
        trim.position.set(smidX, y2 + 0.175, arcZ(smidX, -3.2));
        trim.rotation.y = arcYaw(smidX);
        root.add(trim);
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
    level.decor.forEach(d => {
      // 新塔门厅取代旧立面装饰，避免遗留棕榈从室内镜头前穿过。
      if (window.OPEN_WORLD && OPEN_WORLD.preparing && d.t === 'palm' && d.x >= 44 && d.x <= 86 && Math.abs(d.y) < 0.2) return;
      const beforeCount = root.children.length;
      buildDecor(d, level, root, anim, th);
      for (let i = beforeCount; i < root.children.length; i++) {
        const obj = root.children[i];
        obj.userData.decorType = d.t;
        obj.traverse(c => {
          c.userData.decorType = d.t;
          if (c.isMesh && (d.t === 'acacia' || d.t === 'olive' || d.t === 'palm' || d.t === 'reeds' || d.t === 'hanging_vines' || d.t === 'pomegranate_bush' || d.t === 'fig_bush' || d.t === 'cypress' || d.t === 'potted_palm' || d.t === 'potted_plant' || d.t === 'stone_planter' || d.t === 'oleander_bush' || d.t === 'desert_flora')) {
            c.userData.isPlant = true;
          }
        });
      }
    });

    // ── 纵深远景：连续城区由 open-world.js 统一生成，避免双塔与重复地貌 ──
    if (!(window.OPEN_WORLD && OPEN_WORLD.preparing)) buildFar(level, root, anim, th);

    // 预收集所有视线遮挡物体（前景墙、门柱、巴别塔外壳），彻底消除每帧 traverse 全场景开销
    const frontOccluders = [];
    const occlusionCandidates = [];
    root.traverse(o => {
      if (o.isMesh && (o.userData.isFrontOccluder || o.userData.isTowerShell || o.userData.isRoof || o.userData.interiorId)) {
        const u = o.userData;
        const isGround = u.isFloor || u.isGround || u.isWalkway || u.isRoad || u.isStep || u.isPlatform || u.isDeck || u.isBridge;
        if (!isGround && !u.noOcclusion) {
          occlusionCandidates.push(o);
          if (!o.isInstancedMesh) frontOccluders.push(o);
        }
      }
    });

    return { root, anim, frontOccluders, occlusionCandidates };
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

      // ── 古美索不达米亚神圣守护：拉玛苏（人首翼牛浮雕巨柱 Lamassu Guardian Pilasters） ──
      if (gt.id === 'g1' || gt.id === 'g2') {
        const buildLamassu = (sideZ, facingSign) => {
          const lamGroup = new THREE.Group();
          const stoneDark = lam({ color: PX.shade(th.stone, -0.2) });
          const stoneBase = lam({ color: PX.shade(th.stone, -0.05) });
          const stoneGold = lam({ color: '#c49a45', emissive: new THREE.Color('#503810'), emissiveIntensity: 0.25 });
          // 1. 基座台 (Base Plinth)
          const plinth = box(1.1, 0.45, 1.3, stoneDark); plinth.position.y = 0.225; lamGroup.add(plinth);
          // 2. 雄伟公牛躯干 (Bull Torso)
          const torso = box(0.9, 1.2, 1.15, stoneBase); torso.position.set(0, 1.05, 0); lamGroup.add(torso);
          // 3. 强健四蹄立柱 (Carved Legs)
          for (let lx of [-0.3, 0.3]) {
            for (let lz of [-0.4, 0.4]) {
              const leg = box(0.22, 0.7, 0.22, stoneDark);
              leg.position.set(lx, 0.55, lz);
              lamGroup.add(leg);
            }
          }
          // 4. 舒展翻飞的雕刻神翼 (Carved Feathered Wings)
          const wing = box(0.18, 1.4, 0.85, stoneGold);
          wing.position.set(facingSign * 0.42, 1.85, -0.15);
          wing.rotation.x = 0.25;
          wing.rotation.z = -facingSign * 0.2;
          lamGroup.add(wing);
          // 5. 蓄须人面神首 (Human Head with Polos Horned Headdress)
          const head = box(0.55, 0.6, 0.55, stoneBase);
          head.position.set(facingSign * 0.2, 2.05, 0.35);
          lamGroup.add(head);
          // 6. 阶梯角冠 (Horned Tiara)
          const tiara = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.38, 12), stoneGold);
          tiara.position.set(facingSign * 0.2, 2.45, 0.35);
          lamGroup.add(tiara);
          // 7. 标志性阿卡德层叠编织胡须 (Tiered Beard)
          const beard = box(0.32, 0.5, 0.24, stoneDark);
          beard.position.set(facingSign * 0.2, 1.62, 0.45);
          lamGroup.add(beard);

          lamGroup.position.set(gt.x, gt.y, sideZ);
          root.add(lamGroup);
        };
        // 门道前后两侧各矗立一尊拉玛苏巨神雕像
        buildLamassu(-1.75, 1);
        buildLamassu(1.75, -1);
      }
    });
    // 升降台 / 古代枯井绞盘吊篮
    game.lifts.forEach(lf => {
      const g = new THREE.Group();
      const w = lf.x2 - lf.x1;
      const wellCenterX = (lf.x1 + lf.x2) / 2;

      if (lf.style === 'well') {
        // ── 真实古代枯井（彻底移除现代电梯铁栏，重塑柳条编织吊篮与古木辘轳） ──
        // 1. 井底升降柳条吊篮 (Wicker Rescue Basket)
        const basketBase = new THREE.Mesh(
          new THREE.CylinderGeometry(w * 0.44, w * 0.42, 0.22, 16),
          lam({ map: woodTex(th.wood, w / 2, 1) })
        );
        basketBase.position.y = -0.11;
        basketBase.userData.isFloor = true;
        basketBase.userData.isGround = true;
        g.add(basketBase);

        // 柳条编织篮壁 (圆筒开口吊筐)
        const basketWall = new THREE.Mesh(
          new THREE.CylinderGeometry(w * 0.48, w * 0.40, 0.85, 16, 1, true),
          lam({ color: '#8c6239', side: THREE.DoubleSide })
        );
        basketWall.position.y = 0.35;
        g.add(basketWall);

        // 三向悬索粗麻绳汇集到顶端吊环
        const ropeMat = lam({ color: '#c8a870' });
        for (let k = 0; k < 3; k++) {
          const ang = (k * Math.PI * 2) / 3;
          const rL = (w * 0.44);
          const harnessRope = box(0.04, 1.25, 0.04, ropeMat);
          harnessRope.position.set(Math.cos(ang) * (rL * 0.5), 1.05, Math.sin(ang) * (rL * 0.5));
          harnessRope.rotation.z = Math.cos(ang) * 0.35;
          harnessRope.rotation.x = -Math.sin(ang) * 0.35;
          g.add(harnessRope);
        }

        const ringGeo = new THREE.TorusGeometry(0.12, 0.035, 8, 16);
        const ringMat = new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.8, roughness: 0.3 });
        const pullRing = new THREE.Mesh(ringGeo, ringMat);
        pullRing.position.set(0, 1.68, 0);
        pullRing.rotation.x = Math.PI / 2;
        g.add(pullRing);
        lf.pullRing = pullRing;

        g.position.set(wellCenterX, lf.y0, 0);
        root.add(g);
        lf.mesh = g;

        // 2. 地表石砌井圈与古木辘轳绞盘架 (Stone Wellhead & Timber Winch Gallows)
        const topY = lf.y1 + 2.5;

        // A) 地表空心琢石井圈与地下深井筒 (真正垂直开孔挖空的石砌深井)
        const curbRIn = 1.65, curbROut = 2.05;
        const stoneRimMat = lam({ map: ashlarTex(PX.shade(th.stone, 0.05), 3, 1, 57) });

        // 地表外壁 (Open ended, 高度 0.85m)
        const wellOuter = new THREE.Mesh(
          new THREE.CylinderGeometry(curbROut, curbROut, 0.85, 24, 1, true),
          stoneRimMat
        );
        wellOuter.position.set(wellCenterX, 0.42, 0);
        wellOuter.receiveShadow = true;
        root.add(wellOuter);

        // 地表内壁 (BackSide)
        const wellInner = new THREE.Mesh(
          new THREE.CylinderGeometry(curbRIn, curbRIn, 0.85, 24, 1, true),
          lam({ map: ashlarTex(PX.shade(th.stone, -0.15), 3, 1, 58), side: THREE.BackSide })
        );
        wellInner.position.set(wellCenterX, 0.42, 0);
        root.add(wellInner);

        // 顶圈护栏石 (Ring)
        const wellTopRing = new THREE.Mesh(
          new THREE.RingGeometry(curbRIn, curbROut, 24),
          lam({ color: PX.shade(th.stone, 0.22), side: THREE.DoubleSide })
        );
        wellTopRing.rotation.x = -Math.PI / 2;
        wellTopRing.position.set(wellCenterX, 0.85, 0);
        root.add(wellTopRing);

        // 井边长条牲口饮水石槽与打水木桶 (Livestock Watering Trough & Wooden Bucket)
        const troughX = wellCenterX - 3.4;
        const troughZ = 0.2;
        const troughBase = box(2.4, 0.48, 1.05, lam({ map: ashlarTex(PX.shade(th.stone, 0.1), 2, 1, 63) }));
        troughBase.position.set(troughX, 0.24, troughZ);
        root.add(troughBase);

        // 槽内清澈荡漾水面 (Glistening Trough Water)
        const troughWaterMat = lam({ map: waterTex(1.5, 1), transparent: true, opacity: 0.60, depthWrite: false });
        const troughWater = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.75), troughWaterMat);
        troughWater.renderOrder = 5;
        troughWater.rotation.x = -Math.PI / 2;
        troughWater.position.set(troughX, 0.42, troughZ);
        root.add(troughWater);
        anim.push({ update: (dt, t) => { troughWaterMat.opacity = 0.58 + Math.sin(t * 3) * 0.06; } });

        // 水槽周围湿漉漉的深色鹅卵石地面 (Wet Cobblestones around trough)
        const wetPavingMat = lam({ map: cobbleTex('#786b58', 2, 2, 81) });
        const wetPaving = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.2), wetPavingMat);
        wetPaving.rotation.x = -Math.PI / 2;
        wetPaving.position.set(troughX, 0.015, troughZ);
        root.add(wetPaving);

        // 打水雪松木桶与绳索 (Cedar Bucket & Rope)
        const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.38, 12), lam({ map: cedarTex('#6a4220', 1, 1) }));
        bucket.position.set(wellCenterX - 2.1, 0.19, 0.85);
        root.add(bucket);
        const bucketRope = box(0.04, 0.6, 0.04, lam({ color: '#c8a870' }));
        bucketRope.position.set(wellCenterX - 2.1, 0.42, 0.85);
        bucketRope.rotation.z = 0.2;
        root.add(bucketRope);

        // 倚靠在水槽边的陶土储水双耳罐
        const potMat = lam({ color: '#c46232' });
        const pot1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.65, 12), potMat);
        pot1.position.set(troughX - 1.4, 0.32, troughZ + 0.3);
        root.add(pot1);

        // B) 地下真正深挖开孔井筒 (深达 y = lf.y0 = -5.0m)
        const shaftDepth = Math.abs(lf.y0);
        const shaftMat = lam({ map: stoneTex(PX.shade(th.stone, -0.32), 4, 3, 19), side: THREE.BackSide });
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(curbRIn, curbRIn, shaftDepth, 24, 1, true),
          shaftMat
        );
        shaft.position.set(wellCenterX, lf.y0 / 2, 0);
        root.add(shaft);

        // 井底石砌地坪与古老水渠暗沟
        const wellBottom = new THREE.Mesh(
          new THREE.CircleGeometry(curbRIn, 24),
          lam({ map: stoneTex(PX.shade(th.stone, -0.4), 2, 2, 88) })
        );
        wellBottom.rotation.x = -Math.PI / 2;
        wellBottom.position.set(wellCenterX, lf.y0, 0);
        root.add(wellBottom);

        // 井底暖光提灯（照亮井底修理水阀的工匠巴尼）
        const wellLamp = new THREE.PointLight(0xffa533, 1.6, 9);
        wellLamp.position.set(wellCenterX, lf.y0 + 1.2, 0);
        root.add(wellLamp);
        anim.push({ update: (dt, t) => { wellLamp.intensity = 1.4 + Math.sin(t * 12) * 0.25; } });

        // B) 木构辘轳双立柱人字架 (Timber Winch Gallows)
        const timberMat = lam({ color: PX.shade(th.wood, -0.2) });
        [-w / 2 - 0.25, w / 2 + 0.25].forEach(dx => {
          const post = box(0.24, topY + 0.6, 0.24, timberMat);
          post.position.set(wellCenterX + dx, (topY + 0.6) / 2, 0);
          root.add(post);
        });

        // C) 横梁与圆木绞盘轴筒 (Winding Drum)
        const topBeam = box(w + 1.2, 0.28, 0.28, timberMat);
        topBeam.position.set(wellCenterX, topY + 0.5, 0);
        root.add(topBeam);

        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, w * 0.7, 14), lam({ color: '#5c3a1c' }));
        drum.rotation.z = Math.PI / 2;
        drum.position.set(wellCenterX, topY, 0);
        root.add(drum);

        // D) 青铜曲柄摇把 (Bronze Crank Handle)
        const crankArm = box(0.08, 0.55, 0.08, new THREE.MeshStandardMaterial({ color: '#c49a45', metalness: 0.7 }));
        crankArm.position.set(wellCenterX + w / 2 + 0.38, topY - 0.18, 0.22);
        root.add(crankArm);

        // E) 垂入井底的中心粗麻绳
        const centerRope = box(0.06, 1, 0.06, ropeMat);
        centerRope.position.set(wellCenterX, 0, 0);
        root.add(centerRope);
        lf.ropes = [{ m: centerRope, dx: 0 }];
        lf.wheel = drum;
        lf.topY = topY;

        // F) 井壁内侧嵌岩攀爬横档 (Climbable Stone Rungs)
        for (let ry = lf.y0 + 0.8; ry < lf.y1; ry += 0.85) {
          const rung = box(0.7, 0.12, 0.16, timberMat);
          rung.position.set(wellCenterX - w * 0.42, ry, -0.1);
          root.add(rung);
        }
      } else {
        // 常规起重机 / 脚手架吊台
        const plat = box(w, 0.36, 2.0, lam({ map: woodTex(th.wood, w / 2, 1) }));
        plat.position.y = -0.18;
        plat.userData.isFloor = true;
        plat.userData.isGround = true;
        g.add(plat);
        const railMat = lam({ color: PX.shade(th.wood, -0.3) });
        const r1 = box(0.1, 0.9, 0.1, railMat); r1.position.set(-w / 2 + 0.1, 0.45, -0.9); g.add(r1);
        const r2 = r1.clone(); r2.position.x = w / 2 - 0.1; g.add(r2);
        const r3 = box(w, 0.08, 0.08, railMat); r3.position.set(0, 0.9, -0.9); g.add(r3);
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
        g.position.set(wellCenterX, lf.y0, 0);
        root.add(g); lf.mesh = g;

        const topY = lf.y1 + 3.4;
        const ropeMat = lam({ color: '#c8a870' });
        const ropes = [];
        [-w / 2 + 0.2, w / 2 - 0.2].forEach(dx => { const r = box(0.06, 1, 0.06, ropeMat); r.position.set(wellCenterX + dx, 0, -0.2); root.add(r); ropes.push({ m: r, dx }); });
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 14), lam({ color: '#7a5030' }));
        wheel.rotation.x = Math.PI / 2; wheel.position.set(wellCenterX, topY, -0.2); root.add(wheel);
        const spoke = box(1.0, 0.12, 0.34, lam({ color: '#5a3a20' })); wheel.add(spoke); spoke.rotation.x = Math.PI / 2;
        const beam = box(w + 3.2, 0.4, 0.4, lam({ color: PX.shade(th.wood, -0.2) })); beam.position.set(wellCenterX - (lf.style === 'crane' ? 1.2 : 0), topY + 0.6, -0.2); root.add(beam);
        if (lf.style === 'crane') {
          const mast = box(0.45, topY + 0.8 - lf.y0, 0.45, lam({ color: PX.shade(th.wood, -0.25) }));
          mast.position.set(lf.x1 - 1.6, (topY + 0.8 + lf.y0) / 2, -1.6); root.add(mast);
          const brace = box(0.25, 3.2, 0.25, lam({ color: PX.shade(th.wood, -0.25) })); brace.position.set(lf.x1 - 0.6, topY - 0.6, -1.0); brace.rotation.z = -0.7; root.add(brace);
        } else {
          [lf.x1 - 0.3, lf.x2 + 0.3].forEach(x => { const post = box(0.3, topY + 0.6, 0.3, lam({ color: PX.shade(th.wood, -0.25) })); post.position.set(x, (topY + 0.6) / 2, -0.6); root.add(post); });
          const roof = box(w + 1.6, 0.3, 1.6, lam({ color: th.accent })); roof.position.set(wellCenterX, topY + 1.0, -0.4); root.add(roof);
        }
        lf.ropes = ropes; lf.wheel = wheel; lf.topY = topY;
      }
    });
    // 吊桥
    game.bridges.forEach(b => {
      const w = b.x2 - b.x1;
      const geo = new THREE.BoxGeometry(w, 0.32, 2.0); geo.translate(w / 2, -0.16, 0);
      const m = new THREE.Mesh(geo, lam({ map: woodTex(th.wood, w / 2, 1) })); m.castShadow = true; m.receiveShadow = true;
      m.position.set(b.x1, b.y, -0.2); m.scale.x = 0.001;
      m.userData.isFloor = true;
      m.userData.isGround = true;
      root.add(m); b.mesh = m;
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
        pl.position.set(0.25 + i * 0.5, -0.15, -0.2); pl.visible = false;
        pl.userData.isFloor = true;
        pl.userData.isGround = true;
        pl.userData.isPlatform = true;
        pl.userData.platY = b.y;
        g.add(pl); planks.push(pl);
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
      const seed = Math.round(Math.abs((d.x || 0) * 1000 + (d.y || 0) * 100 + z * 10)) || 101;
      const pRng = (function(s) {
        let v = s % 2147483647;
        if (v <= 0) v += 2147483646;
        return function() {
          v = (v * 16807) % 2147483647;
          return (v - 1) / 2147483646;
        };
      })(seed);

      const age = pRng();
      const numSegs = age < 0.25 ? 5 : (age < 0.80 ? 7 : 9);
      const segH = 0.76;
      const trunkScale = 0.85 + (numSegs / 7) * 0.25;
      const leanCurve = (pRng() - 0.5) * 0.05;

      // 树干：使用带有美索不达米亚棕榈树干菱形节瘤的深褐粗糙木质
      const tm = lam({ map: cedarTex('#724620', 0.5, 2, 7) });
      let curX = 0, curY = 0;
      for (let i = 0; i < numSegs; i++) {
        const segR1 = (0.34 - i * 0.02) * trunkScale;
        const segR2 = (0.38 - i * 0.02) * trunkScale;
        const s = new THREE.Mesh(new THREE.CylinderGeometry(segR1, segR2, segH, 8), tm);
        curX += i * i * leanCurve * 0.6;
        curY = 0.38 + i * (segH - 0.04);
        s.position.set(curX, curY, 0);
        s.rotation.z = -i * leanCurve * 1.5;
        g.add(s);
      }
      const topY = curY + segH * 0.45;
      const topX = curX;

      // 树冠冠托节盘 (Crown Capital Collar)
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.36 * trunkScale, 0.26 * trunkScale, 0.32, 8), tm);
      collar.position.set(topX, topY - 0.12, 0);
      g.add(collar);

      // 累累垂挂的成熟金红椰枣果串 (Heavy Clusters of Ripe Golden-Red Dates)
      const numDates = age < 0.25 ? 2 : (age < 0.80 ? 4 : 5);
      const dateBunchMat = lam({ color: '#c8501e', emissive: new THREE.Color('#6a2408'), emissiveIntensity: 0.25 });
      for (let bi = 0; bi < numDates; bi++) {
        const bAng = bi * (Math.PI * 2 / numDates) + 0.3;
        const stalk = box(0.04, 0.42 * trunkScale, 0.04, lam({ color: '#7a8030' }));
        stalk.position.set(topX + Math.cos(bAng) * 0.32 * trunkScale, topY - 0.18, Math.sin(bAng) * 0.32 * trunkScale);
        g.add(stalk);
        const cluster = new THREE.Mesh(new THREE.SphereGeometry(0.24 * trunkScale, 8, 8), dateBunchMat);
        cluster.scale.set(0.8, 1.45, 0.8);
        cluster.position.set(topX + Math.cos(bAng) * 0.38 * trunkScale, topY - 0.42 * trunkScale, Math.sin(bAng) * 0.38 * trunkScale);
        g.add(cluster);
      }

      // 树冠多层羽状倾角结构 (Multi-Tier Parametric Canopy)
      const frondGroup = new THREE.Group();
      frondGroup.position.set(topX, topY, 0);

      const lmSunlit = lam({ color: '#5ea236', side: THREE.DoubleSide });
      const lmMature = lam({ color: '#396b24', side: THREE.DoubleSide });

      // 【Tier 1：仰天新叶 (Spire Fronds)】陡峭仰角 +55° ~ +70°
      const numSpire = age < 0.25 ? 4 : 5;
      for (let fi = 0; fi < numSpire; fi++) {
        const fPiv = new THREE.Group();
        fPiv.rotation.y = fi * (Math.PI * 2 / numSpire) + pRng() * 0.2;
        fPiv.rotation.z = -1.10 - (pRng() - 0.5) * 0.2; // 陡峭仰角
        const lf = box(2.4 * trunkScale, 0.07, 0.42 * trunkScale, lmSunlit);
        lf.position.set(1.2 * trunkScale, 0, 0);
        fPiv.add(lf);
        frondGroup.add(fPiv);
      }

      // 【Tier 2：主冠双节弯垂羽叶 (Cascading Arch Fronds)】
      // 内节向上拱展 (+32°)，外节弯垂倾泻 (-20°)
      const numArch = age < 0.25 ? 8 : (age < 0.80 ? 10 : 12);
      for (let fi = 0; fi < numArch; fi++) {
        const fPiv = new THREE.Group();
        fPiv.rotation.y = fi * (Math.PI * 2 / numArch) + 0.3 + pRng() * 0.15;
        fPiv.rotation.z = -0.58; // 内段向上拱展 ~33°

        const innerL = 1.6 * trunkScale;
        const innerLf = box(innerL, 0.08, 0.48 * trunkScale, fi % 2 === 0 ? lmMature : lmSunlit);
        innerLf.position.set(innerL / 2, 0, 0);
        fPiv.add(innerLf);

        // 外节自然向下折垂
        const outerPiv = new THREE.Group();
        outerPiv.position.set(innerL, 0, 0);
        outerPiv.rotation.z = 0.85; // 相对内节向下弯垂
        const outerL = 1.8 * trunkScale;
        const outerLf = box(outerL, 0.06, 0.54 * trunkScale, lmMature);
        outerLf.position.set(outerL / 2, 0, 0);
        outerPiv.add(outerLf);
        fPiv.add(outerPiv);

        frondGroup.add(fPiv);
      }

      // 【Tier 3：老熟苍翠垂裙 (Weeping Skirt Fronds)】大角度向下深垂 -42° ~ -55°
      const numSkirt = age < 0.25 ? 5 : (age < 0.80 ? 7 : 8);
      for (let fi = 0; fi < numSkirt; fi++) {
        const fPiv = new THREE.Group();
        fPiv.rotation.y = fi * (Math.PI * 2 / numSkirt) + 0.15;
        fPiv.rotation.z = 0.82 + (pRng() - 0.5) * 0.15; // 陡直下垂
        const lf = box(2.6 * trunkScale, 0.08, 0.50 * trunkScale, lmMature);
        lf.position.set(1.3 * trunkScale, 0, 0);
        fPiv.add(lf);
        frondGroup.add(fPiv);
      }

      g.add(frondGroup);
      g.position.set(d.x, d.y, z);
      root.add(g);
      anim.push({
        update: (dt, t) => {
          g.rotation.z = Math.sin(t * 0.9 + d.x) * 0.018;
          frondGroup.rotation.y = Math.sin(t * 0.7 + d.x) * 0.025;
        }
      });
    } else if (d.t === 'building') {
      const g = new THREE.Group();
      const ww = d.w || 6.8, hh = d.h || 4.6, dd = d.d || 5.2;
      // 两河古法晒制凸面泥砖（Plano-convex Adobe Brick），带草茎纤维与泥灰缝
      const wallMat = lam({ map: adobeTex('#d8b488', ww / 2, hh / 2, 41) });
      const sideWallMat = lam({ map: adobeTex('#cba77b', dd / 2, hh / 2, 42) });
      const woodTrimMat = lam({ map: cedarTex('#5c381e', 1, 1, 15) });
      const ashlarBaseMat = lam({ map: ashlarTex(PX.shade(th.stone, -0.05), ww / 2, 0.4, 11) });

      // 正面外墙（两侧实体泥砖墙 + 中央门洞空开：门楣设为 3.2m，容纳头顶背负 2 个物品畅通进出）
      const doorW = 1.8, doorH = 3.2;
      const sideW = (ww - doorW) / 2;
      const wallL = box(sideW, hh, 0.45, wallMat); wallL.position.set(-sideW / 2 - doorW / 2, hh / 2, 0); wallL.userData.isFrontOccluder = true; g.add(wallL);
      const wallR = box(sideW, hh, 0.45, wallMat); wallR.position.set(sideW / 2 + doorW / 2, hh / 2, 0); wallR.userData.isFrontOccluder = true; g.add(wallR);
      const wallTop = box(ww, hh - doorH, 0.45, wallMat); wallTop.position.set(0, hh - (hh - doorH) / 2, 0); wallTop.userData.isFrontOccluder = true; g.add(wallTop);

      // 建筑底座琢石方砖裙边（Ashlar Stone Plinth，防风沙侵蚀）
      const plinthL = box(sideW + 0.04, 0.45, 0.52, ashlarBaseMat); plinthL.position.set(-sideW / 2 - doorW / 2, 0.225, 0); plinthL.userData.isFrontOccluder = true; g.add(plinthL);
      const plinthR = box(sideW + 0.04, 0.45, 0.52, ashlarBaseMat); plinthR.position.set(sideW / 2 + doorW / 2, 0.225, 0); plinthR.userData.isFrontOccluder = true; g.add(plinthR);

      // 两河标志性建筑特征：凸出墙面的高山雪松排椽（Vigas，屋顶挑梁椽头）
      const vigaMat = lam({ map: cedarTex('#4e2d14', 0.5, 0.5, 18) });
      const numVigas = Math.max(5, Math.floor(ww / 1.0));
      for (let vi = 0; vi < numVigas; vi++) {
        const vx = -ww / 2 + 0.5 + vi * ((ww - 1.0) / (numVigas - 1));
        const viga = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.95, 10), vigaMat);
        viga.rotation.x = Math.PI / 2;
        viga.position.set(vx, hh - 0.24, 0.32);
        viga.userData.isFrontOccluder = true;
        g.add(viga);
      }

      // 左右侧山墙（向 Z 轴纵深伸展）
      const wallSideL = box(0.42, hh, dd, sideWallMat); wallSideL.position.set(-ww / 2 + 0.21, hh / 2, -dd / 2); g.add(wallSideL);
      const wallSideR = box(0.42, hh, dd, sideWallMat); wallSideR.position.set(ww / 2 - 0.21, hh / 2, -dd / 2); g.add(wallSideR);

      // 门框柱与厚重雪松门额梁
      const p1 = box(0.2, doorH, 0.54, woodTrimMat); p1.position.set(-doorW / 2, doorH / 2, 0); p1.userData.isFrontOccluder = true; g.add(p1);
      const p2 = box(0.2, doorH, 0.54, woodTrimMat); p2.position.set(doorW / 2, doorH / 2, 0); p2.userData.isFrontOccluder = true; g.add(p2);
      const lintel = box(doorW + 0.4, 0.26, 0.58, woodTrimMat); lintel.position.set(0, doorH, 0); lintel.userData.isFrontOccluder = true; g.add(lintel);

      // 屋顶覆盖（平坦坚实的步行天台，前缘延伸至 z=+0.75 以无缝承接 z=0 动线、爬梯与跨巷连廊）
      const roofFloorMat = lam({ map: adobeTex('#c29b70', ww / 2, dd / 2, 88) });
      const roof = box(ww + 0.36, 0.22, dd + 0.95, roofFloorMat);
      roof.position.set(0, hh + 0.11, -dd / 2 + 0.28);
      roof.userData.isWalkway = true;
      roof.userData.isFloor = true;
      roof.userData.isGround = true;
      roof.userData.isRoof = true;
      roof.userData.isPlatform = true;
      roof.userData.platY = d.y + 4.62;
      g.add(roof);

      // 屋顶后侧低矮女儿墙与前侧两端隅柱（前侧中央留空供人物行走与爬梯上下，不遮挡屋顶角色）
      const parapetMat = lam({ map: adobeTex(PX.shade('#d8b488', -0.1), ww / 2, 0.4, 43) });
      const parapetBack = box(ww + 0.40, 0.36, 0.26, parapetMat);
      parapetBack.position.set(0, hh + 0.22 + 0.18, -dd - 0.08);
      g.add(parapetBack);

      // 女儿墙后沿齿状饰块（两河阶梯城垛 Dental Molding）
      const numTeeth = Math.floor(ww / 1.1);
      for (let ti = 0; ti < numTeeth; ti++) {
        const tx = -ww / 2 + 0.55 + ti * ((ww - 1.1) / Math.max(1, numTeeth - 1));
        const tooth = box(0.38, 0.28, 0.28, parapetMat);
        tooth.position.set(tx, hh + 0.22 + 0.36 + 0.14, -dd - 0.08);
        g.add(tooth);
      }

      // 悬挂在屋檐前侧的近东手工编织条纹羊毛花毯 (Striped Kilim Hanging Rug)
      const rugColor1 = d.interiorType === 'council' ? '#a32a22' : (d.interiorType === 'workshop' ? '#2f5d7c' : '#c88728');
      const rugColor2 = '#e8be52';
      const rugColor3 = '#1e384d';
      const rugMat = lam({ map: textileTex(rugColor1, rugColor2, rugColor3, 1.5, 1.2), side: THREE.DoubleSide });
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), rugMat);
      rug.position.set(ww * 0.24, hh - 0.35, 0.26);
      rug.userData.isFrontOccluder = true;
      g.add(rug);
      anim.push({ update: (dt, t) => { rug.rotation.x = Math.sin(t * 1.6 + d.x) * 0.04; } });

      // 屋顶天台专属设施（遮阳天幕与陶瓮置于屋顶北侧后景 z = -dd*0.65，绝不阻碍 z=0 屋顶步道）
      const awningClothMat = lam({ map: textileTex('#9b332b', '#dab248', '#264b63', 2, 1), side: THREE.DoubleSide });
      const shadePoleL = box(0.08, 1.8, 0.08, woodTrimMat); shadePoleL.position.set(-ww * 0.28, hh + 0.22 + 0.9, -dd * 0.65); g.add(shadePoleL);
      const shadePoleR = box(0.08, 1.8, 0.08, woodTrimMat); shadePoleR.position.set(-ww * 0.05, hh + 0.22 + 0.9, -dd * 0.65); g.add(shadePoleR);
      const clothShade = box(ww * 0.32, 0.06, 1.4, awningClothMat); clothShade.position.set(-ww * 0.165, hh + 0.22 + 1.8, -dd * 0.65); g.add(clothShade);

      const roofJar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.6, 10), lam({ color: '#b85e2e' }));
      roofJar.position.set(ww * 0.32, hh + 0.22 + 0.3, -dd * 0.65);
      g.add(roofJar);

      // 室内纵深结构（Z = -dd/2 处）
      const floorMat = lam({ map: adobeTex('#aa855e', 3, 2, 12) });
      const floor = box(ww - 0.4, 0.18, dd - 0.2, floorMat);
      floor.position.set(0, 0.09, -dd / 2); g.add(floor);

      const backWallMat = lam({ map: adobeTex('#c29b70', 3, 2, 33) });
      const backWall = box(ww - 0.4, hh, 0.35, backWallMat);
      backWall.position.set(0, hh / 2, -dd + 0.2); g.add(backWall);

      // 室内专属陈设
      if (d.interiorType === 'council') {
        const hearth = box(1.3, 0.75, 0.9, lam({ color: '#2d1b0c' }));
        hearth.position.set(0, 0.38, -dd + 1.1); g.add(hearth);
        const hearthLight = new THREE.PointLight(0xffa033, 1.4, 9);
        hearthLight.position.set(0, 1.2, -dd + 1.2); g.add(hearthLight);
        anim.push({ update: (dt, t) => { hearthLight.intensity = 1.2 + Math.sin(t * 13) * 0.3; } });
        const table = box(2.4, 0.7, 0.9, woodTrimMat);
        table.position.set(0, 0.35, -dd * 0.5); g.add(table);
      } else if (d.interiorType === 'granary') {
        const shelf = box(ww - 1.6, 2.2, 0.7, woodTrimMat);
        shelf.position.set(0, 1.1, -dd + 1.0); g.add(shelf);
      } else if (d.interiorType === 'workshop') {
        const stoneBench = box(2.6, 0.8, 1.0, lam({ map: ashlarTex(PX.shade(th.stone, 0.05), 2, 1, 62) }));
        stoneBench.position.set(0, 0.4, -dd + 1.2); g.add(stoneBench);
        const chiselBlock = box(0.9, 0.6, 0.8, lam({ color: '#cbbfa2' }));
        chiselBlock.position.set(0.6, 1.1, -dd + 1.2); g.add(chiselBlock);
        const lantern = box(0.22, 0.32, 0.22, lam({ color: '#ffb030' }));
        lantern.position.set(-0.7, 0.95, -dd + 1.2); g.add(lantern);
        const lLight = new THREE.PointLight(0xffaa44, 1.2, 7);
        lLight.position.set(-0.7, 1.2, -dd + 1.2); g.add(lLight);
        anim.push({ update: (dt, t) => { lLight.intensity = 1.0 + Math.sin(t * 11) * 0.2; } });
      }

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
    } else if (d.t === 'watchtower_deck') {
      const g = new THREE.Group();
      const tw = d.w || 3.6, th = d.h || 3.58, td = d.d || 2.8;
      const timberMat = lam({ map: cedarTex(PX.shade('#4a2e16', -0.1), 1, 1, 19) });
      const floorMat = lam({ map: cedarTex(PX.shade('#6a4220', 0.1), 2, 2, 85) });
      const clothMat = lam({ map: textileTex('#b83226', '#e0b040', '#1f4865', 1.5, 1.2), side: THREE.DoubleSide });

      // 4 根通透雪松挑角木立柱（底层四面敞开，绝不阻挡 y=4.62 屋顶通行与爬梯）
      for (const cx of [-tw / 2 + 0.18, tw / 2 - 0.18]) {
        for (const cz of [-td / 2 + 0.18, td / 2 - 0.18]) {
          const post = box(0.22, th + 1.8, 0.22, timberMat);
          post.position.set(cx, (th + 1.8) / 2, cz);
          g.add(post);
        }
      }

      // 观景高台甲板 (Deck floor top at y = d.y + th = 8.2)
      const deck = box(tw + 0.2, 0.26, td + 0.2, floorMat);
      deck.position.set(0, th - 0.13, 0);
      deck.userData.isFloor = true;
      deck.userData.isGround = true;
      deck.userData.isPlatform = true;
      deck.userData.platY = d.y + th;
      g.add(deck);

      // 甲板后侧与两侧木围栏（前侧敞开避免遮挡视线）
      const railB = box(tw + 0.2, 0.65, 0.1, timberMat); railB.position.set(0, th + 0.32, -td / 2); g.add(railB);
      const railL = box(0.1, 0.65, td, timberMat); railL.position.set(-tw / 2, th + 0.32, 0); g.add(railL);
      const railR = box(0.1, 0.65, td, timberMat); railR.position.set(tw / 2, th + 0.32, 0); g.add(railR);

      // 顶层遮阳凉亭布幔 (Pavilion Canopy)
      const canopy = box(tw + 0.6, 0.1, td + 0.6, clothMat);
      canopy.position.set(0, th + 1.8, 0);
      g.add(canopy);

      // 悬挂铜风铃/提灯 (Lantern)
      const lamp = box(0.25, 0.35, 0.25, lam({ color: '#ffb030' }));
      lamp.position.set(0, th + 1.4, 0);
      g.add(lamp);
      const pLight = new THREE.PointLight(0xffa500, 1.3, 8);
      pLight.position.set(0, th + 1.3, 0);
      g.add(pLight);
      anim.push({ update: (dt, tm) => { pLight.intensity = 1.1 + Math.sin(tm * 8) * 0.25; } });

      // 对齐在 z = -0.55（与屋顶动线和 [15.5, 4.62, 8.2] 爬梯严丝合缝）
      g.position.set(d.x, d.y, (d.z !== undefined) ? d.z : -0.55);
      root.add(g);
    } else if (d.t === 'terrace_steps') {
      const g = new THREE.Group();
      const stoneMat = lam({ map: ashlarTex('#cbbfa2', 1, 1, 45) });
      const capMat = lam({ color: PX.shade('#d9b98a', 0.2) });
      const numSteps = d.steps || 3;
      const totalW = d.w || 2.4, totalH = d.h || 1.8, depth = d.d || 3.4;
      const stepW = totalW / numSteps;
      const stepH = totalH / numSteps;
      for (let i = 0; i < numSteps; i++) {
        const curH = (i + 1) * stepH;
        const curX = (d.facingLeft ? (numSteps - 1 - i) : i) * stepW + stepW / 2 - totalW / 2;
        const b = box(stepW + 0.04, curH, depth, stoneMat);
        b.position.set(curX, curH / 2, 0);
        b.userData.isFloor = true;
        b.userData.isGround = true;
        b.userData.isPlatform = true;
        b.userData.platY = d.y + curH;
        g.add(b);
        const cap = box(stepW + 0.06, 0.14, depth + 0.08, capMat);
        cap.position.set(curX, curH - 0.07, 0);
        cap.userData.isFloor = true;
        cap.userData.isGround = true;
        cap.userData.isPlatform = true;
        cap.userData.platY = d.y + curH;
        g.add(cap);
      }
      g.position.set(d.x, d.y, (d.z !== undefined) ? d.z : -0.4);
      root.add(g);
    } else if (d.t === 'retaining_wall') {
      const g = new THREE.Group();
      const wallMat = lam({ map: ashlarTex(PX.shade('#d9b98a', -0.05), (d.w || 4) / 2, (d.h || 2) / 2, 38) });
      const w = d.w || 4, h = d.h || 1.8, dth = d.d || 4.2;
      const wall = box(w, h - 0.18, dth, wallMat);
      wall.position.set(0, (h - 0.18) / 2, 0);
      wall.userData.isFloor = true;
      wall.userData.isGround = true;
      wall.userData.isPlatform = true;
      wall.userData.platY = d.y + h;
      g.add(wall);
      // 顶部琢石压顶石条（与主体分高，不共面闪烁）
      const cap = box(w + 0.06, 0.18, dth + 0.08, lam({ color: PX.shade('#d9b98a', 0.22) }));
      cap.position.set(0, h - 0.09, 0);
      cap.userData.isFloor = true;
      cap.userData.isGround = true;
      cap.userData.isPlatform = true;
      cap.userData.platY = d.y + h;
      g.add(cap);
      // 凸出加固扶壁 (Buttresses)
      const numButtresses = Math.max(2, Math.floor(w / 2.5));
      for (let bi = 0; bi < numButtresses; bi++) {
        const bx = -w / 2 + 0.6 + bi * ((w - 1.2) / Math.max(1, numButtresses - 1));
        const butt = box(0.48, h, 0.55, wallMat);
        butt.position.set(bx, h / 2, dth / 2 + 0.25);
        g.add(butt);
      }
      g.position.set(d.x, d.y, (d.z !== undefined) ? d.z : -0.6);
      root.add(g);
    } else if (d.t === 'hut') {
      const g = new THREE.Group();
      const body = box(3.2, 2.4, 2.6, lam({ map: adobeTex('#d8b488', 1.5, 1.2, 41) })); body.position.y = 1.2; g.add(body);
      const roof = box(3.6, 0.35, 3.0, lam({ map: cedarTex('#5c381e', 1, 1) })); roof.position.y = 2.55; g.add(roof);
      const door = box(0.8, 1.3, 0.05, lam({ map: cedarTex('#4a2e16', 1, 1) })); door.position.set(0.5, 0.65, 1.31); g.add(door);
      const win = box(0.6, 0.5, 0.05, lam({ color: '#2a1a10' })); win.position.set(-0.8, 1.5, 1.31); g.add(win);
      g.position.set(d.x, d.y, z); root.add(g);
    } else if (d.t === 'clay_jars') {
      const g = new THREE.Group();
      const jarMat = lam({ color: '#c46835' });
      const jarMat2 = lam({ color: '#b55a2d' });
      const j1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.65, 12), jarMat); j1.position.set(-0.25, 0.32, 0); g.add(j1);
      const j2 = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.20, 0.80, 12), jarMat2); j2.position.set(0.22, 0.40, -0.15); g.add(j2);
      const j3 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.48, 12), jarMat); j3.position.set(0.05, 0.24, 0.2); g.add(j3);
      g.position.set(d.x, d.y, z); root.add(g);
    } else if (d.t === 'hay_bale') {
      const g = new THREE.Group();
      const hayMat = lam({ color: '#dfb15b' });
      const b1 = box(1.2, 0.65, 0.85, hayMat); b1.position.set(0, 0.32, 0); g.add(b1);
      const b2 = box(1.1, 0.60, 0.75, hayMat); b2.position.set(0.1, 0.90, -0.05); b2.rotation.y = 0.25; g.add(b2);
      g.position.set(d.x, d.y, z); root.add(g);
    } else if (d.t === 'awning') {
      const g = new THREE.Group();
      const timberMat = lam({ map: cedarTex(PX.shade(th.wood, -0.25), 1, 1) });
      const clothMat = lam({ map: textileTex('#b83226', '#e2ab3c', '#2a5a78', 2, 1), side: THREE.DoubleSide });
      const w = d.w || 3.4, h = d.h || 2.6;
      const p1 = box(0.16, h, 0.16, timberMat); p1.position.set(-w / 2, h / 2, 0); g.add(p1);
      const p2 = box(0.16, h, 0.16, timberMat); p2.position.set(w / 2, h / 2, 0); g.add(p2);
      const beam = box(w + 0.3, 0.16, 0.16, timberMat); beam.position.set(0, h, 0); g.add(beam);
      const canopy = box(w, 0.08, 1.8, clothMat);
      canopy.position.set(0, h + 0.15, -0.8);
      canopy.rotation.x = 0.22;
      g.add(canopy);
      g.position.set(d.x, d.y, z); root.add(g);
    } else if (d.t === 'fence') {
      const g = new THREE.Group();
      const postMat = lam({ map: cedarTex(PX.shade(th.wood, -0.2), 1, 1) });
      const xSpan = (d.x2 - d.x1);
      const segs = Math.max(1, Math.round(xSpan / 2.0));
      for (let s = 0; s <= segs; s++) {
        const post = box(0.14, 1.1, 0.14, postMat);
        post.position.set(d.x1 + s * (xSpan / segs), 0.55, 0);
        g.add(post);
      }
      const rail1 = box(xSpan, 0.08, 0.06, postMat); rail1.position.set((d.x1 + d.x2) / 2, 0.4, 0); g.add(rail1);
      const rail2 = box(xSpan, 0.08, 0.06, postMat); rail2.position.set((d.x1 + d.x2) / 2, 0.85, 0); g.add(rail2);
      g.position.set(0, d.y, z); root.add(g);
    } else if (d.t === 'banner') {
      const g = new THREE.Group();
      const pole = box(1.6, 0.1, 0.1, lam({ map: cedarTex('#6b4423', 1, 1) })); g.add(pole);
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
      // ══════ 地中海/近东古老直立丝柏树 (Mediterranean Columnar Cypress) ══════
      const g = new THREE.Group();
      const trunkMat = lam({ map: cedarTex('#4a321e', 0.5, 2, 23) });
      const trunk = box(0.26, 1.1, 0.26, trunkMat); trunk.position.y = 0.55; g.add(trunk);

      const folColors = ['#1e4722', '#2a5a2e', '#366d3b', '#204d25'];
      const tierHeights = [1.6, 2.7, 3.8, 4.7];
      const tierRadii = [0.92, 0.80, 0.62, 0.40];
      const tierConeH = [1.8, 1.7, 1.5, 1.3];
      for (let ti = 0; ti < 4; ti++) {
        const cMat = lam({ color: folColors[ti] });
        const cMesh = new THREE.Mesh(new THREE.ConeGeometry(tierRadii[ti], tierConeH[ti], 9), cMat);
        cMesh.position.y = tierHeights[ti];
        cMesh.rotation.y = ti * 0.7;
        cMesh.castShadow = true;
        g.add(cMesh);
      }
      g.position.set(d.x, d.y, z); root.add(g);
      anim.push({ update: (dt, t) => { g.rotation.z = Math.sin(t * 0.8 + d.x * 0.4) * 0.015; } });
    } else if (d.t === 'canal') {
      // ══════ 村落活水灌溉水渠（两河开渠引水系统，带流动水面与木质石闸门） ══════
      const g = new THREE.Group();
      const x1 = d.x1 !== undefined ? d.x1 : -4;
      const x2 = d.x2 !== undefined ? d.x2 : 28;
      const canalLen = x2 - x1;
      const canalMidX = (x1 + x2) / 2;
      const canalW = d.w || 1.6;
      const wallThick = 0.35;
      const canalWallMat = lam({ map: ashlarTex(PX.shade(th.stone, -0.05), Math.max(1, canalLen / 4), 1, 31) });

      // 水渠后侧与前侧石砌堤岸 (Stone canal banks)
      const bankBack = box(canalLen, 0.5, wallThick, canalWallMat);
      bankBack.position.set(0, 0.25, -canalW / 2 - wallThick / 2);
      g.add(bankBack);
      const bankFront = box(canalLen, 0.5, wallThick, canalWallMat);
      bankFront.position.set(0, 0.25, canalW / 2 + wallThick / 2);
      g.add(bankFront);

      // 渠底平铺石板
      const bedMat = lam({ map: cobbleTex('#706555', Math.max(1, canalLen / 3), 1, 32) });
      const bed = box(canalLen, 0.15, canalW, bedMat);
      bed.position.set(0, 0.05, 0);
      g.add(bed);

      // 清澈流动的渠水
      const cWaterMat = lam({ map: waterTex(canalLen / 4, 1), transparent: true, opacity: 0.60, depthWrite: false });
      const cWater = new THREE.Mesh(new THREE.PlaneGeometry(canalLen, canalW), cWaterMat);
      cWater.renderOrder = 5;
      cWater.rotation.x = -Math.PI / 2;
      cWater.position.set(0, 0.32, 0);
      g.add(cWater);
      anim.push({ update: (dt) => {
        if (cWaterMat.map) cWaterMat.map.offset.x -= dt * 0.15;
      } });

      // 水渠木质节水闸门 (Cedar Sluice Gate)
      const gateX = d.gateX !== undefined ? (d.gateX - canalMidX) : (-canalLen * 0.25);
      const postMat = lam({ map: cedarTex('#543015', 1, 2) });
      const gp1 = box(0.2, 1.6, 0.2, postMat); gp1.position.set(gateX, 0.8, -canalW / 2 - 0.1); g.add(gp1);
      const gp2 = box(0.2, 1.6, 0.2, postMat); gp2.position.set(gateX, 0.8, canalW / 2 + 0.1); g.add(gp2);
      const gBeam = box(0.2, 0.2, canalW + 0.4, postMat); gBeam.position.set(gateX, 1.5, 0); g.add(gBeam);
      const gateSlab = box(0.12, 0.9, canalW, postMat); gateSlab.position.set(gateX, 0.45, 0); g.add(gateSlab);
      const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16), lam({ color: '#c49a45' }));
      wheelRing.position.set(gateX, 1.7, 0);
      wheelRing.rotation.y = Math.PI / 2;
      g.add(wheelRing);

      // 过渠石板步石（Stepping Stone Bridge，方便村民跨过水渠）
      const bridgeXs = d.bridges || [-canalLen * 0.35, canalLen * 0.15];
      bridgeXs.forEach(bx => {
        const stepSlab = box(1.8, 0.24, canalW + 0.8, lam({ map: ashlarTex(PX.shade(th.stone, 0.15), 1.5, 1, 74) }));
        stepSlab.position.set(bx, 0.52, 0);
        stepSlab.userData.isWalkway = true;
        g.add(stepSlab);
      });

      g.position.set(canalMidX, d.y || 0, d.z !== undefined ? d.z : 1.8);
      root.add(g);
    } else if (d.t === 'kiln') {
      // ══════ 圆顶泥砖陶窑与陶器晾晒木架 (Beehive Adobe Kiln & Drying Rack) ══════
      const g = new THREE.Group();
      const kilnAdobeMat = lam({ map: adobeTex('#c49466', 2, 2, 91) });
      const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.5, 16), kilnAdobeMat);
      domeBase.position.y = 0.75;
      g.add(domeBase);

      const domeTop = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), kilnAdobeMat);
      domeTop.position.y = 1.5;
      g.add(domeTop);

      // 顶部排烟孔 (Chimney)
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.5, 12), lam({ color: '#5a3d24' }));
      chimney.position.y = 2.75;
      g.add(chimney);

      // 底部拱形添柴火膛口 (Firebox Opening)
      const fireHole = box(0.7, 0.8, 0.6, lam({ color: '#1a1008' }));
      fireHole.position.set(0, 0.4, 1.4);
      g.add(fireHole);

      // 火膛内发光的炭火与橙红光晕
      const coalMat = new THREE.MeshBasicMaterial({ color: '#ff6200' });
      const coals = box(0.5, 0.2, 0.35, coalMat);
      coals.position.set(0, 0.15, 1.35);
      g.add(coals);

      const fireLight = new THREE.PointLight(0xff7722, 1.6, 6);
      fireLight.position.set(0, 0.45, 1.5);
      g.add(fireLight);
      anim.push({ update: (dt, t) => {
        fireLight.intensity = 1.4 + Math.sin(t * 14) * 0.35;
        coalMat.color.setHSL(0.06 + Math.sin(t * 8) * 0.02, 1.0, 0.5 + Math.sin(t * 12) * 0.1);
      } });

      // 陶窑旁的双层雪松木陶器晾晒架 (Pottery Drying Rack)
      const rackMat = lam({ map: cedarTex('#5a361c', 1, 1) });
      const rackP1 = box(0.12, 1.6, 0.12, rackMat); rackP1.position.set(-1.8, 0.8, -0.4); g.add(rackP1);
      const rackP2 = box(0.12, 1.6, 0.12, rackMat); rackP2.position.set(-1.8, 0.8, 0.6); g.add(rackP2);
      const rackP3 = box(0.12, 1.6, 0.12, rackMat); rackP3.position.set(-3.2, 0.8, -0.4); g.add(rackP3);
      const rackP4 = box(0.12, 1.6, 0.12, rackMat); rackP4.position.set(-3.2, 0.8, 0.6); g.add(rackP4);

      const shelf1 = box(1.6, 0.08, 1.1, rackMat); shelf1.position.set(-2.5, 0.6, 0.1); g.add(shelf1);
      const shelf2 = box(1.6, 0.08, 1.1, rackMat); shelf2.position.set(-2.5, 1.2, 0.1); g.add(shelf2);

      // 架子上晾晒的未烧结陶罐与泥板
      const clayPotMat = lam({ color: '#c87848' });
      for (let pi = 0; pi < 3; pi++) {
        const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.32, 10), clayPotMat);
        cp.position.set(-2.2 - pi * 0.3, 0.76, 0.1);
        g.add(cp);
      }
      for (let pi = 0; pi < 2; pi++) {
        const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.36, 10), clayPotMat);
        cp.position.set(-2.3 - pi * 0.4, 1.38, 0.1);
        g.add(cp);
      }

      g.position.set(d.x, d.y, z); root.add(g);
    } else if (d.t === 'anvil') {
      // ══════ 青铜工匠锻炉、铁砧与淬火槽 (Bronze Blacksmith Forge & Anvil) ══════
      const g = new THREE.Group();
      const stoneMat = lam({ map: ashlarTex('#7d7367', 1, 1, 48) });
      const forgeBase = box(1.6, 0.85, 1.3, stoneMat); forgeBase.position.set(-1.1, 0.425, 0); g.add(forgeBase);
      const hearth = box(1.0, 0.25, 0.8, lam({ color: '#2a1a10' })); hearth.position.set(-1.1, 0.9, 0); g.add(hearth);

      // 炉膛内烧红的焦炭 (Glowing Coals)
      const emberMat = new THREE.MeshBasicMaterial({ color: '#ff3a00' });
      const embers = box(0.8, 0.12, 0.6, emberMat); embers.position.set(-1.1, 0.98, 0); g.add(embers);
      const forgeLight = new THREE.PointLight(0xff5511, 1.5, 5);
      forgeLight.position.set(-1.1, 1.2, 0);
      g.add(forgeLight);
      anim.push({ update: (dt, t) => {
        forgeLight.intensity = 1.3 + Math.sin(t * 16) * 0.4;
        emberMat.color.setHSL(0.04 + Math.sin(t * 10) * 0.02, 1.0, 0.45 + Math.sin(t * 15) * 0.15);
      } });

      // 厚重雪松木砧台 (Cedar Anvil Block)
      const trunkMat = lam({ map: cedarTex('#4e2b14', 1, 1) });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.65, 12), trunkMat);
      trunk.position.set(0.6, 0.325, 0.2);
      g.add(trunk);

      // 青铜重砧 (Bronze Anvil with Horn)
      const bronzeMat = new THREE.MeshStandardMaterial({ color: '#9d6836', metalness: 0.8, roughness: 0.35 });
      const anvilBody = box(0.55, 0.32, 0.32, bronzeMat); anvilBody.position.set(0.6, 0.8, 0.2); g.add(anvilBody);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 8), bronzeMat);
      horn.rotation.z = -Math.PI / 2;
      horn.position.set(0.95, 0.84, 0.2);
      g.add(horn);

      // 冷却淬火水槽 (Stone Quenching Trough)
      const qTrough = box(0.7, 0.5, 0.55, lam({ color: '#4a4038' }));
      qTrough.position.set(1.4, 0.25, -0.2);
      g.add(qTrough);
      const qWater = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.4), lam({ map: waterTex(1, 1), transparent: true, opacity: 0.60, depthWrite: false }));
      qWater.renderOrder = 5;
      qWater.rotation.x = -Math.PI / 2;
      qWater.position.set(1.4, 0.46, -0.2);
      g.add(qWater);

      // 堆叠的青铜牛皮锭 (Oxhide Bronze Ingots)
      const ingotMat = new THREE.MeshStandardMaterial({ color: '#c87834', metalness: 0.75, roughness: 0.4 });
      for (let ig = 0; ig < 3; ig++) {
        const ingot = box(0.48, 0.1, 0.26, ingotMat);
        ingot.position.set(-0.1, 0.05 + ig * 0.1, 0.5);
        g.add(ingot);
      }

      g.position.set(d.x, d.y, z); root.add(g);
    } else if (d.t === 'bakery') {
      // ══════ 公共泥质烘焙烤炉与麦饼摊 (Mud Tandoor Bakery & Peel) ══════
      const g = new THREE.Group();
      const mudMat = lam({ map: adobeTex('#cf9e6e', 1, 1, 67) });
      const oven = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.85, 1.1, 14), mudMat);
      oven.position.y = 0.55;
      g.add(oven);

      const topRim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 8, 16), mudMat);
      topRim.rotation.x = Math.PI / 2;
      topRim.position.y = 1.1;
      g.add(topRim);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.4, 12), new THREE.MeshBasicMaterial({ color: '#ff6600' }));
      hole.rotation.x = -Math.PI / 2;
      hole.position.y = 1.08;
      g.add(hole);

      const bLight = new THREE.PointLight(0xff8833, 1.2, 4);
      bLight.position.set(0, 1.2, 0);
      g.add(bLight);
      anim.push({ update: (dt, t) => { bLight.intensity = 1.0 + Math.sin(t * 12) * 0.25; } });

      // 柴火堆 (Firewood Stack)
      const woodMat = lam({ map: cedarTex('#5c381e', 1, 1) });
      for (let l = 0; l < 5; l++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 8), woodMat);
        log.rotation.z = Math.PI / 2;
        log.position.set(0.9, 0.09 + (l % 2) * 0.16, (l * 0.18) - 0.36);
        g.add(log);
      }

      // 木质烤面包铲 (Baker's Peel)
      const peelMat = lam({ color: '#b58548' });
      const peelHandle = box(0.06, 1.5, 0.06, peelMat);
      peelHandle.position.set(-0.85, 0.7, 0.1);
      peelHandle.rotation.z = 0.25;
      g.add(peelHandle);
      const peelBoard = box(0.32, 0.42, 0.04, peelMat);
      peelBoard.position.set(-0.68, 1.35, 0.1);
      peelBoard.rotation.z = 0.25;
      g.add(peelBoard);

      // 盛放刚出炉麦饼的藤条浅筐 (Basket with Flatbreads)
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.22, 12), lam({ color: '#a67c48' }));
      basket.position.set(-0.7, 0.11, 0.6);
      g.add(basket);
      const breadMat = lam({ color: '#e3a558' });
      for (let br = 0; br < 3; br++) {
        const flatbread = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 10), breadMat);
        flatbread.position.set(-0.7 + br * 0.04, 0.2 + br * 0.05, 0.6);
        g.add(flatbread);
      }

      g.position.set(d.x, d.y, z); root.add(g);
    } else if (d.t === 'market_stall') {
      // ══════ 近东条纹篷布市集货摊 (Near-Eastern Market Stall) ══════
      const g = new THREE.Group();
      const timberMat = lam({ map: cedarTex('#5a361c', 1, 1) });
      const canopyMat = lam({ map: textileTex(d.c1 || '#b83226', d.c2 || '#e2ab3c', d.c3 || '#2a5a78', 2, 1), side: THREE.DoubleSide });

      const w = d.w || 3.2, h = d.h || 2.5, depth = 1.6;
      [-w / 2 + 0.15, w / 2 - 0.15].forEach(px => {
        [-depth / 2 + 0.15, depth / 2 - 0.15].forEach(pz => {
          const post = box(0.12, h, 0.12, timberMat);
          post.position.set(px, h / 2, pz);
          g.add(post);
        });
      });

      const beamFront = box(w, 0.12, 0.12, timberMat); beamFront.position.set(0, h, depth / 2 - 0.15); g.add(beamFront);
      const beamBack = box(w, 0.12, 0.12, timberMat); beamBack.position.set(0, h + 0.3, -depth / 2 + 0.15); g.add(beamBack);

      const canopy = box(w + 0.25, 0.06, depth + 0.4, canopyMat);
      canopy.position.set(0, h + 0.18, 0);
      canopy.rotation.x = 0.18;
      g.add(canopy);

      const table = box(w - 0.4, 0.8, depth * 0.6, timberMat);
      table.position.set(0, 0.4, 0);
      g.add(table);

      const dateBasket = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.26, 10), lam({ color: '#8c5e32' }));
      dateBasket.position.set(-0.6, 0.93, 0);
      g.add(dateBasket);
      const dateFruit = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), lam({ color: '#d95b26' }));
      dateFruit.position.set(-0.6, 1.05, 0);
      g.add(dateFruit);

      const jar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.42, 10), lam({ color: '#3a729e' }));
      jar1.position.set(0.4, 1.01, 0.1);
      g.add(jar1);

      g.position.set(d.x, d.y, z); root.add(g);
    } else if (d.t === 'field') {
      // ══════ 两河大麦阶梯农田与灌溉田埂 (Terraced Barley Field) ══════
      const g = new THREE.Group();
      const x1 = d.x1 !== undefined ? d.x1 : -18;
      const x2 = d.x2 !== undefined ? d.x2 : -8;
      const fW = x2 - x1;
      const fMidX = (x1 + x2) / 2;
      const fDepth = d.depth || 4.2;
      const soilMat = lam({ map: adobeTex('#5a3d24', Math.max(1, fW / 3), 2, 88) });
      const soilBed = box(fW, 0.35, fDepth, soilMat);
      soilBed.position.set(0, 0.175, 0);
      soilBed.userData.isFloor = true;
      soilBed.userData.isGround = true;
      g.add(soilBed);

      // 垄沟石砌护垄 (Field Ridge Stones)
      const ridgeMat = lam({ map: cobbleTex('#7d6850', Math.max(1, fW / 2), 1, 41) });
      const ridgeFront = box(fW + 0.4, 0.45, 0.3, ridgeMat);
      ridgeFront.position.set(0, 0.225, fDepth / 2 + 0.15);
      g.add(ridgeFront);
      const ridgeBack = box(fW + 0.4, 0.45, 0.3, ridgeMat);
      ridgeBack.position.set(0, 0.225, -fDepth / 2 - 0.15);
      g.add(ridgeBack);

      // 金黄大麦麦浪（多排随风摇曳的麦穗丛）
      const wheatMat = lam({ color: '#e5b842' });
      const wheatMat2 = lam({ color: '#d49b28' });
      const wheatGroup = new THREE.Group();
      const rows = 4, cols = Math.floor(fW / 0.85);
      for (let r = 0; r < rows; r++) {
        const pz = -fDepth / 2 + 0.6 + r * ((fDepth - 1.2) / (rows - 1));
        for (let c = 0; c < cols; c++) {
          const px = -fW / 2 + 0.5 + c * 0.85 + (r % 2) * 0.3;
          const stalkH = 0.75 + ((c + r * 3) % 4) * 0.08;
          const stalk = box(0.12, stalkH, 0.12, (c + r) % 2 === 0 ? wheatMat : wheatMat2);
          stalk.position.set(px, 0.35 + stalkH / 2, pz);
          // 麦芒顶冠
          const ear = box(0.22, 0.26, 0.22, wheatMat);
          ear.position.set(px, 0.35 + stalkH + 0.1, pz);
          wheatGroup.add(stalk);
          wheatGroup.add(ear);
        }
      }
      g.add(wheatGroup);
      anim.push({ update: (dt, t) => {
        wheatGroup.children.forEach((mesh, idx) => {
          mesh.rotation.z = Math.sin(t * 2.8 + mesh.position.x * 1.2 + idx * 0.1) * 0.07;
          mesh.rotation.x = Math.cos(t * 2.2 + mesh.position.z * 1.5) * 0.04;
        });
      } });

      g.position.set(fMidX, d.y || 0, d.z !== undefined ? d.z : -1.8);
      root.add(g);
    } else if (d.t === 'livestock_pen') {
      // ══════ 村落牲口圈、干草槽与活泼牲口 (Livestock Pen, Sheep & Donkey) ══════
      const g = new THREE.Group();
      const x1 = d.x1 !== undefined ? d.x1 : -8;
      const x2 = d.x2 !== undefined ? d.x2 : -2;
      const pW = x2 - x1;
      const pMidX = (x1 + x2) / 2;
      const pDepth = d.depth || 3.8;
      const fenceMat = lam({ map: cedarTex('#4a2e16', 1, 1) });

      // 木栅栏四周边框
      const postSpan = 1.8;
      const numPosts = Math.ceil(pW / postSpan);
      for (let i = 0; i <= numPosts; i++) {
        const px = -pW / 2 + i * (pW / numPosts);
        const postF = box(0.14, 1.2, 0.14, fenceMat); postF.position.set(px, 0.6, pDepth / 2); g.add(postF);
        const postB = box(0.14, 1.2, 0.14, fenceMat); postB.position.set(px, 0.6, -pDepth / 2); g.add(postB);
      }
      const railFront1 = box(pW, 0.08, 0.06, fenceMat); railFront1.position.set(0, 0.45, pDepth / 2); g.add(railFront1);
      const railFront2 = box(pW, 0.08, 0.06, fenceMat); railFront2.position.set(0, 0.9, pDepth / 2); g.add(railFront2);
      const railBack1 = box(pW, 0.08, 0.06, fenceMat); railBack1.position.set(0, 0.45, -pDepth / 2); g.add(railBack1);
      const railBack2 = box(pW, 0.08, 0.06, fenceMat); railBack2.position.set(0, 0.9, -pDepth / 2); g.add(railBack2);

      // 侧向栅栏
      const sidePost1 = box(0.14, 1.2, 0.14, fenceMat); sidePost1.position.set(-pW / 2, 0.6, 0); g.add(sidePost1);
      const sideRail1 = box(0.06, 0.08, pDepth, fenceMat); sideRail1.position.set(-pW / 2, 0.45, 0); g.add(sideRail1);
      const sideRail2 = box(0.06, 0.08, pDepth, fenceMat); sideRail2.position.set(-pW / 2, 0.9, 0); g.add(sideRail2);

      // 石砌饮水槽 (Stone Watering Trough)
      const troughMat = lam({ map: ashlarTex('#736b5e', 1, 1, 19) });
      const trough = box(1.8, 0.5, 0.8, troughMat); trough.position.set(-pW * 0.25, 0.25, -pDepth * 0.2); g.add(trough);
      const trWater = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.55), lam({ map: waterTex(1, 1), transparent: true, opacity: 0.60, depthWrite: false }));
      trWater.renderOrder = 5;
      trWater.rotation.x = -Math.PI / 2;
      trWater.position.set(-pW * 0.25, 0.46, -pDepth * 0.2);
      g.add(trWater);

      // 牲口棚干草垛 (Hay Bedding)
      const hayMat = lam({ color: '#d8ab48' });
      const hayStack = box(1.6, 0.6, 1.1, hayMat); hayStack.position.set(pW * 0.3, 0.3, -pDepth * 0.25); g.add(hayStack);

      // 1. 3D 毛茸茸小绵羊 (Near-Eastern Fat-tailed Sheep)
      const sheepMat = lam({ color: '#f3ece0' });
      const sheepDarkMat = lam({ color: '#2b221a' });
      const createSheep = (ox, oz, scale = 1.0) => {
        const sheepG = new THREE.Group();
        const sBody = box(0.72 * scale, 0.52 * scale, 0.46 * scale, sheepMat);
        sBody.position.y = 0.52 * scale;
        sheepG.add(sBody);

        // 绵羊黑脸小头
        const sHeadPiv = new THREE.Group();
        sHeadPiv.position.set(0.38 * scale, 0.55 * scale, 0);
        const sHead = box(0.28 * scale, 0.26 * scale, 0.26 * scale, sheepDarkMat);
        sHead.position.set(0.12 * scale, 0, 0);
        sHeadPiv.add(sHead);
        // 小羊角/耳朵
        const earL = box(0.06 * scale, 0.08 * scale, 0.16 * scale, sheepDarkMat);
        earL.position.set(0.08 * scale, 0.1 * scale, -0.15 * scale);
        sHeadPiv.add(earL);
        const earR = box(0.06 * scale, 0.08 * scale, 0.16 * scale, sheepDarkMat);
        earR.position.set(0.08 * scale, 0.1 * scale, 0.15 * scale);
        sHeadPiv.add(earR);
        sheepG.add(sHeadPiv);

        // 细黑小羊蹄
        [[-0.22, -0.14], [-0.22, 0.14], [0.22, -0.14], [0.22, 0.14]].forEach(([lx, lz]) => {
          const leg = box(0.09 * scale, 0.32 * scale, 0.09 * scale, sheepDarkMat);
          leg.position.set(lx * scale, 0.16 * scale, lz * scale);
          sheepG.add(leg);
        });

        sheepG.position.set(ox, 0, oz);
        g.add(sheepG);
        return { group: sheepG, head: sHeadPiv };
      };

      const sheep1 = createSheep(-pW * 0.15, pDepth * 0.15, 1.05);
      const sheep2 = createSheep(-pW * 0.35, pDepth * 0.25, 0.88);
      const sheep3 = createSheep(pW * 0.05, -pDepth * 0.1, 0.95);

      // 2. 3D 憨厚劳作毛驴 (Near-Eastern Donkey)
      const donkeyG = new THREE.Group();
      const donkeyMat = lam({ color: '#7a7066' });
      const donkeyDarkMat = lam({ color: '#38312a' });
      const dMuzzleMat = lam({ color: '#d8cbbe' });

      // 驴身
      const dBody = box(1.05, 0.68, 0.52, donkeyMat); dBody.position.y = 0.68; donkeyG.add(dBody);
      // 驴颈与头
      const dHeadPiv = new THREE.Group();
      dHeadPiv.position.set(0.55, 0.75, 0);
      const dNeck = box(0.35, 0.48, 0.32, donkeyMat); dNeck.position.set(0.12, 0.2, 0); dHeadPiv.add(dNeck);
      const dHead = box(0.42, 0.34, 0.34, donkeyMat); dHead.position.set(0.32, 0.38, 0); dHeadPiv.add(dHead);
      const dMuzzle = box(0.22, 0.24, 0.28, dMuzzleMat); dMuzzle.position.set(0.56, 0.32, 0); dHeadPiv.add(dMuzzle);

      // 长耳朵
      const dEarL = box(0.08, 0.36, 0.12, donkeyDarkMat); dEarL.position.set(0.24, 0.62, -0.12); dEarL.rotation.z = -0.25; dHeadPiv.add(dEarL);
      const dEarR = box(0.08, 0.36, 0.12, donkeyDarkMat); dEarR.position.set(0.24, 0.62, 0.12); dEarR.rotation.z = -0.25; dHeadPiv.add(dEarR);
      donkeyG.add(dHeadPiv);

      // 驴腿
      [[-0.35, -0.16], [-0.35, 0.16], [0.35, -0.16], [0.35, 0.16]].forEach(([lx, lz]) => {
        const leg = box(0.12, 0.44, 0.12, donkeyDarkMat); leg.position.set(lx, 0.22, lz); donkeyG.add(leg);
      });
      // 细尾巴
      const dTail = box(0.06, 0.45, 0.06, donkeyDarkMat); dTail.position.set(-0.55, 0.55, 0); dTail.rotation.z = 0.3; donkeyG.add(dTail);

      donkeyG.position.set(pW * 0.22, 0, pDepth * 0.12);
      donkeyG.rotation.y = -0.4;
      g.add(donkeyG);

      // 动物吃草与晃头晃尾动画
      anim.push({ update: (dt, t) => {
        sheep1.head.rotation.z = Math.sin(t * 1.8) * 0.25;
        sheep2.head.rotation.z = Math.sin(t * 2.1 + 1.2) * 0.3;
        sheep3.head.rotation.z = Math.sin(t * 1.5 + 2.5) * 0.22;
        dHeadPiv.rotation.z = Math.sin(t * 1.2) * 0.15;
        dTail.rotation.x = Math.sin(t * 4.5) * 0.25;
      } });

      g.position.set(pMidX, d.y || 0, d.z !== undefined ? d.z : -0.8);
      root.add(g);
    } else if (d.t === 'fig_bush') {
      // ══════ 古代无花果灌木丛 (Near-Eastern Fig Bush) ══════
      const g = new THREE.Group();
      const r = d.r || 0.95;
      const leafMat = lam({ color: '#2d6b31' });
      const leafMat2 = lam({ color: '#3d823e' });
      const figMat = lam({ color: '#5e234d' });

      // 簇拥饱满的灌木叶球
      const b1 = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.8), leafMat); b1.position.set(0, r * 0.7, 0); g.add(b1);
      const b2 = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.65), leafMat2); b2.position.set(-r * 0.45, r * 0.6, 0.15); g.add(b2);
      const b3 = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.6), leafMat); b3.position.set(r * 0.45, r * 0.55, -0.15); g.add(b3);

      // 结出的深紫红无花果浆果
      for (let fi = 0; fi < 5; fi++) {
        const fig = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), figMat);
        const ang = fi * 1.25;
        fig.position.set(Math.cos(ang) * r * 0.65, r * 0.5 + Math.sin(ang * 2) * 0.15, Math.sin(ang) * r * 0.65);
        g.add(fig);
      }

      g.position.set(d.x, d.y || 0, z); root.add(g);
    } else if (d.t === 'acacia') {
      // ══════ 美索不达米亚平顶伞状金合欢树 (Mesopotamian Umbrella Acacia) ══════
      const g = new THREE.Group();
      const trunkMat = lam({ map: cedarTex('#5a3a22', 0.5, 3, 31) });
      const leafMat = lam({ color: '#4d7c38', side: THREE.DoubleSide });
      const leafMatLight = lam({ color: '#689e4c', side: THREE.DoubleSide });
      const blossomMat = lam({ color: '#f5d442', emissive: new THREE.Color('#947b1a'), emissiveIntensity: 0.3 });

      const treeH = d.h || 4.8;
      // 扭曲向上的主干
      const trunk1 = box(0.38, treeH * 0.55, 0.38, trunkMat);
      trunk1.position.y = treeH * 0.275;
      trunk1.rotation.z = 0.08;
      g.add(trunk1);

      // 3 个分叉枝干，向两侧与纵深伞状伸展
      const branches = [
        { dx: -0.9, dy: treeH * 0.72, dz: -0.2, rotZ: 0.65, rotY: 0.2, len: treeH * 0.42, r: 1.8 },
        { dx: 0.85, dy: treeH * 0.75, dz: 0.3, rotZ: -0.62, rotY: -0.4, len: treeH * 0.45, r: 2.1 },
        { dx: 0.1, dy: treeH * 0.82, dz: -0.4, rotZ: 0.15, rotY: 1.5, len: treeH * 0.38, r: 1.9 }
      ];

      branches.forEach((b) => {
        const bTrunk = box(0.24, b.len, 0.24, trunkMat);
        bTrunk.position.set(b.dx * 0.5, treeH * 0.5 + (b.dy - treeH * 0.5) * 0.5, b.dz * 0.5);
        bTrunk.rotation.z = b.rotZ;
        bTrunk.rotation.y = b.rotY;
        g.add(bTrunk);

        // 扁平的层次化水平伞顶树冠 (Layered Umbrella Canopies)
        for (let l = 0; l < 2; l++) {
          const padR = b.r * (1 - l * 0.22);
          const canopyPad = new THREE.Mesh(
            new THREE.CylinderGeometry(padR * 0.88, padR, 0.22, 12),
            l === 0 ? leafMat : leafMatLight
          );
          canopyPad.position.set(b.dx, b.dy + l * 0.28, b.dz);
          g.add(canopyPad);
        }

        // 金色合欢绒花点缀
        for (let fi = 0; fi < 3; fi++) {
          const fang = fi * 2.1;
          const fl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), blossomMat);
          fl.position.set(b.dx + Math.cos(fang) * b.r * 0.65, b.dy + 0.32, b.dz + Math.sin(fang) * b.r * 0.65);
          g.add(fl);
        }
      });

      g.position.set(d.x, d.y || 0, z); root.add(g);
      anim.push({ update: (dt, t) => { g.rotation.z = Math.sin(t * 1.1 + d.x) * 0.02; } });
    } else if (d.t === 'olive') {
      // ══════ 古老苍虬扭曲橄榄树 (Ancient Gnarled Olive Tree) ══════
      const g = new THREE.Group();
      const trunkMat = lam({ map: ashlarTex('#6b6155', 1, 2, 73) });
      const foliageMat = lam({ color: '#587554', side: THREE.DoubleSide });
      const foliageMat2 = lam({ color: '#73916e', side: THREE.DoubleSide });
      const oliveMat = lam({ color: '#251b29' });

      // 盘根错节的中空古老树干
      const t1 = box(0.55, 1.8, 0.52, trunkMat); t1.position.set(0, 0.9, 0); t1.rotation.y = 0.4; g.add(t1);
      const t2 = box(0.35, 1.4, 0.32, trunkMat); t2.position.set(-0.35, 1.4, 0.1); t2.rotation.z = 0.45; g.add(t2);
      const t3 = box(0.32, 1.3, 0.32, trunkMat); t3.position.set(0.38, 1.35, -0.1); t3.rotation.z = -0.42; g.add(t3);

      // 银绿色的圆顶树冠云块
      const crowns = [
        { x: -0.6, y: 2.3, z: 0.1, r: 1.15, m: foliageMat },
        { x: 0.55, y: 2.2, z: -0.15, r: 1.25, m: foliageMat2 },
        { x: 0.0, y: 2.65, z: 0.0, r: 1.35, m: foliageMat }
      ];
      crowns.forEach(c => {
        const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(c.r), c.m);
        sphere.position.set(c.x, c.y, c.z);
        sphere.scale.set(1.2, 0.75, 1.1);
        g.add(sphere);
      });

      // 枝下挂垂的小巧黑橄榄果实
      for (let oi = 0; oi < 6; oi++) {
        const oMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), oliveMat);
        oMesh.scale.set(0.8, 1.3, 0.8);
        const ang = oi * 1.05;
        oMesh.position.set(Math.cos(ang) * 0.9, 1.85 + (oi % 2) * 0.15, Math.sin(ang) * 0.7);
        g.add(oMesh);
      }

      g.position.set(d.x, d.y || 0, z); root.add(g);
      anim.push({ update: (dt, t) => { g.rotation.y = Math.sin(t * 0.7 + d.x) * 0.015; } });
    } else if (d.t === 'reeds') {
      // ══════ 水岸挺拔芦苇与香蒲丛 (Riverside Reeds & Bulrushes) ══════
      const g = new THREE.Group();
      const reedStemMat = lam({ color: '#557d38' });
      const cattailMat = lam({ color: '#4a2e1b' });
      const numReeds = d.count || 10;
      const spreadW = d.w || 2.2;

      for (let ri = 0; ri < numReeds; ri++) {
        const rx = -spreadW / 2 + (ri / (numReeds - 1)) * spreadW + (Math.sin(ri * 13) * 0.15);
        const rz = (ri % 2 === 0 ? 0.2 : -0.2) + Math.cos(ri * 7) * 0.12;
        const stemH = 1.3 + ((ri * 3) % 5) * 0.18;

        const stem = box(0.04, stemH, 0.04, reedStemMat);
        stem.position.set(rx, stemH / 2, rz);
        g.add(stem);

        // 顶端深褐天鹅绒香蒲头 (Bulrush Head)
        if (ri % 2 === 0) {
          const spikeH = 0.32;
          const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, spikeH, 8), cattailMat);
          spike.position.set(rx, stemH - spikeH / 2 + 0.05, rz);
          g.add(spike);
        }
      }

      g.position.set(d.x, d.y || 0, z); root.add(g);
      anim.push({ update: (dt, t) => {
        g.children.forEach((mesh, idx) => {
          mesh.rotation.z = Math.sin(t * 2.4 + mesh.position.x * 2.0 + idx * 0.2) * 0.08;
        });
      } });
    } else if (d.t === 'hanging_vines') {
      // ══════ 悬崖垂壁常春藤与古老蔓藤 (Cascading Cliffside Vines) ══════
      const g = new THREE.Group();
      const vineMat = lam({ color: '#2b5c22', side: THREE.DoubleSide });
      const vineMatLight = lam({ color: '#3d7830', side: THREE.DoubleSide });
      const flowerMat = lam({ color: '#fef08a', emissive: new THREE.Color('#854d0e'), emissiveIntensity: 0.25 });
      const dropH = d.h || 2.6;
      const strands = d.strands || 5;
      const strandW = d.w || 2.4;

      for (let s = 0; s < strands; s++) {
        const sx = -strandW / 2 + (s / Math.max(1, strands - 1)) * strandW;
        const sDrop = dropH * (0.65 + ((s * 3) % 4) * 0.12);
        // 主茎藤条
        const vineCord = box(0.045, sDrop, 0.045, vineMat);
        vineCord.position.set(sx, -sDrop / 2, 0.06);
        g.add(vineCord);

        // 沿藤条散落的叠落叶片簇 (Ivy Leaf Clusters)
        const numLeafClumps = Math.floor(sDrop / 0.48);
        for (let l = 0; l < numLeafClumps; l++) {
          const ly = -0.2 - l * 0.46;
          const lMat = (s + l) % 2 === 0 ? vineMat : vineMatLight;
          const leafClump = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + (l % 2) * 0.05), lMat);
          leafClump.scale.set(1.2, 0.6, 0.8);
          leafClump.position.set(sx + ((l % 2 === 0) ? 0.07 : -0.07), ly, 0.08);
          g.add(leafClump);

          // 点缀淡黄藤花
          if ((s + l) % 3 === 0) {
            const fl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 5), flowerMat);
            fl.position.set(sx + ((l % 2 === 0) ? 0.11 : -0.11), ly - 0.04, 0.11);
            g.add(fl);
          }
        }
      }

      g.position.set(d.x, d.y || 0, (d.z !== undefined) ? d.z : -0.18);
      root.add(g);
      anim.push({ update: (dt, t) => {
        g.children.forEach((mesh, idx) => {
          mesh.rotation.x = Math.sin(t * 1.5 + mesh.position.x * 2.5 + idx * 0.15) * 0.05;
        });
      } });
    } else if (d.t === 'pomegranate_bush') {
      // ══════ 石榴花果灌木 (Pomegranate Bush with Scarlet Blossoms & Fruit) ══════
      const g = new THREE.Group();
      const r = d.r || 0.9;
      const foliageMat = lam({ color: '#2c6b29' });
      const foliageMat2 = lam({ color: '#448c3e' });
      const blossomMat = lam({ color: '#e53924', emissive: new THREE.Color('#8a1508'), emissiveIntensity: 0.35 });
      const fruitMat = lam({ color: '#a61c28' });

      // 灌木球簇
      const b1 = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.75), foliageMat); b1.position.set(0, r * 0.7, 0); g.add(b1);
      const b2 = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.6), foliageMat2); b2.position.set(-r * 0.4, r * 0.55, 0.15); g.add(b2);
      const b3 = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.55), foliageMat); b3.position.set(r * 0.4, r * 0.5, -0.12); g.add(b3);

      // 鲜红石榴花与红宝石石榴
      for (let pi = 0; pi < 6; pi++) {
        const ang = pi * 1.1;
        const px = Math.cos(ang) * r * 0.65;
        const py = r * 0.45 + (pi % 2) * 0.25;
        const pz = Math.sin(ang) * r * 0.65;
        if (pi % 2 === 0) {
          // 石榴果
          const pom = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), fruitMat);
          pom.position.set(px, py, pz);
          g.add(pom);
          const crown = box(0.06, 0.06, 0.06, blossomMat);
          crown.position.set(px, py - 0.12, pz);
          g.add(crown);
        } else {
          // 绯红石榴花
          const flower = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 6), blossomMat);
          flower.position.set(px, py, pz);
          flower.rotation.z = Math.PI;
          g.add(flower);
        }
      }

      g.position.set(d.x, d.y || 0, z); root.add(g);
      anim.push({ update: (dt, t) => { g.rotation.z = Math.sin(t * 1.2 + d.x) * 0.02; } });
    } else if (d.t === 'potted_palm') {
      // ══════ 美索不达米亚两河庭院/阶梯盆栽棕榈 (Courtyard Potted Dwarf Palm) ══════
      const g = new THREE.Group();
      const potColor = d.potColor || '#c46232';
      const potMat = lam({ color: potColor });
      const rimMat = lam({ color: PX.shade(potColor, 0.15) });
      const soilMat = lam({ color: '#2a1d14' });
      const trunkMat = lam({ map: cedarTex('#6b401e', 0.5, 1, 19) });
      const frondMat = lam({ color: '#3d7829', side: THREE.DoubleSide });
      const frondMatLight = lam({ color: '#56963c', side: THREE.DoubleSide });
      const dateMat = lam({ color: '#d95a1e', emissive: new THREE.Color('#6a2408'), emissiveIntensity: 0.3 });

      // 陶瓮盆体与沿口 (Terracotta Urn Body & Rim)
      const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.24, 0.72, 12), potMat);
      potBody.position.y = 0.36; potBody.castShadow = true; g.add(potBody);
      const potRim = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.05, 8, 16), rimMat);
      potRim.rotation.x = Math.PI / 2; potRim.position.y = 0.72; g.add(potRim);
      // 双耳把手
      for (const side of [-1, 1]) {
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.035, 6, 12, Math.PI), rimMat);
        handle.position.set(side * 0.36, 0.52, 0);
        handle.rotation.z = side * Math.PI / 2;
        g.add(handle);
      }
      // 肥沃盆土
      const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.08, 12), soilMat);
      soil.position.y = 0.68; g.add(soil);

      // 矮棕榈主干
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.58, 8), trunkMat);
      trunk.position.set(0.02, 0.95, 0); trunk.rotation.z = -0.06; g.add(trunk);

      // 金红椰枣果串
      const cluster = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), dateMat);
      cluster.scale.set(0.8, 1.3, 0.8);
      cluster.position.set(0.12, 1.15, 0.08);
      g.add(cluster);

      // 放射状羽状小棕榈叶片
      const frondGroup = new THREE.Group();
      frondGroup.position.set(0.04, 1.22, 0);
      for (let fi = 0; fi < 7; fi++) {
        const fPiv = new THREE.Group();
        fPiv.rotation.y = fi * (Math.PI * 2 / 7);
        fPiv.rotation.z = -0.48 - (fi % 2) * 0.12;
        const leaf = box(1.2, 0.04, 0.34, fi % 2 === 0 ? frondMat : frondMatLight);
        leaf.position.set(0.6, 0, 0);
        fPiv.add(leaf);
        frondGroup.add(fPiv);
      }
      // 中央直立初生嫩叶
      const spear = box(0.12, 0.6, 0.12, frondMatLight);
      spear.position.set(0, 0.3, 0);
      frondGroup.add(spear);
      g.add(frondGroup);

      g.position.set(d.x, d.y || 0, z); root.add(g);
      anim.push({ update: (dt, t) => { frondGroup.rotation.y = Math.sin(t * 0.8 + d.x) * 0.03; frondGroup.rotation.z = Math.sin(t * 1.1 + d.x) * 0.02; } });
    } else if (d.t === 'potted_plant') {
      // ══════ 彩釉/陶土花卉香草盆栽 (Terracotta & Glazed Floral Urn) ══════
      const g = new THREE.Group();
      const potColor = d.potColor || '#c46232';
      const flowerColor = d.flowerColor || '#e54868';
      const potMat = lam({ color: potColor });
      const rimMat = lam({ color: PX.shade(potColor, 0.18) });
      const soilMat = lam({ color: '#2d1e14' });
      const leafMat = lam({ color: '#387332' });
      const leafMat2 = lam({ color: '#4d8f45' });
      const bloomMat = lam({ color: flowerColor, emissive: new THREE.Color(flowerColor), emissiveIntensity: 0.3 });

      // 陶罐体
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 0.52, 10), potMat);
      pot.position.y = 0.26; pot.castShadow = true; g.add(pot);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.04, 6, 14), rimMat);
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.52; g.add(rim);
      const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 10), soilMat);
      soil.position.y = 0.49; g.add(soil);

      // 簇状灌木花球
      const b1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38), leafMat); b1.position.set(0, 0.72, 0); g.add(b1);
      const b2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28), leafMat2); b2.position.set(-0.16, 0.65, 0.1); g.add(b2);
      const b3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25), leafMat); b3.position.set(0.15, 0.62, -0.08); g.add(b3);

      // 繁茂盛开的彩色花蕾
      for (let bi = 0; bi < 7; bi++) {
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), bloomMat);
        const ang = bi * 0.95;
        const rad = 0.28 + (bi % 3) * 0.08;
        fl.position.set(Math.cos(ang) * rad, 0.65 + (bi % 2) * 0.18, Math.sin(ang) * rad);
        g.add(fl);
      }
      // 垂挂在罐沿外的常春藤卷须
      for (let vi = 0; vi < 2; vi++) {
        const vDrop = 0.28 + vi * 0.12;
        const vine = box(0.04, vDrop, 0.04, leafMat);
        vine.position.set(-0.18 + vi * 0.32, 0.48 - vDrop / 2, 0.24);
        g.add(vine);
      }

      g.position.set(d.x, d.y || 0, z); root.add(g);
      anim.push({ update: (dt, t) => { g.rotation.y = Math.sin(t * 0.7 + d.x) * 0.02; } });
    } else if (d.t === 'stone_planter') {
      // ══════ 巴别塔悬圃与建筑天台琢石长条花槽 (Sandstone Balcony Planter Trough) ══════
      const g = new THREE.Group();
      const pw = d.w || 2.4, ph = d.h || 0.58, pd = d.d || 0.72;
      const stoneMat = lam({ map: ashlarTex(PX.shade(th.stone, 0.05), Math.max(1, pw / 2), 0.5, 52) });
      const rimMat = lam({ color: PX.shade(th.stone, 0.22) });
      const soilMat = lam({ color: '#2a1a10' });
      const shrubMat1 = lam({ color: '#2f6828' });
      const shrubMat2 = lam({ color: '#43853b' });
      const shrubMat3 = lam({ color: '#599c4f' });
      const flMatRed = lam({ color: '#e11d48', emissive: new THREE.Color('#881337'), emissiveIntensity: 0.35 });
      const flMatGold = lam({ color: '#f59e0b', emissive: new THREE.Color('#78350f'), emissiveIntensity: 0.35 });
      const flMatWhite = lam({ color: '#f8fafc', emissive: new THREE.Color('#94a3b8'), emissiveIntensity: 0.2 });

      // 琢石花槽外框 (Planter Box Exterior)
      const boxMesh = box(pw, ph, pd, stoneMat);
      boxMesh.position.y = ph / 2; boxMesh.castShadow = true; g.add(boxMesh);
      // 顶部压顶雕花线脚
      const rimMesh = box(pw + 0.08, 0.08, pd + 0.08, rimMat);
      rimMesh.position.y = ph + 0.04; g.add(rimMesh);
      // 沃土层
      const soilMesh = box(pw - 0.16, 0.08, pd - 0.16, soilMat);
      soilMesh.position.y = ph + 0.02; g.add(soilMesh);

      // 槽内多丛并植的灌木与花卉 (Layered Hedgerow Shrubbery)
      const numShrubs = Math.max(3, Math.floor(pw / 0.65));
      const mats = [shrubMat1, shrubMat2, shrubMat3];
      const flMats = [flMatRed, flMatGold, flMatWhite];
      for (let si = 0; si < numShrubs; si++) {
        const sx = -pw / 2 + 0.35 + si * ((pw - 0.7) / Math.max(1, numShrubs - 1));
        const sz = (si % 2 === 0 ? 0.08 : -0.08);
        const sr = 0.28 + (si % 2) * 0.08;
        const clump = new THREE.Mesh(new THREE.DodecahedronGeometry(sr), mats[si % mats.length]);
        clump.position.set(sx, ph + sr * 0.75, sz);
        clump.scale.set(1.1, 0.85, 0.95);
        g.add(clump);

        // 朵朵繁花
        for (let fi = 0; fi < 3; fi++) {
          const fl = new THREE.Mesh(new THREE.SphereGeometry(0.065, 5, 5), flMats[(si + fi) % flMats.length]);
          const fang = fi * 2.1;
          fl.position.set(sx + Math.cos(fang) * sr * 0.75, ph + sr * 0.9 + (fi % 2) * 0.08, sz + Math.sin(fang) * sr * 0.75);
          g.add(fl);
        }

        // 溢出石槽边缘垂落的绿叶卷须 (Spilling Cascading Tendrils)
        if (si % 2 === 0) {
          const dropL = 0.35 + (si % 3) * 0.15;
          const vine = box(0.05, dropL, 0.05, mats[si % mats.length]);
          vine.position.set(sx + 0.1, ph - dropL / 2 + 0.05, pd / 2 + 0.04);
          g.add(vine);
          const leafNode = new THREE.Mesh(new THREE.DodecahedronGeometry(0.10), mats[(si + 1) % mats.length]);
          leafNode.position.set(sx + 0.1, ph - dropL + 0.05, pd / 2 + 0.06);
          g.add(leafNode);
        }
      }

      g.position.set(d.x, d.y || 0, z); root.add(g);
    } else if (d.t === 'oleander_bush') {
      // ══════ 美索不达米亚两河岸边夹竹桃繁花灌木丛 (Near-Eastern Flowering Oleander) ══════
      const g = new THREE.Group();
      const r = d.r || 0.95;
      const leafMat = lam({ color: '#275924' });
      const leafMat2 = lam({ color: '#3b7834' });
      const blossomMat = lam({ color: '#f43f5e', emissive: new THREE.Color('#9f1239'), emissiveIntensity: 0.35 });
      const blossomMatPink = lam({ color: '#fda4af', emissive: new THREE.Color('#be123c'), emissiveIntensity: 0.25 });

      // 繁茂叶团
      const b1 = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.8), leafMat); b1.position.set(0, r * 0.65, 0); g.add(b1);
      const b2 = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.62), leafMat2); b2.position.set(-r * 0.45, r * 0.55, 0.12); g.add(b2);
      const b3 = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.58), leafMat); b3.position.set(r * 0.42, r * 0.5, -0.15); g.add(b3);

      // 盛开的夹竹桃花伞花序
      for (let bi = 0; bi < 8; bi++) {
        const bMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), bi % 2 === 0 ? blossomMat : blossomMatPink);
        const ang = bi * 0.88;
        bMesh.position.set(Math.cos(ang) * r * 0.68, r * 0.55 + (bi % 3) * 0.14, Math.sin(ang) * r * 0.62);
        g.add(bMesh);
      }

      g.position.set(d.x, d.y || 0, z); root.add(g);
      anim.push({ update: (dt, t) => { g.rotation.z = Math.sin(t * 1.1 + d.x) * 0.02; } });
    } else if (d.t === 'desert_flora') {
      // ══════ 荒原岩隙丛草与旱生小花丛 (Desert Steppe Grass Tufts & Wildflowers) ══════
      const g = new THREE.Group();
      const grassMat1 = lam({ color: '#7a8e45' });
      const grassMat2 = lam({ color: '#96a858' });
      const stoneMat = lam({ color: '#baa892' });
      const flowerMat = lam({ color: '#facc15', emissive: new THREE.Color('#854d0e'), emissiveIntensity: 0.3 });

      // 衬托的自然荒漠卵石
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18), stoneMat);
      rock.scale.set(1.4, 0.7, 1.1);
      rock.position.set(-0.15, 0.1, 0);
      g.add(rock);

      // 放射状荒原刺芒草丛 (Spiky Grass Blades)
      for (let bi = 0; bi < 6; bi++) {
        const bladeH = 0.45 + (bi % 3) * 0.12;
        const blade = box(0.04, bladeH, 0.04, bi % 2 === 0 ? grassMat1 : grassMat2);
        const ang = bi * 1.05;
        blade.position.set(Math.cos(ang) * 0.22, bladeH / 2, Math.sin(ang) * 0.22);
        blade.rotation.z = (Math.random() - 0.5) * 0.35;
        blade.rotation.x = (Math.random() - 0.5) * 0.35;
        g.add(blade);
      }
      // 点缀金色沙漠小雏菊
      for (let fi = 0; fi < 3; fi++) {
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), flowerMat);
        const fang = fi * 2.1 + 0.3;
        fl.position.set(Math.cos(fang) * 0.18, 0.38 + fi * 0.05, Math.sin(fang) * 0.18);
        g.add(fl);
      }

      g.position.set(d.x, d.y || 0, z); root.add(g);
    } else if (d.t === 'bazaar_tent') {
      // ══════ 行商集市专属条纹货摊大篷与商队物资 (Caravan Bazaar Trade Tent) ══════
      const g = new THREE.Group();
      const timberMat = lam({ map: cedarTex('#5a361c', 1, 1) });
      const awningMat = lam({ map: textileTex('#9e2820', '#dfb142', '#1f4868', 2, 1), side: THREE.DoubleSide });

      const w = d.w || 4.2, h = d.h || 2.7, depth = 2.2;
      // 四角雪松立柱
      [-w / 2 + 0.2, w / 2 - 0.2].forEach(px => {
        [-depth / 2 + 0.2, depth / 2 - 0.2].forEach(pz => {
          const post = box(0.14, h, 0.14, timberMat);
          post.position.set(px, h / 2, pz);
          g.add(post);
        });
      });

      // 顶部人字形屋脊梁与彩色遮阳篷
      const ridgeBeam = box(w + 0.3, 0.14, 0.14, timberMat);
      ridgeBeam.position.set(0, h + 0.45, 0);
      g.add(ridgeBeam);
      const roofL = box(w + 0.2, 0.06, depth * 0.65, awningMat);
      roofL.position.set(0, h + 0.24, -depth * 0.25);
      roofL.rotation.x = 0.38;
      g.add(roofL);
      const roofR = box(w + 0.2, 0.06, depth * 0.65, awningMat);
      roofR.position.set(0, h + 0.24, depth * 0.25);
      roofR.rotation.x = -0.38;
      g.add(roofR);

      // 货台与天平秤 (Trader's Counter & Balance Scale)
      const counter = box(w - 0.6, 0.85, depth * 0.45, timberMat);
      counter.position.set(0, 0.425, 0);
      g.add(counter);

      // 青铜天平称 (Bronze Merchant Scale)
      const bronzeMat = new THREE.MeshStandardMaterial({ color: '#d49b42', metalness: 0.8, roughness: 0.3 });
      const scaleStand = box(0.06, 0.6, 0.06, bronzeMat); scaleStand.position.set(0.6, 1.15, 0); g.add(scaleStand);
      const scaleBeam = box(0.5, 0.04, 0.04, bronzeMat); scaleBeam.position.set(0.6, 1.45, 0); g.add(scaleBeam);
      const panL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.04, 8), bronzeMat); panL.position.set(0.42, 1.25, 0); g.add(panL);
      const panR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.04, 8), bronzeMat); panR.position.set(0.78, 1.25, 0); g.add(panR);

      // 货架上的香料陶瓮与椰枣干果
      const spiceMat1 = lam({ color: '#c93b2b' }); // 红色藏红花
      const spiceMat2 = lam({ color: '#e5a828' }); // 黄色姜黄
      const pot1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.4, 10), lam({ color: '#a8683c' })); pot1.position.set(-0.8, 1.05, 0.1); g.add(pot1);
      const pTop1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), spiceMat1); pTop1.position.set(-0.8, 1.22, 0.1); g.add(pTop1);
      const pot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.1, 0.36, 10), lam({ color: '#3a6888' })); pot2.position.set(-0.35, 1.03, -0.05); g.add(pot2);
      const pTop2 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), spiceMat2); pTop2.position.set(-0.35, 1.18, -0.05); g.add(pTop2);

      // 悬挂在帐篷前檐的“以物易物商行”挂牌
      const signMat = lam({ map: cedarTex('#3e2210', 1, 1) });
      const sign = box(1.8, 0.38, 0.06, signMat);
      sign.position.set(0, h + 0.1, depth / 2 + 0.05);
      g.add(sign);

      g.position.set(d.x, d.y || 0, z); root.add(g);
    } else if (d.t === 'waterwheel' || d.t === 'noria_waterwheel') {
      const g = new THREE.Group();
      const wm = lam({ color: '#7a5030' });
      const woodDark = lam({ color: '#4a3020' });
      const rotor = new THREE.Group();
      const rim = new THREE.Mesh(new THREE.TorusGeometry(d.r, 0.16, 6, 28), wm); rotor.add(rim);
      const rim2 = rim.clone(); rim2.position.z = 0.9; rotor.add(rim2);
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        const sp = box(d.r * 2, 0.14, 0.14, wm); sp.rotation.z = a; sp.position.z = 0.45; if (i < 6) rotor.add(sp);
        const pad = box(0.9, 0.12, 1.1, lam({ color: '#9a6a3a' })); pad.position.set(Math.cos(a) * d.r, Math.sin(a) * d.r, 0.45); pad.rotation.z = a + Math.PI / 2; rotor.add(pad);
        // 古法舀水陶罐
        const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.35, 8), lam({ color: '#b46838' }));
        bucket.position.set(Math.cos(a) * (d.r + 0.12), Math.sin(a) * (d.r + 0.12), 0.45);
        bucket.rotation.z = a;
        rotor.add(bucket);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 10), woodDark); hub.rotation.x = Math.PI / 2; hub.position.z = 0.45; rotor.add(hub);
      g.add(rotor);

      // 人字形固定支承龙门架 (Stationary A-frame Gantry Supports)
      const gantry = new THREE.Group();
      for (let sideZ of [-0.25, 1.15]) {
        const leg1 = box(0.24, d.r * 2.2, 0.24, woodDark); leg1.position.set(-d.r * 0.45, -d.r * 0.2, sideZ); leg1.rotation.z = 0.35; gantry.add(leg1);
        const leg2 = box(0.24, d.r * 2.2, 0.24, woodDark); leg2.position.set(d.r * 0.45, -d.r * 0.2, sideZ); leg2.rotation.z = -0.35; gantry.add(leg2);
        const cross = box(d.r * 1.4, 0.18, 0.18, wm); cross.position.set(0, -d.r * 0.6, sideZ); gantry.add(cross);
      }
      g.add(gantry);

      g.position.set(d.x, d.y, z); root.add(g);
      anim.push({ update: (dt) => { rotor.rotation.z -= dt * 0.45; } });
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
      // ══════ 苏美尔/阿卡德黑曜闪长岩皇家巨像（皇家黑曜玄武岩 + 贴金楔形文字铭文 + 琢石双层基座） ══════
      const g = new THREE.Group();
      // 基座采用琢石方砖 Ashlar Stone
      const pedBaseMat = lam({ map: ashlarTex('#7d776d', 1.8, 0.6, 51) });
      const pedTopMat = lam({ map: ashlarTex('#918a7e', 1.4, 0.8, 52) });

      // 雕像本体采用皇家深黑黑曜闪长岩（Basalt/Diorite）与贴金铭文饰带
      const basaltBodyMat = lam({ map: basaltTex(42), color: '#383532' });
      const basaltAccMat = lam({ color: '#201e1c' });
      const goldCuneiformMat = lam({ color: '#ffd24a', emissive: new THREE.Color('#946b18'), emissiveIntensity: 0.55 });

      // 1. 双层琢石基座
      const pedBase = box(2.4, 0.4, 2.0, pedBaseMat); pedBase.position.y = 0.2; g.add(pedBase);
      const pedTop = box(1.8, 0.85, 1.5, pedTopMat); pedTop.position.y = 0.4 + 0.425; g.add(pedTop);

      // 基座正前方的楔形文字黄金铭文石板
      const plate = box(1.05, 0.52, 0.08, goldCuneiformMat); plate.position.set(0, 0.82, 0.76); g.add(plate);

      // 2. 英雄像素小人黑曜岩立像
      const figure = new THREE.Group();
      const baseY = 1.25;

      // 双脚（深黑闪长岩石靴）
      const footL = box(0.26, 0.3, 0.4, basaltAccMat); footL.position.set(-0.24, baseY + 0.15, 0.06); figure.add(footL);
      const footR = box(0.26, 0.3, 0.4, basaltAccMat); footR.position.set(0.24, baseY + 0.15, 0.06); figure.add(footR);

      // 下摆流苏长袍（带有两河古法褶皱）
      const skirt = box(0.76, 0.72, 0.52, basaltBodyMat); skirt.position.set(0, baseY + 0.62, 0); figure.add(skirt);

      // 腰部贴金铭文腰带
      const goldBelt = box(0.8, 0.16, 0.56, goldCuneiformMat); goldBelt.position.set(0, baseY + 0.96, 0); figure.add(goldBelt);

      // 上身胸甲与厚重祭司披肩
      const chest = box(0.72, 0.68, 0.48, basaltBodyMat); chest.position.set(0, baseY + 1.25, 0); figure.add(chest);
      const cape = box(0.8, 1.2, 0.16, basaltAccMat); cape.position.set(0, baseY + 0.98, -0.26); figure.add(cape);

      // 头部、两河卷曲美髯与牛角冠冕（Horned Tiara of Divinity）
      const head = box(0.5, 0.52, 0.46, basaltBodyMat); head.position.set(0, baseY + 1.82, 0); figure.add(head);
      const beard = box(0.38, 0.38, 0.22, basaltAccMat); beard.position.set(0, baseY + 1.62, 0.24); figure.add(beard);
      const tiara = box(0.58, 0.22, 0.54, basaltAccMat); tiara.position.set(0, baseY + 2.12, 0); figure.add(tiara);
      const hornL = box(0.12, 0.26, 0.12, goldCuneiformMat); hornL.position.set(-0.32, baseY + 2.22, 0); hornL.rotation.z = -0.3; figure.add(hornL);
      const hornR = box(0.12, 0.26, 0.12, goldCuneiformMat); hornR.position.set(0.32, baseY + 2.22, 0); hornR.rotation.z = 0.3; figure.add(hornR);

      // 左臂捧着纯金镌刻的泥板律法
      const armL = box(0.2, 0.5, 0.2, basaltBodyMat); armL.position.set(-0.46, baseY + 1.28, 0.09); armL.rotation.x = -0.65; figure.add(armL);
      const tablet = box(0.36, 0.46, 0.09, goldCuneiformMat); tablet.position.set(-0.46, baseY + 1.4, 0.3); tablet.rotation.x = -0.35; figure.add(tablet);

      // 右臂执青铜权杖与翼日之冠
      const armR = box(0.2, 0.54, 0.2, basaltBodyMat); armR.position.set(0.46, baseY + 1.22, 0.06); armR.rotation.z = -0.15; figure.add(armR);
      const staff = box(0.09, 2.1, 0.09, lam({ color: '#5a3d24' })); staff.position.set(0.58, baseY + 1.15, 0.16); figure.add(staff);
      const staffTop = box(0.26, 0.26, 0.26, goldCuneiformMat); staffTop.position.set(0.58, baseY + 2.18, 0.16); figure.add(staffTop);

      g.add(figure);
      g.position.set(d.x, d.y, z); root.add(g);
    } else if (d.t === 'shelf') {
      const t = PX.tex(PX.shelfCanvas(), d.w / 2.5, d.h / 2.5);
      const m = box(d.w, d.h, 0.7, [lam({ color: '#4a2c16' }), lam({ color: '#4a2c16' }), lam({ color: '#5a3a20' }), lam({ color: '#3a2010' }), lam({ map: t }), lam({ color: '#4a2c16' })]);
      m.position.set(d.x, d.y + d.h / 2, -2.25); root.add(m);
    } else if (d.t === 'cuneiform_archives') {
      const g = new THREE.Group();
      const w = d.w || 6.0;
      const h = d.h || 4.5;
      const stoneMat = lam({ color: PX.shade(th.stone, -0.1) });
      const nicheBack = lam({ color: '#2a1e16' });
      const clayMat1 = lam({ color: '#c47838' }); // 烘烤赤褐泥板
      const clayMat2 = lam({ color: '#9b5826' }); // 太阳晒制原色泥板
      const tabletGold = lam({ color: '#d4af37', emissive: new THREE.Color('#684e12'), emissiveIntensity: 0.35 });

      // 1. 凹入式石质拱券框架 (Recessed Arched Niche Framework)
      const backWall = box(w, h, 0.3, nicheBack);
      backWall.position.set(0, h / 2, -0.6);
      g.add(backWall);

      const pLeft = box(0.45, h, 0.9, stoneMat); pLeft.position.set(-w / 2 + 0.22, h / 2, -0.2); g.add(pLeft);
      const pRight = box(0.45, h, 0.9, stoneMat); pRight.position.set(w / 2 - 0.22, h / 2, -0.2); g.add(pRight);
      const archTop = box(w, 0.45, 0.9, stoneMat); archTop.position.set(0, h - 0.22, -0.2); g.add(archTop);

      // 2. 多层石板书架与成排陈列的楔形文字泥版
      const rows = 3;
      const rowH = (h - 0.8) / rows;
      for (let r = 0; r < rows; r++) {
        const shelfY = 0.4 + r * rowH;
        const shelfPlank = box(w - 0.8, 0.12, 0.75, stoneMat);
        shelfPlank.position.set(0, shelfY, -0.2);
        g.add(shelfPlank);

        const numTablets = Math.floor((w - 1.2) / 0.55);
        for (let t = 0; t < numTablets; t++) {
          const tx = -w / 2 + 0.8 + t * 0.55;
          const isGold = (r === 1 && t === Math.floor(numTablets / 2));
          const tMat = isGold ? tabletGold : (t % 2 === 0 ? clayMat1 : clayMat2);
          const tablet = box(0.36, 0.52, 0.12, tMat);
          tablet.position.set(tx, shelfY + 0.28, -0.2 + (t % 2 === 0 ? 0.05 : -0.05));
          tablet.rotation.y = (t % 3 - 1) * 0.12;
          tablet.rotation.z = (t % 2 === 0 ? 0.05 : -0.05);
          g.add(tablet);
        }
      }

      // 3. 悬挂的小青铜油灯 (Bronze Scholar Oil Lamp)
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.18, 8), lam({ color: '#c49a45' }));
      lamp.position.set(0, h - 0.6, 0.15);
      g.add(lamp);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: '#ffd24a' }));
      flame.position.set(0, h - 0.45, 0.15);
      g.add(flame);

      g.position.set(d.x, d.y, z);
      root.add(g);
    } else if (d.t === 'celestial_altar') {
      const g = new THREE.Group();
      const lang = d.lang || 'sol';
      const langInfo = (LANG.LANGS && LANG.LANGS[lang]) || { color: '#ffd24a', glyph: '☼' };
      const altarMat = lam({ color: '#1e293b', emissive: new THREE.Color(langInfo.color), emissiveIntensity: 0.2 });
      const rimMat = lam({ color: '#334155' });
      const runeMat = new THREE.MeshBasicMaterial({ color: langInfo.color, transparent: true, opacity: 0.88 });

      // 1. 三阶神圣通天石台 (3-Tier Stepped Ziggurat Pedestal)
      const t1 = box(2.4, 0.35, 2.4, rimMat); t1.position.y = 0.175; g.add(t1);
      const t2 = box(1.8, 0.35, 1.8, altarMat); t2.position.y = 0.48; g.add(t2);
      const t3 = box(1.2, 0.35, 1.2, rimMat); t3.position.y = 0.78; g.add(t3);

      // 2. 悬浮发光神圣符文 (Floating Glowing Celestial Rune)
      const glyph = glyphPlane(langInfo.glyph, 1.2, langInfo.color);
      glyph.position.set(0, 1.7, 0.1);
      g.add(glyph);

      // 3. 旋转天体光环 (Spinning Runic Ring)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.04, 6, 32), runeMat);
      ring.position.y = 1.7;
      ring.rotation.x = Math.PI / 2;
      g.add(ring);

      // 4. 通天光束 (Divine Beacon Beam)
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.35, 18, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: langInfo.color, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })
      );
      beam.position.y = 9.8;
      g.add(beam);

      g.position.set(d.x, d.y, z);
      root.add(g);
      anim.push({
        update: (dt) => {
          ring.rotation.z += dt * 0.9;
          glyph.position.y = 1.7 + Math.sin(performance.now() * 0.002 + d.x) * 0.1;
        }
      });
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
      m.position.set((d.x1 + d.x2) / 2, d.y + 0.25, -0.9);
      m.userData.isFrontOccluder = true;
      root.add(m);
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
    } else if (d.t === 'oasis_pool') {
      // ══════ 荒漠绿洲清泉水池与水生草滩 (Turquoise Oasis Spring Pool) ══════
      const g = new THREE.Group();
      const poolW = d.w || 7.2, poolD = d.d || 4.8;
      const rimMat = lam({ map: stoneTex('#cbb390', 2, 2) });
      const rim = new THREE.Mesh(new THREE.BoxGeometry(poolW + 0.6, 0.28, poolD + 0.6), rimMat);
      rim.position.set(0, 0.08, 0);
      rim.receiveShadow = true;
      g.add(rim);

      const waterMat = new THREE.MeshStandardMaterial({
        color: '#14b8a6', roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.82
      });
      const water = new THREE.Mesh(new THREE.BoxGeometry(poolW, 0.24, poolD), waterMat);
      water.position.set(0, 0.12, 0);
      water.receiveShadow = true;
      g.add(water);

      const bedMat = lam({ color: '#0f766e' });
      const bed = new THREE.Mesh(new THREE.PlaneGeometry(poolW * 0.9, poolD * 0.9), bedMat);
      bed.rotation.x = -Math.PI / 2;
      bed.position.set(0, 0.02, 0);
      g.add(bed);

      anim.push({
        update: (dt, tt) => {
          water.position.y = 0.12 + Math.sin(tt * 2.5 + d.x) * 0.02;
        }
      });
      g.position.set(d.x, d.y || 0, d.z || 0); root.add(g);
    } else if (d.t === 'desert_shelter') {
      // ══════ 荒原避风石棚与残存营火 (Windbreak Rock Shelter & Rest Camp) ══════
      const g = new THREE.Group();
      const stoneMat = lam({ map: stoneTex('#9c836a', 2, 1) });
      const timberMat = lam({ map: cedarTex('#5a381f', 1, 1) });
      // 背风厚重风蚀巨石后壁与斜挑遮阴顶
      const backRock = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 1.2), stoneMat);
      backRock.position.set(0, 1.4, -0.6); backRock.receiveShadow = true; backRock.castShadow = true; g.add(backRock);
      const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 2.6), stoneMat);
      roofSlab.position.set(0, 2.8, 0.4); roofSlab.rotation.x = 0.15; roofSlab.receiveShadow = true; roofSlab.castShadow = true; g.add(roofSlab);
      // 前撑斜木柱
      const postL = box(0.14, 2.6, 0.14, timberMat); postL.position.set(-1.8, 1.3, 1.4); g.add(postL);
      const postR = box(0.14, 2.6, 0.14, timberMat); postR.position.set(1.8, 1.3, 1.4); g.add(postR);
      // 营地灰烬篝火石圈 (Firepit)
      const ashMat = lam({ color: '#2b231c' });
      const emberMat = new THREE.MeshBasicMaterial({ color: '#f97316' });
      const pitRim = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.22, 10), stoneMat);
      pitRim.position.set(0, 0.11, 0.8); g.add(pitRim);
      const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.18, 8), ashMat);
      ash.position.set(0, 0.13, 0.8); g.add(ash);
      const ember = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.25), emberMat);
      ember.position.set(0, 0.2, 0.8); g.add(ember);
      anim.push({
        update: (dt, tt) => {
          ember.scale.setScalar(0.85 + Math.sin(tt * 3.2) * 0.25);
        }
      });
      g.position.set(d.x, d.y || 0, d.z || 0); root.add(g);
    } else if (d.t === 'creature_ribs') {
      // ══════ 远古风蚀巨骨与盐碱河床地标 (Ancient Colossal Ribs Landmark) ══════
      const g = new THREE.Group();
      const boneMat = lam({ color: '#e8dcce' });
      const ribCount = d.count || 5;
      const spacing = 1.25;
      for (let i = 0; i < ribCount; i++) {
        const xOff = (i - (ribCount - 1) / 2) * spacing;
        const scale = 1.0 - Math.abs(i - (ribCount - 1) / 2) * 0.12;
        // 拱形巨骨
        const archGeo = new THREE.TorusGeometry(1.6 * scale, 0.16 * scale, 8, 16, Math.PI * 0.85);
        const rib = new THREE.Mesh(archGeo, boneMat);
        rib.rotation.z = Math.PI * 0.08;
        rib.position.set(xOff, 0.4, 0);
        rib.castShadow = true;
        g.add(rib);
      }
      g.position.set(d.x, d.y || 0, d.z || 0); root.add(g);
    } else if (d.t === 'watch_cairn') {
      // ══════ 荒原高耸引路烽燧与造语里程碑 (High Route Marker & Conlang Milestone) ══════
      const g = new THREE.Group();
      const stoneMat = lam({ map: stoneTex('#7c6955', 1, 2) });
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.1, 3.4, 8), stoneMat);
      tower.position.set(0, 1.7, 0); tower.castShadow = true; g.add(tower);
      const topPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.75, 0.35, 8), stoneMat);
      topPlate.position.set(0, 3.55, 0); g.add(topPlate);
      // 顶部引路长幡
      const bannerMat = lam({ color: d.bannerColor || '#0284c7' });
      const banner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.55), bannerMat);
      banner.position.set(0, 4.3, 0.28); g.add(banner);
      anim.push({
        update: (dt, tt) => {
          banner.rotation.z = Math.sin(tt * 4.0 + d.x) * 0.15;
        }
      });
      g.position.set(d.x, d.y || 0, d.z || 0); root.add(g);
    } else if (d.t === 'desert_cairn') {
      // ══════ 沙海引路玛尼堆与祈愿石标 (Ancient Route Cairn) ══════
      const g = new THREE.Group();
      const cairnMat = lam({ map: stoneTex('#a8947c', 1, 1) });
      const layers = [
        { w: 0.95, h: 0.32, d: 0.85, y: 0.16, rot: 0.08 },
        { w: 0.75, h: 0.28, d: 0.70, y: 0.44, rot: -0.18 },
        { w: 0.58, h: 0.26, d: 0.52, y: 0.69, rot: 0.22 },
        { w: 0.40, h: 0.24, d: 0.38, y: 0.92, rot: -0.12 },
        { w: 0.24, h: 0.32, d: 0.22, y: 1.18, rot: 0.05 }
      ];
      layers.forEach(l => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(l.w, l.h, l.d), cairnMat);
        m.position.set(0, l.y, 0);
        m.rotation.y = l.rot;
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
      });
      const ribbonMat = lam({ color: d.color || '#e0703a' });
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.22), ribbonMat);
      ribbon.position.set(0.12, 1.25, 0.06);
      ribbon.rotation.z = -0.32;
      g.add(ribbon);
      anim.push({
        update: (dt, tt) => {
          ribbon.rotation.z = -0.32 + Math.sin(tt * 4.5 + d.x) * 0.12;
        }
      });
      g.position.set(d.x, d.y || 0, d.z || 0); root.add(g);
    } else if (d.t === 'desert_shelter') {
      // ══════ 荒原避风石棚与残存营火 (Windbreak Rock Shelter & Rest Camp) ══════
      const g = new THREE.Group();
      const stoneMat = lam({ map: stoneTex('#9c836a', 2, 1) });
      const timberMat = lam({ map: cedarTex('#5a381f', 1, 1) });
      // 背风厚重风蚀巨石后壁与斜挑遮阴顶
      const backRock = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 1.2), stoneMat);
      backRock.position.set(0, 1.4, -0.6); backRock.receiveShadow = true; backRock.castShadow = true; g.add(backRock);
      const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 2.6), stoneMat);
      roofSlab.position.set(0, 2.8, 0.4); roofSlab.rotation.x = 0.15; roofSlab.receiveShadow = true; roofSlab.castShadow = true; g.add(roofSlab);
      // 前撑斜木柱
      const postL = box(0.14, 2.6, 0.14, timberMat); postL.position.set(-1.8, 1.3, 1.4); g.add(postL);
      const postR = box(0.14, 2.6, 0.14, timberMat); postR.position.set(1.8, 1.3, 1.4); g.add(postR);
      // 营地灰烬篝火石圈 (Firepit)
      const ashMat = lam({ color: '#2b231c' });
      const emberMat = new THREE.MeshBasicMaterial({ color: '#f97316' });
      const pitRim = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.22, 10), stoneMat);
      pitRim.position.set(0, 0.11, 0.8); g.add(pitRim);
      const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.18, 8), ashMat);
      ash.position.set(0, 0.13, 0.8); g.add(ash);
      const ember = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.25), emberMat);
      ember.position.set(0, 0.2, 0.8); g.add(ember);
      anim.push({
        update: (dt, tt) => {
          ember.scale.setScalar(0.85 + Math.sin(tt * 3.2) * 0.25);
        }
      });
      g.position.set(d.x, d.y || 0, d.z || 0); root.add(g);
    } else if (d.t === 'creature_ribs') {
      // ══════ 远古风蚀巨骨与盐碱河床地标 (Ancient Colossal Ribs Landmark) ══════
      const g = new THREE.Group();
      const boneMat = lam({ color: '#e8dcce' });
      const ribCount = d.count || 5;
      const spacing = 1.25;
      for (let i = 0; i < ribCount; i++) {
        const xOff = (i - (ribCount - 1) / 2) * spacing;
        const scale = 1.0 - Math.abs(i - (ribCount - 1) / 2) * 0.12;
        // 拱形巨骨
        const archGeo = new THREE.TorusGeometry(1.6 * scale, 0.16 * scale, 8, 16, Math.PI * 0.85);
        const rib = new THREE.Mesh(archGeo, boneMat);
        rib.rotation.z = Math.PI * 0.08;
        rib.position.set(xOff, 0.4, 0);
        rib.castShadow = true;
        g.add(rib);
      }
      g.position.set(d.x, d.y || 0, d.z || 0); root.add(g);
    } else if (d.t === 'watch_cairn') {
      // ══════ 荒原高耸引路烽燧与造语里程碑 (High Route Marker & Conlang Milestone) ══════
      const g = new THREE.Group();
      const stoneMat = lam({ map: stoneTex('#7c6955', 1, 2) });
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.1, 3.4, 8), stoneMat);
      tower.position.set(0, 1.7, 0); tower.castShadow = true; g.add(tower);
      const topPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.75, 0.35, 8), stoneMat);
      topPlate.position.set(0, 3.55, 0); g.add(topPlate);
      // 顶部引路长幡
      const bannerMat = lam({ color: d.bannerColor || '#0284c7' });
      const banner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.55), bannerMat);
      banner.position.set(0, 4.3, 0.28); g.add(banner);
      anim.push({
        update: (dt, tt) => {
          banner.rotation.z = Math.sin(tt * 4.0 + d.x) * 0.15;
        }
      });
      g.position.set(d.x, d.y || 0, d.z || 0); root.add(g);
    }
  }

  function buildFar(level, root, anim, th) {
    const cx = (level.bounds.x1 + level.bounds.x2) / 2;
    const rr = PX.rng((level.id || 1) * 31 + 5);

    if (level.zones && level.zones.length > 0) {
      // ════════════ 统一大世界宏伟全景架构 (海拔 -7m ~ 74m，纵深 Z: -16 ~ -70) ════════════
      // 1. 地面沙漠起伏金黄沙丘与两河远景 (X: -30 ~ 45, Y: 0)
      for (let i = 0; i < 7; i++) {
        const duneW = 32 + rr() * 40, duneH = 5 + rr() * 6;
        const duneX = level.bounds.x1 - 20 + i * 12;
        const duneZ = -22 - rr() * 35;
        const duneMat = lam({ color: PX.shade('#d4a76a', (rr() - 0.5) * 0.12) });
        const dune = new THREE.Mesh(new THREE.CylinderGeometry(duneW * 0.35, duneW * 0.55, duneH, 16), duneMat);
        dune.position.set(duneX, -3 + duneH / 2, duneZ);
        dune.scale.set(1.4, 0.45, 0.8);
        root.add(dune);
      }

      // 2. 巴别塔主塔身内筒巨构 (X: 67, Y: 10 ~ 72, Z: -28)
      // 采用 BackSide 背面渲染与 isTowerShell 标记，内部中空宏大可见且绝对不挡视线！
      const towerCx = 67;
      const innerWallMat = lam({ map: PX.worldTex(PX.ashlarStoneCanvas('#3a3028', 77), 16, 24), side: THREE.BackSide });
      const innerCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(48, 54, 62, 36, 1, true, -Math.PI * 0.45, Math.PI * 0.9),
        innerWallMat
      );
      innerCyl.position.set(towerCx, 41, -28);
      innerCyl.userData.isTowerShell = true;
      innerCyl.userData.isInnerCylinder = true;
      innerCyl.userData.isFloor = false;
      innerCyl.userData.isGround = false;
      root.add(innerCyl);

      // 3. 塔内螺旋拱柱与悬挑石肋 (Spiral Cantilever Arches)
      const spiralSteps = 24;
      for (let s = 0; s < spiralSteps; s++) {
        const t = s / spiralSteps;
        const angle = -1.2 + t * 2.4;
        const radius = 42 - t * 3;
        const sx = towerCx + Math.sin(angle) * radius;
        const sz = -28 + Math.cos(angle) * (radius * 0.65) - 2;
        const sy = 12.0 + t * 50.0;

        const ribMat = lam({ map: PX.worldTex(PX.ashlarStoneCanvas('#705a45', s + 10), 2, 2) });
        const rib = box(3.2, 1.4, 4.5, ribMat);
        rib.position.set(sx, sy, sz);
        rib.rotation.y = angle;
        root.add(rib);

        if (s % 3 === 0) {
          const brazierMat = lam({ color: '#2b231d' });
          const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.45, 0.8, 8), brazierMat);
          brazier.position.set(sx, sy + 1.0, sz);
          root.add(brazier);

          const flameMat = new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.9 });
          const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 6), flameMat);
          flame.position.set(sx, sy + 1.7, sz);
          root.add(flame);

          const flameGlow = new THREE.Mesh(new THREE.CircleGeometry(1.6, 12), new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.35, depthWrite: false }));
          flameGlow.position.set(sx, sy + 1.8, sz + 0.1);
          root.add(flameGlow);

          anim.push({ update: (dt, tm) => {
            const sc = 1 + Math.sin(tm * 14 + s) * 0.18;
            flame.scale.set(sc, 1 + Math.sin(tm * 18 + s) * 0.25, sc);
            flameGlow.material.opacity = 0.28 + Math.sin(tm * 10 + s) * 0.08;
          }});
        }
      }

      // 4. 运转中的古代巨型青铜齿轮与悬索 (Y: 20 ~ 36)
      for (let g = 0; g < 3; g++) {
        const gx = towerCx - 18 + g * 18;
        const gy = 20 + (g % 2) * 8;
        const gz = -18 - g * 4;
        const gearMat = lam({ map: PX.worldTex(PX.cobblePathCanvas('#4a3b2c', g + 5), 4, 4) });
        const gear = new THREE.Mesh(new THREE.CylinderGeometry(4.2 - g * 0.5, 4.2 - g * 0.5, 0.8, 16), gearMat);
        gear.rotation.x = Math.PI / 2;
        gear.position.set(gx, gy, gz);
        root.add(gear);

        const speed = (g % 2 === 0 ? 1 : -1) * 0.35;
        anim.push({ update: (dt) => { gear.rotation.z += dt * speed; } });

        const chain = box(0.2, 24, 0.2, lam({ color: '#332920' }));
        chain.position.set(gx, gy - 10, gz);
        root.add(chain);
      }

      // 5. 云海层 (Y: 28 ~ 38)
      for (let ci = 0; ci < 8; ci++) {
        const cloudMat = new THREE.MeshLambertMaterial({ color: '#f0f5ff', transparent: true, opacity: 0.42, depthWrite: false });
        const cloud = new THREE.Mesh(new THREE.SphereGeometry(6 + rr() * 5, 8, 8), cloudMat);
        cloud.scale.set(2.8, 0.55, 1.2);
        const clX = 15 + ci * 9;
        const clY = 32 + (rr() - 0.5) * 6;
        cloud.position.set(clX, clY, -16 - rr() * 8);
        root.add(cloud);
        anim.push({ update: (dt, tm) => {
          cloud.position.x = clX + Math.sin(tm * 0.3 + ci) * 2.5;
        }});
      }

      // 6. 天穹之巅神圣光冕金环 (Y: 65, Z: -12)
      const haloMat = new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.55, depthWrite: false });
      const halo = new THREE.Mesh(new THREE.TorusGeometry(14, 0.8, 16, 64), haloMat);
      halo.position.set(34, 65, -12);
      root.add(halo);
      anim.push({ update: (dt, tm) => {
        halo.rotation.z = tm * 0.15;
        halo.material.opacity = 0.45 + Math.sin(tm * 2.0) * 0.12;
      }});

    } else if (level.id === 1) {
      // ════════════ 第 1 层：大漠绿洲与巴别巨构基座 ════════════
      // 远方连绵起伏的金黄沙丘（Z = -20 ~ -70）
      for (let i = 0; i < 9; i++) {
        const duneW = 32 + rr() * 40, duneH = 5 + rr() * 7, duneD = 18 + rr() * 25;
        const duneX = level.bounds.x1 - 30 + i * 14;
        const duneZ = -22 - rr() * 45;
        const duneMat = lam({ color: PX.shade('#d4a76a', (rr() - 0.5) * 0.12) });
        const dune = new THREE.Mesh(new THREE.CylinderGeometry(duneW * 0.35, duneW * 0.55, duneH, 16), duneMat);
        dune.position.set(duneX, level.bounds.y1 - 3 + duneH / 2, duneZ);
        dune.scale.set(1.4, 0.45, 0.8);
        root.add(dune);
      }
      // 远景矗立的古老巴别塔基座巨构（Z = -120，巨大的阶梯式巨石神庙基台向上拔地而起）
      const towerBase = new THREE.Group();
      let by = -15, br = 65;
      for (let i = 0; i < 7; i++) {
        const bh = 12 - i * 0.8;
        const bm = new THREE.Mesh(new THREE.CylinderGeometry(br * 0.92, br, bh, 32, 1, true), lam({ map: PX.worldTex(PX.stoneCanvas(th.far, 50 + i), 12, 4) }));
        bm.position.y = by + bh / 2;
        bm.userData.isTowerShell = true;
        towerBase.add(bm);
        const cornice = new THREE.Mesh(new THREE.CylinderGeometry(br + 1.2, br + 1.2, 1.2, 32), lam({ color: PX.shade(th.far, 0.18) }));
        cornice.position.y = by + bh;
        cornice.userData.isTowerShell = true;
        towerBase.add(cornice);
        by += bh; br *= 0.88;
      }
      towerBase.position.set(cx + 35, level.bounds.y1 - 6, -110);
      root.add(towerBase);

    } else if (level.id === 2) {
      // ════════════ 第 2 层：巴别巨构内部 · 立体螺旋回廊与通天神殿 ════════════
      // 1. 巨大内筒圆柱石构深渊内壁（采用 BackSide 背面渲染与 isTowerShell 动态视线穿透，绝不挡镜头视线）
      const innerWallMat = lam({ map: PX.worldTex(PX.ashlarStoneCanvas('#3a3028', 77), 16, 24), side: THREE.BackSide });
      const innerCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(56, 62, 55, 36, 1, true, -Math.PI * 0.45, Math.PI * 0.9),
        innerWallMat
      );
      innerCyl.position.set(cx, level.bounds.y1 + 18, -28);
      innerCyl.userData.isTowerShell = true;
      root.add(innerCyl);

      // 2. 宏伟螺旋盘旋石砌悬挑拱肋（Spiral Cantilever Arches）沿内壁螺旋攀升
      const spiralSteps = 24;
      for (let s = 0; s < spiralSteps; s++) {
        const t = s / spiralSteps;
        const angle = -1.2 + t * 2.4;
        const radius = 48 - t * 4;
        const sx = cx + Math.sin(angle) * radius;
        const sz = -28 + Math.cos(angle) * (radius * 0.65) - 2;
        const sy = level.bounds.y1 + 1.5 + t * 20.0;

        // 悬挑石托与拱柱
        const ribMat = lam({ map: PX.worldTex(PX.ashlarStoneCanvas('#705a45', s + 10), 2, 2) });
        const rib = box(3.2, 1.4, 4.5, ribMat);
        rib.position.set(sx, sy, sz);
        rib.rotation.y = angle;
        root.add(rib);

        // 沿螺旋石梁陈设的古代长明青铜火盆
        if (s % 3 === 0) {
          const brazierMat = lam({ color: '#2b231d' });
          const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.45, 0.8, 8), brazierMat);
          brazier.position.set(sx, sy + 1.0, sz);
          root.add(brazier);

          const flameMat = new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.9 });
          const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 6), flameMat);
          flame.position.set(sx, sy + 1.7, sz);
          root.add(flame);

          const flameGlow = new THREE.Mesh(new THREE.CircleGeometry(1.6, 12), new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.35, depthWrite: false }));
          flameGlow.position.set(sx, sy + 1.8, sz + 0.1);
          root.add(flameGlow);

          anim.push({ update: (dt, tm) => {
            const sc = 1 + Math.sin(tm * 14 + s) * 0.18;
            flame.scale.set(sc, 1 + Math.sin(tm * 18 + s) * 0.25, sc);
            flameGlow.material.opacity = 0.28 + Math.sin(tm * 10 + s) * 0.08;
          }});
        }
      }

      // 3. 巨型通天青铜齿轮与悬挂重锤吊索（运转中的远古巨构机枢）
      for (let g = 0; g < 3; g++) {
        const gx = cx - 22 + g * 22;
        const gy = level.bounds.y1 + 14 + (g % 2) * 5;
        const gz = -18 - g * 4;
        const gearMat = lam({ map: PX.worldTex(PX.cobblePathCanvas('#4a3b2c', g + 5), 4, 4) });
        const gear = new THREE.Mesh(new THREE.CylinderGeometry(4.5 - g * 0.6, 4.5 - g * 0.6, 0.8, 16), gearMat);
        gear.rotation.x = Math.PI / 2;
        gear.position.set(gx, gy, gz);
        root.add(gear);

        const speed = (g % 2 === 0 ? 1 : -1) * 0.35;
        anim.push({ update: (dt) => { gear.rotation.z += dt * speed; } });

        // 巨型青铜悬索垂入深渊
        const chainMat = lam({ color: '#332920' });
        const chain = box(0.2, 28, 0.2, chainMat);
        chain.position.set(gx, gy - 12, gz);
        root.add(chain);
      }

      // 4. 背景层层飞架的巨石拱桥与奔腾涌动的飞天瀑布
      for (let layer = 0; layer < 2; layer++) {
        const lz = -14 - layer * 14;
        const archW = 12 + layer * 3, archH = 16 + layer * 2;
        for (let x = level.bounds.x1 - 10; x <= level.bounds.x2 + 20; x += archW + 2) {
          const pierMat = lam({ map: PX.worldTex(PX.stoneCanvas(PX.shade(th.stone, -0.2 + layer * 0.08), 80 + layer), 2, 6) });
          const pier = box(2.6, archH, 2.2, pierMat);
          pier.position.set(x, level.bounds.y1 + archH / 2, lz);
          root.add(pier);
          const span = box(archW + 1.2, 2.4, 2.8, pierMat);
          span.position.set(x + archW / 2, level.bounds.y1 + archH, lz);
          root.add(span);
        }
      }

      // 5. 顶层破晓光束天光（God-rays through cracked ceiling）
      for (let i = 0; i < 4; i++) {
        const rayMat = new THREE.MeshBasicMaterial({ color: '#fef08a', transparent: true, opacity: 0.12, depthWrite: false });
        const ray = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 6.5, 38, 12, 1, true), rayMat);
        ray.rotation.z = -0.25 + i * 0.14;
        ray.position.set(cx - 24 + i * 18, level.bounds.y2 + 4, -8 - i * 4);
        root.add(ray);
      }

    } else if (level.id === 3) {
      // ════════════ 第 3 层：云之回廊 · 悬崖千米深渊与翻滚云海 ════════════
      // 象牙白大理石绝壁岩体纵深展开（Z = -4 ~ -30）
      const cliffWall = box(level.bounds.x2 - level.bounds.x1 + 60, 48, 6, lam({ map: PX.worldTex(PX.stoneCanvas('#e0d5c1', 99), 16, 12) }));
      cliffWall.position.set(cx, level.bounds.y1 + 14, -7.5);
      root.add(cliffWall);

      // 脚下翻滚漫卷的千米云海海浪（Z = -2 ~ -70, Y = voidY 附近）
      for (let i = 0; i < 50; i++) {
        const t = PX.tex(PX.cloudCanvas(i + 12)); t.magFilter = THREE.LinearFilter;
        const s = 14 + rr() * 22;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.55), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.92, fog: true }));
        m.position.set(level.bounds.x1 - 35 + rr() * (level.bounds.x2 - level.bounds.x1 + 70), level.bounds.y1 - 4 + rr() * 6, -3 - rr() * 55);
        root.add(m);
        const sp = 0.25 + rr() * 0.45;
        anim.push({ update: (dt) => { m.position.x += dt * sp; if (m.position.x > level.bounds.x2 + 45) m.position.x = level.bounds.x1 - 45; } });
      }

    } else if (level.id === 4) {
      // ════════════ 第 4 层：圣书图书馆 · 文明智识的宏伟穹顶殿堂 ════════════
      // 纵深巨型雪松木典籍书架墙、古铜拱肋与星宿天穹（Z = -3 ~ -24）
      for (let bay = 0; bay < 6; bay++) {
        const bx = level.bounds.x1 + 6 + bay * 10;
        const ribMat = lam({ color: '#5a3d24' });
        const ribL = box(0.9, 22, 1.2, ribMat); ribL.position.set(bx - 3.8, 8, -6); root.add(ribL);
        const ribR = box(0.9, 22, 1.2, ribMat); ribR.position.set(bx + 3.8, 8, -6); root.add(ribR);
        const ribArch = box(8.5, 1.2, 1.2, ribMat); ribArch.position.set(bx, 18, -6); root.add(ribArch);
        // 背景发光的星宿星象圆盘
        const dialMat = new THREE.MeshBasicMaterial({ color: '#e6c364' });
        const dial = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.2, 16), dialMat);
        dial.position.set(bx, 13, -12);
        root.add(dial);
      }

    } else if (level.id === 5) {
      // ════════════ 第 5 层：天穹 · 上帝之手 · 金色神性圣域与宇宙星环 ════════════
      // 漫天金色极光与环绕旋转的神圣浑天金环
      for (let r = 0; r < 3; r++) {
        const ringMat = new THREE.MeshBasicMaterial({ color: '#f3cf58', transparent: true, opacity: 0.75 });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(12 + r * 6, 0.25, 8, 36), ringMat);
        ring.position.set(cx, 16, -18 - r * 8);
        root.add(ring);
        const speed = (r % 2 === 0 ? 1 : -1) * (0.2 + r * 0.1);
        anim.push({ update: (dt) => { ring.rotation.z += dt * speed; ring.rotation.x += dt * speed * 0.4; } });
      }
      // 金色破晓霞光云海
      for (let i = 0; i < 28; i++) {
        const t = PX.tex(PX.cloudCanvas(i + 88)); t.magFilter = THREE.LinearFilter;
        const s = 16 + rr() * 24;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.5), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.88, color: '#fcedb6' }));
        m.position.set(level.bounds.x1 - 30 + rr() * (level.bounds.x2 - level.bounds.x1 + 60), level.bounds.y1 - 2 + rr() * 4, -8 - rr() * 45);
        root.add(m);
        const sp = 0.2 + rr() * 0.3;
        anim.push({ update: (dt) => { m.position.x += dt * sp; if (m.position.x > level.bounds.x2 + 40) m.position.x = level.bounds.x1 - 40; } });
      }
    }

    // 天空的微风卷云
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
