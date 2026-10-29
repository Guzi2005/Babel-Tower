// Core Gameplay Systems for 《巴别：失落的同位语》:
// 1. Unified 3D Articulated Pixel-Voxel Figurines (告别2D贴片与3D分离，真实投射3D阴影、摆臂迈步、朝向行进方向)
// 2. Real 3D Physics for Boulders, Knockback, Freefall, Crash-Landing onto Lower Tiers & Falling Off the Tower (真实物理落石击飞、摔落下层或坠塔)
// 3. Run Zombie Food-style Vertical-Stack Physical Supply Carrying System (头顶3D竖向堆叠实体口粮🍞、原木🪵、石砖🪨，付出真实配速与人力代价)
// 4. Circuit-Like Language Chain with Rhythmic Traveling Glyph Pulses (电路感语言链连线 + 沿线有节奏传递的造语符号脉冲 + HUD头像弹出气泡)
// 5. Tricky Squad Composition Checks, Pushable Counterweight Crates (📦) & 3-Stele Rune Decoders (0/3)

const SKILL_CLASSES = {
  MEDIATOR: {
    id: 'MEDIATOR',
    name: '同位语中介',
    icon: '🗣️',
    speedMult: 1.05,
    buildMult: 1.0,
    relayBonus: 4.8,
    maxCarry: 2,
    weightPenalty: 0.11,
    desc: '稀有的双语桥梁（背负上限 2 件），负责将指令脉冲转译给不同符号语种的同伴。'
  },
  STRONGMAN: {
    id: 'STRONGMAN',
    name: '搬运大力士',
    icon: '💪',
    speedMult: 1.04,
    buildMult: 1.35,
    maxCarry: 5,
    weightPenalty: 0.04,
    desc: '力大无穷！头顶可竖向堆叠 5 件物资且几乎不减速（每件仅 -4%），擅长推动配重木箱与压住重力门！'
  },
  MASON: {
    id: 'MASON',
    name: '建筑工人',
    icon: '🔨',
    speedMult: 1.0,
    buildMult: 2.6,
    maxCarry: 2,
    weightPenalty: 0.10,
    desc: '背负上限 2 件。遇到断桥裂缝时，直接取用自己或身旁队友头顶堆叠的【🪵原木/🪨石砖】高速架桥！'
  },
  FORAGER: {
    id: 'FORAGER',
    name: '采粮农夫',
    icon: '🌾',
    speedMult: 1.08,
    buildMult: 1.1,
    maxCarry: 4,
    weightPenalty: 0.05,
    foodSave: 0.35,
    desc: '擅长背负口粮（竖向堆叠上限 4 件，每件仅 -5% 移速），采集粮袋额外产出 +1 袋，且降低全队口粮消耗！'
  },
  SHIELDBEARER: {
    id: 'SHIELDBEARER',
    name: '青铜举盾卫',
    icon: '🛡️',
    speedMult: 0.96,
    buildMult: 1.0,
    maxCarry: 2,
    weightPenalty: 0.11,
    windResist: 0.45,
    blocksRocks: true,
    desc: '高举青铜圆盾，自动为周围 6.5 米内的同伴抵挡 3D 翻滚巨石，防止队友被砸飞坠塔！'
  },
  ACROBAT: {
    id: 'ACROBAT',
    name: '轻盈飞跃者',
    icon: '🤸',
    speedMult: 1.32,
    buildMult: 1.15,
    maxCarry: 1,
    weightPenalty: 0.16,
    isLight: true,
    desc: '身轻如燕（仅可背负 1 件）。空手时踩在脆裂红陶板上绝不坍塌，是突破高层【轻装限重检定】的关键！'
  },
  SCHOLAR: {
    id: 'SCHOLAR',
    name: '铭文破译师',
    icon: '🔑',
    speedMult: 1.0,
    buildMult: 1.9,
    maxCarry: 2,
    weightPenalty: 0.11,
    relayBonus: 2.2,
    desc: '精通远古符号造语，激活【传语译码碑 (0/3)】与破译青色符文锁的速度翻倍。'
  }
};

class CarryStackMeshFactory {
  constructor() {
    this.matFoodBag = new THREE.MeshStandardMaterial({ color: 0xf4c430, roughness: 0.6, metalness: 0.08 });
    this.matFoodBand = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.7 });
    this.matWoodLog = new THREE.MeshStandardMaterial({ color: 0xb86b28, roughness: 0.85 });
    this.matStoneBlock = new THREE.MeshStandardMaterial({ color: 0xc8bca6, roughness: 0.88, metalness: 0.05 });
    this.matStoneTrim = new THREE.MeshStandardMaterial({ color: 0x8e826d, roughness: 0.9 });
  }

  createItemMesh(type) {
    const itemGroup = new THREE.Group();
    if (type === 'FOOD') {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.36, 0.56), this.matFoodBag);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.10, 0.60), this.matFoodBand);
      bag.castShadow = true;
      itemGroup.add(bag, band);
    } else if (type === 'WOOD') {
      for (let i = -1; i <= 1; i += 2) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.88, 8), this.matWoodLog);
        log.rotation.z = Math.PI / 2;
        log.position.z = i * 0.15;
        log.castShadow = true;
        itemGroup.add(log);
      }
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.64), this.matFoodBand);
      itemGroup.add(strap);
    } else {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.36, 0.62), this.matStoneBlock);
      const groove = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.66), this.matStoneTrim);
      slab.castShadow = true;
      itemGroup.add(slab, groove);
    }
    return itemGroup;
  }
}

window.CarryMeshFactory = new CarryStackMeshFactory();

