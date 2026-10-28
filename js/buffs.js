// Anachronistic "Miracles" (违和奇迹物) & Redeemable 3-Choose-1 Miracle Card System (🃏)
// Integrated with the Physical Vertical-Stack Supply Carrying System (竖向堆叠实体物资携带系统)

const BUFF_POOL = [
  {
    id: 'canned_food',
    icon: '🥫',
    title: '冷库奇迹 · 精加工罐头外骨骼',
    rarity: '违和时代遗物',
    desc: '全员【头顶竖向背负上限 +1 件】，立即向全队头顶分发 +4 袋密封口粮（🍞），且【口粮消耗速度降低 35%】、【负重移速提升 +25%】！',
    apply: (sys, game) => {
      sys.modifiers.extraCarryCap = (sys.modifiers.extraCarryCap || 0) + 1;
      sys.modifiers.moveSpeedMult *= 1.25;
      sys.modifiers.foodConsumeMult *= 0.65;
      if (game && game.crowd) {
        game.crowd.distributePhysicalItemsToSquad('FOOD', 4);
      }
    }
  },
  {
    id: 'telegraph_radio',
    icon: '📻',
    title: '冷库奇迹 · 千里传音机械',
    rarity: '违和时代遗物',
    desc: '锈迹斑斑却仍在发报的现代无线电中继器！【指令链传达半径永久提升 +45%】，即使后方大力士背满 5 层物资走得慢也不会断链！',
    apply: (sys, game) => {
      sys.modifiers.relayRangeMult *= 1.45;
      if (game && game.crowd) game.crowd.propagateLanguageChain(true);
    }
  },
  {
    id: 'future_human',
    icon: '🧑‍🚀',
    title: '冷库奇迹 · 疑似未来的人类',
    rarity: '文明循环残影',
    desc: '唤醒冷库中沉睡的未来观测者！立即为 3 名单语队员赋能第二语言（楔/Ω/𓂀/Ψ/ᚱ/Δ），使其晋升为【双语通译官】！',
    apply: (sys, game) => {
      const aliveMono = game.crowd.units.filter((u) => u.alive && u.faction === 'PLAYER' && u.langs.length === 1);
      const targetLangs = ['A', 'B', 'C', 'D', 'E', 'F'];
      aliveMono.slice(0, 3).forEach((u, idx) => {
        const nextL = targetLangs.find((l) => !u.langs.includes(l) && l !== targetLangs[idx % targetLangs.length]) || 'C';
        u.grantSecondaryLanguage(nextL);
      });
      game.crowd.propagateLanguageChain(true);
    }
  },
  {
    id: 'open_source_protocol',
    icon: '📡',
    title: '开源协议 · 共享人类的使命',
    rarity: '终极开源行动',
    desc: '“解谜不再是一队的重负，而是全人类的合力！”立即感召塔内竞争小队带着物资合流，且破译青色符文机关与搭桥速度提升 +80%！',
    apply: (sys, game) => {
      sys.modifiers.buildSpeedMult *= 1.8;
      game.crowd.triggerOpenSourceCoop();
    }
  },
  {
    id: 'cryo_stabilizer',
    icon: '❄️',
    title: '文明冷库 · 反重力背架配重仪',
    rarity: '文明循环残影',
    desc: '全员【头顶竖向背负上限 +1 件】，向全队头顶分发 +2 🪵 原木与 +2 🪨 石砖，并将下方崩塌洪水线压低 6.0 米！',
    apply: (sys, game) => {
      sys.modifiers.extraCarryCap = (sys.modifiers.extraCarryCap || 0) + 1;
      sys.modifiers.floodSpeedMult *= 0.72;
      game.floodHeight -= 6.0;
      game.towerTilt *= 0.3;
      if (game && game.crowd) {
        game.crowd.distributePhysicalItemsToSquad('WOOD', 2);
        game.crowd.distributePhysicalItemsToSquad('STONE', 2);
      }
    }
  },
  {
    id: 'elevator_overdrive',
    icon: '🛗',
    title: '远古升降梯 · 液压过载',
    rarity: '违和时代遗物',
    desc: '【握手甩投】、【开源广播】与【紧急升降梯】冷却时间缩短 45%，并立即向队伍头顶空投 +3 袋口粮（🍞）！',
    apply: (sys, game) => {
      sys.modifiers.cooldownMult *= 0.55;
      if (game && game.crowd) {
        game.crowd.distributePhysicalItemsToSquad('FOOD', 3);
        game.crowd.propagateLanguageChain(true);
      }
    }
  }
];

class BuffSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.activeBuffs = [];
    this.cardTokens = 1; // Starts with 1 redeemable 3-Choose-1 Miracle Card Token!
    this.modifiers = {
      relayRangeMult: 1.0,
      moveSpeedMult: 1.0,
      buildSpeedMult: 1.0,
      windResistMult: 1.0,
      floodSpeedMult: 1.0,
      cooldownMult: 1.0,
      foodConsumeMult: 1.0,
      extraCarryCap: 0,
      universalTongue: false
    };
  }

  addCardToken(count = 1) {
    this.cardTokens += count;
  }

  getRandomChoices(count = 3) {
    const shuffled = [...BUFF_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  selectBuff(buff, game) {
    if (this.cardTokens > 0) {
      this.cardTokens--;
    }
    this.activeBuffs.push(buff);
    buff.apply(this, game);
    this.renderBuffBar();
  }

  renderBuffBar() {
    const bar = document.getElementById('active-buffs-bar');
    if (!bar) return;
    bar.innerHTML = this.activeBuffs
      .map((b) => {
        const shortTitle = b.title.includes('·') ? b.title.split('·')[1].trim() : b.title;
        return `<div class="buff-chip" title="${b.title}&#10;${b.desc}"><span>${b.icon}</span><span>${shortTitle}</span></div>`;
      })
      .join('');
  }
}

window.BUFF_POOL = BUFF_POOL;
window.BuffSystem = BuffSystem;
