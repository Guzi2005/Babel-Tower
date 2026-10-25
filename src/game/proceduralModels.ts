/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { SquadMember, LANGUAGES, TowerNPC } from './types.ts';
import {
  createLanguageGlyphTexture,
  createBabelStoneTexture,
  createColdVaultTechTexture,
  createIshtarTileTexture,
  createCanopyStripeTexture,
  createWaterTexture,
  createMarbleFloorTexture,
  createMarbleTileTexture,
  createUnfinishedBrickTexture,
  createScaffoldWoodTexture,
  createSpeechBubbleTexture,
} from './pixelTextures.ts';

export interface CharacterMeshBundle {
  group: THREE.Group;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  robeSkirt: THREE.Mesh;
  head: THREE.Group;
  glyphSprite: THREE.Sprite;
  speechSprite: THREE.Sprite;
  shadowDisc: THREE.Mesh;
  updateAnimation: (time: number, isMoving: boolean, isThrowing: boolean, isHeld: boolean, isFalling?: boolean) => void;
  updateLanguageGlyph: (member: SquadMember) => void;
  showSpeechBubble: (conlangText: string, translationText: string, duration?: number) => void;
  setSquash: (squashAmount: number) => void;
}

export interface NPCMeshBundle {
  group: THREE.Group;
  speechSprite: THREE.Sprite;
  updateAnimation: (time: number) => void;
  showSpeechBubble: (conlangText: string, translationText: string, duration?: number) => void;
  setSquash: (squashAmount: number) => void;
}

/**
 * Palette mapping for vibrant cultural ancient robes and attire.
 */
const CULTURAL_GARB: Record<string, { robe: number; trim: number; skin: number; hair: number }> = {
  sumerian: { robe: 0x1e3a8a, trim: 0xf59e0b, skin: 0xf5b584, hair: 0x1c1917 }, // Lapis & gold
  akkadian: { robe: 0xb45309, trim: 0xfde047, skin: 0xf5b584, hair: 0x18181b }, // Ochre & yellow gold
  greek:    { robe: 0xf8fafc, trim: 0x0284c7, skin: 0xffd1a4, hair: 0x78350f }, // White himation & azure
  egyptian: { robe: 0x0f766e, trim: 0xfbbf24, skin: 0xd97706, hair: 0x09090b }, // Teal & gold
  aramaic:  { robe: 0x0369a1, trim: 0xfef08a, skin: 0xe09f67, hair: 0x27272a }, // Sky blue & linen
  latin:    { robe: 0x991b1b, trim: 0xd97706, skin: 0xf5b584, hair: 0x292524 }, // Crimson & bronze
  han:      { robe: 0x065f46, trim: 0xa7f3d0, skin: 0xffe4c4, hair: 0x020617 }, // Emerald Hanfu & jade
  gaelic:   { robe: 0x6b21a8, trim: 0xe2e8f0, skin: 0xffd1a4, hair: 0xb45309 }, // Violet tartan & silver
  enochian: { robe: 0xbe185d, trim: 0xffffff, skin: 0xfff1f2, hair: 0xf43f5e }, // Magenta & divine light
  celestial:{ robe: 0xe11d48, trim: 0xfef08a, skin: 0xfffbeb, hair: 0xfbbf24 }, // Rose & celestial gold
};

/**
 * Builds a composite procedural character mesh with Minecraft-style 2nd layer pixel patches,
 * classical flowing robes, detailed hairstyles, and floating conlang speech bubbles.
 */
