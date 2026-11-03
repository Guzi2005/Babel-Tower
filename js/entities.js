// 实体：队员（像素角色 + 竖向物资堆叠）、木箱、物资、落石
(function () {
  const G = 32;
  const HW = 0.28;            // 队员半宽
  const MAX_STACK = 24;
  const WEIGHT = { bread: 0.25, dates: 0.2, meat: 0.35, water: 0.3, wood: 0.5, stone: 1 };

  function findGround(game, x, y, hw, exclude, current, z, dropKey) {
    let best = null;
    const effHw = hw + 0.12; // 扩展边缘接缝缓冲，防止多层平台接缝处微米级裂隙掉空
    for (const s of game.supports) {
      if (exclude !== undefined && s.ref === exclude) continue;
      if (dropKey && s.key === dropKey) continue;
      if (x < s.x1 - effHw || x > s.x2 + effHw) continue;
      if (s.y > y + 0.28 || s.y < y - 0.45) continue;
      if (s.z !== undefined && z !== undefined) {
        // 地面与基岩支撑层纵深无限全贯通，防止在大世界走入后巷时地板突然消失坠落虚空
        const isGroundSlab = s.kind === 'solid' || (s.key && (s.key.startsWith('w') || s.key.startsWith('well_bypass')));
        const maxZDiff = isGroundSlab ? ((game.openWorld && game.openWorld.active) ? 200.0 : 35.0) : ((s.key && s.key.startsWith('roof_')) ? 4.8 : 3.6);
        if (Math.abs(s.z - z) > maxZDiff) continue;
      }
      if (!best || s.y > best.y) {
        best = s;
      } else if (Math.abs(s.y - best.y) < 0.08) {
        // 保持现有支撑面，避免共面物体（地面与升降台）之间互相抖动劫持
        if (current && (s.key === current.key || s.ref === current.ref)) best = s;
        else if (s.kind === 'crate') best = s;
      }
    }
    return best;
  }
  function landOn(game, x, yPrev, yNew, hw, exclude, z, dropKey) {
    let best = null;
    const effHw = hw + 0.12;
    for (const s of game.supports) {
      if (exclude !== undefined && s.ref === exclude) continue;
      if (dropKey && s.key === dropKey) continue;
      if (x < s.x1 - effHw || x > s.x2 + effHw) continue;
      if (s.y > yPrev + 0.12 || s.y < yNew - 0.12) continue;
      if (s.z !== undefined && z !== undefined) {
        // 地面与基岩支撑层纵深无限全贯通，防止在大世界走入后巷时地板突然消失坠落虚空
        const isGroundSlab = s.kind === 'solid' || (s.key && (s.key.startsWith('w') || s.key.startsWith('well_bypass')));
        const maxZDiff = isGroundSlab ? ((game.openWorld && game.openWorld.active) ? 200.0 : 35.0) : ((s.key && s.key.startsWith('roof_')) ? 4.8 : 3.6);
        if (Math.abs(s.z - z) > maxZDiff) continue;
      }
      if (!best || s.y > best.y || (s.y === best.y && s.kind !== 'solid')) best = s;
    }
    return best;
  }

  // 3D 实体物资网格工厂（真实竖向堆叠在头顶，随迈步微幅晃动）
  class CargoMeshFactory {
    constructor() {
      this.matBreadBag = new THREE.MeshLambertMaterial({ color: 0xdfab42 });
      this.matBreadCord = new THREE.MeshLambertMaterial({ color: 0xb53225 });
      this.matDatesBasket = new THREE.MeshLambertMaterial({ color: 0x8a3814 });
      this.matDatesFruit = new THREE.MeshLambertMaterial({ color: 0xc45a22 });
      this.matMeatCured = new THREE.MeshLambertMaterial({ color: 0x8a2828 });
      this.matMeatCord = new THREE.MeshLambertMaterial({ color: 0xd4a359 });
      this.matWaterPot = new THREE.MeshLambertMaterial({ color: 0xb86638 });
      this.matWaterCork = new THREE.MeshLambertMaterial({ color: 0x4aa8d8 });
      this.matWoodLog = new THREE.MeshLambertMaterial({ color: 0x9b5f2a });
      this.matWoodCord = new THREE.MeshLambertMaterial({ color: 0x4a3420 });
      this.matStoneBlock = new THREE.MeshLambertMaterial({ color: 0xb8ad98 });
      this.matStoneTrim = new THREE.MeshLambertMaterial({ color: 0x766c5a });
      Object.values(this).forEach(value => { if (value && value.isMaterial) value.userData.shared = true; });
    }

    createMesh(type) {
      const g = new THREE.Group();
      if (type === 'bread') {
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.32, 0.52), this.matBreadBag);
        bag.castShadow = true; bag.receiveShadow = true;
        const cord = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.56), this.matBreadCord);
        g.add(bag, cord);
      } else if (type === 'dates') {
        const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.28, 8), this.matDatesBasket);
        basket.castShadow = true;
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), this.matDatesFruit);
        fruit.position.y = 0.12;
        g.add(basket, fruit);
      } else if (type === 'meat') {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.28, 0.48), this.matMeatCured);
        slab.castShadow = true;
        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.52), this.matMeatCord);
        g.add(slab, tie);
      } else if (type === 'water') {
        const amphora = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.38, 8), this.matWaterPot);
        amphora.castShadow = true;
        const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.12, 6), this.matWaterCork);
        plug.position.y = 0.22;
        g.add(amphora, plug);
      } else if (type === 'wood') {
        for (let i = -1; i <= 1; i += 2) {
          const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.82, 8), this.matWoodLog);
          log.rotation.z = Math.PI / 2;
          log.position.z = i * 0.14;
          log.castShadow = true;
          g.add(log);
        }
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.58), this.matWoodCord);
        g.add(strap);
      } else {
        const blk = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.32, 0.56), this.matStoneBlock);
        blk.castShadow = true; blk.receiveShadow = true;
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 0.60), this.matStoneTrim);
        g.add(blk, trim);
      }
      return g;
    }
  }
  const cargoFactory = new CargoMeshFactory();

  // ───────────────────────── 队员 ─────────────────────────
  class Unit {
    constructor(game, idOrDef, x, y, recruited) {
      const id = (typeof idOrDef === 'string') ? idOrDef : (idOrDef.id || `u_${Math.floor(Math.random() * 10000)}`);
      const existing = LANG.MEMBERS[id] || {};
      const def = (typeof idOrDef === 'object' && idOrDef !== null)
        ? { ...existing, ...idOrDef }
        : existing;
      if (!def.pal) {
        def.pal = (window.LANG && window.LANG.generateTraveler)
          ? window.LANG.generateTraveler({ role: def.role, langs: def.langs }).pal
          : { skin: '#e2ab7a', hair: '#4a321a', hat: 'hood', hatColor: '#a8723d', coat: '#8a5a2b', pants: '#3a2a20', shoes: '#2e1e14', accent: '#f0d080' };
      }
      this.game = game; this.id = id; this.name = def.name || `旅人 #${id}`;
      this.langs = def.langs || ['☼']; this.pal = def.pal;
      this.role = def.role || '工兵队员';
      this.roleIcon = def.roleIcon || '👤';
      this.roleDesc = def.roleDesc || '';
      this.isMerchant = !!def.isMerchant;
      this.team = def.team || 'player';
      this.isHostile = !!def.isHostile;
      this.rivalSquadName = def.rivalSquadName || null;
      this.hp = def.hp || 100;
      this.maxHp = this.hp;
      this.atk = (this.id === 'akad' || this.role === '筑造石匠' || this.role === '巡山卫士' || this.role === '荒原勇士' || this.role === '佣兵队长') ? 35 : 22;
      this.atkCooldown = 0;
      LANG.MEMBERS[id] = { ...def, id, pal: this.pal, name: this.name, langs: this.langs, role: this.role, roleIcon: this.roleIcon, roleDesc: this.roleDesc, isMerchant: this.isMerchant, team: this.team };
      if (!LANG.ORDER.includes(id)) LANG.ORDER.push(id);
      this.recruited = recruited; this.detached = false;
      this.x = x; this.y = y; this.z = 0; this.targetZ = 0; this.inInterior = false;
      this.vx = 0; this.vy = 0; this.facing = 1;
      this.grounded = null; this.state = 'idle';
      this.dropThroughCooldown = 0;
      this.dropThroughKey = null;
      this.stack = [];
      this.fainted = false; this.faintT = 0; this.hungerWarned = false;
      this.order = null; this.path = null; this.replanT = 0; this.stuckT = 0; this.lastX = x;
      this.task = null; this.stunT = 0; this.animT = Math.random(); this.frame = 0;
      this.pending = null; this.idleBubbleT = 4 + Math.random() * 6;
      this.buildMesh();
    }

    buildMesh() {
      const g = new THREE.Group();
      this.canvas = PX.canvas(16, 24); this.ctx = this.canvas.getContext('2d');
      this.tex = new THREE.CanvasTexture(this.canvas); this.tex.magFilter = THREE.NearestFilter; this.tex.minFilter = THREE.NearestFilter;
      this.sprite = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.725), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, alphaTest: 0.3 }));
      this.sprite.position.y = 0.86; g.add(this.sprite);
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 14), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow); this.shadow = shadow;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 28), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -1.2; ring.position.y = 0.05; ring.visible = false; g.add(ring); this.ring = ring;
      this.stackGroup = new THREE.Group(); g.add(this.stackGroup); this.stackMeshes = [];

      // 民主领队 3D 浮动皇冠图标（双击任命领队后醒目佩戴）
      const crownCanvas = document.createElement('canvas');
      crownCanvas.width = 32; crownCanvas.height = 32;
      const cctx = crownCanvas.getContext('2d');
      cctx.font = '22px sans-serif';
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText('👑', 16, 16);
      const crownTex = new THREE.CanvasTexture(crownCanvas);
      crownTex.magFilter = THREE.NearestFilter;
      this.crown = new THREE.Sprite(new THREE.SpriteMaterial({ map: crownTex, transparent: true }));
      this.crown.scale.set(0.68, 0.68, 1);
      this.crown.visible = false;
      g.add(this.crown);
      if (this.team === 'rival') {
        const flagColor = (LANG.MEMBERS[this.id] && LANG.MEMBERS[this.id].bannerColor) || '#dc2626';
        const ribbon = new THREE.Mesh(
          new THREE.BoxGeometry(0.85, 0.22, 0.1),
          new THREE.MeshBasicMaterial({ color: flagColor })
        );
        ribbon.position.set(0, 1.88, 0.1);
        g.add(ribbon);
      }
      this.group = g; this.game.entRoot.add(g);
      this.drawKey = '';
    }

    get selected() { return this.game.selection.has(this); }
    get load() { return this.stack.length; }
    maxRise() {
      const strongBonus = (this.id === 'bani' || this.role === '绝壁挑夫') ? 0.35 : 0;
      return 1.9 + strongBonus - 0.16 * Math.min(8, this.stack.length);
    }
    speed() {
      if (this.fainted) return 0;
      const mul = (window.DEV_PARAMS && window.DEV_PARAMS.speedMul) ? window.DEV_PARAMS.speedMul : 1.0;
      const scoutBonus = (this.id === 'ul' || this.role === '巡山卫士' || this.role === '巡野斥候') ? 1.25 : 1.0;
      const haste = (this.hasteT && this.hasteT > 0) ? 1.2 : 1.0;
      return 3.4 * (1 - 0.08 * Math.min(8, this.stack.length)) * this.game.hungerFactor() * mul * scoutBonus * haste;
    }
    climbSpeed() {
      if (this.fainted) return 0;
      const mul = (window.DEV_PARAMS && window.DEV_PARAMS.speedMul) ? window.DEV_PARAMS.speedMul : 1.0;
      const pioneerBonus = (this.id === 'ghar' || this.role === '开路先锋' || this.role === '开路工兵') ? 1.35 : 1.0;
      return 2.6 * (1 - 0.1 * Math.min(8, this.stack.length)) * this.game.hungerFactor() * mul * pioneerBonus;
    }

    say(text, dur = 2.4) {
      this.game.hud.bubble(this, text, dur);
      SFX.playBabble(this.id, text);
    }
    speak(act, dur) { const u = LANG.utter(this.langs, act); this.say(u.text, dur); return u; }

    setOrder(order) {
      if (this.fainted) return;
      this.order = order; this.path = null; this.replanT = 0; this.stuckT = 0;
      this._groundXZPath = null; this._groundXZGoal = '';
      if (order && (order.type === 'rally' || order.type === 'follow_leader')) this.holdPos = false;
      if (this.task && this.task.type !== 'stun') this.task = null;
    }

    moveGroundXZ(tx, tz, dt) {
      const ow = this.game && this.game.openWorld;
      const curZ = this.targetZ || 0;
      const dist = Math.hypot(tx - this.x, tz - curZ);
      if (dist <= 0.28 || (Math.abs(tx - this.x) <= 0.28 && Math.abs(tz - curZ) <= 0.72)) {
        this.x = tx; this.targetZ = tz; this.z = tz;
        this.vx = 0; this.openMoving = false;
        this._groundXZPath = null;
        return true;
      }
      if (!ow || !ow.active || this.y > 1.25) return false;
      const sig = `${Math.round(tx * 4)}:${Math.round(tz * 4)}`;
      this._groundXZTimer = (this._groundXZTimer || 0) - dt;
      if (!this._groundXZPath || this._groundXZGoal !== sig || this._groundXZTimer <= 0) {
        this._groundXZGoal = sig;
        this._groundXZPath = ow.plan(this.x, curZ, tx, tz) || [{ x: tx, z: tz }];
        this._groundXZIdx = 0;
        this._groundXZTimer = 0.9;
      }
      let idx = this._groundXZIdx || 0;
      while (idx < this._groundXZPath.length - 1 && Math.hypot(this._groundXZPath[idx].x - this.x, this._groundXZPath[idx].z - curZ) < 0.32) {
        idx++;
      }
      this._groundXZIdx = idx;
      const wp = this._groundXZPath[idx] || { x: tx, z: tz };
      const dx = wp.x - this.x, dz = wp.z - curZ, d = Math.hypot(dx, dz);
      const sp = this.speed();
      this.vx = d > 0.01 ? (dx / d) * sp : 0;
      this.targetZ = curZ + (d > 0.01 ? (dz / d) * sp * dt : 0);
      this.facing = Math.abs(dx) > 0.05 ? Math.sign(dx) : this.facing;
      this.state = 'walk';
      this.openMoving = true;
      return false;
    }

    pick(item) {
      if (this.fainted) return false;
      const roleCap = (this.id === 'bani' || this.role === '绝壁挑夫' || this.role === '负重力士') ? 22 : MAX_STACK;
      const maxCap = (window.DEV_PARAMS && window.DEV_PARAMS.maxCarry !== undefined) ? window.DEV_PARAMS.maxCarry : roleCap;
      if (this.stack.length >= maxCap) { this.say('✋ ' + this.langs[0] + ' ul… (背负已满)'); return false; }
      this.stack.push(item.type); item.remove(); SFX.playPickUp(); this.refreshStack();
      if (this.stack.length >= 8 && window.Achievements) {
        window.Achievements.unlock('titan_neck');
      }
      return true;
    }

    continueGatherNext() {
      if (this.fainted || (this.game && !this.game.autoScavenge)) return;
      const roleCap = (this.id === 'bani' || this.role === '绝壁挑夫' || this.role === '负重力士') ? 22 : MAX_STACK;
      const maxCap = (window.DEV_PARAMS && window.DEV_PARAMS.maxCarry !== undefined) ? window.DEV_PARAMS.maxCarry : roleCap;
      if (this.stack.length >= maxCap) {
        this.say('🎒 ' + (this.langs ? this.langs[0] : '☼') + ' max! (背包已满)', 1.8);
        return;
      }
      const claimed = new Set();
      (this.game.units || []).forEach(u => {
        if (u !== this && u.order && u.order.type === 'pick' && u.order.item) {
          claimed.add(u.order.item);
        }
      });
      const looseItems = (this.game.items || []).filter(it => it.alive && !it.heldBy && !claimed.has(it));
      if (!looseItems.length) return;

      let bestItem = null, bestDist = Infinity;
      looseItems.forEach(it => {
        const d = Math.abs(it.x - this.x) + Math.abs(it.y - this.y) * 1.5;
        if (d < bestDist && d < 75) {
          bestDist = d;
          bestItem = it;
        }
      });
      if (bestItem) {
        this.game.deliver(this, {
          type: 'pick',
          item: bestItem,
          goal: { x: bestItem.x, y: bestItem.y },
          goalFn: () => bestItem.alive ? { x: bestItem.x, y: bestItem.y } : null,
          act: 'pick',
          isGatherAll: true
        });
      }
    }
    dropTop(idx) {
      if (!this.stack.length) return null;
      const i = idx === undefined ? this.stack.length - 1 : idx;
      const type = this.stack.splice(i, 1)[0];
      const it = this.game.spawnItem(type, this.x + this.facing * 0.1, this.y + 1.6 + i * 0.45);
      it.vx = this.facing * 0.6; it.vy = 3;
      SFX.playDrop(); this.refreshStack(); return it;
    }
    refreshStack() {
      this.stackMeshes.forEach(m => this.stackGroup.remove(m));
      this.stackMeshes = this.stack.map((t, i) => {
        const m = cargoFactory.createMesh(t);
        m.position.set(0, 1.88 + i * 0.42, 0);
        this.stackGroup.add(m);
        return m;
      });
      this.game.hud.dirty = true;
    }

    rerollAppearance() {
      if (window.LANG && window.LANG.generatePaperDoll) {
        const newPal = window.LANG.generatePaperDoll({ role: this.role });
        this.setAppearance(newPal);
        return newPal;
      }
      return this.pal;
    }

    setAppearance(newPal) {
      this.pal = { ...this.pal, ...newPal };
      if (window.LANG && window.LANG.MEMBERS && window.LANG.MEMBERS[this.id]) {
        window.LANG.MEMBERS[this.id].pal = this.pal;
      }
      this.palVersion = (this.palVersion || 0) + 1;
      this.drawKey = '';
      if (this.ctx && window.PX) {
        PX.drawChar(this.ctx, this.pal, this.state, this.frame, this.stack.length > 0);
        if (this.tex) this.tex.needsUpdate = true;
      }
      if (this.game && this.game.hud) this.game.hud.dirty = true;
    }

    faint() {
      if (this.fainted) return;
      this.fainted = true;
      this.state = 'faint';
      this.vx = 0;
      this.order = null;
      this.path = null;
      this.sprite.rotation.z = -Math.PI / 2;
      this.sprite.position.y = 0.28;
      this.say('… ' + this.langs[0] + ' (虚脱倒地…需喂食面包急救)', 4.0);
      if (this.stack.length) {
        this.dropTop();
      }
      this.game.hud.banner(`⚠️ 队员 ${this.name} 饥饿昏迷！请指派队友携带面包靠近急救！`, 'warn');
    }

    revive() {
      if (!this.fainted) return;
      this.fainted = false;
      this.state = 'idle';
      this.sprite.rotation.z = 0;
      this.sprite.position.y = 0.86;
      SFX.playConfirm();
      this.say('☼ ' + this.langs[0] + ' !! (苏醒复苏)', 3.0);
      this.game.hud.banner(`✨ 队员 ${this.name} 服用口粮，恢复行动能力！`, 'good');
    }

    takeDamage(dmg, fromX) {
      if (this.fainted) return;
      this.hp = Math.max(0, this.hp - dmg);
      this.task = { type: 'stun', t: 0.8 };
      this.vx = Math.sign(this.x - fromX || 1) * 3.8;
      this.vy = 4.2;
      this.grounded = null;
      this.state = 'fall';
      this.path = null;
      this.hasBeenAttacked = true;
      this.pacified = false;
      SFX.playTone(190, 'sawtooth', 0.12, 0.08);
      if (this.game.fx && this.game.fx.chips) {
        this.game.fx.chips(this.x, this.y + 0.8);
      }
      this.sayDamage(`-${dmg}`);
      if (this.hp <= 0) {
        if (this.team === 'rival') {
          this.fainted = true;
          this.state = 'faint';
          this.vx = 0;
          this.sprite.rotation.z = -Math.PI / 2;
          this.sprite.position.y = 0.28;
          this.say('🏳️ 战败脱力…！', 2.5);
          while (this.stack.length > 0) {
            this.dropTop();
          }
          const lootType = Math.random() < 0.6 ? 'bread' : 'stone';
          this.game.spawnItem(lootType, this.x + (Math.random() - 0.5) * 0.8, this.y + 0.5);
          SFX.playTone(523, 'sine', 0.25, 0.1);
          this.game.hud.banner(`⚔️ 击退了【${this.rivalSquadName || '异邦竞争队'}】成员 ${this.name}！缴获战利品！`, 'good');
        } else {
          this.faint();
        }
      }
    }

    sayDamage(text) {
      if (!this.game || !this.game.hud) return;
      const pos = this.game.project(this.x, this.y + 1.8);
      if (!pos.visible) return;
      const el = document.createElement('div');
      el.className = 'combat-float-dmg';
      el.textContent = text;
      el.style.left = `${pos.x - 20}px`;
      el.style.top = `${pos.y - 20}px`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 750);
    }

    tryAttack(target, dt) {
      if (this.fainted || target.fainted) return false;
      this.atkCooldown = (this.atkCooldown || 0) - dt;
      if (this.atkCooldown > 0) return false;

      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      // 远程投石：背负 stone 且距离 2.4 ~ 6.8 米
      if (this.stack.includes('stone') && dist >= 2.4 && dist <= 6.8) {
        this.throwStone(target);
        this.atkCooldown = 1.8;
        return true;
      }

      // 近战挥舞：距离 <= 2.0 米
      if (dist <= 2.0) {
        this.facing = Math.sign(target.x - this.x) || this.facing;
        this.sprite.rotation.z = -this.facing * 0.35;
        setTimeout(() => { if (!this.fainted) this.sprite.rotation.z = 0; }, 160);
        SFX.playTone(320, 'triangle', 0.1, 0.06, 180);
        if (this.game.fx && this.game.fx.chips) {
          this.game.fx.chips(target.x, target.y + 0.9);
        }
        target.takeDamage(this.atk, this.x);
        this.say('⚔️ ' + (this.langs ? this.langs[0] : 'tor') + ' !', 1.2);
        this.atkCooldown = 1.2;
        return true;
      }
      return false;
    }

    throwStone(target) {
      const idx = this.stack.lastIndexOf('stone');
      if (idx < 0) return;
      this.stack.splice(idx, 1);
      this.refreshStack();

      this.facing = Math.sign(target.x - this.x) || this.facing;
      SFX.playStep('stone');
      this.say('🎯 投掷石砖！', 1.4);

      const startX = this.x + this.facing * 0.4;
      const startY = this.y + 1.2;
      const proj = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.35, 0.35),
        new THREE.MeshLambertMaterial({ color: 0xb8ad98 })
      );
      proj.position.set(startX, startY, 0);
      this.game.entRoot.add(proj);

      const targetX = target.x;
      const targetY = target.y + 0.8;
      const dur = 0.45;
      let elap = 0;

      const updateProj = (dt) => {
        elap += dt;
        const progress = Math.min(1.0, elap / dur);
        const arcH = Math.sin(progress * Math.PI) * 1.8;
        proj.position.x = startX + (targetX - startX) * progress;
        proj.position.y = startY + (targetY - startY) * progress + arcH;
        proj.rotation.x += dt * 10;
        proj.rotation.y += dt * 10;

        if (progress >= 1.0) {
          this.game.entRoot.remove(proj);
          if (!target.fainted) {
            target.takeDamage(45, this.x);
          }
          return false;
        }
        return true;
      };

      if (this.game.anim) this.game.anim.push({ update: updateProj });
    }

    hit(fromX) {
      this.task = { type: 'stun', t: 1.4 };
      this.vx = Math.sign(this.x - fromX || 1) * 5.5; this.vy = 7; this.grounded = null; this.state = 'fall';
      this.path = null;
      if (this.stack.length) { const it = this.dropTop(); if (it) { it.vx = -this.vx * 0.4; it.vy = 5; } }
      this.say('✶ ' + this.langs[0] + '!!', 1.6);
    }

    // ─── AI ───
    think(dt) {
      if (this.state === 'coop' || this.coopAirborne) return;

      // 竞争小队：有目的的巡查、停留、采集、队内跟随与交流；警戒时仍保留语言化解与战斗。
      if (this.team === 'rival') {
        if (this.fainted) return;
        if (this.state === 'climb') return this.doClimb(dt);
        if (!this.grounded) return;
        if (!this.rivalBrain) {
          let seed = [...this.id].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
          const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
          this.rivalBrain = { rand, mode: 'rest', timer: 0.8 + rand() * 2.5, targetX: this.x, item: null };
        }
        const brain = this.rivalBrain, squad = this.game.units.filter(u => u.team === 'rival' && !u.fainted && u.rivalSquadName === this.rivalSquadName);
        const leader = squad[0] || this, leaderIndex = Math.max(0, squad.indexOf(this));
        brain.timer -= dt;
        const clampTarget = x => Math.max(this.grounded.x1 + 0.45, Math.min(this.grounded.x2 - 0.45, x));

        const playerUnits = (this.game.units || []).filter(u => u.team === 'player' && u.recruited && !u.fainted);
        let nearestPlayer = null, minDist = Infinity;
        playerUnits.forEach(u => {
          const d = Math.hypot(u.x - this.x, u.y - this.y);
          if (d < minDist) { minDist = d; nearestPlayer = u; }
        });
        if (nearestPlayer && minDist < 4.2) {
          const shared = (LANG.shared && LANG.shared(this, nearestPlayer)) || [];
          if (shared.length > 0 && !this.hasBeenAttacked && !this.pacified) {
            this.pacified = true; this.vx = 0; brain.mode = 'rest'; brain.timer = 4;
            this.facing = Math.sign(nearestPlayer.x - this.x) || this.facing;
            const sh = shared[0];
            this.say(`${sh} 同行旅人！互不侵犯！(Peace)`, 3.5);
            nearestPlayer.say(`${sh} 愿和平庇佑旅途。(Agreed)`, 3.0);
            this.game.hud.banner(`🕊️ 【语言通意·化解冲突】${nearestPlayer.name}与${this.name}通过【${sh}】达成互不侵犯共识！`, 'story');
            if (window.SFX && SFX.playConfirm) SFX.playConfirm();
            return;
          }
          if (!this.pacified) {
            this.isHostile = true; this.facing = Math.sign(nearestPlayer.x - this.x) || this.facing;
            this.vx = (minDist > 1.8 && minDist < 3.8) ? this.facing * 2.2 : 0;
            this.tryAttack(nearestPlayer, dt);
            return;
          }
        }

        // 附近散落物资会成为真实采集目标，而不是单纯播放巡逻动画。
        if (!brain.item || !brain.item.alive || brain.item.heldBy) {
          brain.item = (this.game.items || []).filter(it => it.alive && !it.heldBy && Math.abs(it.y - this.y) < 1.1 && Math.abs(it.x - this.x) < 7)
            .sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x))[0] || null;
        }
        if (brain.item && Math.abs(brain.item.x - this.x) < 1.15 && this.stack.length < 8) {
          this.pick(brain.item); brain.item = null; brain.mode = 'rest'; brain.timer = 1.2 + brain.rand() * 1.8; this.vx = 0; return;
        }
        if (brain.timer <= 0) {
          if (brain.mode === 'move') {
            brain.mode = brain.rand() < 0.35 ? 'converse' : 'rest'; brain.timer = 1.4 + brain.rand() * 3.8; this.vx = 0;
            if (brain.mode === 'converse') {
              const mate = squad.find(u => u !== this && Math.abs(u.x - this.x) < 3.2);
              if (mate) { this.facing = Math.sign(mate.x - this.x) || this.facing; this.say(`${this.langs[0]} … ${mate.langs[0]}`, 1.8); }
            }
          } else {
            brain.mode = 'move'; brain.timer = 3.5 + brain.rand() * 5;
            if (brain.item) brain.targetX = brain.item.x;
            else if (leader !== this) brain.targetX = leader.x + (leaderIndex % 2 ? 1 : -1) * (0.9 + Math.floor(leaderIndex / 2) * 0.55);
            else brain.targetX = clampTarget(this.x + (brain.rand() - 0.5) * Math.max(3, this.grounded.x2 - this.grounded.x1));
          }
        }
        if (brain.mode === 'move') {
          const target = clampTarget(brain.item ? brain.item.x : brain.targetX), dx = target - this.x;
          if (Math.abs(dx) < 0.22) { brain.timer = 0; this.vx = 0; }
          else { this.facing = Math.sign(dx); this.vx = this.facing * (brain.item ? 1.35 : 0.95); this.state = 'walk'; }
        } else { this.vx = 0; if (this.grounded) this.state = 'idle'; }
        return;
      }

      // 玩家小队自卫反击逻辑（尊重和平停火协议，不攻击已化解敌意的竞争者）
      if (this.recruited && !this.fainted && this.team === 'player') {
        const rivalUnits = (this.game.units || []).filter(u => u.team === 'rival' && !u.fainted);
        let nearestRival = null, minRivalDist = Infinity;
        rivalUnits.forEach(u => {
          const d = Math.hypot(u.x - this.x, u.y - this.y);
          if (d < minRivalDist) { minRivalDist = d; nearestRival = u; }
        });
        if (nearestRival && minRivalDist < 3.5 && (nearestRival.isHostile || !nearestRival.pacified)) {
          this.tryAttack(nearestRival, dt);
        }
      }
      if (this.pending) {
        this.pending.t -= dt;
        if (this.pending.t <= 0) {
          const o = this.pending.order;
          const onDone = this.pending.onDone;
          this.pending = null;
          this.setOrder(o);
          if (onDone) onDone();
          else if (o.utter !== false) this.speak(o.act || 'move');
        }
      }
      if (this.task) return this.doTask(dt);
      if (this.isMerchant) { this.vx = 0; return; }
      if (this.state === 'climb') return this.doClimb(dt);
      if (this.order && this.order.type === 'open_move') {
        if (this.game.openWorld && this.game.openWorld.active) return this.game.openWorld.updateUnitOrder(this, dt);
        this.order = null;
      }
      if (!this.order) { if (this.grounded) this.vx = 0; return; }
      if (this.order.type === 'push' && this.order.goal) {
        const c = this.game.crates.find(cr => Math.abs(cr.x - this.x) < 1.2 && Math.abs(cr.y - this.y) < 1.0);
        if (c && Math.abs(c.x - this.order.goal.x) < 0.25) return this.arrive();
      }
      if (!this.grounded) return;   // 空中，等落地

      // 升降台中途运行过程中禁止中途重寻路打断
      const onMovingLift = this.grounded && this.grounded.key.startsWith('L') && this.game.lifts.some(l => 'L' + l.id === this.grounded.key && l.moving);
      if (onMovingLift) this.replanT = Math.max(this.replanT, 1.0);

      this.replanT -= dt;
      if (!this.path || this.replanT <= 0) {
        const goal = this.order.goalFn ? this.order.goalFn() : this.order.goal;
        if (!goal) { this.order = null; return; }
        const goalSig = `${Math.round(goal.x * 10)}:${Math.round(goal.y * 10)}`;
        if (this.pathGoalSig !== goalSig) { this.path = null; this.pathGoalSig = goalSig; this.replanT = 0; }
        const r = this.game.planFor(this, goal);
        if (!r) { this.vx = 0; return; }
        this.path = r.actions; this.reachable = r.reachable;
        // 多层路径保持更长的执行窗口；只有路径结束、卡住或目标变化时才需要立即重算。
        this.replanT = 3.2;
        if (!r.reachable && !this.warnedUnreach) { this.warnedUnreach = true; this.say(this.langs[0] + ' ' + LANG.ACT.no); }
      }
      // 道具快速拾取判定（若已接近目标道具，直接采收；开放世界地面需同时校验 Z 轴距离）
      if (this.order && this.order.type === 'pick' && this.order.item && this.order.item.alive) {
        const it = this.order.item;
        const zDiff = (this.game.openWorld && this.game.openWorld.active && this.y <= 1.25) ? Math.abs((this.targetZ || 0) - (it.z || 0)) : 0;
        if (Math.abs(it.x - this.x) < 1.4 && Math.abs(it.y - this.y) < 1.6 && zDiff < 1.5) {
          const wasGather = !!this.order.isGatherAll;
          this.pick(it);
          this.order = null;
          this.path = null;
          this.vx = 0;
          this.openMoving = false;
          if (wasGather) this.continueGatherNext();
          return;
        }
      }

      // 跟随队长跨层寻路完成判定：当已接近队长所在高度与位置时，平稳切回常规伴随队形
      if (this.order && this.order.type === 'follow_leader') {
        const leader = (this.game.leader && this.game.leader.recruited && !this.game.leader.fainted) ? this.game.leader : null;
        if (!leader || (Math.abs(leader.y - this.y) <= 1.0 && Math.abs(leader.x - this.x) <= 2.2)) {
          this.order = null;
          this.path = null;
          this.vx = 0;
          this.state = 'idle';
          return;
        }
      }

      const a = this.path[0];
      if (!a) return this.arrive();

      const owGround = !!(this.game.openWorld && this.game.openWorld.active && this.y <= 0.35 && (!a.y || a.y <= 0.35));
      if (a.type === 'walk' || a.type === 'drop') {
        if (owGround && a.type === 'walk') {
          const goalZ = (this.order && this.order.goal && this.order.goal.z !== undefined) ? this.order.goal.z : 0;
          const targetZ = (this.path.length === 1) ? goalZ : 0;
          if (Math.abs((this.targetZ || 0) - targetZ) > 0.65 || !this.game.openWorld.isWalkable(this.x + Math.sign(a.x - this.x) * 0.45, this.targetZ || 0)) {
            if (this.moveGroundXZ(a.x, targetZ, dt)) {
              this.path.shift();
            }
            return;
          }
        }
        const dx = a.x - this.x;
        // 防反复横跳：动态步长与跨越检测，到达阈值直接停步防微小步长反复震荡
        const arriveThresh = Math.max(0.12, Math.abs(this.vx * dt * 1.5));
        if (Math.abs(dx) <= arriveThresh && a.type === 'walk') {
          this.x = a.x;
          this.vx = 0;
          this.path.shift();
          return;
        }
        const dir = Math.sign(dx) || this.facing || 1;
        this.vx = dir * this.speed();
        this.facing = dir;
        if (a.type === 'drop' && Math.abs(dx) < 0.12) this.vx = dir * this.speed();
      } else if (a.type === 'climb') {
        if (this.game.openWorld && this.game.openWorld.active && this.y <= 0.45 && Math.abs(this.targetZ || 0) > 0.85) {
          if (!this.moveGroundXZ(a.x, 0, dt)) return;
        }
        const dx = a.x - this.x;
        // 洞口两侧的接驳点允许直接进入梯井，不能为了对齐梯心而走过已开孔的楼板。
        if (Math.abs(dx) > 0.14 && a.fromX === undefined) { this.vx = Math.sign(dx) * this.speed(); this.facing = Math.sign(dx); return; }
        if (Math.abs(dx) > 1.35) { this.vx = Math.sign(dx) * this.speed(); this.facing = Math.sign(dx); return; }
        this.x = a.x; this.targetZ = 0; this.z = 0; this.vx = 0; this.vy = 0; this.openMoving = false; this.state = 'climb'; this.grounded = null; this.climbTo = a.y;
      } else if (a.type === 'jump') {
        if (this.game.openWorld && this.game.openWorld.active && this.y <= 0.45 && Math.abs(this.targetZ || 0) > 1.2) {
          if (!this.moveGroundXZ(this.x, 0, dt)) return;
        }
        this.targetZ = 0; this.z = 0; this.openMoving = false;
        this.doJump(a.x, a.y);
      } else if (a.type === 'lift') {
        this.doLift(a, dt);
      }
      // 卡住检测（推箱子过程中或站在木箱顶上不触发起跳卡住恢复）
      if (this.vx !== 0) {
        if (this.pushing || (this.order && this.order.type === 'push') || (this.grounded && this.grounded.kind === 'crate')) {
          this.stuckT = 0;
        } else {
          if (Math.abs(this.x - this.lastX) < 0.004) { this.stuckT += dt; } else this.stuckT = Math.max(0, this.stuckT - dt);
          if (this.stuckT > 0.45 && this.grounded) {
            const leader = this.game.leader;
            const isFollowing = !this.order || (this.order && this.order.type === 'follow_leader');
            // 1. 领队在上层：严禁在下层原地起跳，立即停止横向推挤，保持冷静站立！
            if (isFollowing && leader && leader !== this && leader.y > this.y + 0.85) {
              this.vx = 0;
              this.stuckT = 0;
              this.state = 'idle';
              if (this.order && this.order.type === 'follow_leader') {
                this.path = null;
                this.replanT = 1.2;
              }
              return;
            }

            // 2. 检查天花板阻挡：若头顶上方 2.2m 范围内有实体天花板，起跳必撞头穿模，严禁起跳！
            const hasCeiling = (this.game.solids || []).some(b =>
              this.x + HW > b.x1 && this.x - HW < b.x2 && b.y1 > this.y + 0.5 && b.y1 < this.y + 2.3
            );
            if (hasCeiling) {
              this.vx = 0;
              this.stuckT = 0;
              return;
            }

            // 3. 检查前方实体墙高：若前方为高于 1.35m 的高墙/建筑外立面，人不可能跳过，严禁起跳！
            const goalX = (this.order && this.order.goal) ? this.order.goal.x : (this.x + this.facing);
            const dir = Math.sign(goalX - this.x) || this.facing || 1;
            const tallWallAhead = (this.game.solids || []).some(b =>
              (dir > 0 ? (b.x1 >= this.x - 0.25 && b.x1 <= this.x + 0.65) : (b.x2 <= this.x + 0.25 && b.x2 >= this.x - 0.65)) &&
              (b.y2 - this.y > 1.35) && (b.y1 < this.y + 1.2)
            );
            if (tallWallAhead) {
              this.vx = 0;
              this.stuckT = 0;
              if (this.order) {
                this.path = null;
                this.replanT = 1.0;
              }
              return;
            }

            // 4. 仅当前方确有低矮台阶/障碍物（<=1.2m）且跳上去有坚实立足面时，才执行助跳翻越
            const nextG = findGround(this.game, this.x + dir * 0.75, this.y + 0.8, HW, undefined, undefined, this.targetZ);
            if (nextG && nextG.y > this.y + 0.2 && nextG.y <= this.y + 1.35) {
              const riseH = Math.min(1.45, Math.max(0.65, nextG.y - this.y + 0.3));
              this.vx = dir * Math.max(Math.abs(this.vx), 2.2);
              this.vy = Math.sqrt(2 * G * riseH);
              this.grounded = null;
              this.state = 'jump';
              this.stuckT = -0.4;
            } else {
              this.vx = 0;
              this.stuckT = 0;
            }
          }
          if (this.stuckT > 2.5) { this.path = null; this.stuckT = 0; }
        }
      }
      this.lastX = this.x;
    }

    doJump(tx, ty) {
      const h = Math.max(ty - this.y, 0) + 0.55;
      const vy = Math.sqrt(2 * G * h);
      const tUp = vy / G, drop = this.y + h - ty, tDown = Math.sqrt(2 * Math.max(drop, 0.05) / G);
      this.vy = vy; this.vx = (tx - this.x) / (tUp + tDown); this.facing = Math.sign(this.vx) || this.facing;
      this.jumpVX = this.vx; this.grounded = null; this.state = 'jump';
      this.path.shift();
    }

    doClimb(dt) {
      const dy = this.climbTo - this.y;
      const sp = this.climbSpeed();
      this.vx = 0;
      if (Math.abs(dy) <= sp * dt) {
        this.y = this.climbTo; this.state = 'idle'; this.vy = 0;
        // 到达爬梯顶部时，智能寻找两侧更宽阔更安全的落脚面
        const lad = (this.game.ladders || []).find(l => Math.abs(l.x - this.x) < 0.45 && (Math.abs(l.y1 - this.y) < 0.45 || Math.abs(l.y0 - this.y) < 0.45));
        const pathAction = this.path && this.path[0];
        if (pathAction && pathAction.exitX !== undefined) {
          this.x = pathAction.exitX;
        } else if (lad && Math.abs(lad.y1 - this.y) < 0.45) {
          let stepDir = lad.exitDir || 0;
          if (!stepDir) {
            const gRight = findGround(this.game, this.x + 0.95, this.y, HW, undefined, undefined, this.targetZ);
            const gLeft = findGround(this.game, this.x - 0.95, this.y, HW, undefined, undefined, this.targetZ);
            if (gRight && !gLeft) stepDir = 1;
            else if (gLeft && !gRight) stepDir = -1;
            else stepDir = this.facing || 1;
          }
          this.x += stepDir * 0.95;
        }
        const dropKey = this.dropThroughCooldown > 0 ? this.dropThroughKey : null;
        this.grounded = findGround(this.game, this.x, this.y, HW, undefined, undefined, this.targetZ, dropKey);
        if (this.y >= 4.4 && this.x >= 5 && this.x <= 28) {
          this.targetZ = 0;
          if (window.Achievements) window.Achievements.unlock('rooftop_ninja');
        } else if (this.grounded && this.grounded.z !== undefined && this.grounded.z !== 0) {
          this.targetZ = this.grounded.z;
        } else if (this.y <= 0.1 && !this.inInterior) {
          this.targetZ = 0.25;
        } else {
          this.targetZ = 0;
        }
        if (this.path) this.path.shift();
      } else { this.y += Math.sign(dy) * sp * dt; this.climbAnim = (this.climbAnim || 0) + dt; }
      this.checkOverheadClearance(dt);
    }

    doLift(a, dt) {
      const lf = a.lift;
      const onLift = this.grounded && this.grounded.key === 'L' + lf.id;
      if (onLift) {
        this.vx = 0; lf.wants.add(this);
        if (!lf.moving && Math.abs(lf.y - a.toY) < 0.05) { this.path.shift(); this.replanT = 0; }
        return;
      }
      if (!lf.moving && Math.abs(lf.y - a.fromY) < 0.05) {
        lf.boarding.add(this);
        const slot = this.game.liftSlot(lf, this);
        const dx = slot - this.x;
        if (Math.abs(dx) < 0.1) { this.vx = 0; return; }
        this.vx = Math.sign(dx) * this.speed(); this.facing = Math.sign(dx);
      } else {
        lf.calls.add(a.fromY); this.vx = 0;
      }
    }

    arrive() {
      const o = this.order; this.vx = 0; this.path = null;
      const g = this.game;
      if (!o) return;
      if (o.type === 'pick') {
        const it = o.item;
        const wasGather = !!o.isGatherAll;
        if (it && it.alive && Math.abs(it.x - this.x) < 1.6 && Math.abs(it.y - this.y) < 1.8) {
          this.pick(it);
          if (wasGather) this.continueGatherNext();
        } else if (it && it.alive && !o.retried) {
          o.retried = true; this.replanT = 0; this.path = null; return;
        }
      } else if (o.type === 'stele') {
        const s = o.stele;
        if (s.langs.every(l => this.langs.includes(l))) { this.task = { type: 'operate', t: 1.2, done: () => g.activateStele(s, this) }; }
        else { this.say(s.langs.join('') + ' ' + LANG.ACT.no, 2.6); g.hud.banner(`${this.name}读不懂石碑：需要同时懂 ${s.langs.join(' ')} 的人`, 'warn'); }
      } else if (o.type === 'lever') {
        this.task = { type: 'operate', t: 0.9, done: () => g.activateLever(o.lever, this) };
      } else if (o.type === 'build') {
        if (!o.build.done) this.task = { type: 'build', build: o.build, t: 0 };
      } else if (o.type === 'plate' || o.type === 'lift') {
        // 踏板/升降台到达后自动保持驻守，防止被跟随逻辑拉走
        this.holdPos = true;
      } else if (o.type === 'rally') {
        this.holdPos = false;
      } else if (o.type === 'rune' || o.type === 'move' || o.type === 'push') {
        // 到达即驻守
      }
      this.order = null; this.warnedUnreach = false; this.openMoving = false;
    }

    doTask(dt) {
      const t = this.task; this.vx = this.grounded ? 0 : this.vx;
      if (t.type === 'stun') { t.t -= dt; if (t.t <= 0 && this.grounded) { this.task = null; this.path = null; this.replanT = 0; } return; }
      if (t.type === 'operate') { t.t -= dt; if (t.t <= 0) { this.task = null; if (t.done) t.done(); } return; }
      if (t.type === 'hand') return;
      if (t.type === 'build') {
        const b = t.build;
        if (b.done) { this.task = null; return; }
        const wi = this.stack.lastIndexOf('wood');
        if (wi < 0) { this.task = null; this.say('⚒ ' + this.langs[0] + ' ?'); this.game.hud.banner(`木材不够：${b.cost - b.progress} 根木材还缺`, 'warn'); return; }
        this.facing = (b.x1 + b.x2) / 2 > this.x ? 1 : -1;
        t.t += dt;
        const beat = Math.floor(t.t / 0.28);
        if (beat !== t.beat) { t.beat = beat; if (beat % 2 === 1) { SFX.playBuildHammer(); this.game.fx.chips(this.x + this.facing * 0.8, this.y + 0.3); } }
        if (t.t >= 1.4) { t.t = 0; this.stack.splice(wi, 1); this.refreshStack(); this.game.addBuildProgress(b, this); }
      }
    }

    // ─── 物理 ───
    physics(dt) {
      const g = this.game;
      if (this.state === 'climb' || this.state === 'coop') return;

      if (this.dropThroughCooldown > 0) this.dropThroughCooldown -= dt;
      else this.dropThroughKey = null;

      let nx = this.x + this.vx * dt;
      this.pushing = false;

      // 实体墙：碰撞检测与向外推挤（严格防止陷入墙体或逆向穿透）
      for (const b of g.solids) {
        if (g.openWorld && g.openWorld.active && b.z1 !== undefined &&
            ((this.targetZ || 0) < b.z1 - HW || (this.targetZ || 0) > b.z2 + HW)) continue;
        // 地面基底支撑层：站在其表面上方或贴近表面时不作为侧向挤压墙体，彻底杜绝横向弹飞与穿模
        const isGroundBed = (b.kind === 'ground' || b.kind === 'earth') && (this.y >= b.y2 - 0.28);
        if (isGroundBed) continue;

        if (this.y + 1.4 > b.y1 && this.y + 0.05 < b.y2 && nx + HW > b.x1 && nx - HW < b.x2) {
          if (this.x <= b.x1) {
            nx = b.x1 - HW;
          } else if (this.x >= b.x2) {
            nx = b.x2 + HW;
          } else {
            nx = (this.x < (b.x1 + b.x2) / 2) ? b.x1 - HW : b.x2 + HW;
          }
          this.vx = 0;
        }
      }

      if (this.hasteT > 0) this.hasteT -= dt;

      // 推箱子与跳跃翻越
      if (this.vx !== 0) {
        for (const c of g.crates) {
          if (g.openWorld && g.openWorld.active && Math.abs(this.targetZ || 0) > 1.15) continue;
          if (this.y >= c.y + 0.85) continue; // 站在箱顶或高于箱子
          if (this.y + 1.4 < c.y) continue;
          const dir = Math.sign(this.vx);
          if (Math.sign(c.x - this.x) !== dir) continue;
          const edge = c.x - dir * 0.5;
          const over = dir > 0 ? (nx + HW) - edge : edge - (nx - HW);
          if (over > 0 && Math.abs(c.x - nx) < 0.5 + HW + 0.01) {
            // 如果在空中跳跃且脚底接近箱顶，平滑助登踩上箱顶（Step-up Mantle）
            if (!this.grounded) {
              if (this.y >= c.y + 0.6) {
                nx = Math.min(Math.max(nx, c.x - 0.4), c.x + 0.4);
                this.y = c.y + 1.0;
                this.vy = 0;
                this.grounded = { key: 'c' + c.uid, y: c.y + 1.0, kind: 'crate', ref: c };
                this.state = 'idle';
                this.x = nx;
                return;
              }
              if (this.vy > 0.2 || this.y >= c.y + 0.3) {
                continue;
              }
            }
            if (this.grounded) {
              const pushMultiplier = (this.id === 'ghar' || this.role === '开路先锋' || this.role === '开路工兵') ? 2.5 : 1.2;
              const moved = c.tryMove(dir * Math.min(over, 2.4 * dt * pushMultiplier));
              this.pushing = moved !== 0;
            }
            nx = dir > 0 ? c.x - 0.5 - HW : c.x + 0.5 + HW;
          }
        }
      }
      if (this.pushing) this.vx = Math.sign(this.vx) * Math.min(Math.abs(this.vx), 2.4);
      this.x = nx;

      const dropKey = this.dropThroughCooldown > 0 ? this.dropThroughKey : null;

      if (this.grounded && this.vy <= 0) {
        const s = findGround(g, this.x, this.y, HW, undefined, this.grounded, this.targetZ, dropKey);
        if (s) { this.y = s.y; this.grounded = s; this.checkOverheadClearance(dt); return; }
        this.grounded = null;
      }
      this.vy = Math.max(this.vy - G * dt, -24);
      let ny = this.y + this.vy * dt;
      if (this.vy <= 0) {
        const s = landOn(g, this.x, this.y, ny, HW, undefined, this.targetZ, dropKey);
        if (s) {
          const fallH = (this.fallFrom || this.y) - s.y;
          this.y = s.y; this.vy = 0; this.grounded = s;
          if (s.key && s.key.startsWith('roof_')) {
            this.targetZ = s.z !== undefined ? s.z : -2.6;
            if (window.Achievements) window.Achievements.unlock('rooftop_ninja');
          } else if (s.z !== undefined && s.z !== 0) {
            this.targetZ = s.z;
          } else if (this.y <= 0.1 && !this.inInterior) {
            if (g.openWorld && g.openWorld.active) {
              // 连续城区保留真实 XZ 落点，不再拉回旧主街。
            } else if (this.targetZ && this.targetZ < -3.2) {
              // 保留后巷探索深度
            } else {
              this.targetZ = -0.4;
            }
          }
          if (this.state === 'jump' || this.state === 'fall') { this.state = 'idle'; if (this.path && this.path[0] && this.path[0].type === 'drop') this.path.shift(); this.replanT = Math.min(this.replanT, 0.05); }
          this.vx = this.task && this.task.type === 'stun' ? 0 : this.vx;
          if (fallH > 7.5 && !this.task) { this.task = { type: 'stun', t: 1.0 }; this.say('✶…', 1.2); }
          this.fallFrom = null;
          this.checkOverheadClearance(dt);
          return;
        }
      } else {
        // 向上起跳天花板防穿模截断：严格将 ny 限制在实体天花板下方，防止头部没入上层地板
        for (const b of g.solids) {
          if (b.kind === 'ground' || b.kind === 'earth') continue;
          if (this.x + HW > b.x1 && this.x - HW < b.x2) {
            if (this.y + 1.45 <= b.y1 + 0.12 && ny + 1.45 > b.y1) {
              ny = b.y1 - 1.48;
              this.vy = 0;
              if (g.fx && g.fx.dust) g.fx.dust(this.x, ny + 1.45, 3);
              break;
            }
          }
        }
      }
      if (this.fallFrom == null && this.vy <= 0) this.fallFrom = this.y;
      this.y = ny;
      if (this.state !== 'jump') this.state = 'fall';
      this.checkOverheadClearance(dt);
    }

    checkOverheadClearance(dt) {
      if (!this.stack.length) return;
      // 正在攀爬或处于任何梯井垂直开孔通道中（±1.4m 范围内），天顶全贯通，绝不挤落货物
      if (this.state === 'climb') return;
      // 站在建筑屋顶上或室外开阔天台（上方为无遮挡开阔天空），绝不挤落货物
      if (this.grounded && this.grounded.key && this.grounded.key.startsWith('roof_')) return;
      const g = this.game;
      if (g.level && g.level.ladders && g.level.ladders.some(lad => Math.abs(lad[0] - this.x) < 1.4 && this.y >= lad[1] - 0.5 && this.y <= lad[2] + 0.8)) return;

      if (this.squeezeCooldown > 0) this.squeezeCooldown -= dt;
      else this.squeezeCooldown = 0;

      const stackTopY = this.y + 1.88 + (this.stack.length - 1) * 0.42 + 0.38;
      let minClearanceY = 9999;
      let obstacleName = '';

      // 1. 实心顶板/天花板 (g.solids)
      for (const b of g.solids) {
        if (this.x + HW > b.x1 && this.x - HW < b.x2) {
          if (b.y1 >= this.y + 1.3 && b.y1 < minClearanceY) {
            minClearanceY = b.y1;
            obstacleName = '低顶天花板';
          }
        }
      }

      // 2. 悬空栈桥/平台底面 (g.level.plats)
      if (g.level && g.level.plats) {
        for (const p of g.level.plats) {
          if (this.x + HW > p[0] && this.x - HW < p[1]) {
            // 梯洞开孔检查：凡是有爬梯经过、通向或接驳该平台的垂直通道（半径 1.5m 梯井范围内），均视为天顶梯洞完全贯通，绝无上方障碍！
            const hasLadderHole = g.level.ladders && g.level.ladders.some(lad =>
              Math.abs(lad[0] - this.x) < 1.5 && (Math.abs(lad[2] - p[2]) < 0.6 || Math.abs(lad[1] - p[2]) < 0.6 || (p[2] >= lad[1] && p[2] <= lad[2]))
            );
            if (hasLadderHole) continue;

            const platUndersideY = p[2] - 0.22;
            if (platUndersideY >= this.y + 1.3 && platUndersideY < minClearanceY) {
              minClearanceY = platUndersideY;
              obstacleName = '栈桥底板';
            }
          }
        }
      }

      // 3. 悬挂升降台/吊篮 (g.lifts)
      if (g.lifts) {
        for (const lf of g.lifts) {
          if (this.x + HW > lf.x1 && this.x - HW < lf.x2) {
            const liftUndersideY = lf.y - 0.25;
            if (liftUndersideY >= this.y + 1.3 && liftUndersideY < minClearanceY) {
              minClearanceY = liftUndersideY;
              obstacleName = '升降吊篮底板';
            }
          }
        }
      }

      // 4. 建筑门楣与过道 (doorways) —— 屋子再矮也必须容纳头顶背负 2 个物品畅通无阻
      const doorways = (g.level && g.level.doorways) ? g.level.doorways : [];
      for (const d of doorways) {
        if (Math.abs(this.x - d.x) < 1.5) {
          const lintelY = d.y + 3.2; // 门楣高度 3.2m，容纳 2 个物品轻松进出（2 个物品总高约 2.55m）
          if (lintelY >= this.y + 1.3 && lintelY < minClearanceY) {
            minClearanceY = lintelY;
            obstacleName = (d.name || '建筑') + '木门楣';
          }
        }
      }

      // 5. 悬挂绳梯底梁 (仅针对收起的悬挂绳梯，落地绳梯不挤落)
      if (g.level && g.level.ladders) {
        for (const lad of g.level.ladders) {
          if (lad[1] <= this.y + 0.6) continue;
          if (Math.abs(this.x - lad[0]) < 0.65) {
            if (lad[1] >= this.y + 1.3 && lad[1] < minClearanceY) {
              minClearanceY = lad[1];
              obstacleName = '高悬绳梯底梁';
            }
          }
        }
      }

      // 保护机制：彻底避免所谓“层板过低”导致的坠落、物资被夹掉
      // 当通过低矮过道或层板时，角色与背负物资自动弹性俯身微倾通过，绝不强行挤掉脱落物资！
      const isLowClearance = stackTopY > minClearanceY;
      if (isLowClearance) {
        this.ducking = true;
        this.sprite.position.y = 0.70;
        this.sprite.rotation.z = -0.14 * (this.facing || 1);
        if (this.stackGroup) {
          this.stackGroup.position.y = -0.16;
          this.stackGroup.rotation.z = -0.20 * (this.facing || 1);
        }
      } else if (this.ducking) {
        this.ducking = false;
        this.sprite.position.y = 0.86;
        this.sprite.rotation.z = 0;
        if (this.stackGroup) {
          this.stackGroup.position.y = 0;
          this.stackGroup.rotation.z = 0;
        }
      }
    }

    // ─── 动画 ───
    render(dt, t) {
      this.animT += dt;
      let pose = 'idle', frame = Math.floor(this.animT * 2) % 2;
      const carry = this.stack.length > 0;
      if (this.task) {
        if (this.task.type === 'stun') pose = 'stun';
        else if (this.task.type === 'build') { pose = 'hammer'; frame = Math.floor(this.task.t / 0.28) % 2; }
        else if (this.task.type === 'operate') { pose = 'operate'; }
        else if (this.task.type === 'hand') pose = 'hand';
      } else if (this.state === 'climb') { pose = 'climb'; frame = Math.floor((this.climbAnim || 0) * 6) % 2; }
      else if (!this.grounded) pose = 'jump';
      else if (this.pushing) { pose = 'push'; frame = Math.floor(this.animT * 6) % 2; }
      else if (Math.abs(this.vx) > 0.05 || this.openMoving) {
        pose = 'walk';
        frame = Math.floor(this.animT * 9) % 4;
        if ((frame === 1 || frame === 3) && this.lastStepFrame !== frame && this.recruited && this.grounded) {
          this.lastStepFrame = frame;
          const mat = this.grounded.mat === 'wood' ? 'wood' : 'stone';
          SFX.playStep(mat);
        }
      }
      const useCarry = carry && (pose === 'idle' || pose === 'walk' || pose === 'jump');
      const key = pose + frame + (useCarry ? 'c' : '') + '_' + (this.palVersion || 0);
      if (key !== this.drawKey) { this.drawKey = key; PX.drawChar(this.ctx, this.pal, pose, frame, useCarry); this.tex.needsUpdate = true; }

      // Z 轴纵深平滑过渡（建筑室内与室外道路切换）
      if (this.game.openWorld && this.game.openWorld.active) this.z = this.targetZ || 0;
      else this.z += ((this.targetZ || 0) - this.z) * Math.min(1, dt * 6.5);
      const arcZ = (window.WORLD && window.WORLD.arcZ) ? window.WORLD.arcZ(this.x, this.z + 0.15) : (this.z + 0.15);
      const arcYaw = (window.WORLD && window.WORLD.arcYaw) ? window.WORLD.arcYaw(this.x) : 0;
      this.group.position.set(this.x, this.y, arcZ + (LANG.ORDER.indexOf(this.id) * 0.02));
      this.group.rotation.y = arcYaw;
      this.sprite.scale.x = this.facing < 0 && pose !== 'climb' ? -1 : 1;
      this.shadow.visible = !!this.grounded;

      // 昏迷状态姿态控制
      if (this.fainted) {
        this.sprite.rotation.z = -Math.PI / 2;
        this.sprite.position.y = 0.28;
      } else {
        this.sprite.rotation.z = 0;
        this.sprite.position.y = 0.86;
      }

      // 3D 实体物资随步伐真实晃动
      const sway = pose === 'walk' ? Math.sin(this.animT * 9) : 0;
      this.stackMeshes.forEach((m, i) => {
        m.position.x = sway * 0.04 * (i + 1);
        m.rotation.z = -sway * 0.035 * (i + 1);
        m.position.y = 1.88 + i * 0.42 + (pose === 'walk' ? Math.abs(Math.sin(this.animT * 9)) * 0.05 : 0);
      });

      // 民主领队 3D 浮动皇冠与光环跟随
      const isLeader = (this.game.leader === this);
      if (this.crown) {
        this.crown.visible = isLeader && !this.fainted && this.recruited;
        if (this.crown.visible) {
          const topCargoY = this.stack.length > 0 ? (1.88 + this.stack.length * 0.42 + 0.35) : 2.15;
          this.crown.position.set(0, topCargoY + Math.sin(t * 4) * 0.08, 0.1);
        }
      }

      // 光圈
      const sel = this.selected;
      this.ring.visible = this.recruited && (sel || this.detached || this.fainted || isLeader);
      if (this.ring.visible) {
        if (this.fainted) {
          this.ring.material.color.set('#ff4757');
          const s = 1.1 + Math.sin(t * 8) * 0.12; this.ring.scale.set(s, s, s);
          this.ring.material.opacity = 0.95;
        } else if (isLeader) {
          this.ring.material.color.set('#ffe66d');
          const s = 1.18 + Math.sin(t * 6) * 0.12; this.ring.scale.set(s, s, s);
          this.ring.material.opacity = 1.0;
        } else {
          this.ring.material.color.set(sel ? '#ffd24a' : '#4fe0e0');
          const s = 1 + Math.sin(t * 5 + this.x) * 0.08; this.ring.scale.set(s, s, s);
          this.ring.material.opacity = sel ? 0.95 : 0.6;
        }
      }
      // 未入队者变暗
      this.sprite.material.color.set(this.recruited ? '#ffffff' : '#c8c8d8');
    }

    dispose() { this.game.entRoot.remove(this.group); }
  }

  // ───────────────────────── 木箱 ─────────────────────────
  class Crate {
    constructor(game, x, y) {
      this.game = game; this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.grounded = null; this.kind = 'crate';
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ map: game.crateTex }));
      m.castShadow = true; m.receiveShadow = true; game.entRoot.add(m); this.mesh = m;
    }
    tryMove(dx) {
      const g = this.game;
      let nx = this.x + dx;
      for (const b of g.solids) if (this.y + 0.95 > b.y1 && this.y + 0.05 < b.y2 && nx + 0.49 > b.x1 && nx - 0.49 < b.x2) return 0;
      for (const c of g.crates) if (c !== this && Math.abs(c.y - this.y) < 0.9 && Math.abs(c.x - nx) < 0.98) return 0;
      const moved = nx - this.x; this.x = nx; return moved;
    }
    physics(dt) {
      const g = this.game;
      if (this.grounded) {
        const s = findGround(g, this.x, this.y, 0.0, this);
        if (s) { this.y = s.y; this.grounded = s; return; }
        this.grounded = null; this.vx = 0;
      }
      this.vy = Math.max(this.vy - G * dt, -24);
      const ny = this.y + this.vy * dt;
      const s = this.vy <= 0 ? landOn(g, this.x, this.y, ny, 0.0, this) : null;
      if (s) {
        if (this.vy < -8) {
          SFX.playThunder();
          g.shake(0.25);
          g.fx.dust(this.x, s.y);
          if (window.Achievements) window.Achievements.unlock('demolition_boss');
        }
        this.y = s.y; this.vy = 0; this.grounded = s;
      }
      else this.y = ny;
      if (this.y < g.level.voidY) this.remove();
    }
    render() {
      const arcZ = (window.WORLD && window.WORLD.arcZ) ? window.WORLD.arcZ(this.x, 0.0) : 0.0;
      const arcYaw = (window.WORLD && window.WORLD.arcYaw) ? window.WORLD.arcYaw(this.x) : 0;
      this.mesh.position.set(this.x, this.y + 0.5, arcZ);
      this.mesh.rotation.y = arcYaw;
    }
    remove() { this.game.entRoot.remove(this.mesh); const i = this.game.crates.indexOf(this); if (i >= 0) this.game.crates.splice(i, 1); }
  }

  // ───────────────────────── 地上的物资 ─────────────────────────
  class Item {
    constructor(game, type, x, y) {
      this.game = game; this.type = type; this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.grounded = null; this.alive = true; this.kind = 'item';
      this.weight = WEIGHT[type] || 0.25;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: game.itemTex(type), transparent: true, alphaTest: 0.3 }));
      game.entRoot.add(m); this.mesh = m; this.bob = Math.random() * 6;
    }
    physics(dt) {
      const g = this.game;
      if (this.grounded) {
        const s = findGround(g, this.x, this.y, 0.0);
        if (s) { this.y = s.y; this.grounded = s; this.vx = 0; return; }
        this.grounded = null;
      }
      this.vy = Math.max(this.vy - G * dt, -24);
      let nx = this.x + this.vx * dt;
      for (const b of g.solids) if (this.y + 0.4 > b.y1 && this.y < b.y2 && nx + 0.2 > b.x1 && nx - 0.2 < b.x2) { nx = this.x; this.vx = 0; }
      this.x = nx;
      const ny = this.y + this.vy * dt;
      const s = this.vy <= 0 ? landOn(g, this.x, this.y, ny, 0.0) : null;
      if (s) {
        if (Math.abs(this.vy) > 1.8) {
          this.vy = -this.vy * 0.35;
          this.vx *= 0.5;
          this.y = s.y + 0.02;
        } else {
          this.y = s.y; this.vy = 0; this.grounded = s; this.vx = 0;
        }
      }
      else this.y = ny;
      if (this.y < g.level.voidY) this.remove();
    }
    render(dt, t) {
      const arcZ = (window.WORLD && window.WORLD.arcZ) ? window.WORLD.arcZ(this.x, 0.35) : 0.35;
      const arcYaw = (window.WORLD && window.WORLD.arcYaw) ? window.WORLD.arcYaw(this.x) : 0;
      this.mesh.position.set(this.x, this.y + 0.32 + (this.grounded ? Math.sin(t * 2 + this.bob) * 0.03 : 0), arcZ);
      this.mesh.rotation.y = arcYaw;
    }
    remove() { this.alive = false; this.game.entRoot.remove(this.mesh); const i = this.game.items.indexOf(this); if (i >= 0) this.game.items.splice(i, 1); }
  }

  // ───────────────────────── 松动石块 ─────────────────────────
  class Rock {
    constructor(game, x, y) {
      this.game = game; this.x = x; this.y = y; this.y0 = y; this.vx = 0; this.vy = 0; this.rot = 0; this.state = 'hang'; this.wobble = 0;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.9), new THREE.MeshLambertMaterial({ map: WORLD.stoneTex(PX.shade(game.level.theme.stone, -0.15), 0.5, 0.5, 71) }));
      m.castShadow = true; game.entRoot.add(m); this.mesh = m;
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.06), new THREE.MeshBasicMaterial({ color: '#3a3028' }));
      crack.position.set(0, 0.05, 0.46); crack.rotation.z = 0.5; m.add(crack);
    }
    release() { if (this.state !== 'hang') return; this.state = 'fall'; this.vx = (Math.random() - 0.5) * 1.5; this.vy = 0.5; }
    update(dt) {
      const g = this.game;
      if (this.state === 'hang') { this.rot = Math.sin(g.time * 30) * this.wobble * 0.08; return; }
      if (this.state === 'done') return;
      this.vy = Math.max(this.vy - G * dt, -24);
      const ny = this.y + this.vy * dt;
      this.x += this.vx * dt; this.rot += dt * 6 * Math.sign(this.vx || 1);
      // 撞人
      if (this.vy < -3) for (const u of g.units) {
        if (u.task && u.task.type === 'stun') continue;
        if (Math.abs(u.x - this.x) < 0.65 && ny < u.y + 1.6 && ny > u.y - 0.2) { u.hit(this.x); this.vx = -this.vx * 0.5 + (this.x < u.x ? -1.5 : 1.5); this.vy *= 0.4; SFX.playThunder(); g.shake(0.3); }
      }
      if (this.vy <= 0 && this.y < this.y0 - 0.6) {
        const s = landOn(g, this.x, this.y, ny, 0.0);
        if (s) {
          g.fx.dust(this.x, s.y);
          if (this.vy < -6) { this.vy = -this.vy * 0.25; this.vx *= 0.5; this.y = s.y + 0.01; SFX.playThunder(); g.shake(0.35); return; }
          this.state = 'done'; g.entRoot.remove(this.mesh);
          const it = g.spawnItem('stone', this.x, s.y); it.grounded = s;
          return;
        }
      }
      this.y = ny;
      if (this.y < g.level.voidY) { this.state = 'done'; g.entRoot.remove(this.mesh); }
    }
    render() { this.mesh.position.set(this.x, this.y + 0.35, 0.05); this.mesh.rotation.z = this.rot; }
  }

  window.ENT = { Unit, Crate, Item, Rock, findGround, MAX_STACK, WEIGHT };
})();
