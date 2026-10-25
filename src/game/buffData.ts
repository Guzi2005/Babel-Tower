/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MiracleBuff } from './types.ts';

export const MIRACLE_BUFFS: MiracleBuff[] = [
  {
    id: 'polyglot_mind',
    title: '通晓双语 (Polyglot Mind)',
    category: 'language',
    icon: 'BookOpen',
    description: '随机一名学者领悟邻邦第二门语言，大幅减少语言断链概率。',
    rarity: 'rare',
  },
  {
    id: 'open_source_protocol',
    title: '开源协议 (Open-Source Protocol)',
    category: 'language',
    icon: 'Radio',
    description: '开启【开源协同】！队伍在 4m 距离内即使无共通语言亦能产生手势共鸣。',
    rarity: 'mythic',
  },
  {
    id: 'megaphone_relic',
    title: '千里传音机 (Megaphone Relic)',
    category: 'language',
    icon: 'Volume2',
    description: '来自现代冷库的违和大喇叭。语言链最大声波传输距离提升 60%。',
    rarity: 'rare',
  },
  {
    id: 'ironclad_handshake',
    title: '铁索连环 (Ironclad Handshake)',
    category: 'physics',
    icon: 'Link2',
    description: '队员握手牵引力提升 100%，被拉扯的同伴免疫崩塌坠落伤害。',
    rarity: 'common',
  },
  {
    id: 'catapult_throw',
    title: '轻灵飞掷 (Catapult Throw)',
    category: 'physics',
    icon: 'Send',
    description: '抛掷先锋的飞行距离增加 50%，着陆时产生冲击波并激活周边机关。',
    rarity: 'common',
  },
  {
    id: 'gravitational_gyro',
    title: '重力陀螺 (Gravitational Gyro)',
    category: 'physics',
    icon: 'Compass',
    description: '倾斜平台上的重心配平容错率提升 40%，延缓塔身崩塌蔓延速度。',
    rarity: 'rare',
  },
  {
    id: 'canned_miracle',
    title: '现代精加工罐头 (Miracle Ration)',
    category: 'survival',
    icon: 'Sparkles',
    description: '全员生命上限提升 25%，并在移动中每秒缓慢恢复生命值。',
    rarity: 'common',
  },
  {
    id: 'chorus_resonance',
    title: '众声合唱 (Chorus of Tongues)',
    category: 'language',
    icon: 'Music',
    description: '每次成功触发 4 种以上语言接力，全队获得 4 秒极速疾跑与无敌圣盾。',
    rarity: 'mythic',
  },
  {
    id: 'phalanx_formation',
    title: '密集方阵 (Phalanx Wall)',
    category: 'survival',
    icon: 'Shield',
    description: '全员靠拢聚拢时，受到的落石冲击伤害降低 60%。',
    rarity: 'common',
  },
  {
    id: 'featherlight_scout',
    title: '轻功羽步 (Featherlight Scout)',
    category: 'physics',
    icon: 'Feather',
    description: '先锋队员移动速度提高 35%，可轻易跨越较宽的断裂踏板。',
    rarity: 'rare',
  },
  {
    id: 'babel_sympathy',
    title: '同位语共振 (Apposition Surge)',
    category: 'language',
    icon: 'Zap',
    description: '语言链传达延迟缩短 50%，指令生效瞬间刷新队员冲刺冷却。',
    rarity: 'rare',
  },
  {
    id: 'angels_compass',
    title: '天使罗盘 (Angel\'s Compass)',
    category: 'relic',
    icon: 'Navigation',
    description: '高空迷雾中自动指引下一处安全基石与奇迹宝箱的坐标。',
    rarity: 'common',
  },
];

export function getRandomBuffOptions(count: number = 3, existingIds: string[] = []): MiracleBuff[] {
  const available = MIRACLE_BUFFS.filter(b => !existingIds.includes(b.id));
  const pool = available.length >= count ? available : MIRACLE_BUFFS;
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
