/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SquadMember, LanguageId, RelayResult, RelayStep, MiracleBuff, TowerNPC, LANGUAGES } from './types.ts';

/**
 * Calculates Euclidean distance between two squad members.
 */
export function getDistance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Checks if two members share at least one language.
 */
export function shareLanguage(a: SquadMember, b: SquadMember): LanguageId[] {
  return a.languages.filter(l => b.languages.includes(l));
}

export interface RelayOptions {
  commRadius?: number; // default max distance between members to hear each other
  hasOpenSourceProtocol?: boolean; // bypasses language barrier if within radius
  hasMegaphoneRelic?: boolean; // +60% comm radius
}

/**
 * Core Language Chain Algorithm:
 * Breadth-First-Search across physical proximity and shared language nodes
 * to propagate a command from the leader (or origin language speaker) through the entire squad.
 */
export function computeRelaySpread(
  leader: SquadMember,
  squad: SquadMember[],
  originLanguage: LanguageId,
  options: RelayOptions = {}
): RelayResult {
  const baseRadius = options.commRadius ?? 7.0;
  const radius = options.hasMegaphoneRelic ? baseRadius * 1.6 : baseRadius;
  const openSource = !!options.hasOpenSourceProtocol;

  // If leader does not speak the origin language, find a member who does speak it closest to leader
  let root = leader;
  if (!leader.languages.includes(originLanguage) && !openSource) {
    const originSpeakers = squad.filter(m => m.languages.includes(originLanguage));
    if (originSpeakers.length === 0) {
      return {
        success: false,
        path: [],
        steps: [],
        unreachedMembers: [...squad],
        durationMs: 0,
        synergyMultiplier: 1.0,
        message: `队伍中无人掌握【${originLanguage}】，指令无法解析！`,
      };
    }
    // Pick the closest speaker to leader
    originSpeakers.sort((a, b) => getDistance(leader, a) - getDistance(leader, b));
    root = originSpeakers[0];
  }

  // BFS to propagate command
  const reached = new Set<string>();
  const parentStep = new Map<string, { from: string; lang: LanguageId }>();
  const queue: Array<{ member: SquadMember; currentLang: LanguageId }> = [];

  reached.add(root.id);
  queue.push({ member: root, currentLang: originLanguage });

  const steps: RelayStep[] = [];
  const orderedPath: SquadMember[] = [root];

  while (queue.length > 0) {
    const { member: curr, currentLang } = queue.shift()!;

    for (const neighbor of squad) {
      if (reached.has(neighbor.id)) continue;

      const dist = getDistance(curr, neighbor);
      if (dist > radius) continue; // Out of auditory/communication range

      if (openSource) {
        // Can directly bridge
        reached.add(neighbor.id);
        steps.push({
          fromMemberId: curr.id,
          toMemberId: neighbor.id,
          fromLang: currentLang,
          toLang: neighbor.languages[0] || currentLang,
        });
        orderedPath.push(neighbor);
        queue.push({ member: neighbor, currentLang: neighbor.languages[0] || currentLang });
      } else {
        // Check if curr and neighbor share a language
        const commonLangs = shareLanguage(curr, neighbor);
        if (commonLangs.length > 0) {
          // Can translate via a common language
          const bridgeLang = commonLangs[0];
          reached.add(neighbor.id);
          steps.push({
            fromMemberId: curr.id,
            toMemberId: neighbor.id,
            fromLang: currentLang,
            toLang: bridgeLang,
          });
          orderedPath.push(neighbor);
          queue.push({ member: neighbor, currentLang: bridgeLang });
        }
      }
    }
  }

  const unreachedMembers = squad.filter(m => !reached.has(m.id));
  const distinctLanguagesUsed = new Set(steps.map(s => s.toLang)).size;
  const synergyMultiplier = Math.max(1.0, 1.0 + distinctLanguagesUsed * 0.25);

  const isFullSuccess = unreachedMembers.length === 0;
  const message = isFullSuccess
    ? `语言链完整传达！${distinctLanguagesUsed} 种文明之声共鸣 (协同倍率 x${synergyMultiplier.toFixed(2)})`
    : `语言链断裂！有 ${unreachedMembers.length} 名学者未能理解指令 (距离过远或缺少互译者)`;

  return {
    success: isFullSuccess || reached.size >= Math.ceil(squad.length * 0.7),
    path: orderedPath,
    steps,
    unreachedMembers,
    durationMs: steps.length * 180, // propagation delay in milliseconds
    synergyMultiplier,
    message,
  };
}