export function buildPixelCharacter(member: SquadMember): CharacterMeshBundle {
  const group = new THREE.Group();
  group.name = `char_${member.id}`;
  group.scale.set(1.45, 1.45, 1.45);

  const primaryLang = member.languages[0] || 'sumerian';
  const garb = CULTURAL_GARB[primaryLang] || CULTURAL_GARB.sumerian;

  // Materials
  const robeMat = new THREE.MeshStandardMaterial({
    color: garb.robe,
    roughness: 0.65,
    metalness: 0.1,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: garb.trim,
    roughness: 0.35,
    metalness: 0.5,
  });

  const fleshMat = new THREE.MeshStandardMaterial({
    color: garb.skin,
    roughness: 0.8,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: garb.hair,
    roughness: 0.9,
  });

  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.8,
  });

  // 1. Torso Upper Robe (y: 0.44 to 0.96)
  const torsoGeo = new THREE.BoxGeometry(0.56, 0.52, 0.40);
  const torso = new THREE.Mesh(torsoGeo, robeMat);
  torso.position.y = 0.70;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Minecraft 2nd Layer Patch: Draped Himation / Sash Shoulder Cowl
  const sashPatchGeo = new THREE.BoxGeometry(0.62, 0.56, 0.44);
  const sashPatch = new THREE.Mesh(sashPatchGeo, trimMat);
  sashPatch.position.set(0.02, 0.72, 0.02);
  sashPatch.scale.set(0.55, 1.02, 1.04);
  torso.add(sashPatch);

  // Belt & golden buckle
  const beltGeo = new THREE.BoxGeometry(0.60, 0.10, 0.44);
  const belt = new THREE.Mesh(beltGeo, trimMat);
  belt.position.y = 0.50;
  group.add(belt);

  // Trailing waist sash ribbons (MC 2nd layer patch hanging down)
  const ribbonGeo = new THREE.BoxGeometry(0.12, 0.42, 0.04);
  const ribbon = new THREE.Mesh(ribbonGeo, trimMat);
  ribbon.position.set(0.12, 0.28, 0.22);
  group.add(ribbon);

  // 2. Flowing Robe Skirt (Classical long robe draped down past knees!)
  const robeSkirtGeo = new THREE.BoxGeometry(0.62, 0.44, 0.44);
  robeSkirtGeo.translate(0, -0.20, 0); // pivot at waist
  const robeSkirt = new THREE.Mesh(robeSkirtGeo, robeMat);
  robeSkirt.position.set(0, 0.46, 0);
  robeSkirt.castShadow = true;
  group.add(robeSkirt);

  // Bottom gold embroidery trim band on robe skirt
  const skirtTrimGeo = new THREE.BoxGeometry(0.64, 0.08, 0.46);
  const skirtTrim = new THREE.Mesh(skirtTrimGeo, trimMat);
  skirtTrim.position.set(0, -0.38, 0);
  robeSkirt.add(skirtTrim);

  // 3. Head Group (Head box + pixel eyes + detailed 2nd layer hair patches)
  const head = new THREE.Group();
  head.position.y = 1.25;

  const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.44);
  const headMesh = new THREE.Mesh(headGeo, fleshMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  // MC 2nd Layer: Hair Volume & Layered Patches
  const hairTopGeo = new THREE.BoxGeometry(0.54, 0.24, 0.50);
  const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
  hairTop.position.set(0, 0.18, -0.03);
  head.add(hairTop);

  // MC 2nd Layer: Front Bangs Pixel Patch
  const bangsGeo = new THREE.BoxGeometry(0.50, 0.14, 0.08);
  const bangs = new THREE.Mesh(bangsGeo, hairMat);
  bangs.position.set(0, 0.18, 0.21);
  head.add(bangs);

  // MC 2nd Layer: Left & Right Sideburn Hair Locks
  const sideburnGeo = new THREE.BoxGeometry(0.06, 0.28, 0.18);
  const leftBurn = new THREE.Mesh(sideburnGeo, hairMat);
  leftBurn.position.set(-0.25, 0.02, 0.06);
  head.add(leftBurn);

  const rightBurn = new THREE.Mesh(sideburnGeo, hairMat);
  rightBurn.position.set(0.25, 0.02, 0.06);
  head.add(rightBurn);

  // Pixel eyes (Front face at z: +0.23)
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const leftPupil = new THREE.Mesh(eyeGeo, pupilMat);
  leftPupil.position.set(-0.11, 0.02, 0.23);
  head.add(leftPupil);

  const rightPupil = new THREE.Mesh(eyeGeo, pupilMat);
  rightPupil.position.set(0.11, 0.02, 0.23);
  head.add(rightPupil);

  const shineGeo = new THREE.BoxGeometry(0.04, 0.04, 0.045);
  const leftShine = new THREE.Mesh(shineGeo, shineMat);
  leftShine.position.set(-0.1, 0.04, 0.235);
  head.add(leftShine);

  const rightShine = new THREE.Mesh(shineGeo, shineMat);
  rightShine.position.set(0.12, 0.04, 0.235);
  head.add(rightShine);

  // Cultural Headgear Accent (2nd Layer)
  if (member.role === 'leader' || primaryLang === 'sumerian' || primaryLang === 'akkadian') {
    // Babylonian Conical Headdress with Gold Rosettes
    const crownGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.26, 8);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 0.36;
    head.add(crown);

    const lapisBead = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3 })
    );
    lapisBead.position.set(0, 0.36, 0.28);
    head.add(lapisBead);
  } else if (primaryLang === 'greek') {
    // Greek Philosopher Laurel Wreath
    const laurelGeo = new THREE.TorusGeometry(0.29, 0.045, 6, 16);
    const laurelMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });
    const laurel = new THREE.Mesh(laurelGeo, laurelMat);
    laurel.rotation.x = Math.PI / 2;
    laurel.position.y = 0.24;
    head.add(laurel);
  } else if (primaryLang === 'han') {
    // Guan Scholar Hat with Jade Hairpin
    const hatGeo = new THREE.BoxGeometry(0.34, 0.22, 0.34);
    const hat = new THREE.Mesh(hatGeo, hairMat);
    hat.position.y = 0.34;
    head.add(hat);

    const pinGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.58, 6);
    const pin = new THREE.Mesh(pinGeo, trimMat);
    pin.rotation.z = Math.PI / 2;
    pin.position.set(0, 0.34, 0);
    head.add(pin);
  } else if (primaryLang === 'egyptian') {
    // Nemes Royal Striped Headcloth with Golden Uraeus
    const nemesGeo = new THREE.BoxGeometry(0.56, 0.22, 0.52);
    const nemes = new THREE.Mesh(nemesGeo, trimMat);
    nemes.position.set(0, 0.22, -0.02);
    head.add(nemes);

    // Flaps hanging down shoulders
    [-0.26, 0.26].forEach(fx => {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.16), trimMat);
      flap.position.set(fx, 0.02, 0.12);
      head.add(flap);
    });
  } else if (primaryLang === 'gaelic') {
    // Druidic Hood / Celtic Torque
    const hoodGeo = new THREE.TorusGeometry(0.28, 0.05, 6, 12);
    const hood = new THREE.Mesh(hoodGeo, trimMat);
    hood.rotation.x = Math.PI / 2;
    hood.position.y = 0.20;
    head.add(hood);
  }

  group.add(head);

  // 4. Limbs: Arms with Flowing Wide Robe Sleeves (宽袍大袖)
  const armGeo = new THREE.BoxGeometry(0.16, 0.48, 0.16);
  armGeo.translate(0, -0.22, 0); // pivot at shoulder

  // Wide sleeve cuff outer patch
  const sleeveGeo = new THREE.BoxGeometry(0.22, 0.32, 0.22);
  sleeveGeo.translate(0, -0.16, 0);

  // Left Arm
  const leftArm = new THREE.Mesh(armGeo, robeMat);
  leftArm.position.set(-0.38, 0.92, 0);
  leftArm.castShadow = true;
  group.add(leftArm);

  const leftSleeve = new THREE.Mesh(sleeveGeo, robeMat);
  leftArm.add(leftSleeve);

  const handGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);
  const leftHand = new THREE.Mesh(handGeo, fleshMat);
  leftHand.position.set(0, -0.46, 0);
  leftArm.add(leftHand);

  // Right Arm
  const rightArm = new THREE.Mesh(armGeo, robeMat);
  rightArm.position.set(0.38, 0.92, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  const rightSleeve = new THREE.Mesh(sleeveGeo, robeMat);
  rightArm.add(rightSleeve);

  const rightHand = new THREE.Mesh(handGeo, fleshMat);
  rightHand.position.set(0, -0.46, 0);
  rightArm.add(rightHand);

  // 5. Legs (Peeking out beneath robe skirt)
  const legGeo = new THREE.BoxGeometry(0.16, 0.38, 0.16);
  legGeo.translate(0, -0.19, 0);

  const leftLeg = new THREE.Mesh(legGeo, bootMat);
  leftLeg.position.set(-0.16, 0.38, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, bootMat);
  rightLeg.position.set(0.16, 0.38, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // 6. Contact shadow disc underneath (transparent, depthWrite false)
  const shadowGeo = new THREE.CircleGeometry(0.44, 16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x09090b,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.y = 0.02;
  group.add(shadowDisc);

  // 7. Overhead Language Glyph Sprite
  const glyphTex = createLanguageGlyphTexture(primaryLang);
  const spriteMat = new THREE.SpriteMaterial({
    map: glyphTex,
    transparent: true,
    depthTest: false,
  });
  const glyphSprite = new THREE.Sprite(spriteMat);
  glyphSprite.scale.set(0.75, 0.75, 1);
  glyphSprite.position.set(0, 2.05, 0);
  group.add(glyphSprite);

  // 8. 3D Floating Speech Bubble Sprite for Conlang Dialogue
  const speechCanvasTex = createLanguageGlyphTexture(primaryLang); // placeholder
  const speechMat = new THREE.SpriteMaterial({
    map: speechCanvasTex,
    transparent: true,
    depthTest: false,
  });
  const speechSprite = new THREE.Sprite(speechMat);
  speechSprite.scale.set(2.4, 0.9, 1);
  speechSprite.position.set(0, 2.65, 0);
  speechSprite.visible = false;
  group.add(speechSprite);

  let speechTimerId: number | null = null;

  const showSpeechBubble = (conlangText: string, translationText: string, duration: number = 3200) => {
    import('./pixelTextures.ts').then(({ createSpeechBubbleTexture }) => {
      const tex = createSpeechBubbleTexture(conlangText, translationText, LANGUAGES[primaryLang]?.color || '#f59e0b');
      speechSprite.material.map = tex;
      speechSprite.material.needsUpdate = true;
      speechSprite.visible = true;

      if (speechTimerId) clearTimeout(speechTimerId);
      speechTimerId = window.setTimeout(() => {
        speechSprite.visible = false;
      }, duration);
    });
  };

  // Kinematic & Ragdoll Animation
  const updateAnimation = (
    time: number,
    isMoving: boolean,
    isThrowing: boolean,
    isHeld: boolean,
    isFalling: boolean = false
  ) => {
    if (isFalling) {
      // 3D Tumble / Flailing Physics
      leftArm.rotation.x = -Math.PI * 0.7 + Math.sin(time * 14) * 0.4;
      rightArm.rotation.x = -Math.PI * 0.7 - Math.sin(time * 14) * 0.4;
      leftArm.rotation.z = 0.5;
      rightArm.rotation.z = -0.5;
      leftLeg.rotation.x = 0.4;
      rightLeg.rotation.x = -0.4;
      robeSkirt.rotation.x = -0.3; // robe skirt flares in wind
      ribbon.rotation.x = -0.6;
      return;
    }

    if (isThrowing) {
      group.rotation.x = Math.sin(time * 12) * 0.4;
      leftArm.rotation.x = -Math.PI * 0.75;
      rightArm.rotation.x = -Math.PI * 0.75;
      leftLeg.rotation.x = 0.5;
      rightLeg.rotation.x = -0.5;
      torso.position.y = 0.70 + Math.sin(time * 8) * 0.1;
      robeSkirt.rotation.x = -0.25;
      return;
    }

    if (isHeld) {
      leftArm.rotation.x = -Math.PI * 0.4;
      rightArm.rotation.x = -Math.PI * 0.4;
      leftArm.rotation.z = 0.3;
      rightArm.rotation.z = -0.3;
      return;
    }

    if (isMoving) {
      const walkSpeed = 10;
      const legAngle = Math.sin(time * walkSpeed) * 0.65;
      leftLeg.rotation.x = legAngle;
      rightLeg.rotation.x = -legAngle;

      leftArm.rotation.x = -legAngle * 0.75;
      rightArm.rotation.x = legAngle * 0.75;

      torso.position.y = 0.70 + Math.abs(Math.sin(time * walkSpeed * 2)) * 0.05;
      head.position.y = 1.25 + Math.abs(Math.sin(time * walkSpeed * 2)) * 0.05;
      head.rotation.y = Math.sin(time * 4) * 0.08;

      // Robe skirt & sash dynamic swish
      robeSkirt.rotation.x = Math.sin(time * walkSpeed) * 0.12;
      robeSkirt.rotation.z = Math.sin(time * walkSpeed * 0.5) * 0.05;
      ribbon.rotation.x = Math.sin(time * walkSpeed) * 0.25 - 0.15;
    } else {
      const breathe = Math.sin(time * 3) * 0.02;
      torso.position.y = 0.70 + breathe;
      head.position.y = 1.25 + breathe;
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      leftArm.rotation.x = Math.sin(time * 2) * 0.08;
      rightArm.rotation.x = -Math.sin(time * 2) * 0.08;
      robeSkirt.rotation.x = 0;
      ribbon.rotation.x = 0;
    }
  };

  const updateLanguageGlyph = (m: SquadMember) => {
    const curLang = m.languages[0] || 'sumerian';
    const newTex = createLanguageGlyphTexture(curLang);
    glyphSprite.material.map = newTex;
    glyphSprite.material.needsUpdate = true;
  };

  const setSquash = (factor: number) => {
    const clamped = THREE.MathUtils.clamp(factor, 0.35, 1.25);
    const lateral = 1.0 / Math.sqrt(clamped);
    group.scale.set(lateral * 1.4, clamped * 1.4, lateral * 1.4);
  };

  return {
    group,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    robeSkirt,
    head,
    glyphSprite,
    speechSprite,
    shadowDisc,
    updateAnimation,
    updateLanguageGlyph,
    showSpeechBubble,
    setSquash,
  };
}

/**
 * Builds distinct AI NPC voxel models (Lost Mason, Hermit, Stranded Scholar, Anomaly).
 */
export function buildNPCModel(npc: import('./types.ts').TowerNPC): NPCMeshBundle {
  const group = new THREE.Group();
  group.name = `npc_${npc.id}`;
  group.scale.set(1.4, 1.4, 1.4);

  const stoneTex = createBabelStoneTexture();
  const primaryLang = npc.languages[0] || 'sumerian';
  const langColor = LANGUAGES[primaryLang]?.color || '#f59e0b';

  let bodyColor = 0xb45309; // terracotta
  let skinColor = 0xf5b584;
  let hairColor = 0x18181b;

  if (npc.type === 'stranded_scholar') {
    bodyColor = CULTURAL_GARB[primaryLang]?.robe || 0x0f766e;
    skinColor = CULTURAL_GARB[primaryLang]?.skin || 0xf5b584;
    hairColor = CULTURAL_GARB[primaryLang]?.hair || 0x171717;
  } else if (npc.type === 'hermit') {
    bodyColor = 0x57534e; // stone grey monk cowl
  }

  const robeMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 });
  const fleshMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
  const toolMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });

  // Body
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.54, 0.40), robeMat);
  torso.position.y = 0.70;
  torso.castShadow = true;
  group.add(torso);

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.44, 0.42), robeMat);
  skirt.position.y = 0.28;
  group.add(skirt);

  // Head
  const head = new THREE.Group();
  head.position.y = 1.22;
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.44), fleshMat);
  head.add(headMesh);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.24, 0.48), hairMat);
  hair.position.set(0, 0.16, -0.02);
  head.add(hair);

  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
  [-0.11, 0.11].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), eyeMat);
    eye.position.set(ex, 0.02, 0.23);
    head.add(eye);
  });

  group.add(head);

  // Props
  if (npc.type === 'lost_mason') {
    // Mason Stone Hammer
    const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.18), new THREE.MeshStandardMaterial({ map: stoneTex }));
    hammer.position.set(0.44, 0.65, 0.18);
    group.add(hammer);
  } else if (npc.type === 'stranded_scholar') {
    // Ancient Parchment / Bamboo Slip
    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 6), new THREE.MeshStandardMaterial({ color: 0xfef08a }));
    scroll.rotation.z = Math.PI / 3;
    scroll.position.set(0.38, 0.68, 0.22);
    group.add(scroll);
  }

  // Overhead Language Glyph
  const glyphTex = createLanguageGlyphTexture(primaryLang);
  const glyphSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glyphTex, transparent: true, depthTest: false }));
  glyphSprite.scale.set(0.75, 0.75, 1);
  glyphSprite.position.set(0, 2.05, 0);
  group.add(glyphSprite);

  // 3D Floating Speech Bubble Sprite
  const speechSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glyphTex, transparent: true, depthTest: false }));
  speechSprite.scale.set(2.4, 0.9, 1);
  speechSprite.position.set(0, 2.65, 0);
  speechSprite.visible = false;
  group.add(speechSprite);

  let speechTimerId: number | null = null;
  const showSpeechBubble = (conlangText: string, translationText: string, duration: number = 4000) => {
    import('./pixelTextures.ts').then(({ createSpeechBubbleTexture }) => {
      const tex = createSpeechBubbleTexture(conlangText, translationText, langColor);
      speechSprite.material.map = tex;
      speechSprite.material.needsUpdate = true;
      speechSprite.visible = true;

      if (speechTimerId) clearTimeout(speechTimerId);
      speechTimerId = window.setTimeout(() => {
        speechSprite.visible = false;
      }, duration);
    });
  };

  const updateAnimation = (time: number) => {
    // Ambient breathing & idling
    head.rotation.y = Math.sin(time * 1.5) * 0.12;
    torso.position.y = 0.70 + Math.sin(time * 2) * 0.02;
    if (npc.type === 'stranded_scholar' && !npc.isRescued) {
      // Waving arm in distress
      head.position.y = 1.20 + Math.sin(time * 3) * 0.04;
    }
  };

  const setSquash = (factor: number) => {
    const clamped = THREE.MathUtils.clamp(factor, 0.35, 1.25);
    const lateral = 1.0 / Math.sqrt(clamped);
    group.scale.set(lateral * 1.4, clamped * 1.4, lateral * 1.4);
  };

  return {
    group,
    speechSprite,
    updateAnimation,
    showSpeechBubble,
    setSquash,
  };
}

