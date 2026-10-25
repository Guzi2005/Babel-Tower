/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Play, Volume2, VolumeX, Sparkles, Languages, Compass } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  isMuted,
  onToggleMute,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStart]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-8 bg-gradient-to-b from-stone-950/70 via-stone-950/30 to-stone-950/85 text-amber-50 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-amber-500/20 text-xs font-mono tracking-widest text-amber-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>TGA CONCEPT · CROWD TOWER CLIMBER</span>
        </div>
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? '取消静音' : '静音'}
          className="p-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-amber-500/20 text-amber-200 transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-stone-400" /> : <Volume2 className="w-5 h-5 text-amber-400" />}
        </button>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup */}
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto my-auto">
        <div className="relative mb-6">
          <svg
            viewBox="0 0 640 130"
            className="w-full max-w-[560px] h-auto drop-shadow-[0_10px_25px_rgba(245,158,11,0.25)]"
          >
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Architectural Arch Silhouette */}
            <path
              d="M 120 115 A 200 80 0 0 1 520 115"
              fill="none"
              stroke="#d97706"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.4"
            />
            <circle cx="320" cy="35" r="4" fill="#fbbf24" />

            {/* Title Text in Bespoke Typography */}
            <text
              x="320"
              y="72"
              textAnchor="middle"
              className="tracking-[0.2em] font-extrabold"
              fill="url(#goldGrad)"
              style={{ fontSize: '46px', fontFamily: '"Cinzel", "Noto Sans SC", "Noto Serif SC", "PingFang SC", sans-serif' }}
            >
              巴别塔的寓言
            </text>
            <text
              x="320"
              y="108"
              textAnchor="middle"
              className="tracking-[0.3em] font-mono font-medium"
              fill="#fed7aa"
              style={{ fontSize: '15px', fontFamily: '"JetBrains Mono", monospace' }}
            >
              FABLE OF BABEL · 失落的同位语
            </text>
          </svg>
        </div>

        {/* Narrative Teaser */}
        <p className="text-sm md:text-base text-stone-200 font-serif leading-relaxed max-w-xl mb-4">
          “上帝缓慢地摧毁巴别塔。语言从未真正把你们分开，但若断了接力的链条，人便在下坠中沦为哑者。”
        </p>
        <p className="text-xs text-amber-300/80 font-mono tracking-wide mb-8">
          “Tongues did not divide humanity; breaking the relay chain makes us fall into the silence of the void.”
        </p>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-lg mb-8 text-xs text-amber-200/90 font-mono">
          <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-black/40 border border-amber-500/20 text-center">
            <Languages className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-amber-300">多语言指令链</span>
            <span className="text-[10px] text-stone-400">Language Relay</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-black/40 border border-amber-500/20 text-center">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-cyan-300">物理抛掷与援救</span>
            <span className="text-[10px] text-stone-400">Physics Throw</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-black/40 border border-amber-500/20 text-center">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-emerald-300">冷库奇迹随机Buff</span>
            <span className="text-[10px] text-stone-400">Miracle Relics</span>
          </div>
        </div>

        {/* Primary Start CTA */}
        <button
          onClick={onStart}
          aria-label="开始攀登巴别塔"
          className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-lg tracking-wider text-stone-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] active:scale-95 transition-all cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>开始攀登天梯 · ASCEND BABEL</span>
          <span className="text-xs font-mono font-normal opacity-80 border-l border-stone-800/40 pl-2">
            SPACE / ENTER
          </span>
        </button>
      </div>

      {/* Control Hint Line */}
      <div className="text-center font-mono text-xs text-stone-300 tracking-wider">
        <span>WASD / Mouse Move 移动</span>
        <span className="mx-2 text-stone-500">·</span>
        <span>SPACE Jump/Throw 跃抛</span>
        <span className="mx-2 text-stone-500">·</span>
        <span>1-5 Relay Commands 指令</span>
        <span className="mx-2 text-stone-500">·</span>
        <span>V Switch View 视角</span>
      </div>
    </div>
  );
};
