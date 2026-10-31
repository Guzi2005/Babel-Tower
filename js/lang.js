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

  window.LANG = { LANGS, ACT, MEMBERS, ORDER, utter, shared, computeChain, chainPath };
})();
