/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, RotateCcw, HeartHandshake, Compass } from 'lucide-react';

interface VictoryModalProps {
  onRestart: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ onRestart }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-none animate-fadeIn select-none overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-stone-950 border border-amber-400/60 p-6 md:p-8 text-amber-50 shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col gap-6 text-center my-auto">
        <div className="mx-auto p-4 rounded-full bg-amber-500/10 border border-amber-400/40 text-amber-300">
          <HeartHandshake className="w-10 h-10 text-amber-300" />
        </div>

        <div>
          <div className="text-xs font-mono tracking-widest text-amber-400/80 mb-1">
            GENESIS AWAKENING · 创世纪的幻灭与和解
          </div>
          <h2 className="text-3xl font-serif font-bold text-amber-200">
            失落的同位语：终章启示
          </h2>
          <div className="w-16 h-0.5 bg-amber-500/40 mx-auto my-3" />
          <p className="text-sm md:text-base text-amber-100 font-serif leading-relaxed italic max-w-xl mx-auto">
            “巨大的神之手在星河中消散。指尖相触之时，你们并未获得神力，却看见了未来：高耸入云的钢铁丛林，因误解与隔阂而燃起的现代战火...”
          </p>
        </div>

        {/* Divine Revelation Card */}
        <div className="p-4 rounded-xl bg-stone-900/90 border border-amber-500/30 text-left font-serif space-y-2">
          <div className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>上帝的低语（全语种重叠）：</span>
          </div>
          <p className="text-sm text-stone-200 italic pl-3 border-l-2 border-amber-500/50">
            “语言从未把你们分开，是贪欲让你们选择了聋哑。”
          </p>
          <div className="pt-2 text-xs text-stone-400 leading-relaxed font-sans">
            巴别塔彻底坍塌为夜空的星尘。主角小队的学者们化作理解的火种，散落在人类历史的每一个时代——有人成为巴格达智慧宫的翻译官，有人成为联合国大厅里的同传者，有人在电缆的另一端倾听心声。
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-300 flex items-center justify-center gap-2">
          <Compass className="w-4 h-4 text-amber-400" />
          <span>“路还长，但至少我们学会了怎么说话。”</span>
        </div>

        <button
          onClick={onRestart}
          aria-label="再次攀登巴别塔"
          className="w-full py-3.5 rounded-xl font-serif font-bold text-base bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>重温文明轮回 · 开启新的攀登</span>
        </button>
      </div>
    </div>
  );
};
