/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LanguageId = 
  | 'sumerian' 
  | 'akkadian'
  | 'greek' 
  | 'egyptian' 
  | 'aramaic'
  | 'latin' 
  | 'han' 
  | 'gaelic' 
  | 'enochian'
  | 'celestial';

export interface LanguageInfo {
  id: LanguageId;
  name: string;
  nativeScript: string;
  color: string;
  soundFreq: number; // base audio frequency for procedural synth
  description: string;
  conlangKeywords: string[]; // Conlang phonemes/glossolalia for authentic speech
}

export const LANGUAGES: Record<LanguageId, LanguageInfo> = {
  sumerian: {
    id: 'sumerian',
    name: '苏美尔语 (Sumerian)',
    nativeScript: '𒀭 𒁹 𒈠  nirvach',
    color: '#eab308', // amber
    soundFreq: 220,
    description: '楔形泥板之言，最古老的平原律法',
    conlangKeywords: ['Dingir-gal', 'Etemenanki', 'Ki-en-gi', 'Sag-gig-ga', 'En-lil', 'Ur-nammu'],
  },
  akkadian: {
    id: 'akkadian',
    name: '巴比伦阿卡德语 (Akkadian)',
    nativeScript: '𒁀 𒀊 𒅋 𒈝',
    color: '#d97706', // ochre gold
    soundFreq: 247,
    description: '两河流域帝国的滚筒印章与闪米特古语',
    conlangKeywords: ['Bāb-ilim', 'Ilu-šamê', 'Enūma-elīš', 'Šamaš-bēlu', 'Qadmešu'],
  },
  greek: {
    id: 'greek',
    name: '古希腊语 (Archaic Greek)',
    nativeScript: 'Λ Ο Γ Ο Σ',
    color: '#06b6d4', // cyan
    soundFreq: 330,
    description: '爱琴海哲学与几何学的理性之声',
    conlangKeywords: ['Logos', 'Apeiron', 'Genesis', 'Harmonia', 'Kosmos', 'Phos'],
  },
  egyptian: {
    id: 'egyptian',
    name: '神圣圣书体 (Medu-Netjer)',
    nativeScript: '𓀀 𓋹 𓊹 𓅓',
    color: '#f97316', // orange
    soundFreq: 277,
    description: '尼罗河芦苇纸上的永生金字塔密典',
    conlangKeywords: ['Medu-netjer', 'Ankh-wedja', 'Ka-Ba', 'Maat-Ptah', 'Djet-ra'],
  },
  aramaic: {
    id: 'aramaic',
    name: '帝国阿拉米语 (Imperial Aramaic)',
    nativeScript: 'ܐ ܪ ܩ ܐ',
    color: '#38bdf8', // sky
    soundFreq: 311,
    description: '贯通东方商道与神殿泥板的使者同位语',
    conlangKeywords: ['Mamla-qadish', 'Bar-Nasha', 'Rūħā', 'Shmaya', 'Alaha'],
  },
  latin: {
    id: 'latin',
    name: '古典拉丁语 (Classical Latin)',
    nativeScript: 'V E R I T A S',
    color: '#ef4444', // crimson
    soundFreq: 392,
    description: '罗马穹顶与七丘石厦的宏伟法度',
    conlangKeywords: ['Veritas', 'Concordia', 'Aeternus', 'Imperium', 'Pax-deorum'],
  },
  han: {
    id: 'han',
    name: '殷周古汉字 (Archaic Han)',
    nativeScript: '道 貫 古 今',
    color: '#10b981', // emerald
    soundFreq: 440,
    description: '九州青铜与龟甲刻辞的玄鸟之鸣',
    conlangKeywords: ['道生一', '通幽洞微', '玄鸟司命', '德润山河', '天命玄同'],
  },
  gaelic: {
    id: 'gaelic',
    name: '欧甘盖尔语 (Ogham Gaelic)',
    nativeScript: 'ᚠ ᚢ ᚦ ᚬ ᚱ',
    color: '#8b5cf6', // purple
    soundFreq: 349,
    description: '北方圣林与巨石阵中的德鲁伊誓愿',
    conlangKeywords: ['Nemeton', 'Crann-beatha', 'Danu-sidhe', 'Fianna-rath', 'Awen'],
  },
  enochian: {
    id: 'enochian',
    name: '以诺天使秘语 (Enochian Conlang)',
    nativeScript: '☿ ☉ ☽ ♃ ♄',
    color: '#ec4899', // fuchsia
    soundFreq: 523,
    description: '光之天使所吟诵的创世与解构音阶',
    conlangKeywords: ['Ol-sonf-vorsg', 'Zacar-zamran', 'Madriax', 'Iad-balt', 'Torzu'],
  },
  celestial: {
    id: 'celestial',
    name: '神之极光圣言 (Celestial Prime)',
    nativeScript: '✦ ✧ ☿ ♃ ⯌',
    color: '#fb7185', // rose
    soundFreq: 587,
    description: '巴别塔顶端尚未分化的统一同位语',
    conlangKeywords: ['Aethel-Kael', 'Zun-Throm', 'Omni-Logos', 'Vael-Khem'],
  },
};

