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
    strangers: [
      { id: 'bani', x: 31.5, y: -5 },
      { id: 'enki', x: 9.5, y: 0 }
    ],
    doorways: [
      { id: 'council', x: 16, y: 0, name: '村落议事厅', interiorType: 'council' },
      { id: 'granary', x: 24.5, y: 0, name: '谷物粮仓', interiorType: 'granary' }
    ],
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
    items: [[8.5, 0, 'wood'], [11, 0, 'wood'], [21, 0, 'bread'], [25, 0, 'bread'], [40, 4.5, 'bread']],
    runes: [[3, 5.8], [53, 4.5], [45, 9]],
    rocks: [], checkpoints: [],
    exit: { x: 60.5, y: 9, needRecruit: 'bani' },
    backWalls: [[1, 15, 0, 8.5], [35, 63, 0, 4.5], [43, 63, 4.5, 13]],
    decor: [
      { t: 'palm', x: 1.5, y: 0, z: -2.2 }, { t: 'palm', x: 22, y: 0, z: -2.8 }, { t: 'palm', x: 34.5, y: 0, z: -2.4 }, { t: 'palm', x: 63, y: 0, z: -2.2 },
      { t: 'building', x: 16, y: 0, w: 7, h: 4.2, d: 5.5, interiorType: 'council', name: '村落议事长屋' },
      { t: 'building', x: 24.5, y: 0, w: 6.2, h: 3.8, d: 4.8, interiorType: 'granary', name: '储备粮仓' },
      { t: 'banner', x: 49, y: 12.6 }, { t: 'banner', x: 60, y: 12.6 },
      { t: 'torch', x: 59, y: 9 }, { t: 'cypress', x: 4.5, y: 0, z: -3 }
    ],
    tremor: null,
    objectives: [
      { text: '【救出工匠】压下 ⚖2 踏板，将井底抢修水渠的巴尼救上来', key: 'recruit:bani' },
      { text: '【动员农夫】在麦田与采粮农夫恩基会合并收集口粮', key: 'recruit:enki' },
      { text: '【断崖筑桥】消耗背负原木，在裂谷处修筑通行木桥', key: 'build:b1' },
      { text: '【唤醒天门】解开双语石碑，开启巴别通天大门', key: 'exit' }
    ],
    hints: [
      [1.5, '走到房屋门前按 W 可进入室内避风或探查；按 S 可走出室外'],
      [9, '木箱可被推动——推到 ⚖2 重力踏板上，可将水渠工匠升上来'],
      [22, '头顶背负原木时，靠近断崖按 3 可即时搭设木板桥；按 4 可急救脱力队员'],
      [40, '负重越多，跳得越低。遇到高台障碍时，可按 7 卸载物资恢复弹跳']
    ],
    intro: [
      { cam: [24, 6, 36], narr: '埃尔村，依附在巴别塔巨构根基下的一座古老村落。' },
      { cam: [4, 1.5, 12], who: 'ash', say: '☼ sol · ka-rem', sub: '（艾什望着裂开的水渠：地下断流三日，唯有登塔方能查明真相）' },
      { who: 'akad', say: '☼ soru · ▲ tor !', sub: '（阿卡德扛起行囊：召集全村志士，我们组建远征队出征！）' },
      { cam: [31.5, -3, 14], who: 'bani', say: '♒ wa… lu… ▲ ul ?', sub: '（井底传来回声：巴尼正在下层抢修水渠总阀）' },
      { cam: [16, 2.5, 20], narr: '把配重木箱推到井边的 ⚖2 踏板上，吊篮便能将工匠升起。走到房门前按 W 可进出室内。' }
    ],
    outro: [
      { who: 'bani', say: '♒ lu-wa · ▲ gha !', sub: '（三种声音，第一次汇聚成同一道出征的意志）' },
      { narr: '通天石门在沉闷的轰鸣声中升起，迎面而来的是向上翻滚的巨流水声。' }
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
    objectives: [
      { text: '【水车通电】推动高台配重箱冲开卡死的齿轮组', key: 'plate:p1' },
      { text: '【部族和解】通过语言传达图纸，化解上层守关巡检队的误会', key: 'recruit:sofi' },
      { text: '【水力升降】全员搭乘水力升降梯，登上第 3 层', key: 'exit' }
    ],
    hints: [
      [2, '把高台上的木箱推下边缘，让它砸在下层的 ⚖2 踏板上'],
      [14, '通电的升降台由悬索拉动：站上吊篮后拉下吊环缆绳（点击升降台或按 E），水车动力即刻咬合'],
      [26, '塔身震颤时，柱头松动的石块会掉落——捡起石块可按 3 现场垫步铺路']
    ],
    intro: [
      { cam: [16, 5, 34], narr: '索勒斯水道。整座塔的水力机枢核心，巨大的轮盘正在艰难摩擦呻吟。' },
      { cam: [6, 3, 14], who: 'bani', say: '♒ wa-wa · lu-rem !', sub: '（巴尼抹了把脸上的水雾：碎石卡死了主轴，必须用重力重新激活升降枢纽）' },
      { cam: [58.5, 10.5, 14], who: 'sofi', say: '▲ dun · ◎ om-en ~', sub: '（闸门高处传来警戒歌声：上层巡检队因语言不通，误将远征队当作破坏水源的盗贼）' },
      { cam: [30, 5, 26], narr: '找到通电的齿轮缆索，用语言桥梁化解猜忌。' }
    ],
    outro: [
      { who: 'sofi', say: '◎ yoo · ▲ tor-en', sub: '（苏菲拉接纳了艾什递上的和解信物，加入了远征队）' },
      { narr: '水声奔涌中，巨大的升降梯冲破水雾，通向云层深处的绝壁。' }
    ]
  });

  // ─────────────────────────── 第 3 层 ───────────────────────────
  L.push({
    id: 3, name: '云之回廊', sub: '重力与信任 · 绝壁工程',
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
    objectives: [
      { text: '【压住吊桥】用石砖配重压住吊桥踏板，联通外廊悬桥', key: 'plate:p1' },
      { text: '【降下云梯】操纵悬崖风弦拉杆，降下高空回廊绳梯', key: 'lever:lv1' },
      { text: '【绝壁筑桥】消耗背负原木，在千米深渊缺口架设木板桥', key: 'build:b1' },
      { text: '【护送长者】协助星屑语学者伊奥脱离绝壁险境', key: 'recruit:io' },
      { text: '全员顶风登上第 4 层圣书馆', key: 'exit' }
    ],
    hints: [
      [2, '这里没有外护栏——被落石撞到或失足，会真的坠落塔下！'],
      [10, '指令要沿着语言链传递。绝壁两端距离太远时，留下中继队员'],
      [20, '靠近断崖缺口按 3 可即时搭设通行木桥']
    ],
    intro: [
      { cam: [20, 3, 32], narr: '云之回廊。绝壁悬挂在千米云海之上，狂风撕裂了古代的木质吊桥。' },
      { cam: [41, 1, 14], narr: '吊篮需要双人重量平衡。留下的人，将成为联系队伍两端的生命线。' },
      { cam: [68, 11.5, 14], who: 'io', say: '✦ zir · ◎ ii ?', sub: '（伊奥老学者在凛冽狂风中守护着破损的古代星图：路断了…）' },
      { cam: [10, 2, 18], who: 'akad', say: '▲ gha · ☼ ka ⇣', sub: '（阿卡德搬起石块：只要我们搭起木桥，就没有跨不过去的深渊！）' }
    ],
    outro: [
      { who: 'io', say: '✦ ses · ◎ om ↑', sub: '（老人第一次听见回声。他紧紧握住年轻人们递出的手）' },
      { narr: '风声渐渐平息，云海上方，是一座装满了千年来全人类古籍的宏伟圣殿。' }
    ]
  });

  // ─────────────────────────── 第 4 层 ───────────────────────────
  L.push({
    id: 4, name: '圣书图书馆', sub: '圣书库 · 冷库危机与知识开源',
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
    objectives: [
      { text: '【放下吊桥】压住配重踏板，联通通向东翼的古卷回廊', key: 'plate:pa' },
      { text: '【知识开源】解开双语终端，化解单石族与学者的封锁猜忌', key: 'stele:s1' },
      { text: '【双核解锁】两路队员分头压住终端踏板，开启冷库安全大门', key: 'gate:gB' },
      { text: '全员携带文明图纸登上天穹·上帝之手', key: 'exit' }
    ],
    hints: [
      [2, '只有同时懂 ◎ 与 ✦ 的人，才能唤醒东翼的石碑终端'],
      [12, '两块重力踏板相隔甚远，需要将小队合理兵分两路协同踩踏']
    ],
    intro: [
      { cam: [30, 7, 34], narr: '圣书图书馆。古代文明的低温冷藏书库进入了紧急封锁，冷气在书架间弥漫。' },
      { cam: [44, 6.5, 14], who: 'ghar', say: '▲ tor · gha ! ✋', sub: '（单石族学者把守在石碑前：为了防止异族篡改文献，他们锁死了冷库大门）' },
      { cam: [49, 6.5, 14], who: 'io', say: '◎ en · ✦ zir-ta', sub: '（伊奥指向石碑双语代码：封闭知识只会让文明窒息，唯有开源共享方能拯救所有人）' },
      { cam: [14, 11.5, 20], narr: '冷库总闸需要两路队员在两端同时压住安全踏板。' }
    ],
    outro: [
      { who: 'sofi', say: '◎ om · ▲ dun ↑', sub: '（封存已久的星图手卷在暖光中展开，指向塔顶最后的穹顶神殿）' },
      { narr: '最后一道阶梯，直插浩瀚星空与宇宙深处。' }
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
