/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  SquadMember,
  LanguageId,
  CommandType,
  RelayResult,
  MiracleBuff,
  LiveLanguageLink,
  TowerNPC,
  LANGUAGES,
} from './types.ts';
import {
  createInitialSquad,
  computeRelaySpread,
  calculatePlatformBalance,
  computeLiveLanguageTopology,
  getDistance,
  getTowerNPCsForFloor,
  RECRUITABLE_SCHOLARS,
  generateConlangUtterance,
} from './languageChain.ts';
import {
  buildPixelCharacter,
  buildTowerFloorPlatform,
  buildBabelLowerTiers,
  buildColdVaultRelic,
  buildHandOfGod,
  buildDistantMesopotamianWorld,
  buildTumblingDebris,
  buildNPCModel,
  CharacterMeshBundle,
  NPCMeshBundle,
  samplePlatformElevation,
} from './proceduralModels.ts';
import { createLanguageGlyphTexture, createBabelStoneTexture } from './pixelTextures.ts';
import { sound } from './audio.ts';

export interface PhysicalBoulder {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  mass: number;
  rotSpeed: THREE.Vector3;
  active: boolean;
}

export interface GameEngineCallbacks {
  onFloorChange: (floor: number) => void;
  onActChange: (act: number) => void;
  onRelayResult: (res: RelayResult) => void;
  onSquadUpdate: (squad: SquadMember[]) => void;
  onTopologyUpdate?: (links: LiveLanguageLink[]) => void;
  onBalanceUpdate: (tilt: number, stabilityPercent: number, isBalanced: boolean) => void;
  onMiracleTrigger: () => void;
  onStoryTrigger: (actNumber: number) => void;
  onGameOver: (reason: string) => void;
  onVictory: () => void;
  onViewModeChange?: (mode: 'cutaway' | 'aerial' | 'close') => void;
}

