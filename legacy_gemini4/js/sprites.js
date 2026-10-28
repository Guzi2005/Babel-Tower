// Sacred Symbol Conlang System (符号造语体系) & 3D Articulated Pixel Character + 2D HUD Portrait Generator
// Completely unifies the 2D Pixel Art aesthetic with the 3D World (no more flat 2D billboard separation!)

window.LANG_CONFIG = {
  A: {
    code: 'A',
    symbol: '☼',
    altGlyphs: ['☼', '⛭', '△'],
    name: '日耀楔语 (Kael-Ur)',
    color: '#e67e22',
    ringColor: '#f39c12',
    conlangSample: ['☼ Kael-Ur! Agurru-Bāb!', '☼ Šamšu-Qāt! Dum-Kael!', '☼ Ziggur-Na! Ur-Throm!'],
    speechSample: ['☼ Kael-Ur! [搬运筑桥!]', '☼ Šamšu-Qāt! [拉紧我上行!]', '☼ Ziggur-Na! [我们需要『☼上』!]']
  },
  B: {
    code: 'B',
    symbol: '♒',
    altGlyphs: ['♒', '≈', '◈'],
    name: '涡流古语 (Vindr-Lo)',
    color: '#2aa198',
    ringColor: '#38ada9',
    conlangSample: ['♒ Logos-Vindr! Kratī-Na!', '♒ Thalassa-Anō! Lo-Vindr!', '♒ Kyma-Stasis! Pneuma!'],
    speechSample: ['♒ Logos-Vindr! [协力踩踏板!]', '♒ Thalassa-Anō! [向水道上层!]', '♒ Kyma-Stasis! [推动配重箱!]']
  },
  C: {
    code: 'C',
    symbol: '▲',
    altGlyphs: ['▲', '☥', '◬'],
    name: '圣山棱语 (Ma’at-Ka)',
    color: '#8e44ad',
    ringColor: '#9b59b6',
    conlangSample: ['▲ Ankh-Ma’at! Khufu-Sen!', '▲ Djed-Ka! Sekhem-Ur!', '▲ Bennu-Ra! Kemet-An!'],
    speechSample: ['▲ Ankh-Ma’at! [启动译码碑!]', '▲ Djed-Ka! [压住配重台!]', '▲ Bennu-Ra! [我们需要『▲上』!]']
  },
  D: {
    code: 'D',
    symbol: '◎',
    altGlyphs: ['◎', '◉', '☸'],
    name: '同心印语 (Asha-Zar)',
    color: '#c0392b',
    ringColor: '#e55039',
    conlangSample: ['◎ Asha-Spenta! Zar-Mithra!', '◎ Vohu-Manah! Rath-Za!', '◎ Atar-Xvar! Yasna-Ko!'],
    speechSample: ['◎ Asha-Spenta! [破译齿轮锁!]', '◎ Vohu-Manah! [跨越断崖!]', '◎ Atar-Xvar! [接力传语!]']
  },
  E: {
    code: 'E',
    symbol: '𓂀',
    altGlyphs: ['𓂀', 'ᚱ', '✧'],
    name: '苍穹卢恩语 (Skald-Run)',
    color: '#2980b9',
    ringColor: '#3498db',
    conlangSample: ['𓂀 Bifrost-Skald! Run-Tyr!', '𓂀 Ygg-Vindr! Aethel-Ra!', '𓂀 Galdr-Ansuz! Odal-Ve!'],
    speechSample: ['𓂀 Bifrost-Skald! [逆风稳重心!]', '𓂀 Ygg-Vindr! [开启升降台!]', '𓂀 Galdr-Ansuz! [传递电路号令!]']
  },
  F: {
    code: 'F',
    symbol: '❖',
    altGlyphs: ['❖', '✦', '∞'],
    name: '原初同位语 (Lia-Sae)',
    color: '#27ae60',
    ringColor: '#2ecc71',
    conlangSample: ['❖ Lia-Sae! Grog-Throm!', '❖ Omni-Logos! Kael-Lia!', '❖ Aether-Zun! Sol-Vindr!'],
    speechSample: ['❖ Lia-Sae! [万语同源共鸣!]', '❖ Omni-Logos! [解除一切隔阂!]', '❖ Aether-Zun! [触碰银河穹顶!]']
  }
};

