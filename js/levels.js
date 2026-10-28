// 五层巴别塔关卡数据（横向剖面坐标：x 向右，y 向上，单位≈1格；角色身高≈1.5）
// 解谜要素：plates 重力踏板(need=所需重量；lang=只认该语言的说话者)、lifts 滑轮升降台（通电后载人往返）、
// gates 闸门、bridges 吊桥、builds 木板路修筑点、steles 语言石碑、levers 拉杆、rocks 松动石块、crates 配重木箱
(function () {
  const L = [];

  // ─────────────────────────── 第 1 层 ───────────────────────────
  L.push({
    id: 1, name: '埃尔遗迹', sub: '枯井村落 · 出发的地方',
    theme: { sky: ['#8fcdf0', '#fbefd2'], stone: '#d9b98a', wall: '#e4cba0', wood: '#a8723d', accent: '#e0703a', fog: '#f6e7c8', far: '#d8c4a0', banner: '#c8502c' },
    bounds: { x1: 0, x2: 64, y1: -6, y2: 15 }, voidY: -20, chainRange: 16,
    spawn: { x: 3, y: 0 }, startMembers: ['ash', 'akad'],
    strangers: [{ id: 'bani', x: 31.5, y: -5 }],
    walls: [[0, 29.6, -8, 0, 'ground'], [33.4, 64, -8, 0, 'ground'], [29.6, 33.4, -8, -5, 'ground']],
    plats: [[6, 14, 4, 'wood'], [2, 7, 5.8, 'stone'], [36, 47, 4.5, 'stone'], [50, 56, 4.5, 'stone'], [44, 62, 9, 'stone']],
    ladders: [[13, 0, 4], [37.2, 0, 4.5], [55, 4.5, 9]],
    lifts: [{ id: 'well', x1: 29.8, x2: 33.2, y0: -5, y1: 0, trigger: 'p1', style: 'well' }],
    plates: [{ id: 'p1', x: 25.8, y: 0, w: 1.6, need: 2 }],
    gates: [{ id: 'g1', x: 57.8, y: 9, h: 3, trigger: 's1' }],
    bridges: [], builds: [{ id: 'b1', x1: 47, x2: 50, y: 4.5, cost: 2 }],
    steles: [{ id: 's1', x: 47.5, y: 9, langs: ['♒', '▲'] }],
    levers: [],
    crates: [[18, 0]],
    items: [[8.5, 0, 'wood'], [11, 0, 'wood'], [21, 0, 'bread'], [40, 4.5, 'bread']],
    runes: [[3, 5.8], [53, 4.5], [45, 9]],
    rocks: [], checkpoints: [],
    exit: { x: 60.5, y: 9, needRecruit: 'bani' },
    backWalls: [[1, 15, 0, 8.5], [35, 63, 0, 4.5], [43, 63, 4.5, 13]],
    decor: [
      { t: 'palm', x: 1.5, y: 0, z: -2.2 }, { t: 'palm', x: 23, y: 0, z: -2.8 }, { t: 'palm', x: 34.5, y: 0, z: -2.4 }, { t: 'palm', x: 63, y: 0, z: -2.2 },
      { t: 'hut', x: 18, y: 0, z: -4.5 }, { t: 'hut', x: 26, y: 0, z: -7 }, { t: 'banner', x: 49, y: 12.6 }, { t: 'banner', x: 60, y: 12.6 },
      { t: 'torch', x: 59, y: 9 }, { t: 'cypress', x: 15.5, y: 0, z: -3 }
    ],
    tremor: null,
    objectives: [{ text: '把井底的陌生人救上来', key: 'recruit:bani' }, { text: '修好断开的木板路', key: 'build:b1' }, { text: '唤醒双语石碑，登上第 2 层', key: 'exit' }],
    hints: [
      [1.5, '左键拖拽可框选队员；点击地面、木梯、踏板即下达指令'],
      [9, '木箱可以被推动——推到 ⚖2 重力踏板上试试'],
      [22, '点击地上的物资可拾取；头顶的物资会映射在顶部头像上，点它即可丢弃'],
      [40, '负重越多，跳得越低。上不去时，丢掉一些物资']
    ],
    intro: [
      { cam: [10, 4, 30], narr: '很久以前，人们只说一种话。后来，塔裂开了，话也裂开了。' },
      { cam: [4, 1.5, 18], who: 'ash', say: '☼ sol · ka-rem ↑', sub: '（艾什指向那座看不见顶的塔）' },
      { who: 'akad', say: '☼ soru · ▲ tor !', sub: '（阿卡德只听懂了一半，但用力点头）' },
      { cam: [31.5, -3, 18], who: 'bani', say: '♒ wa… lu… ▲ ul ?', sub: '（井底传来回声——有人在下面）' },
      { cam: [14, 3, 30], narr: '把重物压在井边的 ⚖2 踏板上，井里的吊台就会升起。' }
    ],
    outro: [
      { who: 'bani', say: '♒ lu-wa · ▲ gha !', sub: '（三种声音，第一次指向同一个方向）' },
      { narr: '石门后面，是向上的水声。' }
    ]
  });

  // ─────────────────────────── 第 2 层 ───────────────────────────
  L.push({
    id: 2, name: '索勒斯水道', sub: '水车工坊 · 流动的生活',
    theme: { sky: ['#9bd6f4', '#eaf6f0'], stone: '#cbbfa2', wall: '#d8cdb2', wood: '#9a6634', accent: '#3fa0c8', fog: '#e4f2ee', far: '#bfc9c0', banner: '#2f6aa0' },
    bounds: { x1: 0, x2: 70, y1: -5, y2: 17 }, voidY: -20, chainRange: 16,
    spawn: { x: 3, y: 0 },
    strangers: [{ id: 'sofi', x: 58.5, y: 9 }],
    walls: [[0, 70, -6, 0, 'ground']],
    plats: [[3, 10, 6, 'wood'], [22, 34, 5, 'stone'], [40.6, 68, 9, 'stone']],
    ladders: [[9.2, 0, 6], [22.8, 0, 5]],
    lifts: [{ id: 'lf1', x1: 38, x2: 40.6, y0: 0, y1: 9, trigger: 'p1', style: 'crane' }],
    plates: [{ id: 'p1', x: 35, y: 0, w: 1.6, need: 2 }, { id: 'p2', x: 46, y: 9, w: 1.4, need: 1 }],
    gates: [{ id: 'g1', x: 52, y: 9, h: 3.2, trigger: 'p2' }],
    bridges: [], builds: [], steles: [], levers: [],
    crates: [[31, 5]],
    items: [[6, 6, 'wood'], [7.5, 6, 'wood'], [17, 0, 'bread'], [25.5, 0, 'stone'], [64, 9, 'bread']],
    runes: [[4, 6], [27, 5], [50, 0]],
    rocks: [[49, 13.4], [14, 7.5]],
    checkpoints: [],
    exit: { x: 66, y: 9, needRecruit: 'sofi' },
    backWalls: [[2, 11, 0, 11], [12, 70, 0, 9], [40, 70, 9, 14]],
    decor: [
      { t: 'waterwheel', x: 6.5, y: 3.4, r: 3.4, z: -2.2 }, { t: 'waterfall', x: 6.5, y0: 55, y1: -2, w: 2.8, z: -3.0 },
      { t: 'waterfall', x: 63, y0: 55, y1: -2, w: 2.4, z: -6.5 },
      { t: 'banner', x: 29, y: 8.6 }, { t: 'banner', x: 56, y: 13.4 }, { t: 'banner', x: 46, y: 13.4 },
      { t: 'torch', x: 44, y: 9 }, { t: 'torch', x: 62, y: 9 }, { t: 'cypress', x: 19, y: 0, z: -2.6 }, { t: 'cypress', x: 36.5, y: 0, z: -2.6 },
      { t: 'relic_can', x: 26.5, y: 5.0, id: 'relic_can', name: '精加工铝合金罐头' },
      { t: 'cornice', x1: 43, x2: 61, y: 13.6 }, { t: 'aqueduct', z: -34, y: 2 }
    ],
    tremor: { first: 22, period: 38 },
    objectives: [{ text: '让水车升降台重新通电', key: 'plate:p1' }, { text: '打开工坊闸门，找到高处的歌者', key: 'recruit:sofi' }, { text: '全员登上第 3 层', key: 'exit' }],
    hints: [
      [2, '把高台上的木箱推下边缘，让它砸在下层的 ⚖2 踏板上'],
      [14, '通电的升降台由悬索拉动：站上吊篮后拉下吊环缆绳（点击升降台或按 E），水车动力即刻咬合'],
      [26, '塔身震颤时，柱头松动的石块会真的掉下来——落地的石头还能捡起来当配重']
    ],
    intro: [
      { cam: [8, 6, 30], narr: '索勒斯水道。巨大的水车替塔搬运石头，也搬运声音。' },
      { cam: [4, 1.5, 18], who: 'bani', say: '♒ wa-wa · nn~', sub: '（巴尼侧耳听着水声，好像听见了老家的潮汐）' },
      { cam: [58, 10.5, 20], who: 'sofi', say: '▲ dun · ◎ om-en ~', sub: '（闸门后，有人在唱一首没人听得懂的歌）' },
      { cam: [30, 5, 30], narr: '升降台断了电。高台上的配重木箱，或许能让它重新转动。' }
    ],
    outro: [
      { who: 'sofi', say: '◎ yoo · ▲ tor-en', sub: '（她说的话，一半落进了巴尼的耳朵里）' },
      { narr: '水道尽头，台阶通向云层。' }
    ]
  });

  // ─────────────────────────── 第 3 层 ───────────────────────────
  L.push({
    id: 3, name: '云之回廊', sub: '重力与信任',
    theme: { sky: ['#86c3ef', '#f3f8ff'], stone: '#ece2d0', wall: '#f2eadb', wood: '#9a6634', accent: '#c8423a', fog: '#eef4fb', far: '#e8e2d8', banner: '#b8322c' },
    bounds: { x1: 0, x2: 74, y1: -10, y2: 18 }, voidY: -10, chainRange: 15, clouds: true,
    spawn: { x: 3, y: 0 },
    strangers: [{ id: 'io', x: 68, y: 10 }],
    walls: [[0, 16, -3, 0, 'stone'], [22, 60, -3, 0, 'stone']],
    plats: [[1, 4, 1.8, 'stone'], [4.5, 7, 3.6, 'stone'], [52, 58, 5, 'wood'], [42, 48, 10, 'stone'], [50.5, 60, 10, 'stone'], [63, 74, 10, 'stone']],
    ladders: [[53, 0, 5], [57, 5, 10, 'lv1']],
    lifts: [{ id: 'lf1', x1: 48, x2: 50.5, y0: 0, y1: 10, trigger: 'p2', style: 'crane' }],
    plates: [{ id: 'p1', x: 12, y: 0, w: 1.4, need: 1 }, { id: 'p2', x: 41, y: 0, w: 1.6, need: 2 }],
    gates: [],
    bridges: [{ id: 'db1', x1: 16, x2: 22, y: 0, trigger: 'p1' }],
    builds: [{ id: 'b1', x1: 60, x2: 63, y: 10, cost: 2 }],
    steles: [], levers: [{ id: 'lv1', x: 58.8, y: 10 }],
    crates: [],
    items: [[28, 0, 'stone'], [55, 5, 'wood'], [56.3, 5, 'wood'], [34, 0, 'bread']],
    runes: [[5.5, 3.6], [57.6, 5], [43, 10]],
    rocks: [[56, 14.2], [66, 14.2], [33, 4.6]],
    checkpoints: [[24, 0], [52, 10]],
    exit: { x: 72.5, y: 10, needRecruit: 'io' },
    backWalls: [[22, 60, 0, 5], [42, 74, 10, 15]],
    decor: [
      { t: 'statue', x: 7.5, y: 0, z: -2.2 }, { t: 'banner', x: 30, y: 4.4 }, { t: 'banner', x: 45, y: 14.4 }, { t: 'banner', x: 70, y: 14.4 },
      { t: 'cypress', x: 26, y: 0, z: -1.8 }, { t: 'cypress', x: 37, y: 0, z: -1.8 }, { t: 'torch', x: 64, y: 10 },
      { t: 'waterfall', x: 39, y0: 60, y1: -18, w: 2.6, z: -7 }, { t: 'waterfall', x: 66, y0: 60, y1: -18, w: 3.0, z: -10 },
      { t: 'relic_radio', x: 37, y: 0, id: 'relic_radio', name: '蜂鸣的真空铜管' },
      { t: 'cornice', x1: 52, x2: 70, y: 14.4 }, { t: 'aqueduct', z: -40, y: -2 }
    ],
    tremor: { first: 26, period: 34 },
    objectives: [{ text: '用石头压住吊桥踏板', key: 'plate:p1' }, { text: '降下回廊的绳梯', key: 'lever:lv1' }, { text: '【协力跨越】合力将苏菲拉送过云海断崖', key: 'build:b1' }, { text: '找到只会星屑语的老人', key: 'recruit:io' }, { text: '全员登上第 4 层', key: 'exit' }],
    hints: [
      [2, '这里没有护栏——被落石撞到或失足，会真的掉下塔'],
      [10, '指令要沿着语言链传递。距离太远或语言不通，队员就听不见'],
      [20, '让一位队员留在中间的阳台上，充当传语中继站']
    ],
    intro: [
      { cam: [20, 3, 32], narr: '云之回廊。这里的路一半是石头，一半是信任。' },
      { cam: [41, 1, 18], narr: '吊台需要两人份的重量。留下的人，会离队伍越来越远。' },
      { cam: [68, 11.5, 18], who: 'io', say: '✦ zir · ◎ ii ?', sub: '（一位老人在云边自言自语。只有苏菲拉的耳朵动了一下）' },
      { cam: [10, 2, 22], who: 'akad', say: '▲ gha · ☼ ka ⇣', sub: '（阿卡德指了指脚下的踏板，又指了指远处的石头）' }
    ],
    outro: [
      { who: 'io', say: '✦ ses · ◎ om ↑', sub: '（老人第一次听见回答。他笑得像个孩子）' },
      { narr: '云层之上，是一座装满了书的塔层。' }
    ]
  });

  // ─────────────────────────── 第 4 层 ───────────────────────────
  L.push({
    id: 4, name: '圣书图书馆', sub: '圣书库 · 失落的知识',
    theme: { sky: ['#e9d6b0', '#fff2d6'], stone: '#d6c4a0', wall: '#cdb994', wood: '#7a4a24', accent: '#c8a040', fog: '#f2e4c4', far: '#c8b48c', banner: '#8a2a3a', interior: true },
    bounds: { x1: 0, x2: 64, y1: -4, y2: 16 }, voidY: -20, chainRange: 16,
    spawn: { x: 2.5, y: 0 },
    strangers: [{ id: 'ghar', x: 44, y: 5 }, { id: 'ul', x: 42.5, y: 5 }],
    walls: [[0, 64, -6, 0, 'ground'], [-2, 0, 0, 20, 'stone'], [64, 66, 0, 20, 'stone']],
    plats: [[4, 40, 5, 'wood'], [46, 60, 5, 'wood'], [10, 60, 10, 'stone']],
    ladders: [[6, 0, 5], [58.5, 5, 10]],
    lifts: [],
    plates: [{ id: 'pa', x: 41, y: 0, w: 1.6, need: 2 }, { id: 'pb', x: 40, y: 10, w: 1.4, need: 1 }, { id: 'pc', x: 24, y: 10, w: 1.4, need: 1 }],
    gates: [{ id: 'gA', x: 53, y: 5, h: 3.5, trigger: 's1' }, { id: 'gB', x: 15, y: 10, h: 3.5, trigger: ['pb', 'pc'] }],
    bridges: [{ id: 'db1', x1: 40, x2: 46, y: 5, trigger: 'pa' }],
    builds: [],
    steles: [{ id: 's1', x: 49, y: 5, langs: ['◎', '✦'] }],
    levers: [],
    crates: [[36.5, 5], [30, 10]],
    items: [[30, 0, 'bread'], [20, 5, 'bread']],
    runes: [[62, 0], [14, 5], [50, 10]],
    rocks: [[40, 14.6], [33, 14.6]],
    checkpoints: [],
    exit: { x: 11.5, y: 10 },
    backWalls: [[0, 64, 0, 15]],
    decor: [
      { t: 'shelf', x: 9, y: 0, w: 6, h: 4.4 }, { t: 'shelf', x: 22, y: 0, w: 6, h: 4.4 }, { t: 'shelf', x: 50, y: 0, w: 7, h: 4.4 },
      { t: 'shelf', x: 15, y: 5, w: 8, h: 4.4 }, { t: 'shelf', x: 30, y: 5, w: 5, h: 4.4 }, { t: 'shelf', x: 22, y: 10, w: 9, h: 4.4 }, { t: 'shelf', x: 46, y: 10, w: 9, h: 4.4 },
      { t: 'statue', x: 34, y: 0, z: -2.2 }, { t: 'armillary', x: 57, y: 1.7, r: 1.3, z: -1.5 },
      { t: 'banner', x: 4, y: 14.2 }, { t: 'banner', x: 60, y: 14.2 }, { t: 'banner', x: 36, y: 9.2 },
      { t: 'torch', x: 18, y: 0 }, { t: 'torch', x: 44, y: 0 }, { t: 'torch', x: 36, y: 10 }, { t: 'torch', x: 54, y: 10 },
      { t: 'cornice', x1: 10, x2: 60, y: 15 }
    ],
    tremor: { first: 18, period: 30 },
    objectives: [{ text: '放下通往东翼的吊桥', key: 'plate:pa' }, { text: '【开源条约】与单石族小队共享双语图纸', key: 'opensource' }, { text: '同时压住两块踏板，打开圣书库', key: 'gate:gB' }, { text: '全员登上天穹', key: 'exit' }],
    hints: [
      [2, '只有同时懂 ◎ 与 ✦ 的人，才能唤醒东翼的石碑'],
      [12, '落石会顺着重力砸在下方——有时，这恰好是你需要的重量']
    ],
    intro: [
      { cam: [30, 7, 34], narr: '圣书图书馆。每一本书都用不同的符号写成，没有一本能被完整读懂。' },
      { cam: [44, 6.5, 18], who: 'ghar', say: '▲ tor · gha ! ✋', sub: '（单石族远征队被挡在双语石碑前。他们拒绝任何外族靠近）' },
      { cam: [49, 6.5, 18], who: 'io', say: '◎ en · ✦ zir-ta', sub: '（伊奥认出了石碑上的双语符号——必须打破偏见，才能合力破译）' },
      { cam: [14, 11.5, 22], narr: '圣书库的大门需要两组人马同时压住重力踏板。' }
    ],
    outro: [
      { who: 'sofi', say: '◎ om · ▲ dun ↑', sub: '（书页里夹着一张星图，指向塔顶）' },
      { narr: '最后一段阶梯，通向天穹。' }
    ]
  });

  // ─────────────────────────── 第 5 层 ───────────────────────────
  L.push({
    id: 5, name: '天穹 · 上帝之手', sub: '终章 · 真相与循环',
    theme: { sky: ['#5f9fe6', '#fff1c4'], stone: '#f2e6c8', wall: '#f6ecd4', wood: '#b08a50', accent: '#f0c040', fog: '#fff6dc', far: '#f6e8c0', banner: '#f0c040', gold: true },
    bounds: { x1: 0, x2: 64, y1: -8, y2: 24 }, voidY: -10, chainRange: 20, clouds: true,
    spawn: { x: 30, y: 0 },
    strangers: [],
    walls: [[0, 64, -3, 0, 'stone']],
    plats: [[9, 20, 4.5, 'stone'], [44, 55, 4.5, 'stone'], [25, 39, 8, 'stone'], [28, 36, 13, 'stone']],
    ladders: [[10.5, 0, 4.5], [53.5, 0, 4.5], [26.5, 0, 8], [37.5, 0, 8], [32, 8, 13]],
    lifts: [],
    plates: [
      { id: 'l1', x: 5, y: 0, w: 1.4, lang: '☼' }, { id: 'l2', x: 59, y: 0, w: 1.4, lang: '♒' },
      { id: 'l3', x: 15, y: 4.5, w: 1.4, lang: '▲' }, { id: 'l4', x: 49, y: 4.5, w: 1.4, lang: '◎' }, { id: 'l5', x: 33.5, y: 13, w: 1.4, lang: '✦' }
    ],
    gates: [], bridges: [], builds: [], steles: [], levers: [],
    crates: [], items: [], runes: [[29, 13]], rocks: [], checkpoints: [],
    exit: null, finalTrigger: ['l1', 'l2', 'l3', 'l4', 'l5'],
    backWalls: [],
    decor: [
      { t: 'armillary', x: 32, y: 19.5, r: 5.2, z: -3, big: true }, { t: 'armillary', x: 32, y: 19.5, r: 3.6, z: -3, big: true, reverse: true },
      { t: 'statue', x: 22, y: 8, z: -1.8 }, { t: 'statue', x: 42, y: 8, z: -1.8 },
      { t: 'banner', x: 26, y: 12.2 }, { t: 'banner', x: 38, y: 12.2 }, { t: 'torch', x: 25.5, y: 8 }, { t: 'torch', x: 38.5, y: 8 }
    ],
    tremor: null,
    objectives: [{ text: '让五种语言的说话者，各自站上属于自己符号的圣盘', key: 'final' }],
    hints: [
      [2, '每块圣盘只认一种符号。每个人都会两种语言——想清楚谁该站在哪里'],
      [12, '框选一部分人分头行动；离得太远时，记得留下中继']
    ],
    intro: [
      { cam: [32, 12, 40], narr: '天穹。两座金色天球仪在头顶无声地转动。' },
      { cam: [32, 4, 26], who: 'ash', say: '☼ sol · ♒ wa · ▲ tor · ◎ om · ✦ zir', sub: '（艾什第一次试着把五个符号连成一句话）' },
      { narr: '五块圣盘，五种符号。每个人都必须站在一个只有自己能站的地方。' }
    ],
    outro: []
  });

  window.LEVELS = L;
})();
