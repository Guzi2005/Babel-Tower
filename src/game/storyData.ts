/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StoryAct } from './types.ts';

export const STORY_ACTS: StoryAct[] = [
  {
    actNumber: 1,
    title: '第一幕：众声喧哗',
    subtitle: '巴别之基 · 最初的语言接力',
    targetFloor: 4,
    dialogue: [
      {
        speaker: '亚述之子 埃尔',
        text: '巴别塔在颤动，神降下了最初的混乱！大家的泥板符号被抹去了...握紧双手，切勿走散！',
        langId: 'sumerian',
      },
      {
        speaker: '雅典哲人 泰勒斯',
        text: '我听不懂苏美尔话，但我懂几何与手势！把指令传给我，我能译成希腊语再告知后方！',
        langId: 'greek',
      },
      {
        speaker: '旁白',
        text: '【核心规则】指令必须通过语言互通的学者依次“接力”翻译传达。保持队形紧凑，切勿让关键翻译官掉队！',
      },
    ],
    summary: '学会依靠语言链传达指令，并在下方崩塌之前向上攀登。',
  },
  {
    actNumber: 2,
    title: '第二幕：冷库与奇迹',
    subtitle: '违和的未来残响 · 文明的冷冻仓库',
    targetFloor: 8,
    dialogue: [
      {
        speaker: '尼罗河抄写员 奈芙蒂',
        text: '等等！看这些从石隙中掉落的箱子...金属铝罐、千里传音的铜线，竟印着未来的日期？！',
        langId: 'egyptian',
      },
      {
        speaker: '长安太史 令狐',
        text: '这绝非凡人或神灵之塔...倒像是一座冰封保存着“史前甚至未来文明遗物”的冷库！难道文明只是一个不断重来的死循环？',
        langId: 'han',
      },
      {
        speaker: '旁白',
        text: '奇迹与违和感在空气中蔓延。收集冷库奇迹物资，激活队伍的【开源协同】与随机属性加成！',
      },
    ],
    summary: '收集塔内违和的现代工业物资与罐头，破解神秘的冷库锁。',
  },
  {
    actNumber: 3,
    title: '第三幕：终极开源行动',
    subtitle: '神之七重密码 · 全塔学者的同音共鸣',
    targetFloor: 12,
    dialogue: [
      {
        speaker: '凯尔特先锋 艾琳',
        text: '通往天穹的主闸门彻底落锁！门上刻着七道交错的失落神咒，单一种族根本无法解读！',
        langId: 'gaelic',
      },
      {
        speaker: '亚述之子 埃尔',
        text: '不再分彼此了！全员连接语言链，让我们同时念出不同语言中指向同一意义的同位语！',
        langId: 'sumerian',
      },
      {
        speaker: '全员共鸣 (架空语)',
        text: '“Kael-Zun, Grog-Throm, Lia-Sae, 道貫古今... 我们现在说的是同一种语言！”',
      },
    ],
    summary: '在全队高频接力下同时激发同频语言共鸣，破解天穹封印门。',
  },
  {
    actNumber: 4,
    title: '第四幕：重力与信仰的边缘',
    subtitle: '天梯崩塌 · 绝壁抛掷与生死配平',
    targetFloor: 16,
    dialogue: [
      {
        speaker: '雅典哲人 泰勒斯',
        text: '立柱全碎了！重力在倾斜，整个塔身正向深渊坠落！所有人——向倾斜的反方向狂奔！用队伍质量稳住重心！',
        langId: 'greek',
      },
      {
        speaker: '亚述之子 埃尔',
        text: '艾琳！你是最轻盈的先锋！我借旋转离心力把你抛过悬崖，去拉动升降机的绞盘！',
        langId: 'sumerian',
      },
      {
        speaker: '凯尔特先锋 艾琳',
        text: '抓紧我！无论坠入虚空还是登上星空，我们的手永远扣在一起！',
        langId: 'gaelic',
      },
    ],
    summary: '在剧烈倾斜的崩塌平台上逆向跑动配平重心，利用抛掷将先锋送达悬空机关。',
  },
  {
    actNumber: 5,
    title: '第五幕：银河穹顶与创世纪的幻灭',
    subtitle: '创世纪的指尖 · 最终的同位语',
    targetFloor: 20,
    dialogue: [
      {
        speaker: '旁白',
        text: '云海散尽，银河如瀑布般在头顶流淌。一只宛如米开朗基罗画作中的创世巨手从星幕后缓缓探出...',
      },
      {
        speaker: '亚述之子 埃尔',
        text: '我们到了...神啊，我们解开了所有语言的封锁，请拯救这个世界！',
      },
      {
        speaker: '创世纪的触碰',
        text: '指尖相触的刹那，脑海中没有神之天国，而是现代钢铁丛林、导弹划过夜空、互不理解的人们在彼此厮杀...',
      },
      {
        speaker: '神之谕语 (全语重叠低语)',
        text: '“语言从未把你们分开，是贪欲让你们选择了聋哑。”',
        langId: 'celestial',
      },
      {
        speaker: '终章启示',
        text: '巴别塔在绚烂的光芒中彻底坍塌为星尘。学者们没有获得神力，但他们化作理解的火种，散落在每一个时代的凡间。“路还长，但至少我们学会了怎么说话。”',
      },
    ],
    summary: '登临巴别塔顶峰，触碰创世巨手，目睹文明真相并完成精神觉醒。',
  },
];
