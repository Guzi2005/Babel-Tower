// 五层巴别塔关卡数据（横向剖面坐标：x 向右，y 向上，单位≈1格；角色身高≈1.5）
// 解谜要素：plates 重力踏板(need=所需重量；lang=只认该语言的说话者)、lifts 滑轮升降台（通电后载人往返）、
// gates 闸门、bridges 吊桥、builds 木板路修筑点、steles 语言石碑、levers 拉杆、rocks 松动石块、crates 配重木箱
(function () {
  const L = [];

  // ─────────────────────────── 第 1 层 ───────────────────────────
  L.push({
    id: 1, name: '埃尔遗迹', sub: '枯井村落 · 出发的地方',
    theme: { sky: ['#8fcdf0', '#fbefd2'], stone: '#d9b98a', wall: '#e4cba0', wood: '#a8723d', accent: '#e0703a', fog: '#f6e7c8', far: '#d8c4a0', banner: '#c8502c' },
    bounds: { x1: -18, x2: 76, y1: -7, y2: 16 }, voidY: -20, chainRange: 16,
    spawn: { x: 3, y: 0 }, startMembers: ['ash', 'akad'],
    strangers: [
      { id: 'bani', x: 31.5, y: -5 },
      { id: 'enki', x: 12.5, y: 0 },
      { id: 'ghar', x: 6.5, y: 0 },
      { id: 'tr_farmer_enlil', name: '恩利尔', role: '拓荒农夫', roleIcon: '🌾', roleDesc: '守望西郊大麦梯田的老农，在编时口粮消耗减少 50%', langs: ['🌾', '☼'], x: -14.0, y: 0, pal: { hat: 'straw', hatColor: '#dfb15b', apron: true, coat: '#8a6230', pants: '#4a3820' } },
      { id: 'tr_shepherd', name: '萨姆哈', role: '牧羊向导', roleIcon: '🐑', roleDesc: '熟悉牲口与山道，在编时全队攀爬与行进更加沉稳', langs: ['𓁈', '🌾'], x: -5.5, y: 0, pal: { hat: 'scarf', hatColor: '#6e4530', cloak: true, coat: '#4f8a44', pants: '#3a3020' } },
      { id: 'tr_merchant', name: '纳布·辛', role: '行脚商人', roleIcon: '⚖️', roleDesc: '常驻集市商队，提供以物易物商队交易（木石换口粮/换备用木板）', langs: ['⚖️', '☼'], x: 13.5, y: 0, isMerchant: true, pal: { hat: 'fez', hatColor: '#b83226', sash: true, coat: '#a84e36', pants: '#3c2b18' } },
      { id: 'tr_baker', name: '达姆基', role: '拓荒农夫', roleIcon: '🌾', roleDesc: '熟知麦类储藏，在编时口粮消耗减少 50%', langs: ['☼', '♒'], x: 18.5, y: 0, pal: { hat: 'straw', apron: true } },
      { id: 'tr_mason', name: '乌尔纳姆', role: '筑造工匠', roleIcon: '⚒️', roleDesc: '精通两河砖石构筑，架桥速度提升 2.5 倍', langs: ['☼', '▲'], x: 7.2, y: 0, pal: { hat: 'hood', apron: true } },
      { id: 'tr_weaver', name: '伊什塔尔', role: '织锦工匠', roleIcon: '🧶', roleDesc: '精通条纹花毯编织，熟知防风天幕与绳梯构造', langs: ['☽', '𓁈'], x: 22.5, y: 0, pal: { hat: 'band', sash: true, coat: '#5c4a72', pants: '#8a7a9a' } },
      { id: 'tr_guard', name: '提格拉', role: '巡山卫士', roleIcon: '⚔️', roleDesc: '步履稳健警惕，防止小队在陡峭边缘踏空失足', langs: ['⚔', '𓁈'], x: 38.5, y: 0, pal: { hat: 'circlet', sash: true, coat: '#8d4334', pants: '#244a5a' } },
      { id: 'tr_scout', name: '萨尔贡', role: '巡野斥候', roleIcon: '👁️', roleDesc: '旷野斥候，移动速度提升 25%', langs: ['♒', '▲'], x: 23.5, y: 4.62, pal: { hat: 'scarf', cloak: true } },
      { id: 'tr_scribe', name: '齐姆里', role: '仲介学者', roleIcon: '📜', roleDesc: '手抄本誊录者，语言链辐射距离 +50%', langs: ['☼', '◎'], x: 16.5, y: 0, pal: { hat: 'beret', sash: true } }
    ],
    doorways: [
      { id: 'workshop', x: 8, y: 0, name: '泥砖石构工坊', interiorType: 'workshop' },
      { id: 'council', x: 16, y: 0, name: '村落议事长屋', interiorType: 'council' },
      { id: 'granary', x: 24.5, y: 0, name: '储备粮仓', interiorType: 'granary' }
    ],
    walls: [[-18, 29.6, -8, 0, 'ground'], [33.4, 76, -8, 0, 'ground'], [29.6, 33.4, -8, -5, 'ground']],
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
      [-15.5, 0, 'bread'], [-12.0, 0, 'dates'], [-6.5, 0, 'water'], [-4.2, 0, 'wood'],
      [7.5, 4.62, 'wood'], [8.5, 0, 'wood'], [11, 0, 'wood'], [34, 0, 'wood'],
      [13.8, 0, 'bread'], [21, 0, 'bread'], [23.5, 4.62, 'bread'], [40, 5.2, 'bread'],
      [15, 0, 'dates'], [27.5, 0, 'dates'],
      [9.5, 4.62, 'meat'], [42.5, 5.2, 'meat'],
      [28.5, 0, 'water'], [35.5, 0, 'water']
    ],
    runes: [[3, 4.62], [16, 4.62], [53, 5.2], [45, 10.5]],
    rocks: [], checkpoints: [],
    exit: { x: 60.5, y: 10.5, needRecruit: 'bani' },
    backWalls: [[54, 76, 0, 15]],
    decor: [
      { t: 'field', x1: -18, x2: -8.5, y: 0, z: -1.8, depth: 4.2 },
      { t: 'livestock_pen', x1: -8.5, x2: -2.2, y: 0, z: -0.8, depth: 3.8 },
      { t: 'fig_bush', x: -16.5, y: 0, z: 0.6, r: 0.95 },
      { t: 'fig_bush', x: -9.8, y: 0, z: 0.8, r: 0.85 },
      { t: 'fig_bush', x: -1.2, y: 0, z: -1.5, r: 0.9 },
      { t: 'canal', x1: -18, x2: 27, y: 0, z: 2.2, w: 1.4, gateX: -3.5, bridges: [-10.5, 3.0, 11.6, 20.4] },
      { t: 'palm', x: -17.5, y: 0, z: -2.8 }, { t: 'palm', x: -8.0, y: 0, z: -2.6 },
      { t: 'palm', x: 1.5, y: 0, z: -2.2 }, { t: 'palm', x: 22, y: 0, z: -2.8 }, { t: 'palm', x: 34.5, y: 0, z: -2.4 }, { t: 'palm', x: 63, y: 0, z: -2.2 },
      { t: 'bazaar_tent', x: 13.5, y: 0, z: -0.8, w: 4.2, h: 2.7 },
      { t: 'statue', x: 20.5, y: 0, z: -2.2 },
      { t: 'statue', x: 42, y: 5.2, z: -1.2 },
      { t: 'building', x: 8, y: 0, w: 5.6, h: 4.4, d: 5.2, interiorType: 'workshop', name: '泥砖石构工坊' },
      { t: 'building', x: 16, y: 0, w: 7, h: 4.4, d: 5.5, interiorType: 'council', name: '村落议事长屋' },
      { t: 'building', x: 24.5, y: 0, w: 6.2, h: 4.4, d: 4.8, interiorType: 'granary', name: '储备粮仓' },
      { t: 'kiln', x: 4.2, y: 0, z: -1.5 },
      { t: 'anvil', x: 11.4, y: 0, z: 0.6 },
      { t: 'bakery', x: 20.6, y: 0, z: -0.8 },
      { t: 'market_stall', x: 14.0, y: 0, z: 0.9, w: 2.8, h: 2.4, c1: '#a62d24', c2: '#e5b242', c3: '#1f4e78' },
      { t: 'clay_jars', x: -13.5, y: 0, z: 0.2 },
      { t: 'clay_jars', x: 5.6, y: 0, z: 0.2 },
      { t: 'clay_jars', x: 11.0, y: 0, z: -0.2 },
      { t: 'clay_jars', x: 28.0, y: 0, z: 0.2 },
      { t: 'hay_bale', x: -6.8, y: 0, z: 0.2 },
      { t: 'hay_bale', x: 22.2, y: 0, z: 0.2 },
      { t: 'hay_bale', x: 27.2, y: 0, z: -0.4 },
      { t: 'fence', x1: 18.8, x2: 21.2, y: 0, z: 0.4 },
      { t: 'banner', x: 49, y: 13.8 }, { t: 'banner', x: 60, y: 13.8 },
      { t: 'torch', x: 59, y: 10.5 }, { t: 'cypress', x: 0.5, y: 0, z: -3 }
    ],
    tremor: null,
    objectives: [
      { text: '【地震救人】二人赶往枯井营救巴尼，组成三人核心小队', key: 'recruit:bani' },
      { text: '【塔下搜备】自由探索村落城镇、搜刮物资并招募志士', key: 'loot:items' },
      { text: '【断崖筑桥】消耗背负原木，在裂谷处修筑通行木桥', key: 'build:b1' },
      { text: '【赶到塔脚】赶在巴别塔彻底坍塌前，开启通天大门进塔', key: 'exit' }
    ],
    hints: [
      [1.5, '走到房屋门前按 W 可进入室内避风或探查；按 S 可走出室外'],
      [9, '木箱可被推动——推到 ⚖2 重力踏板上，可将水渠工匠升上来；也可搭人梯救援'],
      [22, '头顶背负原木时，靠近断崖按 3 可即时搭设木板桥；按 4 可急救脱力队员'],
      [40, '负重越多，跳得越低。遇到高台障碍时，可按 7 卸载物资恢复弹跳']
    ],
    intro: [
      { cam: [24, 6, 36], narr: '轰隆隆——！巴别巨塔剧烈震颤倾斜，撕裂大地的超级地震席卷了村落！' },
      { cam: [31.5, -2, 16], narr: '大地震崩毁了井台，工匠巴尼失足跌落枯井深处！' },
      { cam: [4, 1.5, 12], who: 'ash', say: '☼ sol · tor-ka !', sub: '（艾什惊骇望着天穹崩裂的巨塔：巴别塔快塌了！地震把巴尼震进井里了！）' },
      { who: 'akad', say: '☼ soru · ▲ tor !', sub: '（阿卡德握紧石锤：我们二人立刻去井边救人！组成三人队赶在塔倒前爬上塔顶质问上帝！）' },
      { cam: [31.5, -3, 14], who: 'bani', say: '♒ wa… lu… ▲ ul ?', sub: '（井底传来巴尼呼救：救命！枯井水渠被震断了，上面掉下了巨石！）' },
      { cam: [16, 2.5, 20], narr: '【二人救一人组三人队】推木箱压下 ⚖2 踏板，或靠近井边搭人梯/捞人。救出后穿过村庄自由搜备，赶往塔脚！' }
    ],
    outro: [
      { who: 'bani', say: '♒ lu-wa · ▲ gha !', sub: '（三人双手紧扣，身后是聚集的远征队成员）' },
      { narr: '通天石门在沉闷的轰鸣声中升起，迎面而来的是巴别塔内部宏伟回响的螺旋回廊！' }
    ]
  });

  // ─────────────────────────── 第 2 层：巴别巨构内部 · 立体螺旋回廊 ───────────────────────────
  L.push({
    id: 2, name: '巴别巨构内部', sub: '立体螺旋回廊 · 探索与竞争',
    theme: { sky: ['#0f172a', '#1e293b'], stone: '#cbbfa2', wall: '#27201c', wood: '#9a6634', accent: '#f59e0b', fog: '#1a1824', far: '#2d2420', banner: '#dc2626' },
    bounds: { x1: -4, x2: 86, y1: -5, y2: 24 }, voidY: -20, chainRange: 16,
    spawn: { x: 3, y: 0 },
    strangers: [
      { id: 'sofi', name: '苏菲拉', role: '圣殿向导', roleIcon: '📜', roleDesc: '精通巴别塔内多语种铭文与暗道，在编时解谜速度提升 50%', langs: ['▲', '◎'], x: 58.5, y: 11.5, pal: { hat: 'veil', hatColor: '#38bdf8', coat: '#0284c7', pants: '#1e293b' } },
      { id: 'tr_scribe_naram', name: '纳拉姆', role: '受困抄经人', roleIcon: '🖋️', roleDesc: '被困在螺旋通道二层的异邦学者，提供多门语言翻译', langs: ['♒', '☼'], x: 18.5, y: 5.4, pal: { hat: 'hood', hatColor: '#d97706', coat: '#78350f', pants: '#292524' } },
      { id: 'tr_guard_enkidu', name: '恩奇都', role: '圣殿老卫士', roleIcon: '🛡️', roleDesc: '坚守在中层吊运机旁的古老守卫，拥有极高战力', langs: ['▲', '⚔'], x: 42.0, y: 11.5, pal: { hat: 'helm', hatColor: '#94a3b8', coat: '#475569', pants: '#0f172a' } }
    ],
    walls: [[-4, 86, -6, 0, 'ground']],
    plats: [
      [6, 26, 5.4, 'stone'],
      [30, 58, 6.2, 'stone'],
      [16, 44, 11.5, 'stone'],
      [48, 76, 11.5, 'stone'],
      [58, 86, 17.5, 'stone']
    ],
    ladders: [
      [8.5, 0, 5.4],
      [32.5, 0, 6.2],
      [21.0, 5.4, 11.5],
      [52.0, 6.2, 11.5],
      [62.0, 11.5, 17.5]
    ],
    lifts: [
      { id: 'tower_lift_1', x1: 44.5, x2: 47.5, y0: 0, y1: 11.5, trigger: 'p1', style: 'crane' }
    ],
    plates: [
      { id: 'p1', x: 36.0, y: 0, w: 1.6, need: 2 },
      { id: 'p2', x: 35.0, y: 11.5, w: 1.4, need: 1 }
    ],
    gates: [
      { id: 'g1', x: 50.0, y: 11.5, h: 3.5, trigger: 's1' },
      { id: 'g2', x: 74.0, y: 17.5, h: 3.5, trigger: 's2' }
    ],
    bridges: [],
    builds: [
      { id: 'b_spiral_chasm', x1: 26, x2: 30, y: 5.4, cost: 2, name: '螺旋断桥搭设木板' },
      { id: 'b_upper_ramp', x1: 44, x2: 48, y: 11.5, cost: 2, name: '上层通天木栈道' }
    ],
    steles: [
      { id: 's1', x: 28.0, y: 11.5, langs: ['♒', '▲'] },
      { id: 's2', x: 68.0, y: 11.5, langs: ['☼', '◎'] }
    ],
    levers: [
      { id: 'lv1', x: 70.0, y: 11.5 }
    ],
    crates: [
      [32, 0],
      [54, 6.2]
    ],
    items: [
      [10, 5.4, 'wood'], [12, 5.4, 'wood'], [14, 5.4, 'bread'], [20, 5.4, 'stone'],
      [34, 6.2, 'bread'], [38, 6.2, 'meat'], [40, 6.2, 'water'], [42, 6.2, 'wood'],
      [22, 11.5, 'bread'], [25, 11.5, 'stone'], [32, 11.5, 'dates'],
      [56, 11.5, 'stone'], [60, 11.5, 'bread'], [64, 11.5, 'meat'],
      [66, 17.5, 'wood'], [72, 17.5, 'bread']
    ],
    runes: [
      [12, 5.4], [38, 6.2], [24, 11.5], [62, 11.5], [82, 17.5]
    ],
    rocks: [
      [22, 16], [50, 18], [68, 22]
    ],
    checkpoints: [],
    exit: { x: 82.5, y: 17.5, needRecruit: 'sofi' },
    backWalls: [
      [-4, 86, 0, 22]
    ],
    decor: [
      { t: 'waterwheel', x: 6.5, y: 3.4, r: 3.4, z: -2.2 },
      { t: 'waterfall', x: 6.5, y0: 55, y1: -2, w: 2.8, z: -3.0 },
      { t: 'waterfall', x: 63, y0: 55, y1: -2, w: 2.4, z: -6.5 },
      { t: 'banner', x: 18, y: 8.5 }, { t: 'banner', x: 36, y: 14.5 }, { t: 'banner', x: 58, y: 15.0 },
      { t: 'torch', x: 12, y: 5.4 }, { t: 'torch', x: 30, y: 6.2 }, { t: 'torch', x: 48, y: 11.5 }, { t: 'torch', x: 76, y: 17.5 },
      { t: 'cornice', x1: 10, x2: 78, y: 22.0 }
    ],
    tremor: { first: 25, period: 35 },
    objectives: [
      { text: '【螺旋登塔】沿立体螺旋回廊向上攀登，修筑断桥通行', key: 'build:b_spiral_chasm' },
      { text: '【破解密碑】协同解开多语种铭文石碑，开启上层重闸', key: 'stele:s1' },
      { text: '【周旋小队】应对塔内活跃的异邦竞争小队，争夺物资与通路', key: 'defeat:rival' },
      { text: '【登顶天门】全员抵达穹顶通天台阶，开启神谕大门', key: 'exit' }
    ],
    hints: [
      [2, '沿螺旋坡道向上，背负原木可按 3 在断口处架桥连接螺旋道路'],
      [12, '遇到塔内异邦竞争小队时注意保持距离；若其抢夺物资或主动挑衅，队员会自动迎击！'],
      [24, '背负石砖时队员可远程投石攻击；被击倒的队员按 4 喂食面包即可急救复苏']
    ],
    intro: [
      { cam: [16, 6, 36], narr: '巴别巨构内部！宏大深邃的螺旋回廊自地底深渊直插云端天穹！' },
      { cam: [4, 1.5, 12], who: 'ash', say: '☼ sol · ka-rem !', sub: '（艾什仰望无尽盘旋的石道：塔身内部到处是崩塌的断桥与机关，必须小心前行！）' },
      { who: 'akad', say: '▲ tor · ⚔ gha !', sub: '（阿卡德握紧战锤指向前方：看那些旗号！先行进塔的异邦竞争小队已经占领了螺旋通道！）' },
      { cam: [58.5, 11.5, 18], who: 'sofi', say: '▲ dun · ◎ om-en ~', sub: '（中层神殿传来苏菲拉的呼声：解开铭文石碑才能启动通天吊梯！快来会合！）' }
    ],
    outro: [
      { who: 'sofi', say: '◎ yoo · ▲ tor-en !', sub: '（苏菲拉与全队合力解开了最后一座圣言枢纽！）' },
      { narr: '巨型通天齿轮轰然转动，通往巴别塔更高层的悬空云阶在眼前轰鸣铺开！' }
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
