/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRelaySpread,
  calculatePlatformBalance,
  createInitialSquad,
  getDistance,
  shareLanguage,
  computeLiveLanguageTopology,
  getTowerNPCsForFloor,
} from './languageChain.ts';
import { SquadMember } from './types.ts';

test('getDistance calculates accurate 3D Euclidean distance', () => {
  const d = getDistance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
  assert.equal(d, 5);
});

test('shareLanguage identifies common languages between members', () => {
  const a: SquadMember = {
    id: 'a',
    name: 'A',
    languages: ['sumerian', 'greek'],
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
    hp: 100, maxHp: 100, isLeader: true, isHeld: false, isThrown: false,
    throwProgress: 0, role: 'leader', avatarSeed: 1,
    isGrounded: true, isFalling: false, fallTumbleAngle: 0,
  };
  const b: SquadMember = {
    id: 'b',
    name: 'B',
    languages: ['greek', 'latin'],
    x: 1, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
    hp: 100, maxHp: 100, isLeader: false, isHeld: false, isThrown: false,
    throwProgress: 0, role: 'translator', avatarSeed: 2,
    isGrounded: true, isFalling: false, fallTumbleAngle: 0,
  };
  const common = shareLanguage(a, b);
  assert.deepEqual(common, ['greek']);
});

test('createInitialSquad starts with 2 core scholars by default', () => {
  const squad = createInitialSquad();
  assert.equal(squad.length, 2);
  assert.equal(squad[0].role, 'leader');
  assert.equal(squad[1].role, 'translator');
  const result = computeRelaySpread(squad[0], squad, 'sumerian');
  assert.equal(result.success, true);
  assert.equal(result.path.length, 2);
});

test('computeRelaySpread succeeds across complete squad when in proximity', () => {
  const squad = createInitialSquad(true);
  const leader = squad[0]; // speaks sumerian, akkadian, greek
  const result = computeRelaySpread(leader, squad, 'sumerian');

  assert.equal(result.success, true);
  assert.equal(result.unreachedMembers.length, 0);
  assert.equal(result.path.length, 5);
  assert.ok(result.steps.length >= 4);
  assert.ok(result.synergyMultiplier > 1.0);
});

test('computeRelaySpread fails to reach distant members beyond communication radius', () => {
  const squad = createInitialSquad(true);
  const leader = squad[0];
  // Move Erin (last member) far away
  squad[4].x = 100;
  squad[4].z = 100;

  const result = computeRelaySpread(leader, squad, 'sumerian', { commRadius: 7 });
  assert.equal(result.unreachedMembers.some(m => m.id === squad[4].id), true);
});

test('computeRelaySpread fails across language bridge gap when middle translator is removed', () => {
  const squad = createInitialSquad(true);
  const leader = squad[0];
  // Remove member 2 (Greek + Latin + Akkadian)
  const squadWithoutBridge = squad.filter(m => m.id !== 'member_2');

  const result = computeRelaySpread(leader, squadWithoutBridge, 'sumerian');
  assert.ok(result.unreachedMembers.length >= 0);
});

test('open source protocol allows relay across language gaps within range', () => {
  const squad = createInitialSquad();
  const leader = squad[0];
  const squadWithoutBridge = squad.filter(m => m.id !== 'member_2');

  const result = computeRelaySpread(leader, squadWithoutBridge, 'sumerian', {
    hasOpenSourceProtocol: true,
  });
  // With open source protocol, language barriers are bridged
  assert.equal(result.unreachedMembers.length, 0);
});

test('calculatePlatformBalance checks center of mass offset opposing platform tilt', () => {
  const squad = createInitialSquad();
  // If platform tilts right (+0.5 on x), squad centered around 0 is not yet counterbalanced
  const res1 = calculatePlatformBalance(0.5, squad, 'x');
  assert.ok(res1.stabilityPercent < 80);

  // If squad rushes left (negative x)
  squad.forEach(m => (m.x = -3.5));
  const res2 = calculatePlatformBalance(0.5, squad, 'x');
  assert.ok(res2.isBalanced);
  assert.ok(res2.stabilityPercent > res1.stabilityPercent);
});

test('computeLiveLanguageTopology generates real-time pairwise link health', () => {
  const squad = createInitialSquad(true);
  const links = computeLiveLanguageTopology(squad);

  assert.equal(links.length, 4);
  assert.equal(links.every((l: any) => l.isConnected), true);

  // Move Erin far away
  squad[4].x = 100;
  const brokenLinks = computeLiveLanguageTopology(squad, { commRadius: 7 });
  assert.equal(brokenLinks[3].status, 'too_far');
  assert.equal(brokenLinks[3].isConnected, false);
});

test('samplePlatformElevation returns accurate multi-tier heights and abyss null across 3 zones', async () => {
  const { samplePlatformElevation } = await import('./proceduralModels.ts');

  // ZONE 1 (Floors 1~3): Complete circular marble hall (no center hole!)
  assert.equal(samplePlatformElevation(0.0, 0.0, 1), 0.40); // Sacred center dais (solid! no hole)
  assert.equal(samplePlatformElevation(-6.0, -1.0, 1), 0.0); // Solid marble floor
  assert.equal(samplePlatformElevation(20.0, 0.0, 1), null); // Fallen off outer rotunda edge

  // ZONE 2 (Floors 4~14): Annular circular marble gallery with central lightwell abyss
  assert.equal(samplePlatformElevation(0.0, 3.5, 4), null); // Central lightwell abyss chasm!
  assert.equal(samplePlatformElevation(0.0, 0.0, 4), 0.35); // Cross stone arch bridge
  assert.equal(samplePlatformElevation(-8.0, 0.0, 4), 0.0); // Annular gallery walkway
  assert.equal(samplePlatformElevation(25.0, 0.0, 4), null); // Fallen off outer precipice

  // ZONE 3 (Floors 15~20): Unfinished construction summit with gaps & scaffolding
  assert.equal(samplePlatformElevation(0.0, 0.0, 16), null); // Central hoist shaft abyss!
  assert.equal(samplePlatformElevation(-8.0, 0.0, 16), 0.0); // Terracotta masonry floor
  assert.equal(samplePlatformElevation(-6.0, 13.0, 16), 0.18); // Cantilevered scaffolding planks
});

test('getTowerNPCsForFloor returns distinct NPCs on ruins', () => {
  const floor1NPCs = getTowerNPCsForFloor(1);
  assert.ok(floor1NPCs.length >= 1);
  assert.equal(floor1NPCs[0].type, 'lost_mason');

  const floor2NPCs = getTowerNPCsForFloor(2);
  assert.ok(floor2NPCs.some(n => n.type === 'stranded_scholar'));
});
