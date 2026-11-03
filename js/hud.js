// HUD：P1 极简顶部头像（物资映射/脱队）、语言链电路、侧边事件横幅、塔内地图、对话气泡、过场
(function () {
  const $ = (id) => document.getElementById(id);

  class HUD {
    constructor(game) {
      this.game = game;
      this.row = $('portrait-row'); this.chainCv = $('chain-canvas'); this.cctx = this.chainCv.getContext('2d');
      this.bubbleLayer = $('bubble-layer'); this.feed = $('banner-feed');
      this.mm = $('minimap'); this.mctx = this.mm.getContext('2d');
      this.bubbles = new Map(); this.pulses = []; this.dirty = true; this.portraitURL = {};
      this.mapMode = 'section'; // 'section' (纵截面剖面图) 或 'plan' (横截面平面图)

      const btnSec = $('btn-map-section');
      const btnPlan = $('btn-map-plan');
      if (btnSec && btnPlan) {
        btnSec.onclick = () => { this.setMapMode('section'); };
        btnPlan.onclick = () => { this.setMapMode('plan'); };
      }
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          this.setMapMode(this.mapMode === 'section' ? 'plan' : 'section');
        }
      });

      this.mm.addEventListener('mousedown', (e) => {
        const r = this.mm.getBoundingClientRect(); const b = this.game.level.bounds;
        if (this.mapMode === 'plan') {
          const S = 2.3; const W = this.mm.width, H = this.mm.height;
          const u = this.game.leader || (this.game.units || []).find(q => q.recruited) || this.game.units[0];
          const curY = u ? u.y : 0;
          const targetX = 67 + ((e.clientX - r.left) - W / 2) / S;
          this.game.panTo(targetX, curY);
        } else {
          const x = b.x1 + (e.clientX - r.left) / r.width * (b.x2 - b.x1);
          const y = b.y2 - (e.clientY - r.top) / r.height * (b.y2 - b.y1);
          this.game.panTo(x, y);
        }
        e.stopPropagation();
      });
      this.initIcons();
    }

    setMapMode(mode) {
      this.mapMode = mode;
      const btnSec = $('btn-map-section');
      const btnPlan = $('btn-map-plan');
      if (btnSec && btnPlan) {
        btnSec.classList.toggle('active', mode === 'section');
        btnPlan.classList.toggle('active', mode === 'plan');
      }
      this.dirty = true;
      if (window.SFX && SFX.playConfirm) SFX.playConfirm();
    }

    initIcons() {
      if (window.renderIcons) window.renderIcons();
      else if (window.ICONS) {
        document.querySelectorAll('[data-icon]').forEach(el => {
          const k = el.dataset.icon;
          if (window.ICONS[k]) el.innerHTML = window.ICONS[k];
        });
      }
    }

    portrait(u) {
      const ver = u.palVersion || 0;
      const key = `${u.id}_${ver}`;
      if (!this.portraitURL[key]) this.portraitURL[key] = PX.portrait(u.pal, 64);
      return this.portraitURL[key];
    }

    setLevel(level) {
      $('lv-num').textContent = `第 ${level.id} 层`;
      $('lv-name').textContent = level.name;
      $('lv-sub').textContent = level.sub;
      this.feed.innerHTML = '';
      this.dirty = true;
    }

    setZone(zone) {
      if (!zone) return;
      const numEl = $('lv-num'); if (numEl) numEl.textContent = `第 ${zone.id + 1} 阶段`;
      const nameEl = $('lv-name'); if (nameEl) nameEl.textContent = zone.name;
      const subEl = $('lv-sub'); if (subEl) subEl.textContent = zone.sub;
      const altEl = $('lv-alt'); if (altEl) altEl.textContent = zone.alt || '';
      this.dirty = true;
    }

    // ── 顶部头像 ──
    buildPortraits() {
      const g = this.game;
      const members = g.units.filter(u => u.recruited).sort((a, b) => LANG.ORDER.indexOf(a.id) - LANG.ORDER.indexOf(b.id));
      this.row.innerHTML = '';
      this.members = members;
      members.forEach(u => {
        const el = document.createElement('div'); el.className = 'p1-member'; el.dataset.id = u.id;
        const stack = document.createElement('div'); stack.className = 'p1-supply-stack';
        u.stack.forEach((t, i) => {
          const im = document.createElement('img'); im.src = PX.itemURL(t); im.className = 'p1-supply'; im.title = '点击丢弃（减重提速）';
          im.addEventListener('pointerdown', (e) => { e.stopPropagation(); g.dropFromHUD(u, i); });
          stack.prepend(im);
        });
        const circ = document.createElement('div'); circ.className = 'p1-portrait-circle';
        const img = document.createElement('img'); img.src = this.portrait(u); circ.appendChild(img);
        const badge = document.createElement('div'); badge.className = 'p1-badge'; circ.appendChild(badge);
        const dressBadge = document.createElement('div');
        dressBadge.className = 'p1-dress-badge';
        dressBadge.innerHTML = '🎨';
        dressBadge.title = '定制纸娃娃（装扮/头饰/五官/肤色）';
        dressBadge.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (g.openPaperDollModal) g.openPaperDollModal(u);
        });
        circ.appendChild(dressBadge);
        el.title = '左键单击：选中队员 | 左键双击：任命领队 👑 | 右键：切换原地留驻 | 点击 🎨 或 Alt+单击：纸娃娃定制';
        let clickTimer = null;
        el.addEventListener('dblclick', (e) => {
          if (e.target.closest('.p1-supply') || e.target.closest('.p1-dress-badge')) return;
          e.stopPropagation();
          e.preventDefault();
          g.setLeader(u);
        });
        el.addEventListener('pointerdown', (e) => {
          if (e.target.closest('.p1-supply') || e.target.closest('.p1-dress-badge')) return;
          e.stopPropagation();
          if (e.altKey) {
            e.preventDefault();
            if (g.openPaperDollModal) g.openPaperDollModal(u);
            return;
          }
          if (e.button === 2) {
            g.toggleDetach(u);
            return;
          }
          if (e.button === 0) {
            if (clickTimer) {
              clearTimeout(clickTimer);
              clickTimer = null;
              g.setLeader(u);
            } else {
              if (e.shiftKey) {
                if (g.selection.has(u)) g.selection.delete(u);
                else g.selection.add(u);
                g.hud.dirty = true;
              } else {
                g.selectMember(u);
              }
              clickTimer = setTimeout(() => { clickTimer = null; }, 480);
            }
          }
        });
        el.addEventListener('contextmenu', (e) => e.preventDefault());
        const langs = document.createElement('div'); langs.className = 'p1-langs';
        u.langs.forEach(l => { const s = document.createElement('span'); s.textContent = l; s.style.color = (LANG.LANGS[l] && LANG.LANGS[l].color) || '#f0b030'; langs.appendChild(s); });
        const name = document.createElement('div'); name.className = 'p1-name'; name.textContent = u.name;
        const role = document.createElement('div'); role.className = 'p1-role-sub';
        role.innerHTML = `<span class="role-icon">${u.roleIcon || '👤'}</span><span class="role-name">${u.role || '工兵'}</span>`;
        role.title = u.roleDesc || '';
        el.append(stack, circ, langs, name, role);
        this.row.appendChild(el);
        u.hudEl = el;
      });
      this.dirty = false;
      requestAnimationFrame(() => this.layoutChain());
    }

    layoutChain() {
      const r = this.row.getBoundingClientRect(), box = this.chainCv.parentElement.getBoundingClientRect();
      this.chainCv.width = box.width; this.chainCv.height = box.height;
      this.centers = new Map();
      (this.members || []).forEach(u => {
        const c = u.hudEl.querySelector('.p1-portrait-circle').getBoundingClientRect();
        this.centers.set(u, { x: c.left + c.width / 2 - box.left, y: c.top + c.height / 2 - box.top, r: c.width / 2 });
      });
    }

    pulse(path, hopDuration = 0.22, glyph) {
      // path: [{from,to,lang}]
      this.pulses.push({ path, t: 0, hopDuration, glyph });
    }

    drawChain(dt, t) {
      const ctx = this.cctx, g = this.game;
      if (!this.centers) return;
      ctx.clearRect(0, 0, this.chainCv.width, this.chainCv.height);
      const chain = g.chain;
      const pos = (u) => this.centers.get(u);
      const curve = (a, b) => {
        const pa = pos(a), pb = pos(b); if (!pa || !pb) return null;
        const dist = Math.abs(pb.x - pa.x);
        const lift = dist > 110 ? -Math.min(46, dist * 0.22) : 0;
        return { pa, pb, cx: (pa.x + pb.x) / 2, cy: (pa.y + pb.y) / 2 + lift };
      };
      for (const l of chain.links) {
        const c = curve(l.a, l.b); if (!c) continue;
        const on = chain.connected.has(l.a) && chain.connected.has(l.b);
        ctx.save();
        ctx.strokeStyle = on ? LANG.LANGS[l.lang].color : 'rgba(150,150,160,0.5)';
        ctx.lineWidth = 3; ctx.setLineDash([3, 6]); ctx.lineDashOffset = -t * 30; ctx.lineCap = 'round';
        ctx.globalAlpha = on ? 0.95 : 0.5;
        ctx.beginPath();
        const sx = c.pa.x + (c.pb.x > c.pa.x ? c.pa.r : -c.pa.r), ex = c.pb.x + (c.pb.x > c.pa.x ? -c.pb.r : c.pb.r);
        ctx.moveTo(sx, c.pa.y); ctx.quadraticCurveTo(c.cx, c.cy, ex, c.pb.y); ctx.stroke();
        ctx.restore();
      }
      // 脉冲：沿链路传输的符号
      this.pulses = this.pulses.filter(p => {
        p.t += dt;
        const hopD = p.hopDuration || 0.22;
        const hop = Math.floor(p.t / hopD); if (hop >= p.path.length) return false;
        const h = p.path[hop], k = (p.t % hopD) / hopD;
        const c = curve(h.from, h.to); if (!c) return true;
        const sx = c.pa.x, ex = c.pb.x;
        const x = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * c.cx + k * k * ex;
        const y = (1 - k) * (1 - k) * c.pa.y + 2 * (1 - k) * k * c.cy + k * k * c.pb.y;
        ctx.save();
        ctx.fillStyle = '#fff8d8'; ctx.shadowColor = LANG.LANGS[h.lang].color; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = LANG.LANGS[h.lang].color; ctx.font = 'bold 12px "Segoe UI Symbol",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(h.lang, x, y + 1);
        ctx.restore();
        return true;
      });
    }

    refreshStates() {
      const g = this.game;
      (this.members || []).forEach(u => {
        const el = u.hudEl; if (!el) return;
        const isLeader = (u === g.leader);
        el.classList.toggle('selected', g.selection.has(u));
        el.classList.toggle('detached', u.detached);
        el.classList.toggle('disconnected', !g.chain.connected.has(u));
        el.classList.toggle('is-leader', isLeader);
        const badge = el.querySelector('.p1-badge');
        badge.textContent = isLeader ? '👑' : u.detached ? '驻' : !g.chain.connected.has(u) ? '✕' : (u.task && u.task.type === 'build') ? '⚒' : '';
        badge.style.display = badge.textContent ? 'flex' : 'none';
        badge.title = isLeader ? '当前指挥领队' : u.detached ? '驻留原地' : '';
      });
    }

    // ── 气泡 ──
    bubble(u, text, dur) {
      let b = this.bubbles.get(u);
      if (!b) { const el = document.createElement('div'); el.className = 'bubble'; this.bubbleLayer.appendChild(el); b = { el }; this.bubbles.set(u, b); }
      b.el.textContent = text; b.t = dur; b.el.classList.remove('hide'); b.el.classList.add('show');
      const lang = LANG.LANGS[text.trim()[0]];
      b.el.style.borderColor = lang ? lang.color : '#e8d8b0';
    }
    updateBubbles(dt) {
      this.bubbles.forEach((b, u) => {
        if (b.t > 0) {
          b.t -= dt;
          if (b.t <= 0) { b.el.classList.remove('show'); b.el.classList.add('hide'); }
        }
        const p = this.game.project(u.x, u.y + 2.0 + u.stack.length * 0.5);
        b.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
        b.el.style.display = p.visible ? '' : 'none';
      });
    }
    clearBubbles() { this.bubbles.forEach(b => b.el.remove()); this.bubbles.clear(); }

    // ── 横幅 ──
    banner(text, kind = 'info') {
      if (this.lastBanner === text && performance.now() - this.lastBannerT < 2500) return;
      this.lastBanner = text; this.lastBannerT = performance.now();
      const el = document.createElement('div'); el.className = 'banner ' + kind;
      const icon = (window.ICONS && ICONS[kind]) ? ICONS[kind] : '◆';
      el.innerHTML = `<span class="bi">${icon}</span><span>${text}</span>`;
      this.feed.prepend(el);
      while (this.feed.children.length > 4) this.feed.lastChild.remove();
      setTimeout(() => el.classList.add('out'), 6000);
      setTimeout(() => el.remove(), 6800);
    }

    // ── 关卡卡片 ──
    updateCard() {
      const g = this.game;
      const ul = $('lv-objectives');
      const objs = (g.activeZone && g.activeZone.objectives) ? g.activeZone.objectives : g.level.objectives;
      const html = (objs || []).map(o => {
        const done = g.objectiveDone(o.key);
        const icon = done ? (window.ICONS ? ICONS.check : '✓') : (window.ICONS ? ICONS.diamond : '◇');
        return `<li class="${done ? 'done' : ''}"><span class="ck">${icon}</span><span>${o.text}</span></li>`;
      }).join('');
      if (ul.dataset.h !== html) { ul.innerHTML = html; ul.dataset.h = html; }
      
      const active = g.units.filter(u => u.recruited && !u.detached && !u.fainted).length;
      const totalRecruited = g.units.filter(u => u.recruited).length;
      if ($('team-pop')) $('team-pop').textContent = `${active}/${totalRecruited}`;

      $('food-fill').style.width = Math.max(0, g.food) + '%';
      $('food-fill').classList.toggle('low', g.food < 30);
      $('food-num').textContent = `${Math.round(g.food)}% (${g.breadCount()}袋)`;
      if ($('food-rate')) $('food-rate').textContent = g.foodRate || '(-0.04/s)';

      const woodTotal = g.units.reduce((n, u) => n + (u.recruited ? u.stack.filter(t => t === 'wood').length : 0), 0);
      const stoneTotal = g.units.reduce((n, u) => n + (u.recruited ? u.stack.filter(t => t === 'stone').length : 0), 0);
      if ($('team-wood')) $('team-wood').textContent = woodTotal;
      if ($('team-stone')) $('team-stone').textContent = stoneTotal;
      if ($('lv-alt')) {
        const leader = g.leader || g.units.find(u => u.recruited);
        const altM = Math.max(0, Math.round((leader ? Math.max(0, leader.y) : 0) * 25));
        $('lv-alt').textContent = (g.activeZone && g.activeZone.alt) ? `${altM}m (${g.activeZone.alt})` : `${altM}m`;
      }

      const ex = g.exitStatus();
      const exTag = $('lv-exit');
      if (ex) {
        exTag.innerHTML = `${window.ICONS ? ICONS.exit : '🚪'} <span>出口 ${ex.at}/${ex.total}</span>`;
        exTag.style.display = 'inline-flex';
      } else {
        exTag.style.display = 'none';
      }
    }

    // ── 塔内地图（双模切换：纵截面剖面图 vs 横截面楼层平面图） ──
    drawMinimap() {
      if (this.mapMode === 'plan') {
        this.drawHorizontalPlan();
      } else {
        this.drawVerticalSection();
      }
    }

    drawVerticalSection() {
      const g = this.game, b = g.level.bounds, c = this.mctx, W = this.mm.width, H = this.mm.height;
      const sx = W / (b.x2 - b.x1), sy = H / (b.y2 - b.y1);
      const X = (x) => (x - b.x1) * sx, Y = (y) => H - (y - b.y1) * sy;
      c.clearRect(0, 0, W, H);
      c.fillStyle = 'rgba(24,30,42,0.85)'; c.fillRect(0, 0, W, H);

      // 海拔分层浅色背景指示
      const altZones = [
        { y0: -7, y1: 12, col: 'rgba(180,140,80,0.08)' },
        { y0: 12, y1: 32, col: 'rgba(100,160,220,0.08)' },
        { y0: 32, y1: 50, col: 'rgba(240,240,255,0.06)' },
        { y0: 50, y1: 68, col: 'rgba(56,189,248,0.09)' },
        { y0: 68, y1: 90, col: 'rgba(255,215,0,0.11)' }
      ];
      altZones.forEach(z => {
        c.fillStyle = z.col;
        c.fillRect(0, Y(z.y1), W, (z.y1 - z.y0) * sy);
      });

      c.fillStyle = '#b8a682';
      g.level.walls.forEach(w => c.fillRect(X(w[0]), Y(Math.min(w[3], b.y2)), (w[1] - w[0]) * sx, Math.max(2, (Math.min(w[3], b.y2) - Math.max(w[2], b.y1)) * sy)));
      c.fillStyle = '#f0e2c0';
      g.level.plats.forEach(p => c.fillRect(X(p[0]), Y(p[2]), (p[1] - p[0]) * sx, 2));
      g.bridges.forEach(br => { if (br.ext > 0.5) { c.fillStyle = '#c89050'; c.fillRect(X(br.x1), Y(br.y), (br.x2 - br.x1) * sx, 2); } });
      g.builds.forEach(br => { c.fillStyle = br.done ? '#c89050' : 'rgba(255,210,74,0.6)'; c.fillRect(X(br.x1), Y(br.y), (br.x2 - br.x1) * sx, 2); });
      c.fillStyle = '#e0a040';
      g.ladders.forEach(l => { if (!l.trigger || g.isActive(l.trigger)) c.fillRect(X(l.x) - 1, Y(l.y1), 2, (l.y1 - l.y0) * sy); });
      g.lifts.forEach(l => { c.fillStyle = '#ffd24a'; c.fillRect(X(l.x1), Y(l.y) - 1, (l.x2 - l.x1) * sx, 3); });
      g.gates.forEach(gt => { c.fillStyle = gt.open > 0.6 ? 'rgba(120,220,120,0.85)' : '#e04030'; c.fillRect(X(gt.x) - 1.5, Y(gt.y + gt.h), 3, gt.h * sy); });
      g.runes.forEach(r => { c.fillStyle = '#ffe68a'; c.fillRect(X(r.x) - 1.5, Y(r.y + 0.8) - 1.5, 3, 3); });
      if (g.exit) { c.fillStyle = '#fff'; c.beginPath(); c.arc(X(g.exit.x), Y(g.exit.y + 1), 3.5, 0, 7); c.fill(); }

      g.units.forEach(u => {
        c.fillStyle = !u.recruited ? '#aaa' : u.detached ? '#4fe0e0' : g.selection.has(u) ? '#ffd24a' : u.pal.coat;
        c.beginPath(); c.arc(X(u.x), Y(u.y + 0.7), 2.8, 0, 7); c.fill();
        if (g.selection.has(u)) { c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); }
        if (!u.recruited) { c.fillStyle = '#fff'; c.font = '8px sans-serif'; c.fillText('?', X(u.x) + 3, Y(u.y + 1)); }
      });
      const v = g.viewRect();
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1;
      c.strokeRect(X(v.x1), Y(v.y2), (v.x2 - v.x1) * sx, (v.y2 - v.y1) * sy);

      const activeUnit = g.leader || (g.units || []).find(q => q.recruited) || g.units[0];
      const curY = activeUnit ? activeUnit.y : 0;
      const floorTag = $('map-floor-tag');
      if (floorTag) {
        let fName = '第 0 层 · 两河荒原村落';
        if (curY >= 68.0) fName = '终章 · 天穹圣殿与破晓圣坛';
        else if (curY >= 50.0) fName = '第 3 层 · 圣书大图书馆与秘卷冷库';
        else if (curY >= 32.0) fName = '第 2 层 · 云之回廊与悬空绝壁';
        else if (curY >= 12.0) fName = '第 1 层 · 巨构中庭与机房密室';
        floorTag.textContent = `[纵截面] ${fName} (${Math.round(curY * 20)}m)`;
      }
    }

    drawHorizontalPlan() {
      const g = this.game, c = this.mctx, W = this.mm.width, H = this.mm.height;
      c.clearRect(0, 0, W, H);
      c.fillStyle = 'rgba(16, 20, 28, 0.92)'; c.fillRect(0, 0, W, H);

      const activeUnit = g.leader || (g.units || []).find(q => q.recruited) || g.units[0];
      const curY = activeUnit ? activeUnit.y : 0;
      const floorTag = $('map-floor-tag');

      // ── 第 0 阶段：荒原与村落平面 (y < 12) ──
      if (curY < 12.0) {
        if (floorTag) floorTag.textContent = `[横截面] 第 0 层 · 荒原与村落城镇俯瞰 (${Math.round(curY * 20)}m)`;
        const S = 1.45;
        const oX = W / 2 - 25 * S, oZ = H / 2 + 3 * S;
        const pX = (x) => oX + x * S, pZ = (z) => oZ - z * S;

        // 幼发拉底河岸
        c.fillStyle = 'rgba(40, 110, 140, 0.45)';
        c.fillRect(0, 0, pX(-16), H);

        // 主干道网
        c.fillStyle = 'rgba(160, 135, 95, 0.35)';
        c.fillRect(pX(-12), pZ(8), (56 - (-12)) * S, 4 * S);
        c.fillRect(pX(12), pZ(22), 4 * S, 32 * S);
        c.fillRect(pX(24), pZ(22), 4 * S, 32 * S);

        // 建筑占地轮廓 (工坊、长屋、粮仓、采石场)
        c.fillStyle = 'rgba(120, 95, 68, 0.65)';
        c.fillRect(pX(5), pZ(4), 7 * S, 6 * S); // 工坊
        c.fillRect(pX(13), pZ(4), 7 * S, 6 * S); // 长屋
        c.fillRect(pX(22), pZ(4), 6.5 * S, 6 * S); // 粮仓
        c.fillStyle = 'rgba(160, 150, 130, 0.55)';
        c.fillRect(pX(34), pZ(4), 9 * S, 7 * S); // 采石场

        // 枯井 (x=31.5, z=0)
        c.fillStyle = '#22d3ee';
        c.beginPath(); c.arc(pX(31.5), pZ(0), 3.5 * S, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#0f172a';
        c.beginPath(); c.arc(pX(31.5), pZ(0), 2.1 * S, 0, Math.PI * 2); c.fill();

        // 巴别巨塔基座前门环弧 (x=67, z=-15, R=36)
        c.strokeStyle = '#e0a040'; c.lineWidth = 2.5;
        c.beginPath(); c.arc(pX(67), pZ(-15), 36 * S, 0, Math.PI * 2); c.stroke();
        c.fillStyle = 'rgba(212, 175, 55, 0.2)'; c.fill();

        // 门洞标牌
        c.fillStyle = '#ffd24a'; c.font = '9px sans-serif';
        c.fillText('巴别塔门', pX(55), pZ(2));
        c.fillText('枯井', pX(29), pZ(-4));
        c.fillText('城镇', pX(10), pZ(-3));

        // 渲染队员
        g.units.forEach(u => {
          const ux = pX(u.x), uz = pZ(u.targetZ || 0);
          c.fillStyle = !u.recruited ? '#aaa' : u.detached ? '#4fe0e0' : g.selection.has(u) ? '#ffd24a' : u.pal.coat;
          c.beginPath(); c.arc(ux, uz, 3.2, 0, Math.PI * 2); c.fill();
          if (g.selection.has(u)) {
            c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke();
            const fDir = u.facing || 1;
            c.fillStyle = 'rgba(255,255,255,0.4)';
            c.beginPath(); c.moveTo(ux, uz); c.arc(ux, uz, 7, fDir > 0 ? -0.5 : Math.PI - 0.5, fDir > 0 ? 0.5 : Math.PI + 0.5); c.fill();
          }
        });
        return;
      }

      // ── 巨塔各层室内/室外圆环横截面平面图 (y >= 12) ──
      const S = 2.35;
      const cX = W / 2, cZ = H / 2 + 18; // 塔心投影偏上方，将南侧活动区置于视野正中
      const pX = (x) => cX + (x - 67.0) * S, pZ = (z) => cZ - z * S;

      let R = 33.5, tierTitle = '', rooms = [];
      if (curY >= 68.0) {
        R = 17.0; tierTitle = '终章 · 天穹圣殿与破晓金坛';
        rooms = [
          { name: '☼日辉', x: 51, z: 0, icon: '☼' },
          { name: '♒潮汐', x: 83, z: 0, icon: '♒' },
          { name: '✦黄金坛', x: 67, z: 0, icon: '✦' }
        ];
      } else if (curY >= 50.0) {
        R = 22.0; tierTitle = '第 3 层 · 圣书图书馆与秘卷冷库';
        rooms = [
          { name: '✦古星图', x: 48.5, z: -1.2, icon: '✦' },
          { name: '📖禁卷库', x: 64.0, z: -1.2, icon: '📖' },
          { name: '🪜登云梯', x: 67.0, z: 0, icon: '🪜' },
          { name: '📜译解室', x: 82.0, z: -1.2, icon: '📜' }
        ];
      } else if (curY >= 32.0) {
        R = 27.0; tierTitle = '第 2 层 · 云之回廊与悬空绝壁';
        rooms = [
          { name: '绝壁回廊 1', x: 58.0, z: 0, icon: '☁' },
          { name: '吊桥水机', x: 67.0, z: 0, icon: '⚙' },
          { name: '星图眺台', x: 86.0, z: 0, icon: '✦' }
        ];
      } else {
        R = 33.0; tierTitle = '第 1 层 · 巨构中庭与机房密室';
        rooms = [
          { name: '⚙动力机房', x: 55.0, z: -1.2, icon: '⚙' },
          { name: '🏛主回廊', x: 67.0, z: -1.2, icon: '🏛' },
          { name: '📜抄经阁', x: 82.0, z: -1.2, icon: '📜' }
        ];
      }
      if (floorTag) floorTag.textContent = `[横截面] ${tierTitle} (${Math.round(curY * 20)}m)`;

      // 外环厚重巨石城壁 (Outer Perimeter Wall)
      c.strokeStyle = '#c8b48d'; c.lineWidth = 5.5;
      c.beginPath(); c.arc(cX, cZ, R * S, 0, Math.PI * 2); c.stroke();

      // 内环空心中庭与回廊天井 (Inner Courtyard Ring)
      c.strokeStyle = '#5c4d3c'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(cX, cZ, (R * 0.45) * S, 0, Math.PI * 2); c.stroke();

      // 活动回廊走道底色 (Playable Corridor Arc)
      c.strokeStyle = 'rgba(212, 175, 55, 0.22)'; c.lineWidth = 14;
      c.beginPath(); c.arc(cX, cZ, (R * 0.72) * S, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();

      // 密室隔断横墙 (Chamber Partitions)
      if (curY >= 50.0 && curY < 68.0) {
        c.strokeStyle = '#a88c64'; c.lineWidth = 2.5;
        // 53.8 隔墙
        c.beginPath(); c.moveTo(pX(53.8), pZ(-4.0)); c.lineTo(pX(53.8), pZ(2.5)); c.stroke();
        // 74.2 隔墙
        c.beginPath(); c.moveTo(pX(74.2), pZ(-4.0)); c.lineTo(pX(74.2), pZ(2.5)); c.stroke();
      } else if (curY >= 12.0 && curY < 32.0) {
        c.strokeStyle = '#a88c64'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(pX(63.2), pZ(-4.0)); c.lineTo(pX(63.2), pZ(2.5)); c.stroke();
        c.beginPath(); c.moveTo(pX(76.5), pZ(-4.0)); c.lineTo(pX(76.5), pZ(2.5)); c.stroke();
      }

      // 房间与关键点标识
      c.fillStyle = '#ffd885'; c.font = '9px sans-serif'; c.textAlign = 'center';
      rooms.forEach(rm => {
        c.fillText(`${rm.icon} ${rm.name}`, pX(rm.x), pZ(rm.z));
      });

      // 机关与踏板
      g.plates.forEach(p => {
        if (Math.abs(p.y - curY) < 5.5) {
          c.fillStyle = p.pressed ? '#4ade80' : '#f59e0b';
          c.fillRect(pX(p.x) - 2.5, pZ(0) - 2.5, 5, 5);
        }
      });
      // 闸门
      g.gates.forEach(gt => {
        if (Math.abs(gt.y - curY) < 5.5) {
          c.fillStyle = gt.open > 0.6 ? '#4ade80' : '#ef4444';
          c.fillRect(pX(gt.x) - 2, pZ(-2), 4, 10);
        }
      });

      // 渲染所有角色（队员与异邦小队）
      g.units.forEach(u => {
        const onSameTier = Math.abs(u.y - curY) < 7.5;
        const ux = pX(u.x), uz = pZ(u.targetZ || 0);
        c.fillStyle = !u.recruited ? '#94a3b8' : u.detached ? '#38bdf8' : g.selection.has(u) ? '#ffd24a' : u.pal.coat;
        if (!onSameTier) c.globalAlpha = 0.28;
        c.beginPath(); c.arc(ux, uz, onSameTier ? 3.6 : 2.4, 0, Math.PI * 2); c.fill();
        if (onSameTier && g.selection.has(u)) {
          c.strokeStyle = '#fff'; c.lineWidth = 1.4; c.stroke();
          const fDir = u.facing || 1;
          c.fillStyle = 'rgba(255,255,255,0.45)';
          c.beginPath(); c.moveTo(ux, uz);
          c.arc(ux, uz, 8, fDir > 0 ? -0.55 : Math.PI - 0.55, fDir > 0 ? 0.55 : Math.PI + 0.55);
          c.fill();
        }
        c.globalAlpha = 1.0;
      });
      c.textAlign = 'left';
    }

    // ── 过场 ──
    showCut(line) {
      const box = $('cutscene'); box.classList.add('on');
      const dlg = $('cut-dialog');
      const emblem = $('cut-narr-emblem');
      if (line.who) {
        const u = this.game && this.game.units && this.game.units.find(x => x.id === line.who);
        const def = (LANG.MEMBERS && LANG.MEMBERS[line.who]) || (u ? { name: u.name, langs: u.langs, pal: u.pal } : { name: line.who, langs: ['?'], pal: {} });
        const pal = (u && u.pal) || def.pal;
        const ver = u ? (u.palVersion || 0) : 0;
        const pKey = `${line.who}_${ver}`;
        if (!this.portraitURL[pKey]) this.portraitURL[pKey] = PX.portrait(pal, 64);
        $('cut-portrait').src = this.portraitURL[pKey]; $('cut-portrait').style.display = 'block';
        if (emblem) emblem.style.display = 'none';
        $('cut-name').textContent = (u ? u.name : def.name) + ' · ' + ((u ? u.langs : def.langs) || []).join(' ');
        $('cut-say').textContent = line.say; $('cut-say').style.display = 'block';
        $('cut-sub').textContent = line.sub || '';
        dlg.className = 'speech';
        SFX.playBabble(line.who, line.say);
      } else {
        $('cut-portrait').style.display = 'none';
        if (emblem) emblem.style.display = 'block';
        $('cut-name').textContent = '';
        $('cut-say').textContent = ''; $('cut-say').style.display = 'none';
        $('cut-sub').textContent = line.narr;
        dlg.className = 'narr';
        SFX.playParchment();
      }
      dlg.classList.remove('pop'); void dlg.offsetWidth; dlg.classList.add('pop');
    }
    hideCut() { $('cutscene').classList.remove('on'); }

    update(dt, t) {
      if (this.dirty) this.buildPortraits();
      this.refreshStates();
      this.drawChain(dt, t);
      this.updateBubbles(dt);
      this.cardT = (this.cardT || 0) - dt;
      if (this.cardT <= 0) { this.cardT = 0.2; this.updateCard(); this.drawMinimap(); }
    }
  }

  window.HUD = HUD;
})();
