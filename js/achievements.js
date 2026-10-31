// 巴别：失落的同位语 —— 搞笑成就系统与像素画图鉴
(function () {
  'use strict';

  // ──────────────────────── 16x16 极精细复古像素画 SVG 生成器 ────────────────────────
  function pixelSvg(pixels, palette) {
    // pixels 是一个 16 行字符串数组，每个字符对应 palette 中的颜色代码
    let rects = '';
    for (let y = 0; y < 16; y++) {
      const row = pixels[y] || '';
      for (let x = 0; x < 16; x++) {
        const ch = row[x];
        if (ch && ch !== '.' && palette[ch]) {
          rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[ch]}"/>`;
        }
      }
    }
    return `<svg class="pixel-achieve-icon" viewBox="0 0 16 16" width="36" height="36" style="image-rendering:pixelated; shape-rendering:crispEdges;" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
  }

  // 10 款搞笑成就专属 16x16 小像素画
  const PIXEL_ART = {
    // 1. 豆腐渣奇迹 (裂开的泥砖 + 汗滴)
    jerry_built: pixelSvg([
      '................',
      '....######......',
      '...#DDDDDD#.....',
      '..#DD#DDDDD#....',
      '..#DD.#DDDDD#...',
      '..#DDD.#DDDD#...',
      '..#DDDD.#DDD#...',
      '..#DDDD..#DD#...',
      '..#DDD.#..DD#...',
      '..#DD.#...DD#..B',
      '..#D.#....DD#.BB',
      '..##......DD#BBB',
      '..#DDDDDDDD##.BB',
      '..##########....',
      '................',
      '................'
    ], { '#': '#451a03', 'D': '#d97706', '.': null, 'B': '#38bdf8' }),

    // 2. 猴子捞月现代版 (井壁 + 双人垂直挂链)
    monkey_chain: pixelSvg([
      'WW............WW',
      'WW....#RR#....WW',
      'WW...#RRRR#...WW',
      'WW....#HH#....WW',
      'WW.....HH.....WW',
      'WW....#YY#....WW',
      'WW...#YYYY#...WW',
      'WW....#HH#....WW',
      'WW.....HH.....WW',
      'WW....#BB#....WW',
      'WW...#BBBB#...WW',
      'WW....#HH#....WW',
      'WW.....HH.....WW',
      'WW....#..#....WW',
      'WW............WW',
      'WWWWWWWWWWWWWWWW'
    ], { 'W': '#64748b', 'R': '#ef4444', 'Y': '#facc15', 'B': '#38bdf8', 'H': '#fde047', '#': '#1e293b' }),

    // 3. 飞檐走壁的工头 (泥砖屋顶 + 飞跃小人)
    rooftop_ninja: pixelSvg([
      '..........#R#...',
      '.........#RRR#..',
      '..........#H#...',
      '.......YY.HY....',
      '......YYYYYY....',
      '.....YYYYYYY....',
      '.......YY.YY....',
      '......YY...YY...',
      '......RR...RR...',
      '....########....',
      '...#DDDDDDDD#...',
      '..#DDDDDDDDDD#..',
      '.#DDDDDDDDDDDD#.',
      '################',
      '#WWWWWWWWWWWWWW#',
      '#WWWWWWWWWWWWWW#'
    ], { '#': '#1c1917', 'R': '#dc2626', 'H': '#fde047', 'Y': '#fbbf24', 'D': '#ea580c', 'W': '#d97706' }),

    // 4. 颈椎力量天花板 (头顶背负 6 层巨型石柱)
    titan_neck: pixelSvg([
      '....########....',
      '....#RRRRRR#....',
      '....#YYYYYY#....',
      '....#BBBBBB#....',
      '....#GGGGGG#....',
      '....#PPPPPP#....',
      '....#DDDDDD#....',
      '....########....',
      '.......##.......',
      '......#HH#......',
      '......#HH#......',
      '.....#SSSS#.....',
      '....#SSSSSS#....',
      '....#SS##SS#....',
      '.....##..##.....',
      '....####.####...'
    ], { '#': '#0f172a', 'R': '#ef4444', 'Y': '#f59e0b', 'B': '#0ea5e9', 'G': '#10b981', 'P': '#a855f7', 'D': '#d97706', 'H': '#fef08a', 'S': '#3b82f6' }),

    // 5. 摸鱼神级乐迷 (中世纪鲁特琴 + 漂浮金符)
    lute_trance: pixelSvg([
      '.........##..Y..',
      '........#WW#.YY.',
      '.......#WW#...Y.',
      '......#WW#......',
      '.....#WW#...Y...',
      '....#WW#...YY...',
      '...#BWW#....Y...',
      '..#BBWWBB#......',
      '.#BBBOOBBB#.....',
      '.#BBBOOBBB#.....',
      '#BBBBBBBBBB#....',
      '#BBBBBBBBBB#....',
      '.#BBBBBBBB#.....',
      '..#BBBBBB#......',
      '...######.......',
      '................'
    ], { '#': '#291807', 'W': '#a16207', 'B': '#d97706', 'O': '#180d04', 'Y': '#fbbf24' }),

    // 6. 拆迁办主任 (自由落体大木箱 + 冲击风尘)
    demolition_boss: pixelSvg([
      '...#########....',
      '..#WWWWWWWWW#...',
      '..#W#WWWWW#W#...',
      '..#WW#WWW#WW#...',
      '..#WWW#W#WWW#.W.',
      '..#WWWW#WWWW#.WW',
      '..#WWW#W#WWW#.W.',
      '..#WW#WWW#WW#...',
      '..#W#WWWWW#W#...',
      '..#WWWWWWWWW#...',
      '...#########....',
      '....W....W......',
      '...WWW..WWW.....',
      '..WWWWWWWWWW....',
      '..WW.WWWW.WW....',
      '................'
    ], { '#': '#2b1b0b', 'W': '#ca8a04' }),

    // 7. 八方旅人，但横着走 (8向指南针 + 漫步小靴)
    octopath_crab: pixelSvg([
      '.......##.......',
      '......#YY#......',
      '..#...#YY#...#..',
      '...#..#YY#..#...',
      '....#.####.#....',
      '..###......###..',
      '.#YYYY####YYYY#.',
      '..###..BB..###..',
      '....#.BBBB.#....',
      '...#..BBBB..#...',
      '..#...BB.BB..#..',
      '.....BB...BB....',
      '....####.####...',
      '................',
      '................',
      '................'
    ], { '#': '#1e293b', 'Y': '#eab308', 'B': '#dc2626' }),

    // 8. 大力出奇迹 (筋肉双臂举巨石 + 爆气星)
    hercules_hop: pixelSvg([
      '....########....',
      '..##GGGGGGGG##..',
      '.#GGGGGGGGGGGG#.',
      '.#GGGGGGGGGGGG#.',
      '..##GGGGGGGG##..',
      'Y...########...Y',
      'YY..#M####M#..YY',
      '.Y.#MM#..#MM#.Y.',
      '..#MMM#..#MMM#..',
      '..#MMM#..#MMM#..',
      '...#MM####MM#...',
      '....#MMMMMM#....',
      '.....######.....',
      '.....#....#.....',
      '....##....##....',
      '................'
    ], { '#': '#18181b', 'G': '#71717a', 'M': '#f59e0b', 'Y': '#fde047' }),

    // 9. 摸鱼艺术家 (遮阳躺椅 + 冒热气茶杯)
    loafing_art: pixelSvg([
      '............S...',
      '...........S....',
      '............S...',
      '..........####..',
      '..........#DD#..',
      '..........#DD#..',
      '..........####..',
      '..RRRRRRRRRRRR..',
      '...WWWWWWWWWW...',
      '....RRRRRRRR....',
      '.....WWWWWW.....',
      '......RRRR......',
      '.....#....#.....',
      '....#......#....',
      '...#........#...',
      '..##........##..'
    ], { '#': '#3f3f46', 'R': '#ef4444', 'W': '#f8fafc', 'D': '#b45309', 'S': '#cbd5e1' }),

    // 10. 通天梦碎还是成了？ (金色巴别螺旋塔 + 璀璨星宿)
    babel_ascendant: pixelSvg([
      '.......Y........',
      '......YYY...*...',
      '.......Y........',
      '.......##.......',
      '......#YY#......',
      '.....#YYYY#.....',
      '....#WWWWWW#....',
      '....#YYYYYY#.*..',
      '...#WWWWWWWW#...',
      '..#YYYYYYYYYY#..',
      '..#WWWWWWWWWW#..',
      '.#YYYYYYYYYYYY#.',
      '################',
      '#DDDDDDDDDDDDDD#',
      '#DDDDDDDDDDDDDD#',
      '################'
    ], { '#': '#1c1917', 'Y': '#fbbf24', 'W': '#f59e0b', 'D': '#92400e', '*': '#fef08a' })
  };

  // ──────────────────────── 搞笑成就数据定义 ────────────────────────
  const ACHIEVEMENTS_DATA = [
    {
      id: 'jerry_built',
      title: '豆腐渣奇迹',
      subtitle: 'Jerry-built Miracle',
      desc: '背负超过 8 块石砖走过狭窄房檐或楼梯开洞，货物被天花板无情挤落摔得稀碎。“巴比伦质监局表示强烈关切。”',
      hint: '背很多很多砖块，然后从屋檐、门梁或矮梯下穿过去！',
      iconKey: 'jerry_built'
    },
    {
      id: 'monkey_chain',
      title: '猴子捞月现代版',
      subtitle: 'Human Winch Chain',
      desc: '首次在枯井使用双人手拉手垂直绳降。“井底没有月亮，只有一块冰凉的石板和你拽得发酸的手腕。”',
      hint: '集齐阿什与阿卡德，在枯井旁点击协力或按 F 开启绞盘。',
      iconKey: 'monkey_chain'
    },
    {
      id: 'rooftop_ninja',
      title: '飞檐走壁的工头',
      subtitle: 'Rooftop Parkour Master',
      desc: '跳上村民瓦房顶部并在天桥连廊上狂奔。“既然屋顶是通的，谁还老老实实走下面大路啊？！”',
      hint: '沿着铁匠铺梯子或沙丘跳上民宅屋顶。',
      iconKey: 'rooftop_ninja'
    },
    {
      id: 'titan_neck',
      title: '颈椎力量天花板',
      subtitle: 'Titan Neck Syndrome',
      desc: '单人头顶背负超过 8 块石砖并保持平衡。“颈椎病？在通天塔工地上不存在的，因为头已经缩进胸腔了。”',
      hint: '让同一名角色拾取 8 块以上的石料。',
      iconKey: 'titan_neck'
    },
    {
      id: 'lute_trance',
      title: '摸鱼神级乐迷',
      subtitle: 'Lute Trance Hypnotist',
      desc: '聆听纯正古典鲁特琴 BGM 发呆超过 60 秒。“听着这清脆的琴音，我感觉自己已经升入天国了。”',
      hint: '打开音乐并在场景中静静聆听一分钟。',
      iconKey: 'lute_trance'
    },
    {
      id: 'demolition_boss',
      title: '拆迁办主任',
      subtitle: 'Demolition Supervisor',
      desc: '在云之回廊将巨型配重木箱推落露台。“轰隆一声，不仅砸开了机关，也砸碎了楼下工友的午休梦。”',
      hint: '在第 3 层云之回廊将大木箱推落砸地。',
      iconKey: 'demolition_boss'
    },
    {
      id: 'octopath_crab',
      title: '八方旅人，但横着走',
      subtitle: 'Octopath, But Side-scrolling',
      desc: '在伪装成横板的大世界里自由探索深度并走进民宅室内。“八方旅人看了直呼内行。”',
      hint: '按 W 或点击进门图标进入民宅工坊深处。',
      iconKey: 'octopath_crab'
    },
    {
      id: 'hercules_hop',
      title: '大力出奇迹',
      subtitle: 'Hercules In Disguise',
      desc: '头顶沉重货物完成一次高高跳跃。“物理学法则在此处临时休假一天。”',
      hint: '背着货物按下空格跳跃。',
      iconKey: 'hercules_hop'
    },
    {
      id: 'loafing_art',
      title: '摸鱼艺术家',
      subtitle: 'Master of Idling',
      desc: '全员聚集在井边停滞不动超过 25 秒。“工头在看着呢，装作在量地基的样子！”',
      hint: '带队在枯井旁边挂机放空 25 秒。',
      iconKey: 'loafing_art'
    },
    {
      id: 'babel_ascendant',
      title: '通天梦碎还是成了？',
      subtitle: 'Babel Ascendant',
      desc: '成功登上巨塔下一层。“上帝叹了口气，并悄悄给你们的字典加了 5000 个乱码单词。”',
      hint: '完成任意一层巨塔攀登并进入下一关。',
      iconKey: 'babel_ascendant'
    }
  ];

  // ──────────────────────── 成就管理器核心类 ────────────────────────
  class AchievementsManager {
    constructor() {
      this.list = ACHIEVEMENTS_DATA;
      this.unlockedMap = {};
      this.toastQueue = [];
      this.isShowingToast = false;
      this.load();
      this.initUI();
    }

    load() {
      try {
        const raw = localStorage.getItem('babel_achievements');
        if (raw) {
          this.unlockedMap = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('Failed to load achievements:', e);
        this.unlockedMap = {};
      }
    }

    save() {
      try {
        localStorage.setItem('babel_achievements', JSON.stringify(this.unlockedMap));
      } catch (e) {
        console.warn('Failed to save achievements:', e);
      }
    }

    isUnlocked(id) {
      return !!this.unlockedMap[id];
    }

    getUnlockedCount() {
      return Object.keys(this.unlockedMap).filter(k => this.list.some(a => a.id === k)).length;
    }

    unlock(id, isTest = false) {
      const ach = this.list.find(a => a.id === id);
      if (!ach) return false;
      if (this.unlockedMap[id] && !isTest) return false;

      this.unlockedMap[id] = {
        time: new Date().toLocaleString(),
        timestamp: Date.now()
      };
      this.save();
      this.updateBadge();

      // 音效触发
      if (window.SFX) {
        if (typeof SFX.playMiracle === 'function') SFX.playMiracle();
        else if (typeof SFX.playRelicPickup === 'function') SFX.playRelicPickup();
      }

      // 弹出成就横幅
      this.enqueueToast(ach);

      // 如果成就面板开着，刷新面板
      if (document.getElementById('achievement-modal')?.classList.contains('active')) {
        this.renderModal();
      }
      return true;
    }

    lock(id) {
      if (!this.unlockedMap[id]) return;
      delete this.unlockedMap[id];
      this.save();
      this.updateBadge();
      if (document.getElementById('achievement-modal')?.classList.contains('active')) {
        this.renderModal();
      }
    }

    unlockAll() {
      this.list.forEach(a => {
        this.unlockedMap[a.id] = {
          time: new Date().toLocaleString(),
          timestamp: Date.now()
        };
      });
      this.save();
      this.updateBadge();
      if (document.getElementById('achievement-modal')?.classList.contains('active')) {
        this.renderModal();
      }
    }

    resetAll() {
      this.unlockedMap = {};
      this.save();
      this.updateBadge();
      if (document.getElementById('achievement-modal')?.classList.contains('active')) {
        this.renderModal();
      }
    }

    enqueueToast(ach) {
      this.toastQueue.push(ach);
      if (!this.isShowingToast) {
        this.processNextToast();
      }
    }

    processNextToast() {
      if (!this.toastQueue.length) {
        this.isShowingToast = false;
        return;
      }
      this.isShowingToast = true;
      const ach = this.toastQueue.shift();
      const container = document.getElementById('achievement-toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'achievement-toast enter';
      const iconSvg = PIXEL_ART[ach.iconKey] || '';

      toast.innerHTML = `
        <div class="toast-glow"></div>
        <div class="toast-icon-wrap">${iconSvg}</div>
        <div class="toast-body">
          <div class="toast-header">
            <span class="toast-tag">🏆 搞笑成就解锁！</span>
            <span class="toast-sparkle">✨</span>
          </div>
          <div class="toast-title">${ach.title}</div>
          <div class="toast-desc">${ach.desc}</div>
        </div>
      `;

      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.remove('enter');
        toast.classList.add('visible');
      }, 20);

      setTimeout(() => {
        toast.classList.remove('visible');
        toast.classList.add('leave');
        setTimeout(() => {
          toast.remove();
          this.processNextToast();
        }, 500);
      }, 4200);
    }

    updateBadge() {
      const count = this.getUnlockedCount();
      const total = this.list.length;
      const badges = document.querySelectorAll('.achieve-count-badge');
      badges.forEach(b => {
        b.textContent = `${count}/${total}`;
      });
    }

    initUI() {
      // 1. Toast 容器
      if (!document.getElementById('achievement-toast-container')) {
        const c = document.createElement('div');
        c.id = 'achievement-toast-container';
        document.body.appendChild(c);
      }

      // 2. 成就图鉴模态窗
      if (!document.getElementById('achievement-modal')) {
        const m = document.createElement('div');
        m.id = 'achievement-modal';
        m.className = 'achieve-modal-overlay';
        m.innerHTML = `
          <div class="achieve-modal-box">
            <div class="achieve-modal-header">
              <div class="modal-title-row">
                <span class="modal-trophy">🏆</span>
                <h2>巴别巨塔 · 搞笑成就图鉴</h2>
                <span class="modal-sub">全像素画收藏馆</span>
              </div>
              <button class="achieve-close-btn" id="btn-close-achieve" title="关闭 (Esc)">✕</button>
            </div>
            <div class="achieve-progress-bar-wrap">
              <div class="achieve-progress-label">
                <span>解锁进度</span>
                <b id="achieve-progress-text">0 / 10 (0%)</b>
              </div>
              <div class="achieve-progress-track">
                <div class="achieve-progress-fill" id="achieve-progress-fill" style="width: 0%;"></div>
              </div>
            </div>
            <div class="achieve-filter-tabs">
              <button class="filter-tab active" data-filter="all">全部 (<span id="tab-cnt-all">10</span>)</button>
              <button class="filter-tab" data-filter="unlocked">已达成 (<span id="tab-cnt-unlocked">0</span>)</button>
              <button class="filter-tab" data-filter="locked">未达成 (<span id="tab-cnt-locked">10</span>)</button>
            </div>
            <div class="achieve-cards-grid" id="achieve-cards-grid">
              <!-- 动态渲染 -->
            </div>
          </div>
        `;
        document.body.appendChild(m);

        // 关闭事件
        m.querySelector('#btn-close-achieve').onclick = () => this.closeModal();
        m.onclick = (e) => {
          if (e.target === m) this.closeModal();
        };

        // 筛选标签事件
        m.querySelectorAll('.filter-tab').forEach(tab => {
          tab.onclick = () => {
            m.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.renderModal(tab.dataset.filter);
          };
        });
      }

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeModal();
        }
      });

      this.updateBadge();
    }

    openModal() {
      const m = document.getElementById('achievement-modal');
      if (!m) return;
      m.classList.add('active');
      this.renderModal();
    }

    closeModal() {
      const m = document.getElementById('achievement-modal');
      if (m) m.classList.remove('active');
    }

    renderModal(filter = 'all') {
      const grid = document.getElementById('achieve-cards-grid');
      const progressText = document.getElementById('achieve-progress-text');
      const progressFill = document.getElementById('achieve-progress-fill');
      if (!grid) return;

      const total = this.list.length;
      const unlockedCount = this.getUnlockedCount();
      const pct = Math.round((unlockedCount / total) * 100);

      if (progressText) progressText.textContent = `${unlockedCount} / ${total} (${pct}%)`;
      if (progressFill) progressFill.style.width = `${pct}%`;

      document.getElementById('tab-cnt-all').textContent = total;
      document.getElementById('tab-cnt-unlocked').textContent = unlockedCount;
      document.getElementById('tab-cnt-locked').textContent = total - unlockedCount;

      grid.innerHTML = '';

      this.list.forEach(ach => {
        const isUnlocked = this.isUnlocked(ach.id);
        if (filter === 'unlocked' && !isUnlocked) return;
        if (filter === 'locked' && isUnlocked) return;

        const info = this.unlockedMap[ach.id];
        const card = document.createElement('div');
        card.className = `achieve-card ${isUnlocked ? 'unlocked' : 'locked'}`;

        const iconSvg = PIXEL_ART[ach.iconKey] || '';

        card.innerHTML = `
          <div class="card-icon-box">
            ${iconSvg}
            ${isUnlocked ? '<span class="status-stamp">✓</span>' : '<span class="status-lock">🔒</span>'}
          </div>
          <div class="card-content">
            <div class="card-header">
              <h3 class="card-title">${ach.title}</h3>
              <span class="card-sub">${ach.subtitle}</span>
            </div>
            <p class="card-desc">${isUnlocked ? ach.desc : (ach.hint ? '💡 线索：' + ach.hint : '??? 尚未解锁')}</p>
            <div class="card-footer">
              ${isUnlocked ? `<span class="card-time">📅 解锁于 ${info?.time || '未知时间'}</span>` : `<span class="card-locked-tag">待发掘</span>`}
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
    }
  }

  window.PIXEL_ART = PIXEL_ART;
  window.Achievements = new AchievementsManager();
})();
