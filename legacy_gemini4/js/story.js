// Left-Side Event Banner Feed & Dynamic Squad-Composition Objective Director for 《巴别：失落的同位语》
class StoryDirector {
  constructor() {
    this.triggeredBeats = new Set();
  }

  reset() {
    this.triggeredBeats.clear();
    const feed = document.getElementById('side-event-feed');
    if (feed) feed.innerHTML = '';
  }

  // Appends a sliding Event Banner to the Left-Side Feed (#side-event-feed)
  showBanner(speaker, text, duration = 8000, styleType = 'normal') {
    const feed = document.getElementById('side-event-feed');
    if (!feed) return;

    // Limit to 3 visible side banners at a time
    while (feed.children.length >= 3) {
      feed.removeChild(feed.firstElementChild);
    }

    const card = document.createElement('div');
    const styleClass = styleType === 'warn' ? ' warn-banner' : (styleType === 'gold' ? ' gold-banner' : '');
    card.className = `side-event-banner${styleClass}`;
    card.innerHTML = `
      <div class="side-event-speaker">${speaker}</div>
      <div class="side-event-text">${text}</div>
    `;
    feed.appendChild(card);

    setTimeout(() => {
      card.classList.add('fade-out');
      setTimeout(() => {
        if (card.parentNode === feed) feed.removeChild(card);
      }, 360);
    }, duration);
  }

  triggerRelicStory(relicIndex, finderUnit) {
    const relicDialogues = [
      {
        title: '🥫 冷库奇迹 #1 · 精加工密封罐头 (+1 🃏)',
        text: `${finderUnit.name} 发掘出印着现代条码的罐头：“☼ Kael-Ur… 为什么远古石壁里封存着未来的精加工食物？”`
      },
      {
        title: '📻 冷库奇迹 #2 · 千里传音机械 (+1 🃏)',
        text: `${finderUnit.name} 拾起仍在发报的电台：“♒ Logos… 这座塔不是通往天堂，而是保存‘另一种文明’的巨型冷库！”`
      },
      {
        title: '🧬 冷库奇迹 #3 · 疑似未来的人类残影 (+1 🃏)',
        text: `柱廊暗室里沉睡着休眠舱：“▲ Ma’at… 每一次文明因拒绝倾听而毁灭，火种都会封入塔中，等待学会握手的人……”`
      },
      {
        title: '📜 冷库奇迹 #4 · 失落的同位语残卷 (+1 🃏)',
        text: `${finderUnit.name} 展开残卷：“❖ Lia-Sae! 无论符号分化为 ☼、♒、▲、◎、𓂀、❖，只要电路般的传语链不断，人类的手就不会松开。”`
      }
    ];
    const entry = relicDialogues[relicIndex % relicDialogues.length];
    this.showBanner(entry.title, entry.text, 9000, 'gold');
  }

