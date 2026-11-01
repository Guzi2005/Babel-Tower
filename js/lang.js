// 造语系统：每种语言只用一个符号指代，词汇全部为虚构音节
(function () {
  const LANGS = {
    '☼': { name: '日辉语', color: '#f0b030', words: ['sol', 'ka', 'rem', 'ash-ka', 'soru'], tone: 330 },
    '♒': { name: '潮汐语', color: '#3fb8e0', words: ['wa', 'lu', 'nn~', 'wa-lu', 'olo'], tone: 392 },
    '▲': { name: '岩脊语', color: '#d0703a', words: ['tor', 'gha', 'ul', 'tor-gha', 'dun'], tone: 440 },
    '◎': { name: '环音语', color: '#9a6ad0', words: ['om', 'en', 'ii', 'om-en', 'yoo'], tone: 523 },
    '✦': { name: '星屑语', color: '#e8e070', words: ['zir', "e'", 'ta', 'zir-ta', 'ses'], tone: 587 },
    '🌾': { name: '丰饶语', color: '#84cc16', words: ['en', 'lil', 'dam', 'en-lil', 'ki'], tone: 310 },
    '𓁈': { name: '古息语', color: '#06b6d4', words: ['sam', 'ha', 'kud', 'sam-ha', 'ur'], tone: 360 },
    '⚔': { name: '战旌语', color: '#ef4444', words: ['tig', 'lat', 'pal', 'tig-lat', 'bar'], tone: 420 },
    '⚖️': { name: '权衡语', color: '#f59e0b', words: ['nab', 'sin', 'bal', 'nab-sin', 'tar'], tone: 460 },
    '🧶': { name: '织锦语', color: '#a855f7', words: ['ish', 'tar', 'lum', 'ish-tar', 'rim'], tone: 500 },
    '☽': { name: '幽夜语', color: '#6366f1', words: ['nan', 'nar', 'su', 'nan-nar', 'el'], tone: 540 }
  };

  // 指令图符（不依赖任何真实语言）
  const ACT = { move: '→', up: '↑', down: '↓', rally: '⊕', pick: '⇡', drop: '⇣', build: '⚒', push: '⇥', plate: '⊻', operate: '✋', hold: '⌂', no: '?', ok: '!' };

  const MEMBERS = {
    ash: {
      name: '艾什', role: '仲介学者', roleIcon: '📜', roleDesc: '语言链中继范围 +50%，跨语系沟通枢纽',
      langs: ['☼', '♒'],
      pal: {
        skin: '#f2c29b', hair: '#2b2233', hairStyle: 'short',
        eyeStyle: 'wide', eyeColor: '#1e293b', browStyle: 'straight',
        mouthStyle: 'smile', faceMark: 'sun',
        hat: 'beret', hatColor: '#2f4a8a',
        coat: '#3a5aa8', pants: '#2a2f45', shoes: '#3b2a20', accent: '#e8c35a',
        outfitType: 'tunic', sash: true, footwear: 'boots', belt: true
      }
    },
    akad: {
      name: '阿卡德', role: '筑造石匠', roleIcon: '⚒️', roleDesc: '架设桥梁与垫石速度提升 2.5 倍，耗材更省',
      langs: ['☼', '▲'],
      pal: {
        skin: '#e9b48a', hair: '#5a2a1a', hairStyle: 'short',
        eyeStyle: 'fierce', eyeColor: '#2a1e1a', browStyle: 'thick',
        beard: '#5a2a1a', beardStyle: 'braided',
        hat: 'hood', hatColor: '#c8423a',
        coat: '#c8423a', pants: '#4a2a2a', shoes: '#2e1e14', accent: '#f0d080',
        outfitType: 'armor', belt: true, footwear: 'boots'
      }
    },
    enki: {
      name: '恩基', role: '采粮农夫', roleIcon: '🌾', roleDesc: '在编时全队饱食度消耗减缓 50%，高效搜集口粮',
      langs: ['☼', '▲'],
      pal: {
        skin: '#e2ab7a', hair: '#4a321a', hairStyle: 'short',
        eyeStyle: 'normal', browStyle: 'normal', mouthStyle: 'smile',
        hat: 'straw', hatColor: '#dfb15b',
        coat: '#8a6230', pants: '#4a3820', shoes: '#2e1e14', accent: '#f4c430',
        apron: true, apronColor: '#8a5528', outfitType: 'tunic', footwear: 'sandals'
      }
    },
    bani: {
      name: '巴尼', role: '绝壁挑夫', roleIcon: '🎒', roleDesc: '背负上限提升至 20 块，矮檐通过防碰撞挤落',
      langs: ['♒', '▲'],
      pal: {
        skin: '#d9a072', hair: '#3a2a1a', hairStyle: 'curls',
        eyeStyle: 'wide', eyeColor: '#1e293b', browStyle: 'normal',
        mouthStyle: 'smile', faceMark: 'clay',
        hat: 'cap', hatColor: '#3f7a3a',
        coat: '#4f8a44', pants: '#3a3020', shoes: '#2e1e14', accent: '#e0c070',
        outfitType: 'kaunakes', sash: true, belt: true, footwear: 'sandals'
      }
    },
    sofi: {
      name: '苏菲拉', role: '同传译员', roleIcon: '🔮', roleDesc: '远距离盲听呼应，瞬间安抚远方异域同伴',
      langs: ['▲', '◎'],
      pal: {
        skin: '#f0c8a8', hair: '#e6c66a', hairStyle: 'braids',
        eyeStyle: 'wide', eyeColor: '#7c3aed', browStyle: 'arched',
        mouthStyle: 'smile', faceMark: 'blush',
        hat: 'circlet', hatColor: '#f59e0b',
        coat: '#efe8da', pants: '#8a7a9a', shoes: '#5a4a6a', accent: '#9a6ad0',
        outfitType: 'priest_robe', robe: true, footwear: 'sandals'
      }
    },
    io: {
      name: '伊奥', role: '观星学者', roleIcon: '✦', roleDesc: '预感地脉震颤落石，解读失落神碑密码',
      langs: ['◎', '✦'],
      pal: {
        skin: '#c98d62', hair: '#e8e8f0', hairStyle: 'long',
        eyeStyle: 'scholar', eyeColor: '#0284c7', browStyle: 'thick',
        beard: '#e8e8f0', beardStyle: 'full', faceMark: 'temple',
        hat: 'turban', hatColor: '#e8e2d0',
        coat: '#2c8a8a', pants: '#244a5a', shoes: '#2a2a2a', accent: '#e8e070',
        outfitType: 'priest_robe', cloak: true, footwear: 'sandals'
      }
    },
    ghar: {
      name: '加尔', role: '开路先锋', roleIcon: '⛏️', roleDesc: '推动沉重箱体速度翻倍，攀爬梯子速度加快 30%',
      langs: ['▲'],
      pal: {
        skin: '#c8956a', hair: '#2b2233', hairStyle: 'topknot',
        eyeStyle: 'kohl', eyeColor: '#b45309', browStyle: 'thick',
        beard: '#2b2233', beardStyle: 'curled', faceMark: 'scar',
        hat: 'helm', hatColor: '#c8782a',
        coat: '#8a3a24', pants: '#3a2a20', shoes: '#2e1e14', accent: '#f0703a',
        outfitType: 'armor', belt: true, footwear: 'boots'
      }
    },
    ul: {
      name: '乌尔', role: '巡山卫士', roleIcon: '👁️', roleDesc: '基础跑动速度提升 25%，视野侦察范围扩大',
      langs: ['▲'],
      pal: {
        skin: '#b8744d', hair: '#1a1418', hairStyle: 'short',
        eyeStyle: 'kohl', eyeColor: '#15803d', browStyle: 'straight',
        mouthStyle: 'stern',
        hat: 'scarf', hatColor: '#16a34a',
        coat: '#a84e36', pants: '#4a2f26', shoes: '#2e1e14', accent: '#d0502a',
        outfitType: 'nomad_poncho', cloak: true, footwear: 'boots'
      }
    }
  };
  const ORDER = ['ash', 'akad', 'enki', 'bani', 'sofi', 'io', 'ghar', 'ul'];

  const ARCHETYPES = [
    { role: '筑造工匠', roleIcon: '⚒️', roleDesc: '架设桥梁与垫石速度提升 2.5 倍，耗材更省', hat: 'hood', apron: true, outfitType: 'tunic', footwear: 'boots' },
    { role: '仲介学者', roleIcon: '📜', roleDesc: '语言链中继范围 +50%，跨语系沟通枢纽', hat: 'beret', sash: true, outfitType: 'tunic', eyeStyle: 'scholar', footwear: 'boots' },
    { role: '拓荒农夫', roleIcon: '🌾', roleDesc: '在编时全队饱食度消耗减缓 50%，高效搜集口粮', hat: 'straw', apron: true, outfitType: 'tunic', footwear: 'sandals' },
    { role: '负重力士', roleIcon: '🎒', roleDesc: '背负上限提升至 22 块，矮檐通过防碰撞挤落', hat: 'cap', sash: true, outfitType: 'kaunakes', footwear: 'sandals' },
    { role: '传译占卜师', roleIcon: '🔮', roleDesc: '远距离盲听呼应，瞬间安抚远方异域同伴', hat: 'circlet', outfitType: 'priest_robe', eyeStyle: 'wide', footwear: 'sandals' },
    { role: '观星祭司', roleIcon: '✦', roleDesc: '预感地脉震颤落石，解读失落神碑密码', hat: 'turban', beardStyle: 'full', outfitType: 'priest_robe', cloak: true, footwear: 'sandals' },
    { role: '开路工兵', roleIcon: '⛏️', roleDesc: '推动沉重箱体速度翻倍，攀爬梯子速度加快 30%', hat: 'helm', beardStyle: 'curled', outfitType: 'armor', belt: true, footwear: 'boots' },
    { role: '巡野斥候', roleIcon: '👁️', roleDesc: '基础跑动速度提升 25%，视野侦察范围扩大', hat: 'scarf', cloak: true, outfitType: 'nomad_poncho', footwear: 'boots' },
    { role: '行脚商人', roleIcon: '⚖️', roleDesc: '精通以物易物，能向商队以木石换取高热量口粮', hat: 'fez', sash: true, outfitType: 'tunic', beardStyle: 'goatee', footwear: 'boots' },
    { role: '牧羊向导', roleIcon: '🐑', roleDesc: '熟悉牲口与山道，在编时全队攀爬与行进更加沉稳', hat: 'scarf', cloak: true, outfitType: 'kaunakes', footwear: 'sandals' },
    { role: '织锦工匠', roleIcon: '🧶', roleDesc: '精通织毯与染料，协助搭建防风天幕与绳桥', hat: 'band', sash: true, outfitType: 'tunic', footwear: 'sandals' },
    { role: '陶坊师傅', roleIcon: '🏺', roleDesc: '陶器与耐火泥砖大师，减少 50% 建筑损耗', hat: 'cap', apron: true, outfitType: 'tunic', footwear: 'sandals' },
    { role: '巡山卫士', roleIcon: '⚔️', roleDesc: '步履稳健警惕，防止小队在陡峭边缘踏空失足', hat: 'helm', outfitType: 'armor', belt: true, eyeStyle: 'fierce', footwear: 'boots' }
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

  // 16 种古代近东/两河文明真实历史肤色库
  const SKINS = [
    { id: 'pale_alabaster', name: '雪花石膏白', hex: '#f8dfc8' },
    { id: 'warm_ivory', name: '暖象牙', hex: '#f2c29b' },
    { id: 'desert_sand', name: '荒原浅砂', hex: '#e9b48a' },
    { id: 'sun_baked', name: '日光麦色', hex: '#e2ab7a' },
    { id: 'ochre_light', name: '暖褐赭黄', hex: '#d9a072' },
    { id: 'river_clay', name: '幼发拉底泥金', hex: '#c98d62' },
    { id: 'mesopotamian_tan', name: '两河古铜', hex: '#c8956a' },
    { id: 'terracotta_light', name: '古窑陶土', hex: '#dfa878' },
    { id: 'copper_brown', name: '红铜赤褐', hex: '#b8744d' },
    { id: 'semitic_amber', name: '闪米特琥珀', hex: '#a8623d' },
    { id: 'deep_umber', name: '深赭雪松', hex: '#8d4e2d' },
    { id: 'dark_bronze', name: '青铜重褐', hex: '#754025' },
    { id: 'obsidian_earth', name: '黑曜焦土', hex: '#5c321d' },
    { id: 'almond_gold', name: '杏仁温金', hex: '#deb48e' },
    { id: 'cinnamon_bark', name: '肉桂深棕', hex: '#cf9a70' },
    { id: 'tigris_silt', name: '底格里斯沃土', hex: '#ba8059' }
  ];

  // 14 种自然发色（深墨黑、雪松褐、赤红海娜染、银白霜发等）
  const HAIRS = [
    { id: 'pitch_black', name: '沥青墨黑', hex: '#1a1418' },
    { id: 'night_indigo', name: '夜色深靛', hex: '#2b2233' },
    { id: 'cedar_brown', name: '雪松暗褐', hex: '#3a2a1a' },
    { id: 'dark_chestnut', name: '深栗木色', hex: '#4a321a' },
    { id: 'henna_russet', name: '海娜染赤', hex: '#5a2a1a' },
    { id: 'amber_brown', name: '琥珀棕褐', hex: '#78350f' },
    { id: 'desert_gold', name: '沙漠金棕', hex: '#a16207' },
    { id: 'wheat_blonde', name: '成熟大麦', hex: '#e6c66a' },
    { id: 'bronze_copper', name: '古铜赤金', hex: '#b45309' },
    { id: 'slate_grey', name: '石板青灰', hex: '#9ca3af' },
    { id: 'frost_silver', name: '银白长者', hex: '#e8e8f0' },
    { id: 'plum_dark', name: '暗李紫黑', hex: '#241a24' },
    { id: 'charcoal', name: '冷炭深灰', hex: '#52525b' },
    { id: 'burnt_wood', name: '焦木玄褐', hex: '#451a03' }
  ];

  const EYE_STYLES = [
    { id: 'normal', name: '平静凝神' },
    { id: 'kohl', name: '科尔眼线 (Kohl)' },
    { id: 'wide', name: '灵动大眼' },
    { id: 'scholar', name: '学者深邃 (单镜)' },
    { id: 'fierce', name: '坚毅锐利' },
    { id: 'elder', name: '沧桑长者' }
  ];
  const EYE_COLORS = ['#2a1e1a', '#1e293b', '#15803d', '#78350f', '#0284c7', '#3b0764', '#1c1917'];

  const BROW_STYLES = [
    { id: 'straight', name: '平直剑眉' },
    { id: 'thick', name: '浓密武者眉' },
    { id: 'arched', name: '修长弯眉' }
  ];

  const FACE_MARKS = [
    { id: 'none', name: '无面纹' },
    { id: 'sun', name: '沙马什太阳轮印' },
    { id: 'clay', name: '两河红泥洗礼印' },
    { id: 'temple', name: '神殿侍者额心符' },
    { id: 'scar', name: '历战裂痕' },
    { id: 'blush', name: '自然红润' }
  ];

  const BEARDS = [
    { id: 'clean', name: '净面无须' },
    { id: 'braided', name: '阿卡德珠串编须' },
    { id: 'curled', name: '巴比伦层叠卷须' },
    { id: 'goatee', name: '学者山羊胡' },
    { id: 'full', name: '浓密大络腮胡' },
    { id: 'stubble', name: '硬朗短髭' },
    { id: 'mustache', name: '飞扬八字胡' }
  ];

  const HATS = [
    { id: 'none', name: '无头饰 (原发)' },
    { id: 'hood', name: '学者兜帽' },
    { id: 'turban', name: '缠头巾' },
    { id: 'fez', name: '两河高顶毡帽' },
    { id: 'straw', name: '农人草帽' },
    { id: 'scarf', name: '遮阳头巾' },
    { id: 'circlet', name: '铜环发箍' },
    { id: 'helm', name: '青铜尖盔' },
    { id: 'mitre', name: '神庙祭司角冠' },
    { id: 'cowl', name: '游牧兜领' },
    { id: 'beret', name: '石匠扁帽' },
    { id: 'cap', name: '工匠软便帽' },
    { id: 'band', name: '丝织发带' },
    { id: 'band_feather', name: '羽饰束带' },
    { id: 'laurel', name: '祭祀金桂冠' },
    { id: 'braids', name: '阿卡德长发辫' },
    { id: 'topknot', name: '骨簪束发髻' },
    { id: 'curls', name: '巴比伦卷发' }
  ];

  const OUTFIT_TYPES = [
    { id: 'tunic', name: '两河短袍便服' },
    { id: 'kaunakes', name: '苏美尔阶梯羊毛裙 (Kaunakes)' },
    { id: 'cuirass', name: '青铜鳞甲胸甲 (Scale Armor)' },
    { id: 'priest_robe', name: '青金石祭司圣袍' },
    { id: 'nomad_poncho', name: '荒原游牧斜披风' }
  ];

  const FOOTWEARS = [
    { id: 'sandals', name: '皮革凉鞋' },
    { id: 'boots', name: '厚重工匠皮靴' },
    { id: 'barefoot', name: '赤足行者' }
  ];

  let travelerSeq = 1;

  // ───────────────────────── 纸娃娃系统：程序化随机与定制外观工厂 ─────────────────────────
  function generatePaperDoll(opts = {}) {
    const r = opts.rng || Math.random;
    const pickR = (arr) => arr[Math.floor(r() * arr.length)];
    const palBase = opts.palette || pickR(PALETTES);

    const skin = (opts.skin && (opts.skin.hex || opts.skin)) || pickR(SKINS).hex;
    const hair = (opts.hair && (opts.hair.hex || opts.hair)) || pickR(HAIRS).hex;
    const eyeStyle = (opts.eyeStyle && (opts.eyeStyle.id || opts.eyeStyle)) || pickR(EYE_STYLES).id;
    const eyeColor = opts.eyeColor || pickR(EYE_COLORS);
    const browStyle = (opts.browStyle && (opts.browStyle.id || opts.browStyle)) || pickR(BROW_STYLES).id;
    const mouthStyle = opts.mouthStyle || (r() < 0.3 ? 'smile' : r() < 0.5 ? 'stern' : 'normal');
    const faceMark = (opts.faceMark && (opts.faceMark.id || opts.faceMark)) || (r() < 0.35 ? pickR(FACE_MARKS).id : 'none');

    const hairStyle = opts.hairStyle || (r() < 0.15 ? 'braids' : r() < 0.25 ? 'topknot' : r() < 0.35 ? 'curls' : r() < 0.45 ? 'long' : r() < 0.52 ? 'bald' : 'short');

    const hat = (opts.hat && (opts.hat.id || opts.hat)) || pickR(HATS).id;
    const hatColor = opts.hatColor || palBase.hatColor;

    const beardPick = (opts.beardStyle && (opts.beardStyle.id || opts.beardStyle)) || (hairStyle === 'bald' || r() < 0.5 ? pickR(BEARDS).id : 'clean');
    const beard = beardPick === 'clean' ? undefined : hair;
    const beardStyle = beardPick === 'clean' ? undefined : beardPick;

    const outfitType = (opts.outfitType && (opts.outfitType.id || opts.outfitType)) || pickR(OUTFIT_TYPES).id;
    const footwear = (opts.footwear && (opts.footwear.id || opts.footwear)) || pickR(FOOTWEARS).id;

    return {
      skin,
      hair,
      hairStyle,
      eyeStyle,
      eyeColor,
      browStyle,
      mouthStyle,
      faceMark,
      beard,
      beardStyle,
      hat: hat === 'none' ? undefined : hat,
      hatColor,
      coat: opts.coat || palBase.coat,
      pants: opts.pants || palBase.pants,
      shoes: opts.shoes || '#2e1e14',
      accent: opts.accent || palBase.accent,
      outfitType,
      footwear,
      belt: opts.belt !== undefined ? opts.belt : (outfitType === 'armor' || outfitType === 'cuirass' || outfitType === 'kaunakes' || r() < 0.6),
      beltColor: opts.beltColor || '#78350f',
      apron: opts.apron !== undefined ? opts.apron : (outfitType === 'tunic' && r() < 0.35),
      apronColor: opts.apronColor || '#8a5528',
      sash: opts.sash !== undefined ? opts.sash : (outfitType !== 'nomad_poncho' && r() < 0.4),
      cloak: opts.cloak !== undefined ? opts.cloak : (r() < 0.35)
    };
  }

  function generateTraveler(opts = {}) {
    const id = opts.id || `tr_${travelerSeq++}`;
    const name = opts.name || pick(ANCIENT_NAMES);
    const arch = opts.role ? (ARCHETYPES.find(a => a.role === opts.role) || ARCHETYPES[0]) : pick(ARCHETYPES);

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

    const pal = generatePaperDoll({
      hat: opts.hat || arch.hat,
      outfitType: opts.outfitType || arch.outfitType,
      footwear: opts.footwear || arch.footwear,
      beardStyle: opts.beardStyle || arch.beardStyle,
      eyeStyle: opts.eyeStyle || arch.eyeStyle,
      apron: opts.apron !== undefined ? opts.apron : arch.apron,
      sash: opts.sash !== undefined ? opts.sash : arch.sash,
      cloak: opts.cloak !== undefined ? opts.cloak : arch.cloak,
      ...opts
    });

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

  window.LANG = {
    LANGS, ACT, MEMBERS, ORDER, ARCHETYPES, ANCIENT_NAMES,
    SKINS, HAIRS, HATS, EYE_STYLES, EYE_COLORS, BROW_STYLES, BEARDS, FACE_MARKS, OUTFIT_TYPES, FOOTWEARS,
    generatePaperDoll, generateTraveler, utter, shared, computeChain, chainPath
  };
})();
