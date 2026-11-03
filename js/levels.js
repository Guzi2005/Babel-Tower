// 五层巴别塔关卡数据（横向剖面坐标：x 向右，y 向上，单位≈1格；角色身高≈1.5）
// 解谜要素：plates 重力踏板(need=所需重量；lang=只认该语言的说话者)、lifts 滑轮升降台（通电后载人往返）、
// gates 闸门、bridges 吊桥、builds 木板路修筑点、steles 语言石碑、levers 拉杆、rocks 松动石块、crates 配重木箱
(function () {
  const L = [];

  // ─────────────────────────── 全景统一世界大地图（从荒原绿洲到天穹之巅） ───────────────────────────
  L.push({
    id: 1, name: '巴别通天大冒险', sub: '统一世界 · 从荒原绿洲到天穹之巅',
    theme: { sky: ['#8fcdf0', '#fbefd2'], stone: '#d9b98a', wall: '#e4cba0', wood: '#a8723d', accent: '#e0703a', fog: '#f6e7c8', far: '#d8c4a0', banner: '#c8502c' },
    bounds: { x1: -110, x2: 125, y1: -7, y2: 140 }, voidY: -20, chainRange: 18,
    spawn: { x: 3, y: 0 }, startMembers: ['ash', 'akad'],
    zones: [
      {
        id: 0,
        name: '序章·埃尔遗迹与古地荒原',
        sub: '枯井村落 · 出发的地方',
        minY: -10, maxY: 12.0,
        spawn: { x: 3, y: 0 },
        alt: '海拔 0m ~ 140m',
        bgmTrack: 0,
        objectives: [
          { text: '【地震救人】二人赶往枯井营救巴尼，组成三人核心小队', key: 'recruit:bani' },
          { text: '【塔下搜备】自由探索村落城镇、搜刮物资并招募志士', key: 'loot:items' },
          { text: '【断崖筑桥】消耗背负原木，在裂谷处修筑通行木桥', key: 'build:b1' },
          { text: '【开启天门】解开古碑开启通天大门，带队步入巨塔中庭', key: 'gate:g1' }
        ]
      },
      {
        id: 1,
        name: '第 1 章·巴别巨构内部',
        sub: '塔内巨构中庭 · 螺旋回廊与竞争',
        minY: 12.0, maxY: 32.0,
        spawn: { x: 59, y: 12.0 },
        alt: '海拔 140m ~ 420m · 塔内中庭',
        bgmTrack: 1,
        objectives: [
          { text: '【螺旋登塔】穿过天门步入巨构中庭，沿螺旋回廊修桥攀登', key: 'build:b_spiral_chasm' },
          { text: '【破解密碑】协同解开多语种铭文石碑，开启上层重闸', key: 'stele:s2' },
          { text: '【周旋小队】应对塔内活跃的异邦竞争小队，争夺物资与通路', key: 'defeat:rival' },
          { text: '【步出外廊】全员抵达外廊通天台阶，开启神谕大门步出云端', key: 'gate:g2' }
        ]
      },
      {
        id: 2,
        name: '第 2 章·云之回廊',
        sub: '绝壁云海 · 悬桥与千米工程',
        minY: 32.0, maxY: 50.0,
        spawn: { x: 48, y: 32.0 },
        alt: '海拔 420m ~ 980m · 绝壁云端',
        bgmTrack: 2,
        objectives: [
          { text: '【压住吊桥】用石砖配重压住吊桥踏板，联通外廊悬桥', key: 'plate:p_c1' },
          { text: '【推下配重箱】把高台木箱推下绝壁，激活外壁水力升降机', key: 'plate:p_c2' },
          { text: '【降下云梯】操纵悬崖风弦拉杆，降下高空回廊绳梯', key: 'lever:lv_c1' },
          { text: '【绝壁筑桥】消耗背负原木，在千米深渊缺口架设木板桥', key: 'build:b_c1' },
          { text: '【护送长者】协助星屑语学者伊奥脱离绝壁险境', key: 'recruit:io' }
        ]
      },
      {
        id: 3,
        name: '第 3 章·圣书图书馆',
        sub: '塔内圣书大图书馆 · 秘卷冷库',
        minY: 50.0, maxY: 68.0,
        spawn: { x: 86, y: 50.0 },
        alt: '海拔 980m ~ 1600m · 圣书殿堂',
        bgmTrack: 3,
        objectives: [
          { text: '【放下吊桥】压住配重踏板，联通通向东翼的古卷回廊', key: 'plate:pa' },
          { text: '【知识开源】解开双语终端，化解单石族与学者的封锁猜忌', key: 'stele:s_lib' },
          { text: '【双核解锁】两路队员分头压住终端踏板，开启冷库安全大门', key: 'gate:gB' },
          { text: '【通天登阶】登上通天最高阶梯，穿出拱门走向天穹之巅', key: 'gate:gB' }
        ]
      },
      {
        id: 4,
        name: '终章·天穹 · 上帝之手',
        sub: '天穹之巅 · 万语同源与破晓黄金金坛',
        minY: 68.0, maxY: 130.0,
        spawn: { x: 63, y: 68.0 },
        alt: '海拔 1600m ~ 2500m+ · 天穹之巅',
        bgmTrack: 4,
        objectives: [
          { text: '【五语归一】让五种语言的说话者，各自站上属于自己符号的圣盘', key: 'final' }
        ]
      }
    ],
    strangers: [
      // 村落居民与志士
      { id: 'bani', x: 31.5, y: -5 },
      { id: 'enki', x: 12.5, y: 0 },
      { id: 'tr_farmer_enlil', name: '恩利尔', role: '拓荒农夫', roleIcon: '🌾', roleDesc: '守望西郊大麦梯田的老农，在编时口粮消耗减少 50%', langs: ['🌾', '☼'], x: -14.0, y: 1.8, pal: { hat: 'straw', hatColor: '#dfb15b', apron: true, coat: '#8a6230', pants: '#4a3820' } },
      { id: 'tr_shepherd', name: '萨姆哈', role: '牧羊向导', roleIcon: '🐑', roleDesc: '熟悉牲口与山道，在编时全队攀爬与行进更加沉稳', langs: ['𓁈', '🌾'], x: -7.5, y: 1.8, pal: { hat: 'scarf', hatColor: '#6e4530', cloak: true, coat: '#4f8a44', pants: '#3a3020' } },
      { id: 'tr_merchant', name: '纳布·辛', role: '行脚商人', roleIcon: '⚖️', roleDesc: '常驻集市商队，提供以物易物商队交易（木石换口粮/换备用木板）', langs: ['⚖️', '☼'], x: 13.5, y: 0, isMerchant: true, pal: { hat: 'fez', hatColor: '#b83226', sash: true, coat: '#a84e36', pants: '#3c2b18' } },
      { id: 'tr_baker', name: '达姆基', role: '拓荒农夫', roleIcon: '🌾', roleDesc: '熟知麦类储藏，在编时口粮消耗减少 50%', langs: ['☼', '♒'], x: 18.5, y: 0, pal: { hat: 'straw', apron: true } },
      { id: 'tr_mason', name: '乌尔纳姆', role: '筑造工匠', roleIcon: '⚒️', roleDesc: '精通古法砖石构筑，架桥速度提升 2.5 倍', langs: ['☼', '▲'], x: 7.2, y: 0, pal: { hat: 'hood', apron: true } },
      { id: 'tr_weaver', name: '伊什塔尔', role: '织锦工匠', roleIcon: '🧶', roleDesc: '精通条纹花毯编织，熟知防风天幕与绳梯构造', langs: ['☽', '𓁈'], x: 22.5, y: 0, pal: { hat: 'band', sash: true, coat: '#5c4a72', pants: '#8a7a9a' } },
      { id: 'tr_guard', name: '提格拉', role: '巡山卫士', roleIcon: '⚔️', roleDesc: '步履稳健警惕，防止小队在陡峭边缘踏空失足', langs: ['⚔', '𓁈'], x: 38.5, y: 0, pal: { hat: 'circlet', sash: true, coat: '#8d4334', pants: '#244a5a' } },
      { id: 'tr_scout', name: '萨尔贡', role: '巡野斥候', roleIcon: '👁️', roleDesc: '旷野斥候，移动速度提升 25%', langs: ['♒', '▲'], x: 23.5, y: 4.62, pal: { hat: 'scarf', cloak: true } },
      { id: 'tr_scribe', name: '齐姆里', role: '仲介学者', roleIcon: '📜', roleDesc: '手抄本誊录者，语言链辐射距离 +50%', langs: ['☼', '◎'], x: 16.5, y: 0, pal: { hat: 'beret', sash: true } },
      // 巴别塔第一层（螺旋回廊层 y=12.0..32.0，塔心 x=67）
      { id: 'sofi', name: '苏菲拉', role: '圣殿向导', roleIcon: '📜', roleDesc: '精通巴别塔内多语种铭文与暗道，在编时解谜速度提升 50%', langs: ['▲', '◎'], x: 58.5, y: 25.0, pal: { hat: 'veil', hatColor: '#38bdf8', coat: '#0284c7', pants: '#1e293b' } },
      { id: 'tr_scribe_naram', name: '纳拉姆', role: '受困抄经人', roleIcon: '🖋️', roleDesc: '被困在螺旋通道二层的异邦学者，提供多门语言翻译', langs: ['♒', '☼'], x: 64.0, y: 18.0, pal: { hat: 'hood', hatColor: '#d97706', coat: '#78350f', pants: '#292524' } },
      { id: 'tr_guard_enkidu', name: '恩奇都', role: '圣殿老卫士', roleIcon: '🛡️', roleDesc: '坚守在中层吊运机旁的古老守卫，拥有极高战力', langs: ['▲', '⚔'], x: 52.0, y: 25.0, pal: { hat: 'helm', hatColor: '#94a3b8', coat: '#475569', pants: '#0f172a' } },
      // 巴别塔第二层（云之回廊层 y=32.0..50.0，塔心 x=67）
      { id: 'io', name: '伊奥', role: '星图学者', roleIcon: '✦', roleDesc: '守护星屑古代星盘的长者，掌握星屑神谕', langs: ['✦', '◎'], x: 88.0, y: 44.0 },
      // 巴别塔第三层（圣书图书馆层 y=50.0..68.0，塔心 x=67）
      { id: 'ghar', x: 70.0, y: 50.0 },
      { id: 'ul', x: 68.5, y: 50.0 }
    ],
    doorways: [
      { id: 'workshop', x: 8, y: 0, name: '泥砖石构工坊', interiorType: 'workshop' },
      { id: 'council', x: 16, y: 0, name: '村落议事长屋', interiorType: 'council' },
      { id: 'granary', x: 24.5, y: 0, name: '储备粮仓', interiorType: 'granary' }
    ],
    walls: [
      // 仅保留地面与枯井地基（台地与塔身全部作为可攀登平台，避免阻断寻路或悬空穿模）
      [-18, 29.6, -8, 0, 'ground'],
      [33.4, 96.0, -8, 0, 'ground'],
      [29.6, 33.4, -8, -5, 'ground']
    ],
    plats: [
      // ── 第 0 阶段：村落台地、屋顶与采石场天阶 ──
      [-18.0, -4.5, 1.8, 'earth', -5.0, 3.5],   // 西侧大麦梯田与牧场台地 (y=1.8)
      [-16.0, -10.5, 5.0, 'wood', -4.5, 2.5],   // 牧羊向导观景高台 (y=5.0)
      [-4.8, -2.8, 1.2, 'stone', -3.0, 2.0],    // 西侧台地向下延伸阶梯 1 (y=1.2)
      [-3.0, -1.0, 0.6, 'stone', -3.0, 2.0],    // 西侧台地向下延伸阶梯 2 (y=0.6)
      [2.0, 3.8, 1.5, 'stone', -3.0, 2.0],      // 工坊外侧上房石阶 1 (y=1.5)
      [3.5, 5.3, 3.0, 'stone', -3.0, 2.0],      // 工坊外侧上房石阶 2 (y=3.0)
      [5.2, 11.0, 4.62, 'stone', -5.5, 1.5],    // 泥砖工坊屋顶晒台 (y=4.62)
      [10.8, 13.2, 4.62, 'wood', -3.0, 2.0],    // 跨巷空中连廊 1 (工坊 -> 议事长屋)
      [12.5, 19.5, 4.62, 'stone', -5.5, 1.5],   // 议事长屋二层露台 (y=4.62)
      [14.2, 17.8, 8.2, 'wood', -4.5, 1.5],     // 议事长屋顶层三级瞭望哨塔 (y=8.2)
      [19.2, 21.6, 4.62, 'wood', -3.0, 2.0],    // 跨巷空中连廊 2 (议事长屋 -> 粮仓)
      [21.5, 27.8, 4.62, 'stone', -5.5, 1.5],   // 储备粮仓谷物晾晒台 (y=4.62)
      [33.2, 35.6, 1.2, 'stone', -3.0, 2.0],    // 采石台地石阶 (y=1.2)
      [33.4, 41.2, 2.4, 'stone', -4.5, 2.5],    // 采石场一层石阶台地 (y=2.4)
      [39.5, 47.0, 5.2, 'stone', -4.0, 2.5],    // 中层巡山栈道平台 (y=5.2)
      [50.0, 56.5, 5.2, 'stone', -4.0, 2.5],    // 外侧防风哨塔平台 (y=5.2)
      [44.0, 57.8, 12.0, 'stone', -14.0, 4.0],  // 巴别塔西翼通天大门外广场 (y=12.0)

      // ── 第 1 章：巴别塔同心圆巨构一层 · 52米直径圆环大殿与三大扇区 (y=12.0, R=26m) ──
      [41.0, 93.0, 12.0, 'stone', -36.0, 16.0, { isCircle: true, cx: 67.0, cz: -10.0, r: 26.0 }],  // 一层同心圆大厦主殿 (y=12.0, R=26m)
      [43.5, 90.5, 18.0, 'stone', -33.5, 13.5, { isCircle: true, cx: 67.0, cz: -10.0, r: 23.5 }],  // 二层螺旋同心圆回廊西段 (y=18.0, R=23.5m)
      [46.0, 88.0, 25.0, 'stone', -31.0, 11.0, { isCircle: true, cx: 67.0, cz: -10.0, r: 21.0 }],  // 三层内环同心圆回廊 (y=25.0, R=21m)
      [48.5, 85.5, 32.0, 'stone', -28.5, 8.5, { isCircle: true, cx: 67.0, cz: -10.0, r: 18.5 }],   // 二层神谕圆环大殿与外殿 (y=32.0, R=18.5m)

      // ── 第 2 章：巴别塔同心圆巨构二层 · 云之回廊与悬空绝壁 (y=32~50m) ──
      [50.5, 83.5, 38.0, 'wood', -26.5, 6.5, { isCircle: true, cx: 67.0, cz: -10.0, r: 16.5 }],    // 绝壁中层木构回廊 (y=38.0, R=16.5m)
      [52.0, 82.0, 44.0, 'stone', -25.0, 5.0, { isCircle: true, cx: 67.0, cz: -10.0, r: 15.0 }],   // 高空悬臂风弦圆殿 (y=44.0, R=15m)

      // ── 第 3 章：巴别塔同心圆巨构三层 · 博尔赫斯圆形圣书图书馆与冷库 (y=50~68m) ──
      [53.5, 80.5, 50.0, 'stone', -23.5, 3.5, { isCircle: true, cx: 67.0, cz: -10.0, r: 13.5 }],   // 博尔赫斯圆形大图书馆主殿 (y=50.0, R=13.5m)
      [55.5, 78.5, 58.0, 'stone', -21.5, 1.5, { isCircle: true, cx: 67.0, cz: -10.0, r: 11.5 }],   // 秘卷冷库圆环大殿 (y=58.0, R=11.5m)
      [57.0, 77.0, 61.5, 'stone', -20.0, 0.0, { isCircle: true, cx: 67.0, cz: -10.0, r: 10.0 }],   // 古星图天球密阁 (y=61.5, R=10m)

      // ── 终章：巴别同心圆巨构之巅 · 天穹圣殿与破晓金坛 (y=68~86m) ──
      [58.0, 76.0, 68.0, 'stone', -19.0, -1.0, { isCircle: true, cx: 67.0, cz: -10.0, r: 9.0 }],   // 神圣天穹圆环基座大殿 (y=68.0, R=9m)
      [59.5, 74.5, 74.0, 'stone', -17.5, -2.5, { isCircle: true, cx: 67.0, cz: -10.0, r: 7.5 }],   // 五语同心圆圣盘殿 (y=74.0, R=7.5m)
      [61.0, 73.0, 80.0, 'stone', -16.0, -4.0, { isCircle: true, cx: 67.0, cz: -10.0, r: 6.0 }],   // 黄金圣殿拱卫圆台 (y=80.0, R=6m)
      [62.5, 71.5, 86.0, 'stone', -14.5, -5.5, { isCircle: true, cx: 67.0, cz: -10.0, r: 4.5 }]    // ✦ 塔心破晓光冕金坛 (y=86.0, R=4.5m)
    ],
    ladders: [
      // 村落与采石场爬梯
      [-13.5, 1.8, 5.0],    // 西郊牧羊望台木梯
      [5.5, 0, 4.62],       // 工坊外梯
      [15.5, 4.62, 8.2],    // 议事长屋屋顶通往三层高空瞭望塔的木梯
      [21.8, 0, 4.62],      // 粮仓西侧爬梯
      [27.4, 0, 4.62],      // 粮仓东侧爬梯
      [35.5, 0, 2.4],       // 采石场一层爬梯
      [40.5, 2.4, 5.2],     // 采石场到中层巡山栈道爬梯
      [55.0, 5.2, 12.0],    // 外侧哨塔到巴别塔门长梯
      // 第 1 章：螺旋回廊爬梯 (Inside)
      [64.0, 12.0, 18.0],   // 塔内一层到螺旋二层爬梯
      [79.5, 18.0, 25.0],   // 螺旋二层东台到三层主回廊爬梯
      [82.0, 25.0, 32.0],   // 螺旋三层到二层大回廊天梯
      // 第 2 章：云之回廊爬梯 (Outside)
      [55.5, 32.0, 38.0],   // 绝壁中层梯 1
      [73.0, 32.0, 38.0],   // 绝壁中层梯 2
      [77.0, 38.0, 44.0],   // 风弦拉杆悬臂爬梯
      [78.0, 44.0, 50.0],   // 云海星图台通往圣书馆正门天梯
      // 第 3 章：圣书馆爬梯 (Inside)
      [60.0, 50.0, 58.0],   // 圣书馆通往冷库圆环梯
      [67.0, 58.0, 68.0],   // 秘卷冷库中央塔心登云天梯 (Tower Center x=67)
      // 终章：天穹之巅爬梯 (Outside)
      [63.0, 68.0, 74.0],   // 通天基座到西圣盘天梯
      [71.0, 74.0, 80.0],   // 圣殿中层天梯
      [67.0, 80.0, 86.0]    // 通天光冕黄金天梯（塔心正中 x=67）
    ],
    lifts: [
      { id: 'well', x1: 29.8, x2: 33.2, y0: -5, y1: 0, trigger: 'p1', style: 'well' },
      { id: 'tower_lift_1', x1: 70.0, x2: 73.0, y0: 12.0, y1: 25.0, trigger: 'p_t1', style: 'crane' },
      { id: 'lf1', x1: 68.0, x2: 70.5, y0: 32.0, y1: 44.0, trigger: 'p_c2', style: 'crane' }
    ],
    plates: [
      { id: 'p1', x: 25.8, y: 0, w: 1.6, need: 2 },
      { id: 'p_t1', x: 66.0, y: 12.0, w: 1.6, need: 2 },
      { id: 'p_t2', x: 55.0, y: 25.0, w: 1.4, need: 1 },
      { id: 'p_c1', x: 52.0, y: 32.0, w: 1.4, need: 1 },
      { id: 'p_c2', x: 61.0, y: 32.0, w: 1.6, need: 2 },
      { id: 'pa', x: 65.0, y: 44.0, w: 1.6, need: 2 },
      { id: 'pb', x: 82.0, y: 58.0, w: 1.4, need: 1 },
      { id: 'pc', x: 48.5, y: 58.0, w: 1.4, need: 1 },
      // 天穹五语圣盘（对称拱卫塔顶 x=67）
      { id: 'l1', x: 47.0, y: 68.0, w: 1.4, lang: '☼' },
      { id: 'l2', x: 87.0, y: 68.0, w: 1.4, lang: '♒' },
      { id: 'l3', x: 51.0, y: 74.0, w: 1.4, lang: '▲' },
      { id: 'l4', x: 83.0, y: 74.0, w: 1.4, lang: '◎' },
      { id: 'l5', x: 67.0, y: 86.0, w: 1.4, lang: '✦' }
    ],
    gates: [
      { id: 'g1', x: 57.8, y: 12.0, h: 3.5, trigger: 's1' },
      { id: 'g2', x: 74.0, y: 32.0, h: 3.5, trigger: 's2' },
      { id: 'gA', x: 79.0, y: 50.0, h: 3.5, trigger: 's_lib', latch: true },
      { id: 'gB', x: 54.0, y: 58.0, h: 3.5, trigger: ['pb', 'pc'], latch: true }
    ],
    bridges: [
      { id: 'db1', x1: 56.0, x2: 62.0, y: 32.0, trigger: 'p_c1' },
      { id: 'db_lib', x1: 78.0, x2: 82.0, y: 50.0, trigger: 'pa' }
    ],
    builds: [
      { id: 'b_well', x1: 29.6, x2: 33.4, y: 0, cost: 2, name: '枯井铺设木桥' },
      { id: 'b1', x1: 47, x2: 50, y: 5.2, cost: 2, name: '断崖栈桥' },
      { id: 'b_spiral_chasm', x1: 74, x2: 78, y: 18.0, cost: 2, name: '螺旋断桥搭设木板' },
      { id: 'b_upper_ramp', x1: 58, x2: 62, y: 25.0, cost: 2, name: '上层通天木栈道' },
      { id: 'b_c1', x1: 80, x2: 83, y: 44.0, cost: 2, name: '绝壁千米木板路' }
    ],
    steles: [
      { id: 's1', x: 47.5, y: 12.0, langs: ['♒', '▲'] },
      { id: 's2', x: 68.0, y: 25.0, langs: ['☼', '◎'] },
      { id: 's_lib', x: 75.0, y: 50.0, langs: ['◎', '✦'] }
    ],
    levers: [
      { id: 'lv1', x: 70.0, y: 25.0 },
      { id: 'lv_c1', x: 78.8, y: 44.0 }
    ],
    crates: [
      [18, 0], [62, 12.0], [65, 18.0], [60.5, 38.0], [64.5, 50.0], [60, 58.0]
    ],
    items: [
      [-15.5, 1.8, 'bread'], [-12.0, 1.8, 'dates'], [-6.5, 1.8, 'water'], [-4.8, 1.8, 'wood'],
      [-12.5, 5.0, 'dates'],
      [2.5, 1.5, 'stone'], [4.0, 3.0, 'wood'],
      [7.5, 4.62, 'wood'], [8.5, 0, 'wood'], [11, 0, 'wood'], [34, 0, 'wood'],
      [13.8, 0, 'bread'], [21, 0, 'bread'], [23.5, 4.62, 'bread'], [40, 5.2, 'bread'],
      [16.0, 8.2, 'bread'], [17.0, 8.2, 'wood'],
      [15, 0, 'dates'], [27.5, 0, 'dates'],
      [9.5, 4.62, 'meat'], [42.5, 5.2, 'meat'],
      [28.5, 0, 'water'], [35.5, 0, 'water'],
      [37.0, 2.4, 'stone'], [38.5, 2.4, 'wood'],
      // 塔内螺旋回廊物资
      [60, 12.0, 'wood'], [63, 12.0, 'bread'],
      [60, 18.0, 'stone'], [62, 18.0, 'bread'], [81, 18.0, 'wood'],
      [50, 25.0, 'bread'], [54, 25.0, 'meat'], [62, 25.0, 'stone'],
      // 塔内云之回廊物资
      [48, 32.0, 'stone'], [54, 32.0, 'bread'], [75, 38.0, 'wood'], [76.3, 38.0, 'wood'],
      // 塔内圣书馆物资
      [72, 44.0, 'bread'], [52, 50.0, 'bread'], [85, 50.0, 'dates'], [62, 58.0, 'water'],
      // 天穹圣殿物资
      [72, 68.0, 'bread'], [60, 80.0, 'stone']
    ],
    runes: [
      [6, 4.62], [16, 4.62], [53, 5.2], [45, 12.0],
      [62, 18.0], [72, 25.0], [82, 32.0],
      [56.5, 38.0], [77.6, 38.0], [63, 44.0],
      [48, 50.0], [74, 58.0], [67, 86.0]
    ],
    rocks: [
      [52, 24.0], [66, 26.0], [76, 31.0]
    ],
    checkpoints: [
      [57.8, 12.0], [74.0, 32.0], [83.0, 44.0], [48.0, 58.0]
    ],
    exit: { x: 67.0, y: 86.0 },
    finalTrigger: ['l1', 'l2', 'l3', 'l4', 'l5'],
    backWalls: [],
    decor: [
      // 西侧台地重型石砌挡土墙与步道阶梯
      { t: 'retaining_wall', x: -11.25, y: 0, w: 13.5, h: 1.8, d: 4.2 },
      { t: 'terrace_steps', x: -2.8, y: 0, w: 3.8, h: 1.8, steps: 3, facingLeft: true },
      { t: 'terrace_steps', x: 3.6, y: 0, w: 3.4, h: 4.4, steps: 4, facingLeft: false },
      { t: 'terrace_steps', x: 34.4, y: 0, w: 2.2, h: 2.4, steps: 2, facingLeft: false },
      { t: 'watchtower_deck', x: 16.0, y: 4.62, w: 3.6, h: 3.6, d: 3.6 },

      // ── 西侧大麦梯田与向导高台生态群 (y = 1.8 .. 5.0) ──
      { t: 'field', x1: -18, x2: -8.5, y: 1.8, z: -1.8, depth: 3.6 },
      { t: 'livestock_pen', x1: -8.5, x2: -4.5, y: 1.8, z: -1.6, depth: 3.2 },
      { t: 'palm', x: -18.5, y: 1.8, z: -3.5 },
      { t: 'olive', x: -14.5, y: 1.8, z: -3.6 },
      { t: 'acacia', x: -6.5, y: 1.8, z: -3.4, h: 4.6 },
      { t: 'pomegranate_bush', x: -8.8, y: 1.8, z: -1.2, r: 0.85 },
      { t: 'fig_bush', x: -17.0, y: 1.8, z: -1.4, r: 0.9 },
      { t: 'fig_bush', x: -12.5, y: 1.8, z: -1.3, r: 0.85 },
      { t: 'desert_flora', x: -18.2, y: 1.8, z: -0.1 },
      { t: 'desert_flora', x: -5.0, y: 1.8, z: -0.2 },
      { t: 'potted_plant', x: -15.5, y: 5.0, z: -0.3, potColor: '#b85d2e', flowerColor: '#ffd24a' },
      { t: 'hanging_vines', x: -14.5, y: 1.8, z: -0.18, w: 2.8, h: 1.6, strands: 5 },
      { t: 'hanging_vines', x: -8.2, y: 1.8, z: -0.18, w: 2.6, h: 1.5, strands: 5 },

      // ── 运河、水车与迎宾大道水系群 (y = 0) ──
      { t: 'canal', x1: -18, x2: 27, y: 0, z: 2.4, w: 1.4, gateX: -3.5, bridges: [-10.5, 3.0, 11.6, 20.4] },
      { t: 'noria_waterwheel', x: -12.0, y: 0.8, r: 2.2, z: 2.4 },
      { t: 'cypress', x: -0.8, y: 0, z: -3.5 },
      { t: 'olive', x: 0.8, y: 0, z: -3.2 },
      { t: 'palm', x: -7.5, y: 0, z: 3.6 },
      { t: 'palm', x: 2.8, y: 0, z: 3.8 },
      { t: 'oleander_bush', x: -10.0, y: 0, z: 1.6, r: 0.95 },
      { t: 'oleander_bush', x: -4.2, y: 0, z: 1.5, r: 0.9 },
      { t: 'oleander_bush', x: 1.2, y: 0, z: 1.6, r: 0.85 },
      { t: 'reeds', x: -14.0, y: 0, z: 2.5, w: 2.5, count: 12 },
      { t: 'reeds', x: -8.5, y: 0, z: 2.5, w: 2.4, count: 11 },
      { t: 'reeds', x: -1.0, y: 0, z: 2.5, w: 2.0, count: 9 },
      { t: 'reeds', x: 7.0, y: 0, z: 2.5, w: 2.2, count: 10 },
      { t: 'reeds', x: 17.0, y: 0, z: 2.5, w: 2.4, count: 11 },
      { t: 'reeds', x: 25.5, y: 0, z: 2.5, w: 2.2, count: 10 },
      { t: 'potted_palm', x: -2.2, y: 0, z: 1.2, potColor: '#c46232' },
      { t: 'potted_plant', x: -0.2, y: 0, z: 0.6, potColor: '#28527a', flowerColor: '#f25c78' },

      // ── 村落建筑、生活设施与屋顶空中绿化 ──
      { t: 'building', x: 8, y: 0, w: 5.6, h: 4.4, d: 5.2, interiorType: 'workshop', name: '泥砖石构工坊' },
      { t: 'building', x: 16, y: 0, w: 7, h: 4.4, d: 5.5, interiorType: 'council', name: '村落议事长屋' },
      { t: 'building', x: 24.5, y: 0, w: 6.2, h: 4.4, d: 4.8, interiorType: 'granary', name: '储备粮仓' },
      // 建筑正门迎宾双耳陶盆
      { t: 'potted_plant', x: 6.8, y: 0, z: 0.4, potColor: '#c87848', flowerColor: '#f59e0b' },
      { t: 'potted_plant', x: 9.2, y: 0, z: 0.4, potColor: '#c87848', flowerColor: '#e11d48' },
      { t: 'potted_palm', x: 14.5, y: 0, z: 0.4, potColor: '#255075' },
      { t: 'potted_palm', x: 17.5, y: 0, z: 0.4, potColor: '#255075' },
      { t: 'potted_plant', x: 23.2, y: 0, z: 0.4, potColor: '#b85a30', flowerColor: '#a855f7' },
      { t: 'potted_plant', x: 25.8, y: 0, z: 0.4, potColor: '#b85a30', flowerColor: '#38bdf8' },
      // 屋顶平台与长屋露台石槽悬圃 (y = 4.62, 8.2)
      { t: 'stone_planter', x: 6.5, y: 4.62, z: 0.0, w: 2.0, h: 0.55 },
      { t: 'potted_plant', x: 9.8, y: 4.62, z: -0.2, potColor: '#d97706', flowerColor: '#10b981' },
      { t: 'stone_planter', x: 13.8, y: 4.62, z: 0.0, w: 2.2, h: 0.58 },
      { t: 'potted_palm', x: 18.2, y: 4.62, z: -0.2, potColor: '#1e40af' },
      { t: 'potted_plant', x: 14.8, y: 8.2, z: -0.3, potColor: '#92400e', flowerColor: '#facc15' },
      { t: 'stone_planter', x: 26.2, y: 4.62, z: 0.0, w: 2.0, h: 0.55 },
      { t: 'potted_plant', x: 22.4, y: 4.62, z: -0.2, potColor: '#b45309', flowerColor: '#ec4899' },
      // 村落工坊与商贸生活设施
      { t: 'kiln', x: 4.2, y: 0, z: -1.8 },
      { t: 'anvil', x: 11.4, y: 0, z: 0.8 },
      { t: 'bakery', x: 20.5, y: 0, z: -1.2 },
      { t: 'bazaar_tent', x: 12.2, y: 0, z: 4.2, w: 3.6, h: 2.6 },
      { t: 'market_stall', x: 16.0, y: 0, z: 4.2, w: 2.8, h: 2.4, c1: '#a62d24', c2: '#e5b242', c3: '#1f4e78' },
      { t: 'statue', x: 20.5, y: 0, z: -2.2 },
      { t: 'clay_jars', x: -13.5, y: 1.8, z: 0.2 },
      { t: 'clay_jars', x: 4.9, y: 0, z: 0.4 },
      { t: 'clay_jars', x: 11.2, y: 0, z: 0.4 },
      { t: 'clay_jars', x: 28.0, y: 0, z: 0.4 },
      { t: 'hay_bale', x: -6.8, y: 1.8, z: 0.2 },
      { t: 'hay_bale', x: 20.8, y: 0, z: 0.5 },
      { t: 'hay_bale', x: 28.2, y: 0, z: -0.4 },
      { t: 'fence', x1: 19.6, x2: 21.2, y: 0, z: 0.8 },

      // ── 东村林苑、枯井与采石场台地 ──
      { t: 'palm', x: 28.5, y: 0, z: -3.8 },
      { t: 'olive', x: 29.8, y: 0, z: -2.8 },
      { t: 'pomegranate_bush', x: 27.8, y: 0, z: -1.4, r: 0.9 },
      { t: 'fig_bush', x: 29.2, y: 0, z: 1.2, r: 0.85 },
      { t: 'acacia', x: 33.8, y: 0, z: -3.6, h: 4.5 },
      { t: 'desert_flora', x: 31.0, y: 0, z: -1.2 },
      { t: 'desert_flora', x: 35.8, y: 0, z: 0.4 },
      // 采石场一层与中层 (y = 2.4, 5.2)
      { t: 'palm', x: 38.2, y: 2.4, z: -3.2 },
      { t: 'olive', x: 40.5, y: 2.4, z: -2.8 },
      { t: 'potted_plant', x: 36.8, y: 2.4, z: 0.3, potColor: '#b45309', flowerColor: '#f59e0b' },
      { t: 'hanging_vines', x: 36.5, y: 2.4, z: -0.18, w: 2.8, h: 2.1, strands: 5 },
      { t: 'hanging_vines', x: 39.5, y: 2.4, z: -0.18, w: 2.2, h: 1.9, strands: 4 },
      { t: 'acacia', x: 44.5, y: 5.2, z: -2.8, h: 4.6 },
      { t: 'statue', x: 42, y: 5.2, z: -1.6 },
      { t: 'stone_planter', x: 41.5, y: 5.2, z: 0.0, w: 2.2, h: 0.55 },
      { t: 'desert_flora', x: 46.2, y: 5.2, z: -0.2 },

      // ── 巴别通天大门广场 (y = 12.0) ──
      { t: 'hanging_vines', x: 46.5, y: 12.0, z: -0.18, w: 3.5, h: 3.2, strands: 7 },
      { t: 'hanging_vines', x: 53.0, y: 12.0, z: -0.18, w: 3.2, h: 3.0, strands: 6 },
      { t: 'stone_planter', x: 45.2, y: 12.0, z: 0.0, w: 2.4, h: 0.6 },
      { t: 'stone_planter', x: 50.5, y: 12.0, z: 0.0, w: 2.4, h: 0.6 },
      { t: 'stone_planter', x: 56.0, y: 12.0, z: 0.0, w: 2.0, h: 0.6 },
      { t: 'potted_palm', x: 44.5, y: 12.0, z: -0.3, potColor: '#1e3a8a' },
      { t: 'potted_palm', x: 57.2, y: 12.0, z: -0.3, potColor: '#1e3a8a' },
      { t: 'banner', x: 49, y: 15.3 }, { t: 'banner', x: 60, y: 15.3 },
      { t: 'torch', x: 59, y: 12.0 },

      // ── 塔内螺旋装置、空中花园回廊与飞瀑 (y = 12.0 .. 32.0，同轴围绕塔心 x=67) ──
      { t: 'waterwheel', x: 60.5, y: 15.4, r: 3.4, z: -2.4 },
      { t: 'waterfall', x: 54.0, y0: 68, y1: 12.0, w: 2.4, z: -4.2 },
      { t: 'waterfall', x: 80.0, y0: 68, y1: 18.0, w: 2.4, z: -4.2 },
      { t: 'hanging_vines', x: 62.0, y: 18.0, z: -0.18, w: 3.0, h: 2.8, strands: 6 },
      { t: 'hanging_vines', x: 76.0, y: 25.0, z: -0.18, w: 3.2, h: 3.0, strands: 6 },
      { t: 'potted_plant', x: 53.5, y: 18.0, z: 0.0, potColor: '#b45309', flowerColor: '#f43f5e' },
      { t: 'potted_plant', x: 80.5, y: 18.0, z: 0.0, potColor: '#0284c7', flowerColor: '#38bdf8' },
      { t: 'stone_planter', x: 50.0, y: 25.0, z: 0.0, w: 2.2, h: 0.58 },
      { t: 'potted_palm', x: 83.5, y: 25.0, z: -0.3, potColor: '#7c2d12' },
      { t: 'banner', x: 65, y: 21.0 }, { t: 'banner', x: 78, y: 28.0 },
      { t: 'torch', x: 62, y: 18.0 }, { t: 'torch', x: 76, y: 25.0 },

      // ── 云之回廊天海悬圃 (y = 32.0 .. 50.0) ──
      { t: 'cypress', x: 46.0, y: 32.0, z: -1.8 },
      { t: 'cypress', x: 58.0, y: 32.0, z: -1.8 },
      { t: 'cypress', x: 89.0, y: 32.0, z: -1.8 },
      { t: 'hanging_vines', x: 68.0, y: 32.0, z: -0.18, w: 4.0, h: 3.6, strands: 8 },
      { t: 'hanging_vines', x: 74.0, y: 44.0, z: -0.18, w: 3.2, h: 3.2, strands: 6 },
      { t: 'stone_planter', x: 63.5, y: 32.0, z: 0.0, w: 2.5, h: 0.6 },
      { t: 'statue', x: 50.0, y: 32.0, z: -2.0 },
      { t: 'relic_radio', x: 57, y: 32.0, id: 'relic_radio', name: '蜂鸣的真空铜管' },
      { t: 'potted_palm', x: 86.5, y: 44.0, z: -0.2, potColor: '#1e3a8a' },
      { t: 'potted_plant', x: 63.0, y: 44.0, z: 0.0, potColor: '#b45309', flowerColor: '#a855f7' },
      { t: 'torch', x: 84, y: 44.0 },

      // ── 圣书图书馆古籍书架、泥版秘档馆与学者绿洲 (y = 50.0 .. 68.0) ──
      { t: 'cuneiform_archives', x: 49.0, y: 50.0, w: 6.0, h: 4.5 },
      { t: 'cuneiform_archives', x: 60.0, y: 50.0, w: 7.0, h: 4.5 },
      { t: 'cuneiform_archives', x: 71.0, y: 50.0, w: 6.5, h: 4.5 },
      { t: 'shelf', x: 84, y: 50.0, w: 6.5, h: 4.5 },
      { t: 'armillary', x: 88, y: 51.6, r: 1.3, z: -1.6 },
      { t: 'stone_planter', x: 44.0, y: 50.0, z: 0.0, w: 2.2, h: 0.58 },
      { t: 'stone_planter', x: 79.5, y: 50.0, z: 0.0, w: 2.2, h: 0.58 },
      { t: 'potted_palm', x: 77.0, y: 50.0, z: -0.2, potColor: '#047857' },
      { t: 'potted_plant', x: 87.5, y: 50.0, z: -0.2, potColor: '#047857', flowerColor: '#f59e0b' },
      { t: 'hanging_vines', x: 84.0, y: 50.0, z: -0.18, w: 3.0, h: 3.0, strands: 6 },
      { t: 'torch', x: 52, y: 50.0 }, { t: 'torch', x: 76, y: 50.0 },
      { t: 'cuneiform_archives', x: 55.0, y: 58.0, w: 6.0, h: 4.5 },
      { t: 'shelf', x: 86.0, y: 58.0, w: 5.0, h: 4.5 },
      { t: 'torch', x: 46, y: 58.0 }, { t: 'torch', x: 80, y: 58.0 },

      // ── 天穹巴别顶：圣火、五方祭坛、黄金天球仪与通天悬圃 (y = 68.0 .. 86.0) ──
      { t: 'celestial_altar', x: 47.0, y: 68.0, lang: '☼' },
      { t: 'celestial_altar', x: 51.0, y: 74.0, lang: '▲' },
      { t: 'celestial_altar', x: 67.0, y: 86.0, lang: 'tor' },
      { t: 'celestial_altar', x: 83.0, y: 74.0, lang: '◎' },
      { t: 'celestial_altar', x: 87.0, y: 68.0, lang: '♒' },
      { t: 'cypress', x: 44.5, y: 68.0, z: -1.6 },
      { t: 'cypress', x: 89.5, y: 68.0, z: -1.6 },
      { t: 'stone_planter', x: 48.5, y: 68.0, z: 0.0, w: 2.2, h: 0.58 },
      { t: 'stone_planter', x: 85.5, y: 68.0, z: 0.0, w: 2.2, h: 0.58 },
      { t: 'potted_palm', x: 60.5, y: 80.0, z: -0.3, potColor: '#eab308' },
      { t: 'potted_palm', x: 73.5, y: 80.0, z: -0.3, potColor: '#eab308' },
      { t: 'hanging_vines', x: 67.0, y: 86.0, z: -0.18, w: 4.5, h: 2.4, strands: 8 },
      { t: 'armillary', x: 67, y: 92.0, r: 5.2, z: -3, big: true },
      { t: 'armillary', x: 67, y: 92.0, r: 3.6, z: -3, big: true, reverse: true },
      { t: 'statue', x: 55, y: 80.0, z: -1.8 }, { t: 'statue', x: 79, y: 80.0, z: -1.8 },
      { t: 'banner', x: 59, y: 84.5 }, { t: 'banner', x: 75, y: 84.5 },
      { t: 'torch', x: 51, y: 74.0 }, { t: 'torch', x: 83, y: 74.0 }
    ],
    tremor: null,
    objectives: [
      { text: '【地震救人】二人赶往枯井营救巴尼，组成三人核心小队', key: 'recruit:bani' },
      { text: '【塔下搜备】自由探索村落城镇、搜刮物资并招募志士', key: 'loot:items' },
      { text: '【断崖筑桥】消耗背负原木，在裂谷处修筑通行木桥', key: 'build:b1' },
      { text: '【开启天门】开启通天大门进塔，登临螺旋回廊', key: 'gate:g1' }
    ],
    hints: [
      [1.5, 'WASD 只负责平面移动；在门前或梯边按 E / 5 进出、上下；S+空格主动下穿'],
      [9, '木箱可被推动——推到 ⚖2 重力踏板上，可将水渠工匠升上来；也可搭人梯救援'],
      [22, '头顶背负原木时，靠近断崖按 3 可即时搭设木板桥；按 4 可急救脱力队员'],
      [40, '负重越多，跳得越低。遇到高台障碍时，可按 7 卸载物资恢复弹跳']
    ],
    intro: [
      { cam: [24, 6, 36], narr: '轰隆隆——！巴别巨塔剧烈震颤倾斜，撕裂大地的超级地震席卷了村落！', shake: 0.75, act: () => { if (window.SFX && SFX.playQuake) SFX.playQuake(); } },
      { cam: [31.5, -2, 16], narr: '大地震崩毁了井台，工匠巴尼失足跌落枯井深处！', shake: 0.4 },
      { cam: [4, 1.5, 12], who: 'ash', say: '☼ sol · tor-ka !', sub: '（艾什惊骇望着天穹崩裂的巨塔：巴别塔快塌了！地震把巴尼震进井里了！）' },
      { who: 'akad', say: '☼ soru · ▲ tor !', sub: '（阿卡德握紧石锤：我们二人立刻去井边救人！组成三人队赶在塔倒前爬上塔顶质问上帝！）' },
      { cam: [31.5, -3, 14], who: 'bani', say: '♒ wa… lu… ▲ ul ?', sub: '（井底传来巴尼呼救：救命！枯井水渠被震断了，上面掉下了巨石！）' },
      { cam: [16, 2.5, 20], narr: '【二人救一人组三人队】推木箱压下 ⚖2 踏板，或靠近井边搭人梯/捞人。救出后穿过村庄自由搜备，赶往塔脚！' }
    ],
    outro: [
      { who: 'ash', say: '☼ sol · ♒ wa · ▲ tor · ◎ om · ✦ zir', sub: '（全员并肩立于巴别塔之巅，五种失落的语言在此刻汇聚成同一道破晓之光！）' },
      { narr: '巴别巨塔不再坍塌。人类在差异中寻得理解，在理解中重筑永恒。' }
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
      { text: '【同位语周旋】与塔内不同学派的探索小队破译交涉，化解分歧', key: 'defeat:rival' },
      { text: '【登顶天门】全员抵达穹顶通天台阶，开启神谕大门', key: 'exit' }
    ],
    hints: [
      [2, '沿螺旋坡道向上，背负原木可按 3 在断口处架桥连接螺旋道路'],
      [12, '遇到塔内异邦探索小队时注意保持礼貌与距离；派懂该语系的队员上前可化解对立！'],
      [24, '背负石砖时队员可自卫防身；脱力的同伴按 4 喂食面包即可唤醒复原']
    ],
    intro: [
      { cam: [16, 6, 36], narr: '巴别巨构内部！宏大深邃的螺旋回廊自地底深渊直插云端天穹！' },
      { cam: [4, 1.5, 12], who: 'ash', say: '☼ sol · ka-rem !', sub: '（艾什仰望无尽盘旋的石道：塔身内部到处是崩塌的断桥与机关，必须小心前行！）' },
      { who: 'akad', say: '▲ tor · 📜 gha !', sub: '（阿卡德指向前方：看那些旗号！先行进塔的异邦探索队已在回廊筑起营地，需以同位语沟通！）' },
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
