/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { LanguageId, LANGUAGES } from './types.ts';

/**
 * Creates a pixelated character texture (32x32) in the style of Painters Guild / Run Zombie Food.
 */
export function createPixelCharacterTexture(
  role: 'leader' | 'translator' | 'scholar' | 'scout' | 'pioneer',
  primaryLang: LanguageId,
  seed: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = false;

  // Clear
  ctx.clearRect(0, 0, 32, 32);

  // Palette based on language & role
  const langColor = LANGUAGES[primaryLang]?.color || '#eab308';
  const skinTones = ['#ffd1a4', '#f5b584', '#e09f67', '#8d5524', '#c68642'];
  const skin = skinTones[seed % skinTones.length];
  const hairTones = ['#271c19', '#4a3728', '#8b5a2b', '#c29b62', '#1a1a1a'];
  const hair = hairTones[(seed >> 2) % hairTones.length];

  // Draw Head (x: 10 to 21, y: 4 to 15)
  ctx.fillStyle = hair;
  ctx.fillRect(10, 4, 12, 5); // Hair top
  ctx.fillRect(9, 7, 3, 5);  // Hair left
  ctx.fillRect(20, 7, 3, 5); // Hair right

  ctx.fillStyle = skin;
  ctx.fillRect(11, 7, 10, 8); // Face

  // Eyes (Pixel dots)
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(13, 9, 2, 2);
  ctx.fillRect(17, 9, 2, 2);

  // Eye highlights
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(13, 9, 1, 1);
  ctx.fillRect(17, 9, 1, 1);

  // Beard or accessory based on seed
  if (seed % 3 === 0) {
    ctx.fillStyle = hair;
    ctx.fillRect(13, 13, 6, 3); // Beard
  }

  // Laurel wreath / headband / hat
  if (role === 'leader') {
    ctx.fillStyle = '#eab308'; // Golden circlet
    ctx.fillRect(10, 5, 12, 2);
    ctx.fillStyle = '#ef4444'; // Red gem
    ctx.fillRect(15, 4, 2, 2);
  } else if (primaryLang === 'greek') {
    ctx.fillStyle = '#22c55e'; // Green laurel
    ctx.fillRect(10, 6, 12, 1);
  } else if (primaryLang === 'han') {
    ctx.fillStyle = '#065f46'; // Jade hairpin
    ctx.fillRect(9, 4, 14, 2);
  }

  // Body / Robe (y: 15 to 27)
  ctx.fillStyle = langColor;
  ctx.fillRect(10, 15, 12, 10); // Main tunic

  // Belt / trim
  ctx.fillStyle = '#78350f';
  ctx.fillRect(10, 19, 12, 2); // Belt
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(15, 19, 2, 2); // Belt buckle

  // Hands (y: 18 to 22)
  ctx.fillStyle = skin;
  ctx.fillRect(8, 18, 2, 4);
  ctx.fillRect(22, 18, 2, 4);

  // Legs / Feet (y: 25 to 30)
  ctx.fillStyle = '#451a03';
  ctx.fillRect(11, 25, 4, 5);
  ctx.fillRect(17, 25, 4, 5);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

/**
 * Creates a Bruegel-style sandstone / brick texture (64x64).
 */
export function createBabelStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#bfa181'; // Warm terracotta / sandstone base
  ctx.fillRect(0, 0, 64, 64);

  // Brick rows
  ctx.fillStyle = '#8c6e54'; // Mortar / shadow
  for (let y = 0; y < 64; y += 16) {
    ctx.fillRect(0, y, 64, 2);
  }

  // Vertical mortar lines
  for (let row = 0; row < 4; row++) {
    const y = row * 16;
    const offset = (row % 2) * 16;
    for (let x = offset; x < 64; x += 32) {
      ctx.fillRect(x, y, 2, 16);
    }
  }

  // Pixel noise & weathered cracks
  ctx.fillStyle = '#d4bba0';
  for (let i = 0; i < 160; i++) {
    const px = Math.floor(Math.random() * 64);
    const py = Math.floor(Math.random() * 64);
    ctx.fillRect(px, py, 1, 1);
  }

  ctx.fillStyle = '#5c4533';
  for (let i = 0; i < 70; i++) {
    const px = Math.floor(Math.random() * 64);
    const py = Math.floor(Math.random() * 64);
    ctx.fillRect(px, py, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

/**
 * Creates ancient cuneiform / hieroglyphic tablet texture.
 */
export function createRuneStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#6b7280';
  ctx.fillRect(0, 0, 64, 64);

  // Carved runic symbols
  ctx.fillStyle = '#fef08a';
  // Glyphs
  ctx.fillRect(8, 12, 16, 2);
  ctx.fillRect(16, 8, 2, 12);
  ctx.fillRect(36, 12, 14, 2);
  ctx.fillRect(42, 6, 2, 14);

  ctx.fillRect(12, 38, 12, 2);
  ctx.fillRect(18, 32, 2, 14);
  ctx.fillRect(38, 42, 16, 2);
  ctx.fillRect(38, 36, 2, 10);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

/**
 * Creates modern cold vault tech container texture (anachronistic miracle).
 */
export function createColdVaultTechTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e293b'; // Slate dark alloy
  ctx.fillRect(0, 0, 32, 32);

  // Rivets & metallic seams
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, 32, 2);
  ctx.fillRect(0, 30, 32, 2);
  ctx.fillRect(0, 0, 2, 32);
  ctx.fillRect(30, 0, 2, 32);

  // Digital LED monitor / cold cryogenic frost
  ctx.fillStyle = '#06b6d4'; // Cyan glowing screen
  ctx.fillRect(8, 8, 16, 8);
  ctx.fillStyle = '#ec4899'; // Danger warning LED
  ctx.fillRect(20, 20, 4, 4);

  // Text stencil 'VAULT-2026'
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(10, 11, 2, 2);
  ctx.fillRect(14, 11, 2, 2);
  ctx.fillRect(18, 11, 2, 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

/**
 * Procedural Language Glyph Badge for in-world floating icons.
 */
export function createLanguageGlyphTexture(langId: LanguageId): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 64, 64);

  const info = LANGUAGES[langId];
  const color = info?.color || '#ffffff';

  // Circular glow background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.arc(32, 32, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();

  // Character / script
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Noto Sans SC", "Noto Serif SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const scriptChar: Record<string, string> = {
    sumerian: '楔',
    akkadian: '𒈗',
    greek: 'Ω',
    egyptian: '圣',
    aramaic: '𐡀',
    latin: 'V',
    han: '道',
    gaelic: '符',
    enochian: '𐌰',
    celestial: '✦',
  };

  const charStr = scriptChar[langId] || '言';
  ctx.fillText(charStr, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates Babylonian Ishtar Gate lapis lazuli glazed brick texture (64x64).
 */
export function createIshtarTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Deep glazed lapis-lazuli turquoise blue
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 64, 64);

  // Brick grid
  ctx.fillStyle = '#0369a1';
  for (let y = 0; y < 64; y += 16) {
    ctx.fillRect(0, y, 64, 1);
  }
  for (let row = 0; row < 4; row++) {
    const y = row * 16;
    const offset = (row % 2) * 16;
    for (let x = offset; x < 64; x += 32) {
      ctx.fillRect(x, y, 1, 16);
    }
  }

  // Golden rosette ornament in center of bricks
  ctx.fillStyle = '#f59e0b';
  [16, 48].forEach(by => {
    [16, 48].forEach(bx => {
      ctx.fillRect(bx - 1, by - 3, 3, 7);
      ctx.fillRect(bx - 3, by - 1, 7, 3);
      ctx.fillRect(bx - 1, by - 1, 3, 3);
    });
  });

  // Glaze shine pixels
  ctx.fillStyle = '#38bdf8';
  for (let i = 0; i < 40; i++) {
    const px = Math.floor(Math.random() * 64);
    const py = Math.floor(Math.random() * 64);
    ctx.fillRect(px, py, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

/**
 * Creates bazaar striped canopy fabric texture.
 */
export function createCanopyStripeTexture(colorA: string = '#dc2626', colorB: string = '#fef08a'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = colorA;
  ctx.fillRect(0, 0, 32, 32);

  ctx.fillStyle = colorB;
  for (let x = 0; x < 32; x += 8) {
    ctx.fillRect(x, 0, 4, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates Euphrates river water texture with subtle waves and depth.
 */
export function createWaterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Deep rich aquamarine river base
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 64, 64);

  // Soft flowing wave ripples
  ctx.fillStyle = '#38bdf8';
  for (let y = 4; y < 64; y += 8) {
    ctx.beginPath();
    ctx.ellipse(32, y, 28, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sun sparkle highlights
  ctx.fillStyle = '#bae6fd';
  for (let i = 0; i < 30; i++) {
    const px = Math.floor(Math.random() * 64);
    const py = Math.floor(Math.random() * 64);
    ctx.fillRect(px, py, 2, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates an ancient papyrus / stone dialogue speech bubble texture for 3D billboard sprites.
 */
export function createSpeechBubbleTexture(
  conlangText: string,
  translationText: string,
  langColor: string = '#f59e0b'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 96);

  // Rounded papyrus bubble with ancient border
  ctx.fillStyle = 'rgba(28, 25, 23, 0.92)';
  ctx.strokeStyle = langColor;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 70, 10);
  ctx.fill();
  ctx.stroke();

  // Bottom pointer beak
  ctx.fillStyle = 'rgba(28, 25, 23, 0.92)';
  ctx.beginPath();
  ctx.moveTo(120, 78);
  ctx.lineTo(128, 92);
  ctx.lineTo(136, 78);
  ctx.fill();

  ctx.strokeStyle = langColor;
  ctx.beginPath();
  ctx.moveTo(120, 78);
  ctx.lineTo(128, 92);
  ctx.lineTo(136, 78);
  ctx.stroke();

  // Conlang ancient text (top row, prominent)
  ctx.fillStyle = langColor;
  ctx.font = 'bold 15px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(conlangText.length > 24 ? conlangText.slice(0, 24) + '…' : conlangText, 128, 30);

  // Translation text (bottom row, subtle)
  ctx.fillStyle = '#fef08a';
  ctx.font = '12px sans-serif';
  ctx.fillText(translationText.length > 20 ? translationText.slice(0, 20) + '…' : translationText, 128, 54);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates classical embroidered robe trim pattern (Greek meander / Babylonian rosette band).
 */
export function createRobeTrimTexture(accentColor: string = '#d97706'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fef3c7'; // warm cream linen
  ctx.fillRect(0, 0, 32, 32);

  ctx.fillStyle = accentColor;
  // Greek Key / fret embroidery pattern
  ctx.fillRect(0, 4, 32, 2);
  ctx.fillRect(0, 26, 32, 2);

  for (let x = 0; x < 32; x += 8) {
    ctx.fillRect(x + 2, 8, 4, 2);
    ctx.fillRect(x + 4, 10, 2, 12);
    ctx.fillRect(x + 2, 22, 4, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates classical polished circular marble grand hall texture (128x128).
 */
export function createMarbleFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Smooth warm cream/white Carrara marble base
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 128, 128);

  // Marble veining (soft grey-amber organic veins)
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.bezierCurveTo(40, 35, 30, 85, 80, 128);
  ctx.stroke();

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(90, 0);
  ctx.bezierCurveTo(70, 50, 110, 90, 128, 110);
  ctx.stroke();

  // Concentric radial border inlay (dark imperial porphyry marble rim)
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 120, 120);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, 112, 112);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates annular corridor marble tiles texture (64x64).
 */
export function createMarbleTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 64, 64);

  // Alternating polished pavers
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(2, 2, 28, 28);
  ctx.fillRect(34, 34, 28, 28);

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(34, 2, 28, 28);
  ctx.fillRect(2, 34, 28, 28);

  // Dark grout lines
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(32, 0); ctx.lineTo(32, 64);
  ctx.moveTo(0, 32); ctx.lineTo(64, 32);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates unfinished construction raw terracotta brick texture (64x64).
 */
export function createUnfinishedBrickTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#9a3412'; // rich burnt terracotta clay
  ctx.fillRect(0, 0, 64, 64);

  // Mortar lines
  ctx.fillStyle = '#d6d3d1';
  for (let y = 0; y < 64; y += 12) {
    ctx.fillRect(0, y, 64, 2);
  }
  for (let row = 0; row < 6; row++) {
    const y = row * 12;
    const offset = (row % 2) * 16;
    for (let x = offset; x < 64; x += 32) {
      ctx.fillRect(x, y, 2, 12);
    }
  }

  // Rough gravel specks
  ctx.fillStyle = '#7c2d12';
  for (let i = 0; i < 40; i++) {
    const px = Math.floor(Math.random() * 64);
    const py = Math.floor(Math.random() * 64);
    ctx.fillRect(px, py, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates rough unfinished construction timber scaffolding texture.
 */
export function createScaffoldWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, 0, 32, 32);

  // Wood grain lines
  ctx.fillStyle = '#92400e';
  for (let y = 0; y < 32; y += 4) {
    ctx.fillRect(0, y, 32, 2);
  }

  ctx.fillStyle = '#451a03';
  ctx.fillRect(8, 0, 2, 32);
  ctx.fillRect(24, 0, 2, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

