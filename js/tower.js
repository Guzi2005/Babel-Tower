// Grand Open-World Overland + Multi-Tier Architectural Babel Tower Generator
// Features:
// 1. Cascading Aqueduct Waterfalls (瀑布水道), Rotating Waterwheels (水车), Crimson Sun Banners (太阳纹章锦旗) & Hoist Lifts (升降吊台)
// 2. Pushable Counterweight Crates (📦 可推动配重木箱), Brown Gravity Plates (棕红压板) & Multi-Stele Rune Decoders (三处传语译码碑 0/3)
// 3. 6 Tricky Squad Composition Checkpoints (刁钻队伍构成条件：如配重下限、窄桥人数上限 ≤5人、浮空圣庭轻装检定 ≤3件负重、多语种同心检定)
// 4. Real 3D Falling & Rolling Boulders (真实3D物理落石：砸落地面后沿螺旋阶梯真实翻滚冲撞数秒！)

class BabelTower3D {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.entitiesGroup = new THREE.Group();
    this.group.add(this.entitiesGroup);

    this.maxHeight = 160;
    this.totalTurns = 5.5;
    this.pathSegments = 540;
    this.nodes = [];
    this.walkwayMeshes = [];
    this.interactables = [];
    this.languageGates = [];
    this.pushCrates = [];
    this.fallingRocks = [];
    this.detachableBlocks = [];
    this.hangingBanners = [];
    this.buildSparks = [];
    this.cranes = [];
    this.waterwheels = [];
    this.waterfalls = [];
    this.overheadObstacles = [];
    this.currentTiltZ = 0;
    this.currentTiltX = 0;
    this.tiltTremor = 0;
    this.seed = Math.floor(Math.random() * 100000);
  }

  worldToLocalPos(worldVec) {
    this.group.updateMatrixWorld();
    return this.group.worldToLocal(worldVec.clone());
  }

  localToWorldPos(localVec) {
    this.group.updateMatrixWorld();
    return this.group.localToWorld(localVec.clone());
  }

  seededRandom() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  createBrickTexture(baseHex = '#efe5d1', mortarHex = '#cbb896') {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = mortarHex;
    ctx.lineWidth = 3;
    const rows = 4;
    const rh = 128 / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y);
      ctx.stroke();

      const cols = 2;
      const cw = 128 / cols;
      const offset = (r % 2) * (cw * 0.5);
      for (let k = 0; k <= cols; k++) {
        const x = (k * cw + offset) % 128;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rh);
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  getRadiusAtHeight(y) {
    if (y <= 0) return 44.0;
    const t = Math.max(0, Math.min(1, y / this.maxHeight));
    return 42.0 * (1 - t * 0.48);
  }

  getZoneAtHeight(y, s = 0) {
    if (s < 0.075) return 'VILLAGE_WELL';
    if (s < 0.145) return 'OUTSKIRTS_RIVER';
    if (s < 0.22) return 'CITY_SETTLEMENT';
    if (y < 48) return 'INTERIOR_STONE_HALL';
    if (y < 108) return 'COLONNADE_ATRIUM';
    return 'HIGH_SCAFFOLD';
  }

  getPointOnSpiral(s, radialOffset = 0) {
    if (s < 0.22) {
      const t = s / 0.22;
      const x = 136.0 * (1 - t) + 41.5 * t;
      const zBase = 78.0 * (1 - t) * Math.cos(t * Math.PI * 1.15);
      const y = t * 1.5 + Math.sin(t * Math.PI * 3) * 0.35;
      return new THREE.Vector3(x, Math.max(0, y), zBase + radialOffset);
    }

    const towerS = (s - 0.22) / 0.78;
    const y = 1.5 + towerS * (this.maxHeight - 1.5);
    const angle = towerS * this.totalTurns * Math.PI * 2;
    const outerR = this.getRadiusAtHeight(y);

    let radialFactor = 1.0;
    if (towerS < 0.30) {
      radialFactor = 0.66 + 0.22 * Math.sin(towerS * Math.PI * 8);
    } else if (towerS < 0.68) {
      radialFactor = 0.80 + 0.18 * Math.cos(towerS * Math.PI * 10);
    } else {
      radialFactor = 0.95;
    }

    const r = outerR * radialFactor + radialOffset;
    return new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
  }

  clear() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
    }
    if (this.entitiesGroup) {
      this.group.add(this.entitiesGroup);
    }
    this.nodes = [];
    this.walkwayMeshes = [];
    this.interactables = [];
    this.languageGates = [];
    this.pushCrates = [];
    this.fallingRocks = [];
    this.detachableBlocks = [];
    this.hangingBanners = [];
    this.buildSparks = [];
    this.cranes = [];
    this.waterwheels = [];
    this.waterfalls = [];
    this.overheadObstacles = [];
  }

  generate(newSeed = null) {
    if (newSeed !== null) this.seed = newSeed;
    this.clear();

    const brickTex = this.createBrickTexture('#efe5d1', '#cbb896');
    const terracottaTex = this.createBrickTexture('#d98354', '#b36136');
    const stoneHallTex = this.createBrickTexture('#c2b49b', '#9c8d74');

    const matSandstone = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.82, metalness: 0.05 });
    const matTerracotta = new THREE.MeshStandardMaterial({ map: terracottaTex, roughness: 0.85, metalness: 0.06 });
    const matStoneHall = new THREE.MeshStandardMaterial({ map: stoneHallTex, roughness: 0.88, metalness: 0.06 });
    const matWhiteColumn = new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 0.55, metalness: 0.08 });
    const matDarkArch = new THREE.MeshStandardMaterial({ color: 0x1e1a17, roughness: 0.95 });
    const matWood = new THREE.MeshStandardMaterial({ color: 0xc27838, roughness: 0.85, metalness: 0.05 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xf6b93b, roughness: 0.3, metalness: 0.7, emissive: 0x5a3e10 });

    this.buildOverlandWorld(matSandstone, matTerracotta, matWhiteColumn, matWood, matDarkArch);
    this.buildCutawayBabelTower(matSandstone, matTerracotta, matStoneHall, matWhiteColumn, matDarkArch, matWood, matGold);
    this.buildSpiralWalkway(matSandstone, matTerracotta, matStoneHall, matWhiteColumn, matWood);
    this.populateProceduralFeatures(matSandstone, matWood, matGold, matTerracotta, matStoneHall);
    this.buildSuspensionLaddersAndClearanceObstacles(matWood, matSandstone, matTerracotta);
  }

  buildOverlandWorld(matSandstone, matTerracotta, matWhiteColumn, matWood, matDarkArch) {
    // 1. Colossal True Earth Desert Plain (Replaces sky-island with vast ancient continent!)
    const vastEarthGeo = new THREE.PlaneGeometry(1600, 1600, 32, 32);
    const vastEarthMat = new THREE.MeshStandardMaterial({ color: 0xdfbb84, roughness: 0.96 });
    const vastEarth = new THREE.Mesh(vastEarthGeo, vastEarthMat);
    vastEarth.rotation.x = -Math.PI / 2;
    vastEarth.position.set(55, -2.15, 24);
    vastEarth.receiveShadow = true;
    this.group.add(vastEarth);

    // Horizon Dune Ridges & Mountain Silhouettes
    const horizonGroup = new THREE.Group();
    const duneMat = new THREE.MeshStandardMaterial({ color: 0xc89860, roughness: 0.95 });
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2;
      const rad = 420 + (i % 5) * 45;
      const duneH = 22 + (i % 7) * 8;
      const dune = new THREE.Mesh(new THREE.ConeGeometry(55 + (i % 4) * 15, duneH, 5), duneMat);
      dune.position.set(Math.cos(ang) * rad, duneH * 0.45 - 2, Math.sin(ang) * rad);
      horizonGroup.add(dune);
    }
    this.group.add(horizonGroup);

    // Cyclopean Stepped Ziggurat Foundation Terraces (Anchors Babel firmly into the earth crust!)
    const foundationGroup = new THREE.Group();
    const matZiggurat = new THREE.MeshStandardMaterial({ color: 0xb59368, roughness: 0.92 });
    const zigguratTiers = [
      { r: 72, h: 5.5, y: -0.5 },
      { r: 62, h: 5.5, y: 4.8 },
      { r: 52, h: 5.5, y: 10.0 }
    ];
    zigguratTiers.forEach(zt => {
      const tierMesh = new THREE.Mesh(new THREE.CylinderGeometry(zt.r * 0.95, zt.r, zt.h, 48), matZiggurat);
      tierMesh.position.y = zt.y;
      tierMesh.receiveShadow = true;
      foundationGroup.add(tierMesh);
    });
    this.group.add(foundationGroup);

    const plainGeo = new THREE.CylinderGeometry(240, 250, 4.0, 64);
    const plainMat = new THREE.MeshStandardMaterial({ color: 0xe6b472, roughness: 0.94 });
    const plain = new THREE.Mesh(plainGeo, plainMat);
    plain.position.set(55, -2.0, 24);
    plain.receiveShadow = true;
    plain.userData = { isWalkway: true, isOverlandGround: true };
    this.group.add(plain);
    this.walkwayMeshes.push(plain);

    // Outskirts Aqueduct Canal & River
    const riverGeo = new THREE.BoxGeometry(11.0, 0.35, 165);
    const riverMat = new THREE.MeshStandardMaterial({ color: 0x38ada9, roughness: 0.22, metalness: 0.3 });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.position.set(95, -0.02, 30);
    river.rotation.y = 0.38;
    this.group.add(river);

    // Village Water Well Spawn Point (s = 0.008)
    const wellPos = this.getPointOnSpiral(0.008, 0);
    this.wellGroup = new THREE.Group();
    this.wellGroup.position.copy(wellPos);

    const wellRim = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 1.3, 16), matSandstone);
    wellRim.position.y = 0.65;
    const wellAbyss = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.35, 16), matDarkArch);
    wellAbyss.position.y = 0.68;
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 2.9, 0.26), matWood);
    postL.position.set(-1.55, 1.8, 0);
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 2.9, 0.26), matWood);
    postR.position.set(1.55, 1.8, 0);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.28, 0.28), matWood);
    beam.position.set(0, 3.15, 0);
    this.wellGroup.add(wellRim, wellAbyss, postL, postR, beam);
    this.group.add(this.wellGroup);

    // Enterable Village Council House & Workshop (Z-axis indoor/outdoor depth!)
    this.createEnterableWorkshop(136, 78, 8.5, 4.6, 7.2, matSandstone, matTerracotta, matWood);

    const villageClusters = [
      { x: 142, z: 86, w: 5.5, h: 3.6, d: 4.8 },
      { x: 128, z: 84, w: 6.2, h: 4.2, d: 4.5 },
      { x: 145, z: 68, w: 4.8, h: 3.4, d: 5.0 },
      { x: 122, z: 62, w: 6.8, h: 4.6, d: 5.2 },
      { x: 112, z: 74, w: 5.2, h: 3.8, d: 4.4 }
    ];
    villageClusters.forEach((vc) => {
      this.createAncientBuilding(vc.x, vc.z, vc.w, vc.h, vc.d, matSandstone, matTerracotta, matWood, false);
    });

    const palmCoords = [
      [139, 72], [132, 88], [116, 66], [105, 52], [98, 26], [88, 42], [78, 18], [68, -18], [58, 24]
    ];
    palmCoords.forEach(([px, pz]) => {
      this.createPalmTree(px, pz, matWood);
    });

    const cityBuildings = [
      { x: 82, z: 14, w: 7.5, h: 6.2, d: 6.5, tiered: true },
      { x: 78, z: -15, w: 8.2, h: 6.8, d: 6.8, tiered: true },
      { x: 72, z: 19, w: 6.8, h: 5.4, d: 5.8, tiered: false },
      { x: 68, z: -20, w: 9.0, h: 8.2, d: 7.2, tiered: true },
      { x: 62, z: 15, w: 7.5, h: 7.4, d: 6.5, tiered: true },
      { x: 60, z: -14, w: 7.2, h: 6.4, d: 6.0, tiered: false },
      { x: 53, z: 21, w: 8.5, h: 9.0, d: 7.2, tiered: true },
      { x: 52, z: -22, w: 8.8, h: 9.5, d: 7.2, tiered: true },
      { x: 74, z: 28, w: 6.5, h: 5.2, d: 6.0, tiered: false },
      { x: 56, z: -32, w: 7.8, h: 7.0, d: 6.5, tiered: true }
    ];
    cityBuildings.forEach((cb) => {
      this.createAncientBuilding(cb.x, cb.z, cb.w, cb.h, cb.d, matSandstone, matTerracotta, matWood, cb.tiered);
    });

    const gatePos = this.getPointOnSpiral(0.155, 0);
    const cityGateGroup = new THREE.Group();
    cityGateGroup.position.copy(gatePos);
    const pylonL = new THREE.Mesh(new THREE.BoxGeometry(3.8, 11.0, 3.8), matTerracotta);
    pylonL.position.set(0, 5.5, -5.2);
    const pylonR = new THREE.Mesh(new THREE.BoxGeometry(3.8, 11.0, 3.8), matTerracotta);
    pylonR.position.set(0, 5.5, 5.2);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.5, 14.2), matSandstone);
    lintel.position.set(0, 10.6, 0);
    cityGateGroup.add(pylonL, pylonR, lintel);
    this.group.add(cityGateGroup);
  }

  createEnterableWorkshop(x, z, w, h, d, matSandstone, matTerracotta, matWood) {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, 0, z);

    // Floor deck (Walkable interior!)
    const floorGeo = new THREE.BoxGeometry(w - 0.4, 0.4, d - 0.4);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x9b6b3e, roughness: 0.85 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, 0.2, 0);
    floor.userData = { isWalkway: true, isInterior: true };
    bGroup.add(floor);
    this.walkwayMeshes.push(floor);

    // Left, Right, and Back Walls
    const wallThick = 0.55;
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), matSandstone);
    backWall.position.set(0, h * 0.5, -d * 0.5);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), matSandstone);
    leftWall.position.set(-w * 0.5, h * 0.5, 0);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), matSandstone);
    rightWall.position.set(w * 0.5, h * 0.5, 0);

    // Front Wall with Arched Open Doorway
    const doorW = 2.6, doorH = 3.2;
    const frontL = new THREE.Mesh(new THREE.BoxGeometry((w - doorW) * 0.5, h, wallThick), matSandstone);
    frontL.position.set(-w * 0.5 + (w - doorW) * 0.25, h * 0.5, d * 0.5);
    const frontR = new THREE.Mesh(new THREE.BoxGeometry((w - doorW) * 0.5, h, wallThick), matSandstone);
    frontR.position.set(w * 0.5 - (w - doorW) * 0.25, h * 0.5, d * 0.5);
    const frontLintel = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.2, h - doorH, wallThick), matTerracotta);
    frontLintel.position.set(0, doorH + (h - doorH) * 0.5, d * 0.5);

    // Ceiling / Flat Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.45, d + 0.4), matTerracotta);
    roof.position.set(0, h, 0);

    // Interior Drafting Table & Bench
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 1.2), matWood);
    tableTop.position.set(-1.2, 0.95, -1.0);
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.15), matWood);
    leg1.position.set(-2.2, 0.45, -1.4);
    const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.15), matWood);
    leg2.position.set(-0.2, 0.45, -0.6);
    bGroup.add(tableTop, leg1, leg2);

    // Cozy Interior Hearth Lamp
    const lamp = new THREE.PointLight(0xffa844, 1.35, 10);
    lamp.position.set(0, 2.6, 0);
    bGroup.add(lamp);

    // Bread Storage Baskets & Pottery inside
    const breadBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), matWood);
    breadBox.position.set(2.0, 0.35, -1.2);
    bGroup.add(breadBox);

    bGroup.add(backWall, leftWall, rightWall, frontL, frontR, frontLintel, roof);
    this.group.add(bGroup);
  }

  createAncientBuilding(x, z, w, h, d, matSandstone, matTerracotta, matWood, isTiered = false) {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, 0, z);

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matSandstone);
    body.position.y = h * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    bGroup.add(body);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.55, d + 0.35), matTerracotta);
    trim.position.y = h;
    bGroup.add(trim);

    if (isTiered) {
      const upper = new THREE.Mesh(new THREE.BoxGeometry(w * 0.68, h * 0.55, d * 0.68), matSandstone);
      upper.position.y = h + h * 0.275;
      upper.castShadow = true;
      bGroup.add(upper);

      const upperTrim = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.45, d * 0.72), matTerracotta);
      upperTrim.position.y = h * 1.55;
      bGroup.add(upperTrim);
    }

    for (let i = -1; i <= 1; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.24, 0.24), matWood);
      beam.position.set(0, h - 0.6, i * (d * 0.28));
      bGroup.add(beam);
    }

    this.group.add(bGroup);
  }

  createPalmTree(x, z, matWood) {
    const tGroup = new THREE.Group();
    tGroup.position.set(x, 0, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 5.2, 7), matWood);
    trunk.position.y = 2.6;
    trunk.castShadow = true;
    tGroup.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x588c47, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.26, 0.7), leafMat);
      frond.position.set(Math.cos(ang) * 1.0, 5.1, Math.sin(ang) * 1.0);
      frond.rotation.y = -ang;
      frond.rotation.z = -0.35;
      tGroup.add(frond);
    }
    this.group.add(tGroup);
  }

  buildCutawayBabelTower(matSandstone, matTerracotta, matStoneHall, matWhiteColumn, matDarkArch, matWood, matGold) {
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(45.5, 48.0, 2.6, 56), matSandstone);
    plaza.position.y = -1.3;
    plaza.receiveShadow = true;
    plaza.userData = { isWalkway: true, isFloorDeck: true, deckY: 0 };
    this.group.add(plaza);
    this.walkwayMeshes.push(plaza);

    const innerFloor1 = new THREE.Mesh(new THREE.CylinderGeometry(37.0, 37.0, 0.9, 48), matStoneHall);
    innerFloor1.position.y = 0.45;
    innerFloor1.receiveShadow = true;
    innerFloor1.userData = { isWalkway: true, isFloorDeck: true, deckY: 0.9 };
    this.group.add(innerFloor1);
    this.walkwayMeshes.push(innerFloor1);

    // Central Monumental Elevator & Sacred Brazier Shaft
    const centralShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 5.2, 152, 20, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xb89f7d, roughness: 0.85, transparent: true, opacity: 0.42 })
    );
    centralShaft.position.y = 76;
    this.group.add(centralShaft);

    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const shaftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 152, 0.85), matTerracotta);
      shaftPillar.position.set(Math.cos(ang) * 4.8, 76, Math.sin(ang) * 4.8);
      this.group.add(shaftPillar);
    }

    // 5 Elevated Multi-Layer Walkable Circular Hall Decks + Cross-Atrium Bridges
    this.interiorDecks = [
      { y: 22, rOuter: 35.0, rHole: 10.5, mat: matStoneHall, bridgeAngle: 0.4 },
      { y: 48, rOuter: 31.5, rHole: 9.5, mat: matSandstone, bridgeAngle: 1.9 },
      { y: 76, rOuter: 27.5, rHole: 8.5, mat: matWhiteColumn, bridgeAngle: 0.8 },
      { y: 106, rOuter: 23.8, rHole: 7.5, mat: matWhiteColumn, bridgeAngle: 2.3 },
      { y: 134, rOuter: 20.2, rHole: 6.5, mat: matWood, bridgeAngle: 1.2 }
    ];

    const matBannerRed = new THREE.MeshStandardMaterial({ color: 0xb33939, roughness: 0.7 });
    const matWaterfall = new THREE.MeshStandardMaterial({
      color: 0x60d6df,
      emissive: 0x1e808a,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.78,
      roughness: 0.2
    });

    this.interiorDecks.forEach((dk, dIdx) => {
      const ringGeo = new THREE.RingGeometry(dk.rHole, dk.rOuter, 48);
      const ringMesh = new THREE.Mesh(
        ringGeo,
        new THREE.MeshStandardMaterial({ color: 0xd8c8ac, side: THREE.DoubleSide, roughness: 0.8 })
      );
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = dk.y;
      ringMesh.receiveShadow = true;
      ringMesh.userData = { isWalkway: true, isFloorDeck: true, deckY: dk.y };
      this.group.add(ringMesh);
      this.walkwayMeshes.push(ringMesh);

      const bridgeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(dk.rOuter * 1.75, 0.7, 5.2),
        dk.mat
      );
      bridgeMesh.position.set(0, dk.y - 0.25, 0);
      bridgeMesh.rotation.y = dk.bridgeAngle;
      bridgeMesh.receiveShadow = true;
      bridgeMesh.userData = { isWalkway: true, isFloorDeck: true, deckY: dk.y };
      this.group.add(bridgeMesh);
      this.walkwayMeshes.push(bridgeMesh);

      const archTorus = new THREE.Mesh(
        new THREE.TorusGeometry(4.2, 0.55, 10, 24, Math.PI),
        matSandstone
      );
      archTorus.position.set(Math.cos(dk.bridgeAngle) * (dk.rHole + 2.5), dk.y + 0.2, -Math.sin(dk.bridgeAngle) * (dk.rHole + 2.5));
      archTorus.rotation.y = dk.bridgeAngle + Math.PI / 2;
      this.group.add(archTorus);

      const outerRim = new THREE.Mesh(new THREE.TorusGeometry(dk.rOuter, 0.58, 10, 48), matTerracotta);
      outerRim.rotation.x = Math.PI / 2;
      outerRim.position.y = dk.y;
      this.group.add(outerRim);

      const innerRim = new THREE.Mesh(new THREE.TorusGeometry(dk.rHole, 0.42, 10, 48), matTerracotta);
      innerRim.rotation.x = Math.PI / 2;
      innerRim.position.y = dk.y;
      this.group.add(innerRim);

      // Add Hinged Crimson Sun-Glyph Hanging Banners around each tier (swings physically with tower tilt & wind!)
      for (let b = 0; b < 4; b++) {
        const bAng = (b / 4) * Math.PI * 2 + dIdx * 0.5;
        const bannerPivot = new THREE.Group();
        bannerPivot.position.set(Math.cos(bAng) * (dk.rOuter + 0.35), dk.y - 0.15, Math.sin(bAng) * (dk.rOuter + 0.35));
        bannerPivot.rotation.y = -bAng + Math.PI / 2;

        const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 1.9, 8), matWood);
        crossBar.rotation.z = Math.PI / 2;
        bannerPivot.add(crossBar);

        const banner = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5.4, 0.12), matBannerRed);
        banner.position.y = -2.75;
        banner.castShadow = true;
        const sunEmblem = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 12), matGold);
        sunEmblem.rotation.x = Math.PI / 2;
        banner.add(sunEmblem);
        bannerPivot.add(banner);

        this.group.add(bannerPivot);
        this.hangingBanners.push({
          pivot: bannerPivot,
          baseRotY: -bAng + Math.PI / 2,
          ang: bAng,
          phase: dIdx * 1.7 + b * 1.1
        });
      }

      // Add Detachable Masonry Parapet / Cornice Blocks around the rim of each tier (these are part of the tower itself and can crack & fall!)
      const parapetCount = 12;
      for (let p = 0; p < parapetCount; p++) {
        const pAng = (p / parapetCount) * Math.PI * 2 + dIdx * 0.25;
        const pRadius = dk.rOuter - 0.45;
        const blockMat = (p % 2 === 0 ? matSandstone : matTerracotta).clone();
        const parapetBlock = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.35, 1.45), blockMat);
        parapetBlock.position.set(
          Math.cos(pAng) * pRadius,
          dk.y + 0.72,
          Math.sin(pAng) * pRadius
        );
        parapetBlock.rotation.y = -pAng;
        parapetBlock.castShadow = true;
        parapetBlock.receiveShadow = true;
        this.group.add(parapetBlock);

        this.detachableBlocks.push({
          mesh: parapetBlock,
          origPos: parapetBlock.position.clone(),
          ang: pAng,
          y: dk.y + 0.72,
          detached: false
        });
      }

      // Add Cascading Aqueduct Waterfalls & Waterwheels on the first 3 tiers (matching reference sheets!)
      if (dIdx < 3) {
        const wfAng = dIdx * 2.1 + 0.7;
        const wfHeight = dIdx === 0 ? 22 : 26;
        const wfMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, wfHeight, 0.45), matWaterfall);
        wfMesh.position.set(
          Math.cos(wfAng) * (dk.rOuter - 0.2),
          dk.y - wfHeight * 0.5,
          Math.sin(wfAng) * (dk.rOuter - 0.2)
        );
        wfMesh.rotation.y = -wfAng + Math.PI / 2;
        this.group.add(wfMesh);
        this.waterfalls.push(wfMesh);

        // Ancient Rotating Waterwheel beside the waterfall
        const wheelGroup = new THREE.Group();
        wheelGroup.position.set(
          Math.cos(wfAng + 0.12) * (dk.rOuter + 0.6),
          dk.y - wfHeight * 0.5,
          Math.sin(wfAng + 0.12) * (dk.rOuter + 0.6)
        );
        wheelGroup.rotation.y = -wfAng;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.28, 8, 20), matWood);
        wheelGroup.add(rim);
        for (let sp = 0; sp < 4; sp++) {
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.24, 0.24), matWood);
          spoke.rotation.z = (sp / 4) * Math.PI;
          wheelGroup.add(spoke);
        }
        this.group.add(wheelGroup);
        this.waterwheels.push(wheelGroup);
      }
    });

    // Semi-Cutaway Outer Arched Wall of the Circular Stone Hall (0m - 48m)
    const pierCount = 16;
    for (let i = 0; i < pierCount; i++) {
      const ang = (i / pierCount) * Math.PI * 2;
      const r = 35.8;
      const pier = new THREE.Mesh(new THREE.BoxGeometry(3.0, 47.5, 3.4), matSandstone);
      pier.position.set(Math.cos(ang) * r, 23.75, Math.sin(ang) * r);
      pier.rotation.y = -ang;
      pier.castShadow = true;
      pier.receiveShadow = true;
      this.group.add(pier);

      const darkWin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 7.5, 3.8), matDarkArch);
      darkWin.position.set(Math.cos(ang + Math.PI / pierCount) * (r - 1.2), 12.0, Math.sin(ang + Math.PI / pierCount) * (r - 1.2));
      darkWin.rotation.y = -(ang + Math.PI / pierCount);
      this.group.add(darkWin);

      const archRim = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.38, 8, 16, Math.PI), matTerracotta);
      archRim.position.set(Math.cos(ang + Math.PI / pierCount) * (r - 0.5), 15.8, Math.sin(ang + Math.PI / pierCount) * (r - 0.5));
      archRim.rotation.y = -(ang + Math.PI / pierCount) + Math.PI / 2;
      this.group.add(archRim);

      const archCrown = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 8.2), matTerracotta.clone());
      archCrown.position.set(Math.cos(ang + Math.PI / pierCount) * r, 46.8, Math.sin(ang + Math.PI / pierCount) * r);
      archCrown.rotation.y = -(ang + Math.PI / pierCount);
      this.group.add(archCrown);

      this.detachableBlocks.push({
        mesh: archCrown,
        origPos: archCrown.position.clone(),
        ang: ang + Math.PI / pierCount,
        y: 46.8,
        detached: false
      });
    }

    // Mid-Upper Circular Colonnade (48m - 106m)
    const colonnadeLevels = [
      { yStart: 48, h: 28, rOuter: 30.2, rInner: 18.5, count: 18 },
      { yStart: 76, h: 30, rOuter: 26.2, rInner: 15.8, count: 16 }
    ];
    colonnadeLevels.forEach((cl) => {
      for (let i = 0; i < cl.count; i++) {
        const ang = (i / cl.count) * Math.PI * 2;
        const colOut = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, cl.h - 0.8, 12), matWhiteColumn);
        colOut.position.set(Math.cos(ang) * cl.rOuter, cl.yStart + cl.h * 0.5, Math.sin(ang) * cl.rOuter);
        colOut.castShadow = true;
        this.group.add(colOut);

        // Detachable Column Capital Stone Block atop each outer column!
        const capBlock = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.2, 1.85), matSandstone.clone());
        capBlock.position.set(Math.cos(ang) * cl.rOuter, cl.yStart + cl.h - 0.5, Math.sin(ang) * cl.rOuter);
        capBlock.rotation.y = -ang;
        capBlock.castShadow = true;
        this.group.add(capBlock);
        this.detachableBlocks.push({
          mesh: capBlock,
          origPos: capBlock.position.clone(),
          ang,
          y: cl.yStart + cl.h - 0.5,
          detached: false
        });

        if (i % 2 === 0) {
          const colIn = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.68, cl.h - 0.8, 10), matStoneHall);
          colIn.position.set(Math.cos(ang) * cl.rInner, cl.yStart + cl.h * 0.5, Math.sin(ang) * cl.rInner);
          this.group.add(colIn);
        }
      }
    });

    // High Wooden Scaffolding & Cranes (106m - 160m)
    const poleCount = 14;
    for (let i = 0; i < poleCount; i++) {
      const ang = (i / poleCount) * Math.PI * 2;
      const rBot = this.getRadiusAtHeight(106) - 1.2;
      const rTop = this.getRadiusAtHeight(158) - 0.8;
      const pBot = new THREE.Vector3(Math.cos(ang) * rBot, 106, Math.sin(ang) * rBot);
      const pTop = new THREE.Vector3(Math.cos(ang) * rTop, 158, Math.sin(ang) * rTop);
      this.createTimberBeam(pBot, pTop, 0.38, matWood);
    }

    const craneHeights = [26, 56, 86, 118, 142];
    craneHeights.forEach((cy, idx) => {
      const ang = idx * 1.45 + 0.4;
      const r = this.getRadiusAtHeight(cy) + 3.2;
      const craneGroup = new THREE.Group();
      craneGroup.position.set(Math.cos(ang) * r, cy, Math.sin(ang) * r);
      craneGroup.rotation.y = -ang;

      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.55, 10.5, 0.55), matWood);
      mast.position.y = 5.25;
      const jib = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.45, 0.45), matWood);
      jib.position.set(2.4, 9.8, 0);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.4), matWood);
      rope.position.set(5.2, 7.6, 0);
      const stoneBlock = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.5, 1.9), matSandstone);
      stoneBlock.position.set(5.2, 5.2, 0);

      craneGroup.add(mast, jib, rope, stoneBlock);
      this.group.add(craneGroup);
      this.cranes.push({ group: craneGroup, block: stoneBlock, baseY: 5.2, phase: idx });
    });

    // Summit Sanctuary & Hand of God at 160m
    const altarBase = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 11.8, 2.5, 32), matWhiteColumn);
    altarBase.position.y = 159.0;
    altarBase.userData = { isWalkway: true, isFloorDeck: true, deckY: 159.0 };
    this.group.add(altarBase);
    this.walkwayMeshes.push(altarBase);

    this.summitHalo = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.34, 12, 48), matGold);
    this.summitHalo.position.set(0, 164.0, 0);
    this.group.add(this.summitHalo);

    this.godHandGroup = new THREE.Group();
    this.godHandGroup.position.set(5.5, 166.0, 0);
    const matGodHand = new THREE.MeshStandardMaterial({ color: 0xfff3d6, roughness: 0.35, metalness: 0.25, emissive: 0x6b5322 });
    this.godHandGroup.add(new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.3, 2.4), matGodHand));
    const indexFinger = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.55, 0.55), matGodHand);
    indexFinger.position.set(-2.5, -0.15, 0.65);
    indexFinger.rotation.z = 0.18;
    this.godHandGroup.add(indexFinger);
    for (let f = 0; f < 3; f++) {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.5), matGodHand);
      finger.position.set(-1.9, -0.28 - f * 0.12, -0.05 - f * 0.6);
      finger.rotation.z = 0.35;
      this.godHandGroup.add(finger);
    }
    this.group.add(this.godHandGroup);
  }

  createTimberBeam(p1, p2, thickness, material) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, len, thickness), material);
    mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  buildSpiralWalkway(matSandstone, matTerracotta, matStoneHall, matWhiteColumn, matWood) {
    this.nodes = [];
    for (let i = 0; i <= this.pathSegments; i++) {
      const s = i / this.pathSegments;
      const pos = this.getPointOnSpiral(s, 0);
      const zone = this.getZoneAtHeight(pos.y, s);

      this.nodes.push({
        index: i,
        s,
        pos,
        zone,
        isGap: false,
        gapRepaired: true,
        gapMesh: null,
        isFragile: false,
        fragileLoadTime: 0,
        collapsed: false,
        segMesh: null
      });
    }

    // 7 Strategic Broken Bridges / Chasms requiring Mason + Strongman's Physically Stacked Wood/Stone
    const chasmIndices = [52, 146, 212, 284, 356, 424, 486];
    chasmIndices.forEach((idx) => {
      for (let k = idx; k <= idx + 2; k++) {
        if (this.nodes[k]) {
          this.nodes[k].isGap = true;
          this.nodes[k].gapRepaired = false;
        }
      }
    });

    // Cracked / Fragile Slabs inside the Tower
    for (let i = 168; i < this.pathSegments - 18; i += 32) {
      if (!this.nodes[i].isGap && !this.nodes[i + 1].isGap) {
        this.nodes[i].isFragile = true;
        this.nodes[i + 1].isFragile = true;
      }
    }

    for (let i = 0; i < this.pathSegments; i++) {
      const n1 = this.nodes[i];
      const n2 = this.nodes[i + 1];
      const mid = new THREE.Vector3().addVectors(n1.pos, n2.pos).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(n2.pos, n1.pos);
      const segLen = dir.length();

      let mat = matSandstone;
      let width = 7.2;
      let thickness = 0.95;
      if (n1.zone === 'INTERIOR_STONE_HALL') {
        mat = matStoneHall;
        width = 6.8;
      } else if (n1.zone === 'COLONNADE_ATRIUM') {
        mat = matWhiteColumn;
        width = 6.4;
      } else if (n1.zone === 'HIGH_SCAFFOLD') {
        mat = matWood;
        width = 5.4;
        thickness = 0.6;
      }
      if (n1.isFragile) {
        mat = matTerracotta.clone();
      }

      n1.halfWidth = width * 0.5;

      const segGeo = new THREE.BoxGeometry(width, thickness, segLen + 0.45);
      const segMesh = new THREE.Mesh(segGeo, mat);
      segMesh.position.copy(mid);
      segMesh.position.y -= thickness * 0.5;
      segMesh.lookAt(n2.pos.clone());
      segMesh.receiveShadow = true;
      segMesh.castShadow = true;
      segMesh.userData = { nodeIndex: i, isWalkway: true };

      n1.segMesh = segMesh;
      n1.solidMaterial = mat;
      n1.plankMeshes = [];

      if (n1.isGap) {
        // Make the base collider nearly invisible for raycast clicking across the chasm
        segMesh.material = new THREE.MeshBasicMaterial({
          color: 0xd98354,
          transparent: true,
          opacity: 0.08,
          depthWrite: false
        });
        n1.gapMesh = segMesh;
        n1.solidMaterial = matWood;

        // Build Dedicated 3D Wooden Bridge Stringer Rails + 4 Individual 3D Wooden Planks per Gap Segment!
        const bridgeGroup = new THREE.Group();
        bridgeGroup.position.copy(mid);
        bridgeGroup.lookAt(n2.pos.clone());
        this.group.add(bridgeGroup);

        const railGeo = new THREE.BoxGeometry(0.28, 0.24, segLen + 0.5);
        const railMat = new THREE.MeshStandardMaterial({ color: 0x8c5220, roughness: 0.9 });
        const railL = new THREE.Mesh(railGeo, railMat);
        railL.position.set(-width * 0.38, -0.25, 0);
        const railR = new THREE.Mesh(railGeo, railMat);
        railR.position.set(width * 0.38, -0.25, 0);
        bridgeGroup.add(railL, railR);

        const plankCount = 4;
        const plankDepth = (segLen + 0.2) / plankCount;
        for (let p = 0; p < plankCount; p++) {
          const pMat = new THREE.MeshStandardMaterial({
            color: p % 2 === 0 ? 0xc87d3b : 0xb56b2b,
            roughness: 0.82
          });
          const plank = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.24, plankDepth * 0.86), pMat);
          const zOff = -segLen * 0.5 + (p + 0.5) * (segLen / plankCount);
          plank.position.set(0, 1.4, zOff); // Starts raised so it slams down when hammered!
          plank.castShadow = true;
          plank.receiveShadow = true;
          plank.visible = false;
          plank.userData = { targetY: -0.08, dropProgress: 0 };
          bridgeGroup.add(plank);
          n1.plankMeshes.push(plank);
        }
      }

      this.group.add(segMesh);
      this.walkwayMeshes.push(segMesh);
    }
  }

  // Reveals & animates 3D wooden planks slamming down across a chasm as the Mason hammers!
  updateChasmPlanks(centerNodeIdx, progressPct) {
    const gapNodes = [];
    for (let k = Math.max(0, centerNodeIdx - 3); k <= Math.min(this.pathSegments, centerNodeIdx + 3); k++) {
      if (this.nodes[k] && this.nodes[k].isGap) {
        gapNodes.push(this.nodes[k]);
      }
    }
    const allPlanks = [];
    gapNodes.forEach((gn) => {
      if (gn.plankMeshes) allPlanks.push(...gn.plankMeshes);
    });
    if (allPlanks.length === 0) return;

    const revealCount = Math.ceil((Math.min(100, progressPct) / 100) * allPlanks.length);
    for (let i = 0; i < revealCount; i++) {
      const pl = allPlanks[i];
      if (!pl.visible) {
        pl.visible = true;
        pl.position.y = 1.35;
        pl.userData.dropProgress = 0.01;
      }
    }
  }

  // Spawns flying 3D wood chips & golden hammer sparks at the bridge construction point!
  spawnBuildSparks(pos) {
    for (let i = 0; i < 6; i++) {
      const isChip = i % 2 === 0;
      const geo = isChip ? new THREE.BoxGeometry(0.32, 0.10, 0.16) : new THREE.BoxGeometry(0.14, 0.14, 0.14);
      const mat = new THREE.MeshBasicMaterial({ color: isChip ? 0xd48b45 : 0xffeaa7 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.6 + Math.random() * 0.5, (Math.random() - 0.5) * 1.6));
      this.group.add(mesh);
      this.buildSparks.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 4.5, 3.2 + Math.random() * 3.0, (Math.random() - 0.5) * 4.5),
        life: 0.55
      });
    }
  }

  populateProceduralFeatures(matSandstone, matWood, matGold, matTerracotta, matStoneHall) {
    const matFood = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.65 });
    const matPlateBrown = new THREE.MeshStandardMaterial({ color: 0xb85d38, roughness: 0.7 });
    const matCyanRune = new THREE.MeshStandardMaterial({
      color: 0x70e1d7,
      emissive: 0x38ada9,
      emissiveIntensity: 0.45,
      roughness: 0.25
    });

    // 1. Food Supplies (🍞), Timber Logs (🪵) & Stone Quarries (🪨)
    for (let i = 14; i < this.pathSegments - 16; i += 16) {
      if (this.nodes[i].isGap) continue;
      const node = this.nodes[i];
      const mod = (i / 16) % 3;
      const resType = mod === 0 ? 'FOOD_RESOURCE' : (mod === 1 ? 'WOOD_RESOURCE' : 'STONE_RESOURCE');

      const sideOffset = ((i % 2 === 0) ? 1 : -1) * 1.8;
      const resPos = this.getPointOnSpiral(node.s, sideOffset);
      const resGroup = new THREE.Group();
      resGroup.position.copy(resPos);

      if (resType === 'FOOD_RESOURCE') {
        for (let b = 0; b < 3; b++) {
          const sack = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), matFood);
          sack.scale.set(1.0, 1.25, 0.9);
          sack.position.set((b - 1) * 0.42, 0.35, (b % 2) * 0.22);
          resGroup.add(sack);
        }
      } else if (resType === 'WOOD_RESOURCE') {
        for (let b = 0; b < 3; b++) {
          const log = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.3, 8), matWood);
          log.rotation.z = Math.PI / 2;
          log.position.set(0, 0.24 + (b % 2) * 0.26, (b - 1) * 0.32);
          resGroup.add(log);
        }
      } else {
        for (let b = 0; b < 3; b++) {
          const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), matStoneHall);
          stone.position.set((b - 1) * 0.42, 0.32, (b % 2) * 0.28);
          resGroup.add(stone);
        }
      }

      this.group.add(resGroup);
      this.interactables.push({
        type: resType,
        id: `res_${i}`,
        nodeIndex: i,
        pos: resPos,
        mesh: resGroup,
        remainingCount: 3,
        triggered: false
      });
    }

    // 2. 6 Tricky Squad Composition & Multi-Mechanism Checkpoints (刁钻队伍构成条件 + 配重木箱 + 三处译码碑 0/3)
    const gateDefs = [
      {
        nodeIdx: 112, // Gate 1: City Gate / Babel Tower Entrance (s ~ 0.207)
        plateOffset: new THREE.Vector3(0, 0, -4.6),
        hasPushCrate: true,
        reqLangs: ['A', 'B'],
        title: '【塔基城门 · 配重木箱与双语检定】',
        hint: '城门检定：① 语言链连通 [☼ + ♒]；② 队伍构成需【至少 1 名💪大力士 + 在场总配重 ≥ 6（人+背负物资+配重木箱）】！',
        compCheck: (crowd, activeSquad, gate) => {
          const hasStrong = activeSquad.some((u) => u.skill.id === 'STRONGMAN');
          const totalMass = activeSquad.length + crowd.totalCarryCount + (gate.crateOnPlate ? 3 : 0);
          return {
            passed: hasStrong && totalMass >= 6,
            isWarning: false,
            label: `队伍构成：💪大力士在队 且 总配重 ≥ 6 (当前 ${totalMass}/6)`
          };
        }
      },
      {
        nodeIdx: 186, // Gate 2: Lower Stone Hall Aqueduct Gate (y ~ 22m, s ~ 0.344) — Tricky Headcount Limit!
        plateOffset: new THREE.Vector3(-4.4, 0, 3.8),
        reqLangs: ['A', 'B', 'C'],
        title: '【一层水道窄桥 · 严苛限重与三语矛盾检定】',
        hint: '⚠️ 刁钻条件：古老水道桥承重有限，要求【全队同行人数 ≤ 6 人】，但同时必须包含【☼ + ♒ + ▲】三种符号！快在顶部点 [×] 让多余单语者脱队！',
        compCheck: (crowd, activeSquad) => {
          const count = activeSquad.length;
          const ok = count <= 6;
          return {
            passed: ok,
            isWarning: !ok,
            label: ok
              ? `水道桥限重：同行人数 ${count}/6 人 (符合限重)`
              : `水道桥超载警报：当前 ${count} 人！(上限 ≤ 6 人，请点顶部 [×] 脱队精简队伍!)`
          };
        }
      },
      {
        nodeIdx: 256, // Gate 3: Workshop & Counterweight Hoist Gate (y ~ 48m, s ~ 0.474)
        plateOffset: new THREE.Vector3(4.5, 0, -3.6),
        hasPushCrate: true,
        reqLangs: ['B', 'C'],
        title: '【二层工坊机械层 · 筑匠与实体木石配重检定】',
        hint: '机械层检定：需【🔨建筑工人 + 💪大力士同时在场】且队员头顶【实体背负至少 2 件 🪵原木/🪨石砖】以驱动升降齿轮！',
        compCheck: (crowd, activeSquad) => {
          const hasMason = activeSquad.some((u) => u.skill.id === 'MASON');
          const matCount = crowd.woodSupply + crowd.stoneSupply;
          const ok = hasMason && matCount >= 2;
          return {
            passed: ok,
            isWarning: false,
            label: `工坊构成：🔨建筑工在队 且 背负木石 ≥ 2 件 (当前 ${matCount}/2)`
          };
        }
      },
      {
        nodeIdx: 332, // Gate 4: Hieroglyphic & Cloud Colonnade — 3 Rune Decoder Steles (0/3)! (y ~ 76m, s ~ 0.615)
        plateOffset: new THREE.Vector3(-4.8, 0, -3.5),
        reqLangs: ['B', 'C', 'D'],
        hasThreeSteles: true,
        isOpenSourceGate: true,
        title: '【三层圣书体回廊 · 启动三处传语译码碑 (0/3)】',
        hint: '上层阶梯已被封锁！需【🔑铭文破译师在队】，并点击中庭横桥与侧翼平台的【3 处发光译码碑 (0/3)】逐一激活！',
        compCheck: (crowd, activeSquad) => {
          const hasScholar = activeSquad.some((u) => u.skill.id === 'SCHOLAR' || u.langs.length > 1);
          return {
            passed: hasScholar,
            isWarning: false,
            label: `学者构成：需 🔑铭文破译师 或 2名双语中介在队`
          };
        }
      },
      {
        nodeIdx: 404, // Gate 5: Shattered Sanctuary — Tricky Light-Load Check! (y ~ 106m, s ~ 0.748)
        plateOffset: new THREE.Vector3(4.2, 0, 4.0),
        reqLangs: ['C', 'D', 'E'],
        title: '【四层破碎圣庭 · 浮空轻装与飞跃者检定】',
        hint: '⚠️ 刁钻轻装检定：破碎圣庭的浮空石板极脆，要求【全队总背负物资 ≤ 4 件】且包含【🤸轻盈飞跃者】！请点击头像旁 [卸] 减重！',
        compCheck: (crowd, activeSquad) => {
          const hasAcrobat = activeSquad.some((u) => u.skill.id === 'ACROBAT' || u.isChild);
          const carry = crowd.totalCarryCount;
          const loadOk = carry <= 4;
          return {
            passed: hasAcrobat && loadOk,
            isWarning: !loadOk,
            label: loadOk
              ? `浮空圣庭限重：总背负 ${carry}/4 件 且 🤸飞跃者探路`
              : `浮空石板超重警报：当前背负 ${carry} 件！(需 ≤ 4 件，请点顶部 [卸] 抛弃重物!)`
          };
        }
      },
      {
        nodeIdx: 468, // Gate 6: Cloud Corridor Summit Gate (y ~ 134m, s ~ 0.866)
        plateOffset: new THREE.Vector3(-3.8, 0, 3.2),
        hasThreeSteles: true,
        reqLangs: ['D', 'E', 'F'],
        title: '【五层云端回廊 · 护盾抗石与同位语天关】',
        hint: '终极检定：需连通【◎ + 𓂀 + ❖】三语、激活云端三处译码碑，或按 [E 万语共鸣] 唤醒全人类合力！',
        compCheck: (crowd, activeSquad) => {
          const bridgeCount = activeSquad.filter((u) => u.langs.length > 1).length;
          return {
            passed: bridgeCount >= 2 || crowd.rosettaTimer > 0,
            isWarning: false,
            label: `天关构成：至少 2 名双语中介在队 (当前 ${bridgeCount}/2)`
          };
        }
      }
    ];

    gateDefs.forEach((gd, idx) => {
      const node = this.nodes[gd.nodeIdx];
      if (!node) return;
      const gateGroup = new THREE.Group();
      gateGroup.position.copy(node.pos);

      const primaryL = gd.reqLangs[0];
      const cfg = window.LANG_CONFIG[primaryL] || window.LANG_CONFIG.A;
      const colorHex = new THREE.Color(cfg.color).getHex();

      const sideTerrace = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.95, 10.5), matSandstone);
      sideTerrace.position.set(gd.plateOffset.x * 0.65, -0.45, gd.plateOffset.z * 0.65);
      sideTerrace.receiveShadow = true;
      sideTerrace.userData = { nodeIndex: gd.nodeIdx, isWalkway: true, isPuzzleTerrace: true };
      gateGroup.add(sideTerrace);
      this.walkwayMeshes.push(sideTerrace);

      const brownPlate = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.32, 3.8),
        matPlateBrown.clone()
      );
      brownPlate.position.set(gd.plateOffset.x, 0.16, gd.plateOffset.z);
      brownPlate.receiveShadow = true;
      brownPlate.userData = { nodeIndex: gd.nodeIdx, isWalkway: true, isPressurePlate: true };
      gateGroup.add(brownPlate);
      this.walkwayMeshes.push(brownPlate);

      const runePedestal = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 1.1), matSandstone);
      runePedestal.position.set(gd.plateOffset.x * 0.35, 0.5, gd.plateOffset.z * 0.35);
      const cyanCube = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), matCyanRune.clone());
      cyanCube.position.set(gd.plateOffset.x * 0.35, 1.45, gd.plateOffset.z * 0.35);
      gateGroup.add(runePedestal, cyanCube);

      // Optional Pushable Counterweight Crate (📦 可推动配重木箱) on the terrace
      let crateMesh = null;
      let crateWorldPos = null;
      if (gd.hasPushCrate) {
        crateMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 1.5, 1.5),
          new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.8 })
        );
        const startLocal = new THREE.Vector3(gd.plateOffset.x * 0.45, 0.8, gd.plateOffset.z * 1.15);
        crateMesh.position.copy(startLocal);
        crateMesh.castShadow = true;
        gateGroup.add(crateMesh);
        crateWorldPos = node.pos.clone().add(startLocal);
      }

      // Optional 3 Rune Decoder Steles (三处传语译码碑 0/3, matching reference sheets!)
      const steles = [];
      if (gd.hasThreeSteles) {
        const steleOffsets = [
          new THREE.Vector3(gd.plateOffset.x * 0.85, 0, -gd.plateOffset.z * 0.6),
          new THREE.Vector3(-gd.plateOffset.x * 0.9, 0, gd.plateOffset.z * 0.7),
          new THREE.Vector3(0, 0, gd.plateOffset.z * 1.1)
        ];
        steleOffsets.forEach((sOff, sIdx) => {
          const reqL = gd.reqLangs[sIdx % gd.reqLangs.length];
          const sCfg = window.LANG_CONFIG[reqL] || window.LANG_CONFIG.A;
          const steleGroup = new THREE.Group();
          steleGroup.position.copy(node.pos).add(sOff);

          const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.4), matSandstone);
          base.position.y = 0.25;
          const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 2.4, 0.55),
            new THREE.MeshStandardMaterial({ color: 0x34495e, emissive: 0x1a252f, roughness: 0.4 })
          );
          pillar.position.y = 1.45;
          const orb = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.48, 0),
            new THREE.MeshStandardMaterial({ color: sCfg.color, emissive: sCfg.color, emissiveIntensity: 0.5 })
          );
          orb.position.y = 3.05;

          const sLabelTex = window.SpriteFactory.createBubbleTexture(`译码碑 [${sCfg.symbol}]`, sCfg.color);
          const sLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: sLabelTex, transparent: true }));
          sLabel.scale.set(2.4, 0.7, 1);
          sLabel.position.y = 4.0;

          steleGroup.add(base, pillar, orb, sLabel);
          steleGroup.userData = { nodeIndex: gd.nodeIdx, isWalkway: true };
          this.group.add(steleGroup);
          this.walkwayMeshes.push(base);

          steles.push({
            id: `stele_${idx}_${sIdx}`,
            reqLang: reqL,
            pos: steleGroup.position.clone(),
            orbMesh: orb,
            pillarMesh: pillar,
            labelSprite: sLabel,
            activated: false
          });
        });
      }

      const gateMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.76
      });
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(6.0, 4.0, 0.55), gateMat);
      barrier.position.y = 2.0;
      gateGroup.add(barrier);

      const symbolsStr = gd.reqLangs.map((l) => (window.LANG_CONFIG[l] ? window.LANG_CONFIG[l].symbol : l)).join(' + ');
      const labelTex = window.SpriteFactory.createBubbleTexture(`🔒 检定 [${symbolsStr}]`, cfg.color);
      const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));
      labelSprite.scale.set(4.0, 1.12, 1);
      labelSprite.position.y = 4.6;
      gateGroup.add(labelSprite);

      this.group.add(gateGroup);
      const plateWorldPos = node.pos.clone().add(new THREE.Vector3(gd.plateOffset.x, 0, gd.plateOffset.z));

      this.languageGates.push({
        id: `gate_${idx}`,
        nodeIndex: gd.nodeIdx,
        s: node.s,
        pos: node.pos.clone(),
        plateWorldPos,
        brownPlateMesh: brownPlate,
        cyanCubeMesh: cyanCube,
        crateMesh,
        crateWorldPos,
        crateOnPlate: false,
        steles,
        reqLangs: gd.reqLangs,
        compCheck: gd.compCheck || null,
        isOpenSourceGate: Boolean(gd.isOpenSourceGate),
        title: gd.title,
        hint: gd.hint,
        barrierMesh: barrier,
        labelSprite,
        platePressed: false,
        unlocked: false,
        unlockProgress: 0
      });
    });

    // 3. Cold-Storage Miracle Card Shrines (🃏)
    [95, 224, 348, 445].forEach((nIdx, sIdx) => {
      const node = this.nodes[nIdx];
      if (!node) return;
      const shrinePos = this.getPointOnSpiral(node.s, -2.0);
      const shrineGroup = new THREE.Group();
      shrineGroup.position.copy(shrinePos);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 1.2, 8), matGold);
      ped.position.y = 0.6;
      const crystal = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x82ccdd, emissive: 0x38ada9, roughness: 0.2 })
      );
      crystal.position.y = 1.95;
      shrineGroup.add(ped, crystal);
      this.group.add(shrineGroup);
      this.interactables.push({
        type: 'SHRINE',
        id: `shrine_${sIdx}`,
        nodeIndex: nIdx,
        pos: shrinePos,
        mesh: crystal,
        group: shrineGroup,
        triggered: false
      });
    });

    // 4. Anachronistic Miracle Clues (🥫)
    [156, 268, 378, 492].forEach((i, rIdx) => {
      const node = this.nodes[i];
      if (!node || node.isGap) return;
      const relicPos = this.getPointOnSpiral(node.s, 1.8);
      const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.15, 0.4), matGold);
      tablet.position.copy(relicPos).add(new THREE.Vector3(0, 1.0, 0));
      this.group.add(tablet);
      this.interactables.push({
        type: 'RELIC',
        id: `relic_${rIdx}`,
        relicIndex: rIdx,
        nodeIndex: i,
        pos: relicPos,
        mesh: tablet,
        triggered: false
      });
    });
  }

  // Builds physical 3D suspension ladders (悬梯) and overhead clearance obstacles across the spiral path
  buildSuspensionLaddersAndClearanceObstacles(matWood, matSandstone, matTerracotta) {
    this.overheadObstacles = [];

    const matRope = new THREE.MeshStandardMaterial({ color: 0x8a7249, roughness: 0.95 });
    const matWoodDark = new THREE.MeshStandardMaterial({ color: 0x8c5220, roughness: 0.88 });

    // Strategic locations across the spiral path where low suspension ladders & arches hang
    const obstacleConfigs = [
      { s: 0.155, clearance: 4.5, title: '远古城门石拱券', type: 'ARCH' },
      { s: 0.285, clearance: 4.0, title: '低矮工坊悬梯', type: 'SUSPENSION_LADDER' },
      { s: 0.420, clearance: 3.8, title: '回廊工木吊梯', type: 'SUSPENSION_LADDER' },
      { s: 0.565, clearance: 4.2, title: '引水渠悬跨木梯', type: 'SUSPENSION_LADDER' },
      { s: 0.710, clearance: 3.8, title: '高空天桥悬梯', type: 'SUSPENSION_LADDER' },
      { s: 0.865, clearance: 4.0, title: '穹顶工架吊梯', type: 'SUSPENSION_LADDER' }
    ];

    obstacleConfigs.forEach((cfg, idx) => {
      const pos = this.getPointOnSpiral(cfg.s, 0);
      const pPrev = this.getPointOnSpiral(Math.max(0, cfg.s - 0.002), 0);
      const pNext = this.getPointOnSpiral(Math.min(1, cfg.s + 0.002), 0);
      const tangent = new THREE.Vector3().subVectors(pNext, pPrev).normalize();

      const group = new THREE.Group();
      group.position.copy(pos);
      // Face perpendicular to walking tangent
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

      const cl = cfg.clearance;

      if (cfg.type === 'SUSPENSION_LADDER') {
        // Vertical side rails of suspension ladder hanging overhead
        const railL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.8, 0.22), matWood);
        const railR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.8, 0.22), matWood);
        railL.position.set(-2.2, cl + 1.9, 0);
        railR.position.set(2.2, cl + 1.9, 0);
        group.add(railL, railR);

        // 6 Wooden Rungs
        for (let r = 0; r < 6; r++) {
          const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 8), matWoodDark);
          rung.rotation.z = Math.PI / 2;
          rung.position.set(0, cl + 0.25 + r * 0.62, 0);
          rung.castShadow = true;
          group.add(rung);
        }

        // Hanging Rope Rigging up to tower ceiling/rock
        const ropeL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 6.5, 6), matRope);
        const ropeR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 6.5, 6), matRope);
        ropeL.position.set(-2.2, cl + 5.5, 0);
        ropeR.position.set(2.2, cl + 5.5, 0);
        group.add(ropeL, ropeR);

        // Wooden Warning Signboard hanging under lowest rung
        const board = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.44, 0.08), matWoodDark);
        board.position.set(0, cl + 0.12, 0);
        group.add(board);

        const signTex = window.SpriteFactory.createBubbleTexture(`⚠️ 限高 ${cl}m · 悬梯碰顶挤落`, '#e74c3c');
        const signSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex, transparent: true }));
        signSprite.scale.set(3.4, 0.88, 1);
        signSprite.position.set(0, cl + 0.75, 0);
        group.add(signSprite);
      } else {
        // Archway lintel beam
        const archBeam = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.75, 0.85), matSandstone);
        archBeam.position.set(0, cl + 0.38, 0);
        archBeam.castShadow = true;
        group.add(archBeam);

        const signTex = window.SpriteFactory.createBubbleTexture(`⚠️ 低矮城门券顶 · 限高挤落`, '#e67e22');
        const signSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex, transparent: true }));
        signSprite.scale.set(3.4, 0.88, 1);
        signSprite.position.set(0, cl + 1.15, 0);
        group.add(signSprite);
      }

      this.group.add(group);
      this.overheadObstacles.push({
        id: `obs_${idx}`,
        s: cfg.s,
        pos: pos.clone(),
        clearanceHeight: cfg.clearance,
        radius: 3.2,
        name: cfg.title,
        mesh: group
      });
    });
  }

  // Detaches an ACTUAL Structural Masonry Block / Column Capital / Arch Stone from the Babel Tower itself!
  // No extra spawned rock props or artificial 2D rings — the falling stone comes directly from the tower's architecture!
  spawnFallingRock(targetNode) {
    if (!targetNode || !this.detachableBlocks || this.detachableBlocks.length === 0) return;

    const targetPos = targetNode.pos;
    const targetAng = Math.atan2(targetPos.z, targetPos.x);

    // Find an un-detached structural block on the tower above the squad's current altitude and near their azimuth
    const candidates = this.detachableBlocks.filter((b) => !b.detached && b.y > targetPos.y + 4.0 && b.y < targetPos.y + 52.0);
    if (candidates.length === 0) return;

    candidates.sort((a, b) => {
      let da = Math.abs(Math.atan2(Math.sin(a.ang - targetAng), Math.cos(a.ang - targetAng)));
      let db = Math.abs(Math.atan2(Math.sin(b.ang - targetAng), Math.cos(b.ang - targetAng)));
      return (da + Math.abs(a.y - (targetPos.y + 18)) * 0.04) - (db + Math.abs(b.y - (targetPos.y + 18)) * 0.04);
    });

    const chosen = candidates[0];
    chosen.detached = true;

    // Trigger a physical structural tremor on the tower when masonry cracks loose!
    this.tiltTremor = Math.min(1.0, this.tiltTremor + 0.55);
    this.spawnBuildSparks(chosen.origPos);

    // Calculate initial ballistic velocity so the detached masonry block tumbles onto the walkway near targetNode
    const dropH = Math.max(4.0, chosen.origPos.y - targetPos.y);
    const flightT = Math.sqrt((2 * dropH) / 22.0);
    const initVel = new THREE.Vector3(
      (targetPos.x - chosen.origPos.x) / Math.max(0.45, flightT * 1.05),
      1.8,
      (targetPos.z - chosen.origPos.z) / Math.max(0.45, flightT * 1.05)
    );

    this.fallingRocks.push({
      mesh: chosen.mesh,
      origPos: chosen.origPos.clone(),
      vel: initVel,
      angVel: new THREE.Vector3(
        (Math.random() - 0.5) * 7.5,
        (Math.random() - 0.5) * 5.0,
        (Math.random() - 0.5) * 7.5
      ),
      phase: 'DETACHING', // Vibrates in its socket on the tower wall for 0.65s before breaking off!
      shakeTimer: 0.65,
      lifeTimer: 7.5,
      mass: 2.8,
      hitUnitIds: new Set()
    });
  }

  findClosestNode(point) {
    let best = this.nodes[0];
    let bestDistSq = Infinity;
    for (let i = 0; i < this.nodes.length; i++) {
      const d = this.nodes[i].pos.distanceToSquared(point);
      if (d < bestDistSq) {
        bestDistSq = d;
        best = this.nodes[i];
      }
    }
    return best;
  }

  // Finds a lower floor deck or spiral walkway directly underneath a 3D falling unit or boulder `(x, y, z)`!
  findLandingSurfaceBelow(pos, prevY) {
    // 1. Check the 5 wide circular interior/exterior floor decks
    if (this.interiorDecks) {
      for (const dk of this.interiorDecks) {
        if (prevY >= dk.y - 0.8 && pos.y <= dk.y + 0.85) {
          const r = Math.hypot(pos.x, pos.z);
          if (r >= dk.rHole - 0.8 && r <= dk.rOuter + 1.2) {
            return { y: dk.y, s: this.findClosestNode(new THREE.Vector3(pos.x, dk.y, pos.z)).s, isDeck: true };
          }
        }
      }
    }
    // 2. Check spiral walkway nodes below
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.isGap && !n.gapRepaired) continue;
      if (prevY >= n.pos.y - 0.9 && pos.y <= n.pos.y + 0.95) {
        const horizDist = Math.hypot(pos.x - n.pos.x, pos.z - n.pos.z);
        if (horizDist <= (n.halfWidth || 3.4) + 1.0) {
          return { y: n.pos.y, s: n.s, nodeIndex: i };
        }
      }
    }
    // 3. Ground plain outside/at base of tower
    if (pos.y <= 0.4 && Math.hypot(pos.x, pos.z) <= 46.0) {
      return { y: 0.5, s: 0.22 };
    }
    return null;
  }

  update(dt, elapsed, tiltAngle = 0, crowdSystem = null) {
    if (this.tiltTremor > 0) {
      this.tiltTremor = Math.max(0, this.tiltTremor - dt * 1.8);
    }
    const tremorOsc = this.tiltTremor > 0 ? Math.sin(elapsed * 38) * this.tiltTremor * 0.008 : 0;
    const targetRotZ = tiltAngle * 0.012 + tremorOsc;
    const prevRotZ = this.group.rotation.z;
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, targetRotZ, Math.min(1, dt * 5));
    this.currentTiltZ = this.group.rotation.z;
    const angularVelZ = (this.currentTiltZ - prevRotZ) / Math.max(0.001, dt);

    // 1. Physically Swing Hanging Banners on the Tower in response to Tower Tilt, Angular Velocity & Wind!
    this.hangingBanners.forEach((hb) => {
      const windWave = Math.sin(elapsed * 3.8 + hb.phase) * 0.09 + Math.cos(elapsed * 6.2 + hb.phase) * 0.04;
      // Project world tilt Z into the banner's local orientation so every banner hangs toward gravity & swings with inertia!
      const cosA = Math.cos(hb.ang);
      const sinA = Math.sin(hb.ang);
      const localSwayZ = (-this.currentTiltZ * sinA - angularVelZ * 0.18 * sinA) * 1.6 + windWave;
      const localBillowX = Math.abs(this.currentTiltZ * cosA) * 1.4 + 0.08 + Math.abs(windWave) * 0.9;
      hb.pivot.rotation.z = THREE.MathUtils.lerp(hb.pivot.rotation.z, localSwayZ, Math.min(1, dt * 8));
      hb.pivot.rotation.x = THREE.MathUtils.lerp(hb.pivot.rotation.x, localBillowX, Math.min(1, dt * 8));
    });

    // 2. Animate 3D Wooden Bridge Planks slamming down into place & flying wood chips!
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.plankMeshes && n.plankMeshes.length > 0) {
        for (let p = 0; p < n.plankMeshes.length; p++) {
          const pl = n.plankMeshes[p];
          if (pl.visible && pl.userData.dropProgress > 0 && pl.userData.dropProgress < 1) {
            pl.userData.dropProgress = Math.min(1, pl.userData.dropProgress + dt * 5.5);
            const t = pl.userData.dropProgress;
            const bounce = t < 0.75 ? (t / 0.75) : (1.0 - Math.sin((t - 0.75) / 0.25 * Math.PI) * 0.14);
            pl.position.y = THREE.MathUtils.lerp(1.35, pl.userData.targetY, bounce);
          }
        }
      }
    }

    for (let i = this.buildSparks.length - 1; i >= 0; i--) {
      const sp = this.buildSparks[i];
      sp.life -= dt;
      sp.vel.y -= 14.0 * dt;
      sp.mesh.position.addScaledVector(sp.vel, dt);
      sp.mesh.rotation.x += dt * 10;
      sp.mesh.rotation.z += dt * 8;
      if (sp.life <= 0) {
        this.group.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        sp.mesh.material.dispose();
        this.buildSparks.splice(i, 1);
      }
    }

    if (this.summitHalo) {
      this.summitHalo.rotation.y = elapsed * 0.8;
      this.summitHalo.rotation.x = Math.sin(elapsed * 0.6) * 0.25;
    }
    if (this.godHandGroup) {
      this.godHandGroup.position.y = 166.0 + Math.sin(elapsed * 1.4) * 0.55;
      this.godHandGroup.position.x = 5.2 + Math.cos(elapsed * 1.1) * 0.35;
    }

    this.cranes.forEach((cr) => {
      cr.block.position.y = cr.baseY + Math.sin(elapsed * 1.5 + cr.phase) * 1.3;
      cr.block.rotation.z = -this.currentTiltZ * 1.2 + Math.sin(elapsed * 2.5 + cr.phase) * 0.08;
    });

    this.waterwheels.forEach((ww) => {
      ww.rotation.z -= dt * 1.2;
    });

    this.waterfalls.forEach((wf, idx) => {
      wf.material.opacity = 0.70 + Math.sin(elapsed * 6 + idx) * 0.1;
    });

    this.languageGates.forEach((g) => {
      if (g.cyanCubeMesh && !g.unlocked) {
        g.cyanCubeMesh.rotation.y = elapsed * 1.6;
        g.cyanCubeMesh.position.y = 1.45 + Math.sin(elapsed * 2.5) * 0.12;
      }
      if (g.steles) {
        g.steles.forEach((st) => {
          st.orbMesh.rotation.y = elapsed * 2.2;
        });
      }
    });

    for (let i = 0; i < this.interactables.length; i++) {
      const item = this.interactables[i];
      if (!item.triggered && item.mesh) {
        item.mesh.rotation.y += dt * 1.5;
      }
    }

    // 3. Update Detached Tower Masonry Blocks with Real 3D Rigid-Body Gravity, Slope Bounce & Momentum Collision!
    for (let i = this.fallingRocks.length - 1; i >= 0; i--) {
      const rk = this.fallingRocks[i];
      if (rk.phase === 'DETACHING') {
        rk.shakeTimer -= dt;
        // Vibrate visibly in its architectural socket before breaking loose
        rk.mesh.position.set(
          rk.origPos.x + Math.sin(elapsed * 55 + i) * 0.22,
          rk.origPos.y - (0.65 - rk.shakeTimer) * 0.35,
          rk.origPos.z + Math.cos(elapsed * 50 + i) * 0.22
        );
        rk.mesh.rotation.z = Math.sin(elapsed * 45) * 0.12;
        if (rk.shakeTimer <= 0) {
          rk.phase = 'PHYSICS';
          this.spawnBuildSparks(rk.mesh.position);
          window.SFX.playBuildHammer();
        }
      } else if (rk.phase === 'PHYSICS') {
        rk.lifeTimer -= dt;
        const prevY = rk.mesh.position.y;

        // Real 3D Gravity + Tower Tilt Lateral Acceleration!
        rk.vel.y -= 23.0 * dt;
        rk.vel.x += Math.sin(this.currentTiltZ) * 14.0 * dt;

        rk.mesh.position.addScaledVector(rk.vel, dt);
        rk.mesh.rotation.x += rk.angVel.x * dt;
        rk.mesh.rotation.y += rk.angVel.y * dt;
        rk.mesh.rotation.z += rk.angVel.z * dt;

        // Check 3D collision with spiral walkways or interior decks below!
        if (rk.vel.y < 0) {
          const surface = this.findLandingSurfaceBelow(rk.mesh.position, prevY);
          if (surface) {
            rk.mesh.position.y = surface.y + 0.72;
            // Bounce up with restitution + accelerate downhill along the spiral ramp tangent!
            rk.vel.y = Math.max(3.2, Math.abs(rk.vel.y) * 0.45);
            const nIdx = surface.nodeIndex !== undefined ? surface.nodeIndex : Math.floor(surface.s * this.pathSegments);
            const nCurr = this.nodes[Math.max(1, Math.min(this.pathSegments - 1, nIdx))];
            const nPrev = this.nodes[Math.max(0, nIdx - 1)];
            if (nCurr && nPrev) {
              const downhillDir = new THREE.Vector3().subVectors(nPrev.pos, nCurr.pos).normalize();
              rk.vel.x = rk.vel.x * 0.55 + downhillDir.x * 8.5 + Math.sin(this.currentTiltZ) * 4.0;
              rk.vel.z = rk.vel.z * 0.55 + downhillDir.z * 8.5;
            }
            rk.angVel.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 10);
            window.SFX.playBuildHammer();
          }
        }

        // Check physical 3D collision with NPCs at every step of the boulder's trajectory!
        if (crowdSystem) {
          crowdSystem.onRockImpact(rk.mesh.position, rk);
        }

        if (rk.lifeTimer <= 0 || rk.mesh.position.y < -20) {
          this.group.remove(rk.mesh);
          this.fallingRocks.splice(i, 1);
        }
      }
    }
  }
}

window.BabelTower3D = BabelTower3D;