class BabelUnit {
  constructor(id, tower, scene, config = {}) {
    this.id = id;
    this.tower = tower;
    this.scene = scene;

    this.name = config.name || `旅人 #${id + 1}`;
    this.langs = config.langs ? [...config.langs] : ['A'];
    this.skill = SKILL_CLASSES[config.skillId] || SKILL_CLASSES.MASON;
    this.isChild = Boolean(config.isChild || this.skill.isLight);

    this.faction = config.faction || 'PLAYER';
    this.nationalistLang = config.nationalistLang || this.langs[0];
    this.inWell = Boolean(config.inWell);
    this.poachMeter = 0;

    this.appearance = window.SpriteFactory.createAppearance(id + 1, this.langs, {
      isChild: this.isChild,
      isNationalist: this.faction === 'NATIONALIST_LEADER',
      skillId: this.skill.id
    });
    this.avatarUrl = window.SpriteFactory.createAvatarDataURL(this.appearance, this.langs);

    this.role = `${this.skill.icon} ${this.skill.name} · ${this.appearance.costume.eraName}`;
    this.quote = config.quote || this.skill.desc;

    this.s = config.s !== undefined ? config.s : 0.008;
    this.radialOffset = config.radialOffset !== undefined ? config.radialOffset : (Math.random() - 0.5) * 1.6;
    this.freeOffset = new THREE.Vector3(0, 0, 0);
    this.pos = this.tower.getPointOnSpiral(this.s, this.radialOffset);
    this.prevPos = this.pos.clone();
    this.facingAngle = 0;

    this.throwArc = null;

    // --- REAL 3D PHYSICS & KNOCKBACK / FREEFALL STATE ---
    this.inFreefall = false;
    this.physVel = new THREE.Vector3(0, 0, 0);
    this.stunTimer = 0;

    this.alive = true;
    this.isGrabbed = false;
    this.commandUnderstood = true;
    this.lastChainHop = 0;
    this.sharedLangWithParent = this.langs[0];
    this.isolatedTimer = 0;
    this.isHangingLedge = false;
    this.hangTimer = 6.5;

    // HUD Pop-up Chat Bubble State (for the Top Fixed Circuit Squad HUD!)
    this.hudPopupText = '';
    this.hudPopupColor = '#38ada9';
    this.hudPopupTimer = 0;

    this.sanity = 100;
    this.stamina = 100;
    this.aiState = this.inWell ? 'IN_WELL' : (this.faction === 'PLAYER' ? 'FOLLOWING' : this.faction);
    this.thoughtText = this.quote;

    // Build Unified 3D Articulated Pixel-Voxel Figurine!
    // Attached to this.tower.entitiesGroup so NPCs & props move 100% physically locked with the swaying/tilting tower!
    const parentGroup = this.tower.entitiesGroup || this.tower.group;
    this.parentGroup = parentGroup;
    this.rig = window.SpriteFactory.create3DCharacterRig(this.appearance, this.langs, this.id);
    this.sprite = this.rig.root; // Alias for raycasting & positioning
    this.baseScale = this.isChild ? 2.1 : 2.4;
    this.rig.root.position.copy(this.pos);
    parentGroup.add(this.rig.root);

    // 3D Vertical Supply Stack Group (Attached above the 3D character's head!)
    this.carryStack = [];
    this.carryGroup = new THREE.Group();
    this.carryGroup.position.copy(this.pos).add(new THREE.Vector3(0, 2.85, 0));
    parentGroup.add(this.carryGroup);

    const primaryCfg = LANG_CONFIG[this.langs[0]] || LANG_CONFIG.A;
    const ringColor = this.faction === 'NATIONALIST_LEADER'
      ? 0xff4757
      : (this.faction === 'STRANDED' ? 0x4cd137 : (this.langs.length > 1 ? 0xffdf70 : new THREE.Color(primaryCfg.color).getHex()));
    const ringGeo = new THREE.RingGeometry(0.5, 0.76, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.82
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.rotation.x = -Math.PI / 2;
    this.ringMesh.position.copy(this.pos).add(new THREE.Vector3(0, 0.08, 0));
    parentGroup.add(this.ringMesh);

    // Pre-allocated Speech Bubble Canvas & Texture (Eliminates the white-rectangle shader bug!)
    this.bubbleCanvas = document.createElement('canvas');
    this.bubbleCanvas.width = 380;
    this.bubbleCanvas.height = 96;
    this.bubbleTex = new THREE.CanvasTexture(this.bubbleCanvas);
    this.bubbleMat = new THREE.SpriteMaterial({
      map: this.bubbleTex,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    this.bubbleSprite = new THREE.Sprite(this.bubbleMat);
    this.bubbleSprite.scale.set(3.0, 0.86, 1);
    this.bubbleSprite.position.copy(this.pos).add(new THREE.Vector3(0, 3.4, 0));
    this.bubbleSprite.visible = false;
    parentGroup.add(this.bubbleSprite);
    this.bubbleTimer = 0;
    this.speechCooldown = 0;

    this.animTimer = Math.random() * 10;
    this.buildCooldown = 0;

    if (Array.isArray(config.initialCarry)) {
      config.initialCarry.forEach((t) => this.pushCarryItem(t, true));
    }
  }

  getMaxCarry(extraCap = 0) {
    return (this.skill.maxCarry || 2) + extraCap;
  }

  getCarrySpeedMultiplier() {
    if (this.carryStack.length === 0) return 1.0;
    const penaltyPerItem = this.skill.weightPenalty || 0.11;
    return Math.max(0.42, 1.0 - this.carryStack.length * penaltyPerItem);
  }

  pushCarryItem(type, silent = false) {
    const extraCap = (window.GameApp && window.GameApp.buffSystem) ? (window.GameApp.buffSystem.modifiers.extraCarryCap || 0) : 0;
    if (this.carryStack.length >= this.getMaxCarry(extraCap)) return false;

    const mesh = window.CarryMeshFactory.createItemMesh(type);
    const itemIdx = this.carryStack.length;
    mesh.position.set(0, itemIdx * 0.38, 0);
    mesh.scale.setScalar(silent ? 1.0 : 0.15);
    mesh.visible = true; // All carried items are visibly stacked in 3D without artificial caps
    this.carryGroup.add(mesh);

    this.carryStack.push({
      type,
      mesh,
      scaleT: silent ? 1.0 : 0.15
    });

    if (window.GameApp) window.GameApp.markSquadStripDirty();
    return true;
  }

  popCarryItem(preferredType = null) {
    if (this.carryStack.length === 0) return null;
    let removeIdx = this.carryStack.length - 1;
    if (preferredType) {
      for (let i = this.carryStack.length - 1; i >= 0; i--) {
        if (this.carryStack[i].type === preferredType) {
          removeIdx = i;
          break;
        }
      }
      if (this.carryStack[removeIdx].type !== preferredType) return null;
    }

    const [removed] = this.carryStack.splice(removeIdx, 1);
    if (removed && removed.mesh) {
      this.carryGroup.remove(removed.mesh);
    }
    this.carryStack.forEach((item, i) => {
      item.mesh.position.y = i * 0.38;
      item.mesh.visible = true;
    });

    if (window.GameApp) window.GameApp.markSquadStripDirty();
    return removed ? removed.type : null;
  }

  // Updates 3D Limb Articulation + Dedicated Bridge Building Animation + Vertical Supply Stack Wobble!
  update3DRigAndCarryVisuals(dt, elapsed, isMoving) {
    // 1. Rotate 3D body smoothly toward walking direction
    const moveDx = this.pos.x - this.prevPos.x;
    const moveDz = this.pos.z - this.prevPos.z;
    if (Math.hypot(moveDx, moveDz) > 0.015) {
      this.facingAngle = Math.atan2(moveDx, moveDz);
    }
    this.prevPos.copy(this.pos);

    const bg = this.rig.bodyGroup;
    const towerTiltRad = this.tower ? (this.tower.currentTiltZ || 0) : 0;

    if (this.inFreefall) {
      bg.rotation.x += dt * 9.0;
      bg.rotation.z += dt * 7.0;
      this.rig.leftArmPivot.rotation.x = Math.PI * 0.85;
      this.rig.rightArmPivot.rotation.x = Math.PI * 0.85;
    } else if (this.isHangingLedge) {
      bg.rotation.set(0, this.facingAngle, Math.sin(elapsed * 14) * 0.12);
      this.rig.leftArmPivot.rotation.x = Math.PI * 0.92;
      this.rig.rightArmPivot.rotation.x = Math.PI * 0.92;
      this.rig.leftLegPivot.rotation.x = Math.sin(elapsed * 18) * 0.5;
      this.rig.rightLegPivot.rotation.x = -Math.sin(elapsed * 18) * 0.5;
    } else if (this.stunTimer > 0) {
      bg.rotation.set(-Math.PI * 0.35, this.facingAngle, Math.sin(elapsed * 20) * 0.2);
    } else if (this.aiState === 'BUILDING') {
      // Dedicated Wooden Plank Bridge Construction Animation!
      // Kneel/lean forward toward the chasm and rhythmically swing the right arm (holding the hammer 🔨) overhead & down!
      const hammerCycle = elapsed * 18.0 + this.id;
      const hammerStrike = Math.sin(hammerCycle);
      bg.rotation.y = THREE.MathUtils.lerp(bg.rotation.y, this.facingAngle, Math.min(1, dt * 12));
      bg.rotation.x = 0.26 + Math.max(0, hammerStrike) * 0.18;
      bg.rotation.z = 0;

      // Wide stable stance with legs while hammering planks
      this.rig.leftLegPivot.rotation.x = -0.32;
      this.rig.rightLegPivot.rotation.x = 0.32;

      // Left arm holds the wooden plank steady; Right arm swings the hammer high overhead and slams down!
      this.rig.leftArmPivot.rotation.x = -0.95 + Math.cos(hammerCycle) * 0.15;
      this.rig.rightArmPivot.rotation.x = -1.45 + hammerStrike * 1.25;
    } else {
      // Lean slightly against the tower's physical tilt to maintain balance
      bg.rotation.x = 0;
      bg.rotation.z = this.s >= 0.22 ? (-towerTiltRad * 0.65) : 0;
      bg.rotation.y = THREE.MathUtils.lerp(bg.rotation.y, this.facingAngle, Math.min(1, dt * 10));

      if (isMoving) {
        const swing = Math.sin(this.animTimer * 2.6) * 0.65;
        this.rig.leftLegPivot.rotation.x = swing;
        this.rig.rightLegPivot.rotation.x = -swing;
        // If carrying items on head, raise arms slightly to Steady the stack!
        if (this.carryStack.length > 0) {
          this.rig.leftArmPivot.rotation.x = -2.4 + swing * 0.2;
          this.rig.rightArmPivot.rotation.x = -2.4 - swing * 0.2;
        } else {
          this.rig.leftArmPivot.rotation.x = -swing * 0.8;
          this.rig.rightArmPivot.rotation.x = swing * 0.8;
        }
      } else {
        this.rig.leftLegPivot.rotation.x = 0;
        this.rig.rightLegPivot.rotation.x = 0;
        const idleBreath = Math.sin(elapsed * 3 + this.id) * 0.06;
        if (this.carryStack.length > 0) {
          this.rig.leftArmPivot.rotation.x = -2.35 + idleBreath;
          this.rig.rightArmPivot.rotation.x = -2.35 - idleBreath;
        } else {
          this.rig.leftArmPivot.rotation.x = idleBreath;
          this.rig.rightArmPivot.rotation.x = -idleBreath;
        }
      }
    }

    // 2. Position 3D Vertical Carry Stack & Speech Bubble (All carried items visible, physical overhead collisions squeeze off excess)
    const stackTopOffset = this.carryStack.length * 0.38;
    this.carryGroup.position.set(this.pos.x, this.pos.y + 2.85, this.pos.z);
    const bubbleYStagger = ((this.id || 0) % 3) * 0.45;
    this.bubbleSprite.position.set(this.pos.x, this.pos.y + 3.35 + stackTopOffset + bubbleYStagger, this.pos.z);

    for (let i = 0; i < this.carryStack.length; i++) {
      const item = this.carryStack[i];
      item.mesh.visible = true;

      if (item.scaleT < 1.0) {
        item.scaleT = Math.min(1.0, item.scaleT + dt * 6.5);
        item.mesh.scale.setScalar(item.scaleT);
      }
      const swayAmp = isMoving ? (0.032 + Math.min(10, i) * 0.012) : (0.008 + Math.min(10, i) * 0.003);
      const phase = elapsed * (isMoving ? 8.0 : 2.5) - i * 0.45 + this.id;
      item.mesh.position.x = Math.sin(phase) * swayAmp;
      item.mesh.position.y = i * 0.38;
      item.mesh.rotation.z = -Math.sin(phase) * swayAmp * 0.7 - towerTiltRad * 0.6;
      item.mesh.rotation.y = this.facingAngle + Math.cos(phase * 0.5) * 0.10;
    }
  }

  // Shows speech bubble both in 3D AND pops up on the Top Fixed Circuit Squad HUD, then cleanly retracts!
  showSpeechBubble(text, borderColor = '#38ada9', duration = 1.6, triggerHudPop = true) {
    if (!this.alive) return;
    if (this.speechCooldown > 0 && duration < 2.5) return;

    // Anti-Occlusion Rule: Cleanly fade previous speech bubbles of other squadmates so text never overlaps
    if (window.GameApp && window.GameApp.crowd) {
      window.GameApp.crowd.units.forEach((other) => {
        if (other !== this && other.alive) {
          if (other.bubbleTimer > 0) {
            other.bubbleTimer = Math.min(other.bubbleTimer, 0.22);
          }
          if (other.hudPopupTimer > 0) {
            other.hudPopupTimer = 0; // Single speaker priority on HUD
          }
        }
      });
      if (window.GameApp.updateHudChatPopups) {
        window.GameApp.updateHudChatPopups();
      }
    }

    window.SpriteFactory.drawBubbleOnCanvas(this.bubbleCanvas, text, borderColor);
    this.bubbleTex.needsUpdate = true;
    this.bubbleMat.opacity = 1;
    this.bubbleSprite.visible = true;
    this.bubbleSprite.scale.set(2.4, 0.68, 1);
    // Keep 3D bubbles brief (max 1.6s) so they retract quickly after speaking and don't clutter the screen!
    this.bubbleTimer = Math.min(duration, 1.6);
    this.speechCooldown = 0.85;

    // Trigger constructed language syllabic babble!
    if (window.SFX && window.SFX.playBabble) {
      const spk = (this.skill && this.skill.id) ? this.skill.id.toLowerCase() : (this.name ? this.name.toLowerCase() : 'ash');
      window.SFX.playBabble(spk, text);
    }
    // Also trigger cinematic camera close-up if character speaks prominent line
    if (window.GameApp && window.GameApp.triggerCinematicDialogue && duration >= 2.0) {
      window.GameApp.triggerCinematicDialogue(this, duration);
    }

    if (triggerHudPop && this.faction === 'PLAYER') {
      this.hudPopupText = text.length > 20 ? text.slice(0, 20) + '…' : text;
      this.hudPopupColor = borderColor;
      this.hudPopupTimer = Math.min(duration, 1.8);
      if (window.GameApp) window.GameApp.updateHudChatPopups();
    }
  }

  launchThrowArc(targetS, label = '🤝 握手抛投飞跃!', customEndPos = null) {
    const clampedS = Math.max(0.005, Math.min(0.992, targetS));
    const endPos = customEndPos ? customEndPos.clone() : this.tower.getPointOnSpiral(clampedS, this.radialOffset * 0.4);
    this.inWell = false;
    this.inFreefall = false;
    this.isHangingLedge = false;
    this.hangTimer = 6.5;
    this.throwArc = {
      startPos: this.pos.clone(),
      endPos,
      startS: this.s,
      endS: clampedS,
      t: 0,
      duration: 0.78
    };
    this.showSpeechBubble(label, '#70e1d7', 2.4);
  }

  // Launches the unit into REAL 3D Physics Knockback & Freefall (when hit by a boulder or knocked off a collapsing bridge!)
  triggerPhysicsKnockOff(impulseVec, reason = '🪨 被滚石正面撞飞！') {
    if (this.inFreefall || this.inWell) return;
    this.inFreefall = true;
    this.isHangingLedge = false;
    this.throwArc = null;
    this.aiState = 'FREEFALL';
    this.physVel.copy(impulseVec);

    if (this.carryStack.length > 0 && window.GameApp && window.GameApp.crowd) {
      window.GameApp.crowd.scatterUnitCarriedItems(this);
      this.showSpeechBubble(`${reason} (物资散落!)`, '#ff6b6b', 3.5);
    } else {
      this.showSpeechBubble(reason, '#ff6b6b', 3.5);
    }
    window.SFX.playDrop();
    if (window.GameApp) window.GameApp.markSquadStripDirty();
  }

  triggerLedgeHang(reason = '⚠️ 踩空裂缝挂在边缘！快救我！') {
    if (this.isHangingLedge || this.inFreefall || this.throwArc || this.inWell) return;
    this.isHangingLedge = true;
    this.hangTimer = 7.0;
    this.aiState = 'HANGING_LEDGE';
    this.radialOffset = 1.65;

    if (this.carryStack.length > 0 && window.GameApp && window.GameApp.crowd) {
      window.GameApp.crowd.scatterUnitCarriedItems(this);
      this.showSpeechBubble(`${reason} (背负物资散落!)`, '#ff6b6b', 4.0);
    } else {
      this.showSpeechBubble(reason, '#ff6b6b', 4.0);
    }

    this.thoughtText = '“我挂在悬崖裂缝边快撑不住了！快派大力士靠近捞我，或用鼠标左键拎我上来！”';
    window.SFX.playDrop();
  }

  grantSecondaryLanguage(newLang) {
    if (!this.langs.includes(newLang) && this.langs.length < 2) {
      this.langs.push(newLang);
      this.appearance = window.SpriteFactory.createAppearance(this.id + 1, this.langs, {
        isChild: this.isChild,
        skillId: this.skill.id
      });
      this.avatarUrl = window.SpriteFactory.createAvatarDataURL(this.appearance, this.langs);

      // Update 3D overhead medallion badge
      const badgeCanvas = document.createElement('canvas');
      badgeCanvas.width = 128;
      badgeCanvas.height = 64;
      const bCtx = badgeCanvas.getContext('2d');
      window.SpriteFactory.drawOverheadMedallion(bCtx, this.langs, 128, false, 32);
      if (this.rig.badgeSprite.material.map) this.rig.badgeSprite.material.map.dispose();
      this.rig.badgeSprite.material.map = new THREE.CanvasTexture(badgeCanvas);

      this.ringMesh.material.color.setHex(0xffdf70);
      this.showSpeechBubble(`✨ 领悟双语符号 [${this.langs.map((l) => LANG_CONFIG[l].symbol).join('+')}]!`, '#70e1d7', 3.0);
      if (window.GameApp) window.GameApp.markSquadStripDirty();
    }
  }

  destroy() {
    this.alive = false;
    const pGroup = this.parentGroup || this.scene;
    pGroup.remove(this.rig.root);
    pGroup.remove(this.carryGroup);
    pGroup.remove(this.ringMesh);
    pGroup.remove(this.bubbleSprite);
    if (this.bubbleTex) this.bubbleTex.dispose();
    if (window.GameApp) window.GameApp.markSquadStripDirty();
  }
}

class CrowdAndLanguageSystem {
  constructor(scene, tower, buffSystem, storySystem) {
    this.scene = scene;
    this.tower = tower;
    this.buffSystem = buffSystem;
    this.storySystem = storySystem;

    this.units = [];
    this.selectedUnit = null;
    this.grabbedUnit = null;

    this.rallyS = 0.008;
    this.rallyPos = this.tower.getPointOnSpiral(this.rallyS, 0);
    this.rallyLateralVec = new THREE.Vector3(0, 0, 0);
    this.globalStance = 'RALLY';

    this.baseRelayRange = 14.0;
    this.activeLinks = [];
    this.circuitPulses = []; // Travelling rhythmic symbol pulses along the 3D & 2D circuit lines!
    this.chainEfficiency = 1.0;
    this.rosettaTimer = 0;

    this.foodSupply = 0;
    this.woodSupply = 0;
    this.stoneSupply = 0;
    this.totalCarryCount = 0;
    this.totalMaxCarry = 0;
    this.foodConsumeTimer = 0;
    this.foodConsumeInterval = 9.5;
    this.foodNetRate = -0.1;
    this.wellRescued = false;
    this.tumblingItems = [];

    this.buildRallyFlagMesh();
    this.buildChainLinePool();
  }

  recalculateCarriedSupplies() {
    const activeSquad = this.units.filter((u) => u.alive && u.faction === 'PLAYER' && !u.inWell);
    let food = 0;
    let wood = 0;
    let stone = 0;
    let maxCap = 0;
    const extraCap = this.buffSystem ? (this.buffSystem.modifiers.extraCarryCap || 0) : 0;

    activeSquad.forEach((u) => {
      maxCap += u.getMaxCarry(extraCap);
      u.carryStack.forEach((item) => {
        if (item.type === 'FOOD') food++;
        else if (item.type === 'WOOD') wood++;
        else if (item.type === 'STONE') stone++;
      });
    });

    this.foodSupply = food;
    this.woodSupply = wood;
    this.stoneSupply = stone;
    this.totalCarryCount = food + wood + stone;
    this.totalMaxCarry = maxCap;
  }

  consumePhysicalItem(type, refPos = null, maxDist = Infinity) {
    const activeSquad = this.units.filter((u) => u.alive && u.faction === 'PLAYER' && !u.inWell);
    const candidates = activeSquad
      .filter((u) => u.carryStack.some((it) => it.type === type) && (!refPos || u.pos.distanceTo(refPos) <= maxDist))
      .sort((a, b) => {
        if (!refPos) return b.carryStack.length - a.carryStack.length;
        return a.pos.distanceTo(refPos) - b.pos.distanceTo(refPos);
      });

    if (candidates.length === 0) return null;
    const carrier = candidates[0];
    carrier.popCarryItem(type);
    this.recalculateCarriedSupplies();
    return carrier;
  }

  distributePhysicalItemsToSquad(type, count) {
    const extraCap = this.buffSystem ? (this.buffSystem.modifiers.extraCarryCap || 0) : 0;
    let remaining = count;
    const activeSquad = this.units
      .filter((u) => u.alive && u.faction === 'PLAYER' && !u.inWell)
      .sort((a, b) => (b.getMaxCarry(extraCap) - b.carryStack.length) - (a.getMaxCarry(extraCap) - a.carryStack.length));

    for (const u of activeSquad) {
      while (remaining > 0 && u.carryStack.length < u.getMaxCarry(extraCap)) {
        u.pushCarryItem(type);
        remaining--;
      }
      if (remaining <= 0) break;
    }
    this.recalculateCarriedSupplies();
  }

  scatterUnitCarriedItems(unit, maxCount = 99) {
    let dropped = 0;
    while (unit.carryStack.length > 0 && dropped < maxCount) {
      const type = unit.popCarryItem();
      if (!type) break;
      dropped++;
      const dropOffset = new THREE.Vector3((Math.random() - 0.5) * 2.6, 0, (Math.random() - 0.5) * 2.6);
      const dropPos = unit.pos.clone().add(dropOffset);
      const mesh = window.CarryMeshFactory.createItemMesh(type);
      mesh.position.copy(dropPos).add(new THREE.Vector3(0, 0.25, 0));
      this.tower.group.add(mesh);

      const resType = type === 'FOOD' ? 'FOOD_RESOURCE' : (type === 'WOOD' ? 'WOOD_RESOURCE' : 'STONE_RESOURCE');
      const node = this.tower.findClosestNode(dropPos);
      this.tower.interactables.push({
        type: resType,
        id: `dropped_${Date.now()}_${Math.random()}`,
        nodeIndex: node ? node.index : 0,
        pos: dropPos,
        mesh,
        remainingCount: 1,
        triggered: false
      });
    }
    this.recalculateCarriedSupplies();
    return dropped;
  }

  jettisonOneItem(unitId) {
    const u = this.units.find((unit) => unit.id === unitId && unit.alive);
    if (!u || u.carryStack.length === 0) return false;
    this.scatterUnitCarriedItems(u, 1);
    window.SFX.playDrop();
    u.showSpeechBubble(`🎒 卸下 1 件物资轻装提速！(配速 ${Math.round(u.getCarrySpeedMultiplier() * 100)}%)`, '#70e1d7', 2.4);
    if (window.GameApp) {
      window.GameApp.markSquadStripDirty();
      window.GameApp.updateInspectorUI();
    }
    return true;
  }

  // Updates tumbling physics for items squeezed off when passing under low suspension ladders & arches
  updateTumblingPhysics(dt) {
    if (!this.tumblingItems || this.tumblingItems.length === 0) return;

    for (let i = this.tumblingItems.length - 1; i >= 0; i--) {
      const tb = this.tumblingItems[i];
      const it = tb.animItem;
      it.velY -= it.gravity * dt;
      it.pos.y += it.velY * dt;
      it.pos.x += it.velX * dt;
      it.pos.z += it.velZ * dt;
      it.mesh.position.copy(it.pos);
      it.mesh.rotation.x += dt * 10.0;
      it.mesh.rotation.z += dt * 7.5;

      if (it.pos.y <= it.groundY) {
        it.pos.y = it.groundY;
        if (it.bounces < 2) {
          it.bounces++;
          it.velY = -it.velY * 0.38;
          it.velX *= 0.5;
          it.velZ *= 0.5;
        } else {
          // Settled on ground as collectible interactable
          it.mesh.rotation.set(0, Math.random() * Math.PI, 0);
          it.mesh.position.y = it.groundY + 0.15;
          this.tower.interactables.push({
            type: tb.resType,
            id: `squeezed_${Date.now()}_${Math.random()}`,
            nodeIndex: tb.nodeIndex,
            pos: it.pos.clone(),
            mesh: it.mesh,
            remainingCount: 1,
            triggered: false
          });
          this.tumblingItems.splice(i, 1);
        }
      }
    }
  }

  // Squeezes off the top carried item with realistic physics trajectory & funny character response!
  squeezeOffTopItem(u, obstacleName = '悬梯', ceilingY = 0) {
    if (u.carryStack.length === 0) return;

    const droppedType = u.popCarryItem();
    if (!droppedType) return;

    // Pop off with realistic tumbling physics
    const topY = u.pos.y + 2.85 + u.carryStack.length * 0.38;
    const dropMesh = window.CarryMeshFactory.createItemMesh(droppedType);

    // Knock sideways and backward relative to walking direction
    const backwardAng = (u.facingAngle || 0) + Math.PI + (Math.random() - 0.5) * 1.2;
    const startPos = new THREE.Vector3(
      u.pos.x + Math.sin(backwardAng) * 0.3,
      Math.max(u.pos.y + 1.2, topY),
      u.pos.z + Math.cos(backwardAng) * 0.3
    );
    dropMesh.position.copy(startPos);
    this.tower.group.add(dropMesh);

    const groundY = u.pos.y + 0.15;
    const resType = droppedType === 'FOOD' ? 'FOOD_RESOURCE' : (droppedType === 'WOOD' ? 'WOOD_RESOURCE' : 'STONE_RESOURCE');
    const node = this.tower.findClosestNode(u.pos);

    if (!this.tumblingItems) this.tumblingItems = [];
    this.tumblingItems.push({
      animItem: {
        mesh: dropMesh,
        pos: startPos.clone(),
        velY: 1.8,
        velX: Math.sin(backwardAng) * (1.5 + Math.random() * 1.5),
        velZ: Math.cos(backwardAng) * (1.5 + Math.random() * 1.5),
        gravity: 22.0,
        groundY,
        bounces: 0
      },
      resType,
      nodeIndex: node ? node.index : 0
    });

    // Audio clatter
    window.SFX.playDrop();

    // Humorous speech bubble reaction
    const reactions = [
      `哎呀！${obstacleName}太低，头顶货物被挤掉了！`,
      `⚠️ 货物碰顶散落！(限高挤落)`,
      `悬梯太矮了！石块被磕掉了！`
    ];
    const bubbleText = reactions[Math.floor(Math.random() * reactions.length)];
    u.showSpeechBubble(bubbleText, '#ff6b6b', 2.0);

    this.recalculateCarriedSupplies();
    if (window.GameApp) {
      window.GameApp.markSquadStripDirty();
      window.GameApp.updateInspectorUI();
    }
  }

  // Checks overhead clearance against suspension ladders, low arches, and interior ceilings
  checkOverheadClearance(u, dt, elapsed) {
    if (!u.alive || u.carryStack.length === 0 || u.inFreefall || u.isHangingLedge) return;

    u.squeezeCooldown = (u.squeezeCooldown || 0) - dt;

    const stackCount = u.carryStack.length;
    const unitHeadY = u.pos.y + 2.85;
    const stackTopY = unitHeadY + stackCount * 0.38;

    let minClearanceY = Infinity;
    let hitObstacleName = null;

    // 1. Check tagged overhead obstacles (suspension ladders, low archways, beams)
    if (this.tower && this.tower.overheadObstacles) {
      for (let obs of this.tower.overheadObstacles) {
        const dHoriz = Math.hypot(u.pos.x - obs.pos.x, u.pos.z - obs.pos.z);
        const dS = Math.abs(u.s - obs.s);
        if (dHoriz < obs.radius || (obs.s !== undefined && dS < 0.008)) {
          const obsClearanceY = obs.pos.y + obs.clearanceHeight;
          if (obsClearanceY < minClearanceY) {
            minClearanceY = obsClearanceY;
            hitObstacleName = obs.name || '悬梯';
          }
        }
      }
    }

    // 2. Dynamic 3D interior decks & cross bridge ceilings
    if (this.tower && this.tower.interiorDecks) {
      for (let dk of this.tower.interiorDecks) {
        if (dk.y > u.pos.y + 1.2 && dk.y < u.pos.y + 14.0) {
          const rFromCenter = Math.hypot(u.pos.x, u.pos.z);
          if (rFromCenter >= dk.rHole && rFromCenter <= dk.rOuter + 1.2) {
            const deckUndersideY = dk.y - 0.35;
            if (deckUndersideY < minClearanceY) {
              minClearanceY = deckUndersideY;
              hitObstacleName = '中庭拱廊顶板';
            }
          }
        }
      }
    }

    // 3. Low Village Workshop Doorway lintel
    if (Math.hypot(u.pos.x - 136.0, u.pos.z - 78.0) < 5.0) {
      const doorLintelY = 3.2; // 3.2m doorway
      if (doorLintelY < minClearanceY) {
        minClearanceY = doorLintelY;
        hitObstacleName = '工坊木门楣';
      }
    }

    // If stack height exceeds overhead clearance, squeeze off the top item!
    if (stackTopY > minClearanceY && u.squeezeCooldown <= 0) {
      u.squeezeCooldown = 0.16; // Rapid tumbling stagger
      this.squeezeOffTopItem(u, hitObstacleName, minClearanceY);
    }
  }

  buildRallyFlagMesh() {
    this.flagGroup = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xf5cd79, metalness: 0.6, roughness: 0.3 })
    );
    pole.position.y = 1.6;
    this.flagGroup.add(pole);

    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.75, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x38ada9 })
    );
    cloth.position.set(0.65, 2.65, 0);
    this.flagCloth = cloth;
    this.flagGroup.add(cloth);

    const baseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.3, 24),
      new THREE.MeshBasicMaterial({ color: 0x70e1d7, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = 0.08;
    this.flagRing = baseRing;
    this.flagGroup.add(baseRing);

    this.flagGroup.position.copy(this.rallyPos);
    const parentGroup = this.tower.entitiesGroup || this.tower.group;
    parentGroup.add(this.flagGroup);
  }

  buildChainLinePool() {
    const parentGroup = this.tower.entitiesGroup || this.tower.group;
    this.chainLineGroup = new THREE.Group();
    parentGroup.add(this.chainLineGroup);
    this.pulseSpriteGroup = new THREE.Group();
    parentGroup.add(this.pulseSpriteGroup);
  }

  spawnInitialSquad() {
    this.units.forEach((u) => u.destroy());
    this.units = [];
    this.activeLinks = [];
    this.circuitPulses = [];
    this.wellRescued = false;
    this.foodConsumeTimer = 0;
    this.rallyLateralVec.set(0, 0, 0);

    // 1. Initial Trio at the Village Water Well
    const protagonist = new BabelUnit(0, this.tower, this.scene, {
      name: '主角·艾什',
      langs: ['A', 'B'],
      skillId: 'MEDIATOR',
      s: 0.006,
      radialOffset: -1.1,
      initialCarry: ['FOOD'],
      quote: '“☼ Kael-Ur ↔ ♒ Lo-Vindr! 语言分化成了符号，我是双语电路中枢——快左键点击井底的巴尼把他捞上来！”'
    });

    const partnerA = new BabelUnit(1, this.tower, this.scene, {
      name: '大力士·阿卡德',
      langs: ['A'],
      skillId: 'STRONGMAN',
      s: 0.010,
      radialOffset: 1.1,
      initialCarry: ['FOOD', 'FOOD', 'WOOD', 'STONE'],
      quote: '“☼ Agurru-Bāb! [我头顶叠背 4 件物资，能推动配重木箱并供建筑工取用木石！]”'
    });

    const partnerBInWell = new BabelUnit(2, this.tower, this.scene, {
      name: '建筑工·巴尼',
      langs: ['B'],
      skillId: 'MASON',
      s: 0.008,
      radialOffset: 0.0,
      inWell: true,
      initialCarry: [],
      quote: '“♒ Kratī-Na! [掉进井里了！快点我捞出，前方河谷断桥需要我取用大力士背上的原木修筑！]”'
    });

    this.units.push(protagonist, partnerA, partnerBInWell);

    // 2. 11 Recruitable Specialists along the 5-Minute Expedition
    const recruitDefs = [
      {
        name: '麦田农夫·恩基',
        langs: ['A'],
        skillId: 'FORAGER',
        s: 0.048,
        initialCarry: ['FOOD', 'FOOD'],
        quote: '“☼ Šamšu-Qāt! [我头顶能叠背 4 袋口粮且步履轻快，还能采集双倍粮袋！]”'
      },
      {
        name: '村落石匠·乌尔',
        langs: ['A'],
        skillId: 'MASON',
        s: 0.082,
        initialCarry: ['WOOD'],
        quote: '“☼ Ziggur-Na! [我是日耀语建筑工，让我和大力士同行即可高速修桥！]”'
      },
      {
        name: '河谷力士·赫拉克',
        langs: ['B'],
        skillId: 'STRONGMAN',
        s: 0.125,
        initialCarry: ['WOOD', 'STONE', 'FOOD'],
        quote: '“♒ Logos-Vindr! [城门检定要求总配重 ≥ 6，带我入队并推上配重木箱即可破关！]”'
      },
      {
        name: '城门双语祭司·伊姆霍',
        langs: ['B', 'C'],
        skillId: 'MEDIATOR',
        s: 0.172,
        initialCarry: ['FOOD'],
        quote: '“♒ Lo-Vindr ↔ ▲ Ma’at-Ka! [我通晓涡流与圣山双语！一层水道桥限重 ≤ 6人，带我可一人顶两语！]”'
      },
      {
        name: '市集青铜盾卫·吉尔伽',
        langs: ['C'],
        skillId: 'SHIELDBEARER',
        s: 0.215,
        initialCarry: ['STONE'],
        quote: '“▲ Djed-Ka! [塔上3D滚石会把没护盾的同伴直接撞飞掉下塔！让我举盾走在前面！]”'
      },
      {
        name: '石厅采粮官·娜芙蒂',
        langs: ['C'],
        skillId: 'FORAGER',
        s: 0.285,
        initialCarry: ['FOOD', 'FOOD', 'FOOD'],
        quote: '“▲ Ankh-Ma’at! [若一层水道窄桥超载(>6人)，记得在顶部点 [×] 让多余单语者脱队！]”'
      },
      {
        name: '石厅内殿筑匠·古迪亚',
        langs: ['C'],
        skillId: 'MASON',
        s: 0.365,
        initialCarry: ['STONE'],
        quote: '“▲ Bennu-Ra! [二层工坊机械门要求建筑工在场且背负 ≥2 件木石！]”'
      },
      {
        name: '柱廊双语学者·居鲁士',
        langs: ['C', 'D'],
        skillId: 'SCHOLAR',
        s: 0.455,
        initialCarry: ['FOOD'],
        quote: '“▲ Ma’at ↔ ◎ Asha-Zar! [三层圣书体回廊需启动 3 处传语译码碑(0/3)，我是破译师！]”'
      },
      {
        name: '内庭轻盈孩童·诺亚',
        langs: ['D'],
        skillId: 'ACROBAT',
        s: 0.565,
        isChild: true,
        initialCarry: [],
        quote: '“◎ Vohu-Manah! [四层破碎圣庭要求全队总负重 ≤ 4 件且由我探路！千万别让我背重物！]”'
      },
      {
        name: '云端卢恩力士·斯考德',
        langs: ['D', 'E'],
        skillId: 'STRONGMAN',
        s: 0.695,
        initialCarry: ['FOOD', 'WOOD'],
        quote: '“◎ Asha ↔ 𓂀 Skald-Run! [我通晓苍穹卢恩语 𓂀，还能帮大家扛住云端狂风！]”'
      },
      {
        name: '天穹观测者·伊诺克',
        langs: ['E', 'F'],
        skillId: 'MEDIATOR',
        s: 0.815,
        initialCarry: ['FOOD'],
        quote: '“𓂀 Skald ↔ ❖ Lia-Sae! [唯有连通原初同位语 ❖ 并激活三处云端译码碑，才能抵达上帝之手！]”'
      }
    ];

    recruitDefs.forEach((rd, idx) => {
      const u = new BabelUnit(3 + idx, this.tower, this.scene, {
        ...rd,
        faction: 'STRANDED'
      });
      this.units.push(u);
    });

    // 3. Mono-Language Nationalist Faction Poachers
    const nationalistDefs = [
      {
        name: '纯日耀语族长·萨尔贡',
        langs: ['A'],
        nationalistLang: 'A',
        skillId: 'MEDIATOR',
        s: 0.41,
        radialOffset: -1.6,
        quote: '“☼ Kael-Ur! 只懂【☼】符号的同胞啊，离开那个杂语小队，加入我们纯粹的日耀同盟吧！”'
      },
      {
        name: '纯圣山语祭司·梅尼斯',
        langs: ['C'],
        nationalistLang: 'C',
        skillId: 'MEDIATOR',
        s: 0.59,
        radialOffset: 1.6,
        quote: '“▲ Ma’at-Ka! 唯有纯粹的【▲】圣山符号才能带来秩序！背着物资的圣山工匠，过来这边！”'
      },
      {
        name: '纯同心语祭司·扎拉斯',
        langs: ['D'],
        nationalistLang: 'D',
        skillId: 'MEDIATOR',
        s: 0.77,
        radialOffset: -1.5,
        quote: '“◎ Asha-Zar! 只懂【◎】符号的同胞们，别再替异族人修桥踩机关了！”'
      }
    ];

    nationalistDefs.forEach((nd, idx) => {
      const u = new BabelUnit(20 + idx, this.tower, this.scene, {
        ...nd,
        faction: 'NATIONALIST_LEADER'
      });
      this.units.push(u);
    });

    this.selectedUnit = protagonist;
    this.rallyS = 0.008;
    this.rallyPos = this.tower.getPointOnSpiral(this.rallyS, 0);
    this.flagGroup.position.copy(this.rallyPos);

    this.recalculateCarriedSupplies();
    this.propagateLanguageChain(false);
    if (window.GameApp) window.GameApp.markSquadStripDirty();
  }

  dismissUnit(unitId) {
    const u = this.units.find((unit) => unit.id === unitId && unit.alive);
    if (!u || u.id === 0 || u.faction !== 'PLAYER') return false;

    const extraCap = this.buffSystem ? (this.buffSystem.modifiers.extraCarryCap || 0) : 0;
    const otherSquad = this.units.filter((o) => o.alive && o.faction === 'PLAYER' && o.id !== u.id && !o.inWell);
    while (u.carryStack.length > 0) {
      const receiver = otherSquad.find((o) => o.carryStack.length < o.getMaxCarry(extraCap));
      if (!receiver) break;
      const itemType = u.popCarryItem();
      if (itemType) receiver.pushCarryItem(itemType);
    }

    u.faction = 'STRANDED';
    u.aiState = 'STRANDED';
    u.justDismissedCooldown = 4.5;
    u.ringMesh.material.color.setHex(0x4cd137);
    u.showSpeechBubble('⛺ 已交接物资并原地休整（左键点我可随时归队）', '#f3a653', 3.5, false);
    window.SFX.playDrop();

    if (this.selectedUnit === u) {
      this.selectedUnit = this.units[0];
    }
    this.recalculateCarriedSupplies();
    this.propagateLanguageChain(true);
    if (window.GameApp) {
      window.GameApp.markSquadStripDirty();
      window.GameApp.updateInspectorUI();
    }
    return true;
  }

  rescueFromWell() {
    const wellUnit = this.units.find((u) => u.alive && u.inWell);
    if (!wellUnit) return false;

    wellUnit.inWell = false;
    wellUnit.launchThrowArc(0.016, '🤝 ☼↔♒ 被艾什与阿卡德联手从井里捞出！');
    this.wellRescued = true;
    window.SFX.playMiracle();

    if (this.storySystem) {
      this.storySystem.showBanner(
        '✨ 【水井救援成功 · 符号造语电路已激活】',
        '建筑工巴尼 [♒] 获救！看顶部固定队员栏：艾什 [☼+♒] 将指令化作有节奏的符号脉冲传给阿卡德 [☼] 与巴尼 [♒]。鼠标点击前方古道启程！',
        8500,
        'gold'
      );
    }
    this.recalculateCarriedSupplies();
    this.propagateLanguageChain(true);
    if (window.GameApp) window.GameApp.markSquadStripDirty();
    return true;
  }

  // Real 3D Tower Block Impact Physics:
  // Shieldbearers physically ricochet falling masonry blocks; unprotected units receive real 3D momentum transfer!
  onRockImpact(rockPos, rockObj = null) {
    const playerUnits = this.units.filter((u) => u.alive && u.faction === 'PLAYER' && !u.inWell && !u.inFreefall);
    const nearbyShield = playerUnits.find(
      (u) => u.skill.blocksRocks && u.pos.distanceTo(rockPos) < 5.2
    );

    if (nearbyShield) {
      if (rockObj && !rockObj.deflectedByShield) {
        rockObj.deflectedByShield = true;
        // Physically ricochet the detached tower block off the bronze shield!
        const defDir = new THREE.Vector3().subVectors(rockPos, nearbyShield.pos).normalize();
        if (defDir.lengthSq() < 0.01) defDir.set(1, 0, 0);
        rockObj.vel.set(defDir.x * 9.5, 5.5, defDir.z * 9.5);
        this.tower.spawnBuildSparks(rockPos);
        window.SFX.playBuildHammer();
        nearbyShield.showSpeechBubble('🛡️ ▲ Djed-Ka! [青铜盾弹开坍塌塔石!]', '#7bed9f', 1.6);
      }
      return;
    }

    playerUnits.forEach((u) => {
      if (rockObj && rockObj.hitUnitIds && rockObj.hitUnitIds.has(u.id)) return;
      const dist = u.pos.distanceTo(rockPos);
      if (dist < 2.4 && !u.throwArc) {
        if (rockObj && rockObj.hitUnitIds) rockObj.hitUnitIds.add(u.id);

        // Real 3D Momentum Transfer: combine contact normal (u.pos - rockPos) with the stone block's 3D velocity vector!
        const contactNormal = new THREE.Vector3().subVectors(u.pos, rockPos);
        contactNormal.y = 0;
        if (contactNormal.lengthSq() < 0.01) contactNormal.set(u.pos.x, 0, u.pos.z);
        contactNormal.normalize();

        const rockVel = (rockObj && rockObj.vel) ? rockObj.vel.clone() : new THREE.Vector3(0, -10, 0);
        const horizRockSpeed = Math.max(4.5, Math.hypot(rockVel.x, rockVel.z));
        const impactDir = contactNormal.multiplyScalar(0.65).add(
          new THREE.Vector3(rockVel.x, 0, rockVel.z).normalize().multiplyScalar(0.35)
        ).normalize();

        // Ensure knockback has an outward component so hitting the edge of the ramp can knock them off the tier
        const radialOut = new THREE.Vector3(u.pos.x, 0, u.pos.z).normalize();
        impactDir.addScaledVector(radialOut, 0.45).normalize();

        const impulse = new THREE.Vector3(
          impactDir.x * (horizRockSpeed * 0.85 + 3.8),
          5.8 + Math.min(3.0, Math.abs(rockVel.y) * 0.25),
          impactDir.z * (horizRockSpeed * 0.85 + 3.8)
        );

        // Conservation of momentum: the stone block slows & deflects slightly upon striking the unit!
        if (rockObj && rockObj.vel) {
          rockObj.vel.x -= impactDir.x * 2.5;
          rockObj.vel.z -= impactDir.z * 2.5;
          rockObj.vel.y = Math.max(2.0, rockObj.vel.y * 0.6);
        }

        u.triggerPhysicsKnockOff(impulse, '🪨 啊！被坍塌塔石撞飞！');

        if (this.storySystem) {
          this.storySystem.showBanner(
            `💥 【塔石坍塌撞击 · ${u.name} 坠落！】`,
            `巴别塔上层砖石脱落，物理冲量将 ${u.name} 撞飞！物资散落原地，人正往下一层平台坠落——快用鼠标左键抓救或按 [R 升降吊台]！`,
            6500,
            'warn'
          );
        }
      }
    });
  }

  triggerOpenSourceCoop() {
    this.units.forEach((u) => {
      if (!u.alive) return;
      if (u.faction === 'DEFECTED' || u.faction === 'NATIONALIST_LEADER') {
        u.faction = 'PLAYER';
        u.poachMeter = 0;
        u.ringMesh.material.color.setHex(0x38ada9);
        u.showSpeechBubble('📡 ❖ Lia-Sae! [万语共鸣，放下狭隘民族偏见!]', '#70e1d7', 3.8);
      }
    });
    this.recalculateCarriedSupplies();
    this.propagateLanguageChain(true);
    if (window.GameApp) window.GameApp.markSquadStripDirty();
  }

  getEffectiveRelayRange() {
    return this.baseRelayRange * (this.buffSystem ? this.buffSystem.modifiers.relayRangeMult : 1.0);
  }

  propagateLanguageChain(playAudioAndBubbles = true) {
    const squadUnits = this.units.filter((u) => u.alive && u.faction === 'PLAYER' && !u.inFreefall && !u.inWell);
    if (squadUnits.length === 0) return;

    const relayRange = this.getEffectiveRelayRange();
    const universalActive = this.rosettaTimer > 0 || (this.buffSystem && this.buffSystem.modifiers.universalTongue);

    squadUnits.forEach((u) => {
      u.commandUnderstood = false;
      u.lastChainHop = -1;
      u.sharedLangWithParent = u.langs[0];
      u.parentChainUnitId = null;
    });

    const queue = [];
    const newLinks = [];

    squadUnits.forEach((u) => {
      const distToFlag = u.pos.distanceTo(this.rallyPos);
      if (universalActive || u.id === 0 || (u.langs.length > 1 && distToFlag <= relayRange * 1.6)) {
        u.commandUnderstood = true;
        u.lastChainHop = 0;
        queue.push(u);
        newLinks.push({
          fromUnitId: -1,
          toUnitId: u.id,
          fromPos: this.rallyPos.clone().add(new THREE.Vector3(0, 2.2, 0)),
          toPos: u.pos.clone().add(new THREE.Vector3(0, 1.5, 0)),
          lang: u.langs[0],
          hop: 0
        });
      }
    });

    while (queue.length > 0) {
      const sender = queue.shift();
      if (sender.isHangingLedge || sender.stunTimer > 0) continue;
      const senderRange = relayRange + (sender.skill.relayBonus || 0);

      squadUnits.forEach((receiver) => {
        if (receiver.commandUnderstood) return;
        const dist = sender.pos.distanceTo(receiver.pos);
        if (dist <= senderRange) {
          const sharedLang = sender.langs.find((l) => receiver.langs.includes(l));
          if (sharedLang) {
            receiver.commandUnderstood = true;
            receiver.lastChainHop = sender.lastChainHop + 1;
            receiver.sharedLangWithParent = sharedLang;
            receiver.parentChainUnitId = sender.id;
            queue.push(receiver);

            newLinks.push({
              fromUnitId: sender.id,
              toUnitId: receiver.id,
              fromPos: sender.pos.clone().add(new THREE.Vector3(0, 1.5, 0)),
              toPos: receiver.pos.clone().add(new THREE.Vector3(0, 1.5, 0)),
              lang: sharedLang,
              hop: receiver.lastChainHop
            });
          }
        }
      });
    }

    this.rebuild3DChainBeams(newLinks);
    this.activeLinks = newLinks;

    const understoodCount = squadUnits.filter((u) => u.commandUnderstood).length;
    this.chainEfficiency = squadUnits.length > 0 ? understoodCount / squadUnits.length : 0;

    if (playAudioAndBubbles) {
      // Spawn a burst of rhythmic circuit pulses!
      this.spawnCircuitPulseWave();

      let threeDBubbleCount = 0;
      squadUnits.forEach((u) => {
        if (u.isHangingLedge || u.inFreefall) return;
        if (u.commandUnderstood) {
          const isKeyRelay = u.id === 0 || u.langs.length > 1;
          const show3D = isKeyRelay && threeDBubbleCount < 2;
          if (show3D) threeDBubbleCount++;

          const delay = Math.max(0, u.lastChainHop) * 110;
          setTimeout(() => {
            if (!u.alive || u.isHangingLedge || u.inFreefall) return;
            const primaryL = u.sharedLangWithParent || u.langs[0];
            const cfg = LANG_CONFIG[primaryL] || LANG_CONFIG.A;
            const word = cfg.speechSample[u.id % cfg.speechSample.length];
            const prefix = u.langs.length > 1 ? `转译[${u.langs.map((l) => LANG_CONFIG[l].symbol).join('↔')}]: ` : '';
            if (show3D) {
              u.showSpeechBubble(`${prefix}${word}`, cfg.color, 1.35, true);
            } else if (u.lastChainHop <= 2) {
              // Only pop on the top HUD without cluttering 3D space!
              u.hudPopupText = `${cfg.symbol} ${word}`.slice(0, 18);
              u.hudPopupColor = cfg.color;
              u.hudPopupTimer = 1.4;
              if (window.GameApp) window.GameApp.updateHudChatPopups();
            }
            if (u.lastChainHop > 0 && u.lastChainHop <= 2) {
              window.SFX.playLanguageHop(primaryL, u.lastChainHop);
            }
          }, delay);
        } else if (threeDBubbleCount < 2) {
          threeDBubbleCount++;
          // Disconnected units speak untranslated Conlang + Glyph briefly!
          const rawL = u.langs[0];
          const cfg = LANG_CONFIG[rawL] || LANG_CONFIG.A;
          const rawConlang = cfg.conlangSample[u.id % cfg.conlangSample.length];
          u.showSpeechBubble(`⚡ ¿${rawConlang}? [断链]`, '#ff5252', 1.6, true);
        }
      });
    }
  }

  // Spawns rhythmic traveling symbol pulses along every active language link (both in 2D HUD and 3D beams!)
  spawnCircuitPulseWave() {
    this.activeLinks.forEach((lnk, idx) => {
      const cfg = window.LANG_CONFIG[lnk.lang] || window.LANG_CONFIG.A;
      this.circuitPulses.push({
        linkIndex: idx,
        fromUnitId: lnk.fromUnitId,
        toUnitId: lnk.toUnitId,
        fromPos: lnk.fromPos.clone(),
        toPos: lnk.toPos.clone(),
        symbol: cfg.symbol,
        color: cfg.ringColor,
        t: -lnk.hop * 0.22, // Staggered by hop index for a rhythmic cascading circuit wave!
        speed: 1.65
      });
    });
  }

  rebuild3DChainBeams(links) {
    while (this.chainLineGroup.children.length > 0) {
      const c = this.chainLineGroup.children[0];
      c.geometry.dispose();
      c.material.dispose();
      this.chainLineGroup.remove(c);
    }

    links.forEach((lnk) => {
      const cfg = LANG_CONFIG[lnk.lang] || LANG_CONFIG.A;
      const colorHex = new THREE.Color(cfg.color).getHex();
      // Circuit-board style stepped 3D trace!
      const mid1 = lnk.fromPos.clone().lerp(lnk.toPos, 0.35);
      mid1.y += 0.65;
      const mid2 = lnk.fromPos.clone().lerp(lnk.toPos, 0.65);
      mid2.y += 0.65;
      const points = [lnk.fromPos, mid1, mid2, lnk.toPos];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });
      const line = new THREE.Line(geo, mat);
      this.chainLineGroup.add(line);
    });
  }

  issueRallyCommand(targetPoint, stanceOverride = null) {
    if (stanceOverride) this.globalStance = stanceOverride;
    const closestNode = this.tower.findClosestNode(targetPoint);
    this.rallyS = closestNode.s;

    const lateralVec = new THREE.Vector3().subVectors(targetPoint, closestNode.pos);
    lateralVec.y = 0;
    if (lateralVec.length() > 14.0) {
      lateralVec.normalize().multiplyScalar(14.0);
    }
    this.rallyLateralVec.copy(lateralVec);
    this.rallyPos.copy(closestNode.pos).add(this.rallyLateralVec);
    this.flagGroup.position.copy(this.rallyPos);

    window.SFX.playRallyCommand();
    this.propagateLanguageChain(true);
  }

  setGlobalStance(stance) {
    this.globalStance = stance;
    const stanceColors = {
      RALLY: 0x38ada9,
      PUSH_JUMP: 0xf39c12,
      HANDSHAKE: 0xe55039,
      ATTRACT: 0x8e44ad
    };
    if (this.flagCloth) {
      this.flagCloth.material.color.setHex(stanceColors[stance] || 0x38ada9);
    }
    this.propagateLanguageChain(true);

    if (stance === 'PUSH_JUMP') {
      const alive = this.units.filter((u) => u.alive && u.faction === 'PLAYER' && u.commandUnderstood && !u.isHangingLedge && !u.inFreefall && !u.inWell);
      alive.forEach((u, i) => {
        if (i % 2 === 0 || u.isChild) {
          u.launchThrowArc(Math.min(0.99, u.s + (u.isChild ? 0.025 : 0.018)), '⚡ 推力助跳跨障!');
        }
      });
    } else if (stance === 'ATTRACT') {
      this.rallyLateralVec.set(0, 0, 0);
      this.units.forEach((u) => {
        if (!u.alive) return;
        if (u.isHangingLedge) {
          u.isHangingLedge = false;
          u.radialOffset = 0;
          u.showSpeechBubble('🛡️ 被拉回安全石阶!', '#70e1d7', 2.2);
        } else if (u.faction === 'DEFECTED') {
          u.faction = 'PLAYER';
          u.poachMeter = 0;
          u.ringMesh.material.color.setHex(0x38ada9);
          u.showSpeechBubble('🤝 带着背负物资重新回到多语小队！', '#70e1d7', 2.5);
          if (window.GameApp) window.GameApp.markSquadStripDirty();
        }
      });
      this.recalculateCarriedSupplies();
    }
  }

  performHandshakeThrow() {
    if (!this.wellRescued && this.rescueFromWell()) {
      return;
    }

    const alive = this.units.filter((u) => u.alive && u.faction === 'PLAYER' && !u.inFreefall && !u.inWell).sort((a, b) => b.s - a.s);
    if (alive.length === 0) return;

    const hanging = alive.filter((u) => u.isHangingLedge);
    if (hanging.length > 0) {
      hanging.forEach((u) => {
        u.isHangingLedge = false;
        u.radialOffset = 0;
        u.launchThrowArc(Math.min(0.99, u.s + 0.014), '🤝 大力士一把捞起!');
      });
      window.SFX.playPickUp();
      return;
    }

    const targets = alive.slice(0, 2);
    targets.forEach((u, i) => {
      const jumpDelta = u.isChild ? 0.032 : 0.022;
      u.launchThrowArc(Math.min(0.992, u.s + jumpDelta - i * 0.004), '🤝 握握手抛掷飞跃!');
    });
    this.rallyS = Math.min(0.992, targets[0].s + 0.022);
    this.rallyLateralVec.set(0, 0, 0);
    this.rallyPos.copy(this.tower.getPointOnSpiral(this.rallyS, 0));
    this.flagGroup.position.copy(this.rallyPos);
    window.SFX.playPickUp();
  }

  update(dt, elapsed, destructionHeight, windStrength, towerTilt = 0) {
    this.updateTumblingPhysics(dt);

    if (this.rosettaTimer > 0) {
      this.rosettaTimer = Math.max(0, this.rosettaTimer - dt);
    }

    // Periodically emit rhythmic circuit pulses every 1.4 seconds so the circuit HUD & 3D links feel alive!
    this.pulseBeatAccum = (this.pulseBeatAccum || 0) + dt;
    if (this.pulseBeatAccum >= 1.4) {
      this.pulseBeatAccum = 0;
      this.spawnCircuitPulseWave();
    }

    for (let i = this.circuitPulses.length - 1; i >= 0; i--) {
      this.circuitPulses[i].t += dt * this.circuitPulses[i].speed;
      if (this.circuitPulses[i].t > 1.15) {
        this.circuitPulses.splice(i, 1);
      }
    }

    const aliveUnits = this.units.filter((u) => u.alive);
    const activeSquad = aliveUnits.filter((u) => u.faction === 'PLAYER' && !u.inWell);

    // Physical Food Consumption from Vertical Stacks
    this.recalculateCarriedSupplies();
    const foragerCount = activeSquad.filter((u) => u.skill.id === 'FORAGER').length;
    const foodSaveMult = Math.max(0.45, Math.pow(0.78, foragerCount)) * (this.buffSystem && this.buffSystem.modifiers.foodConsumeMult ? this.buffSystem.modifiers.foodConsumeMult : 1.0);
    const eatSpeed = Math.max(0.25, activeSquad.length * 0.16) * foodSaveMult;
    this.foodConsumeInterval = Math.max(3.5, 11.5 / eatSpeed);
    this.foodNetRate = -(1.0 / this.foodConsumeInterval);

    if (this.wellRescued && activeSquad.length > 0) {
      this.foodConsumeTimer += dt;
      if (this.foodConsumeTimer >= this.foodConsumeInterval) {
        this.foodConsumeTimer = 0;
        const carrier = this.consumePhysicalItem('FOOD');
        if (carrier) {
          carrier.showSpeechBubble(`🍞 消耗 ${carrier.name.split('·')[1] || carrier.name} 背上 1 袋口粮！`, '#f1c40f', 1.8, false);
        }
      }
    }

    const isStarving = this.foodSupply <= 0;
    const hungerSpeedPenalty = isStarving ? 0.72 : 1.0;

    this.chainRefreshAccum = (this.chainRefreshAccum || 0) + dt;
    if (this.chainRefreshAccum > 0.3) {
      this.chainRefreshAccum = 0;
      this.propagateLanguageChain(false);
    }

    const speedBuff = (this.buffSystem ? this.buffSystem.modifiers.moveSpeedMult : 1.0) * hungerSpeedPenalty;
    const buildBuff = (this.buffSystem ? this.buffSystem.modifiers.buildSpeedMult : 1.0) * hungerSpeedPenalty;
    const windBuff = this.buffSystem ? this.buffSystem.modifiers.windResistMult : 1.0;
    const extraCap = this.buffSystem ? (this.buffSystem.modifiers.extraCarryCap || 0) : 0;

    // Spawn 3D Falling & Rolling Boulders (when squad is inside the tower above y = 16m)
    this.rockTimer = (this.rockTimer || 0) + dt;
    if (this.rockTimer > 6.4) {
      this.rockTimer = 0;
      const leadPlayer = [...activeSquad].sort((a, b) => b.s - a.s)[0];
      if (leadPlayer && leadPlayer.pos.y > 16) {
        const aheadIdx = Math.min(this.tower.pathSegments - 5, Math.floor((leadPlayer.s + 0.015) * this.tower.pathSegments));
        this.tower.spawnFallingRock(this.tower.nodes[aheadIdx]);
      }
    }

    // 1. Update Cracked / Fragile Slabs (Real 3D Collapse & Freefall!)
    this.tower.nodes.forEach((node) => {
      if (!node.isFragile || node.collapsed) return;
      let loadWeight = 0;
      activeSquad.forEach((u) => {
        if (!u.throwArc && !u.inFreefall && Math.abs(u.s - node.s) < 0.0045) {
          const isTrulyLight = u.isChild && u.carryStack.length === 0;
          if (!isTrulyLight) {
            loadWeight += 1.0 + u.carryStack.length * 0.45;
          }
        }
      });

      if (loadWeight > 0) {
        node.fragileLoadTime += dt * (loadWeight * 0.85);
        if (node.segMesh) {
          node.segMesh.position.x += Math.sin(elapsed * 45) * 0.04;
        }
        if (node.fragileLoadTime >= 2.2) {
          node.collapsed = true;
          node.isGap = true;
          node.gapRepaired = false;
          if (node.segMesh) {
            node.segMesh.material = new THREE.MeshStandardMaterial({
              color: 0xff6b6b,
              transparent: true,
              opacity: 0.22,
              wireframe: true
            });
          }
          window.SFX.playThunder();
          activeSquad.forEach((u) => {
            const isTrulyLight = u.isChild && u.carryStack.length === 0;
            if (!isTrulyLight && Math.abs(u.s - node.s) < 0.006) {
              const outDir = new THREE.Vector3(u.pos.x, 0, u.pos.z).normalize();
              u.triggerPhysicsKnockOff(new THREE.Vector3(outDir.x * 3.2, 2.5, outDir.z * 3.2), '💥 负重压塌脆裂红陶板坠落！');
            }
          });
        }
      }
    });

    // 2. Update Tricky Squad-Composition Gates, Pushable Crates (📦), 3 Rune Steles (0/3) & Brown Pressure Plates!
    this.tower.languageGates.forEach((gate) => {
      if (gate.unlocked) return;

      // A) Pushable Counterweight Crate (📦 可推动配重木箱)
      if (gate.crateMesh && !gate.crateOnPlate) {
        const pusher = activeSquad.find(
          (u) => !u.inFreefall && !u.isHangingLedge && u.pos.distanceTo(gate.crateWorldPos) < 3.6
        );
        if (pusher) {
          const pushSpeed = (pusher.skill.id === 'STRONGMAN' ? 4.5 : 2.2) * dt;
          gate.crateWorldPos.lerp(gate.plateWorldPos, Math.min(1, pushSpeed));
          gate.crateMesh.position.copy(gate.crateWorldPos).sub(gate.pos);
          gate.crateMesh.position.y = 0.8;
          if (gate.crateWorldPos.distanceTo(gate.plateWorldPos) < 1.2) {
            gate.crateOnPlate = true;
            gate.platePressed = true;
            if (gate.brownPlateMesh) {
              gate.brownPlateMesh.position.y = 0.04;
              gate.brownPlateMesh.material.color.setHex(0x4cd137);
            }
            window.SFX.playPlateClick();
            pusher.showSpeechBubble('📦 配重木箱已推上棕红重力踏板！(+3配重)', '#7bed9f', 2.6);
          }
        }
      }

      // B) 3 Rune Decoder Steles (三处传语译码碑 0/3)
      if (gate.steles && gate.steles.length > 0) {
        gate.steles.forEach((st) => {
          if (st.activated) return;
          const activator = activeSquad.find(
            (u) => !u.inFreefall && !u.isHangingLedge && u.pos.distanceTo(st.pos) < 4.2 &&
              (u.commandUnderstood || this.rosettaTimer > 0) &&
              (u.langs.includes(st.reqLang) || u.skill.id === 'SCHOLAR' || this.rosettaTimer > 0)
          );
          if (activator) {
            st.activated = true;
            st.orbMesh.material.color.setHex(0x2ecc71);
            st.orbMesh.material.emissive.setHex(0x27ae60);
            st.labelSprite.visible = false;
            window.SFX.playMiracle();
            const doneCount = gate.steles.filter((s) => s.activated).length;
            activator.showSpeechBubble(`✨ 激活传语译码碑 (${doneCount}/${gate.steles.length})!`, '#7bed9f', 2.6);
            if (this.storySystem) {
              this.storySystem.showBanner(
                `🔑 【传语译码碑已启动 (${doneCount}/${gate.steles.length})】`,
                `${activator.name} 以符号造语唤醒了第 ${doneCount} 座译码碑！`,
                5500,
                'gold'
              );
            }
          }
        });
      }

      // C) Brown Gravity Pressure Plate
      const onPlateUnit = activeSquad.find(
        (u) => !u.isHangingLedge && !u.inFreefall && (u.pos.distanceTo(gate.plateWorldPos) < 4.5 || Math.abs(u.s - gate.s) < 0.018)
      );
      if (onPlateUnit && !gate.platePressed) {
        gate.platePressed = true;
        if (gate.brownPlateMesh) {
          gate.brownPlateMesh.position.y = 0.04;
          gate.brownPlateMesh.material.color.setHex(0x4cd137);
        }
        window.SFX.playPlateClick();
        onPlateUnit.showSpeechBubble('🟫 踩下棕红重力踏板！正在检验队伍构成条件…', '#7bed9f', 2.2);
      }

      // D) Evaluate Gate Unlock (Language Symbols + Tricky Squad Composition Check + Steles/Plate!)
      const nearby = activeSquad.filter(
        (u) => !u.isHangingLedge && !u.inFreefall && (Math.abs(u.s - gate.s) < 0.024 || u.pos.distanceTo(gate.pos) < 9.0 || u.pos.distanceTo(gate.plateWorldPos) < 6.5)
      );

      if (nearby.length > 0) {
        const presentLangs = new Set();
        activeSquad.forEach((u) => {
          if ((u.commandUnderstood || this.rosettaTimer > 0) && Math.abs(u.s - gate.s) < 0.055) {
            u.langs.forEach((l) => presentLangs.add(l));
          }
        });

        const allLangsMet = gate.reqLangs.every((reqL) => presentLangs.has(reqL)) || this.rosettaTimer > 0;
        const compRes = gate.compCheck ? gate.compCheck(this, activeSquad, gate) : { passed: true, label: '' };
        const stelesMet = (!gate.steles || gate.steles.length === 0) ? true : (gate.steles.every((s) => s.activated) || this.rosettaTimer > 0);

        if (allLangsMet && compRes.passed && (stelesMet || gate.platePressed)) {
          const scholarMult = activeSquad.some((u) => u.skill.id === 'SCHOLAR') ? 1.9 : 1.0;
          gate.unlockProgress += dt * 62 * buildBuff * scholarMult;
          const solver = nearby[0];
          if (Math.floor(elapsed * 4) % 2 === 0 && solver.bubbleTimer <= 0.2) {
            const symStr = gate.reqLangs.map((l) => LANG_CONFIG[l].symbol).join('+');
            solver.showSpeechBubble(`🔓 检定通过！开启 [${symStr}] 巨门 ${Math.min(100, Math.floor(gate.unlockProgress))}%`, '#38ada9', 0.9, false);
          }
          if (gate.unlockProgress >= 100) {
            gate.unlocked = true;
            gate.barrierMesh.visible = false;
            gate.labelSprite.visible = false;
            if (gate.cyanCubeMesh) {
              gate.cyanCubeMesh.material.color.setHex(0x7bed9f);
              gate.cyanCubeMesh.material.emissive.setHex(0x2ecc71);
            }
            window.SFX.playMiracle();
            solver.showSpeechBubble(`✨ ${gate.title} 已突破！`, '#7bed9f', 2.8);
            if (this.storySystem) {
              this.storySystem.showBanner(`🔓 ${gate.title} 已开启！`, '队伍构成与符号传语检定全部通过，通往上层的道路已打开！', 6000, 'gold');
            }
          }
        } else {
          const frontU = nearby[0];
          if (frontU.bubbleTimer <= 0.1 && Math.random() < 0.03) {
            if (!compRes.passed) {
              frontU.showSpeechBubble(`⚠️ ${compRes.label}`, '#ff6b6b', 1.6);
            } else if (!stelesMet) {
              const doneSt = gate.steles.filter((s) => s.activated).length;
              frontU.showSpeechBubble(`🔒 需激活 3 处译码碑 (${doneSt}/3)!`, '#f3a653', 1.6);
            } else {
              const symStr = gate.reqLangs.map((l) => LANG_CONFIG[l].symbol).join('+');
              frontU.showSpeechBubble(`🔒 需电路连通 [${symStr}] 符号并踩踏板！`, '#ff6b6b', 1.6);
            }
          }
          if (this.storySystem && !gate.hintShown) {
            gate.hintShown = true;
            this.storySystem.showBanner(gate.title, gate.hint, 8000, 'warn');
          }
        }
      }
    });

    // Physically sway & slide the Rally Flag (旗子) when the tower tilts & wind blows!
    if (this.flagGroup) {
      const tiltRad = this.tower.currentTiltZ || 0;
      if (this.rallyS >= 0.22 && Math.abs(tiltRad) > 0.01) {
        // Slide the rally flag slightly downhill along the tilted floor if not anchored
        this.rallyLateralVec.x = Math.max(-6.5, Math.min(6.5, this.rallyLateralVec.x + Math.sin(tiltRad) * dt * 1.4));
        const rNodePos = this.tower.getPointOnSpiral(this.rallyS, 0);
        this.rallyPos.copy(rNodePos).add(this.rallyLateralVec);
        this.flagGroup.position.copy(this.rallyPos);
      }
      this.flagGroup.rotation.z = -tiltRad * 1.35 + Math.sin(elapsed * 4.5) * 0.07 * windStrength;
      if (this.flagCloth) {
        this.flagCloth.rotation.y = Math.sin(elapsed * 9.0) * 0.28 * Math.max(0.4, windStrength);
        this.flagCloth.position.y = 2.65 + Math.cos(elapsed * 7.0) * 0.05;
      }
    }

    // 3. Update Individual Units (Including Auto-Retracting Speech Bubbles, Real 3D Freefall, Lower-Tier Crash Landing & Stun Recovery!)
    aliveUnits.forEach((u, idx) => {
      if (u.speechCooldown > 0) {
        u.speechCooldown = Math.max(0, u.speechCooldown - dt);
      }
      if (u.hudPopupTimer > 0) {
        u.hudPopupTimer = Math.max(0, u.hudPopupTimer - dt);
      }
      // Always count down & smoothly retract 3D speech bubbles BEFORE any early returns!
      if (u.bubbleTimer > 0) {
        u.bubbleTimer = Math.max(0, u.bubbleTimer - dt);
        if (u.bubbleTimer <= 0) {
          u.bubbleMat.opacity = 0;
          u.bubbleSprite.visible = false;
        } else if (u.bubbleTimer < 0.28) {
          const shrink = u.bubbleTimer / 0.28;
          u.bubbleMat.opacity = shrink;
          u.bubbleSprite.scale.set(3.0 * shrink, 0.86 * shrink, 1);
        }
      } else if (u.bubbleSprite.visible) {
        u.bubbleSprite.visible = false;
      }

      if (u.isGrabbed) {
        u.inFreefall = false;
        u.stunTimer = 0;
        u.update3DRigAndCarryVisuals(dt, elapsed, true);
        return;
      }

      // --- REAL 3D PHYSICS FREEFALL & LOWER-TIER CRASH LANDING ---
      if (u.inFreefall) {
        const prevY = u.pos.y;
        u.physVel.y -= 21.0 * dt; // Real 3D Gravity!
        u.physVel.x += Math.sin(this.tower.currentTiltZ || 0) * 10.0 * dt;
        u.pos.addScaledVector(u.physVel, dt);
        u.rig.root.position.copy(u.pos);
        u.ringMesh.position.set(u.pos.x, u.pos.y + 0.08, u.pos.z);
        u.update3DRigAndCarryVisuals(dt, elapsed, true);

        // Check if the falling unit lands on a lower floor deck or spiral walkway!
        if (u.physVel.y < 0 && u.pos.y > destructionHeight + 1.0) {
          const landing = this.tower.findLandingSurfaceBelow(u.pos, prevY);
          if (landing && prevY - landing.y > 0.1) {
            u.inFreefall = false;
            u.physVel.set(0, 0, 0);
            u.pos.y = landing.y;
            u.s = landing.s;
            u.stunTimer = 2.0;
            u.aiState = 'FOLLOWING';
            window.SFX.playBuildHammer();
            u.showSpeechBubble(`💫 摔落至下层平台 (${Math.round(u.pos.y)}m)！`, '#f3a653', 1.8);
            this.propagateLanguageChain(false);
            return;
          }
        }

        // If they fall below the flood / abyss line, they perish!
        if (u.pos.y < destructionHeight - 6.0) {
          if (this.storySystem) {
            this.storySystem.showBanner(`🌊 【坠塔失联 · ${u.name}】`, `${u.name} 从高空坠落巴别塔深渊……`, 6000, 'warn');
          }
          u.destroy();
        }
        return;
      }

      if (u.stunTimer > 0) {
        u.stunTimer = Math.max(0, u.stunTimer - dt);
        u.update3DRigAndCarryVisuals(dt, elapsed, false);
        return;
      }

      if (u.throwArc) {
        u.throwArc.t += dt / u.throwArc.duration;
        if (u.throwArc.t >= 1.0) {
          u.s = u.throwArc.endS;
          u.pos.copy(u.throwArc.endPos);
          u.throwArc = null;
        } else {
          const p = u.throwArc.t;
          u.s = u.throwArc.startS + (u.throwArc.endS - u.throwArc.startS) * p;
          u.pos.lerpVectors(u.throwArc.startPos, u.throwArc.endPos, p);
          u.pos.y += Math.sin(p * Math.PI) * 4.2;
          u.rig.root.position.copy(u.pos);
          u.ringMesh.position.set(u.pos.x, u.pos.y + 0.08, u.pos.z);
          u.update3DRigAndCarryVisuals(dt, elapsed, true);
          return;
        }
      }

      // Prologue Water Well State
      if (u.inWell) {
        const wellPos = this.tower.getPointOnSpiral(0.008, 0);
        u.pos.set(wellPos.x, 0.2 + Math.sin(elapsed * 6) * 0.12, wellPos.z);
        u.rig.root.position.copy(u.pos);
        u.ringMesh.position.set(u.pos.x, 0.5, u.pos.z);
        u.update3DRigAndCarryVisuals(dt, elapsed, false);

        const rescuersNearWell = activeSquad.filter((o) => o.pos.distanceTo(u.pos) < 4.0);
        if (rescuersNearWell.length >= 2 && elapsed > 3.2) {
          this.rescueFromWell();
        } else if (u.bubbleTimer <= 0 && Math.floor(elapsed) % 5 === 0 && Math.random() < 0.08) {
          u.showSpeechBubble('🪣 ♒ Kratī-Na! [左键点我捞出!]', '#38ada9', 1.6, false);
        }
        return;
      }

      // Stranded / Resting Recruitable NPC
      if (u.faction === 'STRANDED') {
        if (u.justDismissedCooldown > 0) {
          u.justDismissedCooldown = Math.max(0, u.justDismissedCooldown - dt);
        }
        u.rig.root.position.copy(u.pos);
        u.update3DRigAndCarryVisuals(dt, elapsed, false);

        const nearbySquad = activeSquad.find((o) => !o.inFreefall && o.pos.distanceTo(u.pos) < 4.4);
        if (nearbySquad && (!u.justDismissedCooldown || u.justDismissedCooldown <= 0)) {
          u.faction = 'PLAYER';
          u.ringMesh.material.color.setHex(new THREE.Color(LANG_CONFIG[u.langs[0]].color).getHex());
          window.SFX.playRelicPickup();
          this.recalculateCarriedSupplies();
          const sym = u.langs.map((l) => LANG_CONFIG[l].symbol).join('+');
          u.showSpeechBubble(`🤝 入队！[${sym}] ${u.skill.name}`, '#7bed9f', 1.8);
          if (this.storySystem) {
            this.storySystem.showBanner(`🤝 【招募同行者 · ${u.name}】`, `${u.quote}`, 6000);
          }
          this.propagateLanguageChain(true);
          if (window.GameApp) window.GameApp.markSquadStripDirty();
        } else if (u.bubbleTimer <= 0 && Math.random() < 0.005) {
          const sym = u.langs.map((l) => LANG_CONFIG[l].symbol).join('+');
          u.showSpeechBubble(`👋 [${sym}] ${u.skill.name} · 靠近入队`, '#7bed9f', 1.5, false);
        }
        return;
      }

      // Mono-Language Nationalist Faction Poachers
      if (u.faction === 'NATIONALIST_LEADER') {
        u.rig.root.position.copy(u.pos);
        u.update3DRigAndCarryVisuals(dt, elapsed, false);
        const sym = LANG_CONFIG[u.nationalistLang].symbol;
        if (u.bubbleTimer <= 0 && Math.random() < 0.008) {
          u.showSpeechBubble(`🚩 纯正【${sym}】语同胞过来！`, '#ff6b6b', 1.6, false);
        }

        activeSquad.forEach((target) => {
          if (target.langs.length === 1 && target.langs[0] === u.nationalistLang && !target.inFreefall) {
            const dist = target.pos.distanceTo(u.pos);
            if (dist < 7.5) {
              const mediatorClose = activeSquad.some(
                (m) => m.langs.length > 1 && m.pos.distanceTo(target.pos) < 5.0
              );
              const overloadMult = target.carryStack.length >= 2 ? 1.35 : 1.0;
              const hungerMult = isStarving ? 1.5 : 1.0;
              target.poachMeter += dt * (mediatorClose ? 9 : 28) * overloadMult * hungerMult;
              if (target.bubbleTimer <= 0 && Math.random() < 0.06) {
                target.showSpeechBubble(`💭 只有【${sym}】语同胞懂我 (${Math.min(100, Math.floor(target.poachMeter))}%)`, '#f3a653', 1.2);
              }
              if (target.poachMeter >= 100) {
                target.faction = 'DEFECTED';
                target.FollowLeader = u;
                target.ringMesh.material.color.setHex(0xff4757);
                this.recalculateCarriedSupplies();
                target.showSpeechBubble(`🚩 被纯【${sym}】语派挖走！(左键拎回)`, '#ff6b6b', 1.8, false);
                if (window.GameApp) window.GameApp.markSquadStripDirty();
                if (this.storySystem && !this.poachStoryShown) {
                  this.poachStoryShown = true;
                  this.storySystem.showBanner(
                    '🚩 【狭隘民族意识挖角 · 连人带物资被拐走！】',
                    `单一【${sym}】语排他小队趁你的单语搬运工疲惫，连人带他头顶堆叠的物资一起挖走了！快用鼠标左键将他拎回，或按 [4 聚拢] / [E 万语共鸣]！`,
                    8000,
                    'warn'
                  );
                }
              }
            }
          }
        });
        return;
      }

      if (u.faction === 'DEFECTED') {
        const leader = u.FollowLeader;
        if (leader && leader.alive) {
          u.s += (leader.s - u.s) * dt * 2.0;
          u.pos.copy(this.tower.getPointOnSpiral(u.s, leader.radialOffset * 0.8));
          u.rig.root.position.copy(u.pos);
          u.ringMesh.position.set(u.pos.x, u.pos.y + 0.08, u.pos.z);
          u.update3DRigAndCarryVisuals(dt, elapsed, true);
        }
        return;
      }

      if (u.isHangingLedge) {
        u.hangTimer -= dt;
        u.pos.copy(this.tower.getPointOnSpiral(u.s, 1.65));
        const struggleY = Math.sin(elapsed * 18 + u.id) * 0.15 - 0.65;
        u.rig.root.position.set(u.pos.x, u.pos.y + struggleY, u.pos.z);
        u.ringMesh.position.set(u.pos.x, u.pos.y + 0.05, u.pos.z);
        u.update3DRigAndCarryVisuals(dt, elapsed, false);

        const rescuer = activeSquad.find(
          (other) => other !== u && !other.isHangingLedge && !other.inFreefall && Math.abs(other.s - u.s) < 0.018
        );
        if (rescuer) {
          u.isHangingLedge = false;
          u.radialOffset = 0;
          u.aiState = 'FOLLOWING';
          u.showSpeechBubble(`🤝 被 ${rescuer.name.split('·')[1] || rescuer.name} 捞上来了！`, '#7bed9f', 1.6);
          window.SFX.playPickUp();
          return;
        }

        if (u.hangTimer <= 0 || (u.s > 0.22 && u.pos.y < destructionHeight)) {
          const outDir = new THREE.Vector3(u.pos.x, 0, u.pos.z).normalize();
          u.triggerPhysicsKnockOff(new THREE.Vector3(outDir.x * 2.5, -1.0, outDir.z * 2.5), '😱 脱力坠下巴别塔！');
        } else if (u.bubbleTimer <= 0 && Math.random() < 0.08) {
          u.showSpeechBubble(`🆘 挂崖 ${u.hangTimer.toFixed(1)}s! 左键拎我!`, '#ff6b6b', 1.2);
        }
        return;
      }

      if (isStarving && u.bubbleTimer <= 0 && Math.random() < 0.004) {
        u.showSpeechBubble('🍞 缺口粮了！快采集粮袋或让闲人脱队！', '#f3a653', 1.6);
      }

      // Flood / Collapse Check
      const distToFlood = u.pos.y - destructionHeight;
      if (u.s >= 0.22 && distToFlood < -0.5) {
        u.triggerPhysicsKnockOff(new THREE.Vector3(0, -2, 0), `🌊 ${u.name} 被崩塌与洪水吞没！`);
        return;
      }

      // Individual Will & Self-Preservation
      const spreadOffset = ((idx % 5) - 2) * 0.0014;
      let desiredS = u.s;

      if (u.s >= 0.22 && distToFlood < 12.0) {
        u.aiState = 'SELF_PRESERVE';
        u.sanity = Math.max(15, u.sanity - dt * 6);
        desiredS = Math.min(0.995, u.s + 0.04);
        u.thoughtText = '“洪水与崩塌就在脚下！若背负太重跑不动，可点击头像旁 [卸] 扔掉重物逃生！”';
      } else if (!u.commandUnderstood) {
        u.isolatedTimer += dt;
        u.sanity = Math.max(10, u.sanity - dt * 4.5);
        if (u.isolatedTimer > 4.5) {
          u.aiState = 'PANIC';
          u.thoughtText = `“背着 ${u.carryStack.length} 件物资掉队失联了！快让双语中介等我或卸下重物！”`;
          desiredS = u.s + Math.sin(elapsed * 3.5 + u.id) * 0.002;
          u.radialOffset += Math.sin(elapsed * 5 + u.id) * dt * 1.1;
          if (Math.abs(u.radialOffset) > 1.65 && u.pos.y > 18) {
            const outDir = new THREE.Vector3(u.pos.x, 0, u.pos.z).normalize();
            u.triggerPhysicsKnockOff(new THREE.Vector3(outDir.x * 3.5, 3.0, outDir.z * 3.5), '😱 失联恐慌中失足跌落塔台！');
            return;
          }
        } else {
          u.aiState = 'CONFUSED';
          u.thoughtText = '“📡❌ 语言链电路中断！等待双语中介转译符号脉冲……”';
          desiredS = u.s;
        }
      } else {
        u.isolatedTimer = 0;
        u.sanity = Math.min(100, u.sanity + dt * 4);

        const hangingComrade = activeSquad.find(
          (other) => other.isHangingLedge && Math.abs(other.s - u.s) < 0.04
        );
        if (hangingComrade && (this.globalStance === 'HANDSHAKE' || u.skill.id === 'STRONGMAN' || u.skill.id === 'MEDIATOR')) {
          u.aiState = 'RESCUING';
          desiredS = hangingComrade.s;
          u.thoughtText = `“正赶去把挂在裂缝边的 ${hangingComrade.name} 拉上来！”`;
        } else if (this.globalStance === 'ATTRACT') {
          u.aiState = 'ANCHORED';
          desiredS = Math.max(u.s, this.rallyS + spreadOffset * 0.4);
        } else if (this.globalStance === 'PUSH_JUMP') {
          u.aiState = 'CLIMBING';
          desiredS = Math.min(0.995, u.s + (u.isChild ? 0.042 : 0.03));
          if (u.s > this.rallyS) {
            this.rallyS = Math.min(0.995, u.s + 0.006);
            this.rallyPos.copy(this.tower.getPointOnSpiral(this.rallyS, 0));
            this.flagGroup.position.copy(this.rallyPos);
          }
        } else {
          u.aiState = 'FOLLOWING';
          const rawTargetS = this.rallyS + spreadOffset;
          if (u.s >= 0.22 && rawTargetS < u.s - 0.006) {
            const safeAboveFlood = (u.pos.y - destructionHeight) > 22.0;
            const hasDisconnectedBelow = u.langs.length > 1 && activeSquad.some((o) => !o.commandUnderstood && o.s < u.s);
            if (safeAboveFlood && hasDisconnectedBelow) {
              desiredS = Math.max(rawTargetS, u.s - 0.018);
              u.thoughtText = '“我作为双语中介，稍微往下迎一下后方背负重物走得慢或摔落下层的同伴！”';
            } else {
              desiredS = u.s;
              u.thoughtText = '“我已抵达高处安全平台，绝不往下方崩塌区倒退！”';
            }
          } else {
            desiredS = rawTargetS;
            const speedPct = Math.round(u.getCarrySpeedMultiplier() * 100);
            u.thoughtText = u.carryStack.length > 0
              ? `“头顶背负 ${u.carryStack.length}/${u.getMaxCarry(extraCap)} 件物资（配速 ${speedPct}%）。${u.quote}”`
              : u.quote;
          }
        }
      }

      // Blocked by Multi-Language & Squad-Composition Gate
      const blockingGate = this.tower.languageGates.find(
        (g) => !g.unlocked && u.s < g.s && desiredS >= g.s - 0.004
      );
      if (blockingGate) {
        desiredS = Math.min(desiredS, blockingGate.s - 0.0045);
      }

      // Blocked by Broken Bridge / Chasm -> Mason physically pulls Wood (🪵) or Stone (🪨) from a nearby carrier's vertical stack
      // and performs the dedicated 3D Hammering & Plank-Slamming Animation!
      const currentNodeIdx = Math.floor(u.s * this.tower.pathSegments);
      const nextNodeIdx = Math.min(this.tower.pathSegments, currentNodeIdx + 1);
      const nextNode = this.tower.nodes[nextNodeIdx];

      if (nextNode && nextNode.isGap && !nextNode.gapRepaired && desiredS > u.s) {
        desiredS = u.s;
        u.aiState = 'BUILDING';
        // Face directly toward the broken bridge chasm while hammering planks!
        u.facingAngle = Math.atan2(nextNode.pos.x - u.pos.x, nextNode.pos.z - u.pos.z);

        const isMason = u.skill.id === 'MASON';
        const nearbyCarrier = activeSquad.find(
          (o) => !o.inFreefall && o.pos.distanceTo(u.pos) < 9.5 && o.carryStack.some((it) => it.type === 'WOOD' || it.type === 'STONE')
        );
        const hasNearbyMat = Boolean(nearbyCarrier);
        const speedFactor = (isMason ? 2.6 : 1.1) * (hasNearbyMat ? 2.1 : 0.55) * buildBuff;

        u.buildCooldown -= dt * speedFactor;
        if (u.buildCooldown <= 0) {
          u.buildCooldown = 0.58;
          const stepGain = isMason ? (hasNearbyMat ? 38 : 16) : (hasNearbyMat ? 24 : 10);
          nextNode.repairProgress = (nextNode.repairProgress || 0) + stepGain;
          window.SFX.playBuildHammer();

          // Reveal 3D wooden planks slamming down one by one & emit wood-chip sparks!
          this.tower.updateChasmPlanks(nextNodeIdx, nextNode.repairProgress);
          this.tower.spawnBuildSparks(nextNode.pos);

          if (!hasNearbyMat) {
            u.showSpeechBubble(`🔨 缺木石！等背木石队友 (${Math.min(100, Math.floor(nextNode.repairProgress))}%)`, '#ff6b6b', 1.1, false);
          } else if (isMason) {
            u.showSpeechBubble(`🔨 铺设木板桥 ${Math.min(100, Math.floor(nextNode.repairProgress))}%`, '#f3a653', 1.1, false);
          }

          if (nextNode.repairProgress >= 100) {
            if (!this.consumePhysicalItem('WOOD', u.pos, 12.0)) {
              this.consumePhysicalItem('STONE', u.pos, 12.0);
            }

            this.tower.updateChasmPlanks(nextNodeIdx, 100);
            for (let k = Math.max(0, nextNodeIdx - 3); k <= Math.min(this.tower.pathSegments, nextNodeIdx + 3); k++) {
              if (this.tower.nodes[k].isGap) {
                this.tower.nodes[k].gapRepaired = true;
              }
            }
            u.showSpeechBubble('✨ 木板桥修筑完成！', '#7bed9f', 1.6);
          }
        }
      }

      // Smooth Movement along Spiral + 2D/3D Free Lateral Walking, scaled by Physical Carry Load Speed Multiplier!
      const carrySpeedMult = u.getCarrySpeedMultiplier();
      const deltaS = desiredS - u.s;
      const maxStep = dt * 0.0118 * speedBuff * (u.skill.speedMult || 1.0) * carrySpeedMult * (u.aiState === 'CLIMBING' ? 1.25 : 1.0);
      const isMovingS = Math.abs(deltaS) > 0.00025;
      if (isMovingS) {
        u.s += Math.sign(deltaS) * Math.min(Math.abs(deltaS), maxStep);
      }

      const targetLateral = (Math.abs(u.s - this.rallyS) < 0.028 && u.commandUnderstood)
        ? this.rallyLateralVec
        : new THREE.Vector3(0, 0, 0);
      const latDist = u.freeOffset.distanceTo(targetLateral);
      u.freeOffset.lerp(targetLateral, Math.min(1, dt * 4.5 * carrySpeedMult));
      const isMoving = isMovingS || latDist > 0.25;

      u.animTimer += dt * (isMoving ? 6.5 * carrySpeedMult : 3.0);

      // Real Tower Tilt & Wind Physics on NPCs:
      // Whenever the tower sways/tilts (`towerTilt`), NPCs on the tower physically slide downhill along the tilt!
      if (u.s >= 0.22 && Math.abs(towerTilt) > 0.6 && this.globalStance !== 'ATTRACT') {
        const tiltRad = this.tower.currentTiltZ || (towerTilt * 0.012);
        const stackWeightFactor = 1.0 + u.carryStack.length * 0.25;
        const unitAng = Math.atan2(u.pos.z, u.pos.x);
        // Project world X-tilt gravity onto the unit's radial outward direction on the spiral ramp!
        const radialTiltPull = Math.sin(tiltRad) * Math.cos(unitAng) * stackWeightFactor;
        u.radialOffset += radialTiltPull * dt * 2.4;
        u.freeOffset.x += Math.sin(tiltRad) * dt * 1.6 * stackWeightFactor;

        if (Math.abs(u.radialOffset) > 1.68 && (!u.isChild || u.carryStack.length > 0)) {
          const outDir = new THREE.Vector3(u.pos.x, 0, u.pos.z).normalize();
          u.triggerPhysicsKnockOff(new THREE.Vector3(outDir.x * 4.2, 3.2, outDir.z * 4.2), '⚖️ 塔身摇晃倾斜，失衡滑落！');
          return;
        }
      }

      const zoneWind = (u.pos.y > 48 ? (u.pos.y > 106 ? 1.15 : 0.52) : 0.0) * windStrength;
      if (zoneWind > 0.3 && this.globalStance !== 'ATTRACT') {
        const resist = (u.skill.windResist || 1.0) * windBuff;
        u.s = Math.max(0.005, u.s - dt * 0.0016 * zoneWind * resist);
      }

      // Crowd separation
      activeSquad.forEach((other) => {
        if (other === u || other.isHangingLedge || other.inFreefall) return;
        const ds = u.s - other.s;
        if (Math.abs(ds) < 0.0015) {
          u.radialOffset += (u.id > other.id ? 1 : -1) * dt * 1.2;
        }
      });
      u.radialOffset = Math.max(-1.65, Math.min(1.65, u.radialOffset * 0.96));

      const basePos = this.tower.getPointOnSpiral(u.s, u.radialOffset);
      u.pos.copy(basePos).add(u.freeOffset);
      const hopY = isMoving ? Math.abs(Math.sin(u.animTimer * 2.5)) * 0.16 : 0;
      u.rig.root.position.set(u.pos.x, u.pos.y + hopY, u.pos.z);
      u.ringMesh.position.set(u.pos.x, u.pos.y + 0.08, u.pos.z);

      // Update 3D Articulated Limbs & Vertical Supply Stack!
      u.update3DRigAndCarryVisuals(dt, elapsed, isMoving);

      // Check overhead clearance & physically squeeze off items exceeding low suspension ladders/arches
      this.checkOverheadClearance(u, dt, elapsed);

      // Physical Resource Pickup onto Vertical Stacks
      this.tower.interactables.forEach((item) => {
        if (item.triggered) return;
        if (u.pos.distanceTo(item.pos) < 3.8 || Math.abs(u.s - (item.nodeIndex / this.tower.pathSegments)) < 0.0075) {
          if (item.type === 'FOOD_RESOURCE' || item.type === 'WOOD_RESOURCE' || item.type === 'STONE_RESOURCE') {
            const carryType = item.type === 'FOOD_RESOURCE' ? 'FOOD' : (item.type === 'WOOD_RESOURCE' ? 'WOOD' : 'STONE');
            if (item.remainingCount === undefined) item.remainingCount = 3;

            const nearbyCarriers = activeSquad
              .filter((o) => !o.inFreefall && o.pos.distanceTo(item.pos) < 7.5 && o.carryStack.length < o.getMaxCarry(extraCap))
              .sort((a, b) => {
                const scoreA = (a.skill.id === 'STRONGMAN' ? 10 : (a.skill.id === 'FORAGER' && carryType === 'FOOD' ? 12 : 0)) + (a.getMaxCarry(extraCap) - a.carryStack.length);
                const scoreB = (b.skill.id === 'STRONGMAN' ? 10 : (b.skill.id === 'FORAGER' && carryType === 'FOOD' ? 12 : 0)) + (b.getMaxCarry(extraCap) - b.carryStack.length);
                return scoreB - scoreA;
              });

            if (nearbyCarriers.length === 0) {
              if (u.bubbleTimer <= 0.1) {
                u.showSpeechBubble('🎒 全员头顶背负已满！需大力士/农夫或先消耗物资！', '#f3a653', 2.0, false);
              }
              return;
            }

            let pickedUp = 0;
            for (const carrier of nearbyCarriers) {
              while (item.remainingCount > 0 && carrier.carryStack.length < carrier.getMaxCarry(extraCap)) {
                carrier.pushCarryItem(carryType);
                item.remainingCount--;
                pickedUp++;
                if (carryType === 'FOOD' && carrier.skill.id === 'FORAGER' && carrier.carryStack.length < carrier.getMaxCarry(extraCap)) {
                  carrier.pushCarryItem('FOOD');
                  pickedUp++;
                }
              }
              if (item.remainingCount <= 0) break;
            }

            if (pickedUp > 0) {
              this.recalculateCarriedSupplies();
              window.SFX.playPickUp();
              const icon = carryType === 'FOOD' ? '🍞口粮' : (carryType === 'WOOD' ? '🪵原木' : '🪨石砖');
              const mainCarrier = nearbyCarriers[0];
              const speedPct = Math.round(mainCarrier.getCarrySpeedMultiplier() * 100);
              mainCarrier.showSpeechBubble(
                `⬆️ 叠背 +${pickedUp} ${icon} (${mainCarrier.carryStack.length}/${mainCarrier.getMaxCarry(extraCap)}, ${speedPct}%速)`,
                '#7bed9f',
                2.2
              );
            }

            if (item.remainingCount <= 0) {
              item.triggered = true;
              if (item.mesh) item.mesh.visible = false;
            } else if (item.mesh && item.mesh.children.length >= item.remainingCount) {
              for (let cIdx = item.remainingCount; cIdx < item.mesh.children.length; cIdx++) {
                item.mesh.children[cIdx].visible = false;
              }
            }
          } else if (item.type === 'RELIC') {
            item.triggered = true;
            if (item.mesh) item.mesh.visible = false;
            this.distributePhysicalItemsToSquad('FOOD', 2);
            window.SFX.playRelicPickup();
            if (window.GameApp) window.GameApp.onRelicCollected(u, item.relicIndex);
          } else if (item.type === 'SHRINE') {
            item.triggered = true;
            if (item.mesh) item.mesh.visible = false;
            window.SFX.playMiracle();
            if (window.GameApp) window.GameApp.onShrineReached(item, u);
          }
        }
      });
    });
  }
}

window.BabelUnit = BabelUnit;
window.CrowdAndLanguageSystem = CrowdAndLanguageSystem;