/**
 * Accurately samples the multi-tiered floor elevation y at any (x, z) coordinates
 * across the 3 distinct architectural zones of Babel.
 * Returns null if the point is over an abyss chasm, lightwell, or falls off the edge.
 */
export function samplePlatformElevation(x: number, z: number, floorIndex: number = 1): number | null {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x); // in [-Math.PI, Math.PI]

  // ZONE 1: Floors 1 ~ 3: 底层 完整的圆形大理石厅 (Complete circular marble hall)
  if (floorIndex <= 3) {
    if (r > 15.2) return null; // Stepped off the outer hall into the desert!

    // Outer ascending monumental marble staircase to next floor (r in [11.0, 14.8], theta in [-0.2, 2.4])
    if (r >= 11.0 && r <= 14.8 && theta >= -0.2 && theta <= 2.4) {
      const t = (theta - (-0.2)) / 2.6;
      return t * 4.5; // Ascends smoothly from y = 0.0 to 4.5m
    }

    // Sacred center marble dais (no hole! complete circular hall)
    if (r <= 4.2) {
      return 0.40;
    }

    // Solid circular marble hall floor
    return 0.0;
  }

  // ZONE 2: Floors 4 ~ 14: 中层 圆环大理石回廊 (Annular circular marble gallery)
  if (floorIndex <= 14) {
    if (r > 15.2) return null; // Fallen off outer gallery precipice!

    // Central colossal lightwell abyss (r < 5.6)
    if (r < 5.6) {
      // Cross stone arch bridge spanning across the central lightwell
      if (Math.abs(z) <= 1.35 && Math.abs(x) <= 5.8) {
        return 0.35; // Paved stone bridge deck
      }
      return null; // Plummeting down through the open central lightwell abyss!
    }

    // Outer ascending gallery ramp (r in [10.5, 14.8], theta in [0.2, 2.6])
    if (r >= 10.5 && r <= 14.8 && theta >= 0.2 && theta <= 2.6) {
      const t = (theta - 0.2) / 2.4;
      return t * 4.5; // Ascends smoothly from y = 0.0 to 4.5m
    }

    // Annular circular gallery floor
    return 0.0;
  }

  // ZONE 3: Floors 15 ~ 20: 顶层 建筑中半成品 (Active unfinished Bruegel construction summit)
  // Scaffolding outrigger on South/West sector
  if (theta >= 1.2 && theta <= 2.4 && r >= 13.8 && r <= 16.8) {
    return 0.18; // Cantilevered wooden scaffolding planks
  }
  if (r > 14.8) return null; // Fallen off unfinished summit edge!

  // Central hoist shaft for winching cyclopean stones
  if (r < 4.2) return null;

  // Unfinished construction missing floor gaps (踩空掉下去失联)
  // Gap A: exposed joists where bricks are not yet laid
  if (theta >= -1.2 && theta <= -0.4 && r >= 5.2 && r <= 9.8) {
    return null;
  }
  // Gap B: hazardous void between scaffolding and masonry
  if (theta >= 2.5 && theta <= 3.0 && r >= 6.0 && r <= 11.0) {
    return null;
  }

  // Ascending spiraling timber ramp to summit / Hand of God
  if (r >= 9.5 && r <= 14.2 && theta >= -0.2 && theta <= 2.2) {
    const t = (theta - (-0.2)) / 2.4;
    return t * 4.5;
  }

  // Exposed brickwork & masonry slab
  return 0.0;
}

/**
 * ZONE 1 (Floors 1~3): 底层 完整的圆形大理石厅
 * Solid circular floor (no central hole), inlaid marble star mosaic, concentric rings,
 * sacred center dais, classical Doric peristyle colonnade, and ascending grand marble stairs.
 */
