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
      { id: 'enki', x: 12.5, y: 0 },
      { id: 'ghar', x: 6.5, y: 0 },
      { id: 'tr_baker', name: '达姆基', role: '拓荒农夫', roleIcon: '🌾', roleDesc: '熟知麦类储藏，在编时口粮消耗减少 50%', langs: ['☼', '♒'], x: 14.5, y: 0 },
      { id: 'tr_mason', name: '乌尔纳姆', role: '筑造工匠', roleIcon: '⚒️', roleDesc: '精通两河砖石构筑，架桥速度提升 2.5 倍', langs: ['☼', '▲'], x: 7.2, y: 0 },
      { id: 'tr_scout', name: '萨尔贡', role: '巡野斥候', roleIcon: '👁️', roleDesc: '旷野斥候，移动速度提升 25%', langs: ['♒', '▲'], x: 23.5, y: 4.62 },
      { id: 'tr_scribe', name: '齐姆里', role: '仲介学者', roleIcon: '📜', roleDesc: '手抄本誊录者，语言链辐射距离 +50%', langs: ['☼', '◎'], x: 17.5, y: 0 }
    ],
    doorways: [
      { id: 'workshop', x: 8, y: 0, name: '泥砖石构工坊', interiorType: 'workshop' },
      { id: 'council', x: 16, y: 0, name: '村落议事厅', interiorType: 'council' },
      { id: 'granary', x: 24.5, y: 0, name: '谷物粮仓', interiorType: 'granary' }
    ],
    walls: [[0, 29.6, -8, 0, 'ground'], [33.4, 64, -8, 0, 'ground'], [29.6, 33.4, -8, -5, 'ground']],
    plats: [[10.7, 12.6, 4.62, 'wood'], [19.4, 21.5, 4.62, 'wood'], [2, 7, 4.62, 'stone'], [36, 47, 5.2, 'stone'], [50, 56, 5.2, 'stone'], [44, 62, 10.5, 'stone']],
    ladders: [[5.5, 0, 4.62], [27.4, 0, 4.62], [37.2, 0, 5.2], [55, 5.2, 10.5]],
    lifts: [{ id: 'well', x1: 29.8, x2: 33.2, y0: -5, y1: 0, trigger: 'p1', style: 'well' }],
    plates: [{ id: 'p1', x: 25.8, y: 0, w: 1.6, need: 2 }],
    gates: [{ id: 'g1', x: 57.8, y: 10.5, h: 3.5, trigger: 's1' }],
    bridges: [], builds: [
      { id: 'b_well', x1: 29.6, x2: 33.4, y: 0, cost: 2, name: '枯井铺设木桥' },
      { id: 'b1', x1: 47, x2: 50, y: 5.2, cost: 2, name: '断崖栈桥' }
    ],
    steles: [{ id: 's1', x: 47.5, y: 10.5, langs: ['♒', '▲'] }],
    levers: [],
    crates: [[18, 0]],
    items: [
      [7.5, 4.62, 'wood'], [8.5, 0, 'wood'], [11, 0, 'wood'], [34, 0, 'wood'],
      [21, 0, 'bread'], [23.5, 4.62, 'bread'], [40, 5.2, 'bread'],
      [15, 0, 'dates'], [27.5, 0, 'dates'],
      [9.5, 4.62, 'meat'], [42.5, 5.2, 'meat'],
      [28.5, 0, 'water'], [35.5, 0, 'water']
    ],
    runes: [[3, 4.62], [16, 4.62], [53, 5.2], [45, 10.5]],
    rocks: [], checkpoints: [],
    exit: { x: 60.5, y: 10.5, needRecruit: 'bani' },
    backWalls: [[54, 64, 0, 15]],
    decor: [
      { t: 'palm', x: 1.5, y: 0, z: -2.2 }, { t: 'palm', x: 22, y: 0, z: -2.8 }, { t: 'palm', x: 34.5, y: 0, z: -2.4 }, { t: 'palm', x: 63, y: 0, z: -2.2 },
      { t: 'statue', x: 20.5, y: 0, z: -2.2 },
      { t: 'statue', x: 42, y: 5.2, z: -1.2 },
      { t: 'building', x: 8, y: 0, w: 5.6, h: 4.4, d: 5.2, interiorType: 'workshop', name: '泥砖石构工坊' },
      { t: 'building', x: 16, y: 0, w: 7, h: 4.4, d: 5.5, interiorType: 'council', name: '村落议事长屋' },
      { t: 'building', x: 24.5, y: 0, w: 6.2, h: 4.4, d: 4.8, interiorType: 'granary', name: '储备粮仓' },
      { t: 'clay_jars', x: 5.6, y: 0, z: 0.2 },
      { t: 'clay_jars', x: 11.0, y: 0, z: -0.2 },
      { t: 'clay_jars', x: 28.0, y: 0, z: 0.2 },
      { t: 'hay_bale', x: 21.5, y: 0, z: 0.2 },
      { t: 'hay_bale', x: 27.2, y: 0, z: -0.4 },
      { t: 'awning', x: 11.6, y: 0, w: 3.2, h: 2.4, z: -0.5 },
      { t: 'fence', x1: 18.8, x2: 21.2, y: 0, z: 0.4 },
      { t: 'banner', x: 49, y: 13.8 }, { t: 'banner', x: 60, y: 13.8 },
      { t: 'torch', x: 59, y: 10.5 }, { t: 'cypress', x: 4.5, y: 0, z: -3 }
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
    strangers: [{ id: 'sofi', x: 58.5, y: 10.5 }],
    walls: [[0, 70, -6, 0, 'ground']],
    plats: [[3, 10, 6, 'wood'], [22, 34, 5.4, 'stone'], [40.6, 68, 10.5, 'stone']],
    ladders: [[9.2, 0, 6], [22.8, 0, 5.4]],
    lifts: [{ id: 'lf1', x1: 38, x2: 40.6, y0: 0, y1: 10.5, trigger: 'p1', style: 'crane' }],
    plates: [{ id: 'p1', x: 35, y: 0, w: 1.6, need: 2 }, { id: 'p2', x: 46, y: 10.5, w: 1.4, need: 1 }],
    gates: [{ id: 'g1', x: 52, y: 10.5, h: 3.5, trigger: 'p2' }],
    bridges: [], builds: [], steles: [], levers: [],
    crates: [[31, 5.4]],
    items: [[6, 6, 'wood'], [7.5, 6, 'wood'], [17, 0, 'bread'], [25.5, 0, 'stone'], [64, 10.5, 'bread']],
    runes: [[4, 6], [27, 5.4], [50, 0]],
    rocks: [[49, 14.5], [14, 8.5]],
    checkpoints: [],
    exit: { x: 66, y: 10.5, needRecruit: 'sofi' },
    backWalls: [[40, 70, 0, 16]],
    decor: [
      { t: 'waterwheel', x: 6.5, y: 3.4, r: 3.4, z: -2.2 }, { t: 'waterfall', x: 6.5, y0: 55, y1: -2, w: 2.8, z: -3.0 },
      { t: 'waterfall', x: 63, y0: 55, y1: -2, w: 2.4, z: -6.5 },
      { t: 'banner', x: 29, y: 9.0 }, { t: 'banner', x: 56, y: 14.5 }, { t: 'banner', x: 46, y: 14.5 },
      { t: 'torch', x: 44, y: 10.5 }, { t: 'torch', x: 62, y: 10.5 }, { t: 'cypress', x: 19, y: 0, z: -2.6 }, { t: 'cypress', x: 36.5, y: 0, z: -2.6 },
      { t: 'relic_can', x: 26.5, y: 5.4, id: 'relic_can', name: '精加工铝合金罐头' },
      { t: 'cornice', x1: 43, x2: 61, y: 15.0 }, { t: 'aqueduct', z: -34, y: 2 }
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
    strangers: [{ id: 'io', x: 68, y: 10.5 }],
    walls: [[0, 16, -3, 0, 'stone'], [22, 60, -3, 0, 'stone']],
    plats: [[34, 41.2, 5.4, 'wood'], [52, 58, 5.4, 'wood'], [42, 48, 10.5, 'stone'], [50.5, 60, 10.5, 'stone'], [63, 74, 10.5, 'stone']],
    ladders: [[35.5, 0, 5.4], [53, 0, 5.4], [57, 5.4, 10.5, 'lv1']],
    lifts: [{ id: 'lf1', x1: 48, x2: 50.5, y0: 0, y1: 10.5, trigger: 'p2', style: 'crane' }],
    plates: [{ id: 'p1', x: 12, y: 0, w: 1.4, need: 1 }, { id: 'p2', x: 41, y: 0, w: 1.6, need: 2 }],
    gates: [],
    bridges: [{ id: 'db1', x1: 16, x2: 22, y: 0, trigger: 'p1' }],
    builds: [{ id: 'b1', x1: 60, x2: 63, y: 10.5, cost: 2 }],
    steles: [], levers: [{ id: 'lv1', x: 58.8, y: 10.5 }],
    crates: [[38, 5.4]],
    items: [[28, 0, 'stone'], [55, 5.4, 'wood'], [56.3, 5.4, 'wood'], [34, 0, 'bread']],
    runes: [[36.5, 5.4], [57.6, 5.4], [43, 10.5]],
    rocks: [[56, 15.2], [66, 15.2], [33, 5.8]],
    checkpoints: [[24, 0], [52, 10.5]],
    exit: { x: 72.5, y: 10.5, needRecruit: 'io' },
    backWalls: [[22, 60, 0, 6], [42, 74, 10.5, 16]],
    decor: [
      { t: 'statue', x: 7.5, y: 0, z: -2.2 }, { t: 'banner', x: 30, y: 5.2 }, { t: 'banner', x: 45, y: 15.2 }, { t: 'banner', x: 70, y: 15.2 },
      { t: 'cypress', x: 26, y: 0, z: -1.8 }, { t: 'cypress', x: 37, y: 0, z: -1.8 }, { t: 'torch', x: 64, y: 10.5 },
      { t: 'waterfall', x: 39, y0: 60, y1: -18, w: 2.6, z: -7 }, { t: 'waterfall', x: 66, y0: 60, y1: -18, w: 3.0, z: -10 },
      { t: 'relic_radio', x: 37, y: 0, id: 'relic_radio', name: '蜂鸣的真空铜管' },
      { t: 'cornice', x1: 52, x2: 70, y: 15.2 }, { t: 'aqueduct', z: -40, y: -2 }
    ],
    tremor: { first: 26, period: 34 },
    objectives: [
      { text: '【压住吊桥】用石砖配重压住吊桥踏板，联通外廊悬桥', key: 'plate:p1' },
      { text: '【推下配重箱】把高台木箱推下绝壁，压在 ⚖2 踏板上激活水力升降机', key: 'plate:p2' },
      { text: '【降下云梯】操纵悬崖风弦拉杆，降下高空回廊绳梯', key: 'lever:lv1' },
      { text: '【绝壁筑桥】消耗背负原木，在千米深渊缺口架设木板桥', key: 'build:b1' },
      { text: '【护送长者】协助星屑语学者伊奥脱离绝壁险境', key: 'recruit:io' },
      { text: '全员顶风登上第 4 层圣书馆', key: 'exit' }
    ],
    hints: [
      [2, '把高空悬臂平台上的配重木箱推下边缘，正好砸在下方的 ⚖2 踏板上激活升降台！'],
      [10, '指令要沿着语言链传递。绝壁两端距离太远时，留下中继队员'],
      [20, '靠近断崖缺口按 3 可即时搭设通行木桥']
    ],
    intro: [
      { cam: [20, 3, 32], narr: '云之回廊。绝壁悬挂在千米云海之上，狂风撕裂了古代的木质吊桥。' },
      { cam: [38, 5, 20], narr: '爬上木梯，把高台悬臂上的配重木箱推下绝壁边缘，压在 ⚖2 踏板上！' },
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
    strangers: [{ id: 'ghar', x: 44, y: 5.4 }, { id: 'ul', x: 42.5, y: 5.4 }],
    walls: [[0, 64, -6, 0, 'ground'], [-2, 0, 0, 20, 'stone'], [64, 66, 0, 20, 'stone']],
    plats: [[4, 40, 5.4, 'wood'], [46, 60, 5.4, 'wood'], [10, 60, 10.8, 'stone']],
    ladders: [[6, 0, 5.4], [58.5, 5.4, 10.8]],
    lifts: [],
    plates: [{ id: 'pa', x: 41, y: 0, w: 1.6, need: 2 }, { id: 'pb', x: 40, y: 10.8, w: 1.4, need: 1 }, { id: 'pc', x: 24, y: 10.8, w: 1.4, need: 1 }],
    gates: [{ id: 'gA', x: 53, y: 5.4, h: 3.5, trigger: 's1' }, { id: 'gB', x: 15, y: 10.8, h: 3.5, trigger: ['pb', 'pc'] }],
    bridges: [{ id: 'db1', x1: 40, x2: 46, y: 5.4, trigger: 'pa' }],
    builds: [],
    steles: [{ id: 's1', x: 49, y: 5.4, langs: ['◎', '✦'] }],
    levers: [],
    crates: [[36.5, 5.4], [30, 10.8]],
    items: [[30, 0, 'bread'], [20, 5.4, 'bread']],
    runes: [[62, 0], [14, 5.4], [50, 10.8]],
    rocks: [[40, 15.2], [33, 15.2]],
    checkpoints: [],
    exit: { x: 11.5, y: 10.8 },
    backWalls: [[0, 64, 0, 16]],
    decor: [
      { t: 'shelf', x: 9, y: 0, w: 6, h: 4.8 }, { t: 'shelf', x: 22, y: 0, w: 6, h: 4.8 }, { t: 'shelf', x: 50, y: 0, w: 7, h: 4.8 },
      { t: 'shelf', x: 15, y: 5.4, w: 8, h: 4.8 }, { t: 'shelf', x: 30, y: 5.4, w: 5, h: 4.8 }, { t: 'shelf', x: 22, y: 10.8, w: 9, h: 4.8 }, { t: 'shelf', x: 46, y: 10.8, w: 9, h: 4.8 },
      { t: 'statue', x: 34, y: 0, z: -2.2 }, { t: 'armillary', x: 57, y: 1.7, r: 1.3, z: -1.5 },
      { t: 'banner', x: 4, y: 15.2 }, { t: 'banner', x: 60, y: 15.2 }, { t: 'banner', x: 36, y: 9.8 },
      { t: 'torch', x: 18, y: 0 }, { t: 'torch', x: 44, y: 0 }, { t: 'torch', x: 36, y: 10.8 }, { t: 'torch', x: 54, y: 10.8 },
      { t: 'cornice', x1: 10, x2: 60, y: 16 }
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
    plats: [[9, 20, 5.2, 'stone'], [44, 55, 5.2, 'stone'], [25, 39, 9.2, 'stone'], [28, 36, 14.2, 'stone']],
    ladders: [[10.5, 0, 5.2], [53.5, 0, 5.2], [26.5, 0, 9.2], [37.5, 0, 9.2], [32, 9.2, 14.2]],
    lifts: [],
    plates: [
      { id: 'l1', x: 5, y: 0, w: 1.4, lang: '☼' }, { id: 'l2', x: 59, y: 0, w: 1.4, lang: '♒' },
      { id: 'l3', x: 15, y: 5.2, w: 1.4, lang: '▲' }, { id: 'l4', x: 49, y: 5.2, w: 1.4, lang: '◎' }, { id: 'l5', x: 33.5, y: 14.2, w: 1.4, lang: '✦' }
    ],
    gates: [], bridges: [], builds: [], steles: [], levers: [],
    crates: [], items: [], runes: [[29, 14.2]], rocks: [], checkpoints: [],
    exit: null, finalTrigger: ['l1', 'l2', 'l3', 'l4', 'l5'],
    backWalls: [],
    decor: [
      { t: 'armillary', x: 32, y: 20.5, r: 5.2, z: -3, big: true }, { t: 'armillary', x: 32, y: 20.5, r: 3.6, z: -3, big: true, reverse: true },
      { t: 'statue', x: 22, y: 9.2, z: -1.8 }, { t: 'statue', x: 42, y: 9.2, z: -1.8 },
      { t: 'banner', x: 26, y: 13.5 }, { t: 'banner', x: 38, y: 13.5 }, { t: 'torch', x: 25.5, y: 9.2 }, { t: 'torch', x: 38.5, y: 9.2 }
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