export class BabelEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean = false;
  private isDestroyed: boolean = false;
  private frameId: number = 0;
  private callbacks: GameEngineCallbacks;

  // Game State & Squad Recruitment
  private squad: SquadMember[] = [];
  private charBundles: Map<string, CharacterMeshBundle> = new Map();
  private floorPlatforms: THREE.Group[] = [];
  private lowerTiersGroup: THREE.Group | null = null;
  private handOfGodGroup: THREE.Group | null = null;
  private activeBuffs: MiracleBuff[] = [];

  // Tower AI NPCs & Rescue System
  private currentNPCs: TowerNPC[] = [];
  private npcBundles: Map<string, NPCMeshBundle> = new Map();
  private npcGroup: THREE.Group = new THREE.Group();
  private lastNPCSpeechTime: Map<string, number> = new Map();
  private lastJumpTime: number = 0;

  // Level & Physics
  private currentFloor: number = 1;
  private maxFloor: number = 20;
  private collapseY: number = -6.0; // rising death zone
  private collapseSpeed: number = 0.28;
  private platformTilt: number = 0;
  private tiltTarget: number = 0;
  private currentAct: number = 1;

  // Camera & View Modes
  private viewMode: 'cutaway' | 'aerial' | 'close' = 'cutaway';

  // Controls
  private keysHeld: Record<string, boolean> = {};
  private mouseTarget: THREE.Vector3 | null = null;
  private isDragging: boolean = false;
  private raycaster = new THREE.Raycaster();
  private mouseCoords = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Link / FX Lines
  private linkLinesMesh!: THREE.LineSegments;
  private linkPositions: Float32Array = new Float32Array(120 * 3);
  private collapseGlowPlane!: THREE.Mesh;
  private shockwaveMeshes: THREE.Mesh[] = [];

  // Falling Boulder Physics Collision
  private physicalBoulders: PhysicalBoulder[] = [];
  private boulderGroup: THREE.Group = new THREE.Group();

  // In-World Visualized Point-to-Point Language Chain
  private inWorldChainGroup: THREE.Group = new THREE.Group();
  private chainRibbonLines: THREE.Line[] = [];
  private chainRuneSprites: THREE.Sprite[] = [];

  // Distant world & tumbling debris
  private clouds: THREE.Group[] = [];
  private stones: Array<{ mesh: THREE.Mesh; rotSpeed: THREE.Vector3; fallSpeed: number }> = [];
  private distantWorldGroup: THREE.Group | null = null;
  private debrisGroup: THREE.Group | null = null;
  private topologyCooldown: number = 0;
  private collectedRelicFloors: Set<number> = new Set();

  // Simulation Timing
  private lastTime: number = 0;
  private storyTriggeredActs: Set<number> = new Set();
  private lastRelayCooldown: number = 0;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.detectSoftwareGl();
    this.initThree();
    this.initScene();
    this.initSquad();
    this.initControls();
    this.generateTowerFloors();

    sound.startAmbientBgm();

    this.lastTime = performance.now();
    this.startLoop();
  }

  private detectSoftwareGl() {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) {
        this.isSoftwareGl = true;
        return;
      }
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      this.isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      this.isSoftwareGl = true;
    }
  }

  private initThree() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    // Bruegel Babel atmosphere: warm terracotta sunset clouds blending to deep cerulean
    this.scene.background = new THREE.Color(0xdbeafe);
    this.scene.fog = new THREE.Fog(0xdbeafe, 120, 450);

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 450);
    // Classical Bruegel architectural cutaway side perspective looking down over the precipice
    this.camera.position.set(0, 6.8, 15.5);
    this.camera.lookAt(0, 0.8, -1.0);

    // Studio / Environment lighting
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Key Light (Warm golden afternoon sun)
    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    keyLight.position.set(16, 26, 14);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.left = -25;
    keyLight.shadow.camera.right = 25;
    keyLight.shadow.camera.top = 25;
    keyLight.shadow.camera.bottom = -25;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Fill Light (Cool sky blue)
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0xd97706, 1.2);
    hemiLight.position.set(0, 30, 0);
    this.scene.add(hemiLight);

    // Ambient
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.6);
    this.scene.add(ambientLight);
  }

  private initScene() {
    // 1. Distant Mesopotamian Landscape & Floating Mid-air Clouds (at ground level y = -48)
    const world = buildDistantMesopotamianWorld();
    this.distantWorldGroup = world.group;
    this.clouds = world.clouds;
    this.scene.add(world.group);

    // 2. Monumental Spiraling Lower Tiers of Babel (from y = -0.6 down to y = -48)
    this.lowerTiersGroup = buildBabelLowerTiers();
    this.scene.add(this.lowerTiersGroup);

    // 3. Tumbling / Falling Masonry Debris
    const debris = buildTumblingDebris();
    this.debrisGroup = debris.group;
    this.stones = debris.stones;
    this.scene.add(debris.group);

    // 4. Handshake glowing links (LineSegments)
    const linkGeo = new THREE.BufferGeometry();
    linkGeo.setAttribute('position', new THREE.BufferAttribute(this.linkPositions, 3));
    const linkMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
    });
    this.linkLinesMesh = new THREE.LineSegments(linkGeo, linkMat);
    this.linkLinesMesh.frustumCulled = false;
    this.scene.add(this.linkLinesMesh);

    // 5. Rising collapse destruction plane
    const collapseGeo = new THREE.PlaneGeometry(80, 80);
    collapseGeo.rotateX(-Math.PI / 2);
    const collapseMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.collapseGlowPlane = new THREE.Mesh(collapseGeo, collapseMat);
    this.collapseGlowPlane.position.y = this.collapseY;
    this.scene.add(this.collapseGlowPlane);

    // 6. Tower AI NPCs group
    this.scene.add(this.npcGroup);
    this.spawnFloorNPCs();

    // 7. Falling Boulder Physics Collision System
    this.initPhysicalBoulders();

    // 8. In-World Point-to-Point Visualized Language Chain
    this.initInWorldLanguageChain();
  }

  private initInWorldLanguageChain() {
    this.inWorldChainGroup.name = 'in_world_language_chain';
    this.scene.add(this.inWorldChainGroup);

    for (let i = 0; i < 10; i++) {
      const positions = new Float32Array(24 * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        linewidth: 3,
        transparent: true,
        opacity: 0.95,
      });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      this.inWorldChainGroup.add(line);
      this.chainRibbonLines.push(line);

      const dummyTex = createLanguageGlyphTexture('sumerian');
      const spriteMat = new THREE.SpriteMaterial({
        map: dummyTex,
        transparent: true,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.9, 0.9, 1);
      sprite.visible = false;
      this.inWorldChainGroup.add(sprite);
      this.chainRuneSprites.push(sprite);
    }
  }

  private initPhysicalBoulders() {
    this.boulderGroup.name = 'physical_boulders';
    this.scene.add(this.boulderGroup);

    const stoneTex = createBabelStoneTexture();
    const mat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.88,
      metalness: 0.08,
    });

    for (let i = 0; i < 14; i++) {
      const radius = 0.45 + Math.random() * 0.45;
      const geo = new THREE.DodecahedronGeometry(radius, 1);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.boulderGroup.add(mesh);

      const boulder: PhysicalBoulder = {
        mesh,
        x: (Math.random() - 0.5) * 24,
        y: 6 + Math.random() * 18,
        z: (Math.random() - 0.5) * 24,
        vx: (Math.random() - 0.5) * 2.0,
        vy: -2 - Math.random() * 4,
        vz: (Math.random() - 0.5) * 2.0,
        radius,
        mass: radius * 30,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ),
        active: true,
      };
      mesh.position.set(boulder.x, boulder.y, boulder.z);
      this.physicalBoulders.push(boulder);
    }
  }

  /**
   * Spawns authentic Tower AI NPCs (Lost Stonemason, Hermit, Stranded Scholars).
   */
  private spawnFloorNPCs() {
    while (this.npcGroup.children.length > 0) {
      this.npcGroup.remove(this.npcGroup.children[0]);
    }
    this.npcBundles.clear();
    this.lastNPCSpeechTime.clear();

    const currentFloorY = (this.currentFloor - 1) * 4.5;
    this.currentNPCs = getTowerNPCsForFloor(this.currentFloor);

    this.currentNPCs.forEach(npc => {
      // If this stranded scholar has already been rescued and added to the squad, skip
      if (npc.recruitedMemberId && this.squad.some(m => m.id === npc.recruitedMemberId)) {
        return;
      }

      const bundle = buildNPCModel(npc);
      const groundElev = samplePlatformElevation(npc.x, npc.z, this.currentFloor) ?? 0;
      npc.y = currentFloorY + groundElev;
      npc.vy = 0;
      npc.isGrounded = true;
      npc.isFalling = false;
      npc.isLost = false;
      npc.isDead = false;
      npc.hp = 100;
      npc.maxHp = 100;
      bundle.group.position.set(npc.x, npc.y, npc.z);
      this.npcGroup.add(bundle.group);
      this.npcBundles.set(npc.id, bundle);

      // Delayed initial conlang greeting
      setTimeout(() => {
        if (!this.isDestroyed && !npc.isRescued) {
          bundle.showSpeechBubble(
            npc.conlangDialogue || npc.dialogueAncient,
            npc.translationText || npc.dialogueTranslated
          );
        }
      }, 1400);
    });
  }

  private initSquad() {
    this.squad = createInitialSquad();

    this.squad.forEach(m => {
      const bundle = buildPixelCharacter(m);
      bundle.group.position.set(m.x, m.y, m.z);
      this.scene.add(bundle.group);
      this.charBundles.set(m.id, bundle);
    });

    this.callbacks.onSquadUpdate(this.squad);
  }

  private generateTowerFloors() {
    // Generate 20 floors ascending in spiral / terraced architectural rings
    for (let f = 1; f <= this.maxFloor; f++) {
      const y = (f - 1) * 4.5;
      const width = Math.max(14, 28 - f * 0.45); // Tapering tower silhouette
      const platform = buildTowerFloorPlatform(f, width, 6.2);
      platform.position.set(0, y, 0);

      // Add Cold Vault relics on specific floors (Acts 2 & 3)
      if (f === 3 || f === 7 || f === 11 || f === 15) {
        const relic = buildColdVaultRelic();
        relic.position.set(3.5, 0, -2.5);
        platform.add(relic);
      }

      // Keep active floor and immediately previous floor visible
      platform.visible = (f === 1);
      this.scene.add(platform);
      this.floorPlatforms.push(platform);
    }

    // Add Michelangelo's Hand of God at the celestial pinnacle (Floor 20)
    const pinnacleY = (this.maxFloor - 1) * 4.5 + 4.0;
    this.handOfGodGroup = buildHandOfGod();
    this.handOfGodGroup.position.set(0, pinnacleY + 2.5, -4.5);
    this.scene.add(this.handOfGodGroup);
  }

  private initControls() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.container.addEventListener('pointerdown', this.handlePointerDown);
    this.container.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('resize', this.handleResize);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keysHeld[e.key.toLowerCase()] = true;

    if (e.code === 'Space') {
      e.preventDefault();
      const leader = this.squad.find(m => m.isLeader) || this.squad[0];
      const now = performance.now();
      // Jump if leader is on ground!
      if (leader && leader.isGrounded !== false && now - this.lastJumpTime > 320) {
        leader.vy = 7.5;
        leader.isGrounded = false;
        this.lastJumpTime = now;
        sound.playThrowSound();
      } else {
        this.executeThrow();
      }
    } else if (e.key === '1') {
      this.triggerCommand('sprint');
    } else if (e.key === '2') {
      this.triggerCommand('gather_phalanx');
    } else if (e.key === '3') {
      this.triggerCommand('throw_scout');
    } else if (e.key === '4') {
      this.triggerCommand('decode_rune');
    } else if (e.key === '5') {
      this.triggerCommand('balance_shift');
    } else if (e.key === 'v' || e.key === 'c') {
      this.toggleViewMode();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld[e.key.toLowerCase()] = false;
  };

  private handleBlur = () => {
    this.keysHeld = {};
    this.isDragging = false;
    this.mouseTarget = null;
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.isDragging = true;
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    this.updateMouseTarget(e);
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;
    this.updateMouseTarget(e);
  };

  private handlePointerUp = (e?: PointerEvent) => {
    this.isDragging = false;
    this.mouseTarget = null;
    if (e) {
      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    }
  };

  private updateMouseTarget(e: PointerEvent) {
    const rect = this.container.getBoundingClientRect();
    this.mouseCoords.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseCoords.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseCoords, this.camera);
    const targetPoint = new THREE.Vector3();
    const currentFloorY = (this.currentFloor - 1) * 4.5;
    this.groundPlane.constant = -currentFloorY;

    if (this.raycaster.ray.intersectPlane(this.groundPlane, targetPoint)) {
      this.mouseTarget = targetPoint;
    }
  }

  private handleResize = () => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /**
   * Triggers a tactical squad command via the Language Relay Chain.
   */
  public triggerCommand(type: CommandType) {
    const now = performance.now();
    if (now - this.lastRelayCooldown < 600) return;
    this.lastRelayCooldown = now;

    const leader = this.squad.find(m => m.isLeader) || this.squad[0];
    if (!leader) return;

    const hasOpenSource = this.activeBuffs.some(b => b.id === 'open_source_protocol');
    const hasMegaphone = this.activeBuffs.some(b => b.id === 'megaphone_relic');

    // Origin language determined by leader or context
    const originLang: LanguageId = leader.languages[0] || 'sumerian';

    const result = computeRelaySpread(leader, this.squad, originLang, {
      commRadius: 7.0,
      hasOpenSourceProtocol: hasOpenSource,
      hasMegaphoneRelic: hasMegaphone,
    });

    // Notify React state immediately
    this.callbacks.onRelayResult(result);

    // Play procedural language chain audio sequence safely
    try {
      result.steps.forEach((step, idx) => {
        setTimeout(() => {
          try {
            sound.playLanguageChime(step.toLang, idx);
          } catch {}
        }, idx * 160);
      });
    } catch {}

    // Apply command effects
    if (result.success) {
      this.applyCommandEffect(type, result);
    }
  }

  private applyCommandEffect(type: CommandType, result: RelayResult) {
    const bonus = result.synergyMultiplier;

    if (type === 'sprint') {
      // Speed burst
      this.squad.forEach(m => {
        if (!result.unreachedMembers.some(u => u.id === m.id)) {
          m.vx *= 1.8 * bonus;
          m.vz *= 1.8 * bonus;
        }
      });
      // Check chorus resonance buff
      if (this.activeBuffs.some(b => b.id === 'chorus_resonance') && result.steps.length >= 4) {
        sound.playTriumphFanfare();
      }
    } else if (type === 'gather_phalanx') {
      // Tighten ranks around leader
      const leader = this.squad.find(m => m.isLeader) || this.squad[0];
      this.squad.forEach(m => {
        if (!m.isLeader) {
          const dx = leader.x - m.x;
          const dz = leader.z - m.z;
          m.vx += dx * 2.0;
          m.vz += dz * 2.0;
        }
      });
      sound.playHandshakeSound();
    } else if (type === 'throw_scout') {
      this.executeThrow();
    } else if (type === 'decode_rune') {
      sound.playTriumphFanfare();
      // Instantly advance floor elevator if near threshold
      this.advanceFloor();
    } else if (type === 'balance_shift') {
      // Direct squad to shift to opposing side
      const targetSide = this.platformTilt > 0 ? -4 : 4;
      this.squad.forEach(m => {
        m.vx += (targetSide - m.x) * 1.5;
      });
    }
  }

  /**
   * Throws the pioneer/scout member across gaps!
   */
  public executeThrow() {
    const thrower = this.squad.find(m => m.isLeader) || this.squad[0];
    const target = this.squad.find(m => m.role === 'pioneer' || m.role === 'scout') || this.squad[this.squad.length - 1];

    if (!thrower || !target || target.isThrown) return;

    target.isThrown = true;
    target.throwProgress = 0;
    target.y = thrower.y + 1.2;

    const hasCatapult = this.activeBuffs.some(b => b.id === 'catapult_throw');
    const throwDistance = hasCatapult ? 7.5 : 5.0;

    // Throw forward in direction leader is moving or facing
    let dirX = thrower.vx;
    let dirZ = thrower.vz;
    const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (len < 0.1) {
      dirZ = -1; // default forward
      dirX = 0;
    } else {
      dirX /= len;
      dirZ /= len;
    }

    target.vx = dirX * throwDistance * 2.2;
    target.vz = dirZ * throwDistance * 2.2;
    target.vy = 4.5;

    sound.playThrowSound();
  }

  /**
   * Advances squad to the next floor of Babel.
   */
  public advanceFloor() {
    if (this.currentFloor >= this.maxFloor) {
      this.triggerSummitContact();
      return;
    }

    this.currentFloor++;
    this.floorPlatforms.forEach((p, idx) => {
      // Keep lower floors and next floor visible for seamless continuous physical climbing
      const fNum = idx + 1;
      p.visible = (fNum <= this.currentFloor + 1 && fNum >= Math.max(1, this.currentFloor - 3));
    });
    this.callbacks.onFloorChange(this.currentFloor);

    // Check Act transitions
    if (this.currentFloor === 5 && this.currentAct < 2) {
      this.setAct(2);
    } else if (this.currentFloor === 9 && this.currentAct < 3) {
      this.setAct(3);
    } else if (this.currentFloor === 13 && this.currentAct < 4) {
      this.setAct(4);
    } else if (this.currentFloor === 17 && this.currentAct < 5) {
      this.setAct(5);
    }

    // Trigger Miracle Buff selection every 3 floors
    if (this.currentFloor % 3 === 0) {
      this.callbacks.onMiracleTrigger();
    }

    // Elevate squad base Y and reset to floor entrance
    const newFloorY = (this.currentFloor - 1) * 4.5;
    const startX = this.currentFloor >= 15 ? -8.5 : -10.5;
    const startZ = -1.2;
    const startElev = samplePlatformElevation(startX, startZ, this.currentFloor) ?? 0;

    const leader = this.squad.find(m => m.isLeader) || this.squad[0];
    if (leader) {
      leader.x = startX;
      leader.z = startZ;
      leader.y = newFloorY + startElev;
      leader.vy = 0;
      leader.isGrounded = true;
      leader.isFalling = false;
      leader.fallTumbleAngle = 0;
    }
    this.squad.forEach((m, idx) => {
      if (!m.isLeader) {
        m.x = startX - (idx + 1) * 0.75;
        m.z = startZ + (Math.random() - 0.5) * 0.8;
        m.y = newFloorY + startElev;
        m.vy = 0;
        m.isGrounded = true;
        m.isFalling = false;
        m.fallTumbleAngle = 0;
      }
    });

    this.spawnFloorNPCs();
    sound.playTriumphFanfare();
  }

  public setViewMode(mode: 'cutaway' | 'aerial' | 'close') {
    this.viewMode = mode;
    this.callbacks.onViewModeChange?.(mode);
  }

  public toggleViewMode() {
    const modes: Array<'cutaway' | 'aerial' | 'close'> = ['cutaway', 'aerial', 'close'];
    const nextIdx = (modes.indexOf(this.viewMode) + 1) % modes.length;
    this.setViewMode(modes[nextIdx]);
  }

  public getViewMode(): 'cutaway' | 'aerial' | 'close' {
    return this.viewMode;
  }

  private setAct(act: number) {
    this.currentAct = act;
    this.callbacks.onActChange(act);
    if (!this.storyTriggeredActs.has(act)) {
      this.storyTriggeredActs.add(act);
      this.callbacks.onStoryTrigger(act);
    }
  }

  public addMiracleBuff(buff: MiracleBuff) {
    this.activeBuffs.push(buff);

    if (buff.id === 'polyglot_mind') {
      // Assign an additional language to a member
      const member = this.squad[Math.floor(Math.random() * this.squad.length)];
      if (member) {
        const unused: LanguageId[] = (['sumerian', 'greek', 'egyptian', 'latin', 'han', 'gaelic'] as LanguageId[]).filter(
          l => !member.languages.includes(l)
        );
        if (unused.length > 0) {
          member.languages.push(unused[0]);
          const bundle = this.charBundles.get(member.id);
          bundle?.updateLanguageGlyph(member);
        }
      }
    } else if (buff.id === 'canned_miracle') {
      this.squad.forEach(m => {
        m.maxHp = Math.round(m.maxHp * 1.25);
        m.hp = m.maxHp;
      });
    }
  }

  private triggerSummitContact() {
    // Act 5 summit contact with Michelangelo's Hand of God!
    sound.playTriumphFanfare();
    this.callbacks.onStoryTrigger(5);
    setTimeout(() => {
      this.callbacks.onVictory();
    }, 4500);
  }

  /**
   * Main 60fps simulation tick.
   */
  private startLoop() {
    const tick = () => {
      if (this.isDestroyed) return;

      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      this.updateSimulation(dt, now / 1000);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();

    const poll = () => {
      if (this.isDestroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 60);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateSimulation(dt: number, time: number) {
    const currentFloorY = (this.currentFloor - 1) * 4.5;
    const leader = this.squad.find(m => m.isLeader) || this.squad[0];

    // 1. Leader Input & Movement
    let inputX = 0;
    let inputZ = 0;
    if (this.keysHeld['w'] || this.keysHeld['arrowup']) inputZ -= 1;
    if (this.keysHeld['s'] || this.keysHeld['arrowdown']) inputZ += 1;
    if (this.keysHeld['a'] || this.keysHeld['arrowleft']) inputX -= 1;
    if (this.keysHeld['d'] || this.keysHeld['arrowright']) inputX += 1;

    // Mouse drag targeting
    if (this.mouseTarget) {
      const dx = this.mouseTarget.x - leader.x;
      const dz = this.mouseTarget.z - leader.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.4) {
        inputX = dx / dist;
        inputZ = dz / dist;
      }
    }

    const moveMag = Math.sqrt(inputX * inputX + inputZ * inputZ);
    if (moveMag > 0.01) {
      const speed = 7.0;
      leader.vx = THREE.MathUtils.damp(leader.vx, (inputX / moveMag) * speed, 12, dt);
      leader.vz = THREE.MathUtils.damp(leader.vz, (inputZ / moveMag) * speed, 12, dt);
    } else {
      leader.vx = THREE.MathUtils.damp(leader.vx, 0, 8, dt);
      leader.vz = THREE.MathUtils.damp(leader.vz, 0, 8, dt);
    }

    // 2. Platform Tilt Physics (Act 4 & 5)
    if (this.currentAct >= 4) {
      // Oscillating divine collapse tilt
      this.tiltTarget = Math.sin(time * 0.8) * 0.65;
      this.platformTilt = THREE.MathUtils.damp(this.platformTilt, this.tiltTarget, 3, dt);

      // Lateral slope sliding force
      const slideForce = this.platformTilt * 7.5;
      this.squad.forEach(m => {
        m.vx += slideForce * dt;
      });

      const bal = calculatePlatformBalance(this.platformTilt, this.squad, 'x');
      this.callbacks.onBalanceUpdate(this.platformTilt, bal.stabilityPercent, bal.isBalanced);

      if (!bal.isBalanced && Math.random() < 0.04) {
        sound.playTiltAlert();
      }

      // Rotate active platform mesh to visualize tilt
      const activePlatform = this.floorPlatforms[this.currentFloor - 1];
      if (activePlatform) {
        activePlatform.rotation.z = this.platformTilt * 0.12;
      }
    }

    // 3. Flocking, Multi-Tier Terrain Elevation & 3D Falling Physics
    this.squad.forEach(m => {
      // Squash deformation spring rebound
      if (m.squashTimer && m.squashTimer > 0) {
        m.squashTimer -= dt;
        const progress = 1.0 - m.squashTimer / 0.55;
        this.charBundles.get(m.id)?.setSquash(0.42 + progress * 0.58);
      }

      if (m.isThrown) {
        // Airborne trajectory from catapult/throw
        m.throwProgress = (m.throwProgress || 0) + dt * 1.5;
        m.x += m.vx * dt;
        m.z += m.vz * dt;
        m.y += m.vy * dt;
        m.vy -= 18.0 * dt;

        const groundElev = samplePlatformElevation(m.x, m.z, this.currentFloor);
        if (groundElev !== null) {
          const targetY = currentFloorY + groundElev;
          if (m.y <= targetY) {
            m.y = targetY;
            m.vy = 0;
            m.isThrown = false;
            m.isGrounded = true;
            m.isFalling = false;
            m.fallTumbleAngle = 0;
            sound.playCrumbleRumble();
          }
        } else if (m.y < currentFloorY - 5.0) {
          // Fell off tower while thrown - recover to safe esplanade
          m.y = currentFloorY;
          m.vy = 0;
          m.isThrown = false;
          m.isFalling = false;
          m.isGrounded = true;
          m.x = -10.0;
          m.z = -1.2;
          m.hp = Math.max(1, m.hp - 15);
          sound.playCrumbleRumble();
        }
      } else if (!m.isLeader) {
        // Follow leader (Boid Flocking towards leader)
        const targetX = leader.x;
        const targetZ = leader.z;
        const distToLeader = Math.hypot(targetX - m.x, targetZ - m.z);

        if (distToLeader > 2.2) {
          const steerX = (targetX - m.x) / distToLeader;
          const steerZ = (targetZ - m.z) / distToLeader;
          m.vx = THREE.MathUtils.damp(m.vx, steerX * 6.2, 5, dt);
          m.vz = THREE.MathUtils.damp(m.vz, steerZ * 6.2, 5, dt);
        } else {
          m.vx = THREE.MathUtils.damp(m.vx, 0, 5, dt);
          m.vz = THREE.MathUtils.damp(m.vz, 0, 5, dt);
        }

        // Separation from other squad members
        this.squad.forEach(other => {
          if (other.id !== m.id) {
            const sepDist = Math.hypot(m.x - other.x, m.z - other.z);
            if (sepDist < 1.15 && sepDist > 0.001) {
              const push = (1.15 - sepDist) * 3.5;
              m.vx += ((m.x - other.x) / sepDist) * push * dt;
              m.vz += ((m.z - other.z) / sepDist) * push * dt;
            }
          }
        });

        m.x += m.vx * dt;
        m.z += m.vz * dt;
      } else {
        // Leader update
        m.x += m.vx * dt;
        m.z += m.vz * dt;
      }

      // Lifeline dangling handshake mechanic
      if (m.danglingFromId) {
        const savior = this.squad.find(s => s.id === m.danglingFromId);
        if (savior) {
          m.x = THREE.MathUtils.damp(m.x, savior.x, 5, dt);
          m.z = THREE.MathUtils.damp(m.z, savior.z, 5, dt);
          m.y = THREE.MathUtils.damp(m.y, savior.y - 0.4, 5, dt);
          m.vy = 0;
          m.fallTumbleAngle = Math.sin(time * 6) * 0.4;

          // Pull back up to safety after brief dangle
          m.speechTimer = (m.speechTimer || 0) + dt;
          if (m.speechTimer > 0.8) {
            m.danglingFromId = undefined;
            m.isFalling = false;
            m.isGrounded = true;
            m.fallTumbleAngle = 0;
            m.speechTimer = 0;
            m.y = savior.y;
            sound.playHandshakeSound();
          }
        } else {
          m.danglingFromId = undefined;
        }
      } else {
        // Sample exact multi-tier elevation under character across current zone
        const groundElev = samplePlatformElevation(m.x, m.z, this.currentFloor);

        if (groundElev === null) {
          // Off the ledge or into the central lightwell abyss! Real 3D falling & tumbling
          m.isGrounded = false;
          m.isFalling = true;
          m.vy -= 22.0 * dt;
          m.y += m.vy * dt;
          m.fallTumbleAngle = (m.fallTumbleAngle || 0) + 7.5 * dt;

          // Ally Lifeline Catch: nearby grounded comrade reaches out!
          const allyNearby = this.squad.find(
            other => other.id !== m.id && other.isGrounded && Math.hypot(other.x - m.x, other.z - m.z) < 3.2
          );

          if (allyNearby && m.y > currentFloorY - 2.5) {
            m.danglingFromId = allyNearby.id;
            m.speechTimer = 0;
            sound.playHandshakeSound();

            const bundle = this.charBundles.get(m.id);
            bundle?.showSpeechBubble('Ka-mi-na! Danna!', 'Hold fast! Brother!');

            const allyBundle = this.charBundles.get(allyNearby.id);
            allyBundle?.showSpeechBubble('Nu-kud! Ba-sha!', 'I have you! Pull!');
          } else if (m.y < currentFloorY - 6.0) {
            // Plummeted through the clouds into the lower tiers!
            sound.playCrumbleRumble();
            m.hp = Math.max(0, m.hp - 25);
            m.x = -10.5;
            m.z = -1.2;
            m.y = currentFloorY;
            m.vy = 0;
            m.isFalling = false;
            m.isGrounded = true;
            m.fallTumbleAngle = 0;

            if (m.isLeader && m.hp <= 0) {
              this.callbacks.onGameOver('巴别塔深渊吞噬了领袖，神之言语在坠落中湮灭。');
              return;
            }
          }
        } else {
          // Valid floor ground elevation
          const targetY = currentFloorY + groundElev;

          if (m.y > targetY + 0.1) {
            // Airborne (jumping or stepping down ledge)
            m.isGrounded = false;
            m.vy -= 22.0 * dt;
            m.y += m.vy * dt;

            if (m.y <= targetY) {
              m.y = targetY;
              m.vy = 0;
              m.isGrounded = true;
              m.isFalling = false;
              m.fallTumbleAngle = 0;
            }
          } else {
            // Solidly grounded on step / terrace
            m.y = THREE.MathUtils.damp(m.y, targetY, 15, dt);
            m.vy = 0;
            m.isGrounded = true;
            m.isFalling = false;
            m.fallTumbleAngle = 0;
          }
        }
      }

      // Constrain outer limits circularly
      const rDist = Math.hypot(m.x, m.z);
      if (rDist > 16.5) {
        m.x = (m.x / rDist) * 16.5;
        m.z = (m.z / rDist) * 16.5;
      }

      // Update 3D Character Mesh & Animations
      const bundle = this.charBundles.get(m.id);
      if (bundle) {
        bundle.group.position.set(m.x, m.y, m.z);

        if (m.isFalling) {
          // 3D tumbling rotation around axes
          bundle.group.rotation.x = m.fallTumbleAngle || 0;
          bundle.group.rotation.z = (m.fallTumbleAngle || 0) * 0.7;
        } else {
          bundle.group.rotation.x = 0;
          bundle.group.rotation.z = 0;
          if (Math.hypot(m.vx, m.vz) > 0.2) {
            const targetAngle = Math.atan2(m.vx, m.vz);
            bundle.group.rotation.y = THREE.MathUtils.damp(bundle.group.rotation.y, targetAngle, 10, dt);
          }
        }

        const isMoving = Math.hypot(m.vx, m.vz) > 0.2 && m.isGrounded;
        bundle.updateAnimation(time, isMoving, m.isThrown, !!m.danglingFromId, m.isFalling);
      }
    });

    // 4. Falling Boulder Physics Collision System (落石真正物理弹开、压扁、扣血或死亡)
    this.physicalBoulders.forEach(b => {
      // Gravity acceleration
      b.vy -= 16.0 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;

      b.mesh.rotation.x += b.rotSpeed.x * dt;
      b.mesh.rotation.y += b.rotSpeed.y * dt;
      b.mesh.rotation.z += b.rotSpeed.z * dt;
      b.mesh.position.set(b.x, b.y, b.z);

      // Floor collision & bounce
      const groundElev = samplePlatformElevation(b.x, b.z, this.currentFloor);
      if (groundElev !== null) {
        const targetGroundY = currentFloorY + groundElev + b.radius;
        if (b.y <= targetGroundY) {
          b.y = targetGroundY;
          b.vy = -b.vy * 0.35; // bounce!
          b.vx += (Math.random() - 0.5) * 1.5;
          b.vz += (Math.random() - 0.5) * 1.5;
          if (Math.abs(b.vy) > 1.8) {
            sound.playCrumbleRumble();
          }
        }
      } else if (b.y < currentFloorY - 22.0) {
        // Respawn boulder high above active floor
        b.y = currentFloorY + 16.0 + Math.random() * 12.0;
        b.x = (Math.random() - 0.5) * 22.0;
        b.z = (Math.random() - 0.5) * 22.0;
        b.vx = (Math.random() - 0.5) * 2.0;
        b.vy = -2.0 - Math.random() * 4.0;
        b.vz = (Math.random() - 0.5) * 2.0;
      }

      // Boulder vs Squad Members Collision
      this.squad.forEach(m => {
        if (m.isDead) return;
        const dx = m.x - b.x;
        const dy = (m.y + 0.85) - b.y;
        const dz = m.z - b.z;
        const dist = Math.hypot(dx, dy, dz);

        if (dist < b.radius + 0.55 && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Physical impulse knockback (弹开)
          m.vx += nx * 12.0;
          m.vz += nz * 12.0;
          m.vy = Math.max(m.vy, 4.2);

          // Physical squash deformation (压扁)
          m.squashTimer = 0.55;
          this.charBundles.get(m.id)?.setSquash(0.42);

          // Damage & Death (扣血/死亡)
          const dmg = 35 + Math.floor(Math.random() * 15);
          m.hp = Math.max(0, m.hp - dmg);
          sound.playCrumbleRumble();

          // Boulder rebound
          b.vx = -nx * 4.0;
          b.vy = 4.0;

          if (m.hp <= 0) {
            m.isDead = true;
            if (m.isLeader) {
              this.callbacks.onGameOver('领袖被坠落的巨石击中，队伍在崩塌中失去了引路人。');
              return;
            }
          }
        }
      });

      // Boulder vs Tower NPCs Collision
      this.currentNPCs.forEach(npc => {
        if (npc.isDead || npc.isLost || npc.isRescued) return;
        const dx = npc.x - b.x;
        const dy = (npc.y + 0.85) - b.y;
        const dz = npc.z - b.z;
        const dist = Math.hypot(dx, dy, dz);

        if (dist < b.radius + 0.6 && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // NPC physical knockback (弹开)
          npc.vx = (npc.vx || 0) + nx * 11.0;
          npc.vz = (npc.vz || 0) + nz * 11.0;
          npc.vy = Math.max(npc.vy || 0, 4.0);

          // NPC squash deformation (压扁)
          npc.squashTimer = 0.55;
          this.npcBundles.get(npc.id)?.setSquash(0.42);

          // Damage & Death (扣血/死亡)
          npc.hp = Math.max(0, (npc.hp ?? 100) - 45);
          sound.playCrumbleRumble();
          this.npcBundles.get(npc.id)?.showSpeechBubble('Aaargh! Khas-ba!', 'Struck by falling monolith!');

          b.vx = -nx * 4.0;
          b.vy = 4.0;

          if (npc.hp <= 0) {
            npc.isDead = true;
          }
        }
      });
    });

    // 5. Tower AI NPCs Physics & Edge Falling (npc踩空会真的掉下去失联)
    this.currentNPCs.forEach(npc => {
      const npcBundle = this.npcBundles.get(npc.id);
      if (!npcBundle || npc.isRescued || npc.isLost) return;

      npcBundle.updateAnimation(time);

      // Rebound squash deformation for NPC
      if (npc.squashTimer && npc.squashTimer > 0) {
        npc.squashTimer -= dt;
        const progress = 1.0 - npc.squashTimer / 0.55;
        npcBundle.setSquash(0.42 + progress * 0.58);
      }

      // NPC velocity update from knockback / physics
      npc.x += (npc.vx || 0) * dt;
      npc.z += (npc.vz || 0) * dt;
      npc.vx = THREE.MathUtils.damp(npc.vx || 0, 0, 4.0, dt);
      npc.vz = THREE.MathUtils.damp(npc.vz || 0, 0, 4.0, dt);

      // Sample ground elevation under NPC
      const npcElev = samplePlatformElevation(npc.x, npc.z, this.currentFloor);

      if (npcElev === null) {
        // Stepped off edge or into central lightwell abyss! Genuine falling & loss
        npc.isGrounded = false;
        npc.isFalling = true;
        npc.vy = (npc.vy ?? 0) - 22.0 * dt;
        npc.y += (npc.vy ?? 0) * dt;
        npc.fallTumbleAngle = (npc.fallTumbleAngle || 0) + 8.0 * dt;

        if (!npc.speechTimer || npc.speechTimer < 0.1) {
          npc.speechTimer = 2.5;
          npcBundle.showSpeechBubble('Abzu-ra! Aaaaagh!', 'Stepped into the void... Lost!');
          sound.playCrumbleRumble();
        }

        // Plummeted past lower tiers -> genuinely lost / disconnected (失联)!
        if (npc.y < currentFloorY - 18.0) {
          npc.isLost = true;
          npcBundle.group.visible = false;
        }
      } else {
        if (!npc.isFalling) {
          const targetNpcY = currentFloorY + npcElev;
          npc.y = THREE.MathUtils.damp(npc.y, targetNpcY, 12, dt);
          npc.isGrounded = true;
          npc.vy = 0;
          npc.fallTumbleAngle = 0;
        } else {
          const targetNpcY = currentFloorY + npcElev;
          if (npc.y <= targetNpcY) {
            npc.y = targetNpcY;
            npc.vy = 0;
            npc.isGrounded = true;
            npc.isFalling = false;
            npc.fallTumbleAngle = 0;
          } else {
            npc.vy = (npc.vy ?? 0) - 22.0 * dt;
            npc.y += (npc.vy ?? 0) * dt;
          }
        }
      }

      // Update NPC 3D mesh position & tumbling rotation
      if (!npc.isLost) {
        npcBundle.group.position.set(npc.x, npc.y, npc.z);
        if (npc.isFalling) {
          npcBundle.group.rotation.x = npc.fallTumbleAngle || 0;
          npcBundle.group.rotation.z = (npc.fallTumbleAngle || 0) * 0.7;
        } else {
          npcBundle.group.rotation.x = 0;
          npcBundle.group.rotation.z = 0;
        }
      }

      // Distance to closest scholar
      let nearestDist = 999;
      this.squad.forEach(m => {
        const d = Math.hypot(m.x - npc.x, m.z - npc.z);
        if (d < nearestDist) {
          nearestDist = d;
        }
      });

      // Proximity conlang speech bubble
      if (nearestDist < 3.8 && !npc.isFalling) {
        const lastSpeech = this.lastNPCSpeechTime.get(npc.id) || 0;
        if (time - lastSpeech > 4.5) {
          this.lastNPCSpeechTime.set(npc.id, time);
          npcBundle.showSpeechBubble(
            npc.conlangDialogue || npc.dialogueAncient,
            npc.translationText || npc.dialogueTranslated
          );
        }
      }

      // Stranded Scholar Recruitment
      if (npc.type === 'stranded_scholar' && !npc.isRescued && !npc.isFalling && nearestDist < 2.8) {
        npc.isRescued = true;
        sound.playTriumphFanfare();

        const pooled = npc.recruitedMemberId ? RECRUITABLE_SCHOLARS[npc.recruitedMemberId] : undefined;
        const recruitData: SquadMember = pooled
          ? {
              ...pooled,
              x: npc.x,
              y: currentFloorY + (samplePlatformElevation(npc.x, npc.z, this.currentFloor) ?? 0),
              z: npc.z,
              isGrounded: true,
              isFalling: false,
              fallTumbleAngle: 0,
            }
          : {
              id: npc.recruitedMemberId || `scholar_${Date.now()}`,
              name: npc.name,
              languages: npc.languages || ['egyptian'],
              role: 'scholar',
              x: npc.x,
              y: currentFloorY + (samplePlatformElevation(npc.x, npc.z, this.currentFloor) ?? 0),
              z: npc.z,
              vx: 0,
              vy: 0,
              vz: 0,
              hp: 100,
              maxHp: 100,
              isLeader: false,
              isThrown: false,
              isHeld: false,
              isGrounded: true,
              isFalling: false,
              fallTumbleAngle: 0,
              throwProgress: 0,
              avatarSeed: npc.avatarSeed || 101,
            };

        this.squad.push(recruitData);
        const newBundle = buildPixelCharacter(recruitData);
        newBundle.group.position.set(recruitData.x, recruitData.y, recruitData.z);
        this.scene.add(newBundle.group);
        this.charBundles.set(recruitData.id, newBundle);

        newBundle.showSpeechBubble(
          npc.conlangDialogue || npc.dialogueAncient,
          `I join your climb! May Babel's tongue be deciphered!`
        );

        npcBundle.group.visible = false;
        this.callbacks.onSquadUpdate([...this.squad]);
      }
    });

    // 6. In-World Point-to-Point Visualized Language Chain (可视化、点到点的语言链)
    const hasOpenSource = this.activeBuffs.some(b => b.id === 'open_source_protocol');
    const hasMegaphone = this.activeBuffs.some(b => b.id === 'megaphone_relic');
    const liveLinks = computeLiveLanguageTopology(this.squad, {
      hasOpenSourceProtocol: hasOpenSource,
      hasMegaphoneRelic: hasMegaphone,
    });

    for (let k = 0; k < this.chainRibbonLines.length; k++) {
      const ribbon = this.chainRibbonLines[k];
      const runeSprite = this.chainRuneSprites[k];

      if (k < liveLinks.length) {
        const link = liveLinks[k];
        const a = this.squad.find(m => m.id === link.fromMemberId);
        const b = this.squad.find(m => m.id === link.toMemberId);

        if (a && b) {
          const dist = Math.hypot(b.x - a.x, b.z - a.z);
          const pStart = new THREE.Vector3(a.x, a.y + 0.85, a.z);
          const pEnd = new THREE.Vector3(b.x, b.y + 0.85, b.z);

          // Catenary gravitational dip in midpoint
          const sag = 0.20 + dist * 0.04;
          const pMid = new THREE.Vector3(
            (a.x + b.x) / 2,
            (a.y + b.y) / 2 + 0.85 - sag,
            (a.z + b.z) / 2
          );

          const curve = new THREE.QuadraticBezierCurve3(pStart, pMid, pEnd);
          const curvePts = curve.getPoints(23);

          const posAttr = ribbon.geometry.attributes.position as THREE.BufferAttribute;
          const arr = posAttr.array as Float32Array;
          for (let p = 0; p < curvePts.length; p++) {
            arr[p * 3] = curvePts[p].x;
            arr[p * 3 + 1] = curvePts[p].y;
            arr[p * 3 + 2] = curvePts[p].z;
          }
          posAttr.needsUpdate = true;

          // Color based on shared conlang or danger warning
          const sharedLang: LanguageId = link.sharedLanguages[0] || 'sumerian';
          const langHex = LANGUAGES[sharedLang]?.color || '#f59e0b';
          const mat = ribbon.material as THREE.LineBasicMaterial;
          if (dist > 6.0) {
            // About to snap / break range warning!
            mat.color.setHex(0xef4444);
            mat.opacity = 0.6 + Math.sin(time * 15) * 0.4;
          } else {
            mat.color.set(langHex);
            mat.opacity = 0.85 + Math.sin(time * 6 + k) * 0.15;
          }
          ribbon.visible = true;

          // Midpoint Floating Glyph Rune Sprite
          runeSprite.position.set(pMid.x, pMid.y + 0.42, pMid.z);
          const glyphTex = createLanguageGlyphTexture(sharedLang);
          runeSprite.material.map = glyphTex;
          runeSprite.material.needsUpdate = true;
          const pulse = 0.85 + Math.sin(time * 5 + k) * 0.1;
          runeSprite.scale.set(pulse, pulse, 1);
          runeSprite.visible = true;
        } else {
          ribbon.visible = false;
          runeSprite.visible = false;
        }
      } else {
        ribbon.visible = false;
        runeSprite.visible = false;
      }
    }

    // 7. Drifting Clouds & Ambient Tumbling Stones
    this.clouds.forEach(cloud => {
      cloud.position.x += 1.4 * dt;
      if (cloud.position.x > 90) {
        cloud.position.x = -90;
      }
    });

    // 8. Floating Miracle Relic Pickup Check
    if (!this.collectedRelicFloors.has(this.currentFloor)) {
      const activePlatform = this.floorPlatforms[this.currentFloor - 1];
      const relicMesh = activePlatform?.getObjectByName('floating_relic');
      if (relicMesh) {
        relicMesh.rotation.y += 2.2 * dt;
        relicMesh.position.y = 1.4 + Math.sin(time * 3) * 0.25;

        const nearMember = this.squad.find(
          m => Math.hypot(m.x, m.z) < 2.5 && Math.abs(m.y - currentFloorY) < 2.5
        );
        if (nearMember) {
          this.collectedRelicFloors.add(this.currentFloor);
          relicMesh.visible = false;
          sound.playChimeSuccess();
          this.callbacks.onMiracleTrigger();
        }
      }
    }

    // 9. Rising Collapse Death Zone
    this.collapseY += this.collapseSpeed * dt;
    this.collapseGlowPlane.position.y = this.collapseY;

    // Floor advancement check: Seamless Physical Climbing to Stair/Ramp Summit
    // When leader reaches the top of the ascending stairs/ramp (y >= currentFloorY + 4.1m)
    const reachedExit =
      leader.y >= currentFloorY + 4.1 && Math.hypot(leader.x, leader.z) > 7.5;

    if (this.collapseY >= currentFloorY - 1.2) {
      if (reachedExit) {
        this.advanceFloor();
      } else {
        const leaderHpLoss = 35 * dt;
        leader.hp -= leaderHpLoss;
        if (leader.hp <= 0) {
          this.callbacks.onGameOver('巴别塔在神之震怒中崩解，队伍未能在坠落前登上高阶。');
          return;
        }
      }
    } else {
      if (reachedExit) {
        this.advanceFloor();
      }
    }

    // 6. Classical Side-View Camera Tracking with Multi-Angle View Modes (侧视角 / 俯瞰 / 专注)
    let targetCamX = THREE.MathUtils.clamp(leader.x * 0.45 - 2.8, -6.5, 6.5);
    let targetCamY = currentFloorY + 6.2;
    let targetCamZ = 13.8;
    let lookAtX = targetCamX + 2.2;
    let lookAtY = currentFloorY + 0.6;
    let lookAtZ = -2.2;

    if (this.viewMode === 'aerial') {
      targetCamX = THREE.MathUtils.clamp(leader.x * 0.35, -5.5, 5.5);
      targetCamY = currentFloorY + 15.5;
      targetCamZ = 18.5;
      lookAtX = targetCamX;
      lookAtY = currentFloorY - 2.5;
      lookAtZ = -6.5;
    } else if (this.viewMode === 'close') {
      targetCamX = THREE.MathUtils.clamp(leader.x * 0.6, -6.0, 6.0);
      targetCamY = currentFloorY + 3.4;
      targetCamZ = 8.5;
      lookAtX = targetCamX;
      lookAtY = currentFloorY + 0.9;
      lookAtZ = -1.0;
    }

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 4.5, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 4.5, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 4.5, dt);
    this.camera.lookAt(lookAtX, lookAtY, lookAtZ);

    // Act 5 summit Hand of God subtle hovering animation
    if (this.handOfGodGroup) {
      this.handOfGodGroup.position.y = (this.maxFloor - 1) * 4.5 + 4.0 + Math.sin(time * 1.5) * 0.3;
    }

    // 7. Live Language Topology Update for HUD
    this.topologyCooldown += dt;
    if (this.topologyCooldown >= 0.08) {
      this.topologyCooldown = 0;
      const hasOpenSource = this.activeBuffs.some(b => b.id === 'open_source_protocol');
      const hasMegaphone = this.activeBuffs.some(b => b.id === 'megaphone_relic');
      const liveLinks = computeLiveLanguageTopology(this.squad, {
        hasOpenSourceProtocol: hasOpenSource,
        hasMegaphoneRelic: hasMegaphone,
      });
      this.callbacks.onTopologyUpdate?.(liveLinks);
    }

    // Notify React state throttled
    if (Math.random() < 0.15) {
      this.callbacks.onSquadUpdate([...this.squad]);
    }
  }

  public restart() {
    this.currentFloor = 1;
    this.currentAct = 1;
    this.collapseY = -6.0;
    this.platformTilt = 0;
    this.activeBuffs = [];
    this.storyTriggeredActs.clear();
    this.collectedRelicFloors.clear();

    this.floorPlatforms.forEach((p, idx) => {
      p.visible = (idx <= 2);
      const relic = p.getObjectByName('floating_relic');
      if (relic) relic.visible = true;
    });

    // Remove any extra character meshes from recruited scholars
    this.charBundles.forEach(bundle => {
      this.scene.remove(bundle.group);
    });
    this.charBundles.clear();

    this.squad = createInitialSquad();
    this.squad.forEach(m => {
      const bundle = buildPixelCharacter(m);
      bundle.group.position.set(m.x, m.y, m.z);
      this.scene.add(bundle.group);
      this.charBundles.set(m.id, bundle);
    });

    this.spawnFloorNPCs();

    this.callbacks.onFloorChange(1);
    this.callbacks.onActChange(1);
    this.callbacks.onSquadUpdate(this.squad);
  }

  public dispose() {
    this.isDestroyed = true;
    if (this.isSoftwareGl) {
      clearTimeout(this.frameId);
    } else {
      cancelAnimationFrame(this.frameId);
    }

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.container.removeEventListener('pointerdown', this.handlePointerDown);
    this.container.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('resize', this.handleResize);

    sound.stopAmbientBgm();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