export function buildCircularMarbleHall(floorIndex: number): THREE.Group {
  const group = new THREE.Group();
  group.name = `zone1_marble_hall_${floorIndex}`;

  const marbleFloorTex = createMarbleFloorTexture();
  marbleFloorTex.repeat.set(2, 2);

  const marbleTileTex = createMarbleTileTexture();
  marbleTileTex.repeat.set(8, 8);

  const marbleMat = new THREE.MeshStandardMaterial({
    map: marbleFloorTex,
    roughness: 0.35,
    metalness: 0.1,
  });

  const whiteMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.3,
    metalness: 0.15,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.8,
    roughness: 0.25,
  });

  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    metalness: 0.75,
    roughness: 0.4,
  });

  // 1. Complete Solid Circular Marble Floor (No hole in center!)
  const baseGeo = new THREE.CylinderGeometry(15.2, 15.5, 1.4, 48);
  const baseMesh = new THREE.Mesh(baseGeo, marbleMat);
  baseMesh.position.y = -0.7;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Concentric decorative marble border rim
  const rimGeo = new THREE.TorusGeometry(15.1, 0.22, 8, 48);
  const rimMesh = new THREE.Mesh(rimGeo, goldTrimMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = 0.05;
  group.add(rimMesh);

  // 2. Sacred Center Marble Dais (r = 4.2m, y = 0.40m)
  const daisGeo = new THREE.CylinderGeometry(4.2, 4.4, 0.40, 36);
  const daisMesh = new THREE.Mesh(daisGeo, whiteMarbleMat);
  daisMesh.position.y = 0.20;
  daisMesh.receiveShadow = true;
  group.add(daisMesh);

  // Center Star Inlay Disk
  const starGeo = new THREE.CircleGeometry(3.6, 24);
  starGeo.rotateX(-Math.PI / 2);
  const starMesh = new THREE.Mesh(starGeo, marbleMat);
  starMesh.position.y = 0.41;
  group.add(starMesh);

  // 4 Classical Bronze Braziers on Dais perimeter
  for (let b = 0; b < 4; b++) {
    const bAngle = (Math.PI / 2) * b + Math.PI / 4;
    const bx = Math.cos(bAngle) * 3.4;
    const bz = Math.sin(bAngle) * 3.4;

    const brazierGeo = new THREE.CylinderGeometry(0.35, 0.2, 0.75, 8);
    const brazier = new THREE.Mesh(brazierGeo, bronzeMat);
    brazier.position.set(bx, 0.78, bz);
    group.add(brazier);

    // Glowing flame
    const flameGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(bx, 1.25, bz);
    group.add(flame);

    const bLight = new THREE.PointLight(0xf59e0b, 1.6, 9);
    bLight.position.set(bx, 1.4, bz);
    group.add(bLight);
  }

  // 3. Fluted Peristyle Doric Marble Colonnade (16 columns at r = 13.0m)
  const colCount = 16;
  const colGeo = new THREE.CylinderGeometry(0.38, 0.44, 4.5, 12);
  const capGeo = new THREE.BoxGeometry(1.0, 0.35, 1.0);

  for (let c = 0; c < colCount; c++) {
    const angle = (Math.PI * 2 / colCount) * c;
    // Leave opening for staircase ascent
    if (angle > 0.8 && angle < 2.0) continue;

    const cx = Math.cos(angle) * 13.0;
    const cz = Math.sin(angle) * 13.0;

    const col = new THREE.Mesh(colGeo, whiteMarbleMat);
    col.position.set(cx, 2.25, cz);
    col.castShadow = true;
    group.add(col);

    const cap = new THREE.Mesh(capGeo, whiteMarbleMat);
    cap.position.set(cx, 4.65, cz);
    group.add(cap);
  }

  // 4. Ascending Grand Marble Staircase along outer arc (theta: -0.2 to 2.4, r: 12.8m)
  const stepCount = 18;
  for (let s = 0; s < stepCount; s++) {
    const t = s / (stepCount - 1);
    const sAngle = -0.2 + t * 2.6;
    const sRad = 12.8;
    const sY = t * 4.5;

    const stepGeo = new THREE.BoxGeometry(3.6, 0.28, 1.2);
    const stepMesh = new THREE.Mesh(stepGeo, whiteMarbleMat);
    stepMesh.position.set(Math.cos(sAngle) * sRad, sY + 0.14, Math.sin(sAngle) * sRad);
    stepMesh.rotation.y = -sAngle;
    stepMesh.receiveShadow = true;
    group.add(stepMesh);

    // Marble balusters along outer stair edge
    if (s % 3 === 0) {
      const balGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.85, 6);
      const balMesh = new THREE.Mesh(balGeo, whiteMarbleMat);
      balMesh.position.set(Math.cos(sAngle) * (sRad + 1.6), sY + 0.65, Math.sin(sAngle) * (sRad + 1.6));
      group.add(balMesh);
    }
  }

  // Gateway Portal Arch at Stair Summit (y = 4.5m)
  const endAngle = 2.4;
  const exitX = Math.cos(endAngle) * 12.8;
  const exitZ = Math.sin(endAngle) * 12.8;

  const archGeo = new THREE.TorusGeometry(1.5, 0.22, 8, 16, Math.PI);
  const archMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.6 });
  const archMesh = new THREE.Mesh(archGeo, archMat);
  archMesh.position.set(exitX, 4.5 + 1.5, exitZ);
  archMesh.rotation.y = -endAngle + Math.PI / 2;
  group.add(archMesh);

  const exitLight = new THREE.PointLight(0x38bdf8, 2.5, 10);
  exitLight.position.set(exitX, 4.5 + 1.8, exitZ);
  group.add(exitLight);

  return group;
}

/**
 * ZONE 2 (Floors 4~14): 中层 圆环大理石回廊
 * Annular circular gallery corridor (r in [5.6, 15.0]), central colossal open lightwell abyss,
 * cross-stone arch bridge spanning across the void, inner/outer balustrades, and ascending spiral gallery.
 */
export function buildAnnularMarbleGallery(floorIndex: number): THREE.Group {
  const group = new THREE.Group();
  group.name = `zone2_annular_gallery_${floorIndex}`;

  const tileTex = createMarbleTileTexture();
  tileTex.repeat.set(12, 4);

  const galleryMat = new THREE.MeshStandardMaterial({
    map: tileTex,
    roughness: 0.4,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const stoneMat = new THREE.MeshStandardMaterial({
    map: createBabelStoneTexture(),
    roughness: 0.85,
  });

  const balustradeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.4,
  });

  // 1. Annular Ring Walkway (r: 5.6 to 15.0m)
  const ringGeo = new THREE.RingGeometry(5.6, 15.0, 48, 2);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMesh = new THREE.Mesh(ringGeo, galleryMat);
  ringMesh.position.y = 0.0;
  ringMesh.receiveShadow = true;
  group.add(ringMesh);

  // Outer slab under ring
  const underRingGeo = new THREE.CylinderGeometry(15.0, 15.3, 1.2, 48, 1, true);
  const underRing = new THREE.Mesh(underRingGeo, stoneMat);
  underRing.position.y = -0.6;
  group.add(underRing);

  // Inner lightwell abyss shaft wall descending into the depths
  const lightwellWallGeo = new THREE.CylinderGeometry(5.6, 5.6, 4.8, 36, 1, true);
  const lightwellWall = new THREE.Mesh(lightwellWallGeo, stoneMat);
  lightwellWall.position.y = -2.4;
  group.add(lightwellWall);

  // 2. Inner Carved Balustrade along r = 5.6m (with gap for bridge entrance)
  const innerBalCount = 28;
  for (let b = 0; b < innerBalCount; b++) {
    const angle = (Math.PI * 2 / innerBalCount) * b;
    // Leave gap at X-axis bridge crossings (angle near 0 and PI)
    if (Math.abs(Math.sin(angle)) < 0.28) continue;

    const bx = Math.cos(angle) * 5.7;
    const bz = Math.sin(angle) * 5.7;

    const balPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6), balustradeMat);
    balPost.position.set(bx, 0.45, bz);
    group.add(balPost);
  }

  // 3. Cross Stone Arch Bridge across central lightwell (|z| <= 1.35, x in [-5.8, 5.8], y = 0.35)
  const bridgeDeckGeo = new THREE.BoxGeometry(11.6, 0.35, 2.7);
  const bridgeDeck = new THREE.Mesh(bridgeDeckGeo, stoneMat);
  bridgeDeck.position.set(0, 0.35 / 2, 0);
  bridgeDeck.receiveShadow = true;
  group.add(bridgeDeck);

  // Massive under-arch support corbels
  const archTorusGeo = new THREE.TorusGeometry(3.6, 0.4, 6, 16, Math.PI);
  const underArch = new THREE.Mesh(archTorusGeo, stoneMat);
  underArch.position.set(0, -0.6, 0);
  group.add(underArch);

  // Bridge parapets / railings with gaps for peril
  [-1.25, 1.25].forEach(pz => {
    const railGeo = new THREE.BoxGeometry(11.4, 0.65, 0.15);
    const rail = new THREE.Mesh(railGeo, balustradeMat);
    rail.position.set(0, 0.55, pz);
    group.add(rail);
  });

  // Floating collectible relic at midpoint of cross bridge
  const relicGeo = new THREE.OctahedronGeometry(0.5);
  const relicMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.9,
    metalness: 0.9,
  });
  const relicMesh = new THREE.Mesh(relicGeo, relicMat);
  relicMesh.position.set(0, 1.4, 0);
  relicMesh.name = 'floating_relic';
  group.add(relicMesh);

  // 4. Double Colonnade: Outer Doric columns at r = 14.2m
  for (let c = 0; c < 16; c++) {
    const angle = (Math.PI * 2 / 16) * c;
    if (angle > 0.4 && angle < 2.4) continue; // Stair ascent clearance

    const cx = Math.cos(angle) * 14.2;
    const cz = Math.sin(angle) * 14.2;

    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 4.2, 10), stoneMat);
    col.position.set(cx, 2.1, cz);
    col.castShadow = true;
    group.add(col);
  }

  // 5. Continuous Ascending Gallery Ramp (r: 12.6m, theta: 0.2 to 2.6, climbs y = 0 to 4.5m)
  const rampSegments = 16;
  for (let rs = 0; rs < rampSegments; rs++) {
    const t = rs / (rampSegments - 1);
    const rAngle = 0.2 + t * 2.4;
    const rY = t * 4.5;
    const rRad = 12.6;

    const rMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 1.3), galleryMat);
    rMesh.position.set(Math.cos(rAngle) * rRad, rY + 0.15, Math.sin(rAngle) * rRad);
    rMesh.rotation.y = -rAngle;
    rMesh.receiveShadow = true;
    group.add(rMesh);
  }

  // Portal Arch at Ramp Summit
  const summitAngle = 2.6;
  const pX = Math.cos(summitAngle) * 12.6;
  const pZ = Math.sin(summitAngle) * 12.6;

  const portalArch = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.2, 8, 16, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.7 })
  );
  portalArch.position.set(pX, 4.5 + 1.4, pZ);
  portalArch.rotation.y = -summitAngle + Math.PI / 2;
  group.add(portalArch);

  return group;
}