class AncientHistoricalSpriteFactory {
  constructor() {
    this.skinPalettes = [
      { face: '#f3ccb0', shade: '#dfb191', cheek: '#d9826c' },
      { face: '#e6b897', shade: '#cc9b78', cheek: '#c9735d' },
      { face: '#d19c74', shade: '#b58059', cheek: '#b55d47' },
      { face: '#b57c50', shade: '#946038', cheek: '#9c4736' },
      { face: '#f7d7be', shade: '#e3bc9e', cheek: '#e08e79' }
    ];

    this.eyeColors = ['#1f7a4c', '#2952a3', '#4a3222', '#2d3748', '#146eb4', '#5c3c10'];

    this.hairColors = [
      { main: '#1e1b18', hi: '#38332e', dark: '#110f0d' },
      { main: '#4a2e1b', hi: '#6b4428', dark: '#2e1b0f' },
      { main: '#8c4a27', hi: '#b06238', dark: '#5e2f16' },
      { main: '#d4af5f', hi: '#ebd08f', dark: '#a68438' },
      { main: '#d8dde6', hi: '#ffffff', dark: '#a5aebd' }
    ];

    this.historicalCostumes = [
      {
        id: 'sumerian_kaunakes',
        eraName: '苏美尔羊毛流苏裙',
        bareTop: true,
        tunic: '#f0ead6',
        fringe: '#d6cbb5',
        sash: '#b84a27',
        collar: null,
        headgear: 'sumerian_headband'
      },
      {
        id: 'babylonian_lapis',
        eraName: '巴比伦青金石祭袍',
        bareTop: false,
        tunic: '#1f4e8c',
        fringe: '#e8c468',
        sash: '#d4a238',
        collar: '#e8c468',
        headgear: 'babylonian_fez'
      },
      {
        id: 'egyptian_shendyt',
        eraName: '古埃及亚麻申迪特',
        bareTop: true,
        tunic: '#f7f9fa',
        fringe: '#2aa198',
        sash: '#e8c468',
        collar: '#2aa198',
        headgear: 'egyptian_nemes'
      },
      {
        id: 'greek_chiton',
        eraName: '古希腊雪白希顿长袍',
        bareTop: false,
        tunic: '#f4f1ea',
        fringe: '#c0392b',
        sash: '#c0392b',
        collar: '#e8c468',
        headgear: 'laurel_wreath'
      },
      {
        id: 'persian_median',
        eraName: '古波斯紫金长袍',
        bareTop: false,
        tunic: '#6c3483',
        fringe: '#f39c12',
        sash: '#f39c12',
        collar: '#f39c12',
        headgear: 'persian_tiara'
      },
      {
        id: 'canaanite_striped',
        eraName: '迦南彩纹行商袍',
        bareTop: false,
        tunic: '#a93226',
        fringe: '#2471a3',
        sash: '#f1c40f',
        collar: '#f4f1ea',
        headgear: 'desert_keffiyeh'
      },
      {
        id: 'steppe_nomad',
        eraName: '游牧皮甲胡服',
        bareTop: false,
        tunic: '#7e5109',
        fringe: '#4a235a',
        sash: '#d35400',
        collar: '#d5dbdb',
        headgear: 'nomad_fur_cap'
      },
      {
        id: 'minoan_artisan',
        eraName: '米诺斯海蓝工匠装',
        bareTop: false,
        tunic: '#148f77',
        fringe: '#f4d03f',
        sash: '#e74c3c',
        collar: '#f4d03f',
        headgear: 'bronze_helmet'
      }
    ];

    this.beardStyles = ['none', 'none', 'babylonian_curled', 'hellenic_full', 'pointed_beard', 'stubble'];
  }

  createAppearance(seedIndex = 0, langs = ['A'], custom = {}) {
    const pick = (arr, mult = 7) => arr[(seedIndex * mult + 3) % arr.length];
    const skin = pick(this.skinPalettes, 5);
    const eyes = pick(this.eyeColors, 11);
    const hair = pick(this.hairColors, 13);
    const costume = custom.costume || pick(this.historicalCostumes, 17);
    const beard = custom.isChild ? 'none' : (custom.beard || pick(this.beardStyles, 23));

    return {
      skin,
      eyes,
      hair,
      costume,
      beard,
      skillId: custom.skillId || 'MASON',
      isChild: Boolean(custom.isChild),
      isNationalist: Boolean(custom.isNationalist),
      langs
    };
  }

