/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface GameOverModalProps {
  reason: string;
  floorReached: number;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  reason,
  floorReached,
  onRestart,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none animate-fadeIn select-none">
      <div className="w-full max-w-lg rounded-2xl bg-stone-950 border border-red-500/40 p-6 md:p-8 text-stone-100 shadow-2xl flex flex-col gap-6 text-center">
        <div className="mx-auto p-3 rounded-full bg-red-950/60 border border-red-500/40 text-red-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div>
          <div className="text-xs font-mono tracking-widest text-red-400/80 mb-1">
            BABEL COLLAPSE · 语言之链断裂
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-red-200">
            队伍坠入神之断层
          </h2>
          <p className="text-xs md:text-sm text-stone-300 font-serif mt-2 leading-relaxed">
            {reason}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-around font-mono text-xs">
          <div>
            <span className="text-stone-400">登攀层级: </span>
            <span className="text-amber-400 font-bold text-sm">第 {floorReached} 层</span>
          </div>
          <div className="h-4 w-px bg-stone-800" />
          <div>
            <span className="text-stone-400">结局: </span>
            <span className="text-red-400 font-bold">沉寂重归混沌</span>
          </div>
        </div>

        <button
          onClick={onRestart}
          aria-label="重组学者小队，重新挑战"
          className="w-full py-3 rounded-xl font-serif font-bold text-base bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-stone-950 flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>重新组建队伍，再次攀登</span>
        </button>
      </div>
    </div>
  );
};
