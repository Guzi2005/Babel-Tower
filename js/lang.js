// 造语系统：每种语言只用一个符号指代，词汇全部为虚构音节
(function () {
  const LANGS = {
    '☼': { name: '日辉语', color: '#f0b030', words: ['sol', 'ka', 'rem', 'ash-ka', 'soru'], tone: 330 },
    '♒': { name: '潮汐语', color: '#3fb8e0', words: ['wa', 'lu', 'nn~', 'wa-lu', 'olo'], tone: 392 },
    '▲': { name: '岩脊语', color: '#d0703a', words: ['tor', 'gha', 'ul', 'tor-gha', 'dun'], tone: 440 },
    '◎': { name: '环音语', color: '#9a6ad0', words: ['om', 'en', 'ii', 'om-en', 'yoo'], tone: 523 },
    '✦': { name: '星屑语', color: '#e8e070', words: ['zir', "e'", 'ta', 'zir-ta', 'ses'], tone: 587 }
  };

  // 指令图符（不依赖任何真实语言）
  const ACT = { move: '→', up: '↑', down: '↓', rally: '⊕', pick: '⇡', drop: '⇣', build: '⚒', push: '⇥', plate: '⊻', operate: '✋', hold: '⌂', no: '?', ok: '!' };

  const MEMBERS = {
    ash: {
      name: '艾什', role: '仲介学者', roleIcon: '📜', roleDesc: '语言链中继范围 +50%，跨语系沟通枢纽',
      langs: ['☼', '♒'], pal: { skin: '#f2c29b', hair: '#2b2233', hat: 'beret', hatColor: '#2f4a8a', coat: '#3a5aa8', pants: '#2a2f45', shoes: '#3b2a20', accent: '#e8c35a' }
    },
    akad: {
      name: '阿卡德', role: '筑造石匠', roleIcon: '⚒️', roleDesc: '架设桥梁与垫石速度提升 2.5 倍，耗材更省',
      langs: ['☼', '▲'], pal: { skin: '#e9b48a', hair: '#5a2a1a', hat: 'hood', hatColor: '#c8423a', coat: '#c8423a', pants: '#4a2a2a', shoes: '#2e1e14', accent: '#f0d080' }
    },
    enki: {
      name: '恩基', role: '采粮农夫', roleIcon: '🌾', roleDesc: '在编时全队饱食度消耗减缓 50%，高效搜集口粮',
      langs: ['☼', '▲'], pal: { skin: '#e2ab7a', hair: '#4a321a', hat: 'hood', hatColor: '#d8b058', coat: '#8a6230', pants: '#4a3820', shoes: '#2e1e14', accent: '#f4c430' }
    },
    bani: {
      name: '巴尼', role: '绝壁挑夫', roleIcon: '🎒', roleDesc: '背负上限提升至 20 块，矮檐通过防碰撞挤落',
      langs: ['♒', '▲'], pal: { skin: '#d9a072', hair: '#3a2a1a', hat: 'cap', hatColor: '#3f7a3a', coat: '#4f8a44', pants: '#3a3020', shoes: '#2e1e14', accent: '#e0c070' }
    },
    sofi: {
      name: '苏菲拉', role: '同传译员', roleIcon: '🔮', roleDesc: '远距离盲听呼应，瞬间安抚远方异域同伴',
      langs: ['▲', '◎'], pal: { skin: '#f0c8a8', hair: '#e6c66a', hat: 'band', hatColor: '#9a6ad0', coat: '#efe8da', pants: '#8a7a9a', shoes: '#5a4a6a', accent: '#9a6ad0', longHair: true, robe: true }
    },
    io: {
      name: '伊奥', role: '观星学者', roleIcon: '✦', roleDesc: '预感地脉震颤落石，解读失落神碑密码',
      langs: ['◎', '✦'], pal: { skin: '#c98d62', hair: '#e8e8f0', hat: 'turban', hatColor: '#e8e2d0', coat: '#2c8a8a', pants: '#244a5a', shoes: '#2a2a2a', accent: '#e8e070', beard: '#e8e8f0' }
    },
    ghar: {
      name: '加尔', role: '开路先锋', roleIcon: '⛏️', roleDesc: '推动沉重箱体速度翻倍，攀爬梯子速度加快 30%',
      langs: ['▲'], pal: { skin: '#d9a072', hair: '#3a2a1a', hat: 'hood', hatColor: '#a8422a', coat: '#8a3a24', pants: '#3a2a20', shoes: '#2e1e14', accent: '#f0703a' }
    },
    ul: {
      name: '乌尔', role: '巡山卫士', roleIcon: '👁️', roleDesc: '基础跑动速度提升 25%，视野侦察范围扩大',
      langs: ['▲'], pal: { skin: '#c8956a', hair: '#2b2233', hat: 'beret', hatColor: '#7a2f1c', coat: '#a84e36', pants: '#4a2f26', shoes: '#2e1e14', accent: '#d0502a' }
    }
  };
  const ORDER = ['ash', 'akad', 'enki', 'bani', 'sofi', 'io', 'ghar', 'ul'];

  const ARCHETYPES = [
    { role: '筑造工匠', roleIcon: '⚒️', roleDesc: '架设桥梁与垫石速度提升 2.5 倍，耗材更省', hat: 'hood', apron: true },
    { role: '仲介学者', roleIcon: '📜', roleDesc: '语言链中继范围 +50%，跨语系沟通枢纽', hat: 'beret', sash: true },
    { role: '拓荒农夫', roleIcon: '🌾', roleDesc: '在编时全队饱食度消耗减缓 50%，高效搜集口粮', hat: 'straw', apron: true },
    { role: '负重力士', roleIcon: '🎒', roleDesc: '背负上限提升至 22 块，矮檐通过防碰撞挤落', hat: 'cap', sash: true },
    { role: '传译占卜师', roleIcon: '🔮', roleDesc: '远距离盲听呼应，瞬间安抚远方异域同伴', hat: 'band', robe: true },
    { role: '观星祭司', roleIcon: '✦', roleDesc: '预感地脉震颤落石，解读失落神碑密码', hat: 'turban', beard: 'full' },
    { role: '开路工兵', roleIcon: '⛏️', roleDesc: '推动沉重箱体速度翻倍，攀爬梯子速度加快 30%', hat: 'hood' },
    { role: '巡野斥候', roleIcon: '👁️', roleDesc: '基础跑动速度提升 25%，视野侦察范围扩大', hat: 'scarf', cloak: true },
    { role: '行脚商人', roleIcon: '⚖️', roleDesc: '精通以物易物，能向商队以木石换取高热量口粮', hat: 'fez', sash: true },
    { role: '牧羊向导', roleIcon: '🐑', roleDesc: '熟悉牲口与山道，在编时全队攀爬与行进更加沉稳', hat: 'scarf', cloak: true },
    { role: '织锦工匠', roleIcon: '🧶', roleDesc: '精通织毯与染料，协助搭建防风天幕与绳桥', hat: 'band', sash: true },
    { role: '陶坊师傅', roleIcon: '🏺', roleDesc: '陶器与耐火泥砖大师，减少 50% 建筑损耗', hat: 'cap', apron: true },
    { role: '巡山卫士', roleIcon: '⚔️', roleDesc: '步履稳健警惕，防止小队在陡峭边缘踏空失足', hat: 'circlet', sash: true }
  ];

  const ANCIENT_NAMES = [
    '乌尔纳姆', '辛·埃利勒', '吉尔伽', '夏玛什', '马尔杜克', '纳拉姆辛', '提格拉', '贝勒卡尔',
    '伊什塔尔', '汉谟拉', '阿达德', '尼努尔塔', '齐姆里', '库杜尔', '沙姆希', '拉伽什',
    '基什尔', '埃利都', '达姆基', '阿努比', '萨尔贡', '卢加尔', '古迪亚', '欣比尔',
    '恩利尔', '苏穆拉', '扎巴巴', '伊丁达', '里姆辛', '乌尔扎巴', '普祖尔', '亚姆哈德',
    '纳布·辛', '萨姆哈', '辛·穆巴利特', '里穆什', '玛尼什图苏', '伊杜尔', '恩美巴拉格西'
  ];

  const PALETTES = [
    { coat: '#3a5aa8', pants: '#2a2f45', hatColor: '#2f4a8a', accent: '#e8c35a' },
    { coat: '#c8423a', pants: '#4a2a2a', hatColor: '#c8423a', accent: '#f0d080' },
    { coat: '#8a6230', pants: '#4a3820', hatColor: '#d8b058', accent: '#f4c430' },
    { coat: '#4f8a44', pants: '#3a3020', hatColor: '#3f7a3a', accent: '#e0c070' },
    { coat: '#efe8da', pants: '#8a7a9a', hatColor: '#9a6ad0', accent: '#9a6ad0' },
    { coat: '#2c8a8a', pants: '#244a5a', hatColor: '#e8e2d0', accent: '#e8e070' },
    { coat: '#8a3a24', pants: '#3a2a20', hatColor: '#a8422a', accent: '#f0703a' },
    { coat: '#a84e36', pants: '#4a2f26', hatColor: '#7a2f1c', accent: '#d0502a' },
    { coat: '#5c4a72', pants: '#382a44', hatColor: '#7a5a92', accent: '#ffd24a' },
    { coat: '#3d6e5a', pants: '#264235', hatColor: '#4a826a', accent: '#8ce2b8' },
    { coat: '#a47c48', pants: '#3c2b18', hatColor: '#dfb15b', accent: '#e5c068' },
    { coat: '#6e4530', pants: '#342218', hatColor: '#b83226', accent: '#f5a623' },
    { coat: '#284d5b', pants: '#1a333d', hatColor: '#4ca1af', accent: '#ffd700' },
    { coat: '#8d4334', pants: '#43211a', hatColor: '#d9644a', accent: '#f3e1b0' },
    { coat: '#627c52', pants: '#35432c', hatColor: '#88ab70', accent: '#e8d595' }
  ];

  const SKINS = ['#f2c29b', '#e9b48a', '#e2ab7a', '#d9a072', '#c98d62', '#c8956a', '#dfa878'];
  const HAIRS = ['#2b2233', '#5a2a1a', '#4a321a', '#3a2a1a', '#e6c66a', '#e8e8f0', '#241a24'];

  let travelerSeq = 1;

  function generateTraveler(opts = {}) {
    const id = opts.id || `tr_${travelerSeq++}`;
    const name = opts.name || pick(ANCIENT_NAMES);
    const arch = opts.role ? (ARCHETYPES.find(a => a.role === opts.role) || ARCHETYPES[0]) : pick(ARCHETYPES);
    const palBase = pick(PALETTES);
    const skin = pick(SKINS);
    const hair = pick(HAIRS);

    const allLangKeys = ['☼', '♒', '▲', '◎', '✦'];
    let langs = opts.langs ? opts.langs.slice() : null;
    if (!langs || !langs.length) {
      const l1 = opts.primaryLang || pick(allLangKeys);
      let l2 = opts.secondaryLang || null;
      if (!l2 && Math.random() < 0.85) {
        const rem = allLangKeys.filter(k => k !== l1);
        l2 = pick(rem);
      }
      langs = l2 ? [l1, l2] : [l1];
    }

    const pal = {
      skin: opts.skin || skin,
      hair: opts.hair || hair,
      hat: opts.hat || arch.hat || 'hood',
      hatColor: opts.hatColor || palBase.hatColor,
      coat: opts.coat || palBase.coat,
      pants: opts.pants || palBase.pants,
      shoes: '#2e1e14',
      accent: opts.accent || palBase.accent,
      robe: opts.robe !== undefined ? opts.robe : !!arch.robe,
      apron: opts.apron !== undefined ? opts.apron : !!arch.apron,
      sash: opts.sash !== undefined ? opts.sash : !!arch.sash,
      cloak: opts.cloak !== undefined ? opts.cloak : !!arch.cloak,
      beard: opts.beard !== undefined ? opts.beard : (arch.beard ? hair : undefined),
      beardStyle: opts.beardStyle || (arch.beard === 'full' ? 'full' : undefined)
    };

    const traveler = {
      id,
      name,
      role: arch.role,
      roleIcon: arch.roleIcon,
      roleDesc: arch.roleDesc,
      langs,
      pal
    };

    MEMBERS[id] = traveler;
    if (!ORDER.includes(id)) ORDER.push(id);
    return traveler;
  }

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // 生成一句造语：「☼ sol·ka ↑」
  function utter(unitLangs, act, preferLang) {
    const L = preferLang && unitLangs.includes(preferLang) ? preferLang : unitLangs[0];
    const w = LANGS[L].words;
    const n = 1 + Math.floor(Math.random() * 2);
    const words = [];
    for (let i = 0; i < n; i++) words.push(pick(w));
    return { lang: L, text: `${L} ${words.join('·')}${act ? ' ' + (ACT[act] || act) : ''}` };
  }

  function shared(a, b) { return a.langs.filter(l => b.langs.includes(l)); }

  // 计算语言链：返回 {links:[{a,b,lang}], parent:Map, connected:Set}
  // 支持动态自由领队：以当前指定领队或最佳联通者为根节点向外辐射
  function computeChain(units, leader, range = 16) {
    const links = [];
    const act = units.filter(u => u.recruited && !u.fainted);
    for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
      const a = act[i], b = act[j];
      const s = shared(a, b);
      if (!s.length) continue;
      const relayBonus = (a.id === 'ash' || b.id === 'ash' || a.role === '仲介学者' || b.role === '仲介学者') ? 1.45 : 1.0;
      const d = Math.hypot(a.x - b.x, (a.y - b.y) * 1.0);
      if (d <= range * relayBonus) links.push({ a, b, lang: s[0], d });
    }
    const parent = new Map(), connected = new Set();
    const activeLeader = (leader && leader.recruited && !leader.fainted) ? leader : (act[0] || null);
    if (activeLeader) {
      connected.add(activeLeader); parent.set(activeLeader, null);
      const q = [activeLeader];
      while (q.length) {
        const u = q.shift();
        for (const l of links) {
          const o = l.a === u ? l.b : l.b === u ? l.a : null;
          if (o && !connected.has(o)) { connected.add(o); parent.set(o, { from: u, lang: l.lang }); q.push(o); }
        }
      }
    }
    return { links, parent, connected };
  }

  function chainPath(chain, unit) {
    const path = [];
    let cur = unit;
    while (cur && chain.parent.get(cur)) { const p = chain.parent.get(cur); path.unshift({ from: p.from, to: cur, lang: p.lang }); cur = p.from; }
    return path;
  }

  window.LANG = { LANGS, ACT, MEMBERS, ORDER, ARCHETYPES, ANCIENT_NAMES, generateTraveler, utter, shared, computeChain, chainPath };
})();