export type NPCType = 'stranded_scholar' | 'lost_mason' | 'hermit' | 'anomaly';

export interface TowerNPC {
  id: string;
  name: string;
  title: string;
  type: NPCType;
  languages: LanguageId[];
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  hp?: number;
  maxHp?: number;
  isGrounded?: boolean;
  isFalling?: boolean;
  fallTumbleAngle?: number;
  squashTimer?: number;
  speechTimer?: number;
  isLost?: boolean; // Stepped off edge, plummeted into the abyss and lost
  isDead?: boolean; // Crushed by falling boulders
  dialogueAncient: string; // The conlang phrase uttered
  dialogueTranslated: string; // The translation once deciphered
  conlangDialogue?: string;
  translationText?: string;
  recruitedMemberId?: string; // If recruited, maps to squad member
  isRescued: boolean;
  avatarSeed: number;
  floor: number;
  scholarData?: SquadMember;
}

export interface SquadMember {
  id: string;
  name: string;
  languages: LanguageId[];
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  hp: number;
  maxHp: number;
  isLeader: boolean;
  isHeld: boolean;
  heldBy?: string;
  isThrown: boolean;
  throwProgress: number; // 0 to 1
  handshakeTargetId?: string;
  role: 'leader' | 'translator' | 'scholar' | 'scout' | 'pioneer';
  avatarSeed: number;
  // Physics & Ledge mechanics
  isGrounded: boolean;
  isFalling: boolean;
  fallTumbleAngle: number;
  danglingFromId?: string; // Caught by ally while falling off cliff
  squashTimer?: number; // Visual squash effect when struck by falling boulders
  isDead?: boolean;
  // Dialogue speech bubbles in 3D
  speechText?: string;
  speechConlang?: string;
  speechTimer?: number;
}

export type CommandType = 'sprint' | 'gather_phalanx' | 'throw_scout' | 'decode_rune' | 'balance_shift';

export interface Command {
  type: CommandType;
  label: string;
  originLanguage: LanguageId;
  targetLanguage?: LanguageId;
  description: string;
}

export interface RelayStep {
  fromMemberId: string;
  toMemberId: string;
  fromLang: LanguageId;
  toLang: LanguageId;
}

export interface RelayResult {
  success: boolean;
  path: SquadMember[];
  steps: RelayStep[];
  unreachedMembers: SquadMember[];
  durationMs: number;
  synergyMultiplier: number;
  message: string;
}

export interface MiracleBuff {
  id: string;
  title: string;
  category: 'language' | 'physics' | 'survival' | 'relic';
  icon: string;
  description: string;
  rarity: 'common' | 'rare' | 'mythic';
}

export interface StoryAct {
  actNumber: number;
  title: string;
  subtitle: string;
  targetFloor: number;
  dialogue: { speaker: string; text: string; langId?: LanguageId }[];
  summary: string;
}