/**
 * Calculates platform tilt and squad counterweight balance.
 * When the tower tilts by `tiltAngle` (radians), players need to gather on the opposite side
 * (center of mass offset) to stabilize the floor before it gives way!
 */
export function calculatePlatformBalance(
  platformTilt: number, // current tilt angle (-1 to 1)
  squad: SquadMember[],
  tiltAxis: 'x' | 'z' = 'x'
): {
  squadCenterOfMass: number;
  netTorque: number;
  isBalanced: boolean;
  stabilityPercent: number;
} {
  if (squad.length === 0) {
    return { squadCenterOfMass: 0, netTorque: platformTilt, isBalanced: false, stabilityPercent: 0 };
  }

  const totalMass = squad.length;
  const sumPos = squad.reduce((sum, m) => sum + (tiltAxis === 'x' ? m.x : m.z), 0);
  const centerOfMass = sumPos / totalMass;

  // Positive platform tilt (leaning right) is counteracted by negative centerOfMass (standing on left)
  const leverage = 0.15;
  const netTorque = platformTilt + (centerOfMass * leverage);

  const stabilityPercent = Math.max(0, Math.min(100, Math.round((1 - Math.min(1, Math.abs(netTorque))) * 100)));
  const isBalanced = Math.abs(netTorque) < 0.35;

  return {
    squadCenterOfMass: centerOfMass,
    netTorque,
    isBalanced,
    stabilityPercent,
  };
}

/**
 * Generates an initial squad with complementary language skills so that
 * a language relay is initially possible if they stay close together.
 */
/**
 * Recruitable scholars waiting to be rescued on higher floors of the Babel ruins.
 */
export const RECRUITABLE_SCHOLARS: Record<string, SquadMember> = {
  member_3: {
    id: 'member_3',
    name: '尼罗河文牍官 奈芙蒂 (Nefti)',
    languages: ['egyptian', 'aramaic', 'latin'],
    x: 0,
    y: 0,
    z: -1.0,
    vx: 0,
    vy: 0,
    vz: 0,
    hp: 85,
    maxHp: 85,
    isLeader: false,
    isHeld: false,
    isThrown: false,
    throwProgress: 0,
    role: 'scholar',
    avatarSeed: 303,
    isGrounded: true,
    isFalling: false,
    fallTumbleAngle: 0,
  },
  member_4: {
    id: 'member_4',
    name: '长安太史 令狐 (Linghu)',
    languages: ['han', 'aramaic', 'sumerian'],
    x: 0,
    y: 0,
    z: -1.0,
    vx: 0,
    vy: 0,
    vz: 0,
    hp: 95,
    maxHp: 95,
    isLeader: false,
    isHeld: false,
    isThrown: false,
    throwProgress: 0,
    role: 'scholar',
    avatarSeed: 404,
    isGrounded: true,
    isFalling: false,
    fallTumbleAngle: 0,
  },
  member_5: {
    id: 'member_5',
    name: '欧甘先锋 艾琳 (Erin)',
    languages: ['gaelic', 'latin', 'han'],
    x: 0,
    y: 0,
    z: -1.0,
    vx: 0,
    vy: 0,
    vz: 0,
    hp: 110,
    maxHp: 110,
    isLeader: false,
    isHeld: false,
    isThrown: false,
    throwProgress: 0,
    role: 'pioneer',
    avatarSeed: 505,
    isGrounded: true,
    isFalling: false,
    fallTumbleAngle: 0,
  },
  member_6: {
    id: 'member_6',
    name: '以诺秘修士 塞拉 (Serah)',
    languages: ['enochian', 'celestial', 'greek'],
    x: 0,
    y: 0,
    z: -1.0,
    vx: 0,
    vy: 0,
    vz: 0,
    hp: 120,
    maxHp: 120,
    isLeader: false,
    isHeld: false,
    isThrown: false,
    throwProgress: 0,
    role: 'translator',
    avatarSeed: 606,
    isGrounded: true,
    isFalling: false,
    fallTumbleAngle: 0,
  },
};