/**
 * ZONE 3 (Floors 15~20): 顶层 建筑中半成品
 * Pieter Bruegel the Elder inspired active summit construction site:
 * Exposed terracotta brickwork, cyclopean masonry, giant timber treadwheel crane,
 * cantilevered scaffolding outriggers, hazardous missing floor gaps, and spiraling ramps to the Hand of God.
 */
export function buildUnfinishedConstructionSummit(floorIndex: number): THREE.Group {
  const group = new THREE.Group();
  group.name = `zone3_construction_summit_${floorIndex}`;

  const brickTex = createUnfinishedBrickTexture();
  brickTex.repeat.set(6, 6);

  const woodTex = createScaffoldWoodTexture();
  woodTex.repeat.set(4, 1);

  const brickMat = new THREE.MeshStandardMaterial({
    map: brickTex,
    roughness: 0.9,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const scaffoldWoodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.85,
    color: 0x854d0e,
    side: THREE.DoubleSide,
  });

  const heavyStoneMat = new THREE.MeshStandardMaterial({
    map: createBabelStoneTexture(),
    roughness: 0.9,
  });

  // 1. Unfinished Main Ring Floor with missing sections
  const floorGeo = new THREE.RingGeometry(4.2, 14.5, 36, 2);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMesh = new THREE.Mesh(floorGeo, brickMat);
  floorMesh.position.y = 0.0;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Under-joists supporting unfinished brick ring
  for (let j = 0; j < 12; j++) {
    const jAngle = (Math.PI * 2 / 12) * j;
    const joist = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 10.5), scaffoldWoodMat);
    joist.position.set(Math.cos(jAngle) * 9.3, -0.3, Math.sin(jAngle) * 9.3);
    joist.rotation.y = -jAngle;
    group.add(joist);
  }

  // 2. Cantilevered Scaffolding Outriggers (South/West: theta 1.2 to 2.4, r out to 16.8m)
  const scafPlankGeo = new THREE.BoxGeometry(4.8, 0.18, 2.2);
  [-0.3, 0.3].forEach(offset => {
    const scaf = new THREE.Mesh(scafPlankGeo, scaffoldWoodMat);
    scaf.position.set(-6.5 + offset * 3.5, 0.18, 12.8);
    scaf.rotation.y = 0.3;
    group.add(scaf);
  });

  // Scaffolding support timbers jutting out from masonry
  [-7.8, -5.2, -2.6].forEach(sx => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 5.2), scaffoldWoodMat);
    beam.position.set(sx, -0.4, 13.0);
    beam.rotation.x = 0.2;
    group.add(beam);
  });

  // 3. Giant Bruegel Timber Treadwheel Crane (踏轮起重机) at (x: 2.5, z: -6.5)
  const craneGroup = new THREE.Group();
  craneGroup.position.set(2.5, 0, -6.5);

  // Heavy A-Frame Mast
  [-1.2, 1.2].forEach(ax => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 6.2, 0.35), scaffoldWoodMat);
    leg.position.set(ax, 3.0, 0);
    leg.rotation.z = ax > 0 ? -0.18 : 0.18;
    craneGroup.add(leg);
  });

  // Crane Boom extending out over the abyss
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 7.5), scaffoldWoodMat);
  boom.position.set(0, 5.8, -2.2);
  boom.rotation.x = 0.35;
  craneGroup.add(boom);

  // Giant Cylindrical Treadwheel (radius 1.8m)
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.25, 8, 20), scaffoldWoodMat);
  wheelRim.position.set(0, 2.4, 0);
  wheelRim.rotation.y = Math.PI / 2;
  craneGroup.add(wheelRim);

  // Treadwheel Inner Spokes
  for (let sp = 0; sp < 6; sp++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.4, 0.12), scaffoldWoodMat);
    spoke.position.set(0, 2.4, 0);
    spoke.rotation.x = (Math.PI / 6) * sp;
    craneGroup.add(spoke);
  }

  // Hoisted Cyclopean Stone Block suspended on rope over void
  const hoistedBlock = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.4), heavyStoneMat);
  hoistedBlock.position.set(0, 2.8, -4.5);
  hoistedBlock.castShadow = true;
  craneGroup.add(hoistedBlock);

  const winchRope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 3.6),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 })
  );
  winchRope.position.set(0, 4.6, -4.5);
  craneGroup.add(winchRope);

  group.add(craneGroup);

  // 4. Missing Floor Gaps: Hazardous vertical abyss openings
  // Visual jagged broken masonry rubble along gap edges
  const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 });
  [-1.0, 2.8].forEach(gapAngle => {
    for (let r = 0; r < 4; r++) {
      const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35), rubbleMat);
      rubble.position.set(
        Math.cos(gapAngle) * (7.0 + r * 0.8),
        0.18,
        Math.sin(gapAngle) * (7.0 + r * 0.8)
      );
      group.add(rubble);
    }
  });

  // 5. Spiraling Timber Construction Ramp to Summit (r: 11.8m, theta: -0.2 to 2.2, y: 0 to 4.5m)
  const rampSteps = 16;
  for (let st = 0; st < rampSteps; st++) {
    const t = st / (rampSteps - 1);
    const angle = -0.2 + t * 2.4;
    const yVal = t * 4.5;
    const rad = 11.8;

    const plank = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 1.4), scaffoldWoodMat);
    plank.position.set(Math.cos(angle) * rad, yVal + 0.11, Math.sin(angle) * rad);
    plank.rotation.y = -angle;
    plank.receiveShadow = true;
    group.add(plank);

    // Rustic wooden posts
    if (st % 2 === 0) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), scaffoldWoodMat);
      post.position.set(Math.cos(angle) * (rad + 1.4), yVal + 0.6, Math.sin(angle) * (rad + 1.4));
      group.add(post);
    }
  }

  // Portal Arch to Summit Hand of God
  const summitA = 2.2;
  const summitX = Math.cos(summitA) * 11.8;
  const summitZ = Math.sin(summitA) * 11.8;

  const portalArch = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.25, 8, 16, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.9 })
  );
  portalArch.position.set(summitX, 4.5 + 1.5, summitZ);
  portalArch.rotation.y = -summitA + Math.PI / 2;
  group.add(portalArch);

  return group;
}

/**
 * Procedural Babel Tower Ring Platform with 3 distinct architectural zones:
 * - Zone 1 (Floors 1~3): Complete circular marble hall (no center hole)
 * - Zone 2 (Floors 4~14): Annular circular marble gallery with central lightwell abyss & cross bridge
 * - Zone 3 (Floors 15~20): Unfinished Bruegel construction summit with cranes, gaps, and scaffolding.
 */
export function buildTowerFloorPlatform(floorIndex: number, _width: number = 28, _length: number = 6.2): THREE.Group {
  if (floorIndex <= 3) {
    return buildCircularMarbleHall(floorIndex);
  }
  if (floorIndex <= 14) {
    return buildAnnularMarbleGallery(floorIndex);
  }
  return buildUnfinishedConstructionSummit(floorIndex);
}

/**
 * Creates an interactive Cold Vault modern technology relic container.
 */
export function buildColdVaultRelic(): THREE.Group {
  const group = new THREE.Group();
  const techTex = createColdVaultTechTexture();

  const mat = new THREE.MeshStandardMaterial({
    map: techTex,
    metalness: 0.85,
    roughness: 0.3,
  });

  const boxGeo = new THREE.BoxGeometry(1.4, 1.2, 1.4);
  const box = new THREE.Mesh(boxGeo, mat);
  box.position.y = 0.6;
  box.castShadow = true;
  group.add(box);

  // Glowing antenna / indicator
  const antennaGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6);
  const antennaMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.5,
  });
  const antenna = new THREE.Mesh(antennaGeo, antennaMat);
  antenna.position.set(0.4, 1.4, 0.4);
  group.add(antenna);

  return group;
}

