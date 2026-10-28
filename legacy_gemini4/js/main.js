// Main Game Engine for "巴别：失落的同位语" (Babel: The Lost Appositive)
// Features:
// - Unified 3D World & 3D Articulated Pixel-Voxel Characters with Real 3D Falling Boulders & Knockback/Freefall Physics
// - Top-Center Fixed Circuit Squad HUD (#circuit-squad-hud) with Pop-up Chat Bubbles & Rhythmic Symbol Pulses along Circuit Traces
// - Left-Side Chapter Objective Checklist & Sliding Event Banners (#side-banner-panel & #side-event-feed)
// - Tricky Squad Composition Checkpoints & Multi-Mechanism Puzzles

class BabelGameApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd8e5f2);
    this.scene.fog = new THREE.FogExp2(0xd8e5f2, 0.0024);

    this.camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.5, 580);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Camera Rig State
    this.camFocus = new THREE.Vector3(132, 1.5, 76);
    this.targetCamFocus = new THREE.Vector3(132, 1.5, 76);
    this.camAngle = 0.75;
    this.targetCamAngle = 0.75;
    this.camDistance = 42.0;
    this.targetCamDistance = 42.0;
    this.camPitchOffset = 14.5;
    this.autoFollowCrowd = true;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isOrbitDragging = false;
    this.dragStartMouse = { x: 0, y: 0 };
    this.pointerDownMouse = { x: 0, y: 0 };
    this.keys = {};

    // Environment & Game State
    this.floodHeight = -15.0;
    this.baseFloodSpeed = 0.25;
    this.windStrength = 0.35;
    this.towerTilt = 0.0;
    this.relicsCollected = 0;
    this.isPaused = false;
    this.gameEnded = false;
    this.squadStripDirty = true;

    this.cooldowns = {
      shout: 0,
      rosetta: 0,
      gust: 0
    };

    this.setupLightsAndEnvironment();

    this.buffSystem = new window.BuffSystem();
    this.storySystem = new window.StoryDirector();
    this.tower = new window.BabelTower3D(this.scene);
    this.crowd = new window.CrowdAndLanguageSystem(this.scene, this.tower, this.buffSystem, this.storySystem);

    this.setupUIAndEvents();
    this.startNewRun();

    this.lastTime = performance.now();
    this.elapsedTime = 0;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLightsAndEnvironment() {
    const ambient = new THREE.AmbientLight(0xfff4e0, 0.78);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffe6bd, 1.18);
    sun.position.set(85, 165, 95);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 380;
    const d = 135;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    this.scene.add(sun);

    const interiorLight = new THREE.PointLight(0xffb86c, 0.9, 75);
    interiorLight.position.set(0, 28, 0);
    this.scene.add(interiorLight);

    const upperInteriorLight = new THREE.PointLight(0xffeaa7, 0.75, 70);
    upperInteriorLight.position.set(0, 82, 0);
    this.scene.add(upperInteriorLight);

    // Rising Abyssal Flood Water Plane
    const waterGeo = new THREE.CylinderGeometry(235, 235, 150, 48);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x246a87,
      roughness: 0.25,
      metalness: 0.35,
      transparent: true,
      opacity: 0.82
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = -90;
    this.scene.add(this.waterMesh);

    const foamRingGeo = new THREE.RingGeometry(10.0, 45.5, 48);
    const foamRingMat = new THREE.MeshBasicMaterial({
      color: 0x82ccdd,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    });
    this.foamRing = new THREE.Mesh(foamRingGeo, foamRingMat);
    this.foamRing.rotation.x = -Math.PI / 2;
    this.scene.add(this.foamRing);

    // Atmospheric Wind & Dust Particles
    const partCount = 280;
    const partGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount; i++) {
      positions[i * 3] = (Math.random() - 0.3) * 190;
      positions[i * 3 + 1] = Math.random() * 165;
      positions[i * 3 + 2] = (Math.random() - 0.3) * 160;
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.5
    });
    this.windParticles = new THREE.Points(partGeo, partMat);
    this.scene.add(this.windParticles);
  }

  startNewRun(newSeed = null) {
    this.isPaused = false;
    this.gameEnded = false;
    this.floodHeight = -15.0;
    this.towerTilt = 0.0;
    this.relicsCollected = 0;
    this.cooldowns = { shout: 0, rosetta: 0, gust: 0 };

    this.buffSystem.reset();
    this.buffSystem.renderBuffBar();
    this.storySystem.reset();

    this.tower.generate(newSeed !== null ? newSeed : Math.floor(Math.random() * 99999));
    this.crowd.spawnInitialSquad();

    // Start Camera cleanly framed on the Village Water Well (Prologue Trio) with the Massive Babel Tower visible in background!
    const wellPos = this.tower.getPointOnSpiral(0.008, 0);
    this.camFocus.copy(wellPos);
    this.targetCamFocus.copy(wellPos);
    this.targetCamAngle = 0.75;
    this.camAngle = 0.75;
    this.targetCamDistance = 32.0;
    this.camDistance = 32.0;
    this.autoFollowCrowd = true;
    this.squadStripDirty = true;

    document.getElementById('ending-modal').classList.add('hidden');
    document.getElementById('buff-modal').classList.add('hidden');
    this.storySystem.checkProgression(0.008, 0, this);
    this.renderSquadAvatarStrip();
    this.updateInspectorUI();
  }

  markSquadStripDirty() {
    this.squadStripDirty = true;
  }

  setupUIAndEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderCircuitChainCanvas();
    });

    const dom = this.renderer.domElement;
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('pointerdown', (e) => {
      this.updateMouseNDC(e);
      this.pointerDownMouse = { x: e.clientX, y: e.clientY };

      if (e.button === 2) {
        // Right-click immediately moves the squad to any clicked ground/deck/plate/walkway
        const hit = this.raycastWalkway();
        if (hit) {
          const localPt = this.tower.worldToLocalPos(hit.point);
          this.autoFollowCrowd = true;
          this.crowd.issueRallyCommand(localPt);
          this.spawnClickRipple(localPt);
          this.markSquadStripDirty();
        }
      } else if (e.button === 0) {
        const hitUnit = this.raycastUnit();
        if (hitUnit) {
          if (hitUnit.inWell) {
            this.crowd.rescueFromWell();
            this.updateInspectorUI();
            return;
          }
          if (hitUnit.faction === 'DEFECTED' || hitUnit.faction === 'STRANDED') {
            hitUnit.faction = 'PLAYER';
            hitUnit.justDismissedCooldown = 0;
            hitUnit.poachMeter = 0;
            hitUnit.ringMesh.material.color.setHex(0x38ada9);
            this.markSquadStripDirty();
          }
          // Rescue from 3D freefall or stun if grabbed!
          if (hitUnit.inFreefall || hitUnit.stunTimer > 0) {
            hitUnit.inFreefall = false;
            hitUnit.stunTimer = 0;
            hitUnit.physVel.set(0, 0, 0);
          }
          this.crowd.selectedUnit = hitUnit;
          this.crowd.grabbedUnit = hitUnit;
          hitUnit.isGrabbed = true;
          window.SFX.playPickUp();
          hitUnit.showSpeechBubble('🤝 握握手抓起！（拖拽松手可跨断崖或放上机关踏板）', '#70e1d7', 1.8);
          this.updateInspectorUI();
          this.markSquadStripDirty();
        } else {
          this.isOrbitDragging = true;
          this.dragStartMouse = { x: e.clientX, y: e.clientY };
        }
      }
    });

    window.addEventListener('pointermove', (e) => {
      this.updateMouseNDC(e);
      if (this.crowd.grabbedUnit) {
        const hit = this.raycastWalkway();
        if (hit) {
          const localPt = this.tower.worldToLocalPos(hit.point);
          const node = this.tower.findClosestNode(localPt);
          const u = this.crowd.grabbedUnit;
          u.s = node.s;
          const lat = new THREE.Vector3().subVectors(localPt, node.pos);
          lat.y = 0;
          if (lat.length() > 14.0) lat.normalize().multiplyScalar(14.0);
          u.freeOffset.copy(lat);
          u.pos.copy(node.pos).add(u.freeOffset);
          u.sprite.position.set(u.pos.x, u.pos.y, u.pos.z);
          u.ringMesh.position.set(u.pos.x, u.pos.y + 0.08, u.pos.z);
          u.bubbleSprite.position.set(u.pos.x, u.pos.y + 3.4, u.pos.z);
          this.crowd.propagateLanguageChain(false);
        }
      } else if (this.isOrbitDragging) {
        const totalDist = Math.hypot(e.clientX - this.pointerDownMouse.x, e.clientY - this.pointerDownMouse.y);
        if (totalDist > 6) {
          const dx = e.clientX - this.dragStartMouse.x;
          const dy = e.clientY - this.dragStartMouse.y;
          this.dragStartMouse = { x: e.clientX, y: e.clientY };
          this.targetCamAngle += dx * 0.0075;
          this.targetCamFocus.y = Math.max(0, Math.min(this.tower.maxHeight, this.targetCamFocus.y + dy * 0.15));
          this.autoFollowCrowd = false;
        }
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (this.crowd.grabbedUnit) {
        const u = this.crowd.grabbedUnit;
        u.isGrabbed = false;
        this.crowd.grabbedUnit = null;
        window.SFX.playDrop();
        u.showSpeechBubble('🤝 已部署就位！', '#7bed9f', 1.6);
        this.crowd.propagateLanguageChain(true);
        this.updateInspectorUI();
        this.markSquadStripDirty();
      } else if (this.isOrbitDragging && e.button === 0) {
        // Mouse-First Convenience: A clean Left-click (without dragging) on any floor deck/walkway/plate also moves the squad there!
        const totalDist = Math.hypot(e.clientX - this.pointerDownMouse.x, e.clientY - this.pointerDownMouse.y);
        if (totalDist <= 6) {
          this.updateMouseNDC(e);
          const hit = this.raycastWalkway();
          if (hit) {
            const localPt = this.tower.worldToLocalPos(hit.point);
            this.autoFollowCrowd = true;
            this.crowd.issueRallyCommand(localPt);
            this.spawnClickRipple(localPt);
            this.markSquadStripDirty();
          }
        }
      }
      this.isOrbitDragging = false;
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetCamDistance = Math.max(20, Math.min(95, this.targetCamDistance + e.deltaY * 0.032));
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Digit1') this.selectStanceUI('RALLY');
      if (e.code === 'Digit2') this.selectStanceUI('PUSH_JUMP');
      if (e.code === 'Digit3') this.selectStanceUI('HANDSHAKE');
      if (e.code === 'Digit4') this.selectStanceUI('ATTRACT');
      if (e.code === 'KeyQ') this.triggerActionThrow();
      if (e.code === 'KeyE') this.triggerActionOpenSource();
      if (e.code === 'KeyR') this.triggerActionLift();
      if (e.code === 'Space') {
        e.preventDefault();
        this.focusCameraOnCrowd();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    document.querySelectorAll('.dock-btn[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        this.selectStanceUI(cmd);
      });
    });

    document.getElementById('btn-miracle-throw').addEventListener('click', () => this.triggerActionThrow());
    document.getElementById('btn-miracle-opensource').addEventListener('click', () => this.triggerActionOpenSource());
    document.getElementById('btn-miracle-lift').addEventListener('click', () => this.triggerActionLift());

    // Redeemable 3-Choose-1 Miracle Card Button
    document.getElementById('btn-redeem-card').addEventListener('click', () => {
      if (this.buffSystem.cardTokens > 0) {
        this.openRedeemCardModal();
      }
    });
    document.getElementById('btn-cancel-buff').addEventListener('click', () => {
      document.getElementById('buff-modal').classList.add('hidden');
      this.isPaused = false;
      this.lastTime = performance.now();
    });

    // Selected Unit Jettison & Dismiss Buttons
    const jettisonBtn = document.getElementById('btn-insp-jettison');
    if (jettisonBtn) {
      jettisonBtn.addEventListener('click', () => {
        if (this.crowd.selectedUnit) {
          this.crowd.jettisonOneItem(this.crowd.selectedUnit.id);
        }
      });
    }
    document.getElementById('btn-insp-dismiss').addEventListener('click', () => {
      if (this.crowd.selectedUnit && this.crowd.selectedUnit.id !== 0) {
        this.crowd.dismissUnit(this.crowd.selectedUnit.id);
      }
    });

    document.getElementById('btn-regenerate').addEventListener('click', () => this.startNewRun());
    document.getElementById('btn-help').addEventListener('click', () => {
      document.getElementById('help-modal').classList.remove('hidden');
    });
    document.getElementById('btn-camera-focus').addEventListener('click', () => {
      this.focusCameraOnCrowd();
      this.crowd.propagateLanguageChain(true);
    });
    document.getElementById('btn-close-help').addEventListener('click', () => {
      document.getElementById('help-modal').classList.add('hidden');
    });
    document.getElementById('btn-restart-game').addEventListener('click', () => this.startNewRun());
  }

  selectStanceUI(stance) {
    document.querySelectorAll('.dock-btn[data-cmd]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-cmd') === stance);
    });
    this.crowd.setGlobalStance(stance);
  }

  focusCameraOnCrowd() {
    this.autoFollowCrowd = true;
    const alive = this.crowd.units.filter((u) => u.alive && u.faction === 'PLAYER');
    if (alive.length > 0) {
      const avgPos = new THREE.Vector3();
      alive.forEach((u) => avgPos.add(u.pos));
      avgPos.divideScalar(alive.length);
      this.targetCamFocus.copy(avgPos);
    }
  }

  triggerActionThrow() {
    if (this.cooldowns.shout > 0) return;
    this.cooldowns.shout = 6.0 * this.buffSystem.modifiers.cooldownMult;
    this.crowd.performHandshakeThrow();
    this.autoFollowCrowd = true;
  }

  triggerActionOpenSource() {
    if (this.cooldowns.rosetta > 0) return;
    this.cooldowns.rosetta = 14 * this.buffSystem.modifiers.cooldownMult;
    this.crowd.rosettaTimer = 9.5;
    this.crowd.triggerOpenSourceCoop();
    window.SFX.playMiracle();

    this.storySystem.showBanner(
      '【开源广播共鸣】',
      '“Kael-Ur, Vindr-Lo, Lia-Sae... 我们现在说的是同一种语言！”——全语种暂时互通，狭隘民族偏见消融！',
      5000
    );
    this.crowd.propagateLanguageChain(true);
    this.markSquadStripDirty();
  }

  triggerActionLift() {
    if (this.cooldowns.gust > 0) return;
    this.cooldowns.gust = 12 * this.buffSystem.modifiers.cooldownMult;
    window.SFX.playMiracle();

    const alive = this.crowd.units.filter((u) => u.alive && u.faction === 'PLAYER' && !u.inWell).sort((a, b) => a.s - b.s);
    const frontS = alive.length > 0 ? alive[alive.length - 1].s : this.crowd.rallyS;
    alive.slice(0, 6).forEach((u, idx) => {
      const targetS = Math.min(0.985, Math.max(u.s + 0.028, frontS - idx * 0.003));
      u.launchThrowArc(targetS, '🛗 升降梯团聚救援!');
    });
    this.crowd.propagateLanguageChain(true);
  }

  onRelicCollected(unit, relicIndex = 0) {
    this.relicsCollected++;
    this.buffSystem.addCardToken(1);
    this.storySystem.triggerRelicStory(relicIndex, unit);
    const mono = this.crowd.units.find((u) => u.alive && u.faction === 'PLAYER' && u.langs.length === 1);
    if (mono) {
      const allL = ['A', 'B', 'C', 'D', 'E', 'F'];
      const nextL = allL.find((l) => !mono.langs.includes(l)) || 'B';
      mono.grantSecondaryLanguage(nextL);
    }
    this.crowd.propagateLanguageChain(true);
    this.markSquadStripDirty();
    this.updateInspectorUI();
  }

  onShrineReached(shrineItem, finderUnit) {
    this.buffSystem.addCardToken(1);
    if (finderUnit) {
      finderUnit.showSpeechBubble('🃏 获得 1 张【冷库三选一奇迹卡券】！', '#70e1d7', 2.8);
    }
    this.openRedeemCardModal();
  }

  openRedeemCardModal() {
    if (this.buffSystem.cardTokens <= 0) return;
    this.isPaused = true;
    const modal = document.getElementById('buff-modal');
    const container = document.getElementById('buff-cards-container');
    const choices = this.buffSystem.getRandomChoices(3);

    container.innerHTML = '';
    choices.forEach((buff) => {
      const card = document.createElement('div');
      card.className = 'buff-card';
      card.innerHTML = `
        <div class="buff-card-icon">${buff.icon}</div>
        <div class="buff-card-title">${buff.title}</div>
        <div class="buff-card-rarity">${buff.rarity}</div>
        <div class="buff-card-desc">${buff.desc}</div>
      `;
      card.addEventListener('click', () => {
        this.buffSystem.selectBuff(buff, this);
        modal.classList.add('hidden');
        this.isPaused = false;
        this.lastTime = performance.now();
        this.markSquadStripDirty();
        this.updateInspectorUI();
      });
      container.appendChild(card);
    });

    modal.classList.remove('hidden');
  }

  spawnClickRipple(point) {
    const parentGroup = this.tower.entitiesGroup || this.tower.group;
    const ringGeo = new THREE.RingGeometry(0.25, 0.6, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x70e1d7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(point).add(new THREE.Vector3(0, 0.14, 0));
    parentGroup.add(mesh);

    let t = 0;
    const tick = () => {
      t += 0.06;
      mesh.scale.setScalar(1 + t * 4.5);
      ringMat.opacity = Math.max(0, 0.9 - t * 1.4);
      if (t < 0.65) {
        requestAnimationFrame(tick);
      } else {
        parentGroup.remove(mesh);
        ringGeo.dispose();
        ringMat.dispose();
      }
    };
    requestAnimationFrame(tick);
  }

  updateMouseNDC(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  raycastWalkway() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.tower.walkwayMeshes, false);
    return hits.length > 0 ? hits[0] : null;
  }

  raycastUnit() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const roots = this.crowd.units.filter((u) => u.alive).map((u) => u.sprite);
    // Recursive = true so clicking any 3D mesh part of a 3D character rig hits the unit!
    const hits = this.raycaster.intersectObjects(roots, true);
    for (let i = 0; i < hits.length; i++) {
      let obj = hits[i].object;
      while (obj) {
        if (obj.userData && obj.userData.unitId !== undefined) {
          const found = this.crowd.units.find((u) => u.id === obj.userData.unitId);
          if (found) return found;
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  // Renders the Fixed Top-Center Circuit Squad HUD (#hud-squad-strip) with Circular Pixel Portraits,
  // Sacred Language Glyph Coins (☼♒▲◎𓂀❖), Vertical Carry Tags, [卸]/[×] Buttons, and Pop-up Chat Bubbles!
  renderSquadAvatarStrip() {
    const strip = document.getElementById('hud-squad-strip');
    if (!strip) return;

    const squad = this.crowd.units
      .filter((u) => u.alive && u.faction === 'PLAYER' && !u.inWell)
      .sort((a, b) => {
        if (a.id === 0) return -1;
        if (b.id === 0) return 1;
        const hopA = a.lastChainHop >= 0 ? a.lastChainHop : 99;
        const hopB = b.lastChainHop >= 0 ? b.lastChainHop : 99;
        if (hopA !== hopB) return hopA - hopB;
        return a.id - b.id;
      });

    strip.innerHTML = '';

    squad.forEach((u) => {
      const node = document.createElement('div');
      const isSel = this.crowd.selectedUnit && this.crowd.selectedUnit.id === u.id;
      node.className = `circuit-unit-node${isSel ? ' selected' : ''}${!u.commandUnderstood ? ' disconnected' : ''}`;
      node.setAttribute('data-unit-id', String(u.id));
      node.title = `${u.name} (${u.skill.name}) — 左键点击选中并聚焦镜头`;

      // Pop-up chat bubble above the avatar
      const popup = document.createElement('div');
      popup.className = `hud-chat-popup${u.hudPopupTimer > 0 && u.hudPopupText ? ' visible' : ''}`;
      popup.id = `hud-popup-${u.id}`;
      popup.style.borderColor = u.hudPopupColor || '#70e1d7';
      popup.textContent = u.hudPopupText || '';
      node.appendChild(popup);

      // Circular avatar ring + skill badge + action buttons
      const ring = document.createElement('div');
      ring.className = 'circuit-avatar-ring';
      ring.id = `hud-ring-${u.id}`;

      const img = document.createElement('img');
      img.src = u.avatarUrl;
      img.alt = u.name;
      ring.appendChild(img);

      const skillBadge = document.createElement('span');
      skillBadge.className = 'circuit-skill-mini';
      skillBadge.textContent = u.skill.icon;
      skillBadge.title = `${u.skill.name}: ${u.skill.desc}`;
      ring.appendChild(skillBadge);

      if (u.carryStack.length > 0) {
        const jetBtn = document.createElement('button');
        jetBtn.className = 'squad-jettison-btn';
        jetBtn.textContent = '卸';
        jetBtn.title = `卸下 ${u.name} 头顶的 1 件物资到地面，立即恢复其移动配速`;
        jetBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.crowd.jettisonOneItem(u.id);
        });
        ring.appendChild(jetBtn);
      }

      if (u.id !== 0) {
        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'squad-dismiss-x';
        dismissBtn.textContent = '×';
        dismissBtn.title = `让 ${u.name} 交接物资并原地休整（调节队伍构成过关或省粮🍞，左键点击3D小人可随时重招）`;
        dismissBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.crowd.dismissUnit(u.id);
        });
        ring.appendChild(dismissBtn);
      }

      node.appendChild(ring);

      // Sacred Language Symbol Coins row
      const glyphsRow = document.createElement('div');
      glyphsRow.className = 'circuit-glyphs-row';
      u.langs.forEach((l) => {
        const cfg = window.LANG_CONFIG[l] || window.LANG_CONFIG.A;
        const coin = document.createElement('span');
        coin.className = `glyph-coin ${l}`;
        coin.textContent = cfg.symbol;
        coin.title = `${cfg.name} (${cfg.conlangName})`;
        glyphsRow.appendChild(coin);
      });
      node.appendChild(glyphsRow);

      // Short Name
      const shortName = u.name.includes('·') ? u.name.split('·')[1] : u.name;
      const nameEl = document.createElement('div');
      nameEl.className = 'circuit-unit-name';
      nameEl.textContent = shortName;
      node.appendChild(nameEl);

      // Carry Stack & Speed Tag
      const extraCap = this.buffSystem ? (this.buffSystem.modifiers.extraCarryCap || 0) : 0;
      const maxCap = u.getMaxCarry(extraCap);
      const stackIcons = u.carryStack
        .map((it) => (it.type === 'FOOD' ? '🍞' : (it.type === 'WOOD' ? '🪵' : '🪨')))
        .join('');
      const speedPct = Math.round(u.getCarrySpeedMultiplier() * 100);
      const carryTag = document.createElement('div');
      carryTag.className = 'circuit-carry-tag';
      carryTag.textContent = u.carryStack.length > 0
        ? `${stackIcons} ${speedPct}%`
        : `0/${maxCap} · 100%`;
      node.appendChild(carryTag);

      node.addEventListener('click', () => {
        this.crowd.selectedUnit = u;
        this.targetCamFocus.copy(u.pos);
        this.autoFollowCrowd = false;
        this.updateInspectorUI();
        this.renderSquadAvatarStrip();
      });

      strip.appendChild(node);
    });

    this.renderCircuitChainCanvas();
  }

  // Updates the live Pop-up Chat Bubbles above the Fixed Squad HUD portraits at 60fps
  updateHudChatPopups() {
    this.crowd.units.forEach((u) => {
      if (!u.alive || u.faction !== 'PLAYER' || u.inWell) return;
      const popup = document.getElementById(`hud-popup-${u.id}`);
      if (!popup) return;
      if (u.hudPopupTimer > 0 && u.hudPopupText) {
        if (popup.textContent !== u.hudPopupText) {
          popup.textContent = u.hudPopupText;
        }
        popup.style.borderColor = u.hudPopupColor || '#70e1d7';
        popup.classList.add('visible');
      } else {
        popup.classList.remove('visible');
      }
    });
  }

  // Draws the Circuit-Style Language Chain Traces & Rhythmic Traveling Symbol Pulses behind the Top Squad HUD!
  renderCircuitChainCanvas() {
    const hudBox = document.getElementById('circuit-squad-hud');
    const canvas = document.getElementById('circuit-chain-canvas');
    if (!hudBox || !canvas) return;

    const rect = hudBox.getBoundingClientRect();
    const w = Math.max(200, Math.round(rect.width));
    const h = Math.max(68, Math.round(rect.height));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    // Map each rendered squad member's avatar ring center in canvas coordinates
    const nodeCenters = new Map();
    const squad = this.crowd.units.filter((u) => u.alive && u.faction === 'PLAYER' && !u.inWell);
    squad.forEach((u) => {
      const ringEl = document.getElementById(`hud-ring-${u.id}`);
      if (ringEl) {
        const r = ringEl.getBoundingClientRect();
        nodeCenters.set(u.id, {
          x: r.left - rect.left + r.width * 0.5,
          y: r.top - rect.top + r.height * 0.5,
          unit: u
        });
      }
    });

    if (nodeCenters.size <= 1) return;

    // Helper to evaluate a point along a PCB-style orthogonal/angled circuit trace between two HUD nodes
    const getCircuitPoint = (p1, p2, laneIndex, t) => {
      const busY = Math.min(h - 6, Math.max(10, p1.y - 16 - (laneIndex % 3) * 6));
      const x1 = p1.x;
      const y1 = p1.y;
      const x2 = p2.x;
      const y2 = p2.y;
      // If adjacent, draw a direct horizontal trace through avatar centers; if jumping across nodes, route along upper PCB bus!
      if (Math.abs(x2 - x1) < 92) {
        return {
          x: x1 + (x2 - x1) * t,
          y: y1 + (y2 - y1) * t
        };
      }
      if (t < 0.2) {
        const k = t / 0.2;
        return { x: x1, y: y1 + (busY - y1) * k };
      } else if (t <= 0.8) {
        const k = (t - 0.2) / 0.6;
        return { x: x1 + (x2 - x1) * k, y: busY };
      } else {
        const k = (t - 0.8) / 0.2;
        return { x: x2, y: busY + (y2 - busY) * k };
      }
    };

    // 1. Draw Active Parent -> Child Language Chain Circuit Traces
    let laneIdx = 0;
    squad.forEach((u) => {
      if (u.id === 0) return;
      const pChild = nodeCenters.get(u.id);
      if (!pChild) return;

      if (u.commandUnderstood && u.chainParentId !== null && nodeCenters.has(u.chainParentId)) {
        const pParent = nodeCenters.get(u.chainParentId);
        const langKey = u.sharedLangWithParent || u.langs[0] || 'A';
        const cfg = window.LANG_CONFIG[langKey] || window.LANG_CONFIG.A;
        const lane = laneIdx++;

        ctx.save();
        ctx.strokeStyle = cfg.color;
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = 6;
        ctx.lineWidth = 2.2;
        ctx.globalAlpha = 0.78;

        ctx.beginPath();
        const pStart = getCircuitPoint(pParent, pChild, lane, 0);
        ctx.moveTo(pStart.x, pStart.y);
        const steps = 10;
        for (let s = 1; s <= steps; s++) {
          const pt = getCircuitPoint(pParent, pChild, lane, s / steps);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Circuit solder pad dots
        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        ctx.arc(pParent.x, pParent.y, 3, 0, Math.PI * 2);
        ctx.arc(pChild.x, pChild.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        u._hudCircuitLane = lane;
      } else if (!u.commandUnderstood) {
        // Draw broken red dashed trace to nearest node
        const pZero = nodeCenters.get(0);
        if (pZero) {
          ctx.save();
          ctx.strokeStyle = '#ff6b6b';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.moveTo(pZero.x, pZero.y + 12);
          ctx.lineTo(pChild.x, pChild.y + 12);
          ctx.stroke();
          ctx.restore();
        }
      }
    });

    // 2. Draw Rhythmic Traveling Sacred Symbol Pulses (☼, ♒, ▲, ◎, 𓂀, ❖) along the Circuit Traces!
    const pulses = this.crowd.circuitPulses || [];
    pulses.forEach((pulse) => {
      const pFrom = nodeCenters.get(pulse.fromId);
      const pTo = nodeCenters.get(pulse.toId);
      if (!pFrom || !pTo) return;
      const lane = pTo.unit._hudCircuitLane || 0;
      const pt = getCircuitPoint(pFrom, pTo, lane, Math.max(0, Math.min(1, pulse.t)));

      ctx.save();
      // Glowing circuit carrier node
      ctx.fillStyle = '#141a24';
      ctx.strokeStyle = pulse.color;
      ctx.shadowColor = pulse.color;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sacred Language Symbol inside the traveling pulse
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pulse.symbol, pt.x, pt.y + 0.5);
      ctx.restore();
    });
  }

  updateInspectorUI() {
    let u = this.crowd.selectedUnit;
    if (!u || !u.alive) {
      u = this.crowd.units.find((unit) => unit.alive && unit.faction === 'PLAYER') || null;
      this.crowd.selectedUnit = u;
    }
    if (!u) return;

    const pCanvas = document.getElementById('unit-portrait-canvas');
    if (pCanvas) {
      const pCtx = pCanvas.getContext('2d');
      pCtx.imageSmoothingEnabled = false;
      window.SpriteFactory.drawPixelCharacter(pCtx, u.appearance, 'IDLE', 0, u.langs, 52, true);
    }

    const extraCap = this.buffSystem ? (this.buffSystem.modifiers.extraCarryCap || 0) : 0;
    const stackStr = u.carryStack.map((it) => (it.type === 'FOOD' ? '🍞' : (it.type === 'WOOD' ? '🪵' : '🪨'))).join('');
    const speedPct = Math.round(u.getCarrySpeedMultiplier() * 100);
    document.getElementById('insp-name').textContent = u.name;
    document.getElementById('insp-role').textContent = `${u.role} · 负重 ${u.carryStack.length}/${u.getMaxCarry(extraCap)} ${stackStr} (${speedPct}%配速)`;

    const jettisonBtn = document.getElementById('btn-insp-jettison');
    if (jettisonBtn) {
      if (u.faction === 'PLAYER' && u.carryStack.length > 0 && !u.inWell) {
        jettisonBtn.classList.remove('hidden');
      } else {
        jettisonBtn.classList.add('hidden');
      }
    }

    const dismissBtn = document.getElementById('btn-insp-dismiss');
    if (dismissBtn) {
      if (u.faction === 'PLAYER' && u.id !== 0 && !u.inWell) {
        dismissBtn.classList.remove('hidden');
      } else {
        dismissBtn.classList.add('hidden');
      }
    }

    const stateNames = {
      IN_WELL: '🪣 困于村口水井 · 左键点击或按[Q]捞出',
      FOLLOWING: '🟢 语言链互通 · 自由寻路探索',
      CLIMBING: '⚡ 推力助跳 · 飞跃断层',
      BUILDING: '🔨 建筑工消耗木石铺桥',
      ANCHORED: '🛡️ 聚拢护队 · 防落石/防断链',
      CONFUSED: '🟠 语言断链 · 等待双语中介',
      PANIC: '🔴 长期失联恐慌!',
      FREEFALL: '🪨 被落石/坍塌击落坠塔中 · 快左键抓救!',
      STUNNED: '💫 坠落砸在下层石阶眩晕中!',
      HANGING_LEDGE: '🆘 挂在裂缝边缘 · 快捞人!',
      SELF_PRESERVE: '🔥 拒绝回头 · 逃离崩塌!',
      RESCUING: '🤝 冲向裂缝捞救同伴!',
      STRANDED: '⛺ 原地休整不占编制 · 左键点击归队',
      NATIONALIST_LEADER: '🚩 纯语种民族同盟魁首',
      DEFECTED: '💔 被纯语种民族派挖走!'
    };
    document.getElementById('insp-state').textContent = stateNames[u.aiState] || u.aiState;
    document.getElementById('insp-thought').textContent = u.thoughtText;

    const badgesEl = document.getElementById('insp-langs');
    badgesEl.innerHTML = u.langs
      .map((l) => {
        const cfg = window.LANG_CONFIG[l] || window.LANG_CONFIG.A;
        return `<span class="lang-pill ${l}" title="${cfg.name} (${cfg.conlangName})">${cfg.symbol}</span>`;
      })
      .join('');
  }

  updateHUD(maxAlt, aliveCount) {
    document.getElementById('stat-alive').textContent = `${aliveCount}`;
    const capEl = document.getElementById('stat-carry-cap');
    if (capEl) {
      capEl.textContent = `${this.crowd.totalCarryCount}/${this.crowd.totalMaxCarry}`;
    }
    document.getElementById('stat-food').textContent = `${this.crowd.foodSupply}`;
    document.getElementById('stat-food-rate').textContent = `(${this.crowd.foodNetRate.toFixed(2)}袋/s)`;
    const foodBox = document.getElementById('food-chip-box');
    if (foodBox) {
      foodBox.classList.toggle('low-food', this.crowd.foodSupply <= 1);
    }

    document.getElementById('stat-wood').textContent = `${this.crowd.woodSupply}`;
    document.getElementById('stat-stone').textContent = `${this.crowd.stoneSupply}`;
    document.getElementById('stat-altitude').textContent = `${maxAlt.toFixed(0)}m`;
    document.getElementById('stat-flood').textContent = `${this.floodHeight.toFixed(0)}m`;
    document.getElementById('stat-relics').textContent = `${this.relicsCollected}/4`;

    const cardBtn = document.getElementById('btn-redeem-card');
    const cardStat = document.getElementById('stat-cards');
    if (cardBtn && cardStat) {
      cardStat.textContent = `${this.buffSystem.cardTokens}`;
      cardBtn.disabled = this.buffSystem.cardTokens <= 0;
    }

    const tiltBadge = document.getElementById('tilt-mini-badge');
    const tiltDegEl = document.getElementById('tilt-deg-text');
    if (tiltBadge && tiltDegEl) {
      if (maxAlt > 22) {
        tiltBadge.classList.remove('hidden');
        tiltDegEl.textContent = `${this.towerTilt >= 0 ? '+' : ''}${this.towerTilt.toFixed(1)}°`;
      } else {
        tiltBadge.classList.add('hidden');
      }
    }

    const effPct = Math.round(this.crowd.chainEfficiency * 100);
    const effTag = document.getElementById('chain-efficiency-tag');
    if (effTag) {
      effTag.textContent = this.crowd.rosettaTimer > 0 ? `📡 开源 100%` : `${effPct}% 互通`;
      effTag.style.color = effPct >= 80 ? '#7bed9f' : (effPct >= 50 ? '#f6e05e' : '#ff6b6b');
    }

    const warnOverlay = document.getElementById('collapse-warning-overlay');
    if (warnOverlay) {
      warnOverlay.style.opacity = (maxAlt > 5 && maxAlt - this.floodHeight < 10.0) ? '1' : '0';
    }

    const updateCD = (id, btnId, val) => {
      const el = document.getElementById(id);
      const btn = document.getElementById(btnId);
      if (val > 0) {
        el.textContent = `${val.toFixed(0)}s`;
        btn.disabled = true;
      } else {
        el.textContent = '就绪';
        btn.disabled = false;
      }
    };
    updateCD('cd-shout', 'btn-miracle-throw', this.cooldowns.shout);
    updateCD('cd-rosetta', 'btn-miracle-opensource', this.cooldowns.rosetta);
    updateCD('cd-gust', 'btn-miracle-lift', this.cooldowns.gust);
  }

  drawGenesisHandsIllustration() {
    const c = document.getElementById('genesis-hands-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width;
    const h = c.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#181e26';
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(w * 0.5, h * 0.48, 2, w * 0.5, h * 0.48, 65);
    grad.addColorStop(0, 'rgba(255, 230, 150, 0.95)');
    grad.addColorStop(0.4, 'rgba(56, 173, 169, 0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#e0ac69';
    ctx.fillRect(40, 48, 135, 22);
    ctx.fillRect(175, 44, 42, 10);

    ctx.fillStyle = '#fff3d6';
    ctx.fillRect(280, 34, 150, 28);
    ctx.fillRect(230, 42, 50, 12);

    ctx.fillStyle = '#70e1d7';
    ctx.font = 'italic 12px serif';
    ctx.textAlign = 'center';
    ctx.fillText('“语言从未把你们分开，是贪欲让你们选择了聋哑。”', w * 0.5, h - 12);
  }

  triggerEnding(isVictory, aliveCount, maxAlt) {
    this.gameEnded = true;
    const modal = document.getElementById('ending-modal');
    const eyebrow = document.getElementById('ending-eyebrow');
    const title = document.getElementById('ending-title');
    const body = document.getElementById('ending-body');
    const stats = document.getElementById('ending-stats');

    this.drawGenesisHandsIllustration();

    if (isVictory) {
      window.SFX.playMiracle();
      eyebrow.textContent = '🌌 银河穹顶 —— 【创世纪的幻灭】';
      title.textContent = '“路还长，但至少我们学会了怎么说话。”';
      body.textContent =
        '巨大的“上帝之手”浮现。主角伸出左手，试图通过“握手”获取最终的救赎。\n' +
        '在指尖接触的刹那，所有人脑中涌入了现代人类因为沟通不畅而引发的战争、仇恨与隔阂的记忆。\n\n' +
        '向上看，海市蜃楼，现代人类使用先进的武器，城市陷入火海；\n' +
        '向下看，原本在塔内学会了协作的人们，回到地面后又因为争夺从塔上掉落的“奇迹食物”而开始了新的厮杀。塔下的时钟被拨快，不同语言的市区与围栏被人们建起。\n\n' +
        '上帝低语道（全语种重叠）：“语言从未把你们分开，是贪欲让你们选择了聋哑。”\n' +
        '主角们默默退后。他们并没有获得神力，只是获得了一次看清世界的机会。\n' +
        '上帝留下反问就彻底摧毁了塔，主角团作为天使散落到各个时代，各自以自己认为有用的方式推动一点点历史进程（如智慧宫抄写员、联合国委员）。';
    } else {
      eyebrow.textContent = '🏛️ 巴别塔崩塌于半途';
      title.textContent = '他们未能触碰云端的指尖';
      body.textContent =
        '当指令链在嘈杂、落石与崩塌中断裂，小队在倾斜的高塔上失散。\n' +
        '善用护盾卫士抵御落石、调节队伍编制满足关卡条件、双语中介传递符号脉冲，再次向银河穹顶进发吧！';
    }

    stats.innerHTML = `
      攀登海拔：<b>${maxAlt.toFixed(1)} m</b> / ${this.tower.maxHeight.toFixed(1)} m &nbsp;|&nbsp;
      同行伙伴：<b>${aliveCount} 名</b> &nbsp;|&nbsp;
      冷库奇迹线索：<b>${this.relicsCollected} / 4</b>
    `;
    modal.classList.remove('hidden');
  }

  animate(now) {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (this.isPaused || this.gameEnded) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.elapsedTime += dt;

    Object.keys(this.cooldowns).forEach((k) => {
      if (this.cooldowns[k] > 0) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    });

    if (this.keys['KeyA']) {
      this.targetCamAngle -= dt * 1.45;
      this.autoFollowCrowd = false;
    }
    if (this.keys['KeyD']) {
      this.targetCamAngle += dt * 1.45;
      this.autoFollowCrowd = false;
    }
    if (this.keys['KeyW']) {
      this.targetCamFocus.y = Math.min(this.tower.maxHeight, this.targetCamFocus.y + dt * 20);
      this.autoFollowCrowd = false;
    }
    if (this.keys['KeyS']) {
      this.targetCamFocus.y = Math.max(0, this.targetCamFocus.y - dt * 20);
      this.autoFollowCrowd = false;
    }

    const aliveUnits = this.crowd.units.filter((u) => u.alive && u.faction === 'PLAYER');
    let maxAlt = 0;
    let leadS = 0;
    let leadUnit = null;
    aliveUnits.forEach((u) => {
      if (u.s >= leadS) {
        leadS = u.s;
        leadUnit = u;
      }
      if (u.pos.y > maxAlt) {
        maxAlt = u.pos.y;
      }
    });

    // Structural Tower Sway & High-Altitude Tilt (driven by wind, altitude & squad weight torque!)
    if (maxAlt > 22) {
      let weightTorque = 0;
      aliveUnits.forEach((u) => {
        if (u.s >= 0.22) {
          weightTorque += (u.pos.x / 38.0) * (0.18 + u.carryStack.length * 0.08);
        }
      });
      const altFactor = maxAlt > 92 ? 1.0 : Math.min(0.65, (maxAlt - 22) / 95);
      const naturalOsc = Math.sin(this.elapsedTime * 0.95) * (5.8 * altFactor);
      this.towerTilt += (naturalOsc + weightTorque * 0.65 - this.towerTilt * 0.35) * dt;
    } else {
      this.towerTilt *= 0.92;
    }

    if (this.keys['ArrowLeft']) {
      this.towerTilt -= dt * 14.0;
      aliveUnits.forEach((u) => {
        if (!u.isChild) u.radialOffset = Math.max(-1.4, u.radialOffset - dt * 2.2);
      });
    }
    if (this.keys['ArrowRight']) {
      this.towerTilt += dt * 14.0;
      aliveUnits.forEach((u) => {
        if (!u.isChild) u.radialOffset = Math.min(1.4, u.radialOffset + dt * 2.2);
      });
    }
    this.towerTilt = Math.max(-14.5, Math.min(14.5, this.towerTilt));

    // Flood / Collapse only starts rising once the squad enters the Babel Tower (leadS >= 0.22)!
    if (leadS >= 0.22) {
      const floodMult = this.buffSystem.modifiers.floodSpeedMult;
      const catchupBoost = (maxAlt - this.floodHeight > 36) ? 1.35 : 1.0;
      this.floodHeight += dt * this.baseFloodSpeed * floodMult * catchupBoost;
    }
    this.waterMesh.position.y = this.floodHeight - 75;
    this.foamRing.position.y = this.floodHeight + 0.08;

    this.windStrength = 0.4 + 0.35 * Math.sin(this.elapsedTime * 0.7) + Math.abs(this.towerTilt) * 0.04;

    this.tower.update(dt, this.elapsedTime, this.towerTilt, this.crowd);
    this.crowd.update(dt, this.elapsedTime, this.floodHeight, this.windStrength, this.towerTilt);

    this.storySystem.checkProgression(leadS, maxAlt, this);

    // Dual-Mode Camera Tracking (Overland vs Massive Tower Interior/Exterior)
    if (this.autoFollowCrowd && leadUnit) {
      const localFocus = this.crowd.rallyPos.clone().lerp(leadUnit.pos, 0.5);
      const focusPoint = this.tower.localToWorldPos(localFocus);
      if (leadS < 0.22) {
        this.targetCamFocus.copy(focusPoint);
      } else {
        this.targetCamFocus.set(focusPoint.x * 0.42, focusPoint.y + 3.2, focusPoint.z * 0.42);
        const desiredAngle = Math.atan2(focusPoint.z, focusPoint.x);
        let diff = desiredAngle - this.targetCamAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.targetCamAngle += diff * dt * 2.2;
      }
    }

    this.camFocus.lerp(this.targetCamFocus, Math.min(1, dt * 5));
    this.camAngle += (this.targetCamAngle - this.camAngle) * Math.min(1, dt * 6);
    this.camDistance += (this.targetCamDistance - this.camDistance) * Math.min(1, dt * 6);

    const camX = this.camFocus.x + Math.cos(this.camAngle) * this.camDistance;
    const camZ = this.camFocus.z + Math.sin(this.camAngle) * this.camDistance;
    this.camera.position.set(camX, this.camFocus.y + this.camPitchOffset, camZ);
    this.camera.lookAt(this.camFocus);

    if (aliveUnits.length === 0) {
      this.triggerEnding(false, 0, maxAlt);
    } else if (maxAlt >= this.tower.maxHeight - 2.2) {
      this.triggerEnding(true, aliveUnits.length, this.tower.maxHeight);
    }

    this.updateHUD(maxAlt, aliveUnits.length);
    if (this.squadStripDirty || Math.floor(this.elapsedTime * 10) % 15 === 0) {
      this.squadStripDirty = false;
      this.renderSquadAvatarStrip();
    }
    this.updateHudChatPopups();
    this.renderCircuitChainCanvas();

    if (Math.floor(this.elapsedTime * 10) % 3 === 0) {
      this.storySystem.updateObjectiveChecklist(this);
      this.updateInspectorUI();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.GameApp = new BabelGameApp();
});
