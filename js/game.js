// 巴别：失落的同位语 —— 主引擎
(function () {
  const $ = (id) => document.getElementById(id);
  const HOP = 0.22;

  // ───────── 粒子 ─────────
  class FX {
    constructor(game) { this.game = game; this.parts = []; this.geo = new THREE.PlaneGeometry(1, 1); }
    spawn(x, y, n, color, spd, life, size, grav = 18) {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
        const s = size * (0.6 + Math.random() * 0.8); m.scale.set(s, s, 1);
        m.position.set(x, y, 0.6); this.game.entRoot.add(m);
        const a = Math.random() * Math.PI * 2;
        this.parts.push({ m, vx: Math.cos(a) * spd * Math.random(), vy: Math.abs(Math.sin(a)) * spd + spd * 0.3, life, max: life, grav, rot: (Math.random() - 0.5) * 12 });
      }
    }
    chips(x, y) { this.spawn(x, y, 6, '#c8904a', 4, 0.6, 0.12); this.spawn(x, y, 3, '#f0d090', 3, 0.5, 0.08); }
    dust(x, y) { this.spawn(x, y + 0.1, 10, '#e8dcc0', 3, 0.9, 0.25, 3); }
    sparkle(x, y) { this.spawn(x, y, 14, '#ffe68a', 4, 1.0, 0.14, -2); }
    update(dt) {
      this.parts = this.parts.filter(p => {
        p.life -= dt; if (p.life <= 0) { this.game.entRoot.remove(p.m); p.m.material.dispose(); return false; }
        p.vy -= p.grav * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.rotation.z += p.rot * dt;
        p.m.material.opacity = Math.min(1, p.life / p.max * 1.5); return true;
      });
    }
    clear() { this.parts.forEach(p => this.game.entRoot.remove(p.m)); this.parts = []; }
  }

  class Game {
    constructor() {
      this.container = $('canvas-container');
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.container.appendChild(this.renderer.domElement);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.5, 600);
      this.cam = { x: 10, y: 4, dist: 30 }; this.camT = { x: 10, y: 4, dist: 30 }; this.follow = true;
      this.shakeT = 0; this.shakeA = 0;
      this.hud = new HUD(this); this.fx = new FX(this);
      this.selection = new Set(); this.units = []; this.crates = []; this.items = []; this.rocks = [];
      this.chain = { links: [], parent: new Map(), connected: new Set() };
      this.time = 0; this.levelTime = 0; this.state = 'title';
      this.party = ['ash', 'akad']; this.stacks = {}; this.runesTotal = 0; this.food = 100; this.playTime = 0;
      this.crateTex = PX.tex(PX.crateCanvas()); this.itemTexCache = {};
      this.showLinks = true; this.linkLines = [];
      this.occlusionRaycaster = new THREE.Raycaster();
      this.mouseRaycaster = new THREE.Raycaster();
      this.fadedMeshes = new Set();
      this.teamSignal = { learned: false, proficiency: 0.75, timesTaught: 0 };
      this.relicsInspected = new Set();
      this.openSourceDone = false;
      this.keys = {};
      this.bindInput();
      window.addEventListener('resize', () => this.resize());
      this.last = performance.now();
      this.setupTitle();
      requestAnimationFrame(() => this.loop());
    }

    itemTex(type) { if (!this.itemTexCache[type]) this.itemTexCache[type] = PX.tex(PX.itemCanvas(type)); return this.itemTexCache[type]; }
    resize() { this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(window.innerWidth, window.innerHeight); this.hud.layoutChain(); }

    // ═══════════════════ 标题与存档 ═══════════════════
    unlocked() { return Math.max(LEVELS.length, parseInt(localStorage.getItem('babel_unlocked') || '5', 10)); }
    setupTitle() {
      localStorage.setItem('babel_unlocked', String(LEVELS.length));
      const list = $('level-select'); list.innerHTML = '';
      LEVELS.forEach((lv, i) => {
        const b = document.createElement('button'); b.className = 'lv-btn';
        b.innerHTML = `<b>${lv.id}</b><span>${lv.name}</span>`;
        b.disabled = false; // 全部关卡已解锁方便随时测试
        b.onclick = () => { SFX.playUIClick(); this.startGame(i); };
        list.appendChild(b);
      });
      $('btn-start').onclick = () => { SFX.playUIConfirm(); this.startGame(0); };
      const btnTitleAch = $('btn-title-achieve');
      if (btnTitleAch) {
        btnTitleAch.onclick = () => {
          SFX.playUIClick();
          if (window.Achievements) window.Achievements.openModal();
        };
      }
      document.body.classList.add('title-mode');
      $('title-screen').classList.add('on');
      // 标题背景：先构建第一层作为背景
      this.loadLevel(0, { preview: true });
      this.setupQuickLevelSwitcher();
    }
    setupQuickLevelSwitcher() {
      const header = document.querySelector('#lv-card .lv-header');
      if (!header || header.dataset.bound) return;
      header.dataset.bound = '1';
      header.style.cursor = 'pointer';
      header.title = '点击快速选关（也可按 Alt+1~5 或 F1~F5）';

      let menu = $('quick-level-menu');
      if (!menu) {
        menu = document.createElement('div');
        menu.id = 'quick-level-menu';
        menu.style.cssText = 'display:none; position:absolute; top:72px; left:0; z-index:999; background:rgba(18,22,30,0.95); border:1px solid rgba(212,175,55,0.45); border-radius:8px; padding:6px; box-shadow:0 8px 30px rgba(0,0,0,0.7); backdrop-filter:blur(8px); min-width:240px;';
        LEVELS.forEach((lv, i) => {
          const item = document.createElement('div');
          item.className = 'quick-level-item';
          item.style.cssText = 'padding:7px 12px; margin:3px 0; border-radius:4px; font-family:"Cinzel","Noto Serif SC",serif; font-size:13px; color:#e8dfcf; cursor:pointer; display:flex; align-items:center; gap:8px; transition:all 0.15s;';
          item.innerHTML = `<span style="color:#d4af37; font-weight:bold; font-size:14px; min-width:18px;">${lv.id}</span> <span style="font-weight:600;">${lv.name}</span> <small style="margin-left:auto; color:#9aa; font-size:11px;">${lv.sub.split('·')[0]}</small>`;
          item.onmouseenter = () => { item.style.background = 'rgba(212,175,55,0.22)'; item.style.transform = 'translateX(3px)'; };
          item.onmouseleave = () => { item.style.background = 'transparent'; item.style.transform = 'none'; };
          item.onclick = (e) => {
            e.stopPropagation();
            menu.style.display = 'none';
            this.startGame(i);
          };
          menu.appendChild(item);
        });
        $('lv-card').appendChild(menu);
      }

      header.onclick = (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      };
      window.addEventListener('click', () => { if (menu) menu.style.display = 'none'; });
    }
    startGame(i) {
      SFX.init();
      SFX.startBGM();
      document.body.classList.remove('title-mode');
      $('title-screen').classList.remove('on');
      const menu = $('quick-level-menu'); if (menu) menu.style.display = 'none';
      // 跳关时补全队伍（工兵团全员随关卡逐步充实）
      const need = [
        ['ash', 'akad'],
        ['ash', 'akad', 'enki', 'bani', 'ghar'],
        ['ash', 'akad', 'enki', 'bani', 'ghar', 'sofi'],
        ['ash', 'akad', 'enki', 'bani', 'ghar', 'sofi', 'io'],
        ['ash', 'akad', 'enki', 'bani', 'ghar', 'sofi', 'io', 'ul']
      ][i];
      this.party = need.slice(); this.stacks = {}; this.food = 100; this.runesTotal = parseInt(localStorage.getItem('babel_runes') || '0', 10);
      if (i === 0) this.runesTotal = 0;
      this.loadLevel(i);
      this.setupQuickLevelSwitcher();
    }

    // ═══════════════════ 关卡加载 ═══════════════════
    clearLevel() {
      if (this.world) this.scene.remove(this.world.root);
      if (this.entRoot) this.scene.remove(this.entRoot);
      this.linkLines = [];
      this.hud.clearBubbles(); this.fx.parts = [];
      this.units = []; this.crates = []; this.items = []; this.rocks = []; this.selection.clear();
      this.coopActive = false; this.hideCoopPrompt();
    }

    loadLevel(idx, opts = {}) {
      this.clearLevel();
      const lv = LEVELS[idx]; this.levelIdx = idx; this.level = lv;
      this.plates = lv.plates.map(p => ({ ...p, pressed: false, ever: false, need: p.need || 1 }));
      this.gates = lv.gates.map(g => ({ ...g, open: 0, ever: false }));
      this.lifts = lv.lifts.map(l => ({ ...l, y: l.y0, target: l.y0, moving: false, wants: new Set(), boarding: new Set(), calls: new Set(), arrivalSet: new Set(), stillT: 0 }));
      this.bridges = lv.bridges.map(b => ({ ...b, ext: 0 }));
      this.builds = lv.builds.map(b => ({ ...b, progress: 0, done: false }));
      this.steles = lv.steles.map(s => ({ ...s, active: false }));
      this.levers = lv.levers.map(l => ({ ...l, active: false }));
      this.ladders = lv.ladders.map(([x, y0, y1, trigger]) => ({ x, y0, y1, trigger }));
      this.runes = lv.runes.map(([x, y]) => ({ x, y })); this.runesHere = 0;
      this.checkpoints = lv.checkpoints.map(([x, y]) => ({ x, y, reached: false }));
      this.exit = lv.exit ? { ...lv.exit } : null;
      this.entRoot = new THREE.Group(); this.scene.add(this.entRoot);
      this.world = WORLD.build(this, lv);
      this.checkpoint = { x: lv.spawn.x, y: lv.spawn.y };
      this.uidSeq = 1;

      if (!opts.preview) {
        if (idx > 0 && window.Achievements) {
          window.Achievements.unlock('babel_ascendant');
        }
        this.party.forEach((id, i) => {
          const u = new ENT.Unit(this, id, lv.spawn.x + i * 0.8, lv.spawn.y, true);
          u.stack = (this.stacks[id] || []).slice(); u.refreshStack(); this.units.push(u);
        });
      } else {
        ['ash', 'akad'].forEach((id, i) => this.units.push(new ENT.Unit(this, id, lv.spawn.x + 2 + i * 0.9, lv.spawn.y, true)));
      }
      lv.strangers.forEach(s => { if (!this.party.includes(s.id) || opts.preview) this.units.push(new ENT.Unit(this, s, s.x, s.y, false)); });
      lv.crates.forEach(([x, y]) => { const c = new ENT.Crate(this, x, y); c.uid = this.uidSeq++; this.crates.push(c); });
      lv.items.forEach(([x, y, t]) => this.spawnItem(t, x, y));
      lv.rocks.forEach(([x, y]) => this.rocks.push(new ENT.Rock(this, x, y)));
      this.leader = this.units.find(u => u.recruited && !u.fainted) || this.units[0];
      this.units.filter(u => u.recruited).forEach(u => this.selection.add(u));

      this.levelTime = 0; this.hintIdx = 0; this.finalDone = false; this.exiting = false;
      this.openSourceDone = false; this.coopActive = false;
      this.tremorT = lv.tremor ? lv.tremor.first : Infinity; this.tremorWarned = false;
      this.food = Math.max(this.food, 70);
      this.hud.setLevel(lv); this.hud.dirty = true;
      this.cam.x = this.camT.x = lv.spawn.x + 6; this.cam.y = this.camT.y = lv.spawn.y + 3; this.cam.dist = this.camT.dist = 26;
      this.computeSupports();
      // 让物件落定
      for (let i = 0; i < 30; i++) this.stepPhysics(1 / 60, true);
      this.state = opts.preview ? 'title' : 'play';
      if (!opts.preview) this.startCut(lv.intro, () => { this.hud.banner(`第 ${lv.id} 层 · ${lv.name}`, 'story'); });
    }

    spawnItem(type, x, y) { const it = new ENT.Item(this, type, x, y); this.items.push(it); return it; }

    // ═══════════════════ 世界查询 ═══════════════════
    isActive(id) {
      if (Array.isArray(id)) return id.every(i => this.isActive(i));
      const p = this.plates.find(q => q.id === id); if (p) return p.pressed;
      const s = this.steles.find(q => q.id === id); if (s) return s.active;
      const l = this.levers.find(q => q.id === id); if (l) return l.active;
      return false;
    }

    computeSupports() {
      const S = [], lv = this.level;
      lv.walls.forEach((w, i) => S.push({ x1: w[0], x2: w[1], y: w[3], key: 'w' + i, kind: 'solid', z: 0 }));

      if (this.levelIdx === 0) {
        // 第一关枯井八方旅人式连续空间：
        // 前方麦田道路与后方工坊后巷均为连续实心大地，绕井通行绝不掉落
        S.push({ x1: 0, x2: 64, y: 0, key: 'well_bypass_front', kind: 'solid', z: 2.6 });
        S.push({ x1: 0, x2: 64, y: 0, key: 'well_bypass_back', kind: 'solid', z: -3.6 });
      }

      // 平台：单向通行甲板（可从下往上跃起穿透，站在上方时提供坚实立足面，按 S / 下方向键可主动下穿）
      lv.plats.forEach((p, i) => {
        const [x1, x2, y, kind] = p;
        const isRooftopSkybridge = y >= 4.4 && x1 >= 5 && x2 <= 28;
        const pZ = isRooftopSkybridge ? -2.6 : 0;
        S.push({ x1, x2, y, key: 'p' + i, kind: 'oneway', mat: kind, z: pZ });
      });

      // 建筑屋顶：注册为实体可行走表面（屋顶是实的，可以走！）
      if (lv.decor) {
        lv.decor.forEach((d, i) => {
          if (d.t === 'building') {
            const bw = d.w || 6.8, bh = d.h || 4.4;
            const roofY = d.y + bh + 0.22;
            const rx1 = d.x - bw / 2 + 0.05;
            const rx2 = d.x + bw / 2 - 0.05;
            S.push({ x1: rx1, x2: rx2, y: roofY, key: 'roof_' + (d.id || i), kind: 'oneway', mat: 'stone', z: -(d.d || 5.2) / 2 });
          }
        });
      }

      this.lifts.forEach(l => S.push({ x1: l.x1, x2: l.x2, y: l.y, key: 'L' + l.id, kind: 'oneway', ref: l }));
      this.bridges.forEach(b => { if (b.ext > 0.95) S.push({ x1: b.x1, x2: b.x2, y: b.y, key: 'B' + b.id, kind: 'oneway' }); });
      this.builds.forEach(b => { if (b.done) S.push({ x1: b.x1, x2: b.x2, y: b.y, key: 'b' + b.id, kind: 'oneway' }); });
      this.crates.forEach(c => { if (c.grounded) S.push({ x1: c.x - 0.5, x2: c.x + 0.5, y: c.y + 1, key: 'c' + c.uid, kind: 'crate', ref: c }); });
      this.supports = S;
      const SO = [];
      lv.walls.forEach(w => SO.push({ x1: w[0], x2: w[1], y1: w[2], y2: w[3] }));
      this.gates.forEach(g => { if (g.open < 0.75) SO.push({ x1: g.x - 0.35, x2: g.x + 0.35, y1: g.y + g.open * g.h * 0.95, y2: g.y + g.h + g.open * g.h }); });
      this.solids = SO;
      this.navSurfs = null;
    }
    surfaces() { if (!this.navSurfs) this.navSurfs = NAV.buildSurfaces(this.supports, this.solids); return this.navSurfs; }

    planFor(unit, goal) {
      const surfs = this.surfaces();
      if (!unit.grounded) return null;
      const start = NAV.surfaceAt(surfs, unit.grounded.key, unit.x);
      if (!start) return null;
      return NAV.plan({ surfs, solids: this.solids, ladders: this.ladders.filter(l => !l.trigger || this.isActive(l.trigger)), lifts: this.lifts.filter(l => !l.trigger || this.isActive(l.trigger)) }, unit, start, goal);
    }

    liftSlot(lf, unit) {
      const list = [...new Set([...lf.boarding, ...this.units.filter(u => u.grounded && u.grounded.key === 'L' + lf.id)])].sort((a, b) => LANG.ORDER.indexOf(a.id) - LANG.ORDER.indexOf(b.id));
      const k = Math.max(0, list.indexOf(unit));
      return Math.min(lf.x2 - 0.35, lf.x1 + 0.4 + k * 0.55);
    }

    ridersOf(lf) {
      const key = 'L' + lf.id;
      return [...this.units, ...this.crates, ...this.items].filter(e => {
        if (e.grounded && e.grounded.key === key) return true;
        if (e.x >= lf.x1 - 0.25 && e.x <= lf.x2 + 0.25 && Math.abs(e.y - lf.y) < 0.35) return true;
        return false;
      });
    }

    // ═══════════════════ 机关 ═══════════════════
    updateMechanisms(dt) {
      // 踏板
      const ents = [...this.units, ...this.crates, ...this.items];
      this.plates.forEach(p => {
        let w = 0;
        for (const e of ents) {
          if (!e.grounded || Math.abs(e.y - p.y) > 0.15 || Math.abs(e.x - p.x) > p.w / 2 + 0.3) continue;
          if (p.lang) { if (e instanceof ENT.Unit && e.recruited && e.langs.includes(p.lang)) w += 1; continue; }
          w += e instanceof ENT.Unit ? 1 : e instanceof ENT.Crate ? 2 : e.weight;
        }
        const was = p.pressed; p.pressed = w >= p.need - 1e-6; p.weight = w;
        if (p.pressed && !was) { SFX.playPlateClick(); if (!p.ever) { p.ever = true; } }
        if (p.pressed !== was) this.hud.dirty = this.hud.dirty;
        p.mesh.position.y = p.y - (p.pressed ? 0.07 : 0);
        p.top.material.emissiveIntensity = p.pressed ? 0.7 : 0.08 + (w > 0 ? 0.2 : 0);
      });
      // 闸门
      this.gates.forEach(g => {
        const tgt = this.isActive(g.trigger) ? 1 : 0;
        const prev = g.open;
        g.open += Math.sign(tgt - g.open) * Math.min(Math.abs(tgt - g.open), dt * 1.4);
        if (g.open > 0.7) g.ever = true;
        if ((prev < 0.05 && g.open >= 0.05) || (prev > 0.95 && g.open <= 0.95)) SFX.playGate(g.open >= 0.05);
        g.mesh.position.y = g.y + g.open * g.h * 0.95;
      });
      // 吊桥
      this.bridges.forEach(b => {
        const tgt = this.isActive(b.trigger) ? 1 : 0;
        b.ext += Math.sign(tgt - b.ext) * Math.min(Math.abs(tgt - b.ext), dt * 1.3);
        b.mesh.scale.x = Math.max(0.001, b.ext);
      });
      // 绳梯
      this.ladders.forEach(l => {
        if (!l.trigger) return;
        const tgt = this.isActive(l.trigger) ? 1 : 0;
        l.unroll += Math.sign(tgt - l.unroll) * Math.min(Math.abs(tgt - l.unroll), dt * 0.9);
        l.mesh.scale.y = Math.max(0.02, l.unroll);
      });
      // 升降台 / 枯井升降木板
      this.lifts.forEach(lf => {
        const riders = this.ridersOf(lf);
        if (lf.style === 'well') {
          // 枯井升降木板：踩下踏板（或放置箱子压住踏板）立即升起至 y1，松开则降回 y0
          const powered = this.isActive(lf.trigger);
          const tgt = powered ? lf.y1 : lf.y0;
          if (Math.abs(lf.y - tgt) > 0.015) {
            lf.target = tgt;
            lf.moving = true;
          }
        } else {
          // 常规呼叫式升降台（若有 trigger 则通电后方可运行与响应呼叫）
          const powered = !lf.trigger || this.isActive(lf.trigger);
          if (!powered) {
            lf.stillT = 0;
            if (lf.moving) lf.moving = false;
          } else {
            const here = Math.abs(lf.y - lf.y1) < 0.05 ? lf.y1 : lf.y0;
            const other = here === lf.y1 ? lf.y0 : lf.y1;
            const wants = [...lf.wants].length > 0;
            // 处于跨层寻路中的队员到达升降台，或在另一层呼叫空升降台
            if (riders.length && wants && !lf.moving) {
              const still = riders.every(r => Math.abs(r.vx || 0) < 0.05);
              if (still) this.operateLift(lf, riders[0]);
            } else if (!riders.length && lf.calls.has(other) && lf.boarding.size === 0 && !lf.moving) {
              lf.target = other;
              lf.moving = true;
            }
          }
        }
        if (lf.moving) {
          const dy = lf.target - lf.y, step = Math.sign(dy) * Math.min(Math.abs(dy), dt * 2.6);
          lf.y += step;
          riders.forEach(r => {
            r.y += step;
            r.vy = 0;
            if (r.grounded && r.grounded.key !== 'L' + lf.id) {
              const sup = this.supports.find(s => s.key === 'L' + lf.id);
              if (sup) r.grounded = sup;
            }
          });
          lf.wheel.rotation.y += step * 2;
          if (Math.abs(lf.target - lf.y) < 0.001) {
            lf.y = lf.target; lf.moving = false;
            lf.arrivalSet = new Set(this.ridersOf(lf)); lf.stillT = 0;
            SFX.playCreak();
            if (lf.id === 'well' && lf.y >= lf.y1 - 0.01) {
              const b = this.units.find(u => u.id === 'bani');
              if (b && !b.recruited) {
                b.x = 28.8; b.y = 0;
                b.grounded = ENT.findGround(this, b.x, b.y, 0.28);
                const near = this.units.find(u => u.recruited && Math.hypot(u.x - b.x, u.y - b.y) < 6.0 && LANG.shared(u, b).length);
                if (near) this.recruitUnit(b, near);
              }
            }
          }
        }
        lf.wants.clear(); lf.boarding.clear(); lf.calls.clear();
        lf.mesh.position.y = lf.y;
        lf.ropes.forEach(r => { const len = lf.topY - lf.y; r.m.scale.y = len; r.m.position.y = lf.y + len / 2; });
        if (lf.pullRing) {
          const powered = !lf.trigger || this.isActive(lf.trigger);
          const hasRiders = riders.length > 0;
          lf.pullRing.material.emissive = new THREE.Color(hasRiders && powered ? '#ffd24a' : '#000000');
          lf.pullRing.material.emissiveIntensity = hasRiders && powered ? 0.6 + Math.sin(this.time * 6) * 0.3 : 0;
        }
      });
    }

    operateLift(lf, operator) {
      if (lf.moving) return;
      const powered = !lf.trigger || this.isActive(lf.trigger);
      if (!powered) {
        this.hud.banner('升降台未通电：把高台木箱推下边缘，压在 ⚖2 踏板上', 'warn');
        SFX.playSample('drop', { vol: 0.35, pitch: 0.9 });
        return;
      }
      const here = Math.abs(lf.y - lf.y1) < 0.05 ? lf.y1 : lf.y0;
      const other = here === lf.y1 ? lf.y0 : lf.y1;

      if (operator) {
        operator.task = { type: 'operate', t: 0.35, done: () => {} };
        operator.say('⛓️ ' + (LANG.ACT.ok || 'go!'), 1.5);
        this.hud.banner(`${operator.name} 拉下了升降缆绳，水车动力轴咬合！`, 'good');
      } else {
        this.hud.banner('拉动了升降缆绳，水车升降台启动！', 'good');
      }
      SFX.playCreak();
      setTimeout(() => SFX.playPlateClick(), 120);

      lf.target = other;
      lf.moving = true;
      lf.stillT = 0;
    }

    activateStele(s, u) {
      if (s.active) return;
      s.active = true;
      const t = PX.tex(PX.steleCanvas(s.langs, true));
      s.mesh.material[4] = new THREE.MeshLambertMaterial({ map: t, emissive: new THREE.Color('#806020'), emissiveIntensity: 0.4 });
      this.fx.sparkle(s.x, s.y + 1.4); SFX.playMiracle();
      u.say(s.langs.map(l => l + ' ' + LANG.LANGS[l].words[0]).join(' · ') + ' !', 3);
      this.hud.banner(`${u.name}念出了石碑上的 ${s.langs.join(' ')} 双语咒文`, 'good');
    }
    activateLever(l, u) {
      if (l.active) return;
      l.active = true; l.stick.rotation.z = -0.6; SFX.playPlateClick();
      this.hud.banner(`${u.name}拉下了拉杆——绳梯垂了下去`, 'good');
    }
    addBuildProgress(b, u) {
      b.progress++;
      const n = b.planks.length, show = Math.round(b.progress / b.cost * n);
      b.planks.forEach((p, i) => { if (i < show && !p.visible) { p.visible = true; p.scale.y = 0.2; } });
      this.fx.chips((b.x1 + b.x2) / 2, b.y);
      if (b.progress >= b.cost) {
        b.done = true; b.ghost.visible = false; b.edges.visible = false; b.sign.visible = false;
        b.planks.forEach(p => p.visible = true);
        SFX.playMiracle(); this.hud.banner(`${u.name}修好了木板路`, 'good'); u.speak('ok');
      } else this.hud.banner(`木板路 ${b.progress}/${b.cost}`, 'info');
    }

    // ─── 浮动特殊协作/互动提示浮钮（支持鼠标点击与 F 键触发） ───
    showCoopPrompt(text, action) {
      this.coopAction = action;
      let el = $('coop-prompt');
      if (!el) {
        el = document.createElement('div');
        el.id = 'coop-prompt';
        $('ui-layer').appendChild(el);
        const handleTrigger = (e) => {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          this.triggerCoopAction();
        };
        el.addEventListener('pointerdown', handleTrigger);
        el.addEventListener('mousedown', handleTrigger);
        el.addEventListener('click', handleTrigger);
      }
      const mouseIcon = (window.ICONS && window.ICONS.mouse_lmb) ? window.ICONS.mouse_lmb : '🖱️';
      if (el.dataset.text !== text) {
        el.dataset.text = text;
        el.innerHTML = `<span>${text}</span><span class="prompt-kbd-tag"><span class="mouse-badge lmb">${mouseIcon}</span><span class="kbd">点击</span> 或 <span class="kbd">F</span></span>`;
      }
      el.style.display = 'flex';
    }

    triggerCoopAction() {
      if (!this.coopAction) return;
      SFX.playTone(440, 'triangle', 0.12, 0.06);
      const action = this.coopAction;
      this.hideCoopPrompt();
      if (action === 'monkey') this.monkeyFishing();
      else if (action === 'ladder') this.humanLadder();
      else if (typeof action === 'function') action();
    }

    hideCoopPrompt() {
      this.coopAction = null;
      const el = $('coop-prompt');
      if (el) {
        el.style.display = 'none';
        el.dataset.text = '';
      }
    }

    recruitUnit(s, friend) {
      if (s.recruited) return;
      s.recruited = true;
      if (!this.party.includes(s.id)) this.party.push(s.id);
      this.selection.add(s);
      s.detached = false;
      const sh = friend ? (LANG.shared(friend, s)[0] || s.langs[0]) : s.langs[0];
      if (friend) friend.say(`${sh} ${LANG.LANGS[sh].words[0]} ?`, 2.2);
      setTimeout(() => s.say(`${sh} ${LANG.LANGS[sh].words[1]}! ✦ 自由了！`, 2.6), 600);
      SFX.playMiracle();
      this.hud.dirty = true;
      this.hud.banner(`${s.name}加入了队伍（${s.langs.join(' ')}）——通过 ${sh} 与队友相通`, 'good');
    }

    // ───────── 捞人（拉起下方深井或断崖下的队友） ─────────
    pullUpTeammate() {
      if (this.coopActive) return;
      const inWell = this.units.filter(u => u.x > 29.4 && u.x < 33.6 && u.y < -1.5);
      const memEdge = this.available().filter(u => u.y >= -0.5 && Math.abs(u.x - 30.5) < 3.8);

      if (inWell.length === 0) {
        this.hud.banner('井下已无需要拉拔救援的人员！', 'info');
        return;
      }
      if (memEdge.length === 0) {
        this.hud.banner('上方井口需要至少 1 名队员才能伸手施救！', 'warn');
        return;
      }

      this.coopActive = true;
      this.hideCoopPrompt();

      // 优先拉拔井下最高位置的队友（站在木箱或叠高者优先被拉起）
      const sortedInWell = inWell.slice().sort((a, b) => b.y - a.y);
      const targetUnit = sortedInWell[0];

      if (memEdge.length >= 2) {
        // 两人人链「探井捞人」（猴子捞月形制，深及井底）
        const [u1, u2] = memEdge;
        u1.order = null; u1.path = null; u1.vx = 0; u1.vy = 0;
        u2.order = null; u2.path = null; u2.vx = 0; u2.vy = 0;
        targetUnit.order = null; targetUnit.path = null; targetUnit.vx = 0; targetUnit.vy = 0;

        u1.state = 'coop'; u2.state = 'coop'; targetUnit.state = 'coop';
        u1.grounded = null; u2.grounded = null; targetUnit.grounded = null;

        u1.x = 27.6; u1.y = 0; u1.facing = 1; u1.task = { type: 'operate' };
        u2.x = 28.8; u2.y = -1.6; u2.facing = 1; u2.task = { type: 'hand' };
        u1.say('抓住我！', 2);
        u2.say('抓住手了……起！', 2);
        targetUnit.task = { type: 'hand' };
        SFX.playTone(330, 'sine', 0.2, 0.08);

        this.hud.banner(`两人联手探井捞人：合力将【${targetUnit.name}】拉出井底！`, 'good');
        if (window.Achievements) window.Achievements.unlock('monkey_chain');

        const startY = targetUnit.y;
        const startX = targetUnit.x;
        let elapsed = 0;
        const anim = () => {
          elapsed += 0.04;
          const k = Math.min(1, elapsed / 1.1);
          targetUnit.y = startY + k * (0 - startY);
          targetUnit.x = startX + k * (28.4 - startX);
          if (k < 1) {
            requestAnimationFrame(anim);
          } else {
            targetUnit.y = 0;
            targetUnit.x = 28.4;
            u2.x = 29.0; u2.y = 0;
            u1.x = 27.6; u1.y = 0;
            u1.state = 'idle'; u2.state = 'idle'; targetUnit.state = 'idle';
            u1.task = null; u2.task = null; targetUnit.task = null;
            targetUnit.grounded = ENT.findGround(this, targetUnit.x, targetUnit.y, 0.28);
            u2.grounded = ENT.findGround(this, u2.x, u2.y, 0.28);
            u1.grounded = ENT.findGround(this, u1.x, u1.y, 0.28);

            if (targetUnit.id === 'bani' && !targetUnit.recruited) {
              this.recruitUnit(targetUnit, u1);
            }
            targetUnit.say('多谢拉扯！我也脱困了！', 2.0);
            this.hud.banner(`🎉 探井捞人成功！已将【${targetUnit.name}】拉上地面！`, 'good');
            this.coopActive = false;
            this.hud.dirty = true;
          }
        };
        setTimeout(anim, 300);
      } else {
        // 单人悬臂「伸手捞人」
        const u1 = memEdge[0];
        // 检查井下目标是否在单人手臂/垂索触及范围内 (targetUnit.y >= -3.5m)
        if (targetUnit.y < -3.5) {
          u1.task = { type: 'hand' };
          u1.say('井底太深了！单人手长够不到，需要再来一人连成人链，或者你在底下踩箱子垫高！', 2.5);
          SFX.playTone(220, 'sawtooth', 0.2, 0.08);
          setTimeout(() => {
            u1.task = null;
            this.hud.banner('单人手臂长度有限：井下队员需踩箱垫高，或上方需 2 人形成人链施救！', 'warn');
            this.coopActive = false;
          }, 1200);
          return;
        }

        // 单人拉扯施救
        u1.order = null; u1.path = null; u1.vx = 0; u1.vy = 0;
        targetUnit.order = null; targetUnit.path = null; targetUnit.vx = 0; targetUnit.vy = 0;
        u1.state = 'coop'; targetUnit.state = 'coop';
        u1.grounded = null; targetUnit.grounded = null;

        u1.x = 28.8; u1.y = 0; u1.facing = 1; u1.task = { type: 'hand' };
        u1.say('抓住我的手！使劲！', 2.0);
        targetUnit.task = { type: 'hand' };
        SFX.playTone(360, 'sine', 0.2, 0.08);

        this.hud.banner(`上方队员【${u1.name}】俯身伸手，将【${targetUnit.name}】拉起！`, 'good');
        const startY = targetUnit.y;
        const startX = targetUnit.x;
        let elapsed = 0;
        const anim = () => {
          elapsed += 0.05;
          const k = Math.min(1, elapsed / 0.9);
          targetUnit.y = startY + k * (0 - startY);
          targetUnit.x = startX + k * (28.4 - startX);
          if (k < 1) {
            requestAnimationFrame(anim);
          } else {
            targetUnit.y = 0; targetUnit.x = 28.4;
            u1.state = 'idle'; targetUnit.state = 'idle';
            u1.task = null; targetUnit.task = null;
            targetUnit.grounded = ENT.findGround(this, targetUnit.x, targetUnit.y, 0.28);
            u1.grounded = ENT.findGround(this, u1.x, u1.y, 0.28);

            if (targetUnit.id === 'bani' && !targetUnit.recruited) {
              this.recruitUnit(targetUnit, u1);
            }
            targetUnit.say('拉上来了！多谢接应！', 2.0);
            this.hud.banner(`🎉 伸手捞人成功！已将【${targetUnit.name}】拉出枯井！`, 'good');
            this.coopActive = false;
            this.hud.dirty = true;
          }
        };
        setTimeout(anim, 250);
      }
    }

    monkeyFishing() {
      return this.pullUpTeammate();
    }

    // ───────── 叠罗汉（层层搭起人梯，仅让接近目标面的顶层 NPC 跃出） ─────────
    humanLadder(units = null, targetY = 0, landingX = 28.6) {
      if (this.coopActive) return;
      const inWell = units || this.units.filter(u => u.x > 29.4 && u.x < 33.6 && u.y < -1.5);
      if (inWell.length < 2) {
        this.hud.banner('叠罗汉需要至少 2 人在下方配合搭起人梯', 'warn');
        return;
      }
      this.coopActive = true;
      this.hideCoopPrompt();
      const crateInWell = this.crates.find(c => c.x > 29.4 && c.x < 33.6 && c.y < -1.5);
      const baseY = crateInWell ? crateInWell.y + 1.0 : -5.0;
      const stackX = crateInWell ? crateInWell.x : 31.5;

      inWell.forEach(u => {
        u.order = null; u.path = null; u.vx = 0; u.vy = 0;
        u.grounded = null; u.state = 'coop'; u.task = { type: 'operate' };
      });

      // 选中的队员若在其中，尽量安排在顶层以便跃出
      inWell.sort((a, b) => {
        const aSel = this.selection.has(a) ? 1 : 0;
        const bSel = this.selection.has(b) ? 1 : 0;
        return aSel - bSel;
      });

      // 形成人梯：从底部向上层层叠罗汉
      inWell.forEach((u, i) => {
        u.x = stackX;
        u.y = baseY + i * 1.5;
      });
      SFX.playTone(440, 'triangle', 0.25, 0.08);

      const topUnit = inWell[inWell.length - 1];
      const topHeadY = topUnit.y + 1.5;

      // 判定顶层队员是否接近目标面 (接近 y = targetY，即 u.y >= targetY - 1.8)
      const reachesTarget = topHeadY >= targetY - 0.4;

      if (!reachesTarget) {
        // 高度不足，无法跃出！
        topUnit.task = { type: 'hand' };
        topUnit.say('够不到井口！高度还差一点，需要木箱垫高或更多同伴！', 2.2);
        SFX.playTone(240, 'sawtooth', 0.2, 0.08);

        setTimeout(() => {
          inWell.forEach((u, i) => {
            u.x = stackX - 0.4 + i * 0.5;
            u.y = baseY;
            u.state = 'idle';
            u.task = null;
            u.grounded = ENT.findGround(this, u.x, u.y, 0.28);
          });
          this.hud.banner('高度不足：叠罗汉未能触及目标面。需推下木箱垫脚或派更多队员！', 'warn');
          this.coopActive = false;
        }, 1400);
        return;
      }

      // 达到目标面高度：仅让顶层接近目标面的 NPC 跃出！
      this.hud.banner(`全员就位搭起人梯！顶层队员【${topUnit.name}】发力借势翻越井口！`, 'good');
      topUnit.task = { type: 'hand' };
      topUnit.say('我看到井口了！我跳上去了！', 1.8);

      setTimeout(() => {
        // 顶层队员跳向地面
        topUnit.x = landingX;
        topUnit.y = targetY;
        topUnit.vx = -1.5;
        topUnit.vy = 2.5;
        topUnit.state = 'idle';
        topUnit.task = null;
        topUnit.grounded = ENT.findGround(this, topUnit.x, topUnit.y, 0.28);
        topUnit.say('我翻上来了！底下的同伴稳住，我在上面拉你们！', 2.2);
        SFX.playJump();

        if (topUnit.id === 'bani' && !topUnit.recruited) {
          const rec = inWell.find(u => u !== topUnit && u.recruited) || this.units.find(u => u.recruited);
          this.recruitUnit(topUnit, rec);
        }

        // 底下负责支撑的队员留在原处，解除叠罗汉状态并降回底面/木箱
        const remaining = inWell.filter(u => u !== topUnit);
        remaining.forEach((u, i) => {
          u.x = stackX - 0.4 + i * 0.5;
          u.y = baseY;
          u.state = 'idle';
          u.task = null;
          u.grounded = ENT.findGround(this, u.x, u.y, 0.28);
        });
        if (remaining.length > 0) {
          remaining[remaining.length - 1].say(`${topUnit.name} 好样的！快在上面伸手拉我们！`, 2.0);
        }

        this.hud.banner(`🎉 叠罗汉成功！顶层【${topUnit.name}】翻越至地面，下方队友留在井中等待拉扯救援！`, 'good');
        this.coopActive = false;
        this.hud.dirty = true;
      }, 900);
    }

    // ───────── 通用高台叠罗汉（高台下搭人梯，助顶层登台，底座留驻） ─────────
    humanLadderOnLedge(units, plat) {
      if (this.coopActive || units.length < 2) return;
      this.coopActive = true;
      this.hideCoopPrompt();

      const platY = plat[2];
      const stackX = Math.max(plat[0] - 0.3, Math.min(plat[1] + 0.3, units[0].x));
      const baseY = units[0].y;

      units.forEach(u => {
        u.order = null; u.path = null; u.vx = 0; u.vy = 0;
        u.grounded = null; u.state = 'coop'; u.task = { type: 'operate' };
      });

      units.forEach((u, i) => {
        u.x = stackX;
        u.y = baseY + i * 1.5;
      });
      SFX.playTone(440, 'triangle', 0.25, 0.08);

      const topU = units[units.length - 1];
      const topHeadY = topU.y + 1.5;

      if (topHeadY < platY - 0.4) {
        topU.task = { type: 'hand' };
        topU.say('高台太高了，够不到边缘！', 1.8);
        setTimeout(() => {
          units.forEach((u, i) => {
            u.x = stackX - 0.3 + i * 0.6;
            u.y = baseY;
            u.state = 'idle'; u.task = null;
            u.grounded = ENT.findGround(this, u.x, u.y, 0.28);
          });
          this.hud.banner('高度不足：高台过高，叠罗汉未能触及台面！', 'warn');
          this.coopActive = false;
        }, 1200);
        return;
      }

      this.hud.banner(`全员搭起人梯！【${topU.name}】翻身跃上高台！`, 'good');
      topU.task = { type: 'hand' };

      setTimeout(() => {
        const landX = Math.max(plat[0] + 0.4, Math.min(plat[1] - 0.4, stackX));
        topU.x = landX; topU.y = platY;
        topU.state = 'idle'; topU.task = null;
        topU.grounded = ENT.findGround(this, topU.x, topU.y, 0.28);
        topU.say('我上来了！在上面照应你们！', 2.0);
        SFX.playJump();

        const remaining = units.filter(u => u !== topU);
        remaining.forEach((u, i) => {
          u.x = stackX - 0.3 + i * 0.6; u.y = baseY;
          u.state = 'idle'; u.task = null;
          u.grounded = ENT.findGround(this, u.x, u.y, 0.28);
        });
        if (remaining.length) remaining[0].say('好！等下伸手拉我！', 1.8);

        this.hud.banner(`🎉 叠罗汉登台成功！顶层队员【${topU.name}】跃上高台，下方队友留在台底！`, 'good');
        this.coopActive = false;
        this.hud.dirty = true;
      }, 800);
    }

    // ───────── 通用高台捞人（高台上队员伸手拉拔台底队员） ─────────
    pullUpOnLedge(topU, botU) {
      if (this.coopActive) return;
      this.coopActive = true;
      this.hideCoopPrompt();

      topU.order = null; topU.path = null; topU.vx = 0; topU.vy = 0;
      botU.order = null; botU.path = null; botU.vx = 0; botU.vy = 0;
      topU.state = 'coop'; botU.state = 'coop';
      topU.task = { type: 'hand' }; botU.task = { type: 'hand' };
      topU.say('抓紧我的手，起！', 2.0);
      SFX.playTone(360, 'sine', 0.2, 0.08);

      const startY = botU.y;
      const targetY = topU.y;
      const targetX = topU.x + (topU.x > botU.x ? -0.5 : 0.5);
      let elapsed = 0;
      const anim = () => {
        elapsed += 0.06;
        const k = Math.min(1, elapsed / 0.8);
        botU.y = startY + k * (targetY - startY);
        botU.x = botU.x + k * (targetX - botU.x);
        if (k < 1) {
          requestAnimationFrame(anim);
        } else {
          botU.y = targetY; botU.x = targetX;
          topU.state = 'idle'; botU.state = 'idle';
          topU.task = null; botU.task = null;
          botU.grounded = ENT.findGround(this, botU.x, botU.y, 0.28);
          topU.grounded = ENT.findGround(this, topU.x, topU.y, 0.28);
          botU.say('上来了，多谢！', 2.0);
          SFX.playConfirm();
          this.hud.banner(`🎉 捞人成功！已将【${botU.name}】拉上高台！`, 'good');
          this.coopActive = false;
          this.hud.dirty = true;
        }
      };
      setTimeout(anim, 200);
    }

    flingTeammate() {
      if (this.coopActive) return;
      const sofi = this.units.find(u => u.id === 'sofi' && u.recruited);
      const throwers = this.available().filter(u => u !== sofi && Math.abs(u.x - 59.5) < 3.2 && Math.abs(u.y - 10) < 1.5);
      if (!sofi || throwers.length < 1) {
        this.hud.banner('需要苏菲拉与至少一名强壮同伴（如阿卡德或艾什）站在断崖边', 'warn');
        return;
      }
      this.coopActive = true;
      this.hideCoopPrompt();
      const thrower = throwers[0];
      thrower.order = null; thrower.path = null; thrower.vx = 0; thrower.facing = 1;
      thrower.task = { type: 'operate', t: 1.4 };
      thrower.say('▲ gha · ! ⇥', 1.5);
      
      sofi.order = null; sofi.path = null; sofi.vx = 0; sofi.vy = 0; sofi.facing = 1;
      sofi.say('◎ om · ↑ !!', 1.5);
      SFX.playTone(380, 'sawtooth', 0.25, 0.08, 550);
      
      setTimeout(() => {
        if (!sofi.alive) { this.coopActive = false; return; }
        SFX.playTone(600, 'sine', 0.35, 0.1, 950);
        this.shake(0.2);
        sofi.x = 60.2; sofi.y = 10.3;
        sofi.vx = 5.2; sofi.vy = 6.8;
        sofi.state = 'jump'; sofi.grounded = null;
        this.fx.sparkle(thrower.x + 0.6, thrower.y + 1.2);
        
        let landed = false;
        const checkLanding = setInterval(() => {
          if (!landed && sofi.x >= 63.5 && sofi.y <= 10.3) {
            landed = true;
            clearInterval(checkLanding);
            sofi.x = 64.5; sofi.y = 10.0;
            sofi.vx = 0; sofi.vy = 0; sofi.state = 'idle';
            sofi.grounded = ENT.findGround(this, sofi.x, sofi.y, 0.35);
            sofi.say('✦ zir-ta ! 🤝', 2.0);
            SFX.playMiracle();
            this.fx.sparkle(sofi.x, sofi.y + 1.0);
            
            const b = this.builds.find(q => q.id === 'b1');
            if (b) {
              b.done = true;
              b.mesh.visible = true;
              this.rebuildNav = true;
            }
            this.hud.banner('【协力托举】苏菲拉被合力送过断崖，从对岸放下栈桥木板！全员通路畅通！', 'good');
            this.coopActive = false;
          }
        }, 50);
        setTimeout(() => { if (!landed) { clearInterval(checkLanding); this.coopActive = false; } }, 3200);
      }, 500);
    }

    openSourceEvent() {
      if (this.coopActive || this.openSourceDone) return;
      this.coopActive = true;
      this.hideCoopPrompt();
      
      const ghar = this.units.find(u => u.id === 'ghar');
      const ul = this.units.find(u => u.id === 'ul');
      const ash = this.units.find(u => u.id === 'ash' && u.recruited);
      const io = this.units.find(u => u.id === 'io' && u.recruited);
      const sofi = this.units.find(u => u.id === 'sofi' && u.recruited);
      
      this.startCut([
        { cam: [46, 7, 20], who: 'ghar', say: '▲ tor · gha ! ✋', sub: '（加尔提着石斧拦在门前：“这块神圣双语碑是我们单石族发现的！你们这些杂牌军休想靠近！”）' },
        { who: 'ash', say: '☼ sol · ▲ tor !', sub: '（艾什用岩脊语温和地回应：“塔在崩塌。如果每个人都死守自己部落的暗号，所有人都会被埋在同一片瓦砾下。”）' },
        { who: 'io', say: '✦ zir-ta · ◎ om', sub: '（伊奥与苏菲拉并肩走上前，同时将羊皮纸上的古卷拓本展示出来，唱出星屑与环音的重合音节）' },
        {
          cam: [49, 7.5, 16],
          narr: '石碑上的 ◎ 与 ✦ 两个符号在众人面前发出共鸣金光。齿轮咬合，封锁千年的东翼巨门轰然洞开！',
          act: () => {
            const s1 = this.steles.find(s => s.id === 's1');
            if (s1) this.activateStele(s1, io || ash);
            SFX.playMiracle();
            this.shake(0.3);
          }
        },
        { who: 'ghar', say: '▲ tor-gha … ! 🤝', sub: '（加尔目瞪口呆：“……你们竟然毫无保留地把神圣秘文念给我们听？原来巴别塔……不是某一个部落的神谕，而是我们全人类的造物！”）' },
        {
          who: 'ul', say: '▲ dun · ↑ !', sub: '（乌尔振奋高呼：“我们不再为单语偏见争斗了！去往天穹的圣书库需要两组人踩住踏板——我们单石族替你们压住开关！”）',
          act: () => {
            if (ghar) {
              ghar.order = null; ghar.path = null;
              ghar.x = 40; ghar.y = 10; ghar.grounded = ENT.findGround(this, 40, 10, 0.3);
            }
            if (ul) {
              ul.order = null; ul.path = null;
              ul.x = 24; ul.y = 10; ul.grounded = ENT.findGround(this, 24, 10, 0.3);
            }
            const pb = this.plates.find(p => p.id === 'pb');
            const pc = this.plates.find(p => p.id === 'pc');
            if (pb) pb.ever = true;
            if (pc) pc.ever = true;
            this.openSourceDone = true;
          }
        }
      ], () => {
        this.coopActive = false;
        this.openSourceDone = true;
        this.hud.banner('🎉【开源条约达成】破除单语壁垒，竞争小队化干戈为玉帛！全人类合力开启圣书库！', 'story');
      });
    }

    getNearbyRelic() {
      if (!this.level || !this.level.decor) return null;
      const mem = this.available();
      for (const d of this.level.decor) {
        if (d.id && d.id.startsWith('relic_') && !this.relicsInspected.has(d.id)) {
          const near = mem.find(u => Math.hypot(u.x - d.x, u.y - d.y) < 2.5);
          if (near) return d;
        }
      }
      return null;
    }

    investigateRelic(relic) {
      if (this.coopActive) return;
      this.relicsInspected.add(relic.id);
      this.hideCoopPrompt();
      this.runesTotal++;
      SFX.playMiracle();
      this.shake(0.15);
      
      const ash = this.units.find(u => u.id === 'ash' && u.recruited);
      const akad = this.units.find(u => u.id === 'akad' && u.recruited);
      const io = this.units.find(u => u.id === 'io' && u.recruited);
      
      if (relic.id === 'relic_can') {
        this.startCut([
          { cam: [relic.x, relic.y + 2, 18], narr: '艾什弯腰捡起了这个不可思议的金属圆罐。它表面光滑平整，印着细密的条形黑白线纹。' },
          { who: 'ash', say: '☼ sol · ♒ wa ?', sub: '（艾什：“这金属边缘的切口精细得令人颤抖……我们这个时代的任何铜凿都做不出来。”）' },
          { who: 'akad', say: '▲ gha · tor … !', sub: '（阿卡德：“里面的给养还散发着冷气……难道这座塔不是为了通向神明，而是一座保存上一个文明的冷库？”）' }
        ], () => {
          this.hud.banner('【奇迹物揭秘】获得了关于上古文明冷库的线索！符文石 +1', 'story');
        });
      } else if (relic.id === 'relic_radio') {
        this.startCut([
          { cam: [relic.x, relic.y + 2, 18], narr: '真空铜管里泛着微弱的幽蓝光晕。贴近细听，里面竟传出微弱嘈杂的电流静电音。' },
          { who: 'io', say: '✦ zir · ◎ om ?', sub: '（伊奥抚摸着铜管：“铜管里在重复着一句话……‘休斯顿，休斯顿，收到请回答’？……苍穹之上，真的有另一个世界吗？”）' },
          { who: 'ash', say: '☼ sol · ✦ zir !', sub: '（艾什握紧了拳头：“语言不是被神夺走的……是我们自己遗忘了曾飞上星空的记忆。”）' }
        ], () => {
          this.hud.banner('【奇迹物揭秘】听到了来自上古星际的千里回音！符文石 +1', 'story');
        });
      }
    }

    objectiveDone(key) {
      if (key === 'opensource') return this.openSourceDone;
      const [k, id] = key.split(':');
      if (k === 'recruit') return this.units.some(u => u.id === id && u.recruited);
      if (k === 'build') { const b = this.builds.find(q => q.id === id); return b && b.done; }
      if (k === 'plate') { const p = this.plates.find(q => q.id === id); return p && p.ever; }
      if (k === 'lever') { const l = this.levers.find(q => q.id === id); return l && l.active; }
      if (k === 'stele') { const s = this.steles.find(q => q.id === id); return s && s.active; }
      if (k === 'gate') { const g = this.gates.find(q => q.id === id); return g && g.ever; }
      if (k === 'final') return this.finalDone;
      if (k === 'exit') return this.exiting;
      return false;
    }
    breadCount() { return this.units.reduce((n, u) => n + (u.recruited ? u.stack.filter(t => t === 'bread' || t === 'dates' || t === 'meat' || t === 'water').length : 0), 0); }
    hungerFactor() { return this.food <= 0 ? 0.6 : 1; }

    exitStatus() {
      if (!this.exit) return null;
      const mem = this.units.filter(u => u.recruited);
      const at = mem.filter(u => u.grounded && Math.abs(u.x - this.exit.x) < 1.8 && Math.abs(u.y - this.exit.y) < 0.5).length;
      return { at, total: mem.length + (this.exit.needRecruit && !mem.some(u => u.id === this.exit.needRecruit) ? 1 : 0) };
    }

    // ═══════════════════ 主循环 ═══════════════════
    loop() {
      requestAnimationFrame(() => this.loop());
      const now = performance.now();
      let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      if (window.DEV_PARAMS && typeof window.DEV_PARAMS.timeScale === 'number') {
        dt *= window.DEV_PARAMS.timeScale;
      }
      this.time += dt;
      if (this.state === 'play' || this.state === 'title' || this.state === 'ending') this.update(dt);
      this.render(dt);
    }

    stepPhysics(dt, settle) {
      this.computeSupports();
      this.updateMechanisms(dt);
      this.computeSupports();
      if (!settle) {
        this.units.forEach(u => { if (u.recruited) u.think(dt); else if (u.grounded) u.vx = 0; });
        this.updateDirectControls(dt);
        this.updateSquadFollow(dt);
      }
      this.units.forEach(u => u.physics(dt));
      this.crates.forEach(c => c.physics(dt));
      this.items.slice().forEach(i => i.physics(dt));
      if (!settle) this.rocks.forEach(r => r.update(dt));
    }

    // ════════════ 八方旅人风格：玩家全向直接操作与纵深探索 ════════════
    updateDirectControls(dt) {
      if (this.state !== 'play' || this.cut) return;
      if (this.keys['shift']) return; // Shift + 方向键保留自由平移观察视角

      const keyL = this.keys['a'] || this.keys['arrowleft'];
      const keyR = this.keys['d'] || this.keys['arrowright'];
      const keyU = this.keys['w'] || this.keys['arrowup'];
      const keyD = this.keys['s'] || this.keys['arrowdown'];

      if (!keyL && !keyR && !keyU && !keyD) return;

      const sel = (this.selection.size ? [...this.selection] : this.available()).filter(u => u.recruited && !u.fainted);
      if (!sel.length) return;

      this.follow = true;

      // 1. 水平行走 A / D / 左 / 右
      if (keyL || keyR) {
        const dir = keyL ? -1 : 1;
        sel.forEach(u => {
          if (u.state === 'climb') {
            // 在梯子上按左右可脱离梯子
            u.state = 'idle';
            u.vx = dir * u.speed();
            u.facing = dir;
          } else {
            u.order = null;
            u.path = null;
            u.vx = dir * u.speed();
            u.facing = dir;
            if (u.grounded) u.state = 'walk';
          }
        });
      }

      // 2. 梯子攀爬 / 门洞进出 / 大世界前后纵深走动 W / S / 上 / 下
      if (keyU || keyD) {
        sel.forEach(u => {
          // 检查附近爬梯通道（上下攀爬）
          const nearLadder = (this.ladders || []).find(lad =>
            Math.abs(lad.x - u.x) < 0.85 &&
            (keyU ? (u.y >= lad.y0 - 0.35 && u.y < lad.y1 - 0.1) : (u.y > lad.y0 + 0.1 && u.y <= lad.y1 + 0.65))
          );

          if (nearLadder) {
            u.order = null;
            u.path = null;
            u.state = 'climb';
            u.climbTo = keyU ? nearLadder.y1 : nearLadder.y0;
            u.x = nearLadder.x;
            u.vx = 0;
            return;
          }

          // 单向平台下穿：站在 oneway 平台时按 S / 下方向键，主动穿透跳至下层
          if (keyD && u.grounded && (u.grounded.kind === 'oneway' || u.grounded.kind === 'crate')) {
            u.dropThroughCooldown = 0.35;
            u.dropThroughKey = u.grounded.key;
            u.grounded = null;
            u.vy = -3.2;
            u.y -= 0.22;
            u.state = 'fall';
            return;
          }

          // 门洞进出（若刚好位于门前）
          if (keyU && this.checkDoorwayInteraction('in', true)) return;
          if (keyD && u.inInterior && this.checkDoorwayInteraction('out', true)) return;

          // 八方旅人风格：前后巷道与大世界纵深穿行
          const dz = keyU ? -dt * 4.0 : dt * 4.0;
          u.targetZ = Math.max(-4.8, Math.min(0.6, (u.targetZ || 0) + dz));
        });
      }
    }

    directJump() {
      const sel = (this.selection.size ? [...this.selection] : this.available()).filter(u => u.recruited && !u.fainted);
      if (!sel.length) return;
      let jumped = false;
      const jumpMul = (window.DEV_PARAMS && window.DEV_PARAMS.jumpMul) ? window.DEV_PARAMS.jumpMul : 1.0;
      sel.forEach(u => {
        if (u.grounded && u.state !== 'climb') {
          const rise = Math.max(0.65, u.maxRise ? u.maxRise() : 1.6) * jumpMul;
          u.vy = Math.sqrt(2 * 32 * rise);
          u.grounded = null;
          u.state = 'jump';
          jumped = true;
          if (u.stack && u.stack.length > 0 && window.Achievements) {
            window.Achievements.unlock('hercules_hop');
          }
        }
      });
      if (jumped) {
        SFX.playTone(420, 'sine', 0.08, 0.04);
      } else {
        this.selectAll();
      }
    }

    // 仿 Run! Zombie Food 工兵团阵型伴随跟随
    updateSquadFollow(dt) {
      if (this.state !== 'play' || this.cut) return;
      const leader = (this.leader && this.leader.recruited && !this.leader.fainted) ? this.leader : (this.units.find(u => u.recruited && !u.fainted) || null);
      if (!leader) return;

      const followers = this.units.filter(u => u.recruited && !u.fainted && !u.detached && u !== leader && !u.order && u.state !== 'climb');
      if (!followers.length) return;

      followers.forEach((u, idx) => {
        // 同步室内外状态与深度
        if (Math.abs((u.targetZ || 0) - (leader.targetZ || 0)) > 0.15) {
          u.targetZ = leader.targetZ;
        }
        u.inInterior = leader.inInterior;

        // 跟随间距与松散队形（Run Zombie Food 阵型跟随）
        const dir = leader.facing || 1;
        const targetDist = 1.1 + idx * 0.75;
        const targetX = leader.x - dir * targetDist;
        const dx = targetX - u.x;
        const dist = Math.abs(dx);

        if (u.squadFollowActive) {
          if (dist < 0.45) {
            u.squadFollowActive = false;
            u.vx = 0;
            if (u.grounded) u.state = 'idle';
          } else {
            const stepDir = dx > 0 ? 1 : -1;
            u.facing = stepDir;
            u.vx = stepDir * u.speed() * 0.92;
            if (u.grounded) u.state = 'walk';
          }
        } else {
          // 当离目标点超过 1.6m，或者领队正在行走且队员落后超过 1.1m 时启动伴随
          if (dist > 1.6 || (leader.state === 'walk' && dist > 1.1)) {
            u.squadFollowActive = true;
          }
        }

        // 跟随跳跃：当领队在高台或起跳，且队员遇到台阶断层时自动借力起跳
        if (u.grounded && leader.y > u.y + 0.75 && Math.abs(u.x - leader.x) < 3.2 && u.vy <= 0) {
          if (Math.random() < dt * 4.0) {
            const rise = Math.max(0.65, u.maxRise ? u.maxRise() : 1.6);
            u.vy = Math.sqrt(2 * 32 * rise);
            u.grounded = null;
            u.state = 'jump';
          }
        }

        // 跟随爬梯：如果领队比队员高出 2m 以上，且队员附近有梯子，队员自主沿梯而上
        if (leader.y > u.y + 2.0 && u.grounded) {
          const lad = (this.ladders || []).find(l => Math.abs(l.x - u.x) < 1.0 && u.y >= l.y0 - 0.2 && u.y < l.y1 - 0.5);
          if (lad) {
            u.state = 'climb';
            u.climbTo = lad.y1;
            u.x = lad.x;
            u.vx = 0;
          }
        }
      });
    }

    update(dt) {
      const lv = this.level;
      const inCut = !!this.cut;
      if (this.state === 'play' && !inCut) { this.levelTime += dt; this.playTime += dt; }
      if (window.DEV_PARAMS && window.DEV_PARAMS.infiniteFood) this.food = 100;

      // 搞笑成就检测：摸鱼乐迷 (聆听鲁特琴满 60 秒)
      if (window.SFX && window.SFX.bgmPlaying && !inCut) {
        this.luteListenTimer = (this.luteListenTimer || 0) + dt;
        if (this.luteListenTimer >= 60 && window.Achievements) {
          window.Achievements.unlock('lute_trance');
        }
      }

      // 搞笑成就检测：摸鱼艺术家 (全队在枯井边呆立超过 25 秒)
      const nearWell = this.units.some(u => u.recruited && !u.fainted && Math.abs(u.x - 29.5) < 3.2 && u.y <= 0.6 && u.y >= -1.0);
      if (nearWell && !inCut) {
        this.idleNearWellTimer = (this.idleNearWellTimer || 0) + dt;
        if (this.idleNearWellTimer >= 25 && window.Achievements) {
          window.Achievements.unlock('loafing_art');
        }
      } else {
        this.idleNearWellTimer = 0;
      }

      // 两个子步，保证落石/推箱稳定
      this.stepPhysics(dt / 2); this.stepPhysics(dt / 2);
      this.fx.update(dt);
      this.world.anim.forEach(a => a.update(dt, this.time));
      const currentLeader = (this.leader && this.leader.recruited && !this.leader.fainted) ? this.leader : (this.units.find(u => u.recruited && !u.fainted) || this.units[0]);
      this.chain = LANG.computeChain(this.units, currentLeader, lv.chainRange);
      if (this.state !== 'play') return;

      // 招募
      this.units.forEach(s => {
        if (s.recruited) return;
        s.idleBubbleT -= dt;
        if (s.idleBubbleT <= 0) { s.idleBubbleT = 6 + Math.random() * 4; s.say(LANG.utter(s.langs, 'no').text, 2.2); }
        const friend = this.units.find(u => u.recruited && Math.hypot(u.x - s.x, u.y - s.y) < 3.0 && LANG.shared(u, s).length);
        if (friend) {
          this.recruitUnit(s, friend);
        }
        if (!s.recruited && Math.random() < dt * 0.1) {
          const near = this.units.find(u => u.recruited && Math.hypot(u.x - s.x, u.y - s.y) < 3.0);
          if (near) this.hud.banner(`${s.name}只会 ${s.langs.join(' ')}。队伍里需要懂其中一种语言的人靠近`, 'warn');
        }
      });

      // 浮动特殊协作/情境动作检测（支持鼠标点击与 F 键触发）
      if (!this.coopActive) {
        let promptHandled = false;
        if (this.levelIdx === 0) {
          const inWell = this.units.filter(u => u.x > 29.4 && u.x < 33.6 && u.y < -1.5);
          const memEdge = this.available().filter(u => u.y >= -0.5 && Math.abs(u.x - 30.5) < 3.8);
          const selInWell = inWell.filter(u => this.selection.has(u));
          const selOnEdge = memEdge.filter(u => this.selection.has(u));

          // 叠罗汉与捞人严格分开：
          // A. 选中的队员在井下，或者上方无人且井下有 2 人以上 -> 优先触发「叠罗汉」
          if (inWell.length >= 2 && (selInWell.length > 0 || memEdge.length === 0)) {
            const topUnit = inWell[inWell.length - 1];
            this.showCoopPrompt(`👥 协同「叠罗汉」：搭人梯送顶层【${topUnit.name}】跃出井口`, () => this.humanLadder());
            promptHandled = true;
          }
          // B. 上方有人且井下有人待救援 -> 触发「捞人」
          else if (inWell.length >= 1 && memEdge.length >= 1) {
            if (memEdge.length >= 2) {
              this.showCoopPrompt('🤝 两人人链「探井捞人」：俯身探入井口拉起队友', () => this.pullUpTeammate());
              promptHandled = true;
            } else {
              this.showCoopPrompt('✋ 悬臂「伸手捞人」：趴在井边拉起下方队友', () => this.pullUpTeammate());
              promptHandled = true;
            }
          }
          // C. 兜底：井下有 2 人以上 -> 「叠罗汉」
          else if (inWell.length >= 2) {
            const topUnit = inWell[inWell.length - 1];
            this.showCoopPrompt(`👥 协同「叠罗汉」：搭人梯送顶层【${topUnit.name}】跃出井口`, () => this.humanLadder());
            promptHandled = true;
          }
        }

        if (!promptHandled) {
          // 通用高台「叠罗汉」检测（高台下方 2 人以上选定，搭人梯送顶层上台）
          const sel = this.available().filter(u => this.selection.has(u) && u.grounded && !u.order);
          if (sel.length >= 2) {
            const avgX = sel.reduce((s, u) => s + u.x, 0) / sel.length;
            const avgY = sel.reduce((s, u) => s + u.y, 0) / sel.length;
            const highPlat = this.plats.find(p => p[2] > avgY + 1.3 && p[2] <= avgY + 3.4 && (avgX >= p[0] - 1.8 && avgX <= p[1] + 1.8));
            if (highPlat && (avgX < 28 || avgX > 35)) {
              const topU = sel[sel.length - 1];
              this.showCoopPrompt(`👥 协同「叠罗汉」：搭人梯助【${topU.name}】跃上高台`, () => this.humanLadderOnLedge(sel, highPlat));
              promptHandled = true;
            }
          }
        }

        if (!promptHandled) {
          // 通用高台「捞人」检测（高台上队员伸手拉拔下方队友）
          const sel = this.available().filter(u => this.selection.has(u) && u.grounded);
          if (sel.length >= 1) {
            const topU = sel[0];
            const botU = this.available().find(u => !u.fainted && u.grounded && Math.abs(u.x - topU.x) < 2.2 && (topU.y - u.y) >= 1.3 && (topU.y - u.y) <= 2.8);
            if (botU && (topU.x < 28 || topU.x > 35)) {
              this.showCoopPrompt(`✋ 平台「捞人」：伸手拉起下方的【${botU.name}】`, () => this.pullUpOnLedge(topU, botU));
              promptHandled = true;
            }
          }
        }

        if (!promptHandled) {
          // 升降台拉绳快捷提示：选中的队员位于升降台上且升降台未在移动
          const sel = this.available().filter(u => this.selection.has(u));
          const riderOnLift = sel.find(u => (u.grounded && u.grounded.key && u.grounded.key.startsWith('L')) || this.lifts.some(l => u.x >= l.x1 - 0.25 && u.x <= l.x2 + 0.25 && Math.abs(u.y - l.y) < 0.35));
          if (riderOnLift) {
            const lf = this.lifts.find(l => 'L' + l.id === riderOnLift.grounded?.key || (riderOnLift.x >= l.x1 - 0.25 && riderOnLift.x <= l.x2 + 0.25 && Math.abs(riderOnLift.y - l.y) < 0.35));
            if (lf && !lf.moving) {
              const powered = !lf.trigger || this.isActive(lf.trigger);
              if (powered) {
                this.showCoopPrompt('⛓️ 拉动悬挂缆绳启动升降机', () => this.operateLift(lf, riderOnLift));
                promptHandled = true;
              }
            }
          }
        }
        
        // 3. 云之回廊断崖「协力托举跨越」（Level 2）
        if (!promptHandled && this.levelIdx === 2) {
          const sofi = this.units.find(u => u.id === 'sofi' && u.recruited);
          const b1 = this.builds.find(q => q.id === 'b1');
          if (sofi && b1 && !b1.done) {
            const nearEdge = this.available().filter(u => Math.abs(u.x - 59.5) < 3.2 && Math.abs(u.y - 10) < 1.5);
            if (nearEdge.includes(sofi) && nearEdge.length >= 2) {
              this.showCoopPrompt('🤝 协力托举：合力将身轻的苏菲拉送过云海断崖！', () => this.flingTeammate());
              promptHandled = true;
            }
          }
        }
        
        // 4. 圣书图书馆「开源条约」（Level 3）
        if (!promptHandled && this.levelIdx === 3 && !this.openSourceDone) {
          const selNear = this.available().find(u => Math.abs(u.x - 44) < 3.6 && Math.abs(u.y - 5) < 2.0);
          if (selNear) {
            this.showCoopPrompt('📜 发起【开源条约】：破除部落偏见，共享双语知识与机关图纸', () => this.openSourceEvent());
            promptHandled = true;
          }
        }
        
        // 5. 违和感奇迹遗物调查（各层）
        if (!promptHandled) {
          const relic = this.getNearbyRelic();
          if (relic && !this.relicsInspected.has(relic.id)) {
            this.showCoopPrompt(`🔍 调查奇迹遗物：${relic.name}`, () => this.investigateRelic(relic));
            promptHandled = true;
          }
        }
        if (!promptHandled && this.coopAction) {
          this.hideCoopPrompt();
        }
      }

      // 符文石、检查点、坠落
      this.units.forEach(u => {
        if (!u.recruited) return;
        this.runes = this.runes.filter(r => {
          if (Math.abs(u.x - r.x) < 0.7 && Math.abs(u.y - r.y) < 1.2) {
            this.entRoot.remove(r.mesh); this.world.root.remove(r.mesh); this.world.root.remove(r.glow);
            this.runesHere++; this.runesTotal++; this.fx.sparkle(r.x, r.y + 0.8); SFX.playRelicPickup();
            this.hud.banner(`${u.name}拾得一块符文石（本层 ${this.runesHere}/${this.runesHere + this.runes.length - 1}）`, 'good');
            return false;
          }
          return true;
        });
        this.checkpoints.forEach(c => { if (!c.reached && Math.abs(u.x - c.x) < 1.2 && Math.abs(u.y - c.y) < 1) { c.reached = true; c.flag.material.color.set('#f0c040'); this.checkpoint = c; this.hud.banner('检查点已点亮', 'info'); } });
        if (u.y < lv.voidY) this.respawn(u);
      });

      // 口粮与 Run! Zombie Food 即时策略饥饿管理（在编农夫恩基/拓荒农夫减轻全队 50% 消耗；留驻不消耗口粮）
      const active = this.units.filter(u => u.recruited && !u.detached && !u.fainted).length;
      const hasFarmer = this.units.some(u => u.recruited && !u.detached && !u.fainted && (u.id === 'enki' || u.role === '采粮农夫' || u.role === '拓荒农夫'));
      const foodBurnRate = hasFarmer ? 0.5 : 1.0;
      this.foodRate = active > 0 ? `(-${(0.02 * active * foodBurnRate).toFixed(2)}/s)` : '(0.00/s)';
      if (active > 0) {
        this.food -= dt * 0.38 * active / 3 * foodBurnRate;
      }

      // 急救昏迷队友
      const faintedUnit = this.units.find(u => u.recruited && u.fainted);
      if (faintedUnit) {
        const savior = this.units.find(u => u.recruited && !u.fainted && !u.detached && (u.stack.includes('meat') || u.stack.includes('bread')) && Math.hypot(u.x - faintedUnit.x, u.y - faintedUnit.y) < 2.0);
        if (savior) {
          const item = savior.stack.includes('meat') ? 'meat' : 'bread';
          savior.stack.splice(savior.stack.lastIndexOf(item), 1);
          savior.refreshStack();
          faintedUnit.revive();
          this.food = Math.min(100, this.food + 20);
          savior.say(savior.langs[0] + ' ! ✦ (喂食急救)');
          this.hud.banner(`✨ ${savior.name}用${item === 'meat' ? '熏肉干' : '麦饼'}救醒了昏迷的队友 ${faintedUnit.name}！`, 'good');
        }
      }

      if (this.food < 30) {
        const carrier = this.units.find(u => u.recruited && !u.fainted && (u.stack.includes('bread') || u.stack.includes('dates') || u.stack.includes('meat') || u.stack.includes('water')));
        if (carrier) {
          let foodItem = 'bread';
          if (carrier.stack.includes('meat')) foodItem = 'meat';
          else if (carrier.stack.includes('dates')) foodItem = 'dates';
          else if (carrier.stack.includes('bread')) foodItem = 'bread';
          else if (carrier.stack.includes('water')) foodItem = 'water';

          carrier.stack.splice(carrier.stack.lastIndexOf(foodItem), 1);
          carrier.refreshStack();

          if (foodItem === 'meat') {
            this.food = Math.min(100, this.food + 50);
            carrier.say(carrier.langs[0] + ' 🍖 (分享熏肉干！)');
            this.hud.banner(`${carrier.name}分发高能熏肉干，全队饱食度恢复！`, 'good');
          } else if (foodItem === 'dates') {
            this.food = Math.min(100, this.food + 35);
            carrier.hasteT = 20.0;
            carrier.say(carrier.langs[0] + ' 🍯 (甘美椰枣！)');
            this.hud.banner(`${carrier.name}开袋分食椰枣蜜饯，全员健步如飞！`, 'good');
          } else if (foodItem === 'water') {
            this.food = Math.min(100, this.food + 20);
            carrier.say(carrier.langs[0] + ' 💧 (甘冽清泉！)');
            this.hud.banner(`${carrier.name}传递陶罐甘泉，消渴解热！`, 'info');
          } else {
            this.food = Math.min(100, this.food + 30);
            carrier.say(carrier.langs[0] + ' 🍞 (开袋分饼！)');
            this.hud.banner(`${carrier.name}主动开袋分粮，全队饱食度恢复！`, 'info');
          }
          this.starveTimer = 0;
        } else if (this.food <= 0) {
          if (!this.hungryWarned) {
            this.hungryWarned = true;
            this.hud.banner('⚠️ 随身口粮耗尽！全员减速并人心涣散，请尽快采收麦田或补给！', 'warn');
          }
          this.starveTimer = (this.starveTimer || 0) + dt;
          // 持续饥饿导致脱力昏迷
          if (this.starveTimer > 25) {
            this.starveTimer = 0;
            const victim = this.units.find(u => u.recruited && !u.fainted && u !== this.leader) || this.units.find(u => u.recruited && !u.fainted);
            if (victim) {
              victim.faint();
            }
          }
        }
      }
      if (this.food > 10) {
        this.hungryWarned = false;
        this.starveTimer = 0;
      }
      this.food = Math.max(0, this.food);

      // 震颤与落石
      if (!inCut && lv.tremor) {
        this.tremorT -= dt;
        const hanging = this.rocks.filter(r => r.state === 'hang');
        if (this.tremorT < 2.2 && !this.tremorWarned && hanging.length) { this.tremorWarned = true; this.hud.banner('塔身震颤！小心头顶松动的石块', 'danger'); SFX.playThunder(); }
        if (this.tremorT < 2.2 && hanging.length) { this.shake(0.12); hanging.forEach(r => r.wobble = 1); }
        if (this.tremorT <= 0) {
          this.tremorT = lv.tremor.period; this.tremorWarned = false;
          this.shake(0.6); SFX.playThunder();
          hanging.forEach(r => r.wobble = 0);
          if (hanging[0]) hanging[0].release();
          if (hanging.length > 2 && hanging[2]) hanging[2].release();
        }
      }

      // 提示
      if (!inCut && lv.hints && this.hintIdx < lv.hints.length && this.levelTime > lv.hints[this.hintIdx][0]) { $('hint-line').textContent = lv.hints[this.hintIdx][1]; this.hud.banner(lv.hints[this.hintIdx][1], 'story'); this.hintIdx++; }

      // 出口
      if (this.exit && !this.exiting && !inCut) {
        const st = this.exitStatus();
        const ok = !this.exit.needRecruit || this.units.some(u => u.id === this.exit.needRecruit && u.recruited);
        if (st.at === st.total && st.total > 0 && ok) this.completeLevel();
      }
      // 终章
      if (lv.finalTrigger && !this.finalDone && this.isActive(lv.finalTrigger)) this.startEnding();

      // 过场自动推进
      if (this.cut) { this.cut.t += dt; if (this.cut.t > (this.cut.line.auto || 7)) this.advanceCut(); }
    }

    respawn(u) {
      const c = this.checkpoint;
      u.x = c.x + (Math.random() - 0.5) * 1.2; u.y = c.y + 0.3; u.vx = 0; u.vy = 0; u.grounded = null; u.state = 'fall';
      const lost = u.stack.length; u.stack = []; u.refreshStack();
      u.order = null; u.path = null; u.task = { type: 'stun', t: 1.2 };
      SFX.playThunder();
      this.hud.banner(`${u.name}掉下了塔……在检查点醒来${lost ? `，背负的 ${lost} 件物资遗失了` : ''}`, 'danger');
    }

    completeLevel() {
      this.exiting = true;
      this.units.forEach(u => { if (u.recruited) this.stacks[u.id] = u.stack.slice(); });
      const next = this.levelIdx + 1;
      localStorage.setItem('babel_unlocked', String(Math.max(this.unlocked(), next + 1)));
      localStorage.setItem('babel_runes', String(this.runesTotal));
      SFX.playMiracle();
      this.startCut(this.level.outro, () => {
        this.ascendToLevel(next);
      });
    }

    ascendToLevel(next) {
      if (next >= LEVELS.length) {
        this.fade(() => {
          $('ending').classList.add('on');
          $('ending').scrollTop = 0;
        });
        return;
      }
      const prevName = this.level.name;
      const nextLv = LEVELS[next];
      const altitudes = [
        '海拔 0m ~ 120m',
        '海拔 120m ~ 380m',
        '海拔 380m ~ 850m',
        '海拔 850m ~ 1400m',
        '海拔 1400m ~ 2000m'
      ];
      const prevAlt = altitudes[this.levelIdx] || '海拔 0m';
      const nextAlt = altitudes[next] || '天穹之巅';

      const ascentEl = $('ascent-screen');
      if (ascentEl) {
        $('ascent-from').textContent = `${prevName} · ${prevAlt}`;
        $('ascent-to').textContent = `${nextLv.name} · ${nextAlt}`;
        $('ascent-sub').textContent = nextLv.sub;
        ascentEl.classList.add('on');
      }

      // 连续空间攀升：镜头平滑仰角上移，视线穿过云端直抵上一层塔身
      this.follow = false;
      this.camT.y += 15;
      this.camT.dist = 36;

      // 连续爬塔升阶音符
      SFX.playTone(260, 'sine', 0.8, 0.1);
      setTimeout(() => SFX.playTone(330, 'sine', 0.8, 0.1), 350);
      setTimeout(() => SFX.playTone(392, 'sine', 0.8, 0.12), 700);
      setTimeout(() => SFX.playTone(523, 'sine', 1.0, 0.15), 1050);

      setTimeout(() => {
        this.loadLevel(next);
        this.cam.y = nextLv.spawn.y + 10;
        this.camT.y = nextLv.spawn.y + 2;
        this.camT.x = nextLv.spawn.x + 4;
        this.camT.dist = 22;
        this.follow = true;
        setTimeout(() => {
          if (ascentEl) ascentEl.classList.remove('on');
          this.hud.banner(`🏛️ 远征队全员登上海拔 ${nextAlt}：${nextLv.name} · ${nextLv.sub}`, 'story');
        }, 600);
      }, 1500);
    }

    fade(mid) { const f = $('fade'); f.classList.add('on'); setTimeout(() => { mid(); setTimeout(() => f.classList.remove('on'), 300); }, 700); }

    shake(a) { this.shakeA = Math.max(this.shakeA, a); this.shakeT = 0.6; }

    // ═══════════════════ 过场 ═══════════════════
    startCut(lines, onDone) {
      if (!lines || !lines.length) { onDone && onDone(); return; }
      this.cut = { lines, i: -1, t: 0, onDone };
      this.advanceCut();
    }
    advanceCut() {
      const c = this.cut; if (!c) return;
      c.i++; c.t = 0;
      if (c.i >= c.lines.length) { this.cut = null; this.hud.hideCut(); this.follow = true; c.onDone && c.onDone(); return; }
      const line = c.lines[c.i]; c.line = line;
      if (line.cam) {
        this.camT.x = line.cam[0]; this.camT.y = line.cam[1]; this.camT.dist = line.cam[2]; this.follow = false;
      }
      if (line.act) line.act();
      if (line.who) {
        const u = this.units.find(q => q.id === line.who);
        if (u) {
          u.say(line.say, 5);
          // 电影感运镜：对话时特写近景聚焦讲话人物
          if (!line.cam) {
            this.camT.x = u.x;
            this.camT.y = u.y + 0.85;
            this.camT.dist = 11.5;
            this.follow = false;
          }
        }
      }
      if (line.narr || line.who) this.hud.showCut(line); else this.hud.hideCut();
    }

    startEnding() {
      this.finalDone = true;
      const arm = this.world.anim.filter(a => a.armillary);
      const mem = this.units.filter(u => u.recruited);
      this.startCut([
        { cam: [32, 15, 36], narr: '五个符号同时亮起。天球仪停了一瞬——然后开始倒转。', act: () => { arm.forEach(a => a.armillary.userData.speed = -5); SFX.playMiracle(); this.shake(0.4); } },
        { narr: '他们不约而同地走向圣坛。这一次，没有人下达指令。', act: () => mem.forEach((u, i) => { u.task = null; u.setOrder({ type: 'move', goal: { x: 29.5 + i * 1.2, y: 8 } }); }), auto: 6 },
        { cam: [32, 10, 18], who: 'ash', say: '☼ ♒ ▲ ◎ ✦', sub: '（所有人同时伸出了左手）', act: () => mem.forEach(u => { u.order = null; u.path = null; u.vx = 0; u.task = { type: 'hand' }; u.facing = u.x < 32 ? 1 : -1; }) },
        { narr: '在光里，他们看见了塔的真相：巴别塔从未倒塌。每当人们愿意替彼此翻译一句话，它就长高一层；每当他们忘记彼此，它就碎成新的语言，等待下一群人重新攀登。', act: () => { arm.forEach(a => a.armillary.userData.speed = 9); $('fade').classList.add('glow'); } },
        { narr: '所谓「上帝之手」，原来是所有人的手叠在一起时的形状。', auto: 8 },
        { narr: '塔顶的光熄灭了。很远很远的塔底，一个孩子说出了第一个词。', auto: 8 }
      ], () => {
        $('fade').classList.remove('glow');
        localStorage.setItem('babel_runes', String(this.runesTotal));
        $('end-stats').textContent = `符文石 ${this.runesTotal} / 13　·　用时 ${Math.floor(this.playTime / 60)} 分 ${Math.floor(this.playTime % 60)} 秒`;
        
        // 绘制凡人群像各时代先驱的像素面容
        document.querySelectorAll('.ensemble-avatar').forEach(cvs => {
          const id = cvs.dataset.id;
          const member = LANG.MEMBERS[id];
          if (member && PX.drawPortraitToCanvas) {
            PX.drawPortraitToCanvas(cvs, member.pal);
          }
        });

        $('ending').classList.add('on'); this.state = 'ending';
      });
    }

    // ═══════════════════ 指令与民主领队 ═══════════════════
    available() { return this.units.filter(u => u.recruited && !u.detached); }
    setLeader(u) {
      if (!u || !u.recruited || u.fainted) return;
      this.leader = u;
      this.selection.clear();
      this.selection.add(u);
      this.follow = true;
      SFX.playUIClick();
      u.say(`👑 ${u.langs[0]} ${u.role}!`, 1.6);
      this.hud.banner(`👑 民主领队换为【${u.name} · ${u.role}】（全队保持阵型伴随）`, 'story');
      this.hud.dirty = true;
    }
    selectMember(u) {
      if (!u || !u.recruited) return;
      this.selection.clear();
      this.selection.add(u);
      this.follow = true;
      this.hud.dirty = true;
      SFX.playTone(560, 'sine', 0.08, 0.05);
    }
    selectOnly(u) {
      this.selectMember(u);
    }
    toggleDetach(u) {
      if (!u || !u.recruited) return;
      u.detached = !u.detached;
      if (u.detached) {
        this.selection.delete(u);
        u.say(u.langs[0] + ' ' + LANG.ACT.hold, 1.8);
        this.hud.banner(`🛡️ ${u.name}已原地留驻防守（不消耗口粮）`, 'info');
      } else {
        u.say(u.langs[0] + ' ' + LANG.ACT.ok, 1.8);
        this.hud.banner(`🏃 ${u.name}归队随行`, 'info');
      }
      SFX.playTone(u.detached ? 300 : 420, 'triangle', 0.15, 0.08);
      this.hud.dirty = true;
    }
    dropFromHUD(u, i) {
      const it = u.dropTop(i);
      if (it) { u.say(u.langs[0] + ' ' + LANG.ACT.drop, 1.4); }
    }

    // 沿语言链把指令传给一名队员
    deliver(u, order) {
      if (!this.chain.connected.has(u)) {
        // 策划案白板机制：队内手语/信号
        if (this.teamSignal && this.teamSignal.learned) {
          const leader = this.leader || this.units.find(q => q.recruited && !q.fainted);
          const dist = leader ? Math.hypot(u.x - leader.x, (u.y - leader.y) * 1.2) : 999;
          if (dist < 35) {
            const roll = Math.random();
            if (roll < this.teamSignal.proficiency) {
              u.say('✋ ' + (LANG.ACT[order.type] || '→'), 1.8);
              this.hud.banner(`${u.name}通过队内手语领会了手势指令（熟练度 ${Math.round(this.teamSignal.proficiency * 100)}%）`, 'good');
              SFX.playTone(460, 'triangle', 0.15, 0.05, 540);
              u.pending = { order, t: 0.1 };
              this.teamSignal.proficiency = Math.min(1.0, this.teamSignal.proficiency + 0.02);
              return true;
            } else {
              u.say('✋ … ? ⤹', 2.0);
              this.hud.banner(`手语不熟练：${u.name}困惑地揉了揉眼睛迟疑片刻，稍后才反应过来`, 'warn');
              SFX.playTone(220, 'square', 0.25, 0.06, 180);
              u.task = { type: 'stun', t: 0.9 };
              setTimeout(() => {
                if (u.alive) {
                  u.say('✋ !', 1.2);
                  u.setOrder(order);
                }
              }, 1000);
              return true;
            }
          }
        }
        u.say('… ? …', 2.0);
        this.hud.banner(`语言链断开：${u.name}听不见指令。靠近一些，留人当中继，或按 8 传授队内手语`, 'warn');
        SFX.playTone(160, 'square', 0.2, 0.05, 120);
        return false;
      }
      const path = LANG.chainPath(this.chain, u);
      if (path.length) this.hud.pulse(path);
      u.pending = { order, t: path.length * HOP + 0.01 };
      return true;
    }

    teachSignal() {
      const leader = (this.leader && this.leader.recruited && !this.leader.fainted) ? this.leader : this.units.find(u => u.recruited && !u.fainted);
      if (!leader) {
        this.hud.banner('当前队伍无可用领队，无法示范队内手语', 'warn');
        return;
      }
      const mem = this.available();
      if (mem.length <= 1) {
        this.hud.banner('当前队伍只有一人，无需传授队内手语', 'info');
        return;
      }
      leader.order = null; leader.path = null; leader.vx = 0;
      leader.say('✋ ' + (leader.langs ? leader.langs.join(' · ') : '☼') + ' !', 2.2);
      leader.task = { type: 'operate', t: 1.5 };
      SFX.playTone(520, 'sine', 0.25, 0.08, 660);
      
      if (!this.teamSignal.learned) {
        this.teamSignal.learned = true;
        this.teamSignal.proficiency = 0.75;
        this.teamSignal.timesTaught = 1;
        this.hud.banner(`【队内手语已掌握】${leader.name}（${leader.role}）传授了视觉手语！语言链断开时，视线内仍可指挥队员（初始熟练度 75%）`, 'story');
        mem.forEach(u => {
          if (u !== leader) {
            setTimeout(() => {
              u.say('✋ !', 1.5);
              this.fx.sparkle(u.x, u.y + 1.2);
            }, 350 + Math.random() * 350);
          }
        });
      } else {
        this.teamSignal.timesTaught++;
        this.teamSignal.proficiency = Math.min(1.0, this.teamSignal.proficiency + 0.1);
        const pPct = Math.round(this.teamSignal.proficiency * 100);
        this.hud.banner(`全员反复演练队内手势，手语默契度提升至 ${pPct}%${pPct >= 100 ? '（心领神会，绝不误解）' : ''}`, 'good');
        mem.forEach(u => {
          if (u !== leader) {
            u.say('✋ ⊕ !', 1.2);
            this.fx.sparkle(u.x, u.y + 1.2);
          }
        });
      }
    }

    formation(units, x, y) {
      const surfs = this.surfaces();
      const s = NAV.findTarget(surfs, x, y);
      const sorted = units.slice().sort((a, b) => a.x - b.x);
      const n = sorted.length, sp = 0.72;
      const res = new Map();
      sorted.forEach((u, i) => {
        let gx = x + (i - (n - 1) / 2) * sp;
        if (s) gx = Math.max(s.x1 + 0.3, Math.min(s.x2 - 0.3, gx));
        res.set(u, { x: gx, y: s ? s.y : y });
      });
      return { res, surf: s };
    }

    nearest(units, x, y, filter) {
      let best = null, bd = Infinity;
      units.forEach(u => { if (filter && !filter(u)) return; const d = Math.hypot(u.x - x, (u.y - y) * 1.5); if (d < bd) { bd = d; best = u; } });
      return best;
    }

    findInteractable(wx, wy) {
      for (const it of this.items) if (Math.hypot(it.x - wx, it.y + 0.3 - wy) < 0.75) return { kind: 'item', obj: it };
      for (const c of this.crates) if (Math.abs(wx - c.x) < 0.7 && wy > c.y - 0.2 && wy < c.y + 1.2) return { kind: 'crate', obj: c };
      for (const s of this.steles) if (Math.abs(wx - s.x) < 0.8 && wy > s.y && wy < s.y + 2) return { kind: 'stele', obj: s };
      for (const l of this.levers) if (Math.abs(wx - l.x) < 0.7 && wy > l.y && wy < l.y + 1.7) return { kind: 'lever', obj: l };
      for (const b of this.builds) if (!b.done && wx > b.x1 - 0.3 && wx < b.x2 + 0.3 && Math.abs(wy - b.y) < 1.2) return { kind: 'build', obj: b };
      for (const p of this.plates) if (Math.abs(wx - p.x) < p.w / 2 + 0.35 && wy > p.y - 0.4 && wy < p.y + 1.5) return { kind: 'plate', obj: p };
      for (const l of this.lifts) if (wx > l.x1 && wx < l.x2 && wy > l.y - 0.7 && wy < l.y + 1.6) return { kind: 'lift', obj: l };
      for (const l of this.ladders) if ((!l.trigger || this.isActive(l.trigger)) && Math.abs(wx - l.x) < 0.55 && wy > l.y0 + 0.6 && wy < l.y1 + 0.4) return { kind: 'ladder', obj: l };
      if (this.exit && Math.abs(wx - this.exit.x) < 1.5 && wy > this.exit.y && wy < this.exit.y + 3.6) return { kind: 'exit', obj: this.exit };
      return null;
    }

    command(wx, wy, wz) {
      const sel = (this.selection.size ? [...this.selection] : this.available()).filter(u => u.recruited && !u.detached);
      if (!sel.length) { this.hud.banner('先用左键拖拽框选队员（或按 2 集结全员）', 'info'); return; }
      // 枯井快捷协作触发（点击枯井内或边缘时，若有就绪的协作动作直接执行）
      if (this.levelIdx === 0 && wx > 28.5 && wx < 34.0) {
        if (this.coopAction) { this.triggerCoopAction(); return; }
      }
      const hit = this.findInteractable(wx, wy);
      this.follow = true;
      const send = (u, order) => this.deliver(u, order);
      if (hit) {
        const o = hit.obj;
        switch (hit.kind) {
          case 'item': {
            const u = this.nearest(sel, o.x, o.y, q => q.stack.length < ENT.MAX_STACK);
            if (!u) { this.hud.banner('选中的人都背满了（每人最多 4 件）', 'warn'); return; }
            send(u, { type: 'pick', item: o, goalFn: () => o.alive ? { x: o.x, y: o.y } : null, act: 'pick' }); return;
          }
          case 'crate': {
            if (wy > o.y + 0.8) {
              const { res } = this.formation(sel, o.x, o.y + 1.0);
              sel.forEach(u => send(u, { type: 'move', goal: res.get(u), act: 'up' }));
              return;
            }
            const u = this.nearest(sel, o.x, o.y + 0.5);
            const dir = Math.sign(o.x - u.x) || 1;
            send(u, { type: 'push', goal: { x: o.x + dir * 3.5, y: o.y }, act: 'push' });
            return;
          }
          case 'stele': {
            let u = this.nearest(sel, o.x, o.y, q => o.langs.every(l => q.langs.includes(l)));
            if (!u) { u = this.nearest(sel, o.x, o.y); this.hud.banner(`石碑刻着 ${o.langs.join(' ')}：选中的人里没有同时懂这两种语言的`, 'warn'); }
            send(u, { type: 'stele', stele: o, goal: { x: o.x, y: o.y }, act: 'operate' }); return;
          }
          case 'lever': { const u = this.nearest(sel, o.x, o.y); send(u, { type: 'lever', lever: o, goal: { x: o.x - 0.5, y: o.y }, act: 'operate' }); return; }
          case 'build': {
            const builders = sel.filter(u => u.stack.includes('wood'));
            if (!builders.length) { this.hud.banner(`修筑需要木材：还缺 ${o.cost - o.progress} 根，选中的人没有背木材`, 'warn'); return; }
            builders.forEach(u => { const side = u.x < (o.x1 + o.x2) / 2 ? o.x1 - 0.45 : o.x2 + 0.45; send(u, { type: 'build', build: o, goal: { x: side, y: o.y }, act: 'build' }); });
            return;
          }
          case 'plate': {
            const n = sel.length;
            sel.forEach((u, i) => send(u, { type: 'plate', goal: { x: o.x + (i - (n - 1) / 2) * Math.min(0.45, o.w / Math.max(1, n)), y: o.y }, act: 'plate' }));
            return;
          }
          case 'lift': {
            if (o.trigger && !this.isActive(o.trigger)) {
              this.hud.banner('升降台未通电：把高台木箱推下边缘，压在 ⚖2 踏板上', 'warn');
              SFX.playTone(160, 'square', 0.2, 0.05, 120);
              return;
            }
            const onBoard = sel.filter(u => (u.grounded && u.grounded.key === 'L' + o.id) || (u.x >= o.x1 - 0.25 && u.x <= o.x2 + 0.25 && Math.abs(u.y - o.y) < 0.35));
            if (onBoard.length > 0) {
              // 选中的队员已在升降台上：再次点击升降台即拉动缆绳发车！
              this.operateLift(o, onBoard[0]);
              return;
            }
            sel.forEach((u, i) => send(u, { type: 'lift', goal: { x: Math.min(o.x2 - 0.35, o.x1 + 0.4 + i * 0.55), y: o.y }, act: 'up' }));
            this.hud.banner('队员正登台，站稳后点击升降台或按 E 拉动缆绳即可启动', 'info');
            return;
          }
          case 'ladder': {
            const goUp = sel.reduce((s, u) => s + u.y, 0) / sel.length < (o.y0 + o.y1) / 2;
            const { res } = this.formation(sel, o.x, goUp ? o.y1 : o.y0);
            sel.forEach(u => send(u, { type: 'move', goal: res.get(u), act: goUp ? 'up' : 'down' }));
            return;
          }
          case 'exit': {
            const { res } = this.formation(sel, o.x, o.y);
            sel.forEach(u => send(u, { type: 'move', goal: res.get(u), act: 'up' }));
            return;
          }
        }
      }
      const { res, surf } = this.formation(sel, wx, wy);
      if (!surf) { this.hud.banner('那里没有落脚的地方', 'info'); return; }
      if (surf.key && surf.key.startsWith('roof_')) {
        const rz = surf.z !== undefined ? surf.z : -2.6;
        sel.forEach(u => { u.targetZ = rz; });
      } else if (wz !== undefined) {
        sel.forEach(u => {
          u.targetZ = Math.max(-4.8, Math.min(0.6, wz));
          if (u.targetZ < -1.8 && this.level && this.level.doorways && this.level.doorways.some(d => Math.abs(d.x - u.x) < 2.5)) {
            u.inInterior = true;
          } else if (u.targetZ > -1.2) {
            u.inInterior = false;
          }
        });
      }
      sel.forEach(u => send(u, { type: 'move', goal: res.get(u), act: 'move' }));
      this.fx.spawn(wx, surf.y + 0.1, 6, '#ffd24a', 2, 0.5, 0.12, 0);
    }

    rally() {
      const all = this.available();
      if (!all.length) return;
      // 民主领队：以当前指定领队或单选队员为集结核心
      const leader = (this.leader && this.leader.recruited && !this.leader.fainted) ? this.leader : (this.selection.size === 1 ? [...this.selection][0] : null) || all[0];
      all.forEach(u => this.selection.add(u));
      const others = all.filter(u => u !== leader);
      if (!leader.grounded) return;
      const { res } = this.formation(all, leader.x, leader.y);
      SFX.playRallyCommand();
      leader.say('☼ ' + (LANG.ACT.rally || 'rally!') + ' · ' + (leader.langs ? leader.langs[0] : '☼'), 2);
      others.forEach(u => this.deliver(u, { type: 'rally', goal: res.get(u), act: 'rally' }));
      this.follow = true;
      this.hud.banner(`🚩 远征队全员集结向【${leader.name}】靠拢跟随！`, 'good');
    }

    // 仿 Run! Zombie Food 即时策略：远征队全员分头搜集/拾荒散落物资
    gatherAll() {
      const freeUnits = this.available().filter(u => this.selection.has(u) || this.selection.size === 0);
      if (!freeUnits.length) {
        this.hud.banner('远征队目前全员在执行任务，无空闲队员拾取', 'warn');
        return;
      }
      const looseItems = this.items.filter(it => it.alive && !it.heldBy);
      if (!looseItems.length) {
        this.hud.banner('周边没有散落的无人物资', 'info');
        return;
      }

      let assignedCount = 0;
      const claimedItems = new Set();
      freeUnits.forEach(u => {
        let bestItem = null, bestDist = 9999;
        looseItems.forEach(it => {
          if (claimedItems.has(it)) return;
          const d = Math.abs(it.x - u.x) + Math.abs(it.y - u.y) * 1.5;
          if (d < bestDist && d < 40) {
            bestDist = d;
            bestItem = it;
          }
        });
        if (bestItem) {
          claimedItems.add(bestItem);
          this.planAndOrder(u, { type: 'pick', item: bestItem }, { x: bestItem.x, y: bestItem.y });
          u.say('🎒 ' + (u.langs ? u.langs[0] : '☼') + ' pick!', 1.5);
          assignedCount++;
        }
      });

      if (assignedCount > 0) {
        SFX.playTone(392, 'triangle', 0.15, 0.08);
        this.hud.banner(`🎒 远征队分头出动：${assignedCount} 名队员前往拾取周边散落物资！`, 'good');
      } else {
        this.hud.banner('超出搜寻半径或队员负重已满', 'info');
      }
    }

    selectAll() {
      const av = this.available();
      if (!av.length) return;
      this.selection.clear();
      av.forEach(u => this.selection.add(u));
      SFX.playUIClick();
      this.hud.banner(`🚩 已全选巴别远征队全员（共 ${av.length} 人）`, 'good');
    }

    interact() {
      if (this.coopAction) { this.triggerCoopAction(); return; }
      const sel = [...this.selection];
      // 升降台拉绳互动：选中的队员在台上或靠近升降台
      const riderOnLift = sel.find(u => (u.grounded && u.grounded.key && u.grounded.key.startsWith('L')) || this.lifts.some(l => u.x >= l.x1 - 0.25 && u.x <= l.x2 + 0.25 && Math.abs(u.y - l.y) < 0.35));
      if (riderOnLift) {
        const lf = this.lifts.find(l => 'L' + l.id === riderOnLift.grounded?.key || (riderOnLift.x >= l.x1 - 0.25 && riderOnLift.x <= l.x2 + 0.25 && Math.abs(riderOnLift.y - l.y) < 0.35));
        if (lf) { this.operateLift(lf, riderOnLift); return; }
      }
      const nearLift = this.lifts.find(lf => sel.some(u => Math.abs(u.x - (lf.x1 + lf.x2) / 2) < 2.5 && Math.abs(u.y - lf.y) < 1.5));
      if (nearLift) {
        const caller = sel.find(u => Math.abs(u.x - (nearLift.x1 + nearLift.x2) / 2) < 2.5);
        this.operateLift(nearLift, caller);
        return;
      }
      sel.forEach(u => {
        const cands = [];
        this.steles.forEach(s => { if (!s.active) cands.push({ d: Math.abs(s.x - u.x) + Math.abs(s.y - u.y) * 2, o: { type: 'stele', stele: s, goal: { x: s.x, y: s.y }, act: 'operate' } }); });
        this.levers.forEach(l => { if (!l.active) cands.push({ d: Math.abs(l.x - u.x) + Math.abs(l.y - u.y) * 2, o: { type: 'lever', lever: l, goal: { x: l.x - 0.5, y: l.y }, act: 'operate' } }); });
        if (u.stack.includes('wood')) this.builds.forEach(b => { if (!b.done) { const side = u.x < (b.x1 + b.x2) / 2 ? b.x1 - 0.45 : b.x2 + 0.45; cands.push({ d: Math.abs(side - u.x) + Math.abs(b.y - u.y) * 2, o: { type: 'build', build: b, goal: { x: side, y: b.y }, act: 'build' } }); } });
        if (u.stack.length < ENT.MAX_STACK) this.items.forEach(it => cands.push({ d: Math.abs(it.x - u.x) + Math.abs(it.y - u.y) * 2, o: { type: 'pick', item: it, goalFn: () => it.alive ? { x: it.x, y: it.y } : null, act: 'pick' } }));
        cands.sort((a, b) => a.d - b.d);
        if (cands[0] && cands[0].d < 12) this.deliver(u, cands[0].o);
        else u.say(u.langs[0] + ' ?', 1.4);
      });
    }

    // ── 建筑室内外 Z 轴纵深进出切换 ──
    checkDoorwayInteraction(dir = 'in', quiet = false) {
      const sel = (this.selection.size ? [...this.selection] : this.available()).filter(u => !u.fainted);
      if (!sel.length) return false;
      const leader = sel[0];
      const doorways = this.level.doorways || [];
      const door = doorways.find(d => Math.abs(d.x - leader.x) < 2.5 && Math.abs(d.y - leader.y) < 1.4);
      if (!door) {
        if (dir === 'in' && !quiet) this.hud.banner('附近没有可进入的建筑门洞（走到房屋门前按 W 进入）', 'info');
        return false;
      }

      if (dir === 'in') {
        sel.forEach(u => {
          u.targetZ = -4.5;
          u.inInterior = true;
          u.say('🚪 ' + u.langs[0] + ' in~', 1.8);
        });
        this.camOffsetZ = 13;
        this.hud.banner(`进入了【${door.name}】（室内避风，按 S 或向下键可走出室外）`, 'story');
        if (window.Achievements) window.Achievements.unlock('octopath_crab');
        SFX.playGateClose();
      } else {
        sel.forEach(u => {
          u.targetZ = 0;
          u.inInterior = false;
          u.say('☼ ' + u.langs[0] + ' out~', 1.8);
        });
        this.camOffsetZ = 20;
        this.hud.banner(`走出了【${door.name}】，回到主干街道`, 'info');
        SFX.playGateOpen();
      }
      return true;
    }

    // ── 即时策略筑桥 / 摆箱搭设通道 ──
    buildBridgeOrRamp() {
      const sel = [...this.selection];
      const builder = sel.find(u => u.stack.includes('wood') || u.stack.includes('stone')) || this.units.find(u => u.recruited && (u.stack.includes('wood') || u.stack.includes('stone')));
      if (!builder) {
        this.hud.banner('【筑桥/摆箱】需要队员背负【🪵 原木】或【🪨 石砖】！请先拾取物资', 'warn');
        SFX.playTone(200, 'square', 0.2, 0.05);
        return;
      }
      // 如果附近有关卡预设的修筑点，优先交由修筑点
      const b = this.builds.find(q => !q.done && Math.abs(q.x1 - builder.x) < 4.5);
      if (b) {
        this.buildCmd();
        return;
      }

      const isInf = window.DEV_PARAMS && window.DEV_PARAMS.infiniteStone;
      const hasWood = builder.stack.includes('wood');
      if (hasWood) {
        // 消耗原木筑造木桥 (开启无限模式时不消耗)
        if (!isInf) builder.stack.splice(builder.stack.lastIndexOf('wood'), 1);
        builder.refreshStack();
        const bridgeX = builder.x + builder.facing * 1.8;
        const bridgeW = 3.6;
        const m = new THREE.Mesh(new THREE.BoxGeometry(bridgeW, 0.35, 2.4), new THREE.MeshLambertMaterial({ map: WORLD.woodTex('#9a6634', 1.8, 1) }));
        m.position.set(bridgeX, builder.y - 0.16, (window.WORLD && window.WORLD.arcZ) ? window.WORLD.arcZ(bridgeX, -0.2) : -0.2);
        m.castShadow = true; m.receiveShadow = true;
        this.entRoot.add(m);

        this.supports.push({
          x1: bridgeX - bridgeW / 2,
          x2: bridgeX + bridgeW / 2,
          y: builder.y,
          kind: 'bridge',
          mat: 'wood',
          key: 'dyn_bridge_' + Math.floor(builder.x * 10)
        });
        SFX.playBuildHammer();
        this.fx.chips(bridgeX, builder.y + 0.2);
        builder.say('⚒ ' + builder.langs[0] + ' ok! (搭桥成功)', 2.0);
        this.hud.banner('【即时铺桥成功】消耗 1 根原木，成功架设通行木板路！', 'good');
      } else {
        // 消耗石块摆设垫脚石阶 (开启无限模式时不消耗)
        if (!isInf) builder.stack.splice(builder.stack.lastIndexOf('stone'), 1);
        builder.refreshStack();
        const stoneX = builder.x + builder.facing * 1.4;
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.2), new THREE.MeshLambertMaterial({ map: WORLD.stoneTex('#b8ad98', 1, 1, 23) }));
        m.position.set(stoneX, builder.y + 0.45, (window.WORLD && window.WORLD.arcZ) ? window.WORLD.arcZ(stoneX, -0.2) : -0.2);
        m.castShadow = true; m.receiveShadow = true;
        this.entRoot.add(m);

        this.supports.push({
          x1: stoneX - 0.6,
          x2: stoneX + 0.6,
          y: builder.y + 0.9,
          kind: 'solid',
          mat: 'stone',
          key: 'dyn_step_' + Math.floor(builder.x * 10)
        });
        SFX.playStoneStep(0);
        builder.say('🪨 ' + builder.langs[0] + ' ok! (石阶摆放)', 2.0);
        this.hud.banner('【垫石铺路成功】消耗 1 块石砖，放置了攀爬垫步台阶！', 'good');
      }
    }

    // ── 急救与脱力复苏 ──
    firstAidOrRevive() {
      const faintedUnit = this.units.find(u => u.recruited && u.fainted);
      if (!faintedUnit) {
        this.hud.banner('当前队伍无人处于饥饿昏迷状态', 'info');
        return;
      }
      const rescuer = [...this.selection].find(u => !u.fainted && Math.abs(u.x - faintedUnit.x) < 3.2) || this.units.find(u => u.recruited && !u.fainted);
      if (!rescuer) return;

      const breadCarrier = this.units.find(u => u.recruited && !u.fainted && u.stack.includes('bread'));
      if (breadCarrier) {
        breadCarrier.stack.splice(breadCarrier.stack.lastIndexOf('bread'), 1);
        breadCarrier.refreshStack();
        this.food = Math.min(100, this.food + 40);
        faintedUnit.revive();
        rescuer.say('🍞 ' + rescuer.langs[0] + ' !', 2.0);
      } else if (this.food > 15) {
        this.food -= 15;
        faintedUnit.revive();
        rescuer.say('✋ ' + rescuer.langs[0] + ' !', 2.0);
      } else {
        this.hud.banner('急救复苏需要至少 1 袋【🍞 口粮】！请先采收或携带面包靠近急救', 'warn');
        SFX.playTone(200, 'square', 0.2, 0.05);
      }
    }

    buildCmd() {
      const sel = [...this.selection].filter(u => u.stack.includes('wood'));
      const b = this.builds.filter(q => !q.done).sort((a, c) => Math.abs(a.x1 - this.cam.x) - Math.abs(c.x1 - this.cam.x))[0];
      if (!b) { this.hud.banner('这一层没有需要修筑的地方', 'info'); return; }
      if (!sel.length) { this.hud.banner('选中的人没有背木材', 'warn'); return; }
      sel.forEach(u => { const side = u.x < (b.x1 + b.x2) / 2 ? b.x1 - 0.45 : b.x2 + 0.45; this.deliver(u, { type: 'build', build: b, goal: { x: side, y: b.y }, act: 'build' }); });
    }

    // ═══════════════════ 输入 ═══════════════════
    screenToWorld(sx, sy) {
      const ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
      if (this.mouseRaycaster && this.world && this.world.root) {
        this.mouseRaycaster.setFromCamera(ndc, this.camera);
        const hits = this.mouseRaycaster.intersectObjects(this.world.root.children, true);
        for (let i = 0; i < hits.length; i++) {
          const hit = hits[i];
          const obj = hit.object;
          if (!obj || !obj.isMesh || obj.isSprite) continue;
          if (obj.userData.isWalkway || obj.userData.isRoof || obj.userData.isGround || hit.point.y >= -5.2) {
            return { x: hit.point.x, y: hit.point.y, z: hit.point.z };
          }
        }
      }
      const v = new THREE.Vector3(ndc.x, ndc.y, 0.5);
      v.unproject(this.camera);
      const dir = v.sub(this.camera.position).normalize();
      const t = -this.camera.position.z / dir.z;
      return { x: this.camera.position.x + dir.x * t, y: this.camera.position.y + dir.y * t, z: 0 };
    }
    project(x, y, z = 0.2) {
      const v = new THREE.Vector3(x, y, z).project(this.camera);
      return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight, visible: v.z < 1 && v.x > -1.2 && v.x < 1.2 };
    }
    viewRect() {
      const hh = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.cam.dist, hw = hh * this.camera.aspect;
      return { x1: this.cam.x - hw, x2: this.cam.x + hw, y1: this.cam.y - hh + 1.5, y2: this.cam.y + hh + 1.5 };
    }
    panTo(x, y) { this.camT.x = x; this.camT.y = y; this.follow = false; }

    unitAtScreen(sx, sy) {
      let best = null, bd = 30;
      this.units.forEach(u => { const p = this.project(u.x, u.y + 0.85); const d = Math.hypot(p.x - sx, (p.y - sy) * 0.7); if (d < bd) { bd = d; best = u; } });
      return best;
    }

    bindInput() {
      const cvs = this.container;
      const boxEl = $('selection-box-overlay');
      let drag = null;
      cvs.addEventListener('contextmenu', e => e.preventDefault());
      cvs.addEventListener('mousedown', (e) => {
        SFX.init();
        if (this.cut) { this.advanceCut(); return; }
        if (this.state !== 'play') return;
        drag = { b: e.button, x: e.clientX, y: e.clientY, moved: false, cx: this.camT.x, cy: this.camT.y };
      });
      window.addEventListener('mousemove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.hypot(dx, dy) > 6) drag.moved = true;
        if (drag.b === 0 && drag.moved) {
          boxEl.style.display = 'block';
          boxEl.style.left = Math.min(e.clientX, drag.x) + 'px'; boxEl.style.top = Math.min(e.clientY, drag.y) + 'px';
          boxEl.style.width = Math.abs(dx) + 'px'; boxEl.style.height = Math.abs(dy) + 'px';
        } else if (drag.b !== 0 && drag.moved) {
          const s = this.cam.dist / window.innerHeight * 0.54;
          this.camT.x = drag.cx - dx * s; this.camT.y = drag.cy + dy * s; this.follow = false;
        }
      });
      window.addEventListener('mouseup', (e) => {
        if (!drag) return;
        const d = drag; drag = null; boxEl.style.display = 'none';
        if (this.state !== 'play' || this.cut) return;
        if (d.b === 0 && d.moved) {
          const x1 = Math.min(e.clientX, d.x), x2 = Math.max(e.clientX, d.x), y1 = Math.min(e.clientY, d.y), y2 = Math.max(e.clientY, d.y);
          const picked = this.available().filter(u => { const p = this.project(u.x, u.y + 0.8); return p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2; });
          if (!e.shiftKey) this.selection.clear();
          picked.forEach(u => this.selection.add(u));
          if (picked.length) { SFX.playTone(520, 'sine', 0.1, 0.06, 700); this.follow = true; }
          return;
        }
        if (d.moved) return;
        const u = this.unitAtScreen(e.clientX, e.clientY);
        const w = this.screenToWorld(e.clientX, e.clientY);
        if (u && d.b === 2) {
          // 右键单击小人：切换原地留驻 / 归队
          this.toggleDetach(u);
          return;
        }
        if (u && d.b === 0) {
          if (!u.recruited) { this.hud.banner(`${u.name}只会 ${u.langs.join(' ')}。让懂其中一种语言的队员走到他身边`, 'info'); return; }
          if (u.detached) {
            this.toggleDetach(u);
            return;
          }
          if (e.shiftKey) {
            if (this.selection.has(u)) this.selection.delete(u);
            else this.selection.add(u);
            this.hud.dirty = true;
          } else {
            const now = performance.now();
            if (this.lastUnitClick && this.lastUnitClick.unit === u && (now - this.lastUnitClick.time) < 320) {
              // 双击设为领队！
              this.setLeader(u);
              this.lastUnitClick = null;
            } else {
              this.lastUnitClick = { unit: u, time: now };
              if (this.selection.has(u) && this.selection.size === 1) {
                const lf = this.lifts.find(l => (u.grounded && u.grounded.key === 'L' + l.id) || (u.x >= l.x1 - 0.25 && u.x <= l.x2 + 0.25 && Math.abs(u.y - l.y) < 0.35));
                if (lf) { this.operateLift(lf, u); return; }
              }
              this.selectMember(u);
            }
          }
          return;
        }
        this.command(w.x, w.y, w.z);
      });
      cvs.addEventListener('wheel', (e) => { this.camT.dist = Math.max(16, Math.min(56, this.camT.dist * (e.deltaY > 0 ? 1.1 : 0.9))); e.preventDefault(); }, { passive: false });
      window.addEventListener('keydown', (e) => {
        this.keys[e.key.toLowerCase()] = true;
        // 快速选关快捷键：Alt + 1~5 或 F1~F5
        const num = (e.key >= '1' && e.key <= '5' && e.altKey) ? parseInt(e.key, 10) : (e.key.startsWith('F') && parseInt(e.key.slice(1), 10) >= 1 && parseInt(e.key.slice(1), 10) <= 5 ? parseInt(e.key.slice(1), 10) : null);
        if (num) {
          e.preventDefault();
          this.startGame(num - 1);
          return;
        }
        if (this.cut && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) { this.advanceCut(); e.preventDefault(); return; }
        if (this.state !== 'play' || this.cut) return;
        if (e.key === ' ') { e.preventDefault(); this.follow = true; this.directJump(); return; }
        if (e.key.toLowerCase() === 'g') { e.preventDefault(); this.gatherAll(); return; }
        if (e.key === 'Tab') { e.preventDefault(); this.cycle(); return; }
        if (e.key === 'Escape') { this.selection.clear(); return; }

        // W/S 进出建筑室内纵深
        if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') {
          if (this.checkDoorwayInteraction('in')) return;
        }
        if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') {
          if (this.checkDoorwayInteraction('out')) return;
        }

        const n = {
          '1': 'move',
          '2': 'rally',
          '3': 'build',
          '4': 'revive',
          '5': 'interact',
          '6': 'link',
          '7': 'drop',
          '8': 'hold',
          'e': 'interact',
          'q': 'drop'
        }[e.key.toLowerCase()];
        if (n) this.runCmd(n);
        if (e.key.toLowerCase() === 'r') {
          if (this.rArmed && performance.now() - this.rArmed < 2500) { this.rArmed = 0; this.fade(() => this.loadLevel(this.levelIdx)); }
          else { this.rArmed = performance.now(); this.hud.banner('再按一次 R：重新开始本层', 'warn'); }
        }
        if (e.key.toLowerCase() === 'm') {
          const on = SFX.toggleBGM();
          this.hud.banner(on ? '♫ 开启《卵石论战》古典鲁特琴/竖琴背景音乐' : '🔇 静音背景音乐', 'info');
        }
        if (e.key.toLowerCase() === 'f') {
          if (this.coopAction) {
            e.preventDefault();
            this.triggerCoopAction();
          } else {
            this.follow = true;
          }
        }
      });
      window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
      document.querySelectorAll('#command-bar .cmd').forEach(b => b.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        SFX.playUIClick();
        if (this.state === 'play' && !this.cut) {
          if (b.id === 'cmd-cycle-btn') this.cycle();
          else if (b.dataset.cmd) this.runCmd(b.dataset.cmd);
        }
      }));
      $('btn-restart').onclick = () => { $('ending').classList.remove('on'); location.reload(); };
      const bgmBtn = $('btn-bgm-toggle');
      if (bgmBtn) {
        bgmBtn.onclick = (e) => {
          e.stopPropagation();
          const on = SFX.toggleBGM();
          bgmBtn.classList.toggle('off', !on);
          this.hud.banner(on ? '♫ 开启《卵石论战》古典鲁特琴/竖琴背景音乐' : '🔇 静音背景音乐', 'info');
        };
      }
      $('cutscene').addEventListener('mousedown', (e) => { e.stopPropagation(); this.advanceCut(); });
      $('cutscene').addEventListener('click', (e) => { e.stopPropagation(); this.advanceCut(); });

      // 成就图鉴与开发者调参面板绑定
      const btnAchHud = $('btn-achievements');
      if (btnAchHud) {
        btnAchHud.onclick = (e) => {
          e.stopPropagation();
          SFX.playUIClick();
          if (window.Achievements) window.Achievements.openModal();
        };
      }
      const btnDevHud = $('btn-devtool');
      if (btnDevHud) {
        btnDevHud.onclick = (e) => {
          e.stopPropagation();
          SFX.playUIClick();
          if (window.DevTool) window.DevTool.toggle();
        };
      }
      const badgeHud = $('game-version-badge');
      if (badgeHud) {
        badgeHud.onclick = (e) => {
          e.stopPropagation();
          SFX.playUIClick();
          if (window.DevTool) window.DevTool.toggle();
        };
      }
    }

    runCmd(n) {
      document.querySelectorAll('#command-bar .cmd').forEach(b => b.classList.toggle('flash', b.dataset.cmd === n));
      setTimeout(() => document.querySelectorAll('#command-bar .cmd').forEach(b => b.classList.remove('flash')), 250);
      if (n === 'move') this.hud.banner('左键点击地面、木梯、升降台、踏板，选中的队员就会前往', 'info');
      if (n === 'rally') this.rally();
      if (n === 'build') this.buildBridgeOrRamp();
      if (n === 'revive') this.firstAidOrRevive();
      if (n === 'interact') this.interact();
      if (n === 'link') { this.showLinks = !this.showLinks; this.hud.banner(this.showLinks ? '显示世界中的语言链' : '隐藏世界中的语言链', 'info'); }
      if (n === 'drop') [...this.selection].forEach(u => { if (u.stack.length) { u.dropTop(); u.say(u.langs[0] + ' ' + LANG.ACT.drop, 1.2); } });
      if (n === 'hold') [...this.selection].forEach(u => this.toggleDetach(u));
      if (n === 'signal') this.teachSignal();
      if (n === 'gather') this.gatherAll();
      if (n === 'select_all') this.selectAll();
    }

    cycle() {
      const av = this.available(); if (!av.length) return;
      const cur = this.leader || (this.selection.size === 1 ? [...this.selection][0] : null);
      const i = cur ? (av.indexOf(cur) + 1) % av.length : 0;
      this.setLeader(av[i]);
    }

    // 智能视线半透：相机至小队成员射线检测，动态将遮挡视线的前景墙、柱头、门楣、屋顶淡化至 18% 半透
    updateCameraOcclusionFading(dt = 0.016) {
      if (!this.world || !this.world.root || !this.units.length || !this.camera) return;
      const targets = this.units.filter(u => u.recruited && !u.fainted);
      if (!targets.length) return;

      const camPos = this.camera.position;
      const occludersThisFrame = new Set();

      targets.forEach(u => {
        const uZ = u.inInterior ? -4.5 : (u.z || 0);
        const targetPos = new THREE.Vector3(u.x, u.y + 0.9, uZ);
        const dir = targetPos.clone().sub(camPos);
        const dist = dir.length();
        if (dist < 1.0) return;
        dir.normalize();

        this.occlusionRaycaster.set(camPos, dir);
        this.occlusionRaycaster.near = 1.0;
        this.occlusionRaycaster.far = Math.max(1.0, dist - 0.35);

        const hits = this.occlusionRaycaster.intersectObjects(this.world.root.children, true);
        for (let i = 0; i < hits.length; i++) {
          const hit = hits[i];
          const obj = hit.object;
          if (!obj || !obj.isMesh || obj.isSprite) continue;
          if (obj.userData.isGround && hit.point.y <= u.y + 0.15) continue;
          if (obj.userData.isRoof && u.y >= hit.point.y - 0.25) continue;
          occludersThisFrame.add(obj);
        }

        // 室内与深巷专属透视：若队员位于建筑内部或深巷（Z < -1.0），直接将附近建筑的前外墙、前城垛与屋顶半透
        if (u.inInterior || (u.z !== undefined && u.z < -1.0)) {
          this.world.root.traverse(o => {
            if (o.isMesh && !o.isSprite && !o.userData.isGround) {
              const wp = new THREE.Vector3();
              o.getWorldPosition(wp);
              if (Math.abs(wp.x - u.x) < 4.8 && (wp.z > u.z + 0.5 || wp.y > u.y + 0.5)) {
                occludersThisFrame.add(o);
              }
            }
          });
        }
      });

      // 开发者透视模式：强制透视全图建筑墙体与遮挡
      if (window.DEV_PARAMS && window.DEV_PARAMS.forceWallAlpha && this.world && this.world.root) {
        this.world.root.traverse(o => {
          if (o.isMesh && !o.isSprite && !o.userData.isGround) {
            occludersThisFrame.add(o);
          }
        });
      }

      // 平滑渐变至 18% 透明度
      occludersThisFrame.forEach(mesh => {
        if (!mesh.material) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(mat => {
          if (mat.userData._origOpacity === undefined) {
            mat.userData._origOpacity = mat.opacity !== undefined ? mat.opacity : 1.0;
            mat.userData._origTransparent = !!mat.transparent;
            mat.transparent = true;
          }
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.18, Math.min(1, dt * 14));
        });
        this.fadedMeshes.add(mesh);
      });

      // 恢复不再遮挡视线的物体材质
      this.fadedMeshes.forEach(mesh => {
        if (!occludersThisFrame.has(mesh) && mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          let allRestored = true;
          mats.forEach(mat => {
            if (mat.userData._origOpacity !== undefined) {
              mat.opacity = THREE.MathUtils.lerp(mat.opacity, mat.userData._origOpacity, Math.min(1, dt * 9));
              if (Math.abs(mat.opacity - mat.userData._origOpacity) < 0.04) {
                mat.opacity = mat.userData._origOpacity;
                mat.transparent = mat.userData._origTransparent;
                delete mat.userData._origOpacity;
                delete mat.userData._origTransparent;
              } else {
                allRestored = false;
              }
            }
          });
          if (allRestored) {
            this.fadedMeshes.delete(mesh);
          }
        }
      });
    }

    // ═══════════════════ 渲染 ═══════════════════
    updateLinks() {
      const links = this.showLinks ? this.chain.links.filter(l => this.chain.connected.has(l.a)) : [];
      while (this.linkLines.length < links.length) {
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: '#fff', dashSize: 0.18, gapSize: 0.22, transparent: true, opacity: 0.75, depthWrite: false }));
        this.entRoot.add(line); this.linkLines.push(line);
      }
      this.linkLines.forEach((line, i) => {
        const l = links[i];
        line.visible = !!l; if (!l) return;
        const p = line.geometry.attributes.position;
        p.setXYZ(0, l.a.x, l.a.y + 1.0, 0.5); p.setXYZ(1, l.b.x, l.b.y + 1.0, 0.5); p.needsUpdate = true;
        line.computeLineDistances(); line.material.color.set(LANG.LANGS[l.lang].color);
      });
    }

    render(dt) {
      if (!this.level) return;
      // 镜头
      if (this.state === 'play' && !this.cut) {
        const isShift = this.keys['shift'];
        if (isShift) {
          const pan = 18 * dt * (this.cam.dist / 26);
          if (this.keys['a'] || this.keys['arrowleft']) { this.camT.x -= pan; this.follow = false; }
          if (this.keys['d'] || this.keys['arrowright']) { this.camT.x += pan; this.follow = false; }
          if (this.keys['w'] || this.keys['arrowup']) { this.camT.y += pan; this.follow = false; }
          if (this.keys['s'] || this.keys['arrowdown']) { this.camT.y -= pan; this.follow = false; }
        }
        if (this.follow) {
          const target = (this.leader && this.leader.recruited && !this.leader.fainted) ? this.leader : (this.selection.size === 1 ? [...this.selection][0] : null) || this.available()[0];
          if (target) {
            this.camT.x = target.x;
            this.camT.y = target.y + 1.2;
            const anyInside = target.inInterior;
            this.camT.dist = anyInside ? 14 : (this.camOffsetZ || 21);
          }
        }
      } else if (this.state === 'title') {
        this.camT.x = this.level.spawn.x + 14 + Math.sin(this.time * 0.1) * 6; this.camT.y = 5; this.camT.dist = 30;
      }
      const b = this.level.bounds;
      this.camT.x = Math.max(b.x1 + 4, Math.min(b.x2 - 4, this.camT.x));
      this.camT.y = Math.max(b.y1 + 4, Math.min(b.y2, this.camT.y));
      const k = 1 - Math.pow(0.0008, dt);
      this.cam.x += (this.camT.x - this.cam.x) * k; this.cam.y += (this.camT.y - this.cam.y) * k; this.cam.dist += (this.camT.dist - this.cam.dist) * k;
      let sx = 0, sy = 0;
      if (this.shakeT > 0) { this.shakeT -= dt; const a = this.shakeA * Math.max(0, this.shakeT / 0.6); sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a; if (this.shakeT <= 0) this.shakeA = 0; }
      
      // 八方旅人微俯视倾角（~16°俯角，展现村道街巷与屋顶深度）
      const pitchY = Math.max(2.6, this.cam.dist * 0.20);
      this.camera.position.set(this.cam.x + sx, this.cam.y + pitchY + sy, this.cam.dist);
      this.camera.lookAt(this.cam.x + sx, this.cam.y + 0.4 + sy, -0.6);
      if (this.sunLight) { this.sunLight.position.set(this.cam.x + 18, this.cam.y + 30, 26); this.sunLight.target.position.set(this.cam.x, this.cam.y, 0); }

      this.units.forEach(u => u.render(dt, this.time));
      this.crates.forEach(c => c.render());
      this.items.forEach(i => i.render(dt, this.time));
      this.rocks.forEach(r => r.render());
      this.runes.forEach(r => { if (r.mesh) { r.mesh.rotation.y += dt * 1.5; r.mesh.position.y = r.y + 0.8 + Math.sin(this.time * 2 + r.x) * 0.1; r.glow.material.opacity = 0.25 + Math.sin(this.time * 3 + r.x) * 0.1; } });
      this.builds.forEach(b2 => b2.planks.forEach(p => { if (p.visible && p.scale.y < 1) p.scale.y = Math.min(1, p.scale.y + dt * 4); }));
      if (this.exit && this.exit.door) this.exit.door.material.opacity = 0.45 + Math.sin(this.time * 2) * 0.12;
      if (this.entRoot) this.updateLinks();
      if (this.state === 'play' || this.state === 'ending') this.hud.update(dt, this.time);
      this.updateCameraOcclusionFading(dt);
      this.renderer.render(this.scene, this.camera);
    }
  }

  window.jumpToLevel = (lv) => window.game && window.game.startGame(typeof lv === 'number' ? lv - 1 : 0);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.game = new Game();
  } else {
    window.addEventListener('load', () => { if (!window.game) window.game = new Game(); });
  }
})();
