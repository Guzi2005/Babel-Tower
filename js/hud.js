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
      this.mm.addEventListener('mousedown', (e) => {
        const r = this.mm.getBoundingClientRect(); const b = this.game.level.bounds;
        const x = b.x1 + (e.clientX - r.left) / r.width * (b.x2 - b.x1);
        const y = b.y2 - (e.clientY - r.top) / r.height * (b.y2 - b.y1);
        this.game.panTo(x, y); e.stopPropagation();
      });
      this.initIcons();
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

    portrait(u) { if (!this.portraitURL[u.id]) this.portraitURL[u.id] = PX.portrait(u.pal, 64); return this.portraitURL[u.id]; }

    setLevel(level) {
      $('lv-num').textContent = `第 ${level.id} 层`;
      $('lv-name').textContent = level.name;
      $('lv-sub').textContent = level.sub;
      this.feed.innerHTML = '';
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
        el.title = '左键单击：选中队员 | 左键双击：任命为指挥领队 👑 | 右键单击：切换原地留驻/归队（留驻不消耗口粮）';
        let clickTimer = null;
        el.addEventListener('pointerdown', (e) => {
          if (e.target.closest('.p1-supply')) return;
          e.stopPropagation();
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
              clickTimer = setTimeout(() => { clickTimer = null; }, 280);
            }
          }
        });
        el.addEventListener('contextmenu', (e) => e.preventDefault());
        const langs = document.createElement('div'); langs.className = 'p1-langs';
        u.langs.forEach(l => { const s = document.createElement('span'); s.textContent = l; s.style.color = LANG.LANGS[l].color; langs.appendChild(s); });
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
      const html = g.level.objectives.map(o => {
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
        const altMap = [0, 24, 68, 115, 160];
        $('lv-alt').textContent = `${altMap[g.levelIdx] || 0}m`;
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

    // ── 塔内地图 ──
    drawMinimap() {
      const g = this.game, b = g.level.bounds, c = this.mctx, W = this.mm.width, H = this.mm.height;
      const sx = W / (b.x2 - b.x1), sy = H / (b.y2 - b.y1);
      const X = (x) => (x - b.x1) * sx, Y = (y) => H - (y - b.y1) * sy;
      c.clearRect(0, 0, W, H);
      c.fillStyle = 'rgba(40,52,70,0.55)'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#d8c8a0';
      g.level.walls.forEach(w => c.fillRect(X(w[0]), Y(Math.min(w[3], b.y2)), (w[1] - w[0]) * sx, Math.max(2, (Math.min(w[3], b.y2) - Math.max(w[2], b.y1)) * sy)));
      c.fillStyle = '#f0e2c0';
      g.level.plats.forEach(p => c.fillRect(X(p[0]), Y(p[2]), (p[1] - p[0]) * sx, 2));
      g.bridges.forEach(br => { if (br.ext > 0.5) { c.fillStyle = '#c89050'; c.fillRect(X(br.x1), Y(br.y), (br.x2 - br.x1) * sx, 2); } });
      g.builds.forEach(br => { c.fillStyle = br.done ? '#c89050' : 'rgba(255,210,74,0.6)'; c.fillRect(X(br.x1), Y(br.y), (br.x2 - br.x1) * sx, 2); });
      c.fillStyle = '#a07040';
      g.ladders.forEach(l => { if (!l.trigger || g.isActive(l.trigger)) c.fillRect(X(l.x) - 1, Y(l.y1), 2, (l.y1 - l.y0) * sy); });
      g.lifts.forEach(l => { c.fillStyle = '#e0a040'; c.fillRect(X(l.x1), Y(l.y) - 1, (l.x2 - l.x1) * sx, 3); });
      g.gates.forEach(gt => { c.fillStyle = gt.open > 0.7 ? 'rgba(120,200,120,0.8)' : '#c84a3a'; c.fillRect(X(gt.x) - 1.5, Y(gt.y + gt.h), 3, gt.h * sy); });
      g.runes.forEach(r => { c.fillStyle = '#ffe68a'; c.fillRect(X(r.x) - 1.5, Y(r.y + 0.8) - 1.5, 3, 3); });
      if (g.exit) { c.fillStyle = '#fff'; c.beginPath(); c.arc(X(g.exit.x), Y(g.exit.y + 1), 3.5, 0, 7); c.fill(); }
      g.units.forEach(u => {
        c.fillStyle = !u.recruited ? '#aaa' : u.detached ? '#4fe0e0' : g.selection.has(u) ? '#ffd24a' : u.pal.coat;
        c.beginPath(); c.arc(X(u.x), Y(u.y + 0.7), 2.6, 0, 7); c.fill();
        if (!u.recruited) { c.fillStyle = '#fff'; c.font = '8px sans-serif'; c.fillText('?', X(u.x) + 3, Y(u.y + 1)); }
      });
      const v = g.viewRect();
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1;
      c.strokeRect(X(v.x1), Y(v.y2), (v.x2 - v.x1) * sx, (v.y2 - v.y1) * sy);
    }

    // ── 过场 ──
    showCut(line) {
      const box = $('cutscene'); box.classList.add('on');
      const dlg = $('cut-dialog');
      const emblem = $('cut-narr-emblem');
      if (line.who) {
        const def = LANG.MEMBERS[line.who];
        if (!this.portraitURL[line.who]) this.portraitURL[line.who] = PX.portrait(def.pal, 64);
        $('cut-portrait').src = this.portraitURL[line.who]; $('cut-portrait').style.display = 'block';
        if (emblem) emblem.style.display = 'none';
        $('cut-name').textContent = def.name + ' · ' + def.langs.join(' ');
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