/**
 * Generates an initial squad.
 * Per the game design brief, the story begins with only the core protagonist duo:
 * Sûl (Sumerian & Akkadian leader) and Thales (Greek & Latin translator).
 * Other scholars are discovered and recruited as you climb the ruins!
 */
export function createInitialSquad(fullSquad: boolean = false): SquadMember[] {
  const baseDuo: SquadMember[] = [
    {
      id: 'member_1',
      name: '希纳尔智者 苏尔 (Sûl)',
      languages: ['sumerian', 'akkadian', 'greek'],
      x: -10.5,
      y: 0,
      z: -1.2,
      vx: 0,
      vy: 0,
      vz: 0,
      hp: 100,
      maxHp: 100,
      isLeader: true,
      isHeld: false,
      isThrown: false,
      throwProgress: 0,
      role: 'leader',
      avatarSeed: 101,
      isGrounded: true,
      isFalling: false,
      fallTumbleAngle: 0,
    },
    {
      id: 'member_2',
      name: '雅典哲人 泰勒斯 (Thales)',
      languages: ['greek', 'latin', 'akkadian'],
      x: -9.2,
      y: 0,
      z: -1.2,
      vx: 0,
      vy: 0,
      vz: 0,
      hp: 90,
      maxHp: 90,
      isLeader: false,
      isHeld: false,
      isThrown: false,
      throwProgress: 0,
      role: 'translator',
      avatarSeed: 202,
      isGrounded: true,
      isFalling: false,
      fallTumbleAngle: 0,
    },
  ];

  if (!fullSquad) {
    return baseDuo.map(m => ({ ...m, languages: [...m.languages] }));
  }

  // Full squad for testing or endgame debug with clean fresh copies in proximity
  return [
    ...baseDuo.map(m => ({ ...m, languages: [...m.languages] })),
    { ...RECRUITABLE_SCHOLARS['member_3'], x: -7.8, z: -1.2, languages: [...RECRUITABLE_SCHOLARS['member_3'].languages] },
    { ...RECRUITABLE_SCHOLARS['member_4'], x: -6.5, z: -1.2, languages: [...RECRUITABLE_SCHOLARS['member_4'].languages] },
    { ...RECRUITABLE_SCHOLARS['member_5'], x: -5.2, z: -1.2, languages: [...RECRUITABLE_SCHOLARS['member_5'].languages] },
  ];
}

/**
 * Procedurally populates tower floors with ancient AI NPCs and stranded scholars.
 */
