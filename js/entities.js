// 实体：队员（像素角色 + 竖向物资堆叠）、木箱、物资、落石
(function () {
  const G = 32;
  const HW = 0.28;            // 队员半宽
  const MAX_STACK = 24;
  const WEIGHT = { bread: 0.25, wood: 0.5, stone: 1 };

  function findGround(game, x, y, hw, exclude, current) {
    let best = null;
    for (const s of game.supports) {
      if (exclude !== undefined && s.ref === exclude) continue;
      if (x < s.x1 - hw || x > s.x2 + hw) continue;
      if (s.y > y + 0.14 || s.y < y - 0.2) continue;
      if (!best || s.y > best.y) {
        best = s;
      } else if (Math.abs(s.y - best.y) < 0.05) {
        // 保持现有支撑面，避免共面物体（地面与升降台）之间互相抖动劫持
        if (current && (s.key === current.key || s.ref === current.ref)) best = s;
        else if (s.kind === 'crate') best = s;
      }
    }
    return best;
  }
  function landOn(game, x, yPrev, yNew, hw, exclude) {
    let best = null;
    for (const s of game.supports) {
      if (exclude !== undefined && s.ref === exclude) continue;
      if (x < s.x1 - hw || x > s.x2 + hw) continue;
      if (s.y > yPrev + 0.001 || s.y < yNew) continue;
      if (!best || s.y > best.y || (s.y === best.y && s.kind !== 'solid')) best = s;
    }
    return best;
  }

  // 3D 实体物资网格工厂（真实竖向堆叠在头顶，随迈步微幅晃动）
  class CargoMeshFactory {
    constructor() {
      this.matBreadBag = new THREE.MeshLambertMaterial({ color: 0xdfab42 });
      this.matBreadCord = new THREE.MeshLambertMaterial({ color: 0xb53225 });
      this.matWoodLog = new THREE.MeshLambertMaterial({ color: 0x9b5f2a });
      this.matWoodCord = new THREE.MeshLambertMaterial({ color: 0x4a3420 });
      this.matStoneBlock = new THREE.MeshLambertMaterial({ color: 0xb8ad98 });
      this.matStoneTrim = new THREE.MeshLambertMaterial({ color: 0x766c5a });
    }

    createMesh(type) {
      const g = new THREE.Group();
      if (type === 'bread') {
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.32, 0.52), this.matBreadBag);
        bag.castShadow = true; bag.receiveShadow = true;
        const cord = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.56), this.matBreadCord);
        g.add(bag, cord);
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
    constructor(game, id, x, y, recruited) {
      const def = LANG.MEMBERS[id] || { name: `旅人 #${id}`, langs: ['A'], pal: 0 };
      this.game = game; this.id = id; this.name = def.name; this.langs = def.langs; this.pal = def.pal;
      this.recruited = recruited; this.detached = false;
      this.x = x; this.y = y; this.z = 0; this.targetZ = 0; this.inInterior = false;
      this.vx = 0; this.vy = 0; this.facing = 1;
      this.grounded = null; this.state = 'idle';
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
      this.group = g; this.game.entRoot.add(g);
      this.drawKey = '';
    }

    get selected() { return this.game.selection.has(this); }
    get load() { return this.stack.length; }
    maxRise() { return 1.9 - 0.2 * this.stack.length; }
    speed() {
      if (this.fainted) return 0;
      return 3.4 * (1 - 0.1 * this.stack.length) * this.game.hungerFactor();
    }
    climbSpeed() {
      if (this.fainted) return 0;
      return 2.6 * (1 - 0.13 * this.stack.length) * this.game.hungerFactor();
    }

    say(text, dur = 2.4) {
      this.game.hud.bubble(this, text, dur);
      SFX.playBabble(this.id, text);
    }
    speak(act, dur) { const u = LANG.utter(this.langs, act); this.say(u.text, dur); return u; }

    setOrder(order) {
      if (this.fainted) return;
      this.order = order; this.path = null; this.replanT = 0; this.stuckT = 0;
      if (this.task && this.task.type !== 'stun') this.task = null;
    }

    pick(item) {
      if (this.fainted) return false;
      if (this.stack.length >= MAX_STACK) { this.say('✋ ' + this.langs[0] + ' ul… (背负已满)'); return false; }
      this.stack.push(item.type); item.remove(); SFX.playPickUp(); this.refreshStack(); return true;
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

    hit(fromX) {
      this.task = { type: 'stun', t: 1.4 };
      this.vx = Math.sign(this.x - fromX || 1) * 5.5; this.vy = 7; this.grounded = null; this.state = 'fall';
      this.path = null;
      if (this.stack.length) { const it = this.dropTop(); if (it) { it.vx = -this.vx * 0.4; it.vy = 5; } }
      this.say('✶ ' + this.langs[0] + '!!', 1.6);
    }

    // ─── AI ───
    think(dt) {
      if (this.state === 'coop') return;
      if (this.pending) { this.pending.t -= dt; if (this.pending.t <= 0) { const o = this.pending.order; this.pending = null; this.setOrder(o); if (o.utter !== false) this.speak(o.act || 'move'); } }
      if (this.task) return this.doTask(dt);
      if (!this.order) { if (this.grounded) this.vx = 0; return; }
      if (this.order.type === 'push' && this.order.goal) {
        const c = this.game.crates.find(cr => Math.abs(cr.x - this.x) < 1.2 && Math.abs(cr.y - this.y) < 1.0);
        if (c && Math.abs(c.x - this.order.goal.x) < 0.25) return this.arrive();
      }
      if (this.state === 'climb') return this.doClimb(dt);
      if (!this.grounded) return;   // 空中，等落地

      // 升降台中途运行过程中禁止中途重寻路打断
      const onMovingLift = this.grounded && this.grounded.key.startsWith('L') && this.game.lifts.some(l => 'L' + l.id === this.grounded.key && l.moving);
      if (onMovingLift) this.replanT = Math.max(this.replanT, 1.0);

      this.replanT -= dt;
      if (!this.path || this.replanT <= 0) {
        const goal = this.order.goalFn ? this.order.goalFn() : this.order.goal;
        if (!goal) { this.order = null; return; }
        const r = this.game.planFor(this, goal);
        if (!r) { this.vx = 0; return; }
        this.path = r.actions; this.reachable = r.reachable;
        this.replanT = 1.4;
        if (!r.reachable && !this.warnedUnreach) { this.warnedUnreach = true; this.say(this.langs[0] + ' ' + LANG.ACT.no); }
      }
      const a = this.path[0];
      if (!a) return this.arrive();

      if (a.type === 'walk' || a.type === 'drop') {
        const dx = a.x - this.x;
        if (Math.abs(dx) < 0.08 && a.type === 'walk') { this.vx = 0; this.path.shift(); return; }
        this.vx = Math.sign(dx) * this.speed(); this.facing = Math.sign(dx);
        if (a.type === 'drop' && Math.abs(dx) < 0.1) this.vx = Math.sign(dx || this.facing) * this.speed();
      } else if (a.type === 'climb') {
        const dx = a.x - this.x;
        if (Math.abs(dx) > 0.12) { this.vx = Math.sign(dx) * this.speed(); this.facing = Math.sign(dx); return; }
        this.x = a.x; this.vx = 0; this.vy = 0; this.state = 'climb'; this.grounded = null; this.climbTo = a.y;
      } else if (a.type === 'jump') {
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
          if (this.stuckT > 0.45 && this.grounded) { this.vy = Math.sqrt(2 * G * 1.25); this.grounded = null; this.state = 'jump'; this.stuckT = -0.3; }
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
        this.grounded = findGround(this.game, this.x, this.y, HW);
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
        if (it.alive && Math.abs(it.x - this.x) < 1.0 && Math.abs(it.y - this.y) < 1.0) this.pick(it);
        else if (it.alive && !o.retried) { o.retried = true; this.replanT = 0; this.path = null; return; }
      } else if (o.type === 'stele') {
        const s = o.stele;
        if (s.langs.every(l => this.langs.includes(l))) { this.task = { type: 'operate', t: 1.2, done: () => g.activateStele(s, this) }; }
        else { this.say(s.langs.join('') + ' ' + LANG.ACT.no, 2.6); g.hud.banner(`${this.name}读不懂石碑：需要同时懂 ${s.langs.join(' ')} 的人`, 'warn'); }
      } else if (o.type === 'lever') {
        this.task = { type: 'operate', t: 0.9, done: () => g.activateLever(o.lever, this) };
      } else if (o.type === 'build') {
        if (!o.build.done) this.task = { type: 'build', build: o.build, t: 0 };
      } else if (o.type === 'rune' || o.type === 'move' || o.type === 'plate' || o.type === 'lift' || o.type === 'push' || o.type === 'rally') {
        // 到达即驻守
      }
      this.order = null; this.warnedUnreach = false;
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
      let nx = this.x + this.vx * dt;
      this.pushing = false;
      // 实体墙
      for (const b of g.solids) {
        if (this.y + 1.4 > b.y1 && this.y + 0.05 < b.y2 && nx + HW > b.x1 && nx - HW < b.x2) {
          if (this.x <= b.x1) nx = b.x1 - HW; else if (this.x >= b.x2) nx = b.x2 + HW;
          else nx = this.x;
        }
      }
      // 推箱子与跳跃翻越
      if (this.vx !== 0) {
        for (const c of g.crates) {
          if (this.y >= c.y + 0.85) continue; // 站在箱顶或高于箱子
          if (this.y + 1.4 < c.y) continue;
          const dir = Math.sign(this.vx);
          if (Math.sign(c.x - this.x) !== dir) continue;
          const edge = c.x - dir * 0.5;
          const over = dir > 0 ? (nx + HW) - edge : edge - (nx - HW);
          if (over > 0 && Math.abs(c.x - nx) < 0.5 + HW + 0.01) {
            // 如果在空中向上跳跃且脚底接近箱顶高度，允许向前翻越跳上箱子
            if (!this.grounded && (this.vy > 0.5 || this.y > c.y + 0.35)) {
              continue;
            }
            if (this.grounded) {
              const moved = c.tryMove(dir * Math.min(over, 2.4 * dt * 1.2));
              this.pushing = moved !== 0;
            }
            nx = dir > 0 ? c.x - 0.5 - HW : c.x + 0.5 + HW;
          }
        }
      }
      if (this.pushing) this.vx = Math.sign(this.vx) * Math.min(Math.abs(this.vx), 2.4);
      this.x = nx;

      if (this.grounded && this.vy <= 0) {
        const s = findGround(g, this.x, this.y, HW, undefined, this.grounded);
        if (s) { this.y = s.y; this.grounded = s; this.checkOverheadClearance(dt); return; }
        this.grounded = null;
      }
      this.vy = Math.max(this.vy - G * dt, -24);
      const ny = this.y + this.vy * dt;
      if (this.vy <= 0) {
        const s = landOn(g, this.x, this.y, ny, HW);
        if (s) {
          const fallH = (this.fallFrom || this.y) - s.y;
          this.y = s.y; this.vy = 0; this.grounded = s;
          if (this.state === 'jump' || this.state === 'fall') { this.state = 'idle'; if (this.path && this.path[0] && this.path[0].type === 'drop') this.path.shift(); this.replanT = Math.min(this.replanT, 0.05); }
          this.vx = this.task && this.task.type === 'stun' ? 0 : this.vx;
          if (fallH > 7.5 && !this.task) { this.task = { type: 'stun', t: 1.0 }; this.say('✶…', 1.2); }
          this.fallFrom = null;
          this.checkOverheadClearance(dt);
          return;
        }
      } else {
        for (const b of g.solids) if (this.x + HW > b.x1 && this.x - HW < b.x2 && this.y + 1.5 <= b.y1 + 0.01 && ny + 1.5 > b.y1) { this.vy = 0; break; }
      }
      if (this.fallFrom == null && this.vy <= 0) this.fallFrom = this.y;
      this.y = ny;
      if (this.state !== 'jump') this.state = 'fall';
      this.checkOverheadClearance(dt);
    }

    checkOverheadClearance(dt) {
      if (!this.stack.length) return;
      if (this.state === 'climb') return; // 爬梯通道垂直贯通开孔，绝不挤落货物
      if (this.squeezeCooldown > 0) this.squeezeCooldown -= dt;
      else this.squeezeCooldown = 0;

      const g = this.game;
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
            // 梯洞开孔检查：如果有爬梯通往或穿过该平台，此处为垂直通道开孔，不视为上方障碍
            const hasLadderHole = g.level.ladders && g.level.ladders.some(lad =>
              Math.abs(lad[0] - this.x) < 0.85 && lad[2] >= p[2] - 0.2
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
        if (Math.abs(this.x - d.x) < 1.1) {
          const lintelY = d.y + 2.95; // 门楣高度 2.95m，容纳 2 个物品轻松进出（2 个物品总高约 2.55m）
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

      // 超出高度被挤落！
      if (stackTopY > minClearanceY && this.squeezeCooldown <= 0) {
        this.squeezeCooldown = 0.2;
        const dropped = this.dropTop();
        if (dropped) {
          dropped.vx = (Math.random() - 0.5) * 2.6 - (this.facing || 1) * 1.4;
          dropped.vy = 3.2;
          if (g.fx && g.fx.dust) g.fx.dust(this.x, dropped.y, 6);
          if (SFX.playHit) SFX.playHit();
          this.say(`哎呀！${obstacleName || '过道'}太低，头顶货物被挤掉了！`, 2.0);
          g.hud.banner(`⚠️ 空间过窄！${this.name} 头顶货物撞上【${obstacleName || '上方障碍'}】，脱落掉地！`, 'warn');
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
      else if (Math.abs(this.vx) > 0.05) {
        pose = 'walk';
        frame = Math.floor(this.animT * 9) % 4;
        if ((frame === 1 || frame === 3) && this.lastStepFrame !== frame && this.recruited && this.grounded) {
          this.lastStepFrame = frame;
          const mat = this.grounded.mat === 'wood' ? 'wood' : 'stone';
          SFX.playStep(mat);
        }
      }
      const useCarry = carry && (pose === 'idle' || pose === 'walk' || pose === 'jump');
      const key = pose + frame + (useCarry ? 'c' : '');
      if (key !== this.drawKey) { this.drawKey = key; PX.drawChar(this.ctx, this.pal, pose, frame, useCarry); this.tex.needsUpdate = true; }

      // Z 轴纵深平滑过渡（建筑室内与室外道路切换）
      this.z += ((this.targetZ || 0) - this.z) * Math.min(1, dt * 6.5);
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

      // 光圈
      const sel = this.selected;
      this.ring.visible = this.recruited && (sel || this.detached || this.fainted);
      if (this.ring.visible) {
        if (this.fainted) {
          this.ring.material.color.set('#ff4757');
          const s = 1.1 + Math.sin(t * 8) * 0.12; this.ring.scale.set(s, s, s);
          this.ring.material.opacity = 0.95;
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
      if (s) { if (this.vy < -8) { SFX.playThunder(); g.shake(0.25); g.fx.dust(this.x, s.y); } this.y = s.y; this.vy = 0; this.grounded = s; }
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
