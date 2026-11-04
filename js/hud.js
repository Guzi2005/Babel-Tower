// HUD：P1 极简顶部头像（物资映射/脱队）、语言链电路、侧边事件横幅、塔内地图、对话气泡、过场
(function () {
  const _hudDomCache = Object.create(null);
  const $ = (id) => _hudDomCache[id] || (_hudDomCache[id] = document.getElementById(id));

  class HUD {
    constructor(game) {
      this.game = game;
      this.row = $('portrait-row'); this.chainCv = $('chain-canvas'); this.cctx = this.chainCv.getContext('2d');
      this.bubbleLayer = $('bubble-layer'); this.feed = $('banner-feed');
      this.mm = $('minimap'); this.mctx = this.mm.getContext('2d');
      this.bubbles = new Map(); this.pulses = []; this.dirty = true; this.portraitURL = {};
      this.mapMode = 'section'; // 'section' (纵截面剖面图) 或 'plan' (横截面平面图)
      this.layoutMode = 'tree'; // 'tree' (语言传递深度树) 或 'row' (水平紧凑队形)
      this.lastChainKey = '';

      const btnLayout = $('btn-toggle-hud-layout');
      if (btnLayout) {
        btnLayout.onclick = () => {
          this.layoutMode = (this.layoutMode === 'tree' ? 'row' : 'tree');
          btnLayout.textContent = this.layoutMode === 'tree' ? '🌳 传递深度树' : '≡ 水平紧凑队形';
          this.row.className = this.layoutMode === 'tree' ? 'portrait-tree-mode' : 'portrait-row-mode';
          this.dirty = true;
          if (window.SFX && SFX.playConfirm) SFX.playConfirm();
        };
      }
      window.addEventListener('resize', () => { this.layoutChain(); });

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

    // ── 单个队员卡片组件生成 ──
    buildMemberCard(u, chain) {
      const g = this.game;
      const el = document.createElement('div'); el.className = 'p1-member'; el.dataset.id = u.id;

      // 语言深度角标
      const d = (chain && chain.depth && chain.depth.has(u)) ? chain.depth.get(u) : 0;
      const depthTag = document.createElement('div');
      depthTag.className = 'p1-depth-tag';
      if (d === 0) {
        depthTag.className += ' depth-root';
        depthTag.textContent = '👑 领队源头';
      } else if (d === 1) {
        depthTag.className += ' depth-1';
        depthTag.textContent = '⚡ 1跳·直达';
      } else if (d === 2) {
        depthTag.className += ' depth-2';
        depthTag.textContent = '🔗 2跳·接力';
      } else if (d > 2 && d < Infinity) {
        depthTag.className += ' depth-3';
        depthTag.textContent = `🔗 ${d}跳·多级`;
      } else {
        depthTag.className += ' depth-disc';
        depthTag.textContent = '⚠️ 未连通';
      }
      el.appendChild(depthTag);

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

      // 中继转译源标签 (如：↳ 乌尔 𒀭)
      if (chain && chain.parent && chain.parent.has(u)) {
        const rel = chain.parent.get(u);
        if (rel && rel.from) {
          const relayTag = document.createElement('div');
          relayTag.className = 'p1-relay-tag';
          relayTag.innerHTML = `↳ ${rel.from.name} <span class="relay-sym">${rel.lang}</span>`;
          relayTag.title = `指令由 ${rel.from.name} 通过【${rel.lang}】转译传递至此队员`;
          el.appendChild(relayTag);
        }
      }

      u.hudEl = el;
      return el;
    }

    // ── 顶部头像排布（多层语言传递树 / 水平紧凑模式） ──
    buildPortraits() {
      const g = this.game;
      const members = g.units.filter(u => u.recruited).sort((a, b) => LANG.ORDER.indexOf(a.id) - LANG.ORDER.indexOf(b.id));
      this.row.innerHTML = '';
      this.members = members;
      if (!members.length) { this.dirty = false; return; }

      const currentLeader = (g.leader && g.leader.recruited && !g.leader.fainted) ? g.leader : (members[0] || null);
      const chain = g.chain || (g.level ? LANG.computeChain(g.units, currentLeader, g.level.chainRange) : { links: [], parent: new Map(), connected: new Set(members), depth: new Map(), tiers: [members], disconnected: [] });

      if (this.layoutMode === 'tree') {
        this.row.className = 'portrait-tree-mode';
        const tiers = chain.tiers || [];
        const tierLabels = [
          '👑 领队源头',
          '⚡ 深度 1',
          '🔗 深度 2',
          '🔗 深度 3',
          '🔗 深度 4'
        ];
        tiers.forEach((tierMembers, tierIdx) => {
          if (!tierMembers || !tierMembers.length) return;
          if (this.row.children.length > 0) {
            const arrow = document.createElement('div');
            arrow.className = 'tree-tier-arrow';
            arrow.textContent = '➔';
            this.row.appendChild(arrow);
          }
          const tierWrap = document.createElement('div');
          tierWrap.className = `tree-tier tier-${tierIdx}`;
          const label = document.createElement('div');
          label.className = 'tree-tier-label';
          label.textContent = tierLabels[tierIdx] || `🔗 深度 ${tierIdx}`;
          const memsWrap = document.createElement('div');
          memsWrap.className = 'tree-tier-members';
          tierMembers.forEach(u => {
            memsWrap.appendChild(this.buildMemberCard(u, chain));
          });
          tierWrap.append(label, memsWrap);
          this.row.appendChild(tierWrap);
        });

        if (chain.disconnected && chain.disconnected.length > 0) {
          const arrow = document.createElement('div');
          arrow.className = 'tree-tier-arrow warn';
          arrow.textContent = '┆';
          this.row.appendChild(arrow);

          const discWrap = document.createElement('div');
          discWrap.className = 'tree-tier tier-disc';
          const label = document.createElement('div');
          label.className = 'tree-tier-label warn';
          label.textContent = `⚠️ 离群 (${chain.disconnected.length}人)`;
          const memsWrap = document.createElement('div');
          memsWrap.className = 'tree-tier-members';
          chain.disconnected.forEach(u => {
            memsWrap.appendChild(this.buildMemberCard(u, chain));
          });
          discWrap.append(label, memsWrap);
          this.row.appendChild(discWrap);
        }
      } else {
        // 水平单行紧凑模式
        this.row.className = 'portrait-row-mode';
        members.forEach(u => {
          this.row.appendChild(this.buildMemberCard(u, chain));
        });
      }

      this.dirty = false;
      requestAnimationFrame(() => this.layoutChain());
    }

    layoutChain() {
      const topWrap = $('top-hud-wrap') || this.row.parentElement;
      const box = topWrap.getBoundingClientRect();
      this.chainCv.width = Math.max(20, Math.round(box.width));
      this.chainCv.height = Math.max(20, Math.round(box.height));
      this.centers = new Map();
      (this.members || []).forEach(u => {
        if (!u.hudEl) return;
        const circ = u.hudEl.querySelector('.p1-portrait-circle');
        if (!circ) return;
        const c = circ.getBoundingClientRect();
        this.centers.set(u, {
          x: c.left + c.width / 2 - box.left,
          y: c.top + c.height / 2 - box.top,
          r: c.width / 2
        });
      });
    }

    pulse(path, hopDuration = 0.22, glyph) {
      // path: [{from,to,lang}]
      this.pulses.push({ path, t: 0, hopDuration, glyph });
    }

    drawChain(dt, t) {
      const ctx = this.cctx, g = this.game;
      if (!this.centers || !this.chainCv.width) return;
      ctx.clearRect(0, 0, this.chainCv.width, this.chainCv.height);
      const chain = g.chain;
      if (!chain) return;

      const pos = (u) => this.centers.get(u);

      // 1. 绘制潜在语言网状链路（次要链路以淡色虚线展示）
      for (const l of chain.links) {
        const pa = pos(l.a), pb = pos(l.b);
        if (!pa || !pb) continue;
        const isParentEdge = (chain.parent.get(l.b) && chain.parent.get(l.b).from === l.a) ||
                             (chain.parent.get(l.a) && chain.parent.get(l.a).from === l.b);
        if (!isParentEdge) {
          ctx.save();
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 5]);
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 2. 绘制层级树向下贝塞尔曲线与转译语系符号
      (this.members || []).forEach(u => {
        if (!chain.connected.has(u)) return;
        const rel = chain.parent ? chain.parent.get(u) : null;
        if (!rel || !rel.from) return;
        const pa = pos(rel.from), pb = pos(u);
        if (!pa || !pb) return;

        const langClr = (LANG.LANGS[rel.lang] && LANG.LANGS[rel.lang].color) || '#ffd24a';
        let sx, sy, ex, ey, c1x, c1y, c2x, c2y;

        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        if (Math.abs(dx) >= Math.abs(dy)) {
          // 横向主导（横向拓扑树模式）：自左向右平滑流动曲线
          sx = pa.x + (dx > 0 ? pa.r + 2 : -(pa.r + 2)); sy = pa.y;
          ex = pb.x + (dx > 0 ? -(pb.r + 2) : pb.r + 2); ey = pb.y;
          const midX = (sx + ex) * 0.5;
          const lift = Math.abs(dx) > 80 ? -Math.min(18, Math.abs(dx) * 0.14) : 0;
          c1x = midX; c1y = sy + lift;
          c2x = midX; c2y = ey + lift;
        } else {
          // 纵向主导
          sx = pa.x; sy = pa.y + (dy > 0 ? pa.r + 2 : -(pa.r + 2));
          ex = pb.x; ey = pb.y + (dy > 0 ? -(pb.r + 2) : pb.r + 2);
          const midY = (sy + ey) * 0.5;
          c1x = sx; c1y = midY;
          c2x = ex; c2y = midY;
        }

        // 发光外边
        ctx.save();
        ctx.strokeStyle = langClr;
        ctx.lineWidth = 2.4;
        ctx.shadowColor = langClr;
        ctx.shadowBlur = 6;
        ctx.setLineDash([3, 3]);
        ctx.lineDashOffset = -t * 24;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
        ctx.stroke();
        ctx.restore();

        // 沿树枝下行的平滑光珠流
        const flowK = ((t * 0.72 + (pa.x + pb.x) * 0.005) % 1.0);
        const k = flowK;
        const px = (1-k)*(1-k)*(1-k)*sx + 3*(1-k)*(1-k)*k*c1x + 3*(1-k)*k*k*c2x + k*k*k*ex;
        const py = (1-k)*(1-k)*(1-k)*sy + 3*(1-k)*(1-k)*k*c1y + 3*(1-k)*k*k*c2y + k*k*k*ey;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = langClr;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 中点语言符文徽标
        const mx = (sx + 3 * c1x + 3 * c2x + ex) / 8;
        const my = (sy + 3 * c1y + 3 * c2y + ey) / 8;
        ctx.save();
        ctx.fillStyle = 'rgba(16, 22, 36, 0.9)';
        ctx.strokeStyle = langClr;
        ctx.lineWidth = 1.2;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(mx, my, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = langClr;
        ctx.font = 'bold 8px "Segoe UI Symbol", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rel.lang, mx, my + 0.5);
        ctx.restore();
      });

      // 3. 脉冲：沿指定路径传输的高亮符号
      this.pulses = this.pulses.filter(p => {
        p.t += dt;
        const hopD = p.hopDuration || 0.22;
        const hop = Math.floor(p.t / hopD);
        if (hop >= p.path.length) return false;
        const h = p.path[hop], k = (p.t % hopD) / hopD;
        const pa = pos(h.from), pb = pos(h.to);
        if (!pa || !pb) return true;

        const x = (1 - k) * pa.x + k * pb.x;
        const y = (1 - k) * pa.y + k * pb.y;
        const clr = (LANG.LANGS[h.lang] && LANG.LANGS[h.lang].color) || '#ffd24a';

        ctx.save();
        ctx.fillStyle = '#fff8d8';
        ctx.shadowColor = clr;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = clr;
        ctx.font = 'bold 13px "Segoe UI Symbol", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(h.lang, x, y + 1);
        ctx.restore();
        return true;
      });
    }

    refreshStates() {
      const g = this.game;
      const chain = g.chain;

      // 拓扑动态刷新判定
      const leaderId = g.leader ? g.leader.id : '';
      const connCount = chain ? chain.connected.size : 0;
      const discCount = chain ? (chain.disconnected || []).length : 0;
      const memCount = (this.members || []).length;
      const curKey = `${leaderId}_${connCount}_${discCount}_${memCount}`;
      if (this.lastChainKey !== curKey) {
        this.lastChainKey = curKey;
        this.dirty = true;
      }

      (this.members || []).forEach(u => {
        const el = u.hudEl; if (!el) return;
        const isLeader = (u === g.leader);
        const isConnected = chain ? chain.connected.has(u) : true;
        el.classList.toggle('selected', g.selection.has(u));
        el.classList.toggle('detached', u.detached);
        el.classList.toggle('disconnected', !isConnected);
        el.classList.toggle('is-leader', isLeader);
        const badge = el.querySelector('.p1-badge');
        badge.textContent = isLeader ? '👑' : u.detached ? '驻' : !isConnected ? '✕' : (u.task && u.task.type === 'build') ? '⚒' : '';
        badge.style.display = badge.textContent ? 'flex' : 'none';
        badge.title = isLeader ? '当前指挥领队' : u.detached ? '驻留原地' : '';
      });

      // 通天共鸣与语言链状态横条更新
      const harmonyBadge = $('chain-harmony-badge');
      if (harmonyBadge) {
        const rec = this.members || [];
        if (rec.length <= 1) {
          harmonyBadge.textContent = '👤 单人前行 · 待招募同伴';
          harmonyBadge.className = 'chain-harmony-badge';
        } else if (g.squadHarmony) {
          harmonyBadge.textContent = '✨ 语言共鸣 100% · 全员连携 (+12%移动/+25%建造)';
          harmonyBadge.className = 'chain-harmony-badge harmony-active';
        } else {
          harmonyBadge.textContent = `⚠️ 语言阻隔 (${discCount}人脱队/未连通)`;
          harmonyBadge.className = 'chain-harmony-badge harmony-warn';
        }
      }
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
      $('food-num').textContent = `${Math.round(g.food)}% (${g.breadCount()}份口粮)`;
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
        let fName = '第 0 层 · 远古荒原村落';
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

        // 绿洲河岸
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

      // ── 巨塔各层同心圆巨构详细横截面俯视平面图 (y >= 12，真实展现同心圆大厦、径向密室与回廊) ──
      const cX = W / 2, cZ = H / 2;
      let tierTitle = '', rooms = [];
      let tierR = 26.0, S = 2.35;

      if (curY >= 68.0) {
        tierTitle = '终章 · 天穹圣殿与破晓金坛';
        tierR = 9.0; S = 5.6;
        rooms = [
          { name: '☼日辉圣坛', a: -Math.PI / 2, r: 6.8, icon: '☼' },
          { name: '▲岩脊古坛', a: -Math.PI / 2 + 1.25, r: 6.8, icon: '▲' },
          { name: '♒潮汐灵坛', a: -Math.PI / 2 + 2.51, r: 6.8, icon: '♒' },
          { name: '◎环音法坛', a: -Math.PI / 2 + 3.77, r: 6.8, icon: '◎' },
          { name: '✦星屑秘坛', a: -Math.PI / 2 + 5.03, r: 6.8, icon: '✦' },
          { name: '👑破晓通天台', x: 67.0, z: -10.0, icon: '👑' }
        ];
      } else if (curY >= 50.0) {
        tierTitle = '第 3 层 · 圆形藏书圣阁与秘卷冷库';
        tierR = 13.5; S = 3.8;
        rooms = [
          { name: '❄秘卷冷库', x: 57.5, z: -16.0, icon: '❄' },
          { name: '📖圆形万卷阁', x: 67.0, z: -18.0, icon: '📖' },
          { name: '📜多语译解室', x: 76.5, z: -16.0, icon: '📜' },
          { name: '🪜塔心长梯', x: 67.0, z: -10.0, icon: '🪜' }
        ];
      } else if (curY >= 32.0) {
        tierTitle = '第 2 层 · 绝壁圆环回廊与天阶议事厅';
        tierR = 16.5; S = 3.2;
        rooms = [
          { name: '☁绝壁回廊', x: 57.0, z: -14.0, icon: '☁' },
          { name: '⚙水力重锤', x: 74.0, z: -14.0, icon: '⚙' },
          { name: '✦星图眺台', x: 67.0, z: -5.0, icon: '✦' }
        ];
      } else if (curY >= 18.0) {
        tierTitle = '第 2 层 · 螺旋同心圆大回廊';
        tierR = 23.5; S = 2.6;
        rooms = [
          { name: '🌀螺旋西廊', x: 52.0, z: -12.0, icon: '🌀' },
          { name: '🏛议事东厅', x: 79.5, z: -12.0, icon: '🏛' },
          { name: '🪜二层飞梯', x: 64.0, z: -6.0, icon: '🪜' }
        ];
      } else {
        tierTitle = '第 1 层 · 52米直径同心圆大厦主殿';
        tierR = 26.0; S = 2.35;
        rooms = [
          { name: '⚙动力机房', x: 52.0, z: -18.0, icon: '⚙' },
          { name: '🏛万门列柱中庭', x: 67.0, z: -10.0, icon: '🏛' },
          { name: '📜掌印官印斋', x: 82.0, z: -18.0, icon: '📜' },
          { name: '🪜通天爬梯', x: 64.0, z: -0.55, icon: '🪜' }
        ];
      }
      if (floorTag) floorTag.textContent = `[同心圆俯视] ${tierTitle} (${Math.round(curY * 20)}m)`;

      const pX = (x) => cX + (x - 67.0) * S;
      const pZ = (z) => cZ + (z - (-10.0)) * S;

      // 1. 同心圆大厦楼板底色 (Playable Rotunda Slab)
      c.fillStyle = 'rgba(212, 175, 55, 0.15)';
      c.beginPath(); c.arc(cX, cZ, tierR * S, 0, Math.PI * 2); c.fill();

      // 2. 内部同心圆走廊镶嵌金线 (Concentric Inlay Rings)
      c.strokeStyle = 'rgba(212, 175, 55, 0.35)'; c.lineWidth = 1.2;
      c.beginPath(); c.arc(cX, cZ, tierR * 0.65 * S, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = 'rgba(255, 215, 0, 0.45)'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(cX, cZ, tierR * 0.28 * S, 0, Math.PI * 2); c.stroke();

      // 3. 北向幽深承重圆弧外壁 (North Arc from -125° to +125°)
      c.strokeStyle = '#c8b48d'; c.lineWidth = 4.5;
      c.beginPath();
      // 在画布坐标系中，North (-Z) 对应 -PI/2
      c.arc(cX, cZ, tierR * S, Math.PI * 0.81, Math.PI * 2.19, false);
      c.stroke();

      // 4. 南向开敞透视列柱弧段 (South Colonnade Arc from +35° to +145°)
      c.strokeStyle = 'rgba(240, 226, 192, 0.45)'; c.lineWidth = 1.5;
      c.setLineDash([4, 4]);
      c.beginPath();
      c.arc(cX, cZ, tierR * S, Math.PI * 0.19, Math.PI * 0.81, false);
      c.stroke();
      c.setLineDash([]);
      // 南侧圆柱柱头点
      c.fillStyle = '#f5eedb';
      for (let a = Math.PI * 0.20; a <= Math.PI * 0.80; a += 0.18) {
        c.beginPath();
        c.arc(cX + Math.cos(a) * tierR * S, cZ + Math.sin(a) * tierR * S, 2.2, 0, Math.PI * 2);
        c.fill();
      }

      // 5. 室内放射状密室隔断墙与拱门通道 (Radial Spoke Partitions)
      if (curY < 68.0) {
        c.strokeStyle = '#a88c64'; c.lineWidth = 2.8;
        const radAngles = [-Math.PI * 0.75, -Math.PI * 0.25];
        radAngles.forEach(ang => {
          const r0 = tierR * 0.28 * S, r1 = tierR * 0.45 * S;
          const r2 = tierR * 0.62 * S, r3 = tierR * S;
          const cos = Math.cos(ang), sin = Math.sin(ang);
          // 内段隔墙
          c.beginPath(); c.moveTo(cX + cos * r0, cZ + sin * r0); c.lineTo(cX + cos * r1, cZ + sin * r1); c.stroke();
          // 外段隔墙
          c.beginPath(); c.moveTo(cX + cos * r2, cZ + sin * r2); c.lineTo(cX + cos * r3, cZ + sin * r3); c.stroke();
          // 门洞两侧标线
          c.strokeStyle = '#4ade80'; c.lineWidth = 1.2;
          c.beginPath(); c.moveTo(cX + cos * r1 - sin * 2, cZ + sin * r1 + cos * 2); c.lineTo(cX + cos * r1 + sin * 2, cZ + sin * r1 - cos * 2); c.stroke();
          c.beginPath(); c.moveTo(cX + cos * r2 - sin * 2, cZ + sin * r2 + cos * 2); c.lineTo(cX + cos * r2 + sin * 2, cZ + sin * r2 - cos * 2); c.stroke();
          c.strokeStyle = '#a88c64'; c.lineWidth = 2.8;
        });
      }

      // 6. 房间与功能区图标文字标识
      c.fillStyle = '#ffd885'; c.font = '9px sans-serif'; c.textAlign = 'center';
      rooms.forEach(rm => {
        let rx = rm.x !== undefined ? pX(rm.x) : (cX + Math.cos(rm.a) * rm.r * S);
        let rz = rm.z !== undefined ? pZ(rm.z) : (cZ + Math.sin(rm.a) * rm.r * S);
        c.fillText(`${rm.icon} ${rm.name}`, rx, rz);
      });

      // 机关与踏板
      g.plates.forEach(p => {
        if (Math.abs(p.y - curY) < 5.5) {
          c.fillStyle = p.pressed ? '#4ade80' : '#f59e0b';
          const pzVal = p.z !== undefined ? p.z : -0.55;
          c.fillRect(pX(p.x) - 3, pZ(pzVal) - 3, 6, 6);
        }
      });
      // 闸门
      g.gates.forEach(gt => {
        if (Math.abs(gt.y - curY) < 5.5) {
          c.fillStyle = gt.open > 0.6 ? '#4ade80' : '#ef4444';
          const gzVal = gt.z !== undefined ? gt.z : -0.55;
          c.fillRect(pX(gt.x) - 2.5, pZ(gzVal) - 4, 5, 8);
        }
      });

      // 渲染所有角色（队员与异邦小队）
      g.units.forEach(u => {
        const onSameTier = Math.abs(u.y - curY) < 7.5;
        const curZ = u.targetZ !== undefined ? u.targetZ : (u.z !== undefined ? u.z : 0);
        const ux = pX(u.x), uz = pZ(curZ);
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
      this.updateTaskGuide(dt);
      this.cardT = (this.cardT || 0) - dt;
      if (this.cardT <= 0) { this.cardT = 0.2; this.updateCard(); this.drawMinimap(); }
    }

    // ── 贴窗口边动态任务指引箭头（Screen-Edge Objective Guide Arrow） ──
    updateTaskGuide(dt) {
      try {
        const g = this.game;
        const el = $('screen-task-arrow');
        if (!el || !g || !g.camera || g.state !== 'play' || g.cut) {
          if (el) el.style.display = 'none';
          return;
        }

        // 获取当前激活的首要主线目标
        const objs = (g.activeZone && g.activeZone.objectives) ? g.activeZone.objectives : (g.level ? g.level.objectives : null);
        let targetObj = null;
        if (objs && objs.length) {
          targetObj = objs.find(o => !g.objectiveDone(o.key));
        }

        let tx = 0, ty = 0, tz = 0, title = '前往目标';
        if (targetObj) {
          const key = targetObj.key;
          const parts = key.split(':');
          const k = parts[0], id = parts[1];
          title = targetObj.text.replace(/【.*?】/, '').trim();
          if (title.length > 10) title = title.slice(0, 10) + '…';

          if (k === 'trek') {
            tx = 2.0; ty = 0; tz = 0;
            title = '引路石标';
          } else if (k === 'recruit') {
            const u = (g.units || []).find(un => un.id === id);
            if (u) {
              tx = u.x; ty = u.y; tz = u.targetZ || 0;
              title = `营救${u.name}`;
            } else if (id === 'bani') {
              tx = 31.5; ty = -5.0; tz = 0;
              title = '营救巴尼';
            }
          } else if (k === 'build') {
            const b = (g.builds || []).find(q => q.id === id);
            if (b) {
              tx = (b.x1 + b.x2) / 2; ty = b.y; tz = 0;
              title = `修筑${b.name || '木桥'}`;
            }
          } else if (k === 'gate') {
            const gate = (g.gates || []).find(q => q.id === id);
            if (gate) {
              tx = gate.x; ty = gate.y; tz = 0;
              title = `开启${gate.name || '天门'}`;
            }
          } else if (k === 'stele') {
            const stele = (g.steles || []).find(q => q.id === id);
            if (stele) {
              tx = stele.x; ty = stele.y; tz = 0;
              title = '破译密碑';
            }
          } else if (k === 'pacify') {
            const ref = (g.units || []).find(un => (un.team === 'refugee' || un.team === 'rival') && !un.pacified);
            if (ref) {
              tx = ref.x; ty = ref.y; tz = ref.targetZ || 0;
              title = `接纳${ref.name}`;
            }
          }
        } else if (g.exit) {
          tx = g.exit.x; ty = g.exit.y; tz = 0;
          title = '通天大门';
        } else {
          el.style.display = 'none';
          return;
        }

        const leader = g.leader || (g.units || []).find(u => u.recruited) || (g.units || [])[0];
        if (!leader) {
          el.style.display = 'none';
          return;
        }

        // 计算与领队三维空间直线距离
        const dist = Math.round(Math.hypot(tx - leader.x, ty - leader.y, tz - (leader.targetZ || 0)));

        // 投影至屏幕视口（使用 PerspectiveCamera 正确投射）
        if (!this._projVec && window.THREE) this._projVec = new THREE.Vector3();
        if (!this._projVec) return;
        const v = this._projVec.set(tx, ty + 0.8, tz);
        v.project(g.camera);

        const sw = window.innerWidth, sh = window.innerHeight;
        let sx = (v.x * 0.5 + 0.5) * sw;
        let sy = (-v.y * 0.5 + 0.5) * sh;

        const isBehind = v.z > 1.0;
        if (isBehind) {
          sx = sw - sx;
          sy = sh - sy;
        }

        const cx = sw / 2, cy = sh / 2;
        const dx = sx - cx, dy = sy - cy;
        const angle = Math.atan2(dy, dx);

        const padX = 75, padY = 60;
        const isOffscreen = isBehind || sx < padX || sx > sw - padX || sy < padY || sy > sh - padY;

        let clampedX = sx, clampedY = sy;
        if (isOffscreen) {
          const halfW = sw / 2 - padX;
          const halfH = sh / 2 - padY;
          const scaleX = Math.abs(dx) > 0.001 ? halfW / Math.abs(dx) : 1e6;
          const scaleY = Math.abs(dy) > 0.001 ? halfH / Math.abs(dy) : 1e6;
          const k = Math.min(scaleX, scaleY);
          clampedX = cx + dx * k;
          clampedY = cy + dy * k;
        }

        el.style.display = 'flex';
        el.style.left = `${Math.round(clampedX)}px`;
        el.style.top = `${Math.round(clampedY)}px`;

        const ptr = el.querySelector('.task-arrow-pointer');
        if (ptr) {
          const deg = Math.round(angle * 180 / Math.PI);
          ptr.style.transform = `rotate(${deg}deg)`;
        }

        const titleEl = el.querySelector('.task-arrow-title');
        if (titleEl) titleEl.textContent = title;

        const distEl = el.querySelector('.task-arrow-dist');
        if (distEl) distEl.textContent = `${dist}m`;

        el.onclick = (e) => {
          e.stopPropagation();
          if (!g.follow || Math.hypot(g.cam.x - tx, g.cam.y - ty) < 4) {
            g.follow = true;
          } else {
            g.panTo(tx, ty, tz);
            clearTimeout(this._panTimer);
            this._panTimer = setTimeout(() => {
              if (g && g.state === 'play') g.follow = true;
            }, 3500);
          }
        };
      } catch (err) {
        console.warn('updateTaskGuide caught error:', err);
      }
    }
  }

  window.HUD = HUD;
})();
