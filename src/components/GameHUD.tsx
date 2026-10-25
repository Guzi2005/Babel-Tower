/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LanguageChainHUD } from './LanguageChainHUD.tsx';
import {
  SquadMember,
  CommandType,
  RelayResult,
  MiracleBuff,
  LANGUAGES,
  LiveLanguageLink,
} from '../game/types.ts';
import {
  Zap,
  Shield,
  Send,
  KeyRound,
  Scale,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Eye,
} from 'lucide-react';

interface GameHUDProps {
  currentFloor: number;
  currentAct: number;
  squad: SquadMember[];
  links: LiveLanguageLink[];
  activeBuffs: MiracleBuff[];
  latestRelay: RelayResult | null;
  activeCommand: CommandType | null;
  balanceInfo: { tilt: number; stabilityPercent: number; isBalanced: boolean };
  onTriggerCommand: (cmd: CommandType) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenStory: () => void;
  viewMode?: 'cutaway' | 'aerial' | 'close';
  onToggleViewMode?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  currentFloor,
  currentAct,
  squad,
  links,
  activeBuffs,
  latestRelay,
  activeCommand,
  balanceInfo,
  onTriggerCommand,
  isMuted,
  onToggleMute,
  onOpenStory,
  viewMode = 'cutaway',
  onToggleViewMode,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 md:p-6 select-none">
      {/* Top Floating Perimeter Navigation (Borderless) */}
      <div className="flex items-start justify-between gap-4">
        {/* Left Status: Floor & Act with Floating Typography */}
        <div className="flex flex-col gap-1 pointer-events-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-extrabold tracking-tight text-amber-200">
              第 {currentFloor} 层
            </span>
            <span className="text-xs font-mono text-stone-300">/ 20</span>
          </div>

          <button
            onClick={onOpenStory}
            aria-label="查看当前剧情"
            className="flex items-center gap-1.5 text-xs font-serif text-amber-300/90 hover:text-amber-100 cursor-pointer transition-colors text-left"
          >
            <span className="font-mono text-[10px] text-amber-400/80">第 {currentAct} 幕</span>
            <span className="underline decoration-amber-500/40 underline-offset-4">
              {currentAct === 1 && '众声喧哗'}
              {currentAct === 2 && '冷库与奇迹'}
              {currentAct === 3 && '终极开源行动'}
              {currentAct === 4 && '重力与信仰'}
              {currentAct === 5 && '创世纪的幻灭'}
            </span>
          </button>

          {/* Act 4 Tilt Balance Danger Indicator */}
          {currentAct >= 4 && (
            <div
              className={`flex items-center gap-2 mt-1 text-xs font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
                balanceInfo.isBalanced ? 'text-emerald-300' : 'text-red-400 animate-pulse'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>巴别塔倾斜稳定度: {balanceInfo.stabilityPercent}%</span>
              {!balanceInfo.isBalanced && (
                <span className="text-[10px] text-amber-300 ml-1">
                  (向{balanceInfo.tilt > 0 ? '左' : '右'}移动配平)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Center: Language Chain Organic Curved Constellation */}
        <div className="flex-1 max-w-2xl mx-auto px-2">
          <LanguageChainHUD
            squad={squad}
            links={links}
            latestRelay={latestRelay}
            activeCommand={activeCommand}
          />
        </div>

        {/* Right Status: Scholars Count & View / Audio Controls (Borderless) */}
        <div className="flex items-center gap-2.5 pointer-events-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-1.5 text-xs font-mono text-stone-200">
            <span className="text-amber-300 font-bold">{squad.length} 位学者</span>
          </div>

          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              aria-label="切换巴别塔俯瞰/切面视角"
              className="p-1.5 text-stone-200 hover:text-amber-300 transition-colors"
              title="切换视角快捷键: V 或 C"
            >
              <Eye className="w-4 h-4 text-amber-400" />
            </button>
          )}

          <button
            onClick={onToggleMute}
            aria-label={isMuted ? '取消静音' : '静音'}
            className="p-1.5 text-stone-300 hover:text-amber-300 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-stone-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Unified Bottom Control Dock (Floating glass pill style, borderless) */}
      <div className="pointer-events-auto flex flex-col items-center max-w-2xl w-full mx-auto">
        {/* Dock Collapse Toggle */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          aria-label={isDockCollapsed ? '展开控制面板' : '收起控制面板'}
          className="flex items-center gap-1 text-[10px] font-mono text-stone-300 hover:text-amber-300 cursor-pointer drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pb-1"
        >
          {isDockCollapsed ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />}
          <span>{isDockCollapsed ? '展开战术指令' : '收起'}</span>
        </button>

        {/* Action Commands Container */}
        <div
          className={`w-full py-2 px-3 rounded-2xl backdrop-blur-md bg-black/40 shadow-xl flex flex-col gap-1.5 transition-all duration-200 ${
            isDockCollapsed ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          }`}
        >
          {/* Active Miracle Buffs Strip */}
          {activeBuffs.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-amber-200/90 overflow-x-auto pb-1">
              <span className="text-[10px] text-stone-400 shrink-0">冷库奇迹:</span>
              {activeBuffs.map(b => (
                <span
                  key={b.id}
                  className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 shrink-0 flex items-center gap-1"
                >
                  <span>✦</span>
                  <span>{b.title.split(' ')[0]}</span>
                </span>
              ))}
            </div>
          )}

          {/* 5 Core Tactical Commands */}
          <div className="grid grid-cols-5 gap-1.5">
            <button
              onClick={() => onTriggerCommand('sprint')}
              aria-label="触发全员疾行冲刺"
              className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl hover:bg-amber-500/20 active:scale-95 text-amber-200 cursor-pointer transition-all group"
            >
              <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-serif font-bold mt-0.5">疾行 (1)</span>
            </button>

            <button
              onClick={() => onTriggerCommand('gather_phalanx')}
              aria-label="触发密集方阵聚拢"
              className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl hover:bg-blue-500/20 active:scale-95 text-blue-200 cursor-pointer transition-all group"
            >
              <Shield className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-serif font-bold mt-0.5">结阵 (2)</span>
            </button>

            <button
              onClick={() => onTriggerCommand('throw_scout')}
              aria-label="触发飞跃抛掷先锋"
              className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl hover:bg-emerald-500/20 active:scale-95 text-emerald-200 cursor-pointer transition-all group"
            >
              <Send className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-serif font-bold mt-0.5">跳跃/抛掷 (3/空格)</span>
            </button>

            <button
              onClick={() => onTriggerCommand('decode_rune')}
              aria-label="触发语言共鸣破门"
              className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl hover:bg-purple-500/20 active:scale-95 text-purple-200 cursor-pointer transition-all group"
            >
              <KeyRound className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-serif font-bold mt-0.5">破译共鸣 (4)</span>
            </button>

            <button
              onClick={() => onTriggerCommand('balance_shift')}
              aria-label="触发重心配平转移"
              className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl hover:bg-rose-500/20 active:scale-95 text-rose-200 cursor-pointer transition-all group"
            >
              <Scale className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-serif font-bold mt-0.5">配平 (5)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