  // Creates a crisp Pixel-Art Face Texture for the 3D Head Cube!
  create3DFaceTexture(app) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const px = 8; // 8x8 pixel grid
    const rect = (x, y, w, h, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(x * px, y * px, w * px, h * px);
    };

    // Base skin
    rect(0, 0, 8, 8, app.skin.face);
    // Hairline top & temples
    rect(0, 0, 8, 2, app.hair.main);
    rect(0, 2, 1, 3, app.hair.main);
    rect(7, 2, 1, 3, app.hair.main);
    // Rosy cheeks
    rect(1, 5, 1, 2, app.skin.cheek);
    rect(6, 5, 1, 2, app.skin.cheek);
    // Chin shade
    rect(2, 7, 4, 1, app.skin.shade);
    // Crisp 1x2 Vertical Colored Eyes + white highlight
    rect(2, 3, 1, 2, app.eyes);
    rect(5, 3, 1, 2, app.eyes);

    // Beards
    if (app.beard === 'babylonian_curled') {
      rect(1, 6, 6, 2, '#181512');
    } else if (app.beard === 'hellenic_full') {
      rect(1, 6, 6, 2, app.hair.main);
    } else if (app.beard === 'pointed_beard') {
      rect(3, 6, 2, 2, app.hair.main);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  // Builds a Unified 3D Articulated Pixel-Voxel Character Rig that casts real 3D shadows and walks/jumps/falls in 3D!
  create3DCharacterRig(app, langs, unitId) {
    const root = new THREE.Group();
    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    const c = app.costume;
    const skinMat = new THREE.MeshStandardMaterial({ color: app.skin.face, roughness: 0.75 });
    const hairMat = new THREE.MeshStandardMaterial({ color: app.hair.main, roughness: 0.85 });
    const tunicMat = new THREE.MeshStandardMaterial({ color: c.tunic, roughness: 0.8 });
    const fringeMat = new THREE.MeshStandardMaterial({ color: c.fringe, roughness: 0.75 });
    const sashMat = new THREE.MeshStandardMaterial({ color: c.sash || c.fringe, roughness: 0.7 });
    const sandalMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.9 });