  // Updates the Left-Side Objective Checklist based on the next locked Gate & Squad Composition!
  updateObjectiveChecklist(game) {
    const listEl = document.getElementById('objective-checklist');
    if (!listEl || !game || !game.crowd || !game.tower) return;

    const crowd = game.crowd;
    const activeSquad = crowd.units.filter((u) => u.alive && u.faction === 'PLAYER' && !u.inWell);

    if (!crowd.wellRescued) {
      listEl.innerHTML = `
        <div class="obj-item">◈ 鼠标左键点击水井或按 [Q] 捞出建筑工巴尼</div>
        <div class="obj-item done">✓ 双语中介艾什 [☼+♒] 已就位</div>
      `;
      return;
    }

    // Find next locked gate
    const nextGate = game.tower.languageGates.find((g) => !g.unlocked);
    if (!nextGate) {
      listEl.innerHTML = `
        <div class="obj-item done">✓ 全部六重登塔机关检定已突破！</div>
        <div class="obj-item">◈ 带领幸存同伴攀上 160m 银河穹顶触碰上帝之手</div>
      `;
      return;
    }

    const itemsHTML = [];
    // 1. Language Symbol Requirement
    const presentLangs = new Set();
    activeSquad.forEach((u) => {
      if (u.commandUnderstood || crowd.rosettaTimer > 0) {
        u.langs.forEach((l) => presentLangs.add(l));
      }
    });
    const reqSyms = nextGate.reqLangs.map((l) => window.LANG_CONFIG[l].symbol).join(' + ');
    const langsMet = nextGate.reqLangs.every((l) => presentLangs.has(l)) || crowd.rosettaTimer > 0;
    itemsHTML.push(
      `<div class="obj-item ${langsMet ? 'done' : ''}">${langsMet ? '✓' : '◈'} 语言链电路连通符号：[${reqSyms}]</div>`
    );

    // 2. Specific Tricky Squad Composition Condition (刁钻队伍构成条件)
    if (nextGate.compCheck) {
      const checkRes = nextGate.compCheck(crowd, activeSquad, nextGate);
      itemsHTML.push(
        `<div class="obj-item ${checkRes.passed ? 'done' : (checkRes.isWarning ? 'warn' : '')}">${checkRes.passed ? '✓' : (checkRes.isWarning ? '⚠️' : '◈')} ${checkRes.label}</div>`
      );
    }

    // 3. Sub-Mechanisms (Rune Steles 0/3, Counterweight Crate, or Brown Pressure Plate)
    if (nextGate.steles && nextGate.steles.length > 0) {
      const activeCount = nextGate.steles.filter((st) => st.activated).length;
      const allSteles = activeCount >= nextGate.steles.length;
      itemsHTML.push(
        `<div class="obj-item ${allSteles ? 'done' : ''}">${allSteles ? '✓' : '◈'} 激活本层传语译码碑：(${activeCount}/${nextGate.steles.length})</div>`
      );
    } else {
      itemsHTML.push(
        `<div class="obj-item ${nextGate.platePressed ? 'done' : ''}">${nextGate.platePressed ? '✓' : '◈'} 踩下侧翼棕红重力压板或推上配重木箱</div>`
      );
    }

    listEl.innerHTML = itemsHTML.join('');
  }

