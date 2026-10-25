/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  SquadMember,
  LiveLanguageLink,
  RelayResult,
  LANGUAGES,
  COMMAND_TRANSLATIONS,
  CommandType,
} from '../game/types.ts';

interface LanguageChainHUDProps {
  squad: SquadMember[];
  links: LiveLanguageLink[];
  latestRelay: RelayResult | null;
  activeCommand?: CommandType | null;
}

export const LanguageChainHUD: React.FC<LanguageChainHUDProps> = ({
  squad,
  links,
  latestRelay,
  activeCommand = 'sprint',
}) => {
  const currentPhrases = activeCommand ? COMMAND_TRANSLATIONS[activeCommand] : null;

  // Compute organic curved constellation node positions
  const count = Math.max(squad.length, 2);
  const svgWidth = 620;
  const svgHeight = 110;
  const paddingX = 45;
  const availableW = svgWidth - paddingX * 2;
  const stepX = availableW / (count - 1);

  // Arc curve calculation: bows gracefully in a gentle celestial curve
  const nodeCoords = squad.map((_, i) => {
    const x = paddingX + i * stepX;
    const progress = count > 1 ? i / (count - 1) : 0.5;
    // Parabolic / sine curve sag: creates an organic suspended constellation ribbon
    const y = 32 + Math.sin(progress * Math.PI) * 22;
    return { x, y };
  });

  return (
    <div className="pointer-events-none flex flex-col items-center w-full select-none">
      {/* Dynamic Conlang Translation Banner (Floating without box) */}
      {latestRelay && (
        <div className="mb-1 pointer-events-auto flex items-center gap-2 text-xs font-serif drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] animate-fadeIn">
          <span className="text-amber-300 font-bold tracking-wide">
            {latestRelay.success ? '✦ 言语通畅' : '✕ 言语隔阂'}
          </span>
          <span className="text-stone-300 text-[11px]">{latestRelay.message}</span>
          <span className="text-amber-400 font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded-full">
            x{latestRelay.synergyMultiplier.toFixed(2)}
          </span>
        </div>
      )}

      {/* Organic Curved Constellation Ribbon (SVG + Floating Tokens) */}
      <div className="relative w-[620px] h-[110px] pointer-events-auto">
        {/* SVG Curved Connections */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        >
          <defs>
            <linearGradient id="silkGold" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.9" />
            </linearGradient>
            <filter id="silkShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Draw Curved Bézier Ribbons between consecutive scholars */}
          {nodeCoords.map((pt, i) => {
            if (i >= nodeCoords.length - 1) return null;
            const nextPt = nodeCoords[i + 1];
            const link = links[i];
            const isConn = link?.isConnected;

            // Curved Bézier path with gentle droop/tension
            const midX = (pt.x + nextPt.x) / 2;
            const midY = (pt.y + nextPt.y) / 2 + 10;
            const pathD = `M ${pt.x} ${pt.y} Q ${midX} ${midY} ${nextPt.x} ${nextPt.y}`;

            const strokeColor = isConn
              ? (link?.bridgeLanguage ? LANGUAGES[link.bridgeLanguage]?.color : '#38bdf8')
              : '#78716c';

            return (
              <g key={`ribbon_${i}`}>
                {/* Background Shadow line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#000000"
                  strokeWidth="4"
                  strokeOpacity="0.5"
                />
                {/* Main Silk Ribbon */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isConn ? '2.5' : '1.5'}
                  strokeDasharray={isConn ? 'none' : '4 4'}
                  filter="url(#silkShadow)"
                  className="transition-all duration-300"
                />

                {/* Center Glyph Bridge Label along curve */}
                {isConn && (
                  <text
                    x={midX}
                    y={midY - 4}
                    textAnchor="middle"
                    fill="#fef08a"
                    fontSize="9"
                    fontFamily="serif"
                    className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                  >
                    {link?.bridgeLanguage ? LANGUAGES[link.bridgeLanguage]?.name.split(' ')[0] : '开源互通'}
                  </text>
                )}
                {!isConn && (
                  <text
                    x={midX}
                    y={midY - 4}
                    textAnchor="middle"
                    fill="#f87171"
                    fontSize="9"
                    fontFamily="sans-serif"
                    className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                  >
                    {link?.status === 'too_far' ? '隔断' : '断链'}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Scholar Nodes along the Curve */}
        {squad.map((member, i) => {
          const pt = nodeCoords[i] || { x: 50, y: 50 };
          const primaryLang = member.languages[0] || 'sumerian';
          const langInfo = LANGUAGES[primaryLang];
          const conlangPhrase = currentPhrases?.[primaryLang];

          return (
            <div
              key={member.id}
              className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group"
              style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
            >
              {/* Overhead Speech Bubble on Active Relay */}
              {conlangPhrase && (
                <div className="absolute -top-7 whitespace-nowrap px-2 py-0.5 rounded-full bg-black/80 text-[10px] font-serif text-amber-200 border border-amber-500/30 shadow-lg animate-bounce">
                  {conlangPhrase}
                </div>
              )}

              {/* Scholar Token Ring */}
              <div
                className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg ${
                  member.isLeader
                    ? 'ring-2 ring-amber-400 bg-black/70'
                    : 'bg-black/60 border border-stone-600/80'
                }`}
                style={{
                  boxShadow: `0 0 10px ${langInfo?.color}40`,
                }}
              >
                {/* Native Script Glyphs */}
                <span
                  className="font-serif font-bold text-sm"
                  style={{ color: langInfo?.color || '#eab308' }}
                >
                  {primaryLang === 'sumerian' && '𒀭'}
                  {primaryLang === 'akkadian' && '𒈗'}
                  {primaryLang === 'greek' && 'Ω'}
                  {primaryLang === 'egyptian' && '𓀀'}
                  {primaryLang === 'aramaic' && '𐡀'}
                  {primaryLang === 'latin' && 'V'}
                  {primaryLang === 'han' && '文'}
                  {primaryLang === 'gaelic' && 'ᚁ'}
                  {primaryLang === 'enochian' && '𐌰'}
                  {primaryLang === 'celestial' && '✦'}
                </span>

                {/* Role Pill */}
                {member.isLeader && (
                  <span className="absolute -bottom-1 px-1 rounded-full bg-amber-500 text-[7px] font-bold text-black font-mono">
                    领袖
                  </span>
                )}
              </div>

              {/* Scholar Name */}
              <span className="text-[10px] font-serif font-medium text-stone-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mt-1 whitespace-nowrap">
                {member.name.split(' ')[1] || member.name}
              </span>

              {/* Languages List */}
              <div className="flex gap-0.5 mt-0.5">
                {member.languages.map(l => (
                  <span
                    key={l}
                    className="text-[8px] font-mono px-1 rounded bg-black/50"
                    style={{ color: LANGUAGES[l]?.color }}
                  >
                    {l.slice(0, 2).toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