    // 1. Legs (Articulated pivots at y = 0.55)
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.18, 0.55, 0);
    const legGeo = new THREE.BoxGeometry(0.22, 0.55, 0.24);
    const leftLegMesh = new THREE.Mesh(legGeo, skinMat);
    leftLegMesh.position.y = -0.27;
    leftLegMesh.castShadow = true;
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.28), sandalMat);
    leftBoot.position.set(0, -0.48, 0.02);
    leftLegPivot.add(leftLegMesh, leftBoot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.18, 0.55, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, skinMat);
    rightLegMesh.position.y = -0.27;
    rightLegMesh.castShadow = true;
    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.28), sandalMat);
    rightBoot.position.set(0, -0.48, 0.02);
    rightLegPivot.add(rightLegMesh, rightBoot);
    bodyGroup.add(leftLegPivot, rightLegPivot);

    // 2. Torso & Historical Tunic/Skirt (y = 0.55 .. 1.35)
    const torsoMat = c.bareTop ? skinMat : tunicMat;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.52, 0.42), torsoMat);
    torso.position.y = 1.06;
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.36, 0.46), tunicMat);
    skirt.position.y = 0.68;
    skirt.castShadow = true;
    bodyGroup.add(skirt);

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.48), sashMat);
    belt.position.y = 0.84;
    bodyGroup.add(belt);

    if (c.collar) {
      const collarMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.10, 0.46),
        new THREE.MeshStandardMaterial({ color: c.collar, roughness: 0.5 })
      );
      collarMesh.position.y = 1.28;
      bodyGroup.add(collarMesh);
    }

    // 3. Articulated Arms & 3D Skill Props (y = 1.25)
    const armMat = c.bareTop ? skinMat : tunicMat;
    const armGeo = new THREE.BoxGeometry(0.20, 0.52, 0.20);

    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.46, 1.26, 0);
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.y = -0.22;
    leftArm.castShadow = true;
    leftArmPivot.add(leftArm);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.46, 1.26, 0);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.y = -0.22;
    rightArm.castShadow = true;
    rightArmPivot.add(rightArm);

    // Skill-specific 3D Held Props
    if (app.skillId === 'SHIELDBEARER') {
      const shield = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.08, 16),
        new THREE.MeshStandardMaterial({ color: 0xd4a238, metalness: 0.5, roughness: 0.3 })
      );
      shield.rotation.z = Math.PI / 2;
      shield.position.set(-0.14, -0.22, 0.12);
      leftArmPivot.add(shield);
    } else if (app.skillId === 'MASON') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.48), sandalMat);
      handle.position.set(0, -0.38, 0.15);
      handle.rotation.x = Math.PI / 3;
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.16, 0.32),
        new THREE.MeshStandardMaterial({ color: 0x95a5a6, metalness: 0.4, roughness: 0.5 })
      );
      head.position.set(0, -0.52, 0.28);
      rightArmPivot.add(handle, head);
    } else if (app.skillId === 'FORAGER') {
      const sheaf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 0.46, 8),
        new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.6 })
      );
      sheaf.position.set(0.08, -0.32, 0.16);
      sheaf.rotation.x = 0.4;
      rightArmPivot.add(sheaf);
    } else if (app.skillId === 'SCHOLAR') {
      const tablet = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.34, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x38ada9, emissive: 0x16a085, emissiveIntensity: 0.3 })
      );
      tablet.position.set(-0.08, -0.32, 0.18);
      leftArmPivot.add(tablet);
    }

    bodyGroup.add(leftArmPivot, rightArmPivot);

    // 4. 3D Pixel-Textured Head Cube (y = 1.34 .. 2.02)
    const faceTex = this.create3DFaceTexture(app);
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.7 });
    // BoxGeometry material order: [+x, -x, +y, -y, +z (front face!), -z]
    const headMats = [hairMat, hairMat, hairMat, skinMat, faceMat, hairMat];
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.66, 0.62), headMats);
    headMesh.position.y = 1.66;
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    bodyGroup.add(headMesh);

    // 5. 3D Historical Headgear on top of Head
    const hatGroup = new THREE.Group();
    hatGroup.position.y = 2.02;
    if (c.headgear === 'babylonian_fez') {
      const fez = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.34, 0.28, 12), tunicMat);
      fez.position.y = 0.12;
      hatGroup.add(fez);
    } else if (c.headgear === 'egyptian_nemes') {
      const nemes = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.24, 0.68), new THREE.MeshStandardMaterial({ color: 0x1f4e8c }));
      const cobra = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), new THREE.MeshStandardMaterial({ color: 0xf1c40f }));
      cobra.position.set(0, 0.12, 0.35);
      hatGroup.add(nemes, cobra);
    } else if (c.headgear === 'laurel_wreath') {
      const wreath = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.06, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.6 })
      );
      wreath.rotation.x = Math.PI / 2;
      wreath.position.y = -0.05;
      hatGroup.add(wreath);
    } else if (c.headgear === 'bronze_helmet') {
      const helm = new THREE.Mesh(
        new THREE.BoxGeometry(0.70, 0.22, 0.66),
        new THREE.MeshStandardMaterial({ color: 0xd4ac0d, metalness: 0.5, roughness: 0.3 })
      );
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.56), new THREE.MeshStandardMaterial({ color: 0xc0392b }));
      crest.position.y = 0.20;
      hatGroup.add(helm, crest);
    } else {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.12, 0.66), fringeMat);
      band.position.y = -0.04;
      hatGroup.add(band);
    }
    bodyGroup.add(hatGroup);

    // 6. Overhead Sacred Glyph Medallion Sprite (Always crisp & readable above the 3D character!)
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 128;
    badgeCanvas.height = 64;
    const bCtx = badgeCanvas.getContext('2d');
    this.drawOverheadMedallion(bCtx, langs, 128, app.isNationalist, 32);
    const badgeTex = new THREE.CanvasTexture(badgeCanvas);
    const badgeSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, transparent: true }));
    badgeSprite.scale.set(1.65, 0.82, 1);
    badgeSprite.position.set(0, 2.55, 0);
    root.add(badgeSprite);

    // Make all meshes clickable for unit selection / grabbing
    root.traverse((obj) => {
      obj.userData = { unitId, isUnit: true };
    });

    if (app.isChild) {
      bodyGroup.scale.setScalar(0.82);
    }

    return {
      root,
      bodyGroup,
      headMesh,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot,
      badgeSprite
    };
  }

  drawPixelCharacter(ctx, app, animState = 'IDLE', frame = 0, langs = ['A'], size = 128, showOverheadMedallion = true) {
    ctx.clearRect(0, 0, size, size);
    const gw = 24;
    const gh = 32;
    const px = size / gw;
    const py = size / gh;

    const rect = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x * px), Math.round(y * py), Math.ceil(w * px), Math.ceil(h * py));
    };

    let bobY = 0;
    let legL = 0;
    let legR = 0;
    let armLY = 0;
    let armRY = 0;

    if (animState === 'WALK') {
      bobY = (frame % 2 === 1) ? -1 : 0;
      legL = (frame % 2 === 1) ? -1 : 0;
      legR = (frame % 2 === 0) ? -1 : 0;
      armLY = (frame % 2 === 0) ? -1 : 0;
      armRY = (frame % 2 === 1) ? -1 : 0;
    }

    if (showOverheadMedallion) {
      this.drawOverheadMedallion(ctx, langs, size, app.isNationalist);
    }

    const cx = 7;
    const hy = 11 + bobY;
    const ty = 18 + bobY;
    const c = app.costume;
    const hc = app.hair;

    rect(8, 29, 8, 1, 'rgba(0,0,0,0.32)');

    if (c.headgear === 'egyptian_nemes') {
      rect(cx + 1, hy - 1, 8, 7, '#1f4e8c');
      rect(cx + 1, hy + 1, 8, 1, '#e8c468');
      rect(cx + 1, hy + 3, 8, 1, '#e8c468');
    } else if (c.headgear === 'desert_keffiyeh') {
      rect(cx + 1, hy - 1, 8, 7, '#e6d7c3');
    } else {
      rect(cx + 1, hy + 1, 8, 5, hc.dark);
    }

    rect(cx + 2, 26 + legL, 2, 3, app.skin.shade);
    rect(cx + 2, 28 + legL, 2, 1, '#4a2e1b');
    rect(cx + 6, 26 + legR, 2, 3, app.skin.shade);
    rect(cx + 6, 28 + legR, 2, 1, '#4a2e1b');

    if (c.bareTop) {
      rect(cx + 1, ty, 8, 4, app.skin.face);
      rect(cx + 1, ty + 3, 8, 5, c.tunic);
      rect(cx + 1, ty + 7, 8, 1, c.fringe);
    } else {
      rect(cx + 1, ty, 8, 8, c.tunic);
      rect(cx + 1, ty + 7, 8, 1, c.fringe);
    }

    if (c.collar) rect(cx + 2, ty, 6, 2, c.collar);
    if (c.sash) {
      rect(cx + 2, ty + 1, 2, 2, c.sash);
      rect(cx + 4, ty + 3, 2, 2, c.sash);
      rect(cx + 1, ty + 4, 8, 1, c.sash);
    }

    const sleeveColor = c.bareTop ? app.skin.face : c.tunic;
    rect(cx, ty + 1 + armLY, 1, 5, sleeveColor);
    rect(cx, ty + 5 + armLY, 1, 1, app.skin.face);
    rect(cx + 9, ty + 1 + armRY, 1, 5, sleeveColor);
    rect(cx + 9, ty + 5 + armRY, 1, 1, app.skin.face);

    rect(cx + 2, hy + 1, 6, 5, app.skin.face);
    rect(cx + 2, hy + 4, 1, 2, app.skin.cheek);
    rect(cx + 7, hy + 4, 1, 2, app.skin.cheek);
    rect(cx + 3, hy + 5, 4, 1, app.skin.shade);

    rect(cx + 3, hy + 2, 1, 2, app.eyes);
    rect(cx + 6, hy + 2, 1, 2, app.eyes);

    rect(cx + 1, hy + 1, 1, 4, hc.main);
    rect(cx + 8, hy + 1, 1, 4, hc.main);
    rect(cx + 2, hy, 6, 1, hc.main);

    if (app.beard === 'babylonian_curled') {
      rect(cx + 2, hy + 4, 6, 4, '#181512');
    } else if (app.beard === 'hellenic_full') {
      rect(cx + 2, hy + 4, 6, 3, hc.main);
    } else if (app.beard === 'pointed_beard') {
      rect(cx + 4, hy + 5, 2, 3, hc.main);
    }

    switch (c.headgear) {
      case 'babylonian_fez':
        rect(cx + 2, hy - 3, 6, 3, '#1f4e8c');
        rect(cx + 2, hy - 1, 6, 1, '#e8c468');
        break;
      case 'egyptian_nemes':
        rect(cx + 1, hy - 2, 8, 2, '#1f4e8c');
        rect(cx + 2, hy - 1, 6, 1, '#e8c468');
        rect(cx + 4, hy - 3, 2, 2, '#f1c40f');
        break;
      case 'laurel_wreath':
        rect(cx + 1, hy - 1, 8, 1, '#27ae60');
        break;
      case 'persian_tiara':
        rect(cx + 2, hy - 3, 6, 3, '#6c3483');
        rect(cx + 3, hy - 2, 4, 1, '#f39c12');
        break;
      default:
        rect(cx + 1, hy - 1, 8, 1, '#d4ac0d');
        break;
    }
  }

  drawOverheadMedallion(ctx, langs, size, isNationalist = false, customY = null) {
    const r = size * 0.14;
    const cy = customY !== null ? customY : size * 0.16;

    if (langs.length === 1) {
      const cfg = window.LANG_CONFIG[langs[0]] || window.LANG_CONFIG.A;
      const cx = size * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = isNationalist ? '#4a0e17' : '#18202c';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = isNationalist ? '#ff4757' : cfg.ringColor;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(size * 0.14)}px "Segoe UI Symbol", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cfg.symbol, cx, cy + 1);
    } else {
      const spacing = r * 1.15;
      langs.slice(0, 2).forEach((l, idx) => {
        const cfg = window.LANG_CONFIG[l] || window.LANG_CONFIG.A;
        const cx = size * 0.5 + (idx === 0 ? -spacing : spacing);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
        ctx.fillStyle = '#18202c';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = cfg.ringColor;
        ctx.stroke();

        ctx.fillStyle = '#fff5d6';
        ctx.font = `bold ${Math.round(size * 0.125)}px "Segoe UI Symbol", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cfg.symbol, cx, cy + 1);
      });
    }
  }

  createAvatarDataURL(appearance, langs) {
    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 48;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const temp = document.createElement('canvas');
    temp.width = 96;
    temp.height = 96;
    const tCtx = temp.getContext('2d');
    tCtx.imageSmoothingEnabled = false;
    this.drawPixelCharacter(tCtx, appearance, 'IDLE', 0, langs, 96, false);
    ctx.drawImage(temp, 16, 20, 64, 64, 0, 0, 48, 48);
    return c.toDataURL();
  }

  drawBubbleOnCanvas(c, text, borderColor = '#38ada9', bgColor = 'rgba(252, 249, 242, 0.96)') {
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4.5;
    const r = 14;
    const x = 10, y = 10, w = c.width - 20, h = 58;
    const midX = c.width * 0.5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(midX + 10, y + h);
    ctx.lineTo(midX, y + h + 15);
    ctx.lineTo(midX - 10, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px "Segoe UI Symbol", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, midX, y + h / 2, w - 24);
  }

  createBubbleTexture(text, borderColor = '#38ada9', bgColor = 'rgba(252, 249, 242, 0.96)') {
    const c = document.createElement('canvas');
    c.width = 380;
    c.height = 96;
    this.drawBubbleOnCanvas(c, text, borderColor, bgColor);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }
}

window.SpriteFactory = new AncientHistoricalSpriteFactory();
