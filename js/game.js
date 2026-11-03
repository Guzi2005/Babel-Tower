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
      this.cam = { x: 10, y: 4, z: 8, dist: 30 }; this.camT = { x: 10, y: 4, z: 8, dist: 30 }; this.follow = true;
      this.camYaw = 0; this.camPitch = 0; this.camYawT = 0; this.camPitchT = 0;
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
      this.autoPickup = true;
      this.autoScavenge = false;
      this.autoGather = false;
      this.autoRecruit = false;
      this.phase = 'ground';
      this.groundTimer = 0;
      this.rivalSquads = [];
      this.autoPickupTimer = 0;
      this.autoGatherTimer = 0;
      this.autoRecruitTimer = 0;
      this.keys = {};
      this.bindInput();
      window.addEventListener('resize', () => this.resize());
      this.last = performance.now();
      this.setupTitle();
      requestAnimationFrame(() => this.loop());
    }

    itemTex(type) { if (!this.itemTexCache[type]) this.itemTexCache[type] = PX.tex(PX.itemCanvas(type)); return this.itemTexCache[type]; }

    // 关卡资源按所有权释放：几何体与材质随场景销毁，跨关卡纹理缓存保留。
    disposeTree(root, options = {}) {
      if (!root) return;
      const preserveTextures = options.preserveTextures || new Set();
      const preserveGeometries = options.preserveGeometries || new Set();
      const geometries = new Set(), materials = new Set(), textures = new Set();
      root.traverse(obj => {
        // 灯光阴影使用独立 WebGLRenderTarget，不会出现在材质贴图列表中。
        if (obj.isLight && obj.shadow) {
          if (obj.shadow.map) obj.shadow.map.dispose();
          if (obj.shadow.mapPass) obj.shadow.mapPass.dispose();
        }
        if (obj.geometry && !preserveGeometries.has(obj.geometry)) geometries.add(obj.geometry);
        const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
        mats.forEach(mat => {
          if (!mat || (mat.userData && mat.userData.shared)) return;
          materials.add(mat);
          Object.keys(mat).forEach(key => {
            const value = mat[key];
            if (value && value.isTexture && !preserveTextures.has(value)) textures.add(value);
          });
        });
      });
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      textures.forEach(t => t.dispose());
    }

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
      // 统一世界地图冒险：始终加载统一世界地图 LEVELS[0]，选关时直接出生在对应海拔高度
      this.loadLevel(0, { chapterIdx: i });
      this.setupQuickLevelSwitcher();
    }

    // ═══════════════════ 关卡加载 ═══════════════════
    clearLevel() {
      if (this.world) {
        this.scene.remove(this.world.root);
        this.disposeTree(this.world.root);
      }
      if (this.entRoot) {
        this.scene.remove(this.entRoot);
        const sharedTextures = new Set([this.crateTex, ...Object.values(this.itemTexCache)].filter(Boolean));
        this.disposeTree(this.entRoot, {
          preserveTextures: sharedTextures,
          preserveGeometries: new Set([this.fx.geo])
        });
      }
      if (this.scene.background && this.scene.background.isTexture) this.scene.background.dispose();
      this.scene.background = null;
      if (window.OPEN_WORLD) OPEN_WORLD.reset();
      this.fadedMeshes.clear();
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
      this.openWorld = (window.OPEN_WORLD && OPEN_WORLD.active) ? OPEN_WORLD : null;

      const startZoneIdx = (idx === 0 && typeof opts.chapterIdx === 'number') ? opts.chapterIdx : 0;
      const startSpawn = (idx === 0 && lv.zones && lv.zones[startZoneIdx]) ? lv.zones[startZoneIdx].spawn : lv.spawn;
      this.checkpoint = { x: startSpawn.x, y: startSpawn.y };
      this.uidSeq = 1;
      const spawnZ = (this.openWorld && startZoneIdx === 0) ? this.openWorld.spawnZ : 0;

      if (!opts.preview) {
        if (startZoneIdx > 0 && window.Achievements) {
          window.Achievements.unlock('babel_ascendant');
        }
        this.party.forEach((id, i) => {
          const u = new ENT.Unit(this, id, startSpawn.x + i * 0.8, startSpawn.y, true);
          u.z = u.targetZ = spawnZ + (i % 2) * 0.7;
          u.stack = (this.stacks[id] || []).slice(); u.refreshStack(); this.units.push(u);
        });
      } else {
        ['ash', 'akad'].forEach((id, i) => {
          const u = new ENT.Unit(this, id, startSpawn.x + 2 + i * 0.9, startSpawn.y, true);
          u.z = u.targetZ = spawnZ + (i % 2) * 0.7;
          this.units.push(u);
        });
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

      this.activeZoneIndex = startZoneIdx;
      if (idx === 0 && lv.zones && lv.zones[startZoneIdx]) {
        this.activeZone = lv.zones[startZoneIdx];
        this.hud.setZone(this.activeZone);
        if (window.SFX && window.SFX.setTrack) {
          window.SFX.setTrack(this.activeZone.bgmTrack, { reason: 'level_load' });
        }
      } else {
        this.activeZone = null;
        this.hud.setLevel(lv);
      }
      this.hud.dirty = true;
      this.cam.x = this.camT.x = startSpawn.x + 6; this.cam.y = this.camT.y = startSpawn.y + 3;
      this.cam.z = this.camT.z = spawnZ; this.cam.dist = this.camT.dist = this.openWorld ? 30 : 26;
      this.computeSupports();
      // 让物件落定
      for (let i = 0; i < 30; i++) this.stepPhysics(1 / 60, true);
      this.state = opts.preview ? 'title' : 'play';
      if (startZoneIdx === 0) {
        this.phase = 'ground';
        this.groundTimer = 0;
      } else {
        this.phase = 'tower';
        if (!opts.preview) {
          const rivalCount = Math.min(5, Math.max(1, Math.floor((this.groundTimer || 45) / 38)));
          this.spawnRivalSquads(rivalCount);
        }
      }
      this.updatePhaseWidget();
      this.updateCommandBarToggles();
      if (!opts.preview) {
        const titleBanner = (idx === 0 && lv.zones && lv.zones[startZoneIdx])
          ? `${lv.zones[startZoneIdx].name} · ${lv.zones[startZoneIdx].sub}`
          : `第 ${lv.id} 层 · ${lv.name}`;
        this.startCut(lv.intro, () => { this.hud.banner(titleBanner, 'story'); });
      }
    }

    spawnRivalSquads(count) {
      this.rivalSquads = [];
      const isUnified = (this.levelIndex === 0 || (this.level && this.level.zones && this.level.zones.length > 0));
      const squadTemplates = [
        {
          name: '阿卡德掠夺佣兵团',
          bannerColor: '#dc2626',
          tierY: isUnified ? 12.0 : 5.4,
          minX: isUnified ? 60 : 12, maxX: isUnified ? 76 : 26,
          members: [
            { id: 'rival_ak_leader', name: '哈尔迦', role: '佣兵队长', langs: ['▲', '⚔'], atk: 40, hp: 120, x: isUnified ? 64 : 16, y: isUnified ? 12.0 : 5.4, pal: { hat: 'circlet', hatColor: '#dc2626', coat: '#991b1b', pants: '#1e293b', outfitType: 'cuirass' }, items: ['stone', 'bread'] },
            { id: 'rival_ak_warrior', name: '达鲁', role: '巨斧佣兵', langs: ['▲'], atk: 35, hp: 100, x: isUnified ? 70 : 22, y: isUnified ? 12.0 : 5.4, pal: { hat: 'helm', hatColor: '#b91c1c', coat: '#7f1d1d', pants: '#334155', outfitType: 'cuirass' }, items: ['stone'] }
          ]
        },
        {
          name: '苏美尔神庙先遣队',
          bannerColor: '#2563eb',
          tierY: isUnified ? 18.0 : 6.2,
          minX: isUnified ? 58 : 34, maxX: isUnified ? 74 : 52,
          members: [
            { id: 'rival_su_leader', name: '乌尔萨', role: '神庙祭司长', langs: ['☼', '♒'], atk: 30, hp: 110, x: isUnified ? 62 : 38, y: isUnified ? 18.0 : 6.2, pal: { hat: 'mitre', hatColor: '#2563eb', coat: '#1d4ed8', pants: '#1e3a8a', outfitType: 'priest_robe' }, items: ['bread', 'bread'] },
            { id: 'rival_su_guard', name: '卢伽尔', role: '圣殿武士', langs: ['☼'], atk: 35, hp: 100, x: isUnified ? 68 : 44, y: isUnified ? 18.0 : 6.2, pal: { hat: 'helm', hatColor: '#3b82f6', coat: '#1e40af', pants: '#172554', outfitType: 'cuirass' }, items: ['stone', 'wood'] }
          ]
        },
        {
          name: '埃兰荒原武士团',
          bannerColor: '#16a34a',
          tierY: isUnified ? 25.0 : 11.5,
          minX: isUnified ? 50 : 20, maxX: isUnified ? 68 : 40,
          members: [
            { id: 'rival_el_leader', name: '库杜尔', role: '荒原勇士', langs: ['𓁈', '⚔'], atk: 40, hp: 115, x: isUnified ? 54 : 26, y: isUnified ? 25.0 : 11.5, pal: { hat: 'scarf', hatColor: '#16a34a', coat: '#15803d', pants: '#14532d', outfitType: 'nomad_poncho' }, items: ['stone', 'dates'] },
            { id: 'rival_el_scout', name: '阿塔', role: '荒原斥候', langs: ['𓁈'], atk: 30, hp: 90, x: isUnified ? 62 : 34, y: isUnified ? 25.0 : 11.5, pal: { hat: 'band', hatColor: '#22c55e', coat: '#166534', pants: '#052e16', outfitType: 'nomad_poncho' }, items: ['stone'] }
          ]
        },
        {
          name: '巴比伦淘金探险队',
          bannerColor: '#d97706',
          tierY: isUnified ? 32.0 : 11.5,
          minX: isUnified ? 58 : 52, maxX: isUnified ? 72 : 70,
          members: [
            { id: 'rival_ba_leader', name: '辛·姆巴利特', role: '探险商贾', langs: ['⚖️', '☼'], atk: 28, hp: 100, x: isUnified ? 62 : 56, y: isUnified ? 32.0 : 11.5, pal: { hat: 'turban', hatColor: '#d97706', coat: '#b45309', pants: '#451a03', outfitType: 'kaunakes' }, items: ['bread', 'bread', 'wood'] },
            { id: 'rival_ba_porter', name: '贝尔', role: '负重帮工', langs: ['⚖️'], atk: 30, hp: 120, x: isUnified ? 68 : 62, y: isUnified ? 32.0 : 11.5, pal: { hat: 'hood', hatColor: '#f59e0b', coat: '#92400e', pants: '#292524', outfitType: 'tunic' }, items: ['stone', 'stone'] }
          ]
        },
        {
          name: '乌尔守夜巡逻战团',
          bannerColor: '#9333ea',
          tierY: isUnified ? 32.0 : 17.5,
          minX: isUnified ? 74 : 62, maxX: isUnified ? 84 : 78,
          members: [
            { id: 'rival_ur_leader', name: '纳布·纳西尔', role: '守夜百夫长', langs: ['◎', '⚔'], atk: 45, hp: 130, x: isUnified ? 78 : 68, y: isUnified ? 32.0 : 17.5, pal: { hat: 'helm', hatColor: '#9333ea', coat: '#7e22ce', pants: '#3b0764', outfitType: 'cuirass' }, items: ['stone', 'bread'] }
          ]
        }
      ];

      for (let i = 0; i < Math.min(count, squadTemplates.length); i++) {
        const tmpl = squadTemplates[i];
        this.rivalSquads.push(tmpl);
        tmpl.members.forEach(mDef => {
          const fullPal = (LANG.generatePaperDoll) ? LANG.generatePaperDoll(mDef.pal) : mDef.pal;
          const u = new ENT.Unit(this, {
            ...mDef,
            pal: fullPal,
            team: 'rival',
            isHostile: false,
            rivalSquadName: tmpl.name,
            bannerColor: tmpl.bannerColor
          }, mDef.x, mDef.y, false);
          if (mDef.items) {
            mDef.items.forEach(t => u.stack.push(t));
            u.refreshStack();
          }
          this.units.push(u);
        });
      }
      this.hud.banner(`⚠️ 遭遇塔内异邦竞争！共有 ${Math.min(count, squadTemplates.length)} 支探险小队在各层螺旋回廊活跃！`, 'warn');
    }

    updatePhaseWidget() {
      const badgeEl = $('phase-badge-tag');
      const timerEl = $('phase-timer-val');
      const textEl = $('phase-rival-text');
      if (!badgeEl || !timerEl || !textEl) return;

      if (this.phase === 'ground') {
        badgeEl.textContent = '⏳ 塔下阶段 · 搜备';
        const mins = String(Math.floor(this.groundTimer / 60)).padStart(2, '0');
        const secs = String(Math.floor(this.groundTimer % 60)).padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;

        const t = Math.floor(this.groundTimer);
        if (t < 50) {
          textEl.textContent = '⚠️ 竞争预测: ⚡ 1支先行小队 (极低阻力)';
          textEl.style.color = '#4ade80';
        } else if (t < 100) {
          textEl.textContent = '⚠️ 竞争预测: ⚔️ 2支异邦小队已进塔 (适度竞争)';
          textEl.style.color = '#facc15';
        } else if (t < 150) {
          textEl.textContent = '⚠️ 竞争预测: 🛡️ 3支武装小队已封锁中层 (激烈竞争)';
          textEl.style.color = '#fb923c';
        } else {
          textEl.textContent = '⚠️ 竞争预测: 🔥 4~5支精锐战团全境争夺 (高压险境)';
          textEl.style.color = '#f87171';
        }
      } else {
        badgeEl.textContent = '🏛️ 塔内阶段 · 螺旋回廊';
        timerEl.textContent = `登塔中`;
        const activeRivals = this.units.filter(u => u.team === 'rival' && !u.fainted);
        textEl.textContent = `⚔️ 塔内竞争者: ${this.rivalSquads.length} 支小队活跃 (${activeRivals.length} 名对手)`;
        textEl.style.color = '#fbbf24';
      }
    }

    updateZoneProgression(dt) {
      if (!this.level || !this.level.zones || this.level.zones.length === 0) return;
      const leader = (this.leader && this.leader.recruited && !this.leader.fainted) ? this.leader : (this.units.find(u => u.recruited && !u.fainted) || this.units[0]);
      if (!leader) return;

      const y = leader.y;
      let targetZoneIdx = 0;
      for (let i = this.level.zones.length - 1; i >= 0; i--) {
        if (y >= this.level.zones[i].minY - 0.2) {
          targetZoneIdx = i;
          break;
        }
      }

      if (targetZoneIdx !== this.activeZoneIndex) {
        const prevIdx = this.activeZoneIndex || 0;
        this.activeZoneIndex = targetZoneIdx;
        this.activeZone = this.level.zones[targetZoneIdx];
        if (this.hud && this.hud.setZone) {
          this.hud.setZone(this.activeZone);
        }
        // 场景切歌：平滑切换到该海拔区域对应主题曲
        if (window.SFX && window.SFX.setTrack) {
          window.SFX.setTrack(this.activeZone.bgmTrack, { reason: 'zone_change' });
        }
        // 章节横幅提示
        const isAscending = targetZoneIdx > prevIdx;
        const bannerMsg = isAscending 
          ? `🏛️ 迈入【${this.activeZone.name}】（${this.activeZone.alt}）· ${this.activeZone.sub}`
          : `↩️ 返回【${this.activeZone.name}】（${this.activeZone.alt}）`;
        this.hud.banner(bannerMsg, 'story');

        // 阶段变化提示（如果从地面村庄进入巴别塔螺旋内部）
        if (prevIdx === 0 && targetZoneIdx >= 1 && this.phase === 'ground') {
          this.phase = 'tower';
          this.updatePhaseWidget();
          // 根据在地面村庄耗费的时间决定生成的竞争小队数量
          const rivalCount = Math.min(5, Math.max(1, Math.floor((this.groundTimer || 45) / 38)));
          this.spawnRivalSquads(rivalCount);
          const secs = Math.round(this.groundTimer || 0);
          this.hud.banner(`⚠️ 队伍进入巴别塔内部！你在地面探索了 ${secs} 秒，塔内已涌入 ${rivalCount} 支竞争小队！`, 'warn');
        }
      }

      // 记录在地面村落的探索耗时
      if (this.activeZoneIndex === 0 && this.state === 'play' && !this.cut) {
        this.groundTimer = (this.groundTimer || 0) + dt;
      }
    }

    updateCommandBarToggles() {
      const pBtn = $('cmd-pickup');
      if (pBtn) {
        pBtn.classList.toggle('is-on', this.autoPickup);
        pBtn.classList.toggle('is-off', !this.autoPickup);
        const lbl = pBtn.querySelector('.cmd-label');
        if (lbl) lbl.textContent = `自动拾取: ${this.autoPickup ? '开' : '关'}`;
      }
      const gBtn = $('cmd-gather');
      if (gBtn) {
        gBtn.classList.toggle('is-on', this.autoScavenge);
        gBtn.classList.toggle('is-off', !this.autoScavenge);
        const lbl = gBtn.querySelector('.cmd-label');
        if (lbl) lbl.textContent = `自动搜刮: ${this.autoScavenge ? '开' : '关'}`;
      }
      const rBtn = $('cmd-recruit');
      if (rBtn) {
        rBtn.classList.toggle('is-on', this.autoRecruit);
        rBtn.classList.toggle('is-off', !this.autoRecruit);
        const lbl = rBtn.querySelector('.cmd-label');
        if (lbl) lbl.textContent = `自动扩员: ${this.autoRecruit ? '开' : '关'}`;
      }
    }

    toggleAutoPickup() {
      this.autoPickup = !this.autoPickup;
      this.updateCommandBarToggles();
      SFX.playUIClick();
      if (this.autoPickup) {
        this.scanAndOpportunisticPickup();
      }
      this.hud.banner(
        this.autoPickup
          ? '🤲 【自动拾取（顺手拾取）：已开启】队员行经散落物资身旁时将顺手收入背包，不打断原定行进路线'
          : '🤲 【自动拾取（顺手拾取）：已关闭】队员路过物资时不再自动弯腰拾取，仅拾取手动点击的目标',
        'info'
      );
    }

    toggleAutoScavenge() {
      this.autoScavenge = !this.autoScavenge;
      this.autoGather = this.autoScavenge;
      this.updateCommandBarToggles();
      SFX.playUIClick();
      if (this.autoScavenge) {
        this.gatherAll();
      } else {
        // 关闭自动搜刮时，立即取消所有正在执行的自动外出搜刮指令，让队员留在原位或回归跟随
        (this.units || []).forEach(u => {
          if (u.recruited && u.order && u.order.isGatherAll) {
            u.order = null;
            u.path = null;
            u.vx = 0;
            u.openMoving = false;
          }
        });
      }
      this.hud.banner(
        this.autoScavenge
          ? '🧭 【自动搜刮：已开启】空闲队员将分头离队、自主寻路扫荡全图散落物资'
          : '🧭 【自动搜刮：已关闭】队员保持紧密队形，不再擅自离队远行搜刮',
        'info'
      );
    }

    toggleAutoGather() {
      this.toggleAutoScavenge();
    }

    toggleAutoRecruit() {
      this.autoRecruit = !this.autoRecruit;
      this.updateCommandBarToggles();
      SFX.playUIClick();
      if (this.autoRecruit) {
        this.scanAndAutoRecruit();
      }
      this.hud.banner(
        this.autoRecruit
          ? '👥 【自动扩员：已开启】靠近中立友好NPC时自动发起交涉并招揽入队'
          : '👥 【自动扩员：已关闭】停止吸收新队员，严格节约队伍口粮储备',
        'info'
      );
    }

    // 顺手拾取（Opportunistic Pass-by Pickup）：仅拾取脚边/身旁 1.35m 内的无主物资，绝不改变队员移动目标或寻路状态
    scanAndOpportunisticPickup() {
      if (!this.autoPickup) return;
      const maxCapOf = (u) => {
        const roleCap = (u.id === 'bani' || u.role === '绝壁挑夫' || u.role === '负重力士') ? 22 : ENT.MAX_STACK;
        return (window.DEV_PARAMS && window.DEV_PARAMS.maxCarry !== undefined) ? window.DEV_PARAMS.maxCarry : roleCap;
      };
      const units = this.available().filter(u => !u.fainted && u.stack.length < maxCapOf(u));
      if (!units.length || !this.items || !this.items.length) return;

      for (const u of units) {
        if (u.stack.length >= maxCapOf(u)) continue;
        const uz = (this.openWorld && this.openWorld.active && u.y <= 1.25) ? (u.targetZ || 0) : 0;
        for (const it of this.items) {
          if (!it.alive || it.heldBy) continue;
          const iz = (this.openWorld && this.openWorld.active && it.y <= 1.25) ? (it.z || 0) : 0;
          if (Math.abs(it.x - u.x) <= 1.35 && Math.abs(it.y - u.y) <= 1.25 && Math.abs(iz - uz) <= 1.45) {
            u.pick(it);
            if (u.stack.length >= maxCapOf(u)) break;
          }
        }
      }
    }

    scanAndAutoGather() {
      if (!this.autoScavenge) return;
      const maxCapOf = (u) => {
        const roleCap = (u.id === 'bani' || u.role === '绝壁挑夫' || u.role === '负重力士') ? 22 : ENT.MAX_STACK;
        return (window.DEV_PARAMS && window.DEV_PARAMS.maxCarry !== undefined) ? window.DEV_PARAMS.maxCarry : roleCap;
      };
      const candidateUnits = this.available().filter(u => !u.order && u.stack.length < maxCapOf(u) && !u.pushing);
      if (!candidateUnits.length) return;

      const claimedItems = new Set();
      this.units.forEach(u => {
        if (u.order && u.order.type === 'pick' && u.order.item) claimedItems.add(u.order.item);
      });

      const looseItems = (this.items || []).filter(it => it.alive && !it.heldBy && !claimedItems.has(it));
      if (!looseItems.length) return;

      candidateUnits.forEach(u => {
        let bestItem = null, bestDist = Infinity;
        looseItems.forEach(it => {
          if (claimedItems.has(it)) return;
          const d = Math.abs(it.x - u.x) + Math.abs(it.y - u.y) * 1.5;
          if (d < bestDist && d < 48) {
            bestDist = d;
            bestItem = it;
          }
        });
        if (bestItem) {
          claimedItems.add(bestItem);
          this.deliver(u, {
            type: 'pick',
            item: bestItem,
            goal: { x: bestItem.x, y: bestItem.y },
            goalFn: () => bestItem.alive ? { x: bestItem.x, y: bestItem.y } : null,
            act: 'pick',
            isGatherAll: true
          });
        }
      });
    }

    scanAndAutoRecruit() {
      if (!this.autoRecruit) return;
      const candidates = (this.units || []).filter(u => !u.recruited && !u.fainted && u.team !== 'rival' && !u.isMerchant && u.id !== 'bani');
      if (!candidates.length) return;

      const playerMembers = this.available().filter(u => u.team === 'player');
      if (!playerMembers.length) return;

      candidates.forEach(cand => {
        const nearbyFriend = playerMembers.find(m => Math.hypot(m.x - cand.x, m.y - cand.y) < 3.8);
        if (nearbyFriend) {
          this.recruitUnit(cand, nearbyFriend);
          cand.say('🤝 ' + (cand.langs ? cand.langs[0] : '☼') + ' ok! (入队)', 2.0);
          SFX.playConfirm();
          this.hud.banner(`👥 志同道合！【${cand.name}】（${cand.role}）受邀加入了巴别远征队！`, 'good');
        }
      });
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
        S.push({ x1: -18, x2: 76, y: 0, key: 'well_bypass_front', kind: 'solid', z: 2.6 });
        S.push({ x1: -18, x2: 76, y: 0, key: 'well_bypass_back', kind: 'solid', z: -3.6 });
        if (this.openWorld && this.openWorld.active) {
          const wb = this.openWorld.bounds;
          S.push({ x1: wb.x1, x2: -18, y: 0, key: 'open_ground_west', kind: 'solid', z: 0 });
          S.push({ x1: 88, x2: wb.x2, y: 0, key: 'open_ground_east', kind: 'solid', z: 0 });
          S.push({ x1: 76, x2: 88, y: 0, key: 'open_ground_tower', kind: 'solid', z: 0 });
        }
      }

      // 平台与梯顶开孔使用同一组数据：所有可攀登平台（含村落屋顶与跨巷连廊）统一对齐在 z=0 动线，确保梯井、连廊与角色严丝合缝
      lv.plats.forEach((p, i) => {
        const [x1, x2, y, kind] = p;
        const pZ = 0;
        const holes = this.ladders.filter(ld => ld.x > x1 + 0.2 && ld.x < x2 - 0.2 && Math.abs(ld.y1 - y) < 0.45);
        let spans = [[x1, x2]];
        holes.forEach(ld => {
          spans = spans.flatMap(([a, b]) => {
            if (ld.x <= a || ld.x >= b) return [[a, b]];
            const h1 = Math.max(a, ld.x - 0.78), h2 = Math.min(b, ld.x + 0.78);
            return [[a, h1], [h2, b]].filter(([c, d]) => d - c > 0.28);
          });
        });
        spans.forEach(([a, b], part) => S.push({ x1: a, x2: b, y, key: 'p' + i, part, kind: 'oneway', mat: kind, z: pZ }));
      });

      this.lifts.forEach(l => S.push({ x1: l.x1, x2: l.x2, y: l.y, key: 'L' + l.id, kind: 'oneway', ref: l }));
      this.bridges.forEach(b => { if (b.ext > 0.95) S.push({ x1: b.x1, x2: b.x2, y: b.y, key: 'B' + b.id, kind: 'oneway' }); });
      this.builds.forEach(b => { if (b.done) S.push({ x1: b.x1, x2: b.x2, y: b.y, key: 'b' + b.id, kind: 'oneway' }); });
      this.crates.forEach(c => { if (c.grounded) S.push({ x1: c.x - 0.5, x2: c.x + 0.5, y: c.y + 1, key: 'c' + c.uid, kind: 'crate', ref: c }); });
      this.supports = S;
      const SO = [];
      lv.walls.forEach(w => {
        if (this.openWorld && this.openWorld.active && w[2] === 0 && (w[3] === 10.5 || w[3] === 12.0) && ((w[0] === 44 && w[1] === 76) || (w[0] === 56 && w[1] === 86))) return;
        SO.push({ x1: w[0], x2: w[1], y1: w[2], y2: w[3], z1: -2.7, z2: 1.5, kind: w[4] || 'wall' });
      });
      this.gates.forEach(g => { if (g.open < 0.75) SO.push({ x1: g.x - 0.35, x2: g.x + 0.35, y1: g.y + g.open * g.h * 0.95, y2: g.y + g.h + g.open * g.h, kind: 'gate' }); });
      this.solids = SO;
      this.navSurfs = null;
    }
    surfaces() { if (!this.navSurfs) this.navSurfs = NAV.buildSurfaces(this.supports, this.solids); return this.navSurfs; }

    planFor(unit, goal) {
      const surfs = this.surfaces();
      if (!unit.grounded) return null;
      const start = NAV.surfaceAt(surfs, unit.grounded.key, unit.x, unit.y);
      if (!start) return null;
      return NAV.plan({
        surfs,
        solids: this.solids,
        ladders: this.ladders.filter(l => !l.trigger || this.isActive(l.trigger)),
        lifts: this.lifts.filter(l => !l.trigger || this.isActive(l.trigger)),
        builds: this.builds
      }, unit, start, goal);
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
        const active = this.isActive(g.trigger);
        if (active) g.ever = true;
        const tgt = (g.latch && g.ever) || active ? 1 : 0;
        const prev = g.open;
        g.open += Math.sign(tgt - g.open) * Math.min(Math.abs(tgt - g.open), dt * 1.4);
        if (g.open > 0.6) g.ever = true;
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
      s.mesh.material[4] = new THREE.MeshLambertMaterial({ map: t, emissive: new THREE.Color('#ffd24a'), emissiveIntensity: 0.85 });
      this.fx.sparkle(s.x, s.y + 1.4);
      SFX.playMiracle();
      this.shake(0.28);
      const incantation = s.langs.map(l => l + ' ' + (LANG.LANGS[l] ? LANG.LANGS[l].words[0] : l)).join(' · ');
      u.say(incantation + ' ! ✦', 3.2);
      this.hud.banner(`📜 【古碑觉醒·神圣共鸣】${u.name}破译了古碑上的 ${s.langs.join(' ')} 双语铭文，神圣之门开启！`, 'story');
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
        this.navSurfs = null; // 立即重建可通行表面缓存，使新木桥立刻纳入全队寻路
        SFX.playMiracle(); this.hud.banner(`${u.name}修好了木板路！`, 'good'); u.speak('ok');
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
      const langDef = (LANG.LANGS && LANG.LANGS[sh]) || (LANG.LANGS && LANG.LANGS['☼']) || { words: ['sol', 'ka'], color: '#f0b030' };
      if (friend) friend.say(`${sh} ${langDef.words[0]} ?`, 2.2);
      setTimeout(() => s.say(`${sh} ${langDef.words[1]}! ✦ 自由了！`, 2.6), 600);
      SFX.playMiracle();
      this.hud.dirty = true;
      this.hud.banner(`${s.name}加入了队伍（${s.langs.join(' ')}）——通过 ${sh} 与队友相通`, 'good');
      if (s.id === 'bani') {
        setTimeout(() => {
          this.startCut([
            { cam: [s.x, s.y + 1.2, 13.5], who: 'bani', say: '♒ wa~ ☼ sol ! 你们真的做到了！', sub: '巴尼抹去脸上的泥水，紧紧握住两人的手：“如果不是你们协作施救，我早就被灌入的地下水吞没了！”' },
            { who: 'ash', say: '▲ sol ✦ tor ! 巨塔的崩坏已引发连锁天灾……', sub: '艾什展开莎草卷轴：“唯有赶在巴别塔彻底坍塌前登顶，找回散落的同位语神谕，才能平息大地的怒火！”' },
            { who: 'akad', say: '▲ ⚔ tor ! 三人成行，破土成路！', sub: '阿卡德敲响凿石铁锤：“带上水利索具与物资，我们向巴别巨塔的通天螺旋进发！”' },
            { who: 'bani', say: '☼ ♒ ▲ 遵命！我的水利卷盘与大行囊随时就绪！', sub: '巴尼重拾信心：“地表村落四方还有其他幸存的居民、工坊与粮仓，出发前我们还可以自由探索招募！”' },
            { cam: [s.x, s.y + 2.5, 22], narr: '【三人核心小队集结完毕！】探索村落招募帮手与储备物资，赶赴巴别巨塔脚下！' }
          ], () => {
            this.hud.banner('🚩 【三人核心小队集结！】艾什、阿卡德与巴尼正式成行！', 'good');
          });
        }, 500);
      }
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

    // ───────── 协力托举（双人协同助跳腾空：底座扎步垫手托举，受托者借力高飞登台） ─────────
    coopBoostUp(lifter = null, boosted = null, targetPlat = null) {
      if (this.coopActive) return;

      const available = this.available().filter(u => u.grounded && !u.fainted);
      if (available.length < 2) {
        this.hud.banner('协力托举需要至少 2 名站在地面上的同伴配合！请让队友靠近', 'warn');
        return;
      }

      // 1. 智能选定托举者 (lifter) 与受托举者 (boosted)
      const sel = available.filter(u => this.selection.has(u));
      if (!lifter || !boosted) {
        if (sel.length >= 2) {
          // 选中 2 人：较重/更强壮者作为底座托举，另一人受托起飞
          const strength = (u) => (u.id === 'bani' || u.role === '绝壁挑夫') ? 10 : (u.id === 'ghar' || u.role === '开路工兵') ? 8 : (u.id === 'akad' || u.role === '护卫') ? 7 : (u.id === 'ash') ? 6 : 5;
          sel.sort((a, b) => strength(b) - strength(a));
          lifter = sel[0];
          boosted = sel[1];
        } else if (sel.length === 1) {
          // 选中 1 人：作为受托者，在周围 4.5m 寻找最强壮的队友作为底座
          boosted = sel[0];
          const nearby = available.filter(u => u !== boosted && Math.hypot(u.x - boosted.x, u.y - boosted.y) < 4.5);
          if (!nearby.length) {
            this.hud.banner('附近 4.5 米内没有其他同伴可提供托举！请让队友靠近', 'warn');
            return;
          }
          nearby.sort((a, b) => Math.hypot(a.x - boosted.x, a.y - boosted.y) - Math.hypot(b.x - boosted.x, b.y - boosted.y));
          lifter = nearby[0];
        } else {
          // 未选中小人：默认领队与身旁最近的队友
          const leader = (this.leader && this.leader.recruited && !this.leader.fainted && this.leader.grounded) ? this.leader : available[0];
          const nearby = available.filter(u => u !== leader && Math.hypot(u.x - leader.x, u.y - leader.y) < 4.5);
          if (nearby.length) {
            lifter = leader;
            boosted = nearby[0];
          } else {
            lifter = available[0];
            boosted = available[1];
          }
        }
      }

      this.coopActive = true;
      this.hideCoopPrompt();

      // 2. 确定朝向与目标平台 / 高台落脚点
      const avgX = (lifter.x + boosted.x) / 2;
      const baseY = Math.min(lifter.y, boosted.y);

      // 自动搜寻前方最近的高台、平台或屋顶 (落差 1.1m ~ 5.2m，距离 6.8m 内)
      if (!targetPlat) {
        const candidates = (this.supports || []).filter(s => {
          const dy = s.y - baseY;
          const dx = Math.abs((s.x1 + s.x2) / 2 - avgX);
          return dy >= 1.1 && dy <= 5.2 && dx < 6.8;
        });
        candidates.sort((a, b) => Math.abs((a.x1 + a.x2) / 2 - avgX) - Math.abs((b.x1 + b.x2) / 2 - avgX));
        if (candidates.length) {
          targetPlat = candidates[0];
        }
      }

      // 确定投射方向与落脚目标
      let launchDir = lifter.facing || 1;
      let targetX = lifter.x + launchDir * 2.8;
      let targetY = baseY + 3.2;

      if (targetPlat) {
        launchDir = ((targetPlat.x1 + targetPlat.x2) / 2 >= avgX) ? 1 : -1;
        targetX = Math.max(targetPlat.x1 + 0.45, Math.min(targetPlat.x2 - 0.45, avgX + launchDir * 2.4));
        targetY = targetPlat.y;
      }

      lifter.facing = launchDir;
      boosted.facing = launchDir;

      // 3. 动作前摇：托举者扎稳马步垫手，受托举者准备借力起飞
      lifter.order = null; lifter.path = null; lifter.vx = 0; lifter.vy = 0;
      boosted.order = null; boosted.path = null; boosted.vx = 0; boosted.vy = 0;
      lifter.state = 'coop'; boosted.state = 'coop';
      lifter.task = { type: 'hand' }; boosted.task = { type: 'hand' };

      lifter.say('▲ gha · ! ✋ (扎稳马步，垫手托举！)', 1.5);
      boosted.say('✦ hop · ↑ ! (借力起步！)', 1.5);
      SFX.playTone(320, 'sawtooth', 0.18, 0.08, 480);

      // 受托举者贴紧托举者
      boosted.x = lifter.x - launchDir * 0.35;
      boosted.y = lifter.y;

      setTimeout(() => {
        if (boosted.fainted || lifter.fainted || !this.units.includes(boosted) || !this.units.includes(lifter)) {
          this.coopActive = false;
          return;
        }

        // 4. 发力蹬跃与空中飞腾！
        SFX.playTone(600, 'sine', 0.28, 0.1, 980);
        this.shake(0.22);
        this.fx.sparkle(lifter.x + launchDir * 0.3, lifter.y + 0.9);
        lifter.say('↑ 喝！起！', 1.2);

        const rise = Math.max(2.4, targetY - lifter.y + 0.8);
        const vy = Math.sqrt(2 * 32 * rise);
        const flightTime = Math.max(0.4, (vy + Math.sqrt(Math.max(0, vy * vy - 2 * 32 * (targetY - lifter.y)))) / 32);
        const vx = (targetX - boosted.x) / flightTime;

        boosted.grounded = null;
        boosted.state = 'jump';
        boosted.coopAirborne = true;
        boosted.task = null;
        boosted.vy = vy;
        boosted.vx = vx;
        boosted.facing = launchDir;

        this.hud.banner(`🚀【协力托举】${lifter.name}发力将【${boosted.name}】猛烈托举送上高台！`, 'good');

        // 底座队友解除限制
        setTimeout(() => {
          lifter.state = 'idle';
          lifter.task = null;
          lifter.grounded = ENT.findGround(this, lifter.x, lifter.y, 0.28);
        }, 550);

        // 监测着陆（必须经过半程腾空时间后才允许落定，杜绝刚起跳或最高点瞬移吸附）
        let landed = false;
        const launchAt = performance.now();
        const minAirMs = Math.max(260, flightTime * 550);
        const checkLanding = setInterval(() => {
          if (landed) return;
          if (performance.now() - launchAt < minAirMs) return;
          if (boosted.vy <= 0 && boosted.y <= targetY + 0.35) {
            landed = true;
            clearInterval(checkLanding);
            boosted.coopAirborne = false;
            boosted.x = targetX;
            boosted.y = targetY;
            boosted.vx = 0;
            boosted.vy = 0;
            boosted.state = 'idle';
            boosted.grounded = ENT.findGround(this, boosted.x, boosted.y, 0.28);
            boosted.say('上来了！在高处建立立足点！', 2.0);
            SFX.playConfirm();
            this.coopActive = false;
            this.hud.dirty = true;
          }
        }, 40);

        setTimeout(() => {
          if (!landed) {
            clearInterval(checkLanding);
            boosted.coopAirborne = false;
            this.coopActive = false;
            if (boosted.state === 'coop') boosted.state = 'idle';
          }
        }, 2800);
      }, 400);
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
      // 必须在键盘、AI 与跟随改写坐标之前记录上一安全位置；否则正常贴墙会被误判为嵌入。
      const openPrev = (this.openWorld && this.openWorld.active)
        ? new Map(this.units.map(u => [u, { x: u.x, z: u.targetZ || 0 }]))
        : null;
      if (!settle) {
        this.units.forEach(u => { if (u.recruited) u.think(dt); else if (u.grounded) u.vx = 0; });
        this.updateDirectControls(dt);
        this.updateSquadFollow(dt);
      }
      this.units.forEach(u => {
        const oldX = u.x, oldZ = u.targetZ || 0;
        u.physics(dt);
        if (openPrev) {
          const prev = openPrev.get(u) || { x: oldX, z: oldZ };
          this.openWorld.constrainUnit(u, prev.x, prev.z);
        }
      });
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
      if (sel.length === 1 && sel[0] !== this.leader) {
        this.leader = sel[0];
        this.hud.dirty = true;
      }
      sel.forEach(u => {
        u.holdPos = false;
        if (u.order && u.order.type === 'open_move') {
          u.order = null; u.path = null; u.openPath = null;
        }
      });

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
            // 边缘悬崖防护 (Ledge safety guardrail):
            // 在高层平台或屋顶 (y >= 1.5) 且站在地面上时：
            // 如果玩家没有同时按跳跃键 (Space)，在接近断崖边缘时自动停步刹车！
            if (u.grounded && u.y >= 1.5 && !this.keys[' ']) {
              const edge = dir > 0 ? u.grounded.x2 : u.grounded.x1;
              const distToEdge = dir > 0 ? (edge - u.x) : (u.x - edge);

              if (distToEdge < 0.42) {
                // 即将迈出当前平台边缘，探测前方落脚点
                const probeX = u.x + dir * 0.65;
                // 探测从当前高度到下方 1.8m 内是否有任何合法支撑
                const safeAhead = this.supports.find(s => {
                  if (probeX < s.x1 || probeX > s.x2) return false;
                  if (s.y > u.y + 0.35 || s.y < u.y - 1.8) return false;
                  return true;
                });

                if (!safeAhead) {
                  // 前方是高空断崖或深渊！在边缘刹停停步！
                  if (dir > 0 && u.x >= edge - 0.12) u.x = edge - 0.12;
                  if (dir < 0 && u.x <= edge + 0.12) u.x = edge + 0.12;
                  u.vx = 0;
                  if (u.grounded) u.state = 'idle';
                  u.facing = dir;
                  return;
                }
              }
            }
            u.order = null;
            u.path = null;
            u.vx = dir * u.speed();
            u.facing = dir;
            if (u.grounded) u.state = 'walk';
          }
        });
      }

      // 2. W / S 只负责 XZ 平面的前后移动。爬梯、进门与上下连接统一走 E / 数字 5。
      if (keyU || keyD) {
        sel.forEach(u => {
          if (u.state === 'climb') return;
          // S + Space 是明确的主动下穿组合键；单按 S 永远只是向镜头方向行走。
          const deliberateDropCombo = this.keys[' '] || this.keys['s_drop'];
          if (keyD && deliberateDropCombo && u.grounded && (u.grounded.kind === 'oneway' || u.grounded.kind === 'crate')) {
            const safeFloorBelow = ENT.findGround(this, u.x, u.y - 0.8, ENT.HW, undefined, undefined, u.targetZ, u.grounded.key);
            if (safeFloorBelow && u.y - safeFloorBelow.y <= 3.8) {
              u.dropThroughCooldown = 0.35;
              u.dropThroughKey = u.grounded.key;
              u.grounded = null; u.vy = -3.2; u.y -= 0.22; u.state = 'fall';
              return;
            }
          }

          // W: 向屏幕深处 (-Z)，S: 向屏幕前方 (+Z)。
          // W: 向屏幕深处行走 (-Z 远离相机)
          // S: 向屏幕前方行走 (+Z 靠近相机/朝向女儿墙)
          const dz = keyU ? -dt * 4.0 : dt * 4.0;
          let newTargetZ = (u.targetZ || 0) + dz;

          // 纵深防护女儿墙（Guardrails）：严格限制在当前物理承载面的安全 Z 轴区间内，绝不踏入虚空
          if (u.grounded) {
            if (u.grounded.key && u.grounded.key.startsWith('roof_')) {
              // 屋顶平台：根据建筑深度限制前后活动范围，防止走出屋顶坠落
              const decor = (this.level.decor || []).find(d => d.t === 'building' && ('roof_' + (d.id || '')) === u.grounded.key);
              const bDepth = (decor && decor.d) ? decor.d : 5.2;
              const centerZ = (decor && decor.z !== undefined) ? decor.z : -(bDepth / 2);
              const halfD = (bDepth / 2) - 0.65;
              newTargetZ = Math.max(centerZ - halfD, Math.min(centerZ + halfD, newTargetZ));
            } else if (u.grounded.y >= 1.5) {
              // 高空连廊、高台栈道或瞭望塔平台：严格约束在平台中心线的护栏安全走廊内
              const platZ = u.grounded.z !== undefined ? u.grounded.z : 0;
              newTargetZ = Math.max(platZ - 1.25, Math.min(platZ + 1.25, newTargetZ));
            } else {
              // 连续城区：地面 Z 由世界边界与真实建筑碰撞共同约束
              if (this.openWorld && this.openWorld.active) {
                const wb = this.openWorld.bounds;
                newTargetZ = Math.max(wb.z1 + 0.6, Math.min(wb.z2 - 0.6, newTargetZ));
              } else {
                newTargetZ = Math.max(-4.8, Math.min(2.6, newTargetZ));
              }
            }
          } else {
            // 空中状态：保持现有 Z 轴，禁止空中盲目横漂
            newTargetZ = u.targetZ || 0;
          }

          u.targetZ = newTargetZ;
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

    // 仿 Run! Zombie Food 工兵团多层立体阵型伴随跟随
    // 深度优化：跨层自动寻路登梯、严禁在队长下方原地起跳顶墙、悬崖坠落安全检测
    updateSquadFollow(dt) {
      if (this.state !== 'play' || this.cut) return;
      const leader = (this.leader && this.leader.recruited && !this.leader.fainted) ? this.leader : (this.units.find(u => u.recruited && !u.fainted) || null);
      if (!leader) return;

      const followers = this.units.filter(u => u.recruited && !u.fainted && !u.detached && !u.holdPos && u !== leader && u.state !== 'climb' && u.state !== 'coop' && u.grounded && !u.coopAirborne);
      if (!followers.length) return;

      followers.forEach((u, idx) => {
        // 若队员正在执行非跟随类的用户具体指令（移动、拾取、造桥、读碑等），严禁篡改其 Z 轴或打断指令
        if (u.order && u.order.type !== 'follow_leader') return;

        const yDiff = leader.y - u.y;
        const absYDiff = Math.abs(yDiff);
        if (this.openWorld && this.openWorld.active && absYDiff <= 1.2 &&
            this.openWorld.updateFollower(u, leader, idx, dt)) return;

        // 非开放世界或高层同台地时平滑同步 Z 纵深，绝不瞬移跳变
        if (absYDiff <= 1.2 && (!this.openWorld || !this.openWorld.active || leader.y > 1.2)) {
          const dz = (leader.targetZ || 0) - (u.targetZ || 0);
          if (Math.abs(dz) > 0.05) {
            u.targetZ = (u.targetZ || 0) + Math.sign(dz) * Math.min(Math.abs(dz), dt * 4.2);
          }
          u.inInterior = leader.inInterior;
        }

        // ════════════════ 1. 跨层跟随（领队与队员处于不同楼层/台地：高度差 > 1.2m） ════════════════
        if (absYDiff > 1.2) {
          // 如果已经在执行 follow_leader 且有有效路径，继续执行
          if (u.order && u.order.type === 'follow_leader' && u.path && u.path.length > 0) {
            return;
          }

          // 周期性规划跨层寻路（错开时间帧，防止同帧集中计算）
          u.followPlanT = (u.followPlanT || 0) - dt;
          if (u.followPlanT <= 0 && u.grounded) {
            u.followPlanT = 1.0 + idx * 0.25;
            const plan = this.planFor(u, { x: leader.x, y: leader.y });
            if (plan && plan.reachable && plan.actions && plan.actions.length > 0) {
              u.order = { type: 'follow_leader', goal: { x: leader.x, y: leader.y }, utter: false };
              u.path = plan.actions;
              u.replanT = 2.5;
              u.squadFollowActive = false;
              return;
            } else {
              // 领队暂处于不可直达区域（如断桥未修好、大门未开或孤立高台）：
              // 核心要求：绝不在队长正下方原地跳跃顶墙！就地停步保持警戒，面朝领队
              u.order = null;
              u.path = null;
              u.vx = 0;
              u.state = 'idle';
              u.squadFollowActive = false;
              u.facing = Math.sign(leader.x - u.x) || u.facing;
              return;
            }
          }
          // 在寻路等待期间保持原地站立，严禁盲目横移撞墙起跳
          if (!u.order) {
            u.vx = 0;
            if (u.grounded) u.state = 'idle';
            u.facing = Math.sign(leader.x - u.x) || u.facing;
            return;
          }
        }

        // ════════════════ 2. 同层或微小台阶跟随（高度差 <= 1.2m） ════════════════
        if (u.order && u.order.type === 'follow_leader') {
          u.order = null;
          u.path = null;
        }

        const dir = (leader.vx !== 0) ? Math.sign(leader.vx) : (leader.facing || 1);
        const targetDist = 0.95 + idx * 0.65;
        let targetX = leader.x - dir * targetDist;

        // 目标安全落脚点保护：若目标计算位置悬空，收紧跟随距离防坠落
        const safeTargetGround = ENT.findGround(this, targetX, leader.y, ENT.HW, undefined, undefined, u.targetZ);
        if (!safeTargetGround) {
          targetX = leader.x - dir * 0.45;
        }
        const dx = targetX - u.x;
        const dist = Math.abs(dx);

        if (u.squadFollowActive) {
          if (dist < 0.45) {
            u.squadFollowActive = false;
            u.vx = 0;
            if (u.grounded) u.state = 'idle';
          } else {
            const stepDir = dx > 0 ? 1 : -1;
            // 悬崖/断崖边缘安全检测：若前方悬空且落差过高，严禁队员盲从跳崖！
            if (u.grounded) {
              const testNextX = u.x + stepDir * 0.55;
              const groundAhead = ENT.findGround(this, testNextX, u.y, ENT.HW, undefined, undefined, u.targetZ);
              if (!groundAhead) {
                const lowerGround = ENT.findGround(this, testNextX, u.y - 1.5, ENT.HW, undefined, undefined, u.targetZ);
                if (!lowerGround || (u.y - lowerGround.y > 1.8)) {
                  // 前方是深渊、高空断崖或枯井深穴，严禁盲从跳崖！
                  u.vx = 0;
                  u.state = 'idle';
                  u.squadFollowActive = false;
                  return;
                }
              }
            }
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

        // 有目标断层台阶起跳：仅当正向朝向领队且前方确有低矮台阶（<=1.2m）且领队确实在该台阶上方时定向跳跃
        if (u.grounded && yDiff > 0.35 && yDiff <= 1.5 && Math.abs(u.x - leader.x) < 2.4 && u.vy <= 0 && u.squadFollowActive) {
          const stepDir = Math.sign(leader.x - u.x);
          const nextGround = ENT.findGround(this, u.x + stepDir * 0.8, u.y + 0.9, ENT.HW, undefined, undefined, u.targetZ);
          if (nextGround && nextGround.y > u.y + 0.25 && nextGround.y <= u.y + 1.25 && leader.y >= nextGround.y - 0.2) {
            const rise = Math.min(1.4, Math.max(0.65, nextGround.y - u.y + 0.25));
            u.vy = Math.sqrt(2 * 32 * rise);
            u.vx = stepDir * u.speed();
            u.grounded = null;
            u.state = 'jump';
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

      // BGM 自动轮播更新
      if (window.SFX && window.SFX.update) {
        window.SFX.update(dt);
      }
      // 连续大世界海拔区域检测与章节无缝衔接
      this.updateZoneProgression(dt);

      if (this.state !== 'play') return;

      // 招募与路人交互
      this.units.forEach(s => {
        if (s.recruited) return;
        if (s.isMerchant) {
          const near = this.units.find(u => u.recruited && Math.hypot(u.x - s.x, u.y - s.y) < 3.2);
          if (near && Math.random() < dt * 0.15) {
            this.hud.banner('⚖️ 行脚商人【纳布·辛】在此！点击商人或按 E 即可进行以物易物交易', 'info');
          }
          return;
        }
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

        // 2. 通用「协力托举」（Cooperative Boost Up）优先检测：双人配合腾空高跃/登台
        if (!promptHandled) {
          const availableGrounded = this.available().filter(u => u.grounded && !u.fainted);
          const selGrounded = availableGrounded.filter(u => this.selection.has(u));

          let pairLifter = null, pairBoosted = null, boostPlat = null;

          if (selGrounded.length >= 2) {
            pairLifter = selGrounded[0];
            pairBoosted = selGrounded[1];
          } else if (selGrounded.length === 1) {
            const u = selGrounded[0];
            const partner = availableGrounded.find(o => o !== u && Math.hypot(o.x - u.x, o.y - u.y) < 4.2);
            if (partner) {
              pairLifter = partner;
              pairBoosted = u;
            }
          } else if (availableGrounded.length >= 2) {
            const leader = (this.leader && this.leader.recruited && !this.leader.fainted && this.leader.grounded) ? this.leader : availableGrounded[0];
            const partner = availableGrounded.find(o => o !== leader && Math.hypot(o.x - leader.x, o.y - leader.y) < 3.8);
            if (partner) {
              pairLifter = partner;
              pairBoosted = leader;
            }
          }

          if (pairLifter && pairBoosted && (pairLifter.x < 28 || pairLifter.x > 35) && Math.abs(pairLifter.targetZ || 0) < 2.2) {
            const avgX = (pairLifter.x + pairBoosted.x) / 2;
            const avgY = Math.min(pairLifter.y, pairBoosted.y);
            boostPlat = (this.supports || []).find(s => {
              const dy = s.y - avgY;
              const dx = Math.abs((s.x1 + s.x2) / 2 - avgX);
              return dy >= 1.4 && dy <= 4.8 && dx < 4.5;
            });

            if (boostPlat) {
              this.showCoopPrompt(`🤝 协同「协力托举」：【${pairLifter.name}】发力垫手，托举【${pairBoosted.name}】跃升高台！`, () => this.coopBoostUp(pairLifter, pairBoosted, boostPlat));
              promptHandled = true;
            }
          }
        }

        if (!promptHandled && this.plats) {
          // 通用高台「叠罗汉」检测（高台下方 3 人以上选定，搭人梯送顶层上台）
          const sel = this.available().filter(u => this.selection.has(u) && u.grounded && !u.order);
          if (sel.length >= 3) {
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

        if (!promptHandled && this.plats) {
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

        // 严密防虚空坠落与防穿模安全网：任何单位掉出边界或穿透地板时，安全力场平稳救回
        const b = lv.bounds;
        const isOutOfBoundsX = u.x < b.x1 - 4 || u.x > b.x2 + 4;
        const isBelowVoid = u.y < lv.voidY;
        const isGroundClipped = (this.levelIdx === 0 && (u.x < 28.5 || u.x > 34.5) && u.y < -1.8);

        if (isOutOfBoundsX || isBelowVoid || isGroundClipped) {
          this.safeRecoverUnit(u);
        }
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

      // 阶段计时与 60s 备战倒计时动态更新
      if (this.phase === 'ground' && !inCut && this.state === 'play') {
        this.groundTimer = (this.groundTimer || 0) + dt;
        this.updatePhaseWidget();
      }

      // 1. 顺手拾取（自动拾取）：行经脚边物资时顺手收入背包，绝不改变队伍寻路或移动指令
      if (this.autoPickup && this.state === 'play' && !inCut) {
        this.autoPickupTimer = (this.autoPickupTimer || 0) + dt;
        if (this.autoPickupTimer > 0.15) {
          this.autoPickupTimer = 0;
          this.scanAndOpportunisticPickup();
        }
      }

      // 2. 自动搜刮：空闲队员自主寻路前往周边散落物资
      if (this.autoScavenge && this.state === 'play' && !inCut) {
        this.autoGatherTimer = (this.autoGatherTimer || 0) + dt;
        if (this.autoGatherTimer > 0.6) {
          this.autoGatherTimer = 0;
          this.scanAndAutoGather();
        }
      }

      // 3. 自动扩员定期扫描
      if (this.autoRecruit && this.state === 'play' && !inCut) {
        this.autoRecruitTimer = (this.autoRecruitTimer || 0) + dt;
        if (this.autoRecruitTimer > 0.5) {
          this.autoRecruitTimer = 0;
          this.scanAndAutoRecruit();
        }
      }

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

      // 过场自动推进（拖拽旋转镜头时暂停自动跳句，方便自由观察）
      if (this.cut && !this.cutCamDragging) { this.cut.t += dt; if (this.cut.t > (this.cut.line.auto || 7.5)) this.advanceCut(); }
    }

    // ════════════ 虚空坠落安全救援力场（零损耗回正，物资 100% 完整保留） ════════════
    safeRecoverUnit(u) {
      if (!u) return;
      const lv = this.level;
      let safeX = lv.spawn ? lv.spawn.x : 0;
      let safeY = lv.spawn ? lv.spawn.y + 0.3 : 0.3;
      let safeZ = 0;

      // 优先 1：已点亮的检查点
      if (this.checkpoint && this.checkpoint.reached) {
        safeX = this.checkpoint.x + (Math.random() - 0.5) * 0.8;
        safeY = this.checkpoint.y + 0.3;
      } else {
        // 优先 2：领队或其他站在地面的安全队友
        const leader = (this.leader && this.leader.recruited && !this.leader.fainted && this.leader !== u && this.leader.y >= 0) ? this.leader : null;
        const buddy = leader || this.units.find(o => o.recruited && !o.fainted && o !== u && o.grounded && o.y >= 0);
        if (buddy) {
          safeX = buddy.x - (buddy.facing || 1) * 0.7;
          safeY = buddy.y + 0.3;
          safeZ = buddy.targetZ || 0;
        }
      }

      u.x = safeX;
      u.y = safeY;
      u.targetZ = safeZ;
      u.vx = 0;
      u.vy = 0;
      u.order = null;
      u.path = null;
      u.task = { type: 'stun', t: 0.6 };
      u.state = 'idle';
      u.grounded = ENT.findGround(this, u.x, u.y, ENT.HW, undefined, undefined, u.targetZ);

      // 核心原则：绝不扣除或遗失任何背负物资，全部 100% 完好保留！
      u.refreshStack();

      SFX.playTone(520, 'sine', 0.18, 0.08, 680);
      this.hud.banner(`🛡️ 救生安全力场启动！已将失足的【${u.name}】安全接回地面，背负物资完好无损！`, 'good');
    }

    respawn(u) {
      this.safeRecoverUnit(u);
    }

    completeLevel() {
      this.exiting = true;
      this.units.forEach(u => { if (u.recruited) this.stacks[u.id] = u.stack.slice(); });
      const next = this.levelIdx + 1;
      localStorage.setItem('babel_unlocked', String(Math.max(this.unlocked(), next + 1)));
      localStorage.setItem('babel_runes', String(this.runesTotal));
      SFX.playMiracle();

      // 地面阶段通往巴别塔内部阶段：成果核算与竞争预警
      if (this.levelIdx === 0) {
        const t = Math.floor(this.groundTimer || 45);
        const pop = this.units.filter(u => u.recruited).length;
        const loot = this.units.reduce((acc, u) => acc + (u.recruited ? u.stack.length : 0), 0);
        const rivalCount = Math.min(5, Math.max(1, Math.floor(t / 38)));

        const sumEl = $('ascent-phase-summary');
        if (sumEl) {
          sumEl.style.display = 'block';
          const timeEl = $('sum-time'); if (timeEl) timeEl.textContent = `${t} 秒`;
          const popEl = $('sum-pop'); if (popEl) popEl.textContent = `${pop} 人`;
          const lootEl = $('sum-loot'); if (lootEl) lootEl.textContent = `${loot} 件`;
          const rivalsEl = $('sum-rivals'); if (rivalsEl) rivalsEl.textContent = `${rivalCount} 支`;
          const descEl = $('sum-rival-desc');
          if (descEl) {
            descEl.textContent = t < 50
              ? '【闪电突击】：火速抵达塔脚！仅有 1 支先遣探险队先期入塔，塔内资源充沛！'
              : t < 100
                ? '【稳步整备】：筹备妥当！已有 2 支异邦竞争小队抢先进入中层通道！'
                : t < 150
                  ? '【深度搜刮】：队伍全副武装！已有 3 支异邦武装战团重兵扼守各层石殿！'
                  : '【洗劫全图】：兵强马壮但耗时过久！已有 4~5 支精锐异邦战团封锁塔内螺旋回廊！准备迎击！';
          }
        }
      }

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
          const sumEl = $('ascent-phase-summary');
          if (sumEl) sumEl.style.display = 'none';
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
      if (c.i >= c.lines.length) { this.cut = null; this.cutCamDragging = false; this.camYawT = 0; this.camPitchT = 0; this.hud.hideCut(); this.follow = true; c.onDone && c.onDone(); return; }
      const line = c.lines[c.i]; c.line = line;
      if (line.cam) {
        this.camT.x = line.cam[0]; this.camT.y = line.cam[1]; this.camT.dist = line.cam[2]; this.camT.z = line.cam[3] !== undefined ? line.cam[3] : 0; this.follow = false;
      }
      if (line.shake) {
        this.shake(line.shake);
        if (this.fx && this.fx.chips) {
          this.fx.chips(this.cam.x + (Math.random() - 0.5) * 6, this.cam.y + 3);
        }
      }
      if (line.act) line.act();
      if (line.who) {
        const u = this.units.find(q => q.id === line.who);
        if (u) {
          u.say(line.say, 5);
          // 电影感运镜：对话时特写近景聚焦讲话人物，并同步人物 Z 轴平面防前景遮挡
          this.camT.z = u.z !== undefined ? u.z : (u.targetZ || 0);
          if (!line.cam) {
            this.camT.x = u.x;
            this.camT.y = u.y + 0.85;
            this.camT.dist = u.y < -1.0 ? 14.5 : 11.5;
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
        { cam: [67, 88, 30, 0], narr: '五个符号同时亮起。天球仪停了一瞬——然后开始倒转。', act: () => { arm.forEach(a => a.armillary.userData.speed = -5); SFX.playMiracle(); this.shake(0.4); } },
        { narr: '他们不约而同地走向圣坛。这一次，没有人下达指令。', act: () => mem.forEach((u, i) => { u.task = null; u.setOrder({ type: 'move', goal: { x: 64.5 + i * 1.1, y: 86.0 } }); }), auto: 6 },
        { cam: [67, 87.2, 18, 0], who: 'ash', say: '☼ ♒ ▲ ◎ ✦', sub: '（所有人同时伸出了左手）', act: () => mem.forEach(u => { u.order = null; u.path = null; u.vx = 0; u.task = { type: 'hand' }; u.facing = u.x < 67 ? 1 : -1; }) },
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
      SFX.playTone(580, 'sine', 0.15, 0.08, 880);
      SFX.playConfirm();
      if (this.fx && this.fx.sparkle) this.fx.sparkle(u.x, u.y + 1.2);
      u.say(`👑 ${u.langs[0]} ${u.role}! (队长就任)`, 1.8);
      this.hud.banner(`👑 民主领队已任命为【${u.name} · ${u.role}】！全队将伴随跟随队长行进`, 'story');
      this.hud.dirty = true;
    }
    selectMember(u) {
      if (!u || !u.recruited) return;
      if (!u.fainted) this.leader = u;
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
      u.holdPos = u.detached;
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

    // 沿语言链把指令传给一名队员（包含口头转告时间差与队内手语直达逻辑）
    deliver(u, order) {
      const activeLeader = (this.leader && this.leader.recruited && !this.leader.fainted) ? this.leader : this.units.find(q => q.recruited && !q.fainted);

      // 1. 领队下达给自身，无需中继传令与翻译延迟，直接执行
      if (u === activeLeader) {
        u.pending = null;
        u.setOrder(order);
        if (order.utter !== false) u.speak(order.act || 'move');
        return true;
      }

      // 2. 检查语言链联通状态
      const isConnected = this.chain && this.chain.connected && this.chain.connected.has(u);
      const path = isConnected ? LANG.chainPath(this.chain, u) : [];

      // 3. 队内手语（Visual Sign Language）：若已掌握且目标在视线范围内（35m 内），可利用手语免除口头中继时间差！
      const distToLeader = activeLeader ? Math.hypot(u.x - activeLeader.x, (u.y - activeLeader.y) * 1.1) : 999;
      const canSeeLeader = distToLeader < 35;

      // 如果已掌握手语，且 (语言链断开 OR 口头转告需要 2 级以上多重翻译中继)，优先采用手语直达！
      if (this.teamSignal && this.teamSignal.learned && canSeeLeader && (!isConnected || path.length >= 2)) {
        const roll = Math.random();
        if (roll < this.teamSignal.proficiency) {
          // 手语直达成功！仅需 0.12s 视觉反应延迟
          if (activeLeader) {
            activeLeader.say('✋ ' + (LANG.ACT[order.type] || '→'), 1.4);
          }
          u.say('✋ ' + (LANG.ACT[order.type] || '!') + ' (手语直达)', 1.5);
          SFX.playTone(480, 'triangle', 0.15, 0.05, 560);
          u.pending = { order, t: 0.12 };
          this.teamSignal.proficiency = Math.min(1.0, this.teamSignal.proficiency + 0.01);
          const savedDelay = path.length >= 2 ? (path.length * 0.55).toFixed(1) : '1.1';
          this.hud.banner(`⚡ 队内手语直达！省去口头转告耗时 +${savedDelay}s（手语默契度 ${Math.round(this.teamSignal.proficiency * 100)}%）`, 'good');
          return true;
        } else {
          // 手语偶有生疏迟疑
          u.say('✋ … ? ⤹ (辨认手势中)', 1.8);
          this.hud.banner(`手语稍显生疏：${u.name}揉眼辨认手势（默契度 ${Math.round(this.teamSignal.proficiency * 100)}%）。按 [8] 可全员演练提升！`, 'warn');
          SFX.playTone(220, 'square', 0.25, 0.06, 180);
          u.task = { type: 'stun', t: 0.5 };
          setTimeout(() => {
            if (u.alive) {
              u.say('✋ ! 领会', 1.2);
              u.setOrder(order);
            }
          }, 550);
          return true;
        }
      }

      // 4. 若语言链彻底断开且无法使用手语
      if (!isConnected) {
        u.say('… ? …', 2.0);
        this.hud.banner(`语言链断开：${u.name}听不见指令。靠近一些，留人当中继，或按 [8] 传授队内手语`, 'warn');
        SFX.playTone(160, 'square', 0.2, 0.05, 120);
        return false;
      }

      // 5. 语言链直接交流（1 跳）：领队与队员共享同一门语言，直接口头下达
      if (path.length === 1) {
        if (activeLeader) {
          activeLeader.facing = Math.sign(u.x - activeLeader.x) || activeLeader.facing;
          activeLeader.say('🗣️ ' + LANG.utter(activeLeader.langs, order.act || order.type, path[0].lang).text, 1.4);
        }
        SFX.playLanguageHop(path[0].lang, 0);
        if (this.hud && this.hud.pulse) this.hud.pulse(path, 0.25);
        u.pending = { order, t: 0.25 };
        return true;
      }

      // 6. 口头多级转告（>= 2 跳）：必须经历逐级翻译与传话，产生明确的时间差！
      const HOP_ORAL = 0.55; // 每级口头转告耗时 0.55 秒
      const totalDelay = path.length * HOP_ORAL;
      const chainNames = [path[0].from.name, ...path.map(h => h.to.name)].join(' ➔ ');

      // 明确提示口头转告所耗费的时间差
      this.hud.banner(`🗣️ 口头转告耗时 +${totalDelay.toFixed(1)}s：【${chainNames}】多重口头翻译中…（💡 按 [8] 传授队内手语可消除转告延迟！）`, 'info');

      // 目标队员在接收到最终指令前，处于“倾听转告”等待状态
      u.say('👂 倾听转告…', totalDelay);

      // 逐跳推演口头传话动画与音效
      path.forEach((h, i) => {
        setTimeout(() => {
          if (!this.units.includes(h.from) || !this.units.includes(h.to)) return;
          // 说话者朝向听话者
          h.from.facing = Math.sign(h.to.x - h.from.x) || h.from.facing;
          if (i === 0) {
            // 首发者发出原始语言指令
            h.from.say('🗣️ ' + LANG.utter(h.from.langs, order.act || order.type, h.lang).text, 1.6);
          } else {
            // 中继者翻译并向下传达
            h.from.say(`🗣️ ${h.lang} ➔ ${LANG.ACT[order.type] || '→'} (转告)`, 1.6);
            if (this.fx && this.fx.sparkle) {
              this.fx.sparkle((h.from.x + h.to.x) / 2, (h.from.y + h.to.y) / 2 + 1.2);
            }
          }
          SFX.playLanguageHop(h.lang, i);
        }, i * (HOP_ORAL * 1000));
      });

      // 2D 语言链脉冲光球动画与转告节拍同步
      if (this.hud && this.hud.pulse) {
        this.hud.pulse(path, HOP_ORAL);
      }

      // 目标队员等待所有中继翻译全部完成后，方才领悟指令开始行动！
      u.pending = {
        order,
        t: totalDelay,
        onDone: () => {
          u.say(`💡 ${path[path.length - 1].lang} 收到!`, 1.4);
          SFX.playTone(420, 'sine', 0.15, 0.05, 520);
        }
      };

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
      leader.say('✋ ' + (leader.langs ? leader.langs.join(' · ') : '☼') + ' ! (手语演练)', 2.5);
      leader.task = { type: 'operate', t: 1.5 };
      if (this.fx && this.fx.sparkle) this.fx.sparkle(leader.x, leader.y + 1.4);
      SFX.playTone(520, 'sine', 0.25, 0.08, 660);
      
      if (!this.teamSignal.learned) {
        this.teamSignal.learned = true;
        this.teamSignal.proficiency = 0.75;
        this.teamSignal.timesTaught = 1;
        this.hud.banner(`【队内手语已掌握】${leader.name}（${leader.role}）传授了视觉手语！免去口头转告漫长时间差，视距内直接传达指令（初始熟练度 75%）`, 'story');
        if (window.Achievements) window.Achievements.unlock('silent_signals');
        mem.forEach(u => {
          if (u !== leader) {
            setTimeout(() => {
              u.say('✋ ! (领悟手语)', 1.8);
              this.fx.sparkle(u.x, u.y + 1.2);
            }, 350 + Math.random() * 350);
          }
        });
      } else {
        this.teamSignal.timesTaught++;
        this.teamSignal.proficiency = Math.min(1.0, this.teamSignal.proficiency + 0.1);
        const pPct = Math.round(this.teamSignal.proficiency * 100);
        this.hud.banner(`全员反复演练队内手语，手势默契度提升至 ${pPct}%${pPct >= 100 ? '（心领神会，永不失误）' : ''}！`, 'good');
        mem.forEach(u => {
          if (u !== leader) {
            u.say('✋ ⊕ ! (默契提升)', 1.5);
            this.fx.sparkle(u.x, u.y + 1.2);
          }
        });
      }
      this.hud.dirty = true;
    }

    formation(units, x, y) {
      const surfs = this.surfaces();
      const s = NAV.findTarget(surfs, x, y);
      const sorted = units.slice().sort((a, b) => a.x - b.x);
      const n = sorted.length;
      // 集合队形严格防坠落：根据平台真实宽度收紧站位间距（0.38m~0.55m），杜绝多人集合向外推挤坠崖
      const maxSpan = s ? Math.max(0.6, s.x2 - s.x1 - 1.3) : 2.5;
      const sp = Math.min(0.55, Math.max(0.32, maxSpan / Math.max(1, n)));
      const res = new Map();
      sorted.forEach((u, i) => {
        let gx = x + (i - (n - 1) / 2) * sp;
        if (s) {
          const minX = Math.min(s.x1 + 0.65, (s.x1 + s.x2) / 2);
          const maxX = Math.max(s.x2 - 0.65, (s.x1 + s.x2) / 2);
          gx = Math.max(minX, Math.min(maxX, gx));
        }
        res.set(u, { x: gx, y: s ? s.y : y });
      });
      return { res, surf: s };
    }

    nearest(units, x, y, filter) {
      let best = null, bd = Infinity;
      units.forEach(u => { if (filter && !filter(u)) return; const d = Math.hypot(u.x - x, (u.y - y) * 1.5); if (d < bd) { bd = d; best = u; } });
      return best;
    }

    findInteractable(wx, wy, wz) {
      const checkZ = (objZ = 0, maxZ = 2.4) => {
        if (!this.openWorld || !this.openWorld.active || wz === undefined || wy >= 1.4) return true;
        return Math.abs(wz - objZ) <= maxZ;
      };
      for (const it of this.items) if (checkZ(it.z || 0, 2.2) && Math.hypot(it.x - wx, (it.y + 0.3 - wy) * 0.8) < 1.35) return { kind: 'item', obj: it };
      for (const c of this.crates) if (checkZ(0, 2.0) && Math.abs(wx - c.x) < 0.7 && wy > c.y - 0.2 && wy < c.y + 1.2) return { kind: 'crate', obj: c };
      for (const s of this.steles) if (checkZ(0, 2.5) && Math.abs(wx - s.x) < 0.8 && wy > s.y && wy < s.y + 2) return { kind: 'stele', obj: s };
      for (const l of this.levers) if (checkZ(0, 2.5) && Math.abs(wx - l.x) < 0.7 && wy > l.y && wy < l.y + 1.7) return { kind: 'lever', obj: l };
      for (const b of this.builds) if (checkZ(0, 2.5) && !b.done && wx > b.x1 - 0.3 && wx < b.x2 + 0.3 && Math.abs(wy - b.y) < 1.2) return { kind: 'build', obj: b };
      for (const p of this.plates) if (checkZ(0, 2.4) && Math.abs(wx - p.x) < p.w / 2 + 0.35 && wy > p.y - 0.4 && wy < p.y + 1.5) return { kind: 'plate', obj: p };
      for (const l of this.lifts) if (checkZ(0, 2.6) && wx > l.x1 && wx < l.x2 && wy > l.y - 0.7 && wy < l.y + 1.6) return { kind: 'lift', obj: l };
      for (const l of this.ladders) if (checkZ(0, 2.4) && (!l.trigger || this.isActive(l.trigger)) && Math.abs(wx - l.x) < 0.65 && wy > l.y0 - 0.3 && wy < l.y1 + 0.5) return { kind: 'ladder', obj: l };
      if (this.exit && Math.abs(wx - this.exit.x) < 1.5 && wy > this.exit.y && wy < this.exit.y + 3.6) return { kind: 'exit', obj: this.exit };
      return null;
    }

    command(wx, wy, wz) {
      const sel = (this.selection.size ? [...this.selection] : this.available()).filter(u => u.recruited && !u.detached);
      if (!sel.length) { this.hud.banner('先用左键框选队员（或按 R / 2 集结全员）', 'info'); return; }
      // 枯井快捷协作触发：仅当点击位置确在枯井口附近 (Z 轴与高度均匹配) 且有队员在井边/井下时执行，杜绝跨街区误触发瞬移
      if (this.levelIdx === 0 && wx > 28.5 && wx < 34.0 && Math.abs(wz || 0) < 2.2 && wy < 1.0) {
        const nearWellUnit = this.units.some(u => u.recruited && Math.abs(u.x - 31.0) < 5.0 && Math.abs(u.targetZ || 0) < 3.0);
        if (nearWellUnit && this.coopAction) { this.triggerCoopAction(); return; }
      }
      const hit = this.findInteractable(wx, wy, wz);
      this.follow = true;
      const send = (u, order) => this.deliver(u, order);
      if (hit) {
        const o = hit.obj;
        switch (hit.kind) {
          case 'item': {
            const maxCapOf = (q) => {
              const roleCap = (q.id === 'bani' || q.role === '绝壁挑夫' || q.role === '负重力士') ? 22 : ENT.MAX_STACK;
              return (window.DEV_PARAMS && window.DEV_PARAMS.maxCarry !== undefined) ? window.DEV_PARAMS.maxCarry : roleCap;
            };
            const u = this.nearest(sel, o.x, o.y, q => q.stack.length < maxCapOf(q));
            if (!u) { this.hud.banner('选中的队员背包已满，可按 Q 卸下或派遣其他队友', 'warn'); return; }
            send(u, { type: 'pick', item: o, goal: { x: o.x, y: o.y, z: o.z || 0 }, goalFn: () => o.alive ? { x: o.x, y: o.y, z: o.z || 0 } : null, act: 'pick' }); return;
          }
          case 'crate': {
            if (wy > o.y + 0.8) {
              const { res } = this.formation(sel, o.x, o.y + 1.0);
              sel.forEach(u => send(u, { type: 'move', goal: { ...res.get(u), z: 0 }, act: 'up' }));
              return;
            }
            const u = this.nearest(sel, o.x, o.y + 0.5);
            const dir = Math.sign(o.x - u.x) || 1;
            send(u, { type: 'push', goal: { x: o.x + dir * 3.5, y: o.y, z: 0 }, act: 'push' });
            return;
          }
          case 'stele': {
            let u = this.nearest(sel, o.x, o.y, q => o.langs.every(l => q.langs.includes(l)));
            if (!u) { u = this.nearest(sel, o.x, o.y); this.hud.banner(`石碑刻着 ${o.langs.join(' ')}：选中的人里没有同时懂这两种语言的`, 'warn'); }
            send(u, { type: 'stele', stele: o, goal: { x: o.x, y: o.y, z: 0 }, act: 'operate' }); return;
          }
          case 'lever': { const u = this.nearest(sel, o.x, o.y); send(u, { type: 'lever', lever: o, goal: { x: o.x - 0.5, y: o.y, z: 0 }, act: 'operate' }); return; }
          case 'build': {
            const builders = sel.filter(u => u.stack.includes('wood'));
            if (!builders.length) { this.hud.banner(`修筑需要木材：还缺 ${o.cost - o.progress} 根，选中的人没有背木材`, 'warn'); return; }
            builders.forEach(u => { const side = u.x < (o.x1 + o.x2) / 2 ? o.x1 - 0.75 : o.x2 + 0.75; send(u, { type: 'build', build: o, goal: { x: side, y: o.y, z: 0 }, act: 'build' }); });
            return;
          }
          case 'plate': {
            const n = sel.length;
            sel.forEach((u, i) => send(u, { type: 'plate', goal: { x: o.x + (i - (n - 1) / 2) * Math.min(0.45, o.w / Math.max(1, n)), y: o.y, z: 0 }, act: 'plate' }));
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
            sel.forEach((u, i) => send(u, { type: 'lift', goal: { x: Math.min(o.x2 - 0.35, o.x1 + 0.4 + i * 0.55), y: o.y, z: 0 }, act: 'up' }));
            this.hud.banner('队员正登台，站稳后点击升降台或按 E 拉动缆绳即可启动', 'info');
            return;
          }
          case 'ladder': {
            const avgY = sel.reduce((s, u) => s + u.y, 0) / sel.length;
            const goUp = avgY < (o.y0 + o.y1) / 2;
            const { res } = this.formation(sel, o.x, goUp ? o.y1 : o.y0);
            sel.forEach(u => send(u, { type: 'move', goal: { ...res.get(u), z: 0 }, act: goUp ? 'up' : 'down' }));
            return;
          }
          case 'exit': {
            const { res } = this.formation(sel, o.x, o.y);
            sel.forEach(u => send(u, { type: 'move', goal: { ...res.get(u), z: 0 }, act: 'up' }));
            return;
          }
        }
      }
      // 仅当点击真实平地（wy < 0.42）时使用城区 XZ 平面寻路；任何阶梯、高台、屋顶或塔层平台（wy >= 0.42）均走 NAV 立体多层寻路！
      if (this.openWorld && this.openWorld.active && wz !== undefined && wy < 0.42) {
        this.openWorld.commandMove(this, sel, wx, wz);
        this.fx.spawn(wx, 0.1, 6, '#ffd24a', 2, 0.5, 0.12, 0);
        return;
      }
      const { res, surf } = this.formation(sel, wx, wy);
      if (!surf) { this.hud.banner('那里没有落脚的地方', 'info'); return; }
      const isPartial = sel.length < this.available().length;
      const goalZ = surf.z !== undefined ? surf.z : 0;
      // 严禁在点击瞬间直接覆盖 u.targetZ（会导致大世界角色跨街区瞬移！），改为将目标 Z 写入寻路终点
      sel.forEach(u => {
        u.holdPos = isPartial;
        send(u, { type: 'move', goal: { ...res.get(u), z: goalZ }, act: 'move' });
      });
      this.fx.spawn(wx, surf.y + 0.1, 6, '#ffd24a', 2, 0.5, 0.12, 0);
    }

    rally() {
      // 集结全员：同时唤醒原地驻留（detached / holdPos）的队员归队
      const all = this.units.filter(u => u.recruited && !u.fainted);
      if (!all.length) return;
      all.forEach(u => { u.detached = false; u.holdPos = false; this.selection.add(u); });
      const leader = (this.leader && this.leader.recruited && !this.leader.fainted) ? this.leader : all[0];
      this.leader = leader;
      const others = all.filter(u => u !== leader);
      if (!leader.grounded) return;
      SFX.playRallyCommand();
      leader.say('☼ ' + (LANG.ACT.rally || 'rally!') + ' · ' + (leader.langs ? leader.langs[0] : '☼'), 2);
      if (this.openWorld && this.openWorld.active && leader.y <= 1.2) {
        if (others.length) this.openWorld.commandMove(this, others, leader.x, leader.targetZ || 0);
      } else {
        const { res } = this.formation(all, leader.x, leader.y);
        others.forEach(u => this.deliver(u, { type: 'rally', goal: res.get(u), act: 'rally' }));
      }
      this.follow = true;
      this.hud.dirty = true;
      this.hud.banner(`🚩 远征队全员（${all.length}人）已集结归队，向【${leader.name}】靠拢！`, 'good');
    }

    // 仿 Run! Zombie Food 即时策略：远征队全员自动拾荒/分头搜集散落物资
    gatherAll() {
      const maxCapOf = (u) => {
        const roleCap = (u.id === 'bani' || u.role === '负重力士') ? 22 : ENT.MAX_STACK;
        return (window.DEV_PARAMS && window.DEV_PARAMS.maxCarry !== undefined) ? window.DEV_PARAMS.maxCarry : roleCap;
      };

      // 优先动员选中的队员；若未选中或选中者背包全满，则自动动员队伍内所有可拾取成员
      let candidateUnits = this.available().filter(u => u.stack.length < maxCapOf(u) && (this.selection.has(u) || this.selection.size === 0));
      if (!candidateUnits.length) {
        candidateUnits = this.available().filter(u => u.stack.length < maxCapOf(u));
      }
      if (!candidateUnits.length) {
        this.hud.banner('远征队全员背包已满或均在执行任务，按 7 可卸下物资', 'warn');
        SFX.playTone(180, 'square', 0.2, 0.05);
        return;
      }

      const looseItems = this.items.filter(it => it.alive && !it.heldBy);
      if (!looseItems.length) {
        this.hud.banner('周边没有散落的无人物资', 'info');
        return;
      }

      let assignedCount = 0;
      const claimedItems = new Set();
      candidateUnits.forEach(u => {
        let bestItem = null, bestDist = Infinity;
        looseItems.forEach(it => {
          if (claimedItems.has(it)) return;
          const d = Math.abs(it.x - u.x) + Math.abs(it.y - u.y) * 1.5;
          if (d < bestDist && d < 75) {
            bestDist = d;
            bestItem = it;
          }
        });
        if (bestItem) {
          claimedItems.add(bestItem);
          this.deliver(u, {
            type: 'pick',
            item: bestItem,
            goal: { x: bestItem.x, y: bestItem.y },
            goalFn: () => bestItem.alive ? { x: bestItem.x, y: bestItem.y } : null,
            act: 'pick',
            isGatherAll: true
          });
          u.say('🎒 ' + (u.langs ? u.langs[0] : '☼') + ' pick!', 1.5);
          assignedCount++;
        }
      });

      if (assignedCount > 0) {
        SFX.playTone(392, 'triangle', 0.15, 0.08);
        this.hud.banner(`🎒 远征队分头出动：${assignedCount} 名队员前往自动搜集周边物资！`, 'good');
      } else {
        this.hud.banner('附近物资超出搜寻半径或队员无法通行到达', 'info');
      }
    }

    // ───────── 纸娃娃装扮与外貌定制模态框 (Paper Doll Dossier Modal) ─────────
    ensurePaperDollModal() {
      let modal = $('paperdoll-modal');
      if (modal) return modal;
      modal = document.createElement('div');
      modal.id = 'paperdoll-modal';
      modal.className = 'paperdoll-modal-overlay';
      modal.innerHTML = `
        <div class="paperdoll-modal-box">
          <div class="paperdoll-modal-header">
            <div class="pd-header-title-row">
              <span style="font-size: 20px;">🎨</span>
              <h2>泥版人事名录 · 纸娃娃外貌装束定制</h2>
              <span class="pd-header-badge">两河古风 · 历史纸娃娃系统</span>
            </div>
            <button class="pd-close-btn" id="btn-close-paperdoll" title="关闭 (Esc)">✕</button>
          </div>
          <div class="paperdoll-modal-body">
            <!-- 左侧：128x128 像素画实时预览 -->
            <div class="paperdoll-preview-col">
              <div class="pd-avatar-box">
                <canvas id="pd-preview-canvas" class="pd-avatar-canvas" width="128" height="128"></canvas>
              </div>
              <div id="pd-unit-name" class="pd-unit-name">艾什</div>
              <div id="pd-unit-sub" class="pd-unit-sub">学者 · 智慧宫抄写员</div>
              <div id="pd-unit-langs" class="pd-unit-langs"></div>
            </div>
            <!-- 右侧：分类定制控制面板 -->
            <div class="paperdoll-controls-col" id="pd-controls-col">
            </div>
          </div>
          <div class="paperdoll-modal-footer">
            <div class="pd-footer-left">
              <button class="pd-btn-action pd-btn-secondary" id="btn-pd-random">🎲 随机全套外貌</button>
              <button class="pd-btn-action pd-btn-secondary" id="btn-pd-reset">✨ 恢复原典立绘</button>
            </div>
            <div class="pd-footer-right">
              <button class="pd-btn-action pd-btn-primary" id="btn-pd-confirm">💾 确认并关闭</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      $('btn-close-paperdoll').onclick = () => this.closePaperDollModal();
      $('btn-pd-confirm').onclick = () => this.closePaperDollModal();
      modal.onclick = (e) => { if (e.target === modal) this.closePaperDollModal(); };
      $('btn-pd-random').onclick = () => {
        if (!this.editingUnit) return;
        this.editingUnit.rerollAppearance();
        this.hud.dirty = true;
        this.renderPaperDollModal();
        if (window.SFX && SFX.playTone) SFX.playTone(520, 'sine', 0.12, 0.05);
      };
      $('btn-pd-reset').onclick = () => {
        if (!this.editingUnit) return;
        const u = this.editingUnit;
        const def = (LANG.MEMBERS && LANG.MEMBERS[u.id]) || (LANG.ARCHETYPES && LANG.ARCHETYPES[u.role]);
        if (def && def.pal) {
          u.setAppearance(def.pal);
        } else {
          u.rerollAppearance();
        }
        this.hud.dirty = true;
        this.renderPaperDollModal();
        if (window.SFX && SFX.playConfirm) SFX.playConfirm();
      };
      return modal;
    }

    openPaperDollModal(unit) {
      if (!unit) return;
      this.editingUnit = unit;
      const modal = this.ensurePaperDollModal();
      modal.classList.add('active');
      this.renderPaperDollModal();
      if (window.SFX && SFX.playParchment) SFX.playParchment();
    }

    closePaperDollModal() {
      const modal = $('paperdoll-modal');
      if (modal) modal.classList.remove('active');
      this.editingUnit = null;
      if (window.SFX && SFX.playUIClick) SFX.playUIClick();
    }

    renderPaperDollModal() {
      const u = this.editingUnit;
      if (!u) return;

      $('pd-unit-name').textContent = u.name;
      $('pd-unit-sub').textContent = `${u.role || '探险队员'} · ${u.roleDesc || '巴别通天队'}`;
      const langWrap = $('pd-unit-langs');
      langWrap.innerHTML = '';
      (u.langs || []).forEach(l => {
        const span = document.createElement('span');
        span.textContent = l;
        span.style.color = (LANG.LANGS[l] && LANG.LANGS[l].color) || '#ffd24a';
        langWrap.appendChild(span);
      });

      this.drawPaperDollPreview(u);
      this.renderPaperDollControls(u);
    }

    drawPaperDollPreview(u) {
      const cv = $('pd-preview-canvas');
      if (!cv) return;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, 128, 128);
      ctx.imageSmoothingEnabled = false;

      // 阴影基座
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(64, 116, 32, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 在 16x24 离屏画布上绘制纸娃娃，然后 5x 放大至 80x120 居中
      const off = document.createElement('canvas');
      off.width = 16; off.height = 24;
      const offCtx = off.getContext('2d');
      if (PX.drawChar) PX.drawChar(offCtx, u.pal, 'stand', 0, false);
      else if (PX.drawBody) PX.drawBody(offCtx, u.pal, 'stand', 0, false);

      ctx.drawImage(off, 24, 2, 80, 120);
    }

    renderPaperDollControls(u) {
      const col = $('pd-controls-col');
      if (!col) return;
      col.innerHTML = '';

      const makeSection = (title, icon) => {
        const sec = document.createElement('div');
        sec.className = 'pd-section';
        const t = document.createElement('div');
        t.className = 'pd-section-title';
        t.innerHTML = `<span>${icon} ${title}</span>`;
        sec.appendChild(t);
        return sec;
      };

      // 1. 肤色 (16 种古代两河历史肤色)
      const secSkin = makeSection('肤色 (Historical Mesopotamian Skin Tones)', '🎨');
      const rowSkin = document.createElement('div');
      rowSkin.className = 'pd-swatch-row';
      (LANG.SKINS || []).forEach(s => {
        const sw = document.createElement('div');
        sw.className = 'pd-swatch' + (u.pal.skin === s.hex ? ' active' : '');
        sw.style.backgroundColor = s.hex;
        sw.title = `${s.name} (${s.id})`;
        sw.onclick = () => {
          u.pal.skin = s.hex;
          u.palVersion = (u.palVersion || 0) + 1;
          u.dirty = true; u.drawKey = '';
          this.hud.dirty = true;
          this.drawPaperDollPreview(u);
          rowSkin.querySelectorAll('.pd-swatch').forEach(x => x.classList.remove('active'));
          sw.classList.add('active');
          if (window.SFX && SFX.playUIClick) SFX.playUIClick();
        };
        rowSkin.appendChild(sw);
      });
      secSkin.appendChild(rowSkin);
      col.appendChild(secSkin);

      // 2. 头饰与发型 (18 款)
      const secHat = makeSection('头饰与发型 (Headwear & Hairstyles)', '👑');
      const rowHat = document.createElement('div');
      rowHat.className = 'pd-pill-row';
      (LANG.HATS || []).forEach(h => {
        const pill = document.createElement('div');
        const active = (u.pal.hat || 'none') === h.id;
        pill.className = 'pd-pill' + (active ? ' active' : '');
        pill.textContent = h.name;
        pill.title = h.id;
        pill.onclick = () => {
          u.pal.hat = h.id;
          u.palVersion = (u.palVersion || 0) + 1;
          u.dirty = true; u.drawKey = '';
          this.hud.dirty = true;
          this.drawPaperDollPreview(u);
          rowHat.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
          pill.classList.add('active');
          if (window.SFX && SFX.playUIClick) SFX.playUIClick();
        };
        rowHat.appendChild(pill);
      });
      secHat.appendChild(rowHat);
      col.appendChild(secHat);

      // 3. 发色 (14 种自然发色)
      const secHair = makeSection('发色 (Hair Color Tones)', '💇');
      const rowHair = document.createElement('div');
      rowHair.className = 'pd-swatch-row';
      (LANG.HAIRS || []).forEach(h => {
        const sw = document.createElement('div');
        sw.className = 'pd-swatch' + (u.pal.hairColor === h.hex ? ' active' : '');
        sw.style.backgroundColor = h.hex;
        sw.title = `${h.name} (${h.id})`;
        sw.onclick = () => {
          u.pal.hairColor = h.hex;
          u.palVersion = (u.palVersion || 0) + 1;
          u.dirty = true; u.drawKey = '';
          this.hud.dirty = true;
          this.drawPaperDollPreview(u);
          rowHair.querySelectorAll('.pd-swatch').forEach(x => x.classList.remove('active'));
          sw.classList.add('active');
          if (window.SFX && SFX.playUIClick) SFX.playUIClick();
        };
        rowHair.appendChild(sw);
      });
      secHair.appendChild(rowHair);
      col.appendChild(secHair);

      // 4. 五官眼睛风格 (6 种)
      const secEye = makeSection('五官眼神 (Eye Expression & Kohl Liner)', '👁️');
      const rowEye = document.createElement('div');
      rowEye.className = 'pd-pill-row';
      (LANG.EYE_STYLES || []).forEach(e => {
        const pill = document.createElement('div');
        const active = (u.pal.eyeStyle || 'normal') === e.id;
        pill.className = 'pd-pill' + (active ? ' active' : '');
        pill.textContent = e.name;
        pill.title = e.id;
        pill.onclick = () => {
          u.pal.eyeStyle = e.id;
          u.palVersion = (u.palVersion || 0) + 1;
          u.dirty = true; u.drawKey = '';
          this.hud.dirty = true;
          this.drawPaperDollPreview(u);
          rowEye.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
          pill.classList.add('active');
          if (window.SFX && SFX.playUIClick) SFX.playUIClick();
        };
        rowEye.appendChild(pill);
      });
      secEye.appendChild(rowEye);
      col.appendChild(secEye);

      // 5. 眉形 (3 种)
      const secBrow = makeSection('眉形 (Eyebrow Shape)', '〰️');
      const rowBrow = document.createElement('div');
      rowBrow.className = 'pd-pill-row';
      (LANG.BROW_STYLES || []).forEach(b => {
        const pill = document.createElement('div');
        const active = (u.pal.browStyle || 'straight') === b.id;
        pill.className = 'pd-pill' + (active ? ' active' : '');
        pill.textContent = b.name;
        pill.title = b.id;
        pill.onclick = () => {
          u.pal.browStyle = b.id;
          u.palVersion = (u.palVersion || 0) + 1;
          u.dirty = true; u.drawKey = '';
          this.hud.dirty = true;
          this.drawPaperDollPreview(u);
          rowBrow.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
          pill.classList.add('active');
          if (window.SFX && SFX.playUIClick) SFX.playUIClick();
        };
        rowBrow.appendChild(pill);
      });
      secBrow.appendChild(rowBrow);
      col.appendChild(secBrow);

      // 6. 胡须面容 (7 种)
      const secBeard = makeSection('胡须美髯 (Beard & Moustache)', '🧔');
      const rowBeard = document.createElement('div');
      rowBeard.className = 'pd-pill-row';
      (LANG.BEARDS || []).forEach(b => {
        const pill = document.createElement('div');
        const active = (u.pal.beard || 'clean') === b.id;
        pill.className = 'pd-pill' + (active ? ' active' : '');
        pill.textContent = b.name;
        pill.title = b.id;
        pill.onclick = () => {
          u.pal.beard = b.id;
          u.palVersion = (u.palVersion || 0) + 1;
          u.dirty = true; u.drawKey = '';
          this.hud.dirty = true;
          this.drawPaperDollPreview(u);
          rowBeard.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
          pill.classList.add('active');
          if (window.SFX && SFX.playUIClick) SFX.playUIClick();
        };
        rowBeard.appendChild(pill);
      });
      secBeard.appendChild(rowBeard);
      col.appendChild(secBeard);

      // 7. 仪式面纹 (6 种)
      const secMark = makeSection('仪式面纹与祭司印记 (Ritual Facial Markings)', '✨');
      const rowMark = document.createElement('div');
      rowMark.className = 'pd-pill-row';
      (LANG.FACE_MARKS || []).forEach(m => {
        const pill = document.createElement('div');
        const active = (u.pal.faceMark || 'none') === m.id;
        pill.className = 'pd-pill' + (active ? ' active' : '');
        pill.textContent = m.name;
        pill.title = m.id;
        pill.onclick = () => {
          u.pal.faceMark = m.id;
          u.palVersion = (u.palVersion || 0) + 1;
          u.dirty = true; u.drawKey = '';
          this.hud.dirty = true;
          this.drawPaperDollPreview(u);
          rowMark.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
          pill.classList.add('active');
          if (window.SFX && SFX.playUIClick) SFX.playUIClick();
        };
        rowMark.appendChild(pill);
      });
      secMark.appendChild(rowMark);
      col.appendChild(secMark);

      // 8. 服装形制 (5 种两河历史服饰)
      const secOutfit = makeSection('服装形制 (Ancient Outfits & Armor)', '👘');
      const rowOutfit = document.createElement('div');
      rowOutfit.className = 'pd-pill-row';
      (LANG.OUTFIT_TYPES || []).forEach(o => {
        const pill = document.createElement('div');
        const active = (u.pal.outfitType || 'tunic') === o.id;
        pill.className = 'pd-pill' + (active ? ' active' : '');
        pill.textContent = o.name;
        pill.title = o.id;
        pill.onclick = () => {
          u.pal.outfitType = o.id;
          u.palVersion = (u.palVersion || 0) + 1;
          u.dirty = true; u.drawKey = '';
          this.hud.dirty = true;
          this.drawPaperDollPreview(u);
          rowOutfit.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
          pill.classList.add('active');
          if (window.SFX && SFX.playUIClick) SFX.playUIClick();
        };
        rowOutfit.appendChild(pill);
      });
      secOutfit.appendChild(rowOutfit);
      col.appendChild(secOutfit);

      // 9. 鞋履 (3 种)
      const secFoot = makeSection('鞋履 (Footwear)', '👞');
      const rowFoot = document.createElement('div');
      rowFoot.className = 'pd-pill-row';
      (LANG.FOOTWEARS || []).forEach(f => {
        const pill = document.createElement('div');
        const active = (u.pal.footwear || 'sandals') === f.id;
        pill.className = 'pd-pill' + (active ? ' active' : '');
        pill.textContent = f.name;
        pill.title = f.id;
        pill.onclick = () => {
          u.pal.footwear = f.id;
          u.palVersion = (u.palVersion || 0) + 1;
          u.dirty = true; u.drawKey = '';
          this.hud.dirty = true;
          this.drawPaperDollPreview(u);
          rowFoot.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
          pill.classList.add('active');
          if (window.SFX && SFX.playUIClick) SFX.playUIClick();
        };
        rowFoot.appendChild(pill);
      });
      secFoot.appendChild(rowFoot);
      col.appendChild(secFoot);
    }

    // ───────── 行脚集市 · 以物易物商贸系统 ─────────
    openTradeModal(merchant) {
      if (!merchant) merchant = this.units.find(u => u.isMerchant) || { name: '纳布·辛', role: '行脚商人', langs: ['⚖️', '☼'] };
      if (this.tradeModalEl) this.closeTradeModal();

      const el = document.createElement('div');
      el.id = 'trade-modal';
      el.className = 'pixel-trade-modal';
      el.innerHTML = `
        <div class="trade-box">
          <div class="trade-header">
            <span class="trade-title">⚖️ 行商集市 · 以物易物货栈</span>
            <button class="trade-close" id="trade-btn-close">✕</button>
          </div>
          <div class="trade-merchant-info">
            <div class="merchant-name">【${merchant.name}】 ${merchant.role}</div>
            <div class="merchant-speech">“愿沙马什庇佑你的队伍！长途跋涉口粮告急？还是修桥缺木石？商队支持以物易物，等价交换！”</div>
          </div>
          <div class="trade-list">
            <div class="trade-item" data-deal="wood_for_bread">
              <div class="trade-desc">🪵 1 根木材 ➔ 🥖 2 份口粮麦饼</div>
              <button class="trade-action-btn" id="deal-wood-bread">兑换口粮</button>
            </div>
            <div class="trade-item" data-deal="stone_for_meat">
              <div class="trade-desc">🪨 1 块石料 ➔ 🥩 2 份熏羊肉干</div>
              <button class="trade-action-btn" id="deal-stone-meat">兑换肉干</button>
            </div>
            <div class="trade-item" data-deal="dates_for_water">
              <div class="trade-desc">🌴 1 串椰枣 ➔ 💧 2 袋清澈甘泉</div>
              <button class="trade-action-btn" id="deal-dates-water">兑换甘泉</button>
            </div>
            <div class="trade-item" data-deal="food_for_wood">
              <div class="trade-desc">🥖 2 份口粮 ➔ 🪵 1 根急造木材</div>
              <button class="trade-action-btn" id="deal-food-wood">急换工料</button>
            </div>
          </div>
          <div class="trade-footer">
            <span class="trade-status-text">当前队伍备粮: ${Math.round(this.food)}%</span>
            <span class="trade-tip">按 ESC 或点击 ✕ 关闭</span>
          </div>
        </div>
      `;
      document.body.appendChild(el);
      this.tradeModalEl = el;

      $('trade-btn-close').onclick = () => this.closeTradeModal();
      $('deal-wood-bread').onclick = () => this.executeTrade('wood_for_bread', merchant);
      $('deal-stone-meat').onclick = () => this.executeTrade('stone_for_meat', merchant);
      $('deal-dates-water').onclick = () => this.executeTrade('dates_for_water', merchant);
      $('deal-food-wood').onclick = () => this.executeTrade('food_for_wood', merchant);

      SFX.playTone(440, 'sine', 0.15, 0.08, 600);
      if (merchant.say) merchant.say('⚖️ ☼ ka-rem ! 欢迎光临！', 2.0);
    }

    closeTradeModal() {
      if (this.tradeModalEl) {
        this.tradeModalEl.remove();
        this.tradeModalEl = null;
      }
    }

    executeTrade(deal, merchant) {
      const recruited = this.units.filter(u => u.recruited && !u.fainted);
      const mX = merchant ? merchant.x : 13.5;
      const mY = merchant ? merchant.y : 0;

      if (deal === 'wood_for_bread') {
        const u = recruited.find(q => q.stack.includes('wood'));
        if (!u) {
          this.hud.banner('队伍中无人背负木材，无法换取麦饼', 'warn');
          SFX.playTone(160, 'square', 0.15, 0.05);
          return;
        }
        const idx = u.stack.lastIndexOf('wood');
        u.stack.splice(idx, 1);
        u.refreshStack();
        this.food = Math.min(100, this.food + 25);
        this.spawnItem('bread', mX - 0.8, mY + 0.3);
        this.spawnItem('bread', mX + 0.8, mY + 0.3);
        SFX.playMiracle();
        this.hud.banner('【交易成功】消耗 1 根木材，换取 2 份香脆麦饼！饱食度恢复！', 'good');
        if (merchant && merchant.say) merchant.say('⚖️ 麦饼已备妥，一路顺风！', 2.0);
      } else if (deal === 'stone_for_meat') {
        const u = recruited.find(q => q.stack.includes('stone'));
        if (!u) {
          this.hud.banner('队伍中无人背负石料，无法换取羊肉干', 'warn');
          SFX.playTone(160, 'square', 0.15, 0.05);
          return;
        }
        const idx = u.stack.lastIndexOf('stone');
        u.stack.splice(idx, 1);
        u.refreshStack();
        this.food = Math.min(100, this.food + 30);
        this.spawnItem('meat', mX - 0.8, mY + 0.3);
        this.spawnItem('meat', mX + 0.8, mY + 0.3);
        SFX.playMiracle();
        this.hud.banner('【交易成功】消耗 1 块石料，换取 2 份精制熏肉干！', 'good');
        if (merchant && merchant.say) merchant.say('⚖️ 上好的苏美尔熏羊肉！', 2.0);
      } else if (deal === 'dates_for_water') {
        const u = recruited.find(q => q.stack.includes('dates'));
        if (!u) {
          this.hud.banner('队伍中无人背负椰枣，无法换取甘泉水袋', 'warn');
          SFX.playTone(160, 'square', 0.15, 0.05);
          return;
        }
        const idx = u.stack.lastIndexOf('dates');
        u.stack.splice(idx, 1);
        u.refreshStack();
        this.food = Math.min(100, this.food + 20);
        this.spawnItem('water', mX - 0.8, mY + 0.3);
        this.spawnItem('water', mX + 0.8, mY + 0.3);
        SFX.playMiracle();
        this.hud.banner('【交易成功】消耗 1 串椰枣，换得 2 袋清冽甘泉！', 'good');
        if (merchant && merchant.say) merchant.say('⚖️ 清冽的幼发拉底活泉！', 2.0);
      } else if (deal === 'food_for_wood') {
        const foodUsers = recruited.filter(q => q.stack.some(t => t === 'bread' || t === 'meat' || t === 'dates' || t === 'water'));
        let foodFound = 0;
        for (const u of foodUsers) {
          while (foodFound < 2 && u.stack.some(t => t === 'bread' || t === 'meat' || t === 'dates' || t === 'water')) {
            const idx = u.stack.findIndex(t => t === 'bread' || t === 'meat' || t === 'dates' || t === 'water');
            u.stack.splice(idx, 1);
            u.refreshStack();
            foodFound++;
          }
          if (foodFound >= 2) break;
        }
        if (foodFound < 2) {
          if (this.food >= 30) {
            this.food -= 22;
            foodFound = 2;
          }
        }
        if (foodFound < 2) {
          this.hud.banner('全队口粮不足 2 份，无法急换工料原木', 'warn');
          SFX.playTone(160, 'square', 0.15, 0.05);
          return;
        }
        this.spawnItem('wood', mX, mY + 0.3);
        SFX.playPickUp();
        this.hud.banner('【交易成功】消耗口粮，急换 1 根工料原木！已送达商摊脚边！', 'good');
        if (merchant && merchant.say) merchant.say('⚖️ 质地上乘的雪松原木交付！', 2.0);
      }
      if (this.tradeModalEl) {
        const statusEl = this.tradeModalEl.querySelector('.trade-status-text');
        if (statusEl) statusEl.textContent = `当前队伍备粮: ${Math.round(this.food)}%`;
      }
      this.hud.dirty = true;
    }

    selectAll() {
      const av = this.available();
      if (!av.length) return;
      this.selection.clear();
      av.forEach(u => this.selection.add(u));
      SFX.playUIClick();
      this.hud.banner(`🚩 已全选巴别远征队全员（共 ${av.length} 人）`, 'good');
    }

    // E / 数字 5：同一 contextual 键处理上梯、下梯、进门和出门，WASD 不再兼任垂直交互。
    contextualTraversal(sel) {
      const climbing = sel.filter(u => u.state === 'climb');
      if (climbing.length) {
        climbing.forEach(u => {
          const lad = (this.ladders || []).find(l => Math.abs(l.x - u.x) < 0.5 && u.y >= l.y0 - 0.6 && u.y <= l.y1 + 0.6);
          if (lad) u.climbTo = Math.abs(u.climbTo - lad.y1) < 0.1 ? lad.y0 : lad.y1;
        });
        return true;
      }
      const u = sel[0];
      if (!u) return false;
      if (u.inInterior) {
        if (this.openWorld && this.openWorld.active && this.openWorld.interactDoor(sel)) return true;
        return this.checkDoorwayInteraction('out');
      }
      const lad = (this.ladders || []).filter(l => !l.trigger || this.isActive(l.trigger)).find(l =>
        Math.abs(l.x - u.x) < 1.15 && u.y >= l.y0 - 0.55 && u.y <= l.y1 + 0.55 &&
        (!this.openWorld || !this.openWorld.active || u.y > 1.25 || Math.abs(u.targetZ || 0) < 1.85)
      );
      if (lad) {
        u.order = null; u.path = null; u.openPath = null;
        u.x = lad.x;
        if (u.y <= 1.25) { u.targetZ = 0; u.z = 0; }
        u.vx = 0; u.vy = 0; u.grounded = null;
        u.climbTo = Math.abs(u.y - lad.y0) <= Math.abs(u.y - lad.y1) ? lad.y1 : lad.y0;
        u.state = 'climb';
        u.say((u.climbTo > u.y ? '↑ ' : '↓ ') + u.langs[0], 1.2);
        return true;
      }
      if (this.openWorld && this.openWorld.active && this.openWorld.interactDoor(sel)) return true;
      return this.checkDoorwayInteraction('in', true);
    }

    interact() {
      // E 键全场景智能交互：急救队友 ➔ 商人交易 ➔ 门洞/爬梯 ➔ 升降机 ➔ 机关/石碑/拾取 ➔ 情境协力
      const sel = (this.selection.size ? [...this.selection] : this.available()).filter(u => !u.fainted);
      if (!sel.length) return;

      // 1. 若有昏迷队友在附近，优先执行急救
      const faintedUnit = this.units.find(u => u.recruited && u.fainted);
      if (faintedUnit && sel.some(u => Math.hypot(u.x - faintedUnit.x, u.y - faintedUnit.y) < 3.6)) {
        this.firstAidOrRevive();
        return;
      }

      // 2. 若靠近行脚商人，直接打开集市交易
      const merchant = this.units.find(u => u.isMerchant);
      if (merchant && sel.some(u => Math.hypot(u.x - merchant.x, u.y - merchant.y) < 3.8 && Math.abs((u.targetZ || 0) - (merchant.z || 0)) < 2.6)) {
        this.openTradeModal(merchant);
        return;
      }

      // 3. 上下梯 / 进出房门
      if (this.contextualTraversal(sel)) return;

      // 4. 升降台拉绳互动：选中的队员在台上或靠近升降台
      const riderOnLift = sel.find(u => (u.grounded && u.grounded.key && u.grounded.key.startsWith('L')) || this.lifts.some(l => u.x >= l.x1 - 0.25 && u.x <= l.x2 + 0.25 && Math.abs(u.y - l.y) < 0.35));
      if (riderOnLift) {
        const lf = this.lifts.find(l => 'L' + l.id === riderOnLift.grounded?.key || (riderOnLift.x >= l.x1 - 0.25 && riderOnLift.x <= l.x2 + 0.25 && Math.abs(riderOnLift.y - l.y) < 0.35));
        if (lf) { this.operateLift(lf, riderOnLift); return; }
      }
      const nearLift = this.lifts.find(lf => sel.some(u => Math.abs(u.x - (lf.x1 + lf.x2) / 2) < 2.5 && Math.abs(u.y - lf.y) < 1.5 && Math.abs(u.targetZ || 0) < 2.4));
      if (nearLift) {
        const caller = sel.find(u => Math.abs(u.x - (nearLift.x1 + nearLift.x2) / 2) < 2.5);
        this.operateLift(nearLift, caller);
        return;
      }

      // 5. 派遣前往最近的石碑、拉杆、修筑点或散落物资（计入 Z 轴距离防跨街误判）
      let dispatched = false;
      sel.forEach(u => {
        const uz = (this.openWorld && this.openWorld.active && u.y <= 1.25) ? (u.targetZ || 0) : 0;
        const cands = [];
        this.steles.forEach(s => { if (!s.active) cands.push({ d: Math.hypot(s.x - u.x, uz) + Math.abs(s.y - u.y) * 2, o: { type: 'stele', stele: s, goal: { x: s.x, y: s.y, z: 0 }, act: 'operate' } }); });
        this.levers.forEach(l => { if (!l.active) cands.push({ d: Math.hypot(l.x - u.x, uz) + Math.abs(l.y - u.y) * 2, o: { type: 'lever', lever: l, goal: { x: l.x - 0.5, y: l.y, z: 0 }, act: 'operate' } }); });
        if (u.stack.includes('wood')) this.builds.forEach(b => { if (!b.done) { const side = u.x < (b.x1 + b.x2) / 2 ? b.x1 - 0.45 : b.x2 + 0.45; cands.push({ d: Math.hypot(side - u.x, uz) + Math.abs(b.y - u.y) * 2, o: { type: 'build', build: b, goal: { x: side, y: b.y, z: 0 }, act: 'build' } }); } });
        if (u.stack.length < ENT.MAX_STACK) this.items.forEach(it => cands.push({ d: Math.hypot(it.x - u.x, uz - (it.z || 0)) + Math.abs(it.y - u.y) * 2, o: { type: 'pick', item: it, goal: { x: it.x, y: it.y, z: it.z || 0 }, goalFn: () => it.alive ? { x: it.x, y: it.y, z: it.z || 0 } : null, act: 'pick' } }));
        cands.sort((a, b) => a.d - b.d);
        if (cands[0] && cands[0].d < 14) {
          this.deliver(u, cands[0].o);
          dispatched = true;
        }
      });
      if (dispatched) {
        this.hud.banner('【智能互动】队员正在前往最近的机关、石碑或物资', 'info');
        return;
      }
      if (this.coopAction) {
        this.triggerCoopAction();
        return;
      }
      sel[0].say(sel[0].langs[0] + ' ?', 1.4);
      this.hud.banner('附近没有可进出的门洞、梯子或机关', 'info');
    }

    // ── 建筑室内外 Z 轴纵深进出切换 ──
    checkDoorwayInteraction(dir = 'in', quiet = false) {
      const sel = (this.selection.size ? [...this.selection] : this.available()).filter(u => !u.fainted);
      if (!sel.length) return false;
      const leader = sel[0];
      const doorways = this.level.doorways || [];
      const door = doorways.find(d => Math.abs(d.x - leader.x) < 2.5 && Math.abs(d.y - leader.y) < 1.4);
      if (!door) {
        if (dir === 'in' && !quiet) this.hud.banner('附近没有可进入的建筑门洞（走到门前按 E / 5）', 'info');
        return false;
      }

      if (dir === 'in') {
        sel.forEach(u => {
          u.targetZ = -4.5;
          u.inInterior = true;
          u.say('🚪 ' + u.langs[0] + ' in~', 1.8);
        });
        this.camOffsetZ = 13;
        this.hud.banner(`进入了【${door.name}】（室内避风，按 E / 5 走出室外）`, 'story');
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
      const sel = this.selection.size ? [...this.selection] : this.available();
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
        SFX.playStep('stone');
        builder.say('🪨 ' + builder.langs[0] + ' ok! (石阶摆放)', 2.0);
        this.hud.banner('【垫石铺路成功】消耗 1 块石砖，放置了攀爬垫步台阶！', 'good');
      }
    }

    smartCoopOrBuild() {
      if (this.coopAction) {
        this.triggerCoopAction();
        return;
      }
      const sel = (this.selection.size ? [...this.selection] : this.available()).filter(u => !u.fainted);
      const hasMat = sel.some(u => u.stack.includes('wood') || u.stack.includes('stone')) ||
                     this.units.some(u => u.recruited && !u.fainted && (u.stack.includes('wood') || u.stack.includes('stone')));
      if (hasMat) {
        this.buildBridgeOrRamp();
      } else {
        this.coopBoostUp();
      }
    }

    // ── 急救与脱力复苏 ──
    firstAidOrRevive() {
      const faintedUnit = this.units.find(u => u.recruited && u.fainted);
      if (!faintedUnit) {
        this.hud.banner('当前队伍无人处于饥饿昏迷状态', 'info');
        return;
      }
      const rescuer = (this.selection.size ? [...this.selection] : this.available()).find(u => !u.fainted && Math.abs(u.x - faintedUnit.x) < 3.2) || this.units.find(u => u.recruited && !u.fainted);
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
      const sel = (this.selection.size ? [...this.selection] : this.available()).filter(u => u.stack.includes('wood'));
      const b = this.builds.filter(q => !q.done).sort((a, c) => Math.abs(a.x1 - this.cam.x) - Math.abs(c.x1 - this.cam.x))[0];
      if (!b) { this.hud.banner('这一层没有需要修筑的地方', 'info'); return; }
      if (!sel.length) { this.hud.banner('队伍中没有背负木材的队员', 'warn'); return; }
      sel.forEach(u => { const side = u.x < (b.x1 + b.x2) / 2 ? b.x1 - 0.75 : b.x2 + 0.75; this.deliver(u, { type: 'build', build: b, goal: { x: side, y: b.y }, act: 'build' }); });
    }

    // ═══════════════════ 输入 ═══════════════════
    screenToWorld(sx, sy) {
      const ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
      const v = new THREE.Vector3(ndc.x, ndc.y, 0.5);
      v.unproject(this.camera);
      const dir = v.sub(this.camera.position).normalize();
      // 先计算视线与主活动面 z = 0 的交点，防止斜俯视下点击多层平台时射线越过平台穿到后方地面（z < -2）导致 wy 变成 0
      let z0Hit = null;
      if (Math.abs(dir.z) > 0.01) {
        const t0 = -this.camera.position.z / dir.z;
        if (t0 > 0) {
          const x0 = this.camera.position.x + dir.x * t0;
          const y0 = this.camera.position.y + dir.y * t0;
          if (y0 >= 0.35 && this.supports && this.supports.length) {
            let bestS = null, bestDy = 0.85;
            for (let i = 0; i < this.supports.length; i++) {
              const s = this.supports[i];
              if (s.y < 0.45) continue;
              if (x0 >= s.x1 - 0.45 && x0 <= s.x2 + 0.45) {
                const dy = Math.abs(y0 - s.y);
                if (dy < bestDy) { bestDy = dy; bestS = s; }
              }
            }
            if (bestS) {
              z0Hit = { x: Math.max(bestS.x1 + 0.25, Math.min(bestS.x2 - 0.25, x0)), y: bestS.y, z: bestS.z || 0 };
            }
          }
        }
      }

      if (this.mouseRaycaster && this.world && this.world.root) {
        this.mouseRaycaster.setFromCamera(ndc, this.camera);
        const hits = this.mouseRaycaster.intersectObjects(this.world.root.children, true);
        for (let i = 0; i < hits.length; i++) {
          const hit = hits[i];
          const obj = hit.object;
          if (!obj || !obj.visible || !obj.isMesh || obj.isSprite) continue;
          const ud = obj.userData || {};
          if (ud.occlusionProxy || ud.noOcclusion || ud.isPlant) continue;
          // 若命中多层平台或屋顶，直接采用其精确平台顶面高程
          if (ud.isPlatform || ud.isRoof || ud.isBridge) {
            const py = ud.platY !== undefined ? ud.platY : hit.point.y;
            return { x: hit.point.x, y: py, z: 0 };
          }
          // 若射线穿过了前景多层平台落到后方街区地面（z < -1.8 且 y < 0.3），优先返回前景多层平台交点
          if ((ud.isWalkway || ud.isGround) && z0Hit && hit.point.y < 0.35 && hit.point.z < -1.6) {
            return z0Hit;
          }
          if (ud.isWalkway || ud.isGround) {
            return { x: hit.point.x, y: hit.point.y, z: hit.point.z };
          }
          // 忽略建筑外立面、塔壳或垂直墙面，仅接受法线朝上的可站立表面
          if (ud.isFrontOccluder || ud.isTowerShell) continue;
          if (hit.face && hit.face.normal && hit.face.normal.y > 0.55 && hit.point.y >= -5.2) {
            if (z0Hit && hit.point.y < 0.35 && hit.point.z < -1.6) return z0Hit;
            return { x: hit.point.x, y: hit.point.y, z: hit.point.z };
          }
        }
      }
      if (z0Hit) return z0Hit;
      if (this.openWorld && this.openWorld.active && this.cam.y < 12 && Math.abs(dir.y) > 0.02) {
        const ty = -this.camera.position.y / dir.y;
        if (ty > 0) {
          return { x: this.camera.position.x + dir.x * ty, y: 0, z: this.camera.position.z + dir.z * ty };
        }
      }
      const t = -this.camera.position.z / (dir.z || -1);
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

    unitAtScreen(sx, sy, customRadius = 48) {
      let best = null, bd = customRadius;
      this.units.forEach(u => { const p = this.project(u.x, u.y + 0.85, u.z || 0); const d = Math.hypot(p.x - sx, (p.y - sy) * 0.7); if (d < bd) { bd = d; best = u; } });
      return best;
    }

    bindInput() {
      const cvs = this.container;
      const boxEl = $('selection-box-overlay');
      let drag = null;
      cvs.addEventListener('contextmenu', e => e.preventDefault());

      // 原生双击画布快捷任命领队 (Double-click 3D character to become squad leader)
      cvs.addEventListener('dblclick', (e) => {
        if (this.state !== 'play' || this.cut) return;
        if (e.button !== 0) return;
        const u = this.unitAtScreen(e.clientX, e.clientY, 54);
        if (u && u.recruited && !u.fainted) {
          e.preventDefault();
          e.stopPropagation();
          this.setLeader(u);
        }
      });

      cvs.addEventListener('mousedown', (e) => {
        SFX.init();
        if (this.cut) {
          drag = { b: e.button, x: e.clientX, y: e.clientY, moved: false, cx: this.camT.x, cy: this.camT.y, yaw: this.camYawT || 0, pitch: this.camPitchT || 0, inCut: true };
          return;
        }
        if (this.state !== 'play') return;
        drag = { b: e.button, x: e.clientX, y: e.clientY, moved: false, cx: this.camT.x, cy: this.camT.y, yaw: this.camYawT || 0, pitch: this.camPitchT || 0, inCut: false };
      });
      window.addEventListener('mousemove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.hypot(dx, dy) > (drag.inCut ? 6 : 14)) drag.moved = true;
        if (drag.inCut) {
          if (drag.moved) {
            this.cutCamDragging = true;
            if (drag.b === 2 || e.shiftKey) {
              const s = this.cam.dist / window.innerHeight * 0.54;
              this.camT.x = drag.cx - dx * s;
              this.camT.y = drag.cy + dy * s;
              this.follow = false;
            } else {
              this.camYawT = Math.max(-1.25, Math.min(1.25, drag.yaw - dx * 0.0065));
              this.camPitchT = Math.max(-0.38, Math.min(0.85, drag.pitch + dy * 0.0055));
            }
          }
          return;
        }
        if (drag.b === 0 && drag.moved && !e.altKey) {
          boxEl.style.display = 'block';
          boxEl.style.left = Math.min(e.clientX, drag.x) + 'px'; boxEl.style.top = Math.min(e.clientY, drag.y) + 'px';
          boxEl.style.width = Math.abs(dx) + 'px'; boxEl.style.height = Math.abs(dy) + 'px';
        } else if (drag.moved && (drag.b === 1 || e.altKey)) {
          this.camYawT = Math.max(-1.25, Math.min(1.25, drag.yaw - dx * 0.0065));
          this.camPitchT = Math.max(-0.38, Math.min(0.85, drag.pitch + dy * 0.0055));
        } else if (drag.b !== 0 && drag.moved) {
          const s = this.cam.dist / window.innerHeight * 0.54;
          this.camT.x = drag.cx - dx * s; this.camT.y = drag.cy + dy * s; this.follow = false;
        }
      });
      window.addEventListener('mouseup', (e) => {
        if (!drag) return;
        const d = drag; drag = null; boxEl.style.display = 'none';
        this.cutCamDragging = false;
        if (d.inCut || this.cut) {
          if (!d.moved && d.b === 0) this.advanceCut();
          return;
        }
        if (this.state !== 'play') return;
        if (d.b === 0 && d.moved) {
          const x1 = Math.min(e.clientX, d.x), x2 = Math.max(e.clientX, d.x), y1 = Math.min(e.clientY, d.y), y2 = Math.max(e.clientY, d.y);
          const picked = this.available().filter(u => { const p = this.project(u.x, u.y + 0.8, u.z || 0); return p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2; });
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
          if (u.isMerchant) {
            this.openTradeModal(u);
            return;
          }
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
            const isDbl = this.lastUnitClick &&
              (this.lastUnitClick.unit === u || this.selection.has(u)) &&
              (now - this.lastUnitClick.time) < 480;

            if (isDbl) {
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
      cvs.addEventListener('wheel', (e) => { 
        const nextDist = Math.max(14, Math.min(56, (this.userZoomDist || this.camT.dist) * (e.deltaY > 0 ? 1.12 : 0.88)));
        this.userZoomDist = nextDist;
        this.camT.dist = nextDist;
        e.preventDefault(); 
      }, { passive: false });
      window.addEventListener('keydown', (e) => {
        this.keys[e.key.toLowerCase()] = true;
        // 快速选关快捷键：Alt + 1~5 或 F1~F5
        const num = (e.key >= '1' && e.key <= '5' && e.altKey) ? parseInt(e.key, 10) : (e.key.startsWith('F') && parseInt(e.key.slice(1), 10) >= 1 && parseInt(e.key.slice(1), 10) <= 5 ? parseInt(e.key.slice(1), 10) : null);
        if (num) {
          e.preventDefault();
          this.startGame(num - 1);
          return;
        }
        // 音乐控制（全局随时静音/切歌换口味）
        if (e.key.toLowerCase() === 'm') {
          const on = SFX.toggleBGM();
          this.hud.banner(on ? '♫ 开启《卵石论战》古典鲁特琴/竖琴背景音乐' : '🔇 静音背景音乐', 'info');
          return;
        }
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          const trk = SFX.nextTrack(true);
          if (trk) this.hud.banner(`🎵 正在播放：[${trk.chapter}] 《${trk.title}》 (${trk.bpm} BPM)`, 'info');
          return;
        }
        if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          const trk = SFX.prevTrack(true);
          if (trk) this.hud.banner(`🎵 正在播放：[${trk.chapter}] 《${trk.title}》 (${trk.bpm} BPM)`, 'info');
          return;
        }
        if (this.cut && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) { this.advanceCut(); e.preventDefault(); return; }
        if (this.cut && e.key.toLowerCase() === 'r') { this.camYawT = 0; this.camPitchT = 0; e.preventDefault(); return; }
        if (this.state !== 'play' || this.cut) return;
        if (e.key === ' ') { e.preventDefault(); this.follow = true; this.directJump(); return; }
        if (e.key.toLowerCase() === 'g') { e.preventDefault(); this.toggleAutoPickup(); return; }
        if (e.key.toLowerCase() === 'x') { e.preventDefault(); this.toggleAutoScavenge(); return; }
        if (e.key.toLowerCase() === 'z') { e.preventDefault(); this.toggleAutoRecruit(); return; }
        if (e.key.toLowerCase() === 'e') {
          const merchant = this.units.find(u => u.isMerchant);
          if (merchant) {
            const near = this.available().some(u => Math.hypot(u.x - merchant.x, u.y - merchant.y) < 3.8);
            if (near) {
              e.preventDefault();
              this.openTradeModal(merchant);
              return;
            }
          }
        }
        if (e.key.toLowerCase() === 'v') {
          e.preventDefault();
          this.viewMode = ((this.viewMode || 0) + 1) % 3;
          const views = [24, 15, 38], names = ['斜俯视探索', '近景沉浸', '高位战术'];
          this.userZoomDist = views[this.viewMode]; this.camT.dist = this.userZoomDist; this.follow = true;
          this.camYawT = 0; this.camPitchT = 0;
          this.hud.banner(`🎥 视野：${names[this.viewMode]} · 遮挡墙体局部半透`, 'info');
          return;
        }
        if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          this.follow = true;
          this.camYawT = 0; this.camPitchT = 0;
          const target = (this.leader && this.leader.recruited && !this.leader.fainted) ? this.leader : (this.selection.size === 1 ? [...this.selection][0] : null) || this.available()[0];
          if (target) {
            this.camT.x = target.x;
            this.camT.y = target.y + 1.2;
            this.hud.banner(`🎥 镜头已重新聚焦跟随【${target.name}】`, 'info');
          }
          return;
        }
        if (e.key === 'Tab') { e.preventDefault(); this.cycle(); return; }
        if (e.key === 'Escape') {
          const pdm = $('paperdoll-modal');
          if (pdm && pdm.classList.contains('active')) { this.closePaperDollModal(); return; }
          if (this.tradeModalEl) { this.closeTradeModal(); return; }
          this.selection.clear();
          return;
        }

        const n = {
          '2': 'rally',
          '3': 'build',
          'b': 'build',
          '4': 'revive',
          '5': 'interact',
          '6': 'link',
          '7': 'drop',
          '8': 'signal',
          't': 'signal',
          '9': 'hold',
          'h': 'hold',
          'e': 'interact',
          'q': 'drop',
          'g': 'pickup',
          'x': 'gather',
          'z': 'recruit',
          'f': 'boost'
        }[e.key.toLowerCase()];
        if (n && e.key.toLowerCase() !== 'f') this.runCmd(n);
        if (e.key.toLowerCase() === 'r') {
          if (this.rArmed && performance.now() - this.rArmed < 2500) { this.rArmed = 0; this.fade(() => this.loadLevel(this.levelIdx)); }
          else { this.rArmed = performance.now(); this.hud.banner('再按一次 R：重新开始本层', 'warn'); }
        }
        if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          this.runCmd('boost');
        }
      });
      window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
      const triggerCmdBtn = (b, e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        SFX.playUIClick();
        if (this.state === 'play' && !this.cut) {
          if (b.id === 'cmd-cycle-btn') this.cycle();
          else if (b.dataset.cmd) this.runCmd(b.dataset.cmd);
        }
      };
      document.querySelectorAll('#command-bar .cmd').forEach(b => {
        b.addEventListener('pointerdown', (e) => triggerCmdBtn(b, e));
        b.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });
      $('btn-restart').onclick = () => { $('ending').classList.remove('on'); location.reload(); };
      const bgmBtn = $('btn-bgm-toggle');
      if (bgmBtn) {
        bgmBtn.onclick = (e) => {
          e.stopPropagation();
          const on = SFX.toggleBGM();
          bgmBtn.classList.toggle('off', !on);
          this.hud.banner(on ? '♫ 开启《卵石论战》古典鲁特琴/竖琴背景音乐 (按 N/P 换歌)' : '🔇 静音背景音乐', 'info');
        };
      }
      SFX.onTrackChange = (track, opts) => {
        if (!opts || opts.manual !== true) {
          if (this.hud && this.hud.banner) {
            this.hud.banner(`🎵 正在播放：[${track.chapter}] 《${track.title}》 (${track.bpm} BPM)`, 'info');
          }
        }
      };
      const cutDialog = $('cut-dialog');
      if (cutDialog) {
        cutDialog.addEventListener('click', (e) => { e.stopPropagation(); this.advanceCut(); });
      }

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
      if (n === 'drop') {
        const dropUnits = (this.selection.size ? [...this.selection] : [(this.leader || this.available()[0])].filter(Boolean));
        let droppedAny = false;
        dropUnits.forEach(u => {
          if (u.stack.length) {
            u.dropTop();
            u.say(u.langs[0] + ' ' + LANG.ACT.drop, 1.2);
            droppedAny = true;
          }
        });
        if (droppedAny) {
          this.hud.banner('📦 已从队员身上卸下物资，减重以恢复全速移动', 'info');
        } else {
          this.hud.banner('选中的队员或领队背包为空，无物资可卸下', 'info');
        }
      }
      if (n === 'hold') {
        const holdUnits = (this.selection.size ? [...this.selection] : [(this.leader || this.available()[0])].filter(Boolean));
        if (holdUnits.length) {
          holdUnits.forEach(u => this.toggleDetach(u));
        } else {
          this.hud.banner('没有可指定留驻的队员', 'warn');
        }
      }
      if (n === 'signal') this.teachSignal();
      if (n === 'boost' || n === 'coop') this.smartCoopOrBuild();
      if (n === 'pickup') this.toggleAutoPickup();
      if (n === 'gather') this.toggleAutoScavenge();
      if (n === 'recruit') this.toggleAutoRecruit();
      if (n === 'select_all') this.selectAll();
    }

    cycle() {
      const av = this.available(); if (!av.length) return;
      const cur = this.leader || (this.selection.size === 1 ? [...this.selection][0] : null);
      const i = cur ? (av.indexOf(cur) + 1) % av.length : 0;
      this.setLeader(av[i]);
    }

    // 单个实例的局部透视代理：不修改共享批次材质，也不让整座城市一起透明。
    ensureInstanceOccluder(mesh, instanceId) {
      if (!this._instanceOccluders) this._instanceOccluders = new Map();
      const key = mesh.uuid + ':' + instanceId;
      if (this._instanceOccluders.has(key)) return this._instanceOccluders.get(key);
      const original = new THREE.Matrix4(); mesh.getMatrixAt(instanceId, original);
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(m => m.clone());
      const proxy = new THREE.Mesh(mesh.geometry, Array.isArray(mesh.material) ? mats : mats[0]);
      const local = new THREE.Matrix4().copy(mesh.matrixWorld).multiply(original);
      if (this.world.root.matrixWorld) {
        const inv = new THREE.Matrix4().copy(this.world.root.matrixWorld).invert(); local.premultiply(inv);
      }
      proxy.matrix.copy(local); proxy.matrixAutoUpdate = false;
      proxy.userData.occlusionProxy = true;
      proxy.userData.occlusionSource = { mesh, instanceId, original, key };
      proxy.castShadow = false; proxy.receiveShadow = true;
      this.world.root.add(proxy);
      mesh.setMatrixAt(instanceId, new THREE.Matrix4().makeScale(0, 0, 0)); mesh.instanceMatrix.needsUpdate = true;
      this._instanceOccluders.set(key, proxy);
      return proxy;
    }

    releaseInstanceOccluder(proxy) {
      const data = proxy.userData && proxy.userData.occlusionSource;
      if (!data) return;
      data.mesh.setMatrixAt(data.instanceId, data.original); data.mesh.instanceMatrix.needsUpdate = true;
      if (proxy.parent) proxy.parent.remove(proxy);
      const mats = Array.isArray(proxy.material) ? proxy.material : [proxy.material]; mats.forEach(m => m.dispose());
      if (this._instanceOccluders) this._instanceOccluders.delete(data.key);
    }

    // 智能视线半透：相机至小队成员及过场焦点射线检测，动态将遮挡视线的前景墙、柱头、巴别塔外壳淡化至 12~15% 半透
    // 严格锁定：地面、走道、平台、阶梯、桥面绝对不淡化，根除“地板莫名其妙变透明”
    updateCameraOcclusionFading(dt = 0.016) {
      if (!this.world || !this.world.root || !this.units.length || !this.camera) return;
      if (this._occlusionWorldRoot !== this.world.root) {
        this._occlusionWorldRoot = this.world.root;
        this._instanceOccluders = new Map(); this.fadedMeshes.clear(); this._cachedOccluders = new Set();
      }
      const targets = this.units.filter(u => u.recruited && !u.fainted);
      if (this.cut) {
        if (this.cut.line && this.cut.line.who) {
          const cu = this.units.find(q => q.id === this.cut.line.who);
          if (cu && !targets.includes(cu)) targets.push(cu);
        }
        const bani = this.units.find(q => q.id === 'bani' && !q.recruited);
        if (bani && !targets.includes(bani) && Math.hypot(bani.x - this.cam.x, bani.y - this.cam.y) < 12) targets.push(bani);
        targets.push({ x: this.cam.x, y: this.cam.y + 0.5, z: this.cam.z, isCutFocus: true });
      }
      if (!targets.length) return;

      if (!this._occTarget) {
        this._occTarget = new THREE.Vector3();
        this._occDir = new THREE.Vector3();
        this._occMeshPos = new THREE.Vector3();
      }

      this._occFrameCount = (this._occFrameCount || 0) + 1;
      const doRaycast = !!this.cut || (this._occFrameCount % 3 === 0);

      const isWalkwayOrFloor = (obj) => {
        if (!obj || !obj.userData) return false;
        const u = obj.userData;
        return !!(u.isFloor || u.isGround || u.isWalkway || u.isRoad || u.isStep || u.isPlatform || u.isDeck || u.isBridge);
      };

      if (doRaycast) {
        const camPos = this.camera.position;
        const occludersThisFrame = new Set();
        const rayOffsets = this.cut
          ? [[0, 0], [-0.65, 0], [0.65, 0], [0, 0.65], [0, -0.35]]
          : [[0, 0]];

        targets.forEach(u => {
          const uZ = u.z !== undefined ? u.z : (u.targetZ || 0);
          for (let rIdx = 0; rIdx < rayOffsets.length; rIdx++) {
            const off = rayOffsets[rIdx];
            this._occTarget.set(u.x + off[0], u.y + 0.9 + off[1], uZ);
            this._occDir.copy(this._occTarget).sub(camPos);
            const dist = this._occDir.length();
            if (dist < 1.0) continue;
            this._occDir.normalize();

            this.occlusionRaycaster.set(camPos, this._occDir);
            this.occlusionRaycaster.near = 0.8;
            this.occlusionRaycaster.far = Math.max(0.9, dist - 0.3);

            const hits = this.occlusionRaycaster.intersectObjects(this.world.root.children, true);
            for (let i = 0; i < hits.length; i++) {
              const hit = hits[i];
              const obj = hit.object;
              if (!obj || !obj.isMesh || obj.isSprite || (obj.userData && obj.userData.noOcclusion)) continue;
              // 地面与真实走道永不淡化；屋顶和墙体可以局部透视。
              if (isWalkwayOrFloor(obj)) continue;
              if (!this.cut && hit.face && hit.face.normal.y > 0.45 && hit.point.y <= u.y + 0.95) continue;
              if (obj.isInstancedMesh && hit.instanceId !== undefined) {
                occludersThisFrame.add(this.ensureInstanceOccluder(obj, hit.instanceId));
              } else {
                occludersThisFrame.add(obj);
              }
            }
          }

          // 室内与深巷专属透视：若队员位于建筑内部或地面深巷（y < 3.5 且 Z < -1.2），直接将附近建筑的前外墙/前柱头半透
          if (u.inInterior || (u.y < 3.5 && u.z !== undefined && u.z < -1.2)) {
            if (this.world.frontOccluders) {
              this.world.frontOccluders.forEach(o => {
                if (!isWalkwayOrFloor(o)) {
                  o.getWorldPosition(this._occMeshPos);
                  if (Math.abs(this._occMeshPos.x - u.x) < 4.8 && (this._occMeshPos.z > u.z + 0.5)) occludersThisFrame.add(o);
                }
              });
            }
            // 实例民居的室内剖视只展开当前这一栋，其他同材质建筑不受影响。
            if (u.interiorId) {
              if (!this._occInstanceMatrix) { this._occInstanceMatrix = new THREE.Matrix4(); this._occInstancePos = new THREE.Vector3(); }
              this.world.root.children.forEach(o => {
                if (!o.isInstancedMesh || o.userData.interiorId !== u.interiorId || isWalkwayOrFloor(o)) return;
                for (let i = 0; i < o.count; i++) {
                  o.getMatrixAt(i, this._occInstanceMatrix);
                  this._occInstancePos.setFromMatrixPosition(this._occInstanceMatrix).applyMatrix4(o.matrixWorld);
                  if (Math.abs(this._occInstancePos.x - u.x) < 8 && Math.abs(this._occInstancePos.z - uZ) < 9) {
                    occludersThisFrame.add(this.ensureInstanceOccluder(o, i));
                  }
                }
              });
            }
          }
        });

        // 过场演出时，对镜头视线与说话人前方的所有前景遮挡体强制半透
        if (this.cut && this.world && this.world.frontOccluders) {
          this.world.frontOccluders.forEach(o => {
            if (!isWalkwayOrFloor(o)) {
              o.getWorldPosition(this._occMeshPos);
              if (Math.abs(this._occMeshPos.x - this.cam.x) < 7.5 && this._occMeshPos.z > this.cam.z - 0.8) {
                occludersThisFrame.add(o);
              }
            }
          });
        }

        // 开发者透视模式：强制透视全图建筑墙体与遮挡
        if (window.DEV_PARAMS && window.DEV_PARAMS.forceWallAlpha && this.world && this.world.frontOccluders) {
          this.world.frontOccluders.forEach(o => {
            if (!isWalkwayOrFloor(o)) occludersThisFrame.add(o);
          });
        }

        this._cachedOccluders = occludersThisFrame;
      }

      const activeOccluders = this._cachedOccluders || new Set();
      const targetAlpha = this.cut ? 0.10 : 0.15;

      // 平滑渐变至半透
      activeOccluders.forEach(mesh => {
        if (!mesh.material) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(mat => {
          if (mat.userData._origOpacity === undefined) {
            mat.userData._origOpacity = mat.opacity !== undefined ? mat.opacity : 1.0;
            mat.userData._origTransparent = !!mat.transparent;
            mat.userData._origDepthWrite = mat.depthWrite !== undefined ? mat.depthWrite : true;
            mat.transparent = true;
            mat.depthWrite = false;
          }
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetAlpha, Math.min(1, dt * 16));
        });
        this.fadedMeshes.add(mesh);
      });

      // 恢复不再遮挡视线的物体材质
      this.fadedMeshes.forEach(mesh => {
        if (!activeOccluders.has(mesh) && mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          let allRestored = true;
          mats.forEach(mat => {
            if (mat.userData._origOpacity !== undefined) {
              mat.opacity = THREE.MathUtils.lerp(mat.opacity, mat.userData._origOpacity, Math.min(1, dt * 9));
              if (Math.abs(mat.opacity - mat.userData._origOpacity) < 0.04) {
                mat.opacity = mat.userData._origOpacity;
                mat.transparent = mat.userData._origTransparent;
                mat.depthWrite = mat.userData._origDepthWrite;
                delete mat.userData._origOpacity;
                delete mat.userData._origTransparent;
                delete mat.userData._origDepthWrite;
              } else {
                allRestored = false;
              }
            }
          });
          if (allRestored) {
            this.fadedMeshes.delete(mesh);
            if (mesh.userData && mesh.userData.occlusionProxy) this.releaseInstanceOccluder(mesh);
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
        p.setXYZ(0, l.a.x, l.a.y + 1.0, (l.a.z || 0) + 0.35); p.setXYZ(1, l.b.x, l.b.y + 1.0, (l.b.z || 0) + 0.35); p.needsUpdate = true;
        line.computeLineDistances(); line.material.color.set(LANG.LANGS[l.lang].color);
      });
    }

    render(dt) {
      if (!this.level) return;
      // 过场演出时支持键盘 WASD / 方向键 / QE 自由调控摄像头角度
      if (this.cut) {
        const rotSpd = 1.35 * dt;
        if (this.keys['a'] || this.keys['arrowleft'] || this.keys['q']) this.camYawT = Math.max(-1.25, (this.camYawT || 0) - rotSpd);
        if (this.keys['d'] || this.keys['arrowright'] || this.keys['e']) this.camYawT = Math.min(1.25, (this.camYawT || 0) + rotSpd);
        if (this.keys['w'] || this.keys['arrowup']) this.camPitchT = Math.min(0.85, (this.camPitchT || 0) + rotSpd * 0.8);
        if (this.keys['s'] || this.keys['arrowdown']) this.camPitchT = Math.max(-0.38, (this.camPitchT || 0) - rotSpd * 0.8);
      } else if (this.state === 'play') {
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
            this.camT.z = target.z || target.targetZ || 0;
            const anyInside = target.inInterior;
            const baseDist = this.userZoomDist || (this.camOffsetZ || 21);
            this.camT.dist = anyInside ? Math.min(14, baseDist * 0.7) : baseDist;
          }
        }
      } else if (this.state === 'title') {
        this.camT.x = this.level.spawn.x + 14 + Math.sin(this.time * 0.1) * 6; this.camT.y = 5;
        this.camT.z = this.openWorld ? 2 : 0; this.camT.dist = this.openWorld ? 38 : 30;
      }
      const b = this.level.bounds;
      this.camT.x = Math.max(b.x1 + 4, Math.min(b.x2 - 4, this.camT.x));
      this.camT.y = Math.max(b.y1 + 1.2, Math.min(b.y2, this.camT.y));
      if (this.openWorld && this.openWorld.active) {
        const wb = this.openWorld.bounds;
        this.camT.z = Math.max(wb.z1, Math.min(wb.z2, this.camT.z));
      }
      const k = 1 - Math.pow(0.0008, dt);
      this.cam.x += (this.camT.x - this.cam.x) * k; this.cam.y += (this.camT.y - this.cam.y) * k;
      this.cam.z += (this.camT.z - this.cam.z) * k; this.cam.dist += (this.camT.dist - this.cam.dist) * k;
      this.camYaw = (this.camYaw || 0) + ((this.camYawT || 0) - (this.camYaw || 0)) * k;
      this.camPitch = (this.camPitch || 0) + ((this.camPitchT || 0) - (this.camPitch || 0)) * k;
      let sx = 0, sy = 0;
      if (this.shakeT > 0) { this.shakeT -= dt; const a = this.shakeA * Math.max(0, this.shakeT / 0.6); sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a; if (this.shakeT <= 0) this.shakeA = 0; }
      
      // 连续城区采用斜俯视镜头；塔下门厅降到檐下；支持自由环绕偏航角(camYaw)与俯仰角(camPitch)调控
      const towerVestibuleView = !!(this.leader && this.leader.inInterior && this.leader.interiorId === 'tower_vestibule');
      const openView = !!(this.openWorld && this.openWorld.active && this.cam.y < 9.5 && !towerVestibuleView);
      const wellCutBoost = (this.cut && this.cam.y < -0.5) ? 0.35 : 0;
      const basePitch = towerVestibuleView ? 0.22 : (openView ? 0.56 : 0.22);
      const baseYaw = towerVestibuleView ? -0.09 : (openView ? -0.18 : 0);
      const totalPitch = Math.max(0.08, Math.min(1.25, basePitch + wellCutBoost + (this.camPitch || 0)));
      const totalYaw = Math.max(-1.35, Math.min(1.35, baseYaw + (this.camYaw || 0)));
      const horizDist = this.cam.dist * Math.cos(totalPitch);
      const camOffsetX = Math.sin(totalYaw) * horizDist;
      const camOffsetY = this.cam.dist * Math.sin(totalPitch);
      const camOffsetZ = Math.cos(totalYaw) * horizDist;
      this.camera.position.set(this.cam.x + camOffsetX + sx, this.cam.y + camOffsetY + sy, this.cam.z + camOffsetZ);
      this.camera.lookAt(this.cam.x + sx, this.cam.y + 0.4 + sy, this.cam.z - (openView && !this.cut ? 1.2 : 0.2));
      if (this.sunLight) {
        this.sunLight.position.set(this.cam.x + 28, this.cam.y + 48, this.cam.z + 32);
        this.sunLight.target.position.set(this.cam.x, this.cam.y, this.cam.z);
      }

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
