/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { STORY_ACTS } from '../game/storyData.ts';
import { LANGUAGES } from '../game/types.ts';
import { Scroll, Sparkles, ChevronRight, X } from 'lucide-react';

interface StoryModalProps {
  actNumber: number;
  onClose: () => void;
}

export const StoryModal: React.FC<StoryModalProps> = ({ actNumber, onClose }) => {
  const act = STORY_ACTS.find(a => a.actNumber === actNumber) || STORY_ACTS[0];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-none animate-fadeIn select-none">
      <div className="relative w-full max-w-2xl rounded-2xl bg-stone-950 border border-amber-500/40 p-6 md:p-8 text-amber-50 shadow-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-amber-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Scroll className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-mono tracking-widest text-amber-400/80">
                BABEL CHRONICLES · 第 {act.actNumber} 幕
              </div>
              <h2 className="text-2xl font-serif font-bold text-amber-200">{act.title}</h2>
              <div className="text-xs font-mono text-stone-400 mt-0.5">{act.subtitle}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭剧情窗口"
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Narrative Dialogues matching the TGA Script */}
        <div className="flex flex-col gap-3.5 max-h-[320px] overflow-y-auto pr-1">
          {act.dialogue.map((d, idx) => {
            const lang = d.langId ? LANGUAGES[d.langId] : null;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-amber-300 font-serif">{d.speaker}</span>
                  {lang && (
                    <span
                      className="px-2 py-0.5 rounded text-[10px]"
                      style={{
                        backgroundColor: `${lang.color}20`,
                        color: lang.color,
                        border: `1px solid ${lang.color}40`,
                      }}
                    >
                      {lang.name}
                    </span>
                  )}
                </div>
                <p className="text-sm font-serif text-stone-200 leading-relaxed italic">
                  “{d.text}”
                </p>
              </div>
            );
          })}
        </div>

        {/* Goal / Summary */}
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-stone-300 font-serif">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>【本幕目标】{act.summary}</span>
          </div>
          <span className="font-mono text-amber-400 font-bold shrink-0 ml-2">
            目标: 第 {act.targetFloor} 层
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          aria-label="继续攀登"
          className="w-full py-3 rounded-xl font-serif font-bold text-base bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer"
        >
          <span>握紧彼此的手，继续前进</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