  checkProgression(leadS, maxAltitude, game) {
    const tierTag = document.getElementById('chapter-tier-tag');
    const chLabel = document.getElementById('chapter-label');

    if (!this.triggeredBeats.has('BEAT_VILLAGE') && leadS >= 0) {
      this.triggeredBeats.add('BEAT_VILLAGE');
      if (tierTag) tierTag.textContent = '第一章 · 地基与废墟';
      if (chLabel) chLabel.textContent = '荒野水井村落 · 出发的地方';
      this.showBanner(
        '📜 【序幕 · 符号分化与水井救援】',
        '语言分化为神圣几何符号（☼/♒/▲/◎/𓂀/❖）！左键点击井底的【建筑工·巴尼】或按 [Q] 将其捞出。顶部固定队员栏会通过电路脉冲展示传语过程！',
        9000
      );
    }

    if (!this.triggeredBeats.has('BEAT_OUTSKIRTS') && leadS >= 0.075) {
      this.triggeredBeats.add('BEAT_OUTSKIRTS');
      if (tierTag) tierTag.textContent = '第二章 · 水道区';
      if (chLabel) chLabel.textContent = '郊外断桥河谷 · 流动的生活';
      this.showBanner(
        '🌊 【水道区 · 实体背负与筑桥检定】',
        '前方水道木桥断裂！注意队员头顶竖向堆叠的【🪵原木/🪨石砖】，必须让【🔨建筑工】与背着木石的【💪大力士】同行才能架桥渡河！',
        8500
      );
    }

    if (!this.triggeredBeats.has('BEAT_CITY') && leadS >= 0.145) {
      this.triggeredBeats.add('BEAT_CITY');
      if (tierTag) tierTag.textContent = '第三章 · 多语言集市';
      if (chLabel) chLabel.textContent = '塔基城市聚居区 · 相遇与协作';
      this.showBanner(
        '🏛️ 【多语言集市 · 配重木箱与双语祭司】',
        '进入巴别塔基座集市！城门需要【总配重 ≥ 5（大力士背满重物或推动📦配重木箱压住棕红踏板）+ ☼↔♒ 电路连通】方可开启！',
        8500,
        'gold'
      );
    }

    if (!this.triggeredBeats.has('BEAT_TOWER_INTERIOR') && leadS >= 0.22) {
      this.triggeredBeats.add('BEAT_TOWER_INTERIOR');
      if (tierTag) tierTag.textContent = '第四章 · 底层石厅与限重水道桥';
      if (chLabel) chLabel.textContent = '巴别塔内腔 · 严苛限重检定 (0m - 48m)';
      window.SFX.playThunder();
      this.showBanner(
        '⚠️ 【登塔考验 · 限重窄桥与高空滚石！】',
        '洪水苏醒，高空开始滚落3D巨石（被砸中会击飞坠落下层或掉下塔）！本层水道窄桥限制【同行人数 ≤ 6人】且需集齐【☼+♒+▲】三语——请在顶部点击 [×] 让多余单语者脱队！',
        9500,
        'warn'
      );
    }

    if (!this.triggeredBeats.has('BEAT_COLONNADE') && maxAltitude >= 48) {
      this.triggeredBeats.add('BEAT_COLONNADE');
      if (tierTag) tierTag.textContent = '第五章 · 圣书体与云之回廊';
      if (chLabel) chLabel.textContent = '中层环形柱廊 · 三处译码碑文 (48m - 106m)';
      window.SFX.playThunder();
      this.showBanner(
        '🔑 【圣书体回廊 · 寻找并启动三处译码碑 (0/3)】',
        '直接上塔的阶梯已被封锁！请带领【🔑铭文破译师】在宽阔柱廊、十字中庭桥与侧翼平台寻找并激活 3 座【发光传语译码碑】，同时提防纯语种民族派挖角！',
        9500,
        'gold'
      );
    }

    if (!this.triggeredBeats.has('BEAT_SCAFFOLD') && maxAltitude >= 106) {
      this.triggeredBeats.add('BEAT_SCAFFOLD');
      if (tierTag) tierTag.textContent = '第六章 · 机械齿轮与云端回廊';
      if (chLabel) chLabel.textContent = '高层云端脚手架 · 重力与信任 (106m - 160m)';
      window.SFX.playThunder();
      this.showBanner(
        '⚖️ 【云端回廊 · 轻盈无负重检定与坠塔危机】',
        '高空狂风与滚石密集！必带【🛡️青铜举盾卫】格挡滚石，并让【🤸轻盈飞跃者】保持空手（点[卸]丢掉重物）跨过齿轮脆板拉动升降闸杆！',
        9500,
        'warn'
      );
    }

    if (!this.triggeredBeats.has('BEAT_SUMMIT_NEAR') && maxAltitude >= 142) {
      this.triggeredBeats.add('BEAT_SUMMIT_NEAR');
      if (tierTag) tierTag.textContent = '终章 · 上帝之手';
      if (chLabel) chLabel.textContent = '银河穹顶 · 终局的真相 (142m - 160m)';
      game.crowd.units.forEach((u) => {
        if (u.alive && u.faction === 'PLAYER' && !u.inWell && u.s < 0.90) {
          u.launchThrowArc(0.92 + Math.random() * 0.025, '🛗 中央升降吊台团聚!');
        }
      });
      this.showBanner(
        '🌌 【中央升降吊台团聚 · 触碰银河穹顶】',
        '“在语言的尽头，我们仍然相遇。”——160m 银河穹顶之上，巨大的“上帝之手”正在浮现……',
        9000,
        'gold'
      );
    }
  }
}

window.StoryDirector = StoryDirector;
