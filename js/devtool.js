// 巴别：失落的同位语 —— 开发者调参工具与成就管理面板
(function () {
  'use strict';

  // ──────────────────────── 运行时参数全局对象 ────────────────────────
  window.DEV_PARAMS = {
    timeScale: 1.0,
    speedMul: 1.0,
    jumpMul: 1.0,
    maxCarry: 12,
    towerHeightScale: 1.0,
    infiniteFood: false,
    infiniteStone: false,
    forceWallAlpha: false
  };

  class DevToolManager {
    constructor() {
      this.isOpen = false;
      this.activeTab = 'params'; // 'params' | 'achieve' | 'teleport'
      this.panel = null;
      this.init();
    }

    init() {
      // 快捷键 ~ (Backquote) 或 F1 呼出开发者面板
      window.addEventListener('keydown', (e) => {
        if (e.key === '`' || e.key === '~' || e.key === 'F1') {
          e.preventDefault();
          this.toggle();
        }
      });

      this.createPanel();
    }

    createPanel() {
      if (document.getElementById('devtool-panel')) return;

      const p = document.createElement('div');
      p.id = 'devtool-panel';
      p.className = 'devtool-window';
      p.innerHTML = `
        <div class="devtool-header" id="devtool-drag-handle">
          <div class="devtool-title">
            <span class="dev-icon">🛠️</span>
            <b>巴别开发工坊 · 调参器与成就中枢</b>
            <span class="dev-build-tag">v1.1.0 #revamp</span>
          </div>
          <button class="devtool-close-btn" id="btn-devtool-close" title="关闭面板 (~ 或 Esc)">✕</button>
        </div>

        <div class="devtool-tabs">
          <button class="dev-tab active" data-tab="params">⚙️ 参数调节</button>
          <button class="dev-tab" data-tab="achieve">🏆 成就管理 (<span class="achieve-count-badge">0/10</span>)</button>
          <button class="dev-tab" data-tab="teleport">🚀 传送与队伍</button>
        </div>

        <div class="devtool-body">
          <!-- 1. 参数调节 TAB -->
          <div class="dev-tab-content active" id="tab-content-params">
            <div class="dev-group">
              <label class="dev-label">
                <span>⏱️ 游戏速度 (Time Scale): <b id="val-timescale">1.0x</b></span>
              </label>
              <div class="dev-btn-row">
                <button class="dev-quick-btn" data-ts="0.25">0.25x 慢放</button>
                <button class="dev-quick-btn" data-ts="0.5">0.5x 半速</button>
                <button class="dev-quick-btn active" data-ts="1.0">1.0x 正常</button>
                <button class="dev-quick-btn" data-ts="2.0">2.0x 疾风</button>
                <button class="dev-quick-btn" data-ts="4.0">4.0x 超快</button>
              </div>
              <input type="range" class="dev-slider" id="slider-timescale" min="0.1" max="5.0" step="0.1" value="1.0" />
            </div>

            <div class="dev-group">
              <label class="dev-label">
                <span>🏃 角色移动速度倍率: <b id="val-speedmul">1.0x</b></span>
              </label>
              <input type="range" class="dev-slider" id="slider-speedmul" min="0.5" max="3.5" step="0.1" value="1.0" />
            </div>

            <div class="dev-group">
              <label class="dev-label">
                <span>🦘 垂直起跳高度倍率: <b id="val-jumpmul">1.0x</b></span>
              </label>
              <input type="range" class="dev-slider" id="slider-jumpmul" min="0.5" max="2.5" step="0.1" value="1.0" />
            </div>

            <div class="dev-group">
              <label class="dev-label">
                <span>🧱 头顶背负上限 (Stack Limit): <b id="val-maxcarry">12 块</b></span>
              </label>
              <input type="range" class="dev-slider" id="slider-maxcarry" min="1" max="35" step="1" value="12" />
            </div>

            <div class="dev-group">
              <label class="dev-label">
                <span>🏰 巴别塔层高调节 (Floor Height Scale): <b id="val-towerheight">1.00x</b></span>
              </label>
              <div class="dev-btn-row">
                <button class="dev-quick-btn" data-th="0.8">0.8x 紧凑</button>
                <button class="dev-quick-btn active" data-th="1.0">1.0x 标准</button>
                <button class="dev-quick-btn" data-th="1.2">1.2x 宏伟</button>
                <button class="dev-quick-btn" data-th="1.5">1.5x 崇高</button>
              </div>
              <input type="range" class="dev-slider" id="slider-towerheight" min="0.7" max="1.8" step="0.05" value="1.0" />
            </div>

            <div class="dev-group">
              <label class="dev-label">
                <span>🌊 灭世大洪水控制 (Flood Control): <b id="val-floodstatus">就绪中</b></span>
              </label>
              <div class="dev-btn-row">
                <button class="dev-quick-btn" id="btn-flood-now" style="color: #67e8f9;">⚡ 立即爆发</button>
                <button class="dev-quick-btn" id="btn-flood-pause">⏸️ 暂停/恢复</button>
                <button class="dev-quick-btn" id="btn-flood-reset" style="color: #f87171;">🛑 排干复位</button>
              </div>
              <div style="font-size: 11px; margin-top: 4px; color: #a3a3a3;">水位上涨速率: <span id="val-floodspeed">0.065 m/s</span></div>
              <input type="range" class="dev-slider" id="slider-floodspeed" min="0.01" max="0.35" step="0.01" value="0.065" />
            </div>

            <div class="dev-divider"></div>

            <div class="dev-toggle-row">
              <label class="dev-checkbox-wrap">
                <input type="checkbox" id="chk-inf-food" />
                <span>🍞 饱食度锁死 100% (不掉饥饿)</span>
              </label>
              <label class="dev-checkbox-wrap">
                <input type="checkbox" id="chk-inf-stone" />
                <span>⚒️ 无限石料 / 瞬间筑桥</span>
              </label>
              <label class="dev-checkbox-wrap">
                <input type="checkbox" id="chk-force-alpha" />
                <span>👁️ 全图建筑强制智能半透 (透视)</span>
              </label>
            </div>
          </div>

          <!-- 2. 成就管理 TAB -->
          <div class="dev-tab-content" id="tab-content-achieve">
            <div class="dev-action-bar">
              <div class="dev-action-title">成就快速控制台</div>
              <div class="dev-action-btns">
                <button class="btn-dev-action gold" id="btn-dev-unlock-all">✨ 一键全部解锁</button>
                <button class="btn-dev-action red" id="btn-dev-reset-all">🔒 全部清空重置</button>
              </div>
            </div>
            <div class="dev-achieve-list" id="dev-achieve-list">
              <!-- 由 JS 渲染成就测试卡片 -->
            </div>
          </div>

          <!-- 3. 传送与队伍 TAB -->
          <div class="dev-tab-content" id="tab-content-teleport">
            <div class="dev-section-title">📍 关卡与关键地点即时传送</div>
            <div class="dev-teleport-grid">
              <button class="btn-teleport" data-x="10" data-y="0.1" data-lv="0">🌴 L1 沙漠绿洲村庄</button>
              <button class="btn-teleport" data-x="29.5" data-y="0.5" data-lv="0">🕳️ L1 枯井绞盘顶</button>
              <button class="btn-teleport" data-x="29.5" data-y="-7.5" data-lv="0">🗝️ L1 枯井底部地宫</button>
              <button class="btn-teleport" data-x="19.0" data-y="4.5" data-lv="0">🌉 L1 屋顶连廊天桥</button>
              <button class="btn-teleport" data-lv="1">🌊 L2 索勒斯水道升降机</button>
              <button class="btn-teleport" data-lv="2">☁️ L3 云之回廊推箱露台</button>
              <button class="btn-teleport" data-lv="3">🏛️ L4 辩证回廊圣殿</button>
              <button class="btn-teleport" data-lv="4">👑 L5 巨塔塔顶通关</button>
            </div>

            <div class="dev-divider"></div>

            <div class="dev-section-title">👥 队伍召唤与货物调试</div>
            <div class="dev-squad-actions">
              <button class="btn-squad-action gold" id="btn-spawn-full-team">👥 召集全员 5 位同伴入队</button>
              <button class="btn-squad-action" id="btn-spawn-cargo-5">🧱 生成 5 块石砖</button>
              <button class="btn-squad-action" id="btn-spawn-cargo-15">🗼 生成 15 块石砖 (超高石柱挤落测试)</button>
              <button class="btn-squad-action" id="btn-fill-food">🍞 队伍口粮立即补满 (100%)</button>
              <button class="btn-squad-action red" id="btn-clear-dropped">🧹 清理场景积存掉落物</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(p);
      this.panel = p;
      this.bindEvents();
      this.makeDraggable();
    }

    bindEvents() {
      const p = this.panel;
      if (!p) return;

      // 关闭按钮
      p.querySelector('#btn-devtool-close').onclick = () => this.close();

      // Tab 切换
      p.querySelectorAll('.dev-tab').forEach(tab => {
        tab.onclick = () => {
          p.querySelectorAll('.dev-tab').forEach(t => t.classList.remove('active'));
          p.querySelectorAll('.dev-tab-content').forEach(c => c.classList.remove('active'));
          tab.classList.add('active');
          const target = p.querySelector(`#tab-content-${tab.dataset.tab}`);
          if (target) target.classList.add('active');
          if (tab.dataset.tab === 'achieve') this.renderDevAchieveList();
        };
      });

      // 1. 参数调节绑定
      const sliderTS = p.querySelector('#slider-timescale');
      const valTS = p.querySelector('#val-timescale');
      const setTimeScale = (v) => {
        window.DEV_PARAMS.timeScale = parseFloat(v);
        valTS.textContent = `${window.DEV_PARAMS.timeScale.toFixed(2)}x`;
        sliderTS.value = window.DEV_PARAMS.timeScale;
        p.querySelectorAll('.dev-quick-btn').forEach(b => {
          b.classList.toggle('active', Math.abs(parseFloat(b.dataset.ts) - window.DEV_PARAMS.timeScale) < 0.05);
        });
      };
      sliderTS.oninput = (e) => setTimeScale(e.target.value);
      p.querySelectorAll('.dev-quick-btn').forEach(b => {
        b.onclick = () => setTimeScale(b.dataset.ts);
      });

      // 移动速度倍率
      const sliderSpd = p.querySelector('#slider-speedmul');
      const valSpd = p.querySelector('#val-speedmul');
      sliderSpd.oninput = (e) => {
        window.DEV_PARAMS.speedMul = parseFloat(e.target.value);
        valSpd.textContent = `${window.DEV_PARAMS.speedMul.toFixed(1)}x`;
      };

      // 跳跃高度倍率
      const sliderJump = p.querySelector('#slider-jumpmul');
      const valJump = p.querySelector('#val-jumpmul');
      sliderJump.oninput = (e) => {
        window.DEV_PARAMS.jumpMul = parseFloat(e.target.value);
        valJump.textContent = `${window.DEV_PARAMS.jumpMul.toFixed(1)}x`;
      };

      // 堆叠上限
      const sliderCarry = p.querySelector('#slider-maxcarry');
      const valCarry = p.querySelector('#val-maxcarry');
      sliderCarry.oninput = (e) => {
        window.DEV_PARAMS.maxCarry = parseInt(e.target.value, 10);
        valCarry.textContent = `${window.DEV_PARAMS.maxCarry} 块`;
      };

      // 塔身层高调节
      const sliderTH = p.querySelector('#slider-towerheight');
      const valTH = p.querySelector('#val-towerheight');
      const setTowerHeight = (v) => {
        const val = parseFloat(v);
        const scale = window.TOWER_CONFIG ? window.TOWER_CONFIG.setHeightScale(val) : val;
        window.DEV_PARAMS.towerHeightScale = scale;
        valTH.textContent = `${scale.toFixed(2)}x`;
        sliderTH.value = scale;
        p.querySelectorAll('[data-th]').forEach(b => {
          b.classList.toggle('active', Math.abs(parseFloat(b.dataset.th) - scale) < 0.05);
        });
      };
      p.querySelectorAll('[data-th]').forEach(b => {
        b.onclick = () => setTowerHeight(b.dataset.th);
      });
      sliderTH.oninput = (e) => setTowerHeight(e.target.value);

      // 灭世大洪水控制
      const btnFloodNow = p.querySelector('#btn-flood-now');
      const btnFloodPause = p.querySelector('#btn-flood-pause');
      const btnFloodReset = p.querySelector('#btn-flood-reset');
      const sliderFloodSpeed = p.querySelector('#slider-floodspeed');
      const valFloodSpeed = p.querySelector('#val-floodspeed');
      const valFloodStatus = p.querySelector('#val-floodstatus');

      if (btnFloodNow) {
        btnFloodNow.onclick = () => {
          if (window.FLOOD_SYSTEM) {
            window.FLOOD_SYSTEM.timer = window.FLOOD_SYSTEM.riseDelay;
            window.FLOOD_SYSTEM.warned = true;
            window.FLOOD_SYSTEM.started = false;
            window.FLOOD_SYSTEM.state = 'waiting';
            if (valFloodStatus) valFloodStatus.textContent = '已强制引发爆发！';
          }
        };
      }
      if (btnFloodPause) {
        btnFloodPause.onclick = () => {
          if (window.FLOOD_SYSTEM) {
            if (window.FLOOD_SYSTEM.state === 'paused') {
              window.FLOOD_SYSTEM.state = 'rising';
              if (valFloodStatus) valFloodStatus.textContent = '涨水中';
            } else {
              window.FLOOD_SYSTEM.state = 'paused';
              if (valFloodStatus) valFloodStatus.textContent = '已暂停';
            }
          }
        };
      }
      if (btnFloodReset) {
        btnFloodReset.onclick = () => {
          if (window.FLOOD_SYSTEM) {
            window.FLOOD_SYSTEM.timer = 0;
            window.FLOOD_SYSTEM.waterY = -2.5;
            window.FLOOD_SYSTEM.state = 'waiting';
            window.FLOOD_SYSTEM.warned = false;
            window.FLOOD_SYSTEM.started = false;
            if (valFloodStatus) valFloodStatus.textContent = '已排干复位 (倒计时 2.5分)';
          }
        };
      }
      if (sliderFloodSpeed) {
        sliderFloodSpeed.oninput = (e) => {
          const spd = parseFloat(e.target.value);
          if (window.FLOOD_SYSTEM) window.FLOOD_SYSTEM.riseSpeed = spd;
          if (valFloodSpeed) valFloodSpeed.textContent = `${spd.toFixed(3)} m/s`;
        };
      }

      // 饱食度锁死
      p.querySelector('#chk-inf-food').onchange = (e) => {
        window.DEV_PARAMS.infiniteFood = e.target.checked;
        if (e.target.checked && window.game) window.game.food = 100;
      };

      // 无限石料
      p.querySelector('#chk-inf-stone').onchange = (e) => {
        window.DEV_PARAMS.infiniteStone = e.target.checked;
      };

      // 强制建筑半透
      p.querySelector('#chk-force-alpha').onchange = (e) => {
        window.DEV_PARAMS.forceWallAlpha = e.target.checked;
      };

      // 2. 成就一键操作
      p.querySelector('#btn-dev-unlock-all').onclick = () => {
        if (window.Achievements) {
          window.Achievements.unlockAll();
          this.renderDevAchieveList();
        }
      };
      p.querySelector('#btn-dev-reset-all').onclick = () => {
        if (window.Achievements) {
          window.Achievements.resetAll();
          this.renderDevAchieveList();
        }
      };

      // 3. 传送与队伍
      p.querySelectorAll('.btn-teleport').forEach(btn => {
        btn.onclick = () => {
          const g = window.game;
          if (!g) return;
          const targetLv = parseInt(btn.dataset.lv, 10);
          if (targetLv !== g.currentLevel) {
            g.startGame(targetLv);
          }
          if (btn.dataset.x !== undefined && btn.dataset.y !== undefined) {
            const tx = parseFloat(btn.dataset.x);
            const ty = parseFloat(btn.dataset.y);
            const lead = g.leader || g.units.find(u => u.recruited && !u.fainted) || g.units[0];
            if (lead) {
              lead.x = tx;
              lead.y = ty;
              lead.vx = 0;
              lead.vy = 0;
              lead.grounded = null;
              g.cam.x = tx;
              g.cam.y = ty;
              g.camT.x = tx;
              g.camT.y = ty;
            }
          }
        };
      });

      // 召集全部同伴
      p.querySelector('#btn-spawn-full-team').onclick = () => {
        const g = window.game;
        if (!g) return;
        const lead = g.leader || g.units.find(u => u.recruited && !u.fainted) || g.units[0];
        if (!lead) return;

        ['ash', 'akad', 'enki', 'bani', 'sofi', 'io', 'ghar', 'ul'].forEach((id, idx) => {
          let u = g.units.find(unit => unit.id === id);
          if (!u) {
            u = new ENT.Unit(g, id, lead.x + (idx + 1) * 0.8, lead.y);
            u.uid = g.uidSeq++;
            g.units.push(u);
          }
          u.recruited = true;
          u.fainted = false;
          if (u !== lead) {
            u.x = lead.x + (idx % 2 === 0 ? 1 : -1) * (0.8 + idx * 0.4);
            u.y = lead.y;
            u.vx = 0;
            u.vy = 0;
            u.grounded = null;
          }
        });
        g.leader = lead;
        g.hud.dirty = true;
        g.hud.banner('✨ 巴别工兵远征团 8 位不同时代与语系同伴已全员集结入编！', 'good');
        if (window.SFX && SFX.playMiracle) SFX.playMiracle();
      };

      // 生成石料
      const spawnStones = (count) => {
        const g = window.game;
        if (!g) return;
        const lead = g.leader || g.units.find(u => u.recruited && !u.fainted) || g.units[0];
        const baseX = lead ? lead.x : 10;
        const baseY = lead ? lead.y + 1.2 : 2;
        for (let i = 0; i < count; i++) {
          setTimeout(() => {
            const it = g.spawnItem('stone', baseX + (Math.random() - 0.5) * 1.5, baseY + i * 0.4 + 0.5);
            it.vx = (Math.random() - 0.5) * 2;
            it.vy = 2 + Math.random() * 2;
          }, i * 40);
        }
      };
      p.querySelector('#btn-spawn-cargo-5').onclick = () => spawnStones(5);
      p.querySelector('#btn-spawn-cargo-15').onclick = () => spawnStones(15);

      // 口粮补满
      p.querySelector('#btn-fill-food').onclick = () => {
        if (window.game) {
          window.game.food = 100;
          window.game.hud.banner('🍞 口粮已补充完毕 (100%)', 'good');
        }
      };

      // 清理地面货物
      p.querySelector('#btn-clear-dropped').onclick = () => {
        if (window.game && window.game.items) {
          window.game.items.forEach(it => it.remove());
          window.game.items = [];
          window.game.hud.banner('🧹 已清理场景所有掉落散件', 'warn');
        }
      };
    }

    makeDraggable() {
      const p = this.panel;
      const handle = p.querySelector('#devtool-drag-handle');
      if (!p || !handle) return;

      let isDragging = false;
      let startX, startY, initX, initY;

      handle.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = p.getBoundingClientRect();
        initX = rect.left;
        initY = rect.top;
        p.style.right = 'auto';
        p.style.bottom = 'auto';
        p.style.left = `${initX}px`;
        p.style.top = `${initY}px`;
        e.preventDefault();
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        p.style.left = `${Math.max(10, Math.min(window.innerWidth - p.offsetWidth - 10, initX + dx))}px`;
        p.style.top = `${Math.max(10, Math.min(window.innerHeight - p.offsetHeight - 10, initY + dy))}px`;
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }

    renderDevAchieveList() {
      const container = this.panel?.querySelector('#dev-achieve-list');
      if (!container || !window.Achievements) return;

      container.innerHTML = '';
      window.Achievements.list.forEach(ach => {
        const isUnlocked = window.Achievements.isUnlocked(ach.id);
        const iconSvg = window.PIXEL_ART ? window.PIXEL_ART[ach.iconKey] || '' : '';

        const item = document.createElement('div');
        item.className = `dev-achieve-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        item.innerHTML = `
          <div class="dev-achieve-icon-wrap">${iconSvg}</div>
          <div class="dev-achieve-info">
            <div class="dev-achieve-name-row">
              <span class="dev-achieve-title">${ach.title}</span>
              <span class="dev-achieve-tag ${isUnlocked ? 'tag-green' : 'tag-gray'}">${isUnlocked ? '已达成 ✅' : '未解锁 🔒'}</span>
            </div>
            <div class="dev-achieve-desc">${ach.desc}</div>
          </div>
          <div class="dev-achieve-ctrls">
            <button class="btn-dev-trigger" title="模拟真实解锁过程（播放音效与全屏横幅）">⚡ 测试解锁</button>
            <button class="btn-dev-relock" title="重新锁定以便再次测试">🔒 锁定</button>
          </div>
        `;

        item.querySelector('.btn-dev-trigger').onclick = () => {
          window.Achievements.unlock(ach.id, true);
          this.renderDevAchieveList();
        };

        item.querySelector('.btn-dev-relock').onclick = () => {
          window.Achievements.lock(ach.id);
          this.renderDevAchieveList();
        };

        container.appendChild(item);
      });
    }

    toggle() {
      if (this.isOpen) this.close();
      else this.open();
    }

    open() {
      if (!this.panel) this.createPanel();
      this.panel.classList.add('active');
      this.isOpen = true;
      if (this.activeTab === 'achieve') this.renderDevAchieveList();
    }

    close() {
      if (this.panel) this.panel.classList.remove('active');
      this.isOpen = false;
    }
  }

  window.DevTool = new DevToolManager();
})();