/**
 * Builds Michelangelo's Hand of God for Act 5 Summit sequence!
 */
export function buildHandOfGod(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'hand_of_god';

  const divineMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0xfef08a,
    emissiveIntensity: 0.4,
  });

  // 1. Forearm
  const armGeo = new THREE.CylinderGeometry(1.4, 1.8, 6.0, 16);
  const arm = new THREE.Mesh(armGeo, divineMat);
  arm.position.set(0, 5, 0);
  arm.rotation.z = Math.PI * 0.12;
  group.add(arm);

  // 2. Palm
  const palmGeo = new THREE.BoxGeometry(2.2, 2.6, 1.2);
  const palm = new THREE.Mesh(palmGeo, divineMat);
  palm.position.set(-0.6, 1.6, 0);
  group.add(palm);

  // 3. Reaching Index Finger
  const fingerMat = divineMat.clone();
  fingerMat.emissiveIntensity = 0.8;

  const indexGeo = new THREE.CylinderGeometry(0.24, 0.3, 2.2, 12);
  indexGeo.translate(0, -1.1, 0);
  const indexFinger = new THREE.Mesh(indexGeo, fingerMat);
  indexFinger.position.set(-1.4, 0.6, 0.3);
  indexFinger.rotation.z = Math.PI * 0.35;
  group.add(indexFinger);

  // Fingertip holy sparkle point
  const tipGeo = new THREE.SphereGeometry(0.3, 16, 16);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.position.set(-2.8, -0.6, 0.3);
  group.add(tip);

  // 4. Other curved fingers
  const thumbGeo = new THREE.CylinderGeometry(0.28, 0.34, 1.6, 8);
  thumbGeo.translate(0, -0.8, 0);
  const thumb = new THREE.Mesh(thumbGeo, divineMat);
  thumb.position.set(-0.2, 0.6, -0.5);
  thumb.rotation.x = -Math.PI * 0.3;
  thumb.rotation.z = Math.PI * 0.2;
  group.add(thumb);

  const midGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.9, 8);
  midGeo.translate(0, -0.95, 0);
  const middle = new THREE.Mesh(midGeo, divineMat);
  middle.position.set(-1.3, 0.4, 0);
  middle.rotation.z = Math.PI * 0.5;
  group.add(middle);

  // Divine point light
  const light = new THREE.PointLight(0xfffbeb, 4, 15);
  light.position.set(-2.8, -0.6, 0.3);
  group.add(light);

  return group;
}

/**
 * Builds the monumental spiraling lower tiers of the Tower of Babel beneath the active platform.
 * Includes Roman/Babylonian arched galleries, spiraling exterior ramps, wooden cranes,
 * front cutaway cross-section revealing interior barrel vaults, and working masons.
 */
export function buildBabelLowerTiers(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'babel_lower_tiers';

  const stoneTex = createBabelStoneTexture();
  stoneTex.repeat.set(6, 4);

  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const brickMat = new THREE.MeshStandardMaterial({
    color: 0x9a3412, // Rich terracotta Babylonian brick
    roughness: 0.9,
    side: THREE.DoubleSide,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.85,
  });

  const archRecessMat = new THREE.MeshBasicMaterial({
    color: 0x181512, // Deep shadow in arch alcoves
  });

  // 5 Stepped Monumental Tiers descending from y = -0.6 down to y = -48
  // Centered at (0, 0, -16.0) so the front and side terraces cascade beneath the player's vista
  const towerCenterX = 0;
  const towerCenterZ = -16.0;

  const tierConfigs = [
    { yTop: -0.6,  yBottom: -8.0,  rTop: 16.0, rBottom: 20.0, arches: 18 },
    { yTop: -8.0,  yBottom: -16.5, rTop: 20.0, rBottom: 25.0, arches: 22 },
    { yTop: -16.5, yBottom: -26.0, rTop: 25.0, rBottom: 31.0, arches: 26 },
    { yTop: -26.0, yBottom: -36.5, rTop: 31.0, rBottom: 38.0, arches: 30 },
    { yTop: -36.5, yBottom: -48.0, rTop: 38.0, rBottom: 46.0, arches: 36 },
  ];

  tierConfigs.forEach((tier, tIdx) => {
    const tierGroup = new THREE.Group();
    tierGroup.position.set(towerCenterX, 0, towerCenterZ);

    const h = tier.yTop - tier.yBottom;
    const centerY = (tier.yTop + tier.yBottom) / 2;

    // 1. Full Outer Stepped Conical Cylinder Shell (openEnded: true ensures hollow interior)
    const cylGeo = new THREE.CylinderGeometry(
      tier.rTop,
      tier.rBottom,
      h,
      48,
      1,
      true
    );
    const cyl = new THREE.Mesh(cylGeo, stoneMat);
    cyl.position.y = centerY;
    cyl.receiveShadow = true;
    cyl.castShadow = true;
    tierGroup.add(cyl);

    // Terraced Ring Walkway on top of outer wall (terracotta paved terrace step)
    const ringGeo = new THREE.RingGeometry(tier.rTop - 2.8, tier.rTop, 48, 1);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, brickMat);
    ringMesh.position.y = tier.yTop;
    tierGroup.add(ringMesh);

    // Crenellated Parapet Curb along the outer ring
    const parapetGeo = new THREE.TorusGeometry(tier.rTop - 0.2, 0.25, 6, 48);
    const parapet = new THREE.Mesh(parapetGeo, stoneMat);
    parapet.position.y = tier.yTop + 0.25;
    parapet.rotation.x = Math.PI / 2;
    tierGroup.add(parapet);

    // 2. Classical Roman / Babylonian Arched Colonnade around outer wall
    const archRadius = (tier.rTop + tier.rBottom) / 2 + 0.15;
    const archH = Math.min(3.8, h * 0.5);
    const archW = 1.8;

    for (let a = 0; a < tier.arches; a++) {
      const angle = (Math.PI * 2 / tier.arches) * (a + 0.5);
      // Recessed dark alcove
      const alcoveGeo = new THREE.BoxGeometry(archW, archH, 1.2);
      const alcove = new THREE.Mesh(alcoveGeo, archRecessMat);
      alcove.position.set(
        Math.sin(angle) * archRadius,
        centerY + (tIdx % 2 === 0 ? 0.3 : -0.3),
        Math.cos(angle) * archRadius
      );
      alcove.rotation.y = angle;
      tierGroup.add(alcove);

      // Arch top frame
      const frameGeo = new THREE.TorusGeometry(archW / 2, 0.18, 6, 12, Math.PI);
      const frame = new THREE.Mesh(frameGeo, brickMat);
      frame.position.set(
        Math.sin(angle) * (archRadius + 0.35),
        centerY + (tIdx % 2 === 0 ? 0.3 : -0.3) + archH / 2,
        Math.cos(angle) * (archRadius + 0.35)
      );
      frame.rotation.y = angle;
      tierGroup.add(frame);
    }

    // 3. Exterior Spiral Ramp with Wooden Handrail
    const rampSegments = 20;
    for (let s = 0; s < rampSegments; s++) {
      const frac = s / rampSegments;
      const rAngle = frac * Math.PI * 2;
      const rRad = THREE.MathUtils.lerp(tier.rTop, tier.rBottom, frac) + 1.4;
      const rY = THREE.MathUtils.lerp(tier.yTop, tier.yBottom, frac);

      // Ramp slab plank
      const plankGeo = new THREE.BoxGeometry(2.6, 0.22, 2.0);
      const plank = new THREE.Mesh(plankGeo, woodMat);
      plank.position.set(Math.sin(rAngle) * rRad, rY, Math.cos(rAngle) * rRad);
      plank.rotation.y = rAngle + Math.PI / 2;
      tierGroup.add(plank);

      // Outer safety fence post
      if (s % 2 === 0) {
        const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6);
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.set(Math.sin(rAngle) * (rRad + 1.1), rY + 0.6, Math.cos(rAngle) * (rRad + 1.1));
        tierGroup.add(post);
      }
    }

    // 4. Construction Cranes & Wooden Scaffolding on lower tiers
    if (tIdx === 0 || tIdx === 2 || tIdx === 4) {
      const craneAngles = [0.2, 1.2, 2.3, 3.8, 5.0];
      craneAngles.forEach((cAngle, cIdx) => {
        if (cIdx % 2 !== tIdx % 2) return;
        const craneRad = (tier.rTop + tier.rBottom) / 2 + 1.8;
        const craneY = tier.yTop + 0.4;

        const mastGeo = new THREE.BoxGeometry(0.35, 4.5, 0.35);
        const mast = new THREE.Mesh(mastGeo, woodMat);
        mast.position.set(Math.sin(cAngle) * craneRad, craneY + 2.25, Math.cos(cAngle) * craneRad);
        tierGroup.add(mast);

        // Crane Boom arm
        const boomGeo = new THREE.BoxGeometry(0.24, 0.24, 5.2);
        const boom = new THREE.Mesh(boomGeo, woodMat);
        boom.position.set(Math.sin(cAngle) * (craneRad + 1.4), craneY + 4.2, Math.cos(cAngle) * (craneRad + 1.4));
        boom.rotation.y = cAngle;
        boom.rotation.x = -0.32;
        tierGroup.add(boom);

        // Dangling block
        const craneBlock = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.8), stoneMat);
        craneBlock.position.set(Math.sin(cAngle) * (craneRad + 3.0), craneY + 1.5, Math.cos(cAngle) * (craneRad + 3.0));
        tierGroup.add(craneBlock);
      });
    }

    // 5. Interior Ribbed Barrel Vaults & Amber Torches
    [-Math.PI * 0.4, 0, Math.PI * 0.4].forEach(vAngle => {
      const vaultRadius = tier.rTop - 1.5;
      const innerArchGeo = new THREE.TorusGeometry(2.4, 0.3, 6, 12, Math.PI);
      const innerArchMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
      const innerArch = new THREE.Mesh(innerArchGeo, innerArchMat);
      innerArch.position.set(Math.sin(vAngle) * vaultRadius, centerY + 0.8, Math.cos(vAngle) * vaultRadius);
      innerArch.rotation.y = vAngle + Math.PI / 2;
      tierGroup.add(innerArch);

      // Warm amber torchlight illuminating tier galleries
      const innerTorchLight = new THREE.PointLight(0xf59e0b, 1.2, 18);
      innerTorchLight.position.set(Math.sin(vAngle) * (vaultRadius + 0.8), centerY + 1.0, Math.cos(vAngle) * (vaultRadius + 0.8));
      tierGroup.add(innerTorchLight);
    });

    // 6. Tiny Procedural Builders / Masons on the lower ramp
    [-0.3, 0.1, 0.4].forEach(offset => {
      const workerGroup = new THREE.Group();
      const wAngle = (Math.PI * 2 / tier.arches) * (3 + offset * 8);
      const wRad = (tier.rTop + tier.rBottom) / 2 + 0.7;
      const wY = centerY + 0.55;

      const bodyGeo = new THREE.BoxGeometry(0.35, 0.52, 0.25);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: offset > 0 ? 0x1d4ed8 : 0xb91c1c, // Blue or crimson tunic
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.35;
      workerGroup.add(body);

      const headGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xf5b584 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 0.72;
      workerGroup.add(head);

      workerGroup.position.set(Math.sin(wAngle) * wRad, wY, Math.cos(wAngle) * wRad);
      workerGroup.rotation.y = wAngle + Math.PI / 2;
      tierGroup.add(workerGroup);
    });

    group.add(tierGroup);
  });

  return group;
}

