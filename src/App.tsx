/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BabelEngine } from './game/BabelEngine.ts';
import { SquadMember, CommandType, RelayResult, MiracleBuff, LiveLanguageLink } from './game/types.ts';
import { sound } from './game/audio.ts';
import { getRandomBuffOptions } from './game/buffData.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { GameHUD } from './components/GameHUD.tsx';
import { StoryModal } from './components/StoryModal.tsx';
import { BuffModal } from './components/BuffModal.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { VictoryModal } from './components/VictoryModal.tsx';

type GameState = 'title' | 'playing' | 'gameover' | 'victory';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BabelEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' ? 'playing' : 'title';
  });

  const [currentFloor, setCurrentFloor] = useState<number>(1);
  const [currentAct, setCurrentAct] = useState<number>(1);
  const [squad, setSquad] = useState<SquadMember[]>([]);
  const [links, setLinks] = useState<LiveLanguageLink[]>([]);
  const [activeBuffs, setActiveBuffs] = useState<MiracleBuff[]>([]);
  const [latestRelay, setLatestRelay] = useState<RelayResult | null>(null);
  const [activeCommand, setActiveCommand] = useState<CommandType | null>(null);
  const [balanceInfo, setBalanceInfo] = useState<{
    tilt: number;
    stabilityPercent: number;
    isBalanced: boolean;
  }>({
    tilt: 0,
    stabilityPercent: 100,
    isBalanced: true,
  });

  const [viewMode, setViewMode] = useState<'cutaway' | 'aerial' | 'close'>('cutaway');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeStoryAct, setActiveStoryAct] = useState<number | null>(null);
  const [buffOptions, setBuffOptions] = useState<MiracleBuff[] | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string>('');

  // Handle Mute
  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  // Handle View Mode Toggle
  const handleToggleViewMode = useCallback(() => {
    engineRef.current?.toggleViewMode();
  }, []);

  // Initialize 3D Engine
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const engine = new BabelEngine(canvasContainerRef.current, {
      onFloorChange: (floor) => setCurrentFloor(floor),
      onActChange: (act) => setCurrentAct(act),
      onViewModeChange: (mode) => setViewMode(mode),
      onRelayResult: (res) => {
        setLatestRelay(res);
        // Generous display time for reading translations
        setTimeout(() => {
          setLatestRelay((cur) => (cur === res ? null : cur));
        }, 5000);
      },
      onSquadUpdate: (members) => setSquad([...members]),
      onTopologyUpdate: (liveLinks) => setLinks(liveLinks),
      onBalanceUpdate: (tilt, stabilityPercent, isBalanced) => {
        setBalanceInfo({ tilt, stabilityPercent, isBalanced });
      },
      onMiracleTrigger: () => {
        const options = getRandomBuffOptions(3, activeBuffs.map((b) => b.id));
        setBuffOptions(options);
      },
      onStoryTrigger: (actNum) => {
        setActiveStoryAct(actNum);
      },
      onGameOver: (reason) => {
        setGameOverReason(reason);
        setGameState('gameover');
      },
      onVictory: () => {
        setGameState('victory');
      },
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Command Trigger handler
  const handleTriggerCommand = useCallback((cmd: CommandType) => {
    setActiveCommand(cmd);
    engineRef.current?.triggerCommand(cmd);
    setTimeout(() => {
      setActiveCommand((c) => (c === cmd ? null : c));
    }, 4500);
  }, []);

  // Buff selection handler
  const handleSelectBuff = useCallback((buff: MiracleBuff) => {
    setActiveBuffs((prev) => [...prev, buff]);
    engineRef.current?.addMiracleBuff(buff);
    setBuffOptions(null);
  }, []);

  // Restart game handler
  const handleRestart = useCallback(() => {
    setActiveBuffs([]);
    setActiveStoryAct(null);
    setBuffOptions(null);
    setGameOverReason('');
    engineRef.current?.restart();
    setGameState('playing');
  }, []);

  // Start game from title
  const handleStartGame = useCallback(() => {
    setGameState('playing');
    setActiveStoryAct(1); // open Act 1 introduction
  }, []);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-stone-950 font-sans"
      data-state={gameState}
    >
      {/* 3D WebGL Canvas Mount Container */}
      <div
        ref={canvasContainerRef}
        data-testid="babel-canvas-mount"
        className="absolute inset-0 z-0 w-full h-full"
      />

      {/* Title Screen */}
      {gameState === 'title' && (
        <TitleScreen
          onStart={handleStartGame}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Main In-Game HUD */}
      {gameState === 'playing' && (
        <GameHUD
          currentFloor={currentFloor}
          currentAct={currentAct}
          squad={squad}
          links={links}
          activeBuffs={activeBuffs}
          latestRelay={latestRelay}
          activeCommand={activeCommand}
          balanceInfo={balanceInfo}
          onTriggerCommand={handleTriggerCommand}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenStory={() => setActiveStoryAct(currentAct)}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
        />
      )}

      {/* Story Narrative Modal */}
      {gameState === 'playing' && activeStoryAct !== null && (
        <StoryModal
          actNumber={activeStoryAct}
          onClose={() => setActiveStoryAct(null)}
        />
      )}

      {/* Miracle Buff Choice Modal */}
      {gameState === 'playing' && buffOptions && (
        <BuffModal
          options={buffOptions}
          onSelect={handleSelectBuff}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'gameover' && (
        <GameOverModal
          reason={gameOverReason}
          floorReached={currentFloor}
          onRestart={handleRestart}
        />
      )}

      {/* Victory / Genesis Awakening Modal */}
      {gameState === 'victory' && (
        <VictoryModal
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
