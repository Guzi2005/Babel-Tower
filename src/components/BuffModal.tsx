/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MiracleBuff } from '../game/types.ts';
import { Sparkles, BookOpen, Radio, Volume2, Link2, Send, Compass, Music, Shield, Zap } from 'lucide-react';

interface BuffModalProps {
  options: MiracleBuff[];
  onSelect: (buff: MiracleBuff) => void;
}

export const BuffModal: React.FC<BuffModalProps> = ({ options, onSelect }) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'polyglot_mind': return <BookOpen className="w-6 h-6 text-cyan-400" />;
      case 'open_source_protocol': return <Radio className="w-6 h-6 text-fuchsia-400" />;
      case 'megaphone_relic': return <Volume2 className="w-6 h-6 text-amber-400" />;
      case 'ironclad_handshake': return <Link2 className="w-6 h-6 text-blue-400" />;
      case 'catapult_throw': return <Send className="w-6 h-6 text-emerald-400" />;
      case 'gravitational_gyro': return <Compass className="w-6 h-6 text-rose-400" />;
      case 'chorus_resonance': return <Music className="w-6 h-6 text-purple-400" />;
      case 'phalanx_formation': return <Shield className="w-6 h-6 text-blue-400" />;
      case 'babel_sympathy': return <Zap className="w-6 h-6 text-yellow-400" />;
      default: return <Sparkles className="w-6 h-6 text-amber-400" />;
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'mythic':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-500/40">神话奇迹 (MYTHIC)</span>;
      case 'rare':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">稀有馈赠 (RARE)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">文明遗物 (RELIC)</span>;
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-none animate-fadeIn select-none">
      <div className="relative w-full max-w-3xl rounded-2xl bg-stone-950 border border-amber-500/50 p-6 md:p-8 text-amber-50 shadow-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>COLD VAULT MIRACLE REVELATION</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-amber-200">
            发掘文明冷库的奇迹馈赠
          </h2>
          <p className="text-xs md:text-sm text-stone-400 font-serif mt-1">
            选择一项史前或未来遗物，强化队伍的语言接力链与生存抗性
          </p>
        </div>

        {/* 3 Buff Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {options.map(buff => (
            <button
              key={buff.id}
              onClick={() => onSelect(buff)}
              aria-label={`选择奇迹: ${buff.title}`}
              className="group p-5 rounded-xl bg-stone-900/80 hover:bg-stone-900 border border-stone-800 hover:border-amber-500/60 transition-all flex flex-col justify-between text-left cursor-pointer shadow-lg active:scale-97"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-black/40 border border-stone-700 group-hover:scale-110 transition-transform">
                    {getIcon(buff.id)}
                  </div>
                  {getRarityBadge(buff.rarity)}
                </div>

                <h3 className="text-base font-serif font-bold text-amber-100 group-hover:text-amber-300 transition-colors mb-2">
                  {buff.title}
                </h3>

                <p className="text-xs font-serif text-stone-300 leading-relaxed">
                  {buff.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs font-mono text-stone-400 group-hover:text-amber-300">
                <span>融合进队伍</span>
                <span>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