export function getTowerNPCsForFloor(floor: number): TowerNPC[] {
  const npcs: TowerNPC[] = [];

  if (floor === 1) {
    npcs.push({
      id: 'npc_mason_f1',
      name: '困惑的石匠 (Adad)',
      title: '巴比伦砌石巧匠',
      type: 'lost_mason',
      languages: ['akkadian', 'sumerian'],
      x: 2.8,
      y: 0.4,
      z: -1.2,
      dialogueAncient: 'Bāb-ilim... agurru in-nammar! Ilu-šamê!',
      dialogueTranslated: '工匠：你们的声波竟能消解神之混淆！前路桥板断裂，唯有同心借力方可跨越！',
      isRescued: false,
      avatarSeed: 701,
      floor: 1,
    });
  } else if (floor === 2) {
    npcs.push({
      id: 'npc_scholar_nefti',
      name: '落难的文牍官 奈芙蒂',
      title: '尼罗河抄写圣手',
      type: 'stranded_scholar',
      languages: ['egyptian', 'aramaic', 'latin'],
      x: -4.8,
      y: 0.8,
      z: -1.6,
      dialogueAncient: 'Medu-Netjer ankh-wedja! Rūħā shmaya d’alaha!',
      dialogueTranslated: '奈芙蒂：同位语共振破开了落石！我愿将芦苇纸上的真言融入你们的语言链！',
      recruitedMemberId: 'member_3',
      isRescued: false,
      avatarSeed: 303,
      floor: 2,
    });
  } else if (floor === 3) {
    npcs.push({
      id: 'npc_hermit_f3',
      name: '残卷隐士 (Ziusudra)',
      title: '方言铭石师',
      type: 'hermit',
      languages: ['sumerian', 'aramaic'],
      x: 4.2,
      y: 1.2,
      z: -1.0,
      dialogueAncient: 'Sag-gig-ga ki-en-gi, mamla qadish!',
      dialogueTranslated: '隐士：上古黑头之民同语！我将冷库遗留的声波扩音法传授于你们，通信半径拓宽！',
      isRescued: false,
      avatarSeed: 703,
      floor: 3,
    });
  } else if (floor === 4) {
    npcs.push({
      id: 'npc_scholar_linghu',
      name: '悬崖太史 令狐',
      title: '殷周竹简掌书',
      type: 'stranded_scholar',
      languages: ['han', 'aramaic', 'sumerian'],
      x: 5.6,
      y: 1.6,
      z: -1.4,
      dialogueAncient: '道通为一，通幽洞微，天命玄鸟!',
      dialogueTranslated: '令狐：妙哉！以音韵通神，吾之甲骨文秘恰可为队伍筑起横贯四海的枢纽！',
      recruitedMemberId: 'member_4',
      isRescued: false,
      avatarSeed: 404,
      floor: 4,
    });
  } else if (floor === 6) {
    npcs.push({
      id: 'npc_scholar_erin',
      name: '绝壁先锋 艾琳',
      title: '欧甘德鲁伊先驱',
      type: 'stranded_scholar',
      languages: ['gaelic', 'latin', 'han'],
      x: -6.2,
      y: 0.8,
      z: 0.0,
      dialogueAncient: 'Nemeton Danu! Crann-beatha rith!',
      dialogueTranslated: '艾琳：深渊隔不断誓愿！我擅长凌空借力飞渡，任何断层都难阻我们登顶！',
      recruitedMemberId: 'member_5',
      isRescued: false,
      avatarSeed: 505,
      floor: 6,
    });
  }

  return npcs;
}

/**
 * Generates an authentic conlang utterance phrase from an ancient tongue.
 */
export function generateConlangUtterance(langId: LanguageId): { conlang: string; translation: string } {
  const lang = LANGUAGES[langId] || LANGUAGES.sumerian;
  const kw = lang.conlangKeywords;
  const p1 = kw[Math.floor(Math.random() * kw.length)];
  const p2 = kw[(Math.floor(Math.random() * kw.length) + 1) % kw.length];
  return {
    conlang: `${p1} · ${p2}`,
    translation: `${lang.name.split(' ')[0]}同位语共振`,
  };
}

/**
 * Computes real-time pairwise links across the squad for HUD visualization.
 */
export function computeLiveLanguageTopology(
  squad: SquadMember[],
  options: RelayOptions = {}
): import('./types.ts').LiveLanguageLink[] {
  const baseRadius = options.commRadius ?? 7.0;
  const maxDistance = options.hasMegaphoneRelic ? baseRadius * 1.6 : baseRadius;
  const hasOpenSource = !!options.hasOpenSourceProtocol;

  const links: import('./types.ts').LiveLanguageLink[] = [];

  for (let i = 0; i < squad.length - 1; i++) {
    const a = squad[i];
    const b = squad[i + 1];
    const dist = getDistance(a, b);
    const shared = shareLanguage(a, b);
    const bridge = shared[0] || (hasOpenSource ? a.languages[0] : null);

    let status: 'connected' | 'too_far' | 'language_barrier' = 'connected';
    if (dist > maxDistance) {
      status = 'too_far';
    } else if (shared.length === 0 && !hasOpenSource) {
      status = 'language_barrier';
    }

    links.push({
      fromMemberId: a.id,
      toMemberId: b.id,
      fromName: a.name.split(' ')[1] || a.name,
      toName: b.name.split(' ')[1] || b.name,
      distance: Number(dist.toFixed(1)),
      maxDistance: Number(maxDistance.toFixed(1)),
      sharedLanguages: shared,
      bridgeLanguage: bridge,
      isConnected: status === 'connected',
      status,
    });
  }

  return links;
}