/**
 * Builds the breathtaking ancient Mesopotamian landscape and ground city of Babylon
 * visible directly below the precipice of the Tower of Babel:
 * - Winding turquoise Euphrates River with arched bridges, docks, and sailing boats
 * - The monumental turquoise-glazed Ishtar Gate and crenellated city walls
 * - The grand 6-tier Etemenanki step-ziggurat complex
 * - Sprawling mud-brick residential quarters, bazaars with colorful awnings
 * - Dense groves of instanced date palms along canals
 * - Mid-air drifting clouds floating between Babel and the earth.
 */
export function buildDistantMesopotamianWorld(): {
  group: THREE.Group;
  clouds: THREE.Group[];
} {
  const group = new THREE.Group();
  // Positioned directly in the downward sightline below the precipice of Babel
  group.position.set(0, -48, -48.0);

  // 1. Vast Ancient Earth Plain
  const earthGeo = new THREE.PlaneGeometry(420, 280);
  earthGeo.rotateX(-Math.PI / 2);
  const earthMat = new THREE.MeshStandardMaterial({
    color: 0x9b7853, // Warm alluvial clay & golden sand
    roughness: 0.95,
  });
  const earth = new THREE.Mesh(earthGeo, earthMat);
  group.add(earth);

  // 2. Euphrates River (Meandering turquoise water ribbon in front of Babel)
  const riverTex = createWaterTexture();
  riverTex.repeat.set(16, 2);

  const riverPoints: THREE.Vector3[] = [
    new THREE.Vector3(-180, 0.3, 32),
    new THREE.Vector3(-100, 0.3, 20),
    new THREE.Vector3(-30, 0.3, 16),
    new THREE.Vector3(40, 0.3, 22),
    new THREE.Vector3(110, 0.3, 18),
    new THREE.Vector3(180, 0.3, 28),
  ];
  const riverCurve = new THREE.CatmullRomCurve3(riverPoints);
  const riverGeo = new THREE.TubeGeometry(riverCurve, 48, 11, 4, false);
  const riverMat = new THREE.MeshStandardMaterial({
    map: riverTex,
    color: 0x0284c7, // River azure / aquamarine
    roughness: 0.25,
    metalness: 0.4,
  });
  const river = new THREE.Mesh(riverGeo, riverMat);
  river.scale.set(1, 0.04, 1);
  group.add(river);

  // River Stone Embankments & Quays
  const quayMat = new THREE.MeshStandardMaterial({ color: 0x785338, roughness: 0.85 });
  const quayGeo = new THREE.BoxGeometry(22, 0.8, 3.5);
  [-60, 20, 80].forEach(qx => {
    const quay = new THREE.Mesh(quayGeo, quayMat);
    quay.position.set(qx, 0.4, 23);
    group.add(quay);
  });

  // 2 Arched Stone Bridges spanning the Euphrates
  [-45, 55].forEach(bx => {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(bx, 0, 19);

    const bridgeRoad = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.6, 24),
      new THREE.MeshStandardMaterial({ color: 0xd6c4b2, roughness: 0.8 })
    );
    bridgeRoad.position.y = 1.4;
    bridgeGroup.add(bridgeRoad);

    // 2 Arches under bridge
    [-6, 6].forEach(az => {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(3.0, 0.6, 6, 12, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xa89985, roughness: 0.8 })
      );
      arch.position.set(0, 0.4, az);
      bridgeGroup.add(arch);
    });

    group.add(bridgeGroup);
  });

  // Moored Wooden River Cargo Barges with Canvas Sails
  const boatMat = new THREE.MeshStandardMaterial({ color: 0x5c3d22, roughness: 0.8 });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.7 });
  [
    { x: -50, z: 27, rot: 0.2 },
    { x: -30, z: 12, rot: -0.4 },
    { x: 35, z: 26, rot: 0.1 },
    { x: 90, z: 14, rot: -0.2 },
  ].forEach(b => {
    const boatGroup = new THREE.Group();
    boatGroup.position.set(b.x, 0.3, b.z);
    boatGroup.rotation.y = b.rot;

    // Boat Hull
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 6.0), boatMat);
    hull.position.y = 0.2;
    boatGroup.add(hull);

    // Mast & Sail
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6), boatMat);
    mast.position.set(0, 1.8, 0);
    boatGroup.add(mast);

    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 2.4), sailMat);
    sail.position.set(0, 2.2, 0);
    boatGroup.add(sail);

    group.add(boatGroup);
  });

  // 3. The Grand City of Babylon: The Ishtar Gate & Royal City Walls
  const ishtarTileTex = createIshtarTileTexture();
  ishtarTileTex.repeat.set(2, 2);

  const ishtarMat = new THREE.MeshStandardMaterial({
    map: ishtarTileTex,
    roughness: 0.4,
    metalness: 0.3,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.8,
    roughness: 0.2,
  });

  const cityWallMat = new THREE.MeshStandardMaterial({
    color: 0xa3704c, // Baked mud-brick wall
    roughness: 0.9,
  });

  // The Monumental Ishtar Gate (located at x: 18, z: 8)
  const ishtarGateGroup = new THREE.Group();
  ishtarGateGroup.position.set(18, 0, 8);

  // Twin Lapis Tower Bastions
  [-3.2, 3.2].forEach(tx => {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4.2, 7.5, 4.2), ishtarMat);
    tower.position.set(tx, 3.75, 0);
    tower.castShadow = true;
    ishtarGateGroup.add(tower);

    // Stepped crenellations on top of tower
    for (let c = 0; c < 4; c++) {
      const cren = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), ishtarMat);
      cren.position.set(tx - 1.5 + c * 1.0, 7.8, 1.8);
      ishtarGateGroup.add(cren);
    }

    // Gold trim band
    const trim = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, 4.4), goldTrimMat);
    trim.position.set(tx, 5.5, 0);
    ishtarGateGroup.add(trim);
  });

  // Central Archway Gateway
  const gateArchGeo = new THREE.TorusGeometry(2.0, 0.4, 8, 16, Math.PI);
  const gateArch = new THREE.Mesh(gateArchGeo, goldTrimMat);
  gateArch.position.set(0, 4.2, 0);
  ishtarGateGroup.add(gateArch);

  const gateWall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.8, 2.0), ishtarMat);
  gateWall.position.set(0, 6.2, 0);
  ishtarGateGroup.add(gateWall);

  group.add(ishtarGateGroup);

  // Massive City Wall of Babylon stretching left and right
  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(75, 4.2, 2.2), cityWallMat);
  wallLeft.position.set(-25, 2.1, 8);
  group.add(wallLeft);

  const wallRight = new THREE.Mesh(new THREE.BoxGeometry(85, 4.2, 2.2), cityWallMat);
  wallRight.position.set(65, 2.1, 8);
  group.add(wallRight);

  // Wall Watchtowers
  [-55, -20, 55, 95].forEach(wx => {
    const watchtower = new THREE.Mesh(new THREE.BoxGeometry(3.5, 5.6, 3.5), cityWallMat);
    watchtower.position.set(wx, 2.8, 8);
    group.add(watchtower);
  });

  // The Processional Way (Broad limestone paved boulevard leading through the gate)
  const procWayGeo = new THREE.PlaneGeometry(7.0, 48);
  procWayGeo.rotateX(-Math.PI / 2);
  const procWayMat = new THREE.MeshStandardMaterial({ color: 0xe2d9cb, roughness: 0.75 });
  const procWay = new THREE.Mesh(procWayGeo, procWayMat);
  procWay.position.set(18, 0.05, 12);
  group.add(procWay);

  // 4. The Grand Etemenanki Complex (The Great Ziggurat Sanctuary of Babylon)
  const zigguratGroup = new THREE.Group();
  zigguratGroup.position.set(-60, 0, -6);

  const zigTiers = [
    { size: 28, height: 4.5, color: 0x27272a }, // Tier 1: Black bitumen
    { size: 21, height: 4.0, color: 0x991b1b }, // Tier 2: Red baked brick
    { size: 16, height: 3.5, color: 0xd97706 }, // Tier 3: Ochre yellow
    { size: 12, height: 3.0, color: 0x059669 }, // Tier 4: Green malachite
    { size: 8, height: 2.5, color: 0x2563eb },  // Tier 5: Lapis blue
  ];

  let currentZigY = 0;
  zigTiers.forEach(zt => {
    const tierMesh = new THREE.Mesh(
      new THREE.BoxGeometry(zt.size, zt.height, zt.size),
      new THREE.MeshStandardMaterial({ color: zt.color, roughness: 0.85 })
    );
    tierMesh.position.y = currentZigY + zt.height / 2;
    zigguratGroup.add(tierMesh);
    currentZigY += zt.height;
  });

  // Summit Golden Sanctuary of Marduk
  const shrineMesh = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 3.2, 5.2),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.25 })
  );
  shrineMesh.position.y = currentZigY + 1.6;
  zigguratGroup.add(shrineMesh);

  // Golden Horns on summit
  [-2.2, 2.2].forEach(hx => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.4, 6), goldTrimMat);
    horn.position.set(hx, currentZigY + 3.8, 2.2);
    zigguratGroup.add(horn);
  });

  // Monumental Central Ramp Stairway climbing the ziggurat
  const rampStairs = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, currentZigY, 18),
    new THREE.MeshStandardMaterial({ color: 0xd4bba0, roughness: 0.8 })
  );
  rampStairs.position.set(0, currentZigY / 2, 14);
  rampStairs.rotation.x = 0.55;
  zigguratGroup.add(rampStairs);

  group.add(zigguratGroup);

  // 5. Sprawling Mud-brick Residential Quarters & Market Bazaars
  const houseMat = new THREE.MeshStandardMaterial({ color: 0xb58a63, roughness: 0.9 });
  const roofWoodMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.85 });

  // 45 Mud-brick flat-roof houses with internal courtyard layouts
  const houseCoords: Array<[number, number]> = [];
  for (let r = 0; r < 45; r++) {
    const hx = (r % 9) * 16 - 70 + (Math.random() - 0.5) * 6;
    const hz = Math.floor(r / 9) * 15 - 35 + (Math.random() - 0.5) * 6;
    // Don't overlap with ziggurat or gate
    if (Math.hypot(hx + 60, hz + 6) < 22) continue;
    if (Math.hypot(hx - 18, hz - 8) < 14) continue;
    houseCoords.push([hx, hz]);
  }

  houseCoords.forEach(([hx, hz]) => {
    const houseW = 3.6 + Math.random() * 2.2;
    const houseH = 2.4 + Math.random() * 1.6;
    const houseD = 3.6 + Math.random() * 2.2;

    const house = new THREE.Mesh(new THREE.BoxGeometry(houseW, houseH, houseD), houseMat);
    house.position.set(hx, houseH / 2, hz);
    group.add(house);

    // Roof Trellis / Awning on top of some houses
    if (Math.random() < 0.4) {
      const awning = new THREE.Mesh(new THREE.BoxGeometry(houseW * 0.7, 0.1, houseD * 0.7), roofWoodMat);
      awning.position.set(hx, houseH + 0.8, hz);
      group.add(awning);
    }
  });

  // Colorful Bazaars / Souks with striped canopies along market streets
  const canopyTexA = createCanopyStripeTexture('#dc2626', '#fef08a');
  const canopyTexB = createCanopyStripeTexture('#0284c7', '#ffffff');
  const canopyMatA = new THREE.MeshStandardMaterial({ map: canopyTexA, roughness: 0.6 });
  const canopyMatB = new THREE.MeshStandardMaterial({ map: canopyTexB, roughness: 0.6 });

  [-20, -10, 0, 10, 30, 42].forEach((sx, sIdx) => {
    const stall = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.8, 2.8),
      sIdx % 2 === 0 ? canopyMatA : canopyMatB
    );
    stall.position.set(sx, 1.4, -12 + (sIdx % 2) * 3);
    stall.rotation.x = -0.15;
    group.add(stall);
  });

  // 6. Instanced Date Palm Groves (80+ palms along river and canals)
  const palmCount = 85;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 4.5, 6);
  const frondGeo = new THREE.ConeGeometry(2.0, 1.2, 7);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });

  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, palmCount);
  const frondMesh = new THREE.InstancedMesh(frondGeo, frondMat, palmCount);

  const dummy = new THREE.Object3D();
  let palmIdx = 0;

  for (let p = 0; p < palmCount; p++) {
    const px = (Math.random() - 0.5) * 220;
    const pz = 12 + (Math.random() - 0.5) * 55;
    // Keep out of water
    if (Math.abs(pz - 22) < 5) continue;

    const scale = 0.8 + Math.random() * 0.45;
    dummy.position.set(px, 2.25 * scale, pz);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.set((Math.random() - 0.5) * 0.15, Math.random() * Math.PI, 0);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(palmIdx, dummy.matrix);

    dummy.position.set(px, 4.4 * scale, pz);
    dummy.updateMatrix();
    frondMesh.setMatrixAt(palmIdx, dummy.matrix);

    palmIdx++;
  }
  trunkMesh.count = palmIdx;
  frondMesh.count = palmIdx;
  trunkMesh.instanceMatrix.needsUpdate = true;
  frondMesh.instanceMatrix.needsUpdate = true;
  group.add(trunkMesh);
  group.add(frondMesh);

  // 7. Volumetric Mid-air Floating Clouds (半空中的浮云)
  const clouds: THREE.Group[] = [];
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.76,
    roughness: 0.95,
  });

  for (let c = 0; c < 14; c++) {
    const cloud = new THREE.Group();
    const cx = (Math.random() - 0.5) * 180;
    const cy = 24 + Math.random() * 15; // Local Y: in world space this is -26 to -11
    const cz = -10 + (Math.random() - 0.5) * 35;
    cloud.position.set(cx, cy, cz);

    for (let s = 0; s < 5; s++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(2.4 + Math.random() * 2, 8, 8), cloudMat);
      puff.position.set((s - 2) * 2.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.5);
      puff.scale.set(1.4, 0.7, 1.1);
      cloud.add(puff);
    }

    group.add(cloud);
    clouds.push(cloud);
  }

  return { group, clouds };
}

/**
 * Builds falling / tumbling masonry debris (坠毁中的建筑石块).
 */
export function buildTumblingDebris(): {
  group: THREE.Group;
  stones: Array<{ mesh: THREE.Mesh; rotSpeed: THREE.Vector3; fallSpeed: number }>;
} {
  const group = new THREE.Group();
  const stones: Array<{ mesh: THREE.Mesh; rotSpeed: THREE.Vector3; fallSpeed: number }> = [];

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x948270,
    roughness: 0.9,
  });

  for (let i = 0; i < 14; i++) {
    const s = 0.5 + Math.random() * 0.7;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.8, s * 1.2), stoneMat);
    mesh.position.set(
      (Math.random() - 0.5) * 36,
      Math.random() * 80,
      -2 + (Math.random() - 0.5) * 8
    );
    group.add(mesh);

    stones.push({
      mesh,
      rotSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
      fallSpeed: 4.5 + Math.random() * 5.5,
    });
  }

  return { group, stones };
}