export interface LiveLanguageLink {
  fromMemberId: string;
  toMemberId: string;
  fromName: string;
  toName: string;
  distance: number;
  maxDistance: number;
  sharedLanguages: LanguageId[];
  bridgeLanguage: LanguageId | null;
  isConnected: boolean;
  status: 'connected' | 'too_far' | 'language_barrier';
}

export const COMMAND_TRANSLATIONS: Record<CommandType, Record<LanguageId, string>> = {
  sprint: {
    sumerian: 'En-Ma-Ki (楔文·全体冲刺!)',
    akkadian: 'Arhiš illikū! (阿卡德·急行神步!)',
    greek: 'Ταχεία έφοδος! (极速突进!)',
    egyptian: 'It-Netjer (圣书·飞隼疾行!)',
    aramaic: 'Rehṭā bar-qadish! (阿拉米·疾电穿云!)',
    latin: 'Impetus celer! (全员急进!)',
    han: '急行如风，速涉险难!',
    gaelic: 'Rith gu luath! (疾走飞跃!)',
    enochian: 'Torzu vorsg! (以诺·光速跃迁!)',
    celestial: '✦ ✧ ☿ (同频光速!)',
  },
  gather_phalanx: {
    sumerian: 'Dish-Ma-Te (楔文·聚拢如墙!)',
    akkadian: 'Dūru dunnunu! (阿卡德·固若金汤!)',
    greek: 'Συνασπισμός! (密集圆阵!)',
    egyptian: 'Netjer-Ptah (圣书·磐石之御!)',
    aramaic: 'Shura m’qayyama! (阿拉米·石垒合围!)',
    latin: 'Testudo firma! (龟甲方阵!)',
    han: '同舟共济，众志成城!',
    gaelic: 'Cumaibh cruinn! (紧握臂弯!)',
    enochian: 'Zacar iad balt! (以诺·结界共鸣!)',
    celestial: '✦ ✧ ✦ (万心归一!)',
  },
  throw_scout: {
    sumerian: 'Zi-In-Da (楔文·借风飞掷!)',
    akkadian: 'Nasāku ana pānīti! (阿卡德·凌空先登!)',
    greek: 'Εκτόξευση! (抛掷先锋!)',
    egyptian: 'It-Djet (圣书·腾空借力!)',
    aramaic: 'Rami l’qaddama! (阿拉米·越堑飞渡!)',
    latin: 'Iactare ante! (前驱投掷!)',
    han: '轻身飞渡，先登绝壁!',
    gaelic: 'Tilg air adhart! (凌空渡渊!)',
    enochian: 'Madriax vaores! (以诺·神翼引渡!)',
    celestial: '✦ ☿ ✧ (重力跃迁!)',
  },
  decode_rune: {
    sumerian: 'Dub-Ma-Ni (楔文·泥板共鸣!)',
    akkadian: 'Pirištu pussusu! (阿卡德·符契破解!)',
    greek: 'Αποκρυπτογράφηση! (理性解构!)',
    egyptian: 'Netjer-Ankh (圣书·唤醒神契!)',
    aramaic: 'Gilya d’raza! (阿拉米·奥秘启封!)',
    latin: 'Solutio aenigmatis! (共鸣破门!)',
    han: '道通为一，神钥自开!',
    gaelic: 'Fuasgail an rùn! (符咒共振!)',
    enochian: 'Zodamran gaho! (以诺·天启开门!)',
    celestial: 'Kael-Zun, Grog-Throm (同位语解锁!)',
  },
  balance_shift: {
    sumerian: 'Ki-In-Te (楔文·逆势平衡!)',
    akkadian: 'Šitqultu našû! (阿卡德·稳衡回正!)',
    greek: 'Ισορροπία! (重心对称!)',
    egyptian: 'Aa-Qep (圣书·向侧配平!)',
    aramaic: 'Mawzna takina! (阿拉米·天秤对齐!)',
    latin: 'Aequilibrium serva! (抗衡倾斜!)',
    han: '调和阴阳，力挽狂澜!',
    gaelic: 'Cothromachadh! (逆势奔走!)',
    enochian: 'Ol sonf aza! (以诺·重力定序!)',
    celestial: '✦ ♃ ☿ (天秤归位!)',
  },
};

