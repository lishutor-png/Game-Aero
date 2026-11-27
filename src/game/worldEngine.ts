import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createProceduralPlane, type PlaneRig } from './planeModel';
import { ENVIRONMENT_THEMES, normalizeMapId, pickRandomTheme } from './themes';
import {
  computeEffectivePlaneStats,
  DEFAULT_PROGRESS,
  getDisplayWeaponLabel,
  IN_FLIGHT_WEAPON_POOL,
  OBSTACLE_DAMAGE,
  resolveEffectiveWeapon,
  WEAPON_CATALOG,
} from './planes';
import { soundEngine } from './audio';
import { FlightInputController, type ControlActionKey } from './gyro';
import { MapEnvironmentManager } from './environmentBuilder';
import {
  applyObstacleStyleForMap,
  buildThemedObstacleVisuals,
  createEnemyPoolUnit,
  createLockReticle,
  createProjectileMeshPool,
  createSharedCombatMaterials,
  type EnemyVisualHandles,
  type ObstacleVisualHandles,
  type SharedCombatMaterials,
} from './combatModels';
import type {
  EffectivePlaneStats,
  EnemyKind,
  GameMode,
  GameOverSummary,
  GameSettings,
  GraphicsQuality,
  HudSnapshot,
  PlaneId,
  PlaneModelTier,
  PowerUpType,
  ThemeId,
  WeaponType,
} from '../types/game';

const _dummy = new THREE.Object3D();

type ObstacleKind = 'pillar' | 'gate' | 'mover' | 'turbine';

interface ObstacleUnit {
  visual: ObstacleVisualHandles;
  kind: ObstacleKind;
  active: boolean;
  destructible: boolean;
  hp: number;
  maxHp: number;
  hitFlash: number;
  z: number;
  x: number;
  y: number;
  baseX: number;
  halfWidth: number;
  halfHeight: number;
  gateGapHalf: number;
  gateScored: boolean;
  oscPhase: number;
  oscAmp: number;
  oscSpeed: number;
  spinSpeed: number;
}

interface EnemyUnit {
  visual: EnemyVisualHandles;
  kind: EnemyKind;
  active: boolean;
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  hp: number;
  maxHp: number;
  hitFlash: number;
  halfWidth: number;
  halfHeight: number;
  speedZ: number;
  phase: number;
  shootCooldown: number;
  scoreValue: number;
}

interface ProjectileUnit {
  mesh: THREE.Group;
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  homing: boolean;
  damage: number;
  pierce: number;
  radius: number;
}

interface PowerUpUnit {
  group: THREE.Group;
  active: boolean;
  kind: PowerUpType;
  z: number;
  x: number;
  y: number;
  scoreGroup: THREE.Group;
  heartGroup: THREE.Group;
  boostGroup: THREE.Group;
  shieldGroup: THREE.Group;
  weaponGroup: THREE.Group;
}

interface ParticleUnit {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface WorldCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onGameOver: (summary: GameOverSummary) => void;
  onAnnounce: (text: string) => void;
}

const CORRIDOR_HALF_WIDTH = 15.5;
const GROUND_Y = -2.8;
const PLANE_BASE_Y = 0.2;
const PLANE_MIN_Y = GROUND_Y + 1.55;
const PLANE_MAX_Y = 5.4;
const SPAWN_Z = -140;
const DESPAWN_Z = 18;

// Invariant player collision box (never changes across Tier 1..4 model upgrades)
const PLAYER_HITBOX_X = 1.05;
const PLAYER_HITBOX_Y = 0.85;
const PLAYER_HITBOX_Z = 1.15;

export function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createGroundGridTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= size; i += 64) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 32; i < size; i += 64) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 28);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0.48)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.18)');
    grad.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class FlightWorldEngine {
  private container: HTMLElement;
  private callbacks: WorldCallbacks;
  public input: FlightInputController;

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;

  private groundMesh: THREE.Mesh;
  private groundMat: THREE.MeshStandardMaterial;
  private groundTex: THREE.CanvasTexture;
  private contactShadow: THREE.Mesh;
  private plane: PlaneRig;
  private envManager: MapEnvironmentManager;

  // Instanced horizon clouds
  private cloudMesh: THREE.InstancedMesh;
  private cloudData: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number }> = [];

  // Shared materials & pools
  private combatMats: SharedCombatMaterials;
  private obstacleBodyMat: THREE.MeshStandardMaterial;
  private obstacleAccentMat: THREE.MeshStandardMaterial;
  private gateFrameMat: THREE.MeshStandardMaterial;
  private cloudMat: THREE.MeshStandardMaterial;

  private obstacles: ObstacleUnit[] = [];
  private obstacleGeos: THREE.BufferGeometry[] = [];
  private enemies: EnemyUnit[] = [];
  private playerBullets: ProjectileUnit[] = [];
  private enemyBullets: ProjectileUnit[] = [];
  private setPlayerBulletVisual!: (group: THREE.Group, weapon: WeaponType) => void;
  private lockReticle!: { group: THREE.Group; dispose: () => void };
  private bulletDisposables: Array<{ dispose: () => void }> = [];

  private powerUps: PowerUpUnit[] = [];
  private powerUpDisposables: Array<{ dispose: () => void }> = [];
  private particles: ParticleUnit[] = [];
  private particleGeo!: THREE.BufferGeometry;

  // Simulation state
  private runningState: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private gameMode: GameMode = 'standard';
  private currentThemeId: ThemeId = 'space';
  private highContrast = false;
  private reducedMotion = false;
  private graphicsQuality: GraphicsQuality = 'auto';
  private bestScore = 0;

  private planeStats: EffectivePlaneStats = computeEffectivePlaneStats(DEFAULT_PROGRESS);
  private currentModelTier: PlaneModelTier = 1;
  private planeX = 0;
  private planeY = PLANE_BASE_Y;
  private planeVelX = 0;
  private planeVelY = 0;
  private planeRoll = 0;
  private planePitch = 0;
  private forwardSpeed = 24;
  private distance = 0;
  private bonusScore = 0;
  private enemyKillPoints = 0;
  private combo = 0;
  private maxCombo = 0;
  private powerUpsCollected = 0;
  private enemiesDestroyed = 0;

  private lives = 2;
  private durability = 45;
  private armorRemaining = 0;
  private armorRechargeTimer = 0;
  private jetCharges = 0;
  private jetRechargeTimer = 0;
  private hasShield = false;
  private shieldActiveRemaining = 0;
  private turboRemaining = 0;
  private boosterActiveRemaining = 0;
  private weaponOverride: Exclude<WeaponType, 'signature'> | null = null;
  private weaponOverrideRemaining = 0;
  private invulnTimer = 0;
  private hitstopTimer = 0;
  private shakeIntensity = 0;

  private fireCooldown = 0;
  private burstShotsPending = 0;
  private burstStepTimer = 0;
  private spawnDistanceAccum = 0;
  private obstacleVariantCounter = 0;
  private enemySpawnAccum = 0;
  private nextBossDistance = 580;
  private powerUpSpawnAccum = 0;
  private powerUpCooldown = 0;
  private practiceStep = 0;
  private practiceTimer = 0;

  private frameId = 0;
  private disposed = false;
  private hudThrottle = 0;

  // Listeners
  private resizeObserver: ResizeObserver | null = null;
  private onResizeBound: () => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onTouchStartBound: (e: TouchEvent) => void;
  private onTouchMoveBound: (e: TouchEvent) => void;
  private onTouchEndBound: (e: TouchEvent) => void;

  constructor(container: HTMLElement, callbacks: WorldCallbacks, initialBestScore: number) {
    this.container = container;
    this.callbacks = callbacks;
    this.bestScore = initialBestScore;
    this.input = new FlightInputController();
    this.input.attach();

    this.isSoftwareGl = detectSoftwareWebGL();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      65,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      280,
    );
    this.camera.position.set(0, 2.8, 7.8);
    this.camera.lookAt(0, 0.4, -14);

    // Mandatory Studio PMREM reflections for metallic PBR materials
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 3-Point Warm/Cool Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0ea5e9, 0.9);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff3d6, 1.55);
    this.keyLight.position.set(16, 28, 14);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    const d = 24;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 80;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xbae6fd, 0.6);
    this.rimLight.position.set(-18, 12, -24);
    this.scene.add(this.rimLight);

    // Scrolling Ground
    this.groundTex = createGroundGridTexture();
    this.groundTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.groundMat = new THREE.MeshStandardMaterial({
      color: 0x0b1026,
      map: this.groundTex,
      roughness: 0.82,
      metalness: 0.1,
    });
    const groundGeo = new THREE.PlaneGeometry(240, 320);
    groundGeo.rotateX(-Math.PI / 2);
    this.groundMesh = new THREE.Mesh(groundGeo, this.groundMat);
    this.groundMesh.position.set(0, GROUND_Y, -90);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Contact shadow plane
    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(4.4, 3.8);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.position.set(0, GROUND_Y + 0.03, 0);
    this.scene.add(this.contactShadow);

    // 5-Map Environment Manager
    this.envManager = new MapEnvironmentManager(this.scene, this.groundMat, this.groundTex, GROUND_Y);

    // Procedural Plane
    this.plane = createProceduralPlane(this.isSoftwareGl, 'balance', 1);
    this.plane.root.position.set(0, PLANE_BASE_Y, 0);
    this.scene.add(this.plane.root);

    // Shared materials
    this.combatMats = createSharedCombatMaterials();
    this.obstacleBodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.48,
      metalness: 0.3,
    });
    this.obstacleAccentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.2,
    });
    this.gateFrameMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.4,
    });
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.82,
    });

    // Instanced sky clouds / nebula clusters
    const cloudGeo = new THREE.DodecahedronGeometry(1.4, 0);
    this.cloudMesh = new THREE.InstancedMesh(cloudGeo, this.cloudMat, 36);
    this.cloudMesh.frustumCulled = false;
    for (let i = 0; i < 36; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      this.cloudData.push({
        x: side * (12 + Math.random() * 48) + (Math.random() - 0.5) * 16,
        y: 8.5 + Math.random() * 14,
        z: -Math.random() * 180 + 10,
        sx: 1.6 + Math.random() * 2.4,
        sy: 0.65 + Math.random() * 0.7,
        sz: 1.4 + Math.random() * 1.8,
      });
    }
    this.syncInstancedClouds();
    this.cloudMesh.computeBoundingSphere();
    this.scene.add(this.cloudMesh);

    // Initialize Object Pools
    this.initObstaclePool(22);
    this.initEnemyPool(14);
    this.initProjectilePools();
    this.initPowerUpPool(10);
    this.initParticlePool(56);

    this.applyTheme('space');

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Listeners
    this.onResizeBound = () => this.handleResize();
    this.onKeyDownBound = (e: KeyboardEvent) => {
      if (this.runningState !== 'playing') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK' || e.code === 'KeyE') {
        if (this.planeStats.maxJetCharges > 0) {
          e.preventDefault();
          this.activateBooster();
        }
      } else if (e.code === 'KeyQ' || e.code === 'KeyL' || e.code === 'KeyC') {
        e.preventDefault();
        this.activateShield();
      }
    };
    this.onTouchStartBound = (e: TouchEvent) => {
      if (this.runningState === 'playing' && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        this.input.handleTouchStart(t.clientX, t.clientY, t.identifier);
      }
    };
    this.onTouchMoveBound = (e: TouchEvent) => {
      if (this.runningState === 'playing') {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          this.input.handleTouchMove(t.clientX, t.clientY, t.identifier);
        }
      }
    };
    this.onTouchEndBound = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        this.input.handleTouchEnd(e.changedTouches[i].identifier);
      }
    };

    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('orientationchange', this.onResizeBound);
    document.addEventListener('fullscreenchange', this.onResizeBound);
    window.visualViewport?.addEventListener('resize', this.onResizeBound);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }
    window.addEventListener('keydown', this.onKeyDownBound);
    this.renderer.domElement.addEventListener('touchstart', this.onTouchStartBound, { passive: true });
    this.renderer.domElement.addEventListener('touchmove', this.onTouchMoveBound, { passive: true });
    this.renderer.domElement.addEventListener('touchend', this.onTouchEndBound);
    this.renderer.domElement.addEventListener('touchcancel', this.onTouchEndBound);

    this.clock.start();
    this.tick();
  }

  private initObstaclePool(count: number): void {
    const pedestalGeo = new THREE.CylinderGeometry(1.15, 1.45, 0.7, 8);
    pedestalGeo.translate(0, 0.35, 0);
    const towerGeo = new THREE.BoxGeometry(1.6, 5.4, 1.6);
    towerGeo.translate(0, 3.0, 0);
    const beaconGeo = new THREE.OctahedronGeometry(0.65, 0);
    beaconGeo.translate(0, 6.1, 0);
    const archBarGeo = new THREE.BoxGeometry(1, 0.65, 1.0);
    const bladeGeo = new THREE.BoxGeometry(0.32, 3.6, 0.16);
    const hubGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.7, 12);
    hubGeo.rotateX(Math.PI / 2);

    const rockGeo = new THREE.DodecahedronGeometry(1.15, 1);
    const treeTrunkGeo = new THREE.CylinderGeometry(0.32, 0.48, 3.2, 7);
    const treeCrownGeo = new THREE.ConeGeometry(1.85, 3.4, 7);
    const buildingGeo = new THREE.BoxGeometry(2.1, 7.6, 2.1);
    const buildingWinGeo = new THREE.PlaneGeometry(1.5, 6.2);
    const futuristicCoreGeo = new THREE.CylinderGeometry(0.55, 0.85, 6.0, 6);
    const futuristicRingGeo = new THREE.TorusGeometry(1.25, 0.12, 8, 16);
    futuristicRingGeo.rotateX(Math.PI / 2);

    this.obstacleGeos.push(
      pedestalGeo,
      towerGeo,
      beaconGeo,
      archBarGeo,
      bladeGeo,
      hubGeo,
      rockGeo,
      treeTrunkGeo,
      treeCrownGeo,
      buildingGeo,
      buildingWinGeo,
      futuristicCoreGeo,
      futuristicRingGeo,
    );

    const sharedGeos = {
      pedestalGeo,
      towerGeo,
      beaconGeo,
      archBarGeo,
      bladeGeo,
      hubGeo,
      rockGeo,
      treeTrunkGeo,
      treeCrownGeo,
      buildingGeo,
      buildingWinGeo,
      futuristicCoreGeo,
      futuristicRingGeo,
    };

    for (let i = 0; i < count; i++) {
      const visual = buildThemedObstacleVisuals(
        this.combatMats,
        this.obstacleBodyMat,
        this.obstacleAccentMat,
        this.gateFrameMat,
        sharedGeos,
      );
      visual.root.position.y = GROUND_Y;
      this.scene.add(visual.root);

      this.obstacles.push({
        visual,
        kind: 'pillar',
        active: false,
        destructible: true,
        hp: 30,
        maxHp: 30,
        hitFlash: 0,
        z: 0,
        x: 0,
        y: GROUND_Y,
        baseX: 0,
        halfWidth: 1.15,
        halfHeight: 3.4,
        gateGapHalf: 0,
        gateScored: false,
        oscPhase: 0,
        oscAmp: 0,
        oscSpeed: 0,
        spinSpeed: 0,
      });
    }
  }

  private initEnemyPool(count: number): void {
    for (let i = 0; i < count; i++) {
      const visual = createEnemyPoolUnit(this.combatMats);
      this.scene.add(visual.root);
      this.enemies.push({
        visual,
        kind: 'drone',
        active: false,
        x: 0,
        y: 1.0,
        z: 0,
        baseX: 0,
        baseY: 1.0,
        hp: 25,
        maxHp: 25,
        hitFlash: 0,
        halfWidth: 1.1,
        halfHeight: 0.9,
        speedZ: 8,
        phase: 0,
        shootCooldown: 2,
        scoreValue: 8,
      });
    }
  }

  private initProjectilePools(): void {
    const pPool = createProjectileMeshPool(this.scene, 96, false);
    this.setPlayerBulletVisual = pPool.setWeaponVisual;
    this.bulletDisposables.push(pPool);
    for (const group of pPool.groups) {
      this.playerBullets.push({
        mesh: group,
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: -190,
        speed: 190,
        homing: false,
        damage: 18,
        pierce: 1,
        radius: 0.65,
      });
    }

    const ePool = createProjectileMeshPool(this.scene, 28, true);
    this.bulletDisposables.push(ePool);
    for (const group of ePool.groups) {
      this.enemyBullets.push({
        mesh: group,
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 42,
        speed: 42,
        homing: false,
        damage: OBSTACLE_DAMAGE.small,
        pierce: 1,
        radius: 0.5,
      });
    }

    this.lockReticle = createLockReticle();
    this.scene.add(this.lockReticle.group);
    this.bulletDisposables.push(this.lockReticle);
  }

  private initPowerUpPool(count: number): void {
    // 1. Skor (Golden 5-pointed Star + Coin Ring)
    const starShape = new THREE.Shape();
    for (let s = 0; s < 10; s++) {
      const r = s % 2 === 0 ? 0.68 : 0.3;
      const angle = (s * Math.PI) / 5 - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (s === 0) starShape.moveTo(px, py);
      else starShape.lineTo(px, py);
    }
    starShape.closePath();
    const starGeo = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    starGeo.center();
    const coinRingGeo = new THREE.TorusGeometry(0.95, 0.09, 10, 24);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 1.0,
      roughness: 0.22,
      metalness: 0.55,
    });
    const goldRimMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.4,
    });

    // 2. Hati (Extruded 3D Ruby Heart + Halo Ring)
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, -0.52);
    heartShape.bezierCurveTo(-0.55, -0.15, -0.78, 0.32, -0.44, 0.6);
    heartShape.bezierCurveTo(-0.2, 0.78, 0, 0.55, 0, 0.38);
    heartShape.bezierCurveTo(0, 0.55, 0.2, 0.78, 0.44, 0.6);
    heartShape.bezierCurveTo(0.78, 0.32, 0.55, -0.15, 0, -0.52);
    const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
    heartGeo.center();
    const heartHaloGeo = new THREE.TorusGeometry(0.98, 0.075, 10, 24);
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.05,
      roughness: 0.2,
      metalness: 0.2,
    });
    const heartRimMat = new THREE.MeshStandardMaterial({
      color: 0xfda4af,
      emissive: 0xfb7185,
      emissiveIntensity: 0.65,
      roughness: 0.3,
    });

    // 3. Boost (3D Lightning Bolt + Electric Speed Ring)
    const boltShape = new THREE.Shape();
    boltShape.moveTo(0.14, 0.72);
    boltShape.lineTo(-0.38, 0.05);
    boltShape.lineTo(0.02, 0.05);
    boltShape.lineTo(-0.18, -0.72);
    boltShape.lineTo(0.42, -0.02);
    boltShape.lineTo(0.04, -0.02);
    boltShape.closePath();
    const boltGeo = new THREE.ExtrudeGeometry(boltShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    boltGeo.center();
    const boostRingGeo = new THREE.TorusGeometry(1.02, 0.09, 10, 24);
    const boostMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 1.25,
      roughness: 0.2,
      metalness: 0.3,
    });
    const boostRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.9,
      roughness: 0.25,
    });

    // 4. Perisai (3D Heraldic Shield + Hexagonal Frame)
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 0.66);
    shieldShape.lineTo(0.56, 0.44);
    shieldShape.lineTo(0.48, -0.18);
    shieldShape.lineTo(0, -0.68);
    shieldShape.lineTo(-0.48, -0.18);
    shieldShape.lineTo(-0.56, 0.44);
    shieldShape.closePath();
    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    shieldGeo.center();
    const hexRingGeo = new THREE.TorusGeometry(1.02, 0.09, 8, 6);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x14b8a6,
      emissive: 0x0d9488,
      emissiveIntensity: 1.05,
      roughness: 0.22,
      metalness: 0.35,
    });
    const shieldRimMat = new THREE.MeshStandardMaterial({
      color: 0x99f6e4,
      emissive: 0x2dd4bf,
      emissiveIntensity: 0.75,
      roughness: 0.25,
    });

    // 5. Item Senjata (3D Twin-Barrel Plasma Core + Rotating Diamond Frame)
    const weaponCoreGeo = new THREE.OctahedronGeometry(0.55, 0);
    const weaponBarrelGeo = new THREE.CylinderGeometry(0.11, 0.11, 1.05, 8);
    weaponBarrelGeo.rotateX(Math.PI / 2);
    const weaponRingGeo = new THREE.TorusGeometry(1.04, 0.09, 8, 4);
    const weaponMat = new THREE.MeshStandardMaterial({
      color: 0xe879f9,
      emissive: 0xd946ef,
      emissiveIntensity: 1.25,
      roughness: 0.2,
      metalness: 0.4,
    });
    const weaponRimMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xfacc15,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.55,
    });

    this.powerUpDisposables.push(
      starGeo,
      coinRingGeo,
      goldMat,
      goldRimMat,
      heartGeo,
      heartHaloGeo,
      heartMat,
      heartRimMat,
      boltGeo,
      boostRingGeo,
      boostMat,
      boostRingMat,
      shieldGeo,
      hexRingGeo,
      shieldMat,
      shieldRimMat,
      weaponCoreGeo,
      weaponBarrelGeo,
      weaponRingGeo,
      weaponMat,
      weaponRimMat,
    );

    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      group.visible = false;

      const scoreGroup = new THREE.Group();
      scoreGroup.add(new THREE.Mesh(starGeo, goldMat), new THREE.Mesh(coinRingGeo, goldRimMat));

      const heartGroup = new THREE.Group();
      heartGroup.add(new THREE.Mesh(heartGeo, heartMat), new THREE.Mesh(heartHaloGeo, heartRimMat));

      const boostGroup = new THREE.Group();
      const boostRing = new THREE.Mesh(boostRingGeo, boostRingMat);
      boostRing.rotation.x = Math.PI / 6;
      boostGroup.add(new THREE.Mesh(boltGeo, boostMat), boostRing);

      const shieldGroup = new THREE.Group();
      shieldGroup.add(new THREE.Mesh(shieldGeo, shieldMat), new THREE.Mesh(hexRingGeo, shieldRimMat));

      const weaponGroup = new THREE.Group();
      const wCore = new THREE.Mesh(weaponCoreGeo, weaponMat);
      const wBarrelL = new THREE.Mesh(weaponBarrelGeo, weaponRimMat);
      wBarrelL.position.set(-0.34, 0.14, 0.1);
      const wBarrelR = new THREE.Mesh(weaponBarrelGeo, weaponRimMat);
      wBarrelR.position.set(0.34, 0.14, 0.1);
      const wRing = new THREE.Mesh(weaponRingGeo, weaponRimMat);
      weaponGroup.add(wCore, wBarrelL, wBarrelR, wRing);

      group.add(scoreGroup, heartGroup, boostGroup, shieldGroup, weaponGroup);
      this.scene.add(group);

      this.powerUps.push({
        group,
        active: false,
        kind: 'bonus',
        z: 0,
        x: 0,
        y: PLANE_BASE_Y,
        scoreGroup,
        heartGroup,
        boostGroup,
        shieldGroup,
        weaponGroup,
      });
    }
  }

  private initParticlePool(count: number): void {
    this.particleGeo = new THREE.OctahedronGeometry(0.18, 0);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
        active: false,
      });
    }
  }

  private emitParticles(x: number, y: number, z: number, colorHex: number, count = 12, scaleMult = 1): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.life = 0;
        p.maxLife = 0.36 + Math.random() * 0.32;
        p.mesh.visible = true;
        p.mesh.position.set(x, y, z);
        p.mesh.scale.setScalar(scaleMult);
        (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
        const angle = Math.random() * Math.PI * 2;
        const spd = (2.8 + Math.random() * 6.5) * scaleMult;
        p.vx = Math.cos(angle) * spd;
        p.vy = (Math.random() - 0.25) * spd;
        p.vz = (Math.random() - 0.5) * spd;
        spawned++;
      }
    }
  }

  private syncInstancedClouds(): void {
    for (let i = 0; i < this.cloudData.length; i++) {
      const c = this.cloudData[i];
      _dummy.position.set(c.x, c.y, c.z);
      _dummy.rotation.set(0, i * 0.6, 0);
      _dummy.scale.set(c.sx, c.sy, c.sz);
      _dummy.updateMatrix();
      this.cloudMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.cloudMesh.instanceMatrix.needsUpdate = true;
  }

  public setControlButton(action: ControlActionKey, pressed: boolean): void {
    this.input.setControlButton(action, pressed);
  }

  public applyTheme(rawThemeId: string): void {
    const themeId = normalizeMapId(rawThemeId);
    this.currentThemeId = themeId;
    const t = ENVIRONMENT_THEMES[themeId];

    this.scene.background = new THREE.Color(t.skyHex);
    this.scene.fog = new THREE.FogExp2(t.fogHex, t.fogDensity);

    this.keyLight.color.setHex(t.sunHex);
    this.keyLight.intensity = t.sunIntensity;
    this.hemiLight.color.setHex(t.hemiSkyHex);
    this.hemiLight.groundColor.setHex(t.hemiGroundHex);
    this.hemiLight.intensity = t.hemiIntensity;
    this.rimLight.color.setHex(t.rimHex);

    this.groundMat.color.setHex(this.highContrast ? 0x0f172a : t.groundHex);
    this.cloudMat.color.setHex(t.cloudHex);
    this.cloudMat.opacity = themeId === 'space' ? 0.28 : 0.82;

    this.envManager.setMap(themeId);

    if (this.highContrast) {
      this.obstacleBodyMat.color.setHex(0x000000);
      this.obstacleAccentMat.color.setHex(0xffea00);
      this.obstacleAccentMat.emissive.setHex(0xffea00);
      this.obstacleAccentMat.emissiveIntensity = 1.35;
      this.gateFrameMat.color.setHex(0x00ffff);
      this.gateFrameMat.emissive.setHex(0x00ffff);
      this.gateFrameMat.emissiveIntensity = 1.0;
    } else {
      this.obstacleBodyMat.color.setHex(t.obstacleHex);
      this.obstacleAccentMat.color.setHex(t.obstacleAccentHex);
      this.obstacleAccentMat.emissive.setHex(t.obstacleAccentHex);
      this.obstacleAccentMat.emissiveIntensity = 0.72;
      this.gateFrameMat.color.setHex(parseInt(t.uiAccentCss.slice(1), 16));
      this.gateFrameMat.emissive.setHex(t.obstacleAccentHex);
      this.gateFrameMat.emissiveIntensity = 0.4;
    }
  }

  public applySettings(
    settings: GameSettings,
    a11y: { highContrast: boolean; reducedMotion: boolean },
  ): void {
    this.input.configure({
      sensitivity: settings.steeringSensitivity,
    });

    soundEngine.setVolumes(settings.musicVolume, settings.sfxVolume, settings.muted);

    this.highContrast = a11y.highContrast;
    this.reducedMotion = a11y.reducedMotion;
    this.graphicsQuality = settings.graphicsQuality;

    if (!this.isSoftwareGl) {
      if (settings.graphicsQuality === 'light') {
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
        this.keyLight.castShadow = false;
      } else {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.keyLight.castShadow = true;
      }
    }

    if (this.runningState === 'menu') {
      this.applyTheme(settings.selectedTheme);
    } else {
      this.applyTheme(this.currentThemeId);
    }
  }

  public updateBestScore(best: number): void {
    this.bestScore = best;
  }

  public setPlaneType(planeId: PlaneId, modelTier: PlaneModelTier = this.currentModelTier): void {
    if (this.planeStats.planeId === planeId && this.currentModelTier === modelTier) return;
    this.currentModelTier = modelTier;
    this.planeStats = { ...this.planeStats, planeId, modelTier };
    this.scene.remove(this.plane.root);
    this.plane.dispose();
    this.plane = createProceduralPlane(this.isSoftwareGl, planeId, modelTier);
    this.plane.root.position.set(this.planeX, this.planeY, 0);
    this.scene.add(this.plane.root);
  }

  public activateBooster(): boolean {
    if (this.runningState !== 'playing') return false;
    if (this.planeStats.maxJetCharges <= 0 || this.jetCharges <= 0) return false;
    if (this.boosterActiveRemaining > 0) return false;

    this.jetCharges -= 1;
    this.boosterActiveRemaining = this.planeStats.boosterDuration;
    if (this.jetRechargeTimer <= 0) {
      this.jetRechargeTimer = this.planeStats.rechargeIntervalSec;
    }
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.18);
    soundEngine.playBooster();
    this.emitParticles(this.planeX, this.planeY, 1.4, 0xf97316, 14);
    this.callbacks.onAnnounce(`Jet Booster aktif! Sisa muatan Jet: ${this.jetCharges}.`);
    this.emitCurrentHud();
    return true;
  }

  public activateShield(): boolean {
    if (this.runningState !== 'playing') return false;
    if (this.hasShield) return false;
    if (this.armorRemaining <= 0) return false;

    this.armorRemaining -= 1;
    if (this.armorRechargeTimer <= 0) {
      this.armorRechargeTimer = this.planeStats.rechargeIntervalSec;
    }
    this.hasShield = true;
    this.shieldActiveRemaining = 7.0;
    this.plane.armorMesh.visible = this.armorRemaining > 0;
    soundEngine.playShieldActivate();
    this.emitParticles(this.planeX, this.planeY, 0, 0x2dd4bf, 14);
    this.callbacks.onAnnounce(`Perisai energi diaktifkan! Sisa muatan pelindung: ${this.armorRemaining}.`);
    this.emitCurrentHud();
    return true;
  }

  public startSession(mode: GameMode, settings: GameSettings, planeStats: EffectivePlaneStats): void {
    soundEngine.unlock();
    soundEngine.startDynamicMusic('flight');
    this.input.clearAll();

    this.setPlaneType(planeStats.planeId, planeStats.modelTier);
    this.planeStats = planeStats;

    this.gameMode = mode;
    this.runningState = 'playing';

    if (settings.randomThemePerSession) {
      const nextTheme = pickRandomTheme(this.currentThemeId);
      this.applyTheme(nextTheme);
    } else {
      this.applyTheme(settings.selectedTheme);
    }

    this.planeX = 0;
    this.planeY = PLANE_BASE_Y;
    this.planeVelX = 0;
    this.planeVelY = 0;
    this.planeRoll = 0;
    this.planePitch = 0;
    this.forwardSpeed = (mode === 'practice' ? 20 : 24) * planeStats.speedMultiplier;
    this.distance = 0;
    this.bonusScore = 0;
    this.enemyKillPoints = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.powerUpsCollected = 0;
    this.enemiesDestroyed = 0;
    this.lives = planeStats.maxLives;
    this.durability = planeStats.maxDurabilityPerLife;
    this.armorRemaining = planeStats.maxArmorCharges;
    this.armorRechargeTimer = 0;
    this.jetCharges = planeStats.maxJetCharges;
    this.jetRechargeTimer = 0;
    this.hasShield = false;
    this.shieldActiveRemaining = 0;
    this.turboRemaining = 0;
    this.boosterActiveRemaining = 0;
    this.weaponOverride = null;
    this.weaponOverrideRemaining = 0;
    this.invulnTimer = 0.7;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;
    this.fireCooldown = 0;
    this.burstShotsPending = 0;
    this.burstStepTimer = 0;
    this.spawnDistanceAccum = 0;
    this.enemySpawnAccum = 0;
    this.nextBossDistance = 580;
    this.powerUpSpawnAccum = 0;
    this.powerUpCooldown = 1.2;
    this.practiceStep = 0;
    this.practiceTimer = 0;

    this.lockReticle.group.visible = false;
    this.plane.shieldMesh.visible = false;
    this.plane.armorMesh.visible = this.armorRemaining > 0;
    this.plane.root.visible = true;

    for (const ob of this.obstacles) {
      ob.active = false;
      ob.visual.root.visible = false;
    }
    for (const en of this.enemies) {
      en.active = false;
      en.visual.root.visible = false;
    }
    for (const b of this.playerBullets) {
      b.active = false;
      b.mesh.visible = false;
    }
    for (const eb of this.enemyBullets) {
      eb.active = false;
      eb.mesh.visible = false;
    }
    for (const pu of this.powerUps) {
      pu.active = false;
      pu.group.visible = false;
    }

    if (mode === 'practice') {
      this.spawnObstacle('gate', -72, 0);
      this.spawnEnemy('drone', -96, 4.5, 1.2);
      this.spawnPowerUp('bonus', -115, -3.5);
      this.callbacks.onAnnounce(
        'Mode Latihan dimulai. Gunakan tombol Kiri/Kanan/Naik/Turun dan tombol Tembak!',
      );
    } else {
      this.spawnObstacle('gate', -75, 0);
      this.spawnEnemy('drone', -112, 3.2, 1.0);
      this.callbacks.onAnnounce(
        `Penerbangan dimulai dengan ${planeStats.name} di ${ENVIRONMENT_THEMES[this.currentThemeId].name}.`,
      );
    }

    this.emitCurrentHud();
  }

  public pause(): void {
    if (this.runningState === 'playing') {
      this.runningState = 'paused';
      this.input.clearAll();
      soundEngine.stopWind();
    }
  }

  public resume(): void {
    if (this.runningState === 'paused') {
      this.runningState = 'playing';
      this.input.clearAll();
      this.clock.getDelta();
      soundEngine.startDynamicMusic('flight');
    }
  }

  public returnToMenu(): void {
    this.runningState = 'menu';
    this.input.clearAll();
    this.hasShield = false;
    this.shieldActiveRemaining = 0;
    this.armorRemaining = 0;
    this.armorRechargeTimer = 0;
    this.jetCharges = 0;
    this.jetRechargeTimer = 0;
    this.turboRemaining = 0;
    this.boosterActiveRemaining = 0;
    this.weaponOverride = null;
    this.weaponOverrideRemaining = 0;
    this.burstShotsPending = 0;
    this.burstStepTimer = 0;
    this.lockReticle.group.visible = false;
    this.planeY = PLANE_BASE_Y;
    this.plane.shieldMesh.visible = false;
    this.plane.armorMesh.visible = false;
    this.plane.root.visible = true;

    for (const ob of this.obstacles) {
      ob.active = false;
      ob.visual.root.visible = false;
    }
    for (const en of this.enemies) {
      en.active = false;
      en.visual.root.visible = false;
    }
    for (const b of this.playerBullets) {
      b.active = false;
      b.mesh.visible = false;
    }
    for (const eb of this.enemyBullets) {
      eb.active = false;
      eb.mesh.visible = false;
    }
    for (const pu of this.powerUps) {
      pu.active = false;
      pu.group.visible = false;
    }
    soundEngine.startDynamicMusic('menu');
  }

  private getEffectiveWeaponMode(): Exclude<WeaponType, 'signature'> {
    if (this.weaponOverride && this.weaponOverrideRemaining > 0) {
      return this.weaponOverride;
    }
    return resolveEffectiveWeapon(this.planeStats.planeId, this.planeStats.weaponType);
  }

  private findBestHomingTarget(fromX: number, fromY: number, fromZ: number): { x: number; y: number; z: number } | null {
    let bestScore = Infinity;
    let bestTarget: { x: number; y: number; z: number } | null = null;

    for (const en of this.enemies) {
      if (!en.active || en.z >= fromZ - 1.5 || en.z < -140) continue;
      const dx = en.x - fromX;
      const dy = en.y - fromY;
      const dz = fromZ - en.z;
      const score = dx * dx + dy * dy + dz * 0.25;
      if (score < bestScore) {
        bestScore = score;
        bestTarget = { x: en.x, y: en.y, z: en.z };
      }
    }

    if (bestTarget) return bestTarget;

    // Fallback to nearest destructible obstacle if no enemy is ahead
    for (const ob of this.obstacles) {
      if (!ob.active || !ob.destructible || ob.z >= fromZ - 2.0 || ob.z < -130) continue;
      const obCenterY = GROUND_Y + ob.halfHeight * 0.52;
      const dx = ob.x - fromX;
      const dy = obCenterY - fromY;
      const dz = fromZ - ob.z;
      const score = dx * dx + dy * dy + dz * 0.35;
      if (score < bestScore) {
        bestScore = score;
        bestTarget = { x: ob.x, y: obCenterY, z: ob.z };
      }
    }

    return bestTarget;
  }

  private spawnPlayerBolt(
    mode: Exclude<WeaponType, 'signature'>,
    offsetX: number,
    offsetY: number,
    angleX: number,
    angleY: number,
    homing = false,
  ): void {
    const b = this.playerBullets.find((item) => !item.active);
    if (!b) return;
    const weaponDef = WEAPON_CATALOG[mode];
    const pitchSlopeY = Math.sin(this.planePitch) * 0.55;
    const yawSlopeX = -Math.sin(this.plane.bodyGroup.rotation.y) * 0.45;
    const spd = weaponDef.projectileSpeed + this.forwardSpeed;

    b.active = true;
    b.homing = homing;
    b.speed = spd;
    b.x = this.planeX + offsetX;
    b.y = this.planeY + offsetY;
    b.z = -2.2;
    b.vx = (angleX + yawSlopeX) * spd;
    b.vy = (angleY + pitchSlopeY) * spd;
    b.vz = -spd;
    b.damage = weaponDef.damagePerBolt;
    b.pierce = mode === 'laser' ? 3 : 1;
    b.radius = mode === 'laser' ? 0.85 : 0.72;

    this.setPlayerBulletVisual(b.mesh, mode);
    b.mesh.position.set(b.x, b.y, b.z);
    b.mesh.rotation.set(angleY + pitchSlopeY, -(angleX + yawSlopeX), 0);
    b.mesh.visible = true;
  }

  private fireBurstRound(): void {
    soundEngine.playShoot('burst');
    this.spawnPlayerBolt('burst', -0.75, -0.06, -0.015, 0, false);
    this.spawnPlayerBolt('burst', 0.75, -0.06, 0.015, 0, false);
  }

  private firePlayerWeapon(): void {
    const mode = this.getEffectiveWeaponMode();
    const weaponDef = WEAPON_CATALOG[mode];
    this.fireCooldown = weaponDef.fireIntervalSec;

    if (mode === 'burst') {
      // Vortex Jet / Burst Fire: 3 rapid consecutive volleys
      this.fireBurstRound();
      this.burstShotsPending = 2;
      this.burstStepTimer = 0.055;
      return;
    }

    soundEngine.playShoot(mode);

    if (mode === 'single') {
      this.spawnPlayerBolt(mode, 0, -0.05, 0, 0);
    } else if (mode === 'rapid') {
      this.spawnPlayerBolt(mode, -0.58, -0.06, 0, 0);
      this.spawnPlayerBolt(mode, 0.58, -0.06, 0, 0);
    } else if (mode === 'double') {
      this.spawnPlayerBolt(mode, -0.92, -0.08, 0, 0);
      this.spawnPlayerBolt(mode, 0.92, -0.08, 0, 0);
    } else if (mode === 'triple') {
      this.spawnPlayerBolt(mode, 0, -0.05, 0, 0);
      this.spawnPlayerBolt(mode, -0.85, -0.08, -0.1, 0);
      this.spawnPlayerBolt(mode, 0.85, -0.08, 0.1, 0);
    } else if (mode === 'spread') {
      // Aegis Titan / Spread Shot: 5 wide fiery plasma bolts
      this.spawnPlayerBolt(mode, 0, -0.05, 0, 0);
      this.spawnPlayerBolt(mode, -0.55, -0.07, -0.1, 0.02);
      this.spawnPlayerBolt(mode, 0.55, -0.07, 0.1, 0.02);
      this.spawnPlayerBolt(mode, -1.05, -0.09, -0.2, -0.02);
      this.spawnPlayerBolt(mode, 1.05, -0.09, 0.2, -0.02);
    } else if (mode === 'autolock') {
      // Aero Prime / Auto Lock: twin guided homing plasma missiles
      this.spawnPlayerBolt(mode, -0.82, -0.08, -0.05, 0.02, true);
      this.spawnPlayerBolt(mode, 0.82, -0.08, 0.05, 0.02, true);
    } else {
      // Laser Shot
      this.spawnPlayerBolt(mode, -0.55, -0.06, 0, 0);
      this.spawnPlayerBolt(mode, 0.55, -0.06, 0, 0);
    }
  }

  private spawnEnemy(forcedKind?: EnemyKind, forcedZ?: number, forcedX?: number, forcedY?: number): void {
    const unit = this.enemies.find((e) => !e.active);
    if (!unit) return;

    const difficulty = this.getDifficultyLevel();
    let kind: EnemyKind = forcedKind ?? 'drone';
    if (!forcedKind) {
      const r = Math.random();
      if (difficulty >= 3 && r < 0.2) kind = 'warship';
      else if (difficulty >= 2 && r < 0.45) kind = 'interceptor';
      else if (r < 0.72) kind = 'fighter';
      else kind = 'drone';
    }

    unit.active = true;
    unit.kind = kind;
    unit.z = forcedZ ?? SPAWN_Z - 6;
    unit.baseX = forcedX ?? (Math.random() - 0.5) * (CORRIDOR_HALF_WIDTH - 3.5) * 1.7;
    unit.baseY = forcedY ?? (0.2 + Math.random() * 3.8);
    unit.x = unit.baseX;
    unit.y = unit.baseY;
    unit.phase = Math.random() * Math.PI * 2;
    unit.hitFlash = 0;

    // Show matching composite model
    (['drone', 'fighter', 'interceptor', 'warship', 'boss'] as EnemyKind[]).forEach((k) => {
      unit.visual.modelByKind[k].visible = k === kind;
    });

    const scaleBoost = 1 + Math.min(0.45, (difficulty - 1) * 0.08);
    if (kind === 'boss') {
      unit.maxHp = Math.round(320 + difficulty * 65);
      unit.halfWidth = 4.3;
      unit.halfHeight = 1.65;
      unit.speedZ = 1.5;
      unit.shootCooldown = 1.6;
      unit.scoreValue = 50;
      unit.baseY = 2.1;
      unit.y = 2.1;
    } else if (kind === 'warship') {
      unit.maxHp = Math.round(95 * scaleBoost);
      unit.halfWidth = 2.05;
      unit.halfHeight = 1.05;
      unit.speedZ = 4.5;
      unit.shootCooldown = 1.9;
      unit.scoreValue = 18;
    } else if (kind === 'interceptor') {
      unit.maxHp = Math.round(34 * scaleBoost);
      unit.halfWidth = 1.45;
      unit.halfHeight = 0.75;
      unit.speedZ = 15.0;
      unit.shootCooldown = 2.2;
      unit.scoreValue = 10;
    } else if (kind === 'fighter') {
      unit.maxHp = Math.round(44 * scaleBoost);
      unit.halfWidth = 1.65;
      unit.halfHeight = 0.85;
      unit.speedZ = 11.0;
      unit.shootCooldown = 1.75;
      unit.scoreValue = 9;
    } else {
      unit.maxHp = Math.round(22 * scaleBoost);
      unit.halfWidth = 1.05;
      unit.halfHeight = 0.9;
      unit.speedZ = 8.0;
      unit.shootCooldown = 2.6;
      unit.scoreValue = 5;
    }

    unit.hp = unit.maxHp;
    unit.visual.root.position.set(unit.x, unit.y, unit.z);
    unit.visual.root.visible = true;
  }

  private spawnEnemyBolt(ex: number, ey: number, ez: number, aimAtPlayer: boolean, spreadX = 0): void {
    const eb = this.enemyBullets.find((b) => !b.active);
    if (!eb) return;
    eb.active = true;
    eb.x = ex + spreadX;
    eb.y = ey;
    eb.z = ez + 1.8;

    const dz = Math.max(12, Math.abs(eb.z));
    const speedZ = 42 + this.forwardSpeed * 0.45;
    const travelTime = dz / speedZ;

    if (aimAtPlayer) {
      eb.vx = THREE.MathUtils.clamp((this.planeX - eb.x) / travelTime, -14, 14);
      eb.vy = THREE.MathUtils.clamp((this.planeY - eb.y) / travelTime, -8, 8);
    } else {
      eb.vx = spreadX * 1.4;
      eb.vy = 0;
    }
    eb.vz = speedZ;
    eb.mesh.position.set(eb.x, eb.y, eb.z);
    eb.mesh.visible = true;
  }

  private spawnObstacle(forcedKind?: ObstacleKind, forcedZ?: number, forcedX?: number): void {
    const unit = this.obstacles.find((o) => !o.active);
    if (!unit) return;

    const difficulty = this.getDifficultyLevel();
    let kind: ObstacleKind = forcedKind ?? 'pillar';

    if (!forcedKind) {
      const r = Math.random();
      if (this.gameMode === 'practice') {
        kind = r < 0.6 ? 'gate' : 'pillar';
      } else if (difficulty >= 4 && r < 0.18) {
        kind = 'turbine';
      } else if (difficulty >= 2 && r < 0.36) {
        kind = 'mover';
      } else if (r < 0.72) {
        kind = 'pillar';
      } else {
        kind = 'gate';
      }
    }

    this.obstacleVariantCounter += 1;
    applyObstacleStyleForMap(unit.visual, this.currentThemeId, this.obstacleVariantCounter, this.combatMats);

    unit.active = true;
    unit.kind = kind;
    unit.destructible = kind !== 'gate';
    unit.maxHp = kind === 'turbine' ? 65 : kind === 'mover' ? 45 : 35;
    unit.hp = unit.maxHp;
    unit.hitFlash = 0;
    unit.z = forcedZ ?? SPAWN_Z;
    unit.y = GROUND_Y;
    unit.gateScored = false;
    unit.oscPhase = Math.random() * Math.PI * 2;
    unit.oscAmp = kind === 'mover' ? 2.0 + Math.min(2.2, difficulty * 0.28) : 0;
    unit.oscSpeed = kind === 'mover' ? 1.15 + Math.min(1.1, difficulty * 0.12) : 0;
    unit.spinSpeed = kind === 'turbine' ? 1.7 + difficulty * 0.16 : 0;

    unit.visual.centerMesh.visible = kind === 'pillar' || kind === 'mover' || kind === 'turbine';
    unit.visual.spinnerGroup.visible = kind === 'turbine';
    unit.visual.leftPillar.visible = kind === 'gate';
    unit.visual.rightPillar.visible = kind === 'gate';
    unit.visual.topArch.visible = kind === 'gate';

    if (kind === 'gate') {
      const gapHalf = Math.max(3.2, 4.7 - difficulty * 0.12);
      unit.gateGapHalf = gapHalf;
      unit.halfWidth = gapHalf + 1.2;
      unit.halfHeight = 5.8;
      unit.baseX =
        forcedX ?? (Math.random() - 0.5) * (CORRIDOR_HALF_WIDTH - gapHalf - 2.0) * 1.5;
      unit.visual.leftPillar.position.x = -gapHalf - 0.85;
      unit.visual.rightPillar.position.x = gapHalf + 0.85;
      unit.visual.topArch.scale.x = (gapHalf + 0.85) * 2 + 1.6;
    } else {
      unit.gateGapHalf = 0;
      unit.halfWidth = kind === 'turbine' ? 1.55 : 1.25;
      unit.halfHeight = 6.2;
      const range = CORRIDOR_HALF_WIDTH - 2.2;
      unit.baseX = forcedX ?? (Math.random() - 0.5) * range * 2;
    }

    unit.x = unit.baseX;
    unit.visual.root.position.set(unit.x, GROUND_Y, unit.z);
    unit.visual.root.visible = true;
  }

  private spawnPowerUp(forcedKind?: PowerUpType, forcedZ?: number, forcedX?: number): void {
    const pu = this.powerUps.find((p) => !p.active);
    if (!pu) return;

    // Anti-clustering guard: prevent spawning too close behind any active item
    if (!forcedKind) {
      const targetZ = forcedZ ?? SPAWN_Z - 14;
      const tooClose = this.powerUps.some((other) => other.active && Math.abs(other.z - targetZ) < 28);
      if (tooClose) return;
    }

    let kind: PowerUpType;
    if (forcedKind) {
      kind = forcedKind;
    } else {
      // Exact Section A probabilities (Heart 2% | Shield 5% | Booster 5% | Score 10%)
      // + Weapon Pickup Item (8%), remaining 70% empty
      const r = Math.random();
      if (r < 0.02) {
        kind = 'heart';
      } else if (r < 0.07) {
        kind = 'shield';
      } else if (r < 0.12) {
        kind = 'turbo';
      } else if (r < 0.22) {
        kind = 'bonus';
      } else if (r < 0.30) {
        kind = 'weapon';
      } else {
        return;
      }
    }

    pu.active = true;
    pu.kind = kind;
    pu.z = forcedZ ?? SPAWN_Z - 14;
    pu.x = forcedX ?? (Math.random() - 0.5) * (CORRIDOR_HALF_WIDTH - 3) * 1.7;
    pu.y = PLANE_BASE_Y + 0.3 + Math.random() * 2.2;

    pu.scoreGroup.visible = kind === 'bonus';
    pu.heartGroup.visible = kind === 'heart';
    pu.boostGroup.visible = kind === 'turbo';
    pu.shieldGroup.visible = kind === 'shield';
    pu.weaponGroup.visible = kind === 'weapon';

    pu.group.position.set(pu.x, pu.y, pu.z);
    pu.group.visible = true;
    this.powerUpCooldown = 2.2;
  }

  private getDifficultyLevel(): number {
    if (this.gameMode === 'practice') return 1;
    return 1 + Math.floor(this.distance / 650);
  }

  private getPracticeGuidance(): { step: number; message: string } {
    if (this.practiceStep === 0) {
      return {
        step: 0,
        message: 'Langkah 1/3: Gunakan tombol Kiri/Kanan/Naik/Turun (atau WASD/Panah) untuk manuver!',
      };
    }
    if (this.practiceStep === 1) {
      return {
        step: 1,
        message: 'Langkah 2/3: Tekan tombol TEMBAK (atau Spasi) untuk menghancurkan drone & rintangan!',
      };
    }
    if (this.practiceStep === 2) {
      return {
        step: 2,
        message: 'Langkah 3/3: Lewati Gerbang (+2) & ambil item Bintang (+5), Perisai, Booster, atau Hati!',
      };
    }
    return {
      step: 3,
      message: 'Hebat! Semua kendali & senjata sudah dikuasai. Siap menuju mode Kompetisi!',
    };
  }

  private handleResize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const elapsed = this.clock.elapsedTime;

    this.updateScene(dt, elapsed);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateScene(dt: number, elapsed: number): void {
    // Update explosion/trail particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const t = 1 - p.life / p.maxLife;
      p.mesh.scale.setScalar(t);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = t;
    }

    if (this.runningState === 'menu') {
      const menuSpeed = 16;
      this.groundTex.offset.y -= dt * (menuSpeed * 0.045);
      this.planeX = Math.sin(elapsed * 0.55) * 3.4;
      this.planeY = PLANE_BASE_Y + Math.sin(elapsed * 1.4) * 0.35;
      this.planeRoll = Math.cos(elapsed * 0.55) * -0.22;

      this.plane.root.position.set(this.planeX, this.planeY, 0);
      this.plane.bodyGroup.rotation.z = this.planeRoll;
      this.plane.bodyGroup.rotation.x = Math.sin(elapsed * 1.4) * 0.04;
      this.contactShadow.position.x = this.planeX;

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.planeX * 0.35 + Math.sin(elapsed * 0.25) * 1.2, 3, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 2.7, 3, dt);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 60, 4, dt);
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(this.planeX * 0.4, 0.3, -14);

      this.scrollScenery(menuSpeed, dt);
      return;
    }

    if (this.runningState === 'paused' || this.runningState === 'gameover') {
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.5);
      this.applyCameraShake();
      return;
    }

    // Active Gameplay
    const { steer, vertical, shooting, source } = this.input.sample();
    const difficulty = this.getDifficultyLevel();

    if (this.gameMode === 'practice') {
      this.practiceTimer += dt;
      if (this.practiceStep === 0 && (Math.abs(steer) > 0.2 || Math.abs(vertical) > 0.2) && this.practiceTimer > 1.2) {
        this.practiceStep = 1;
        this.callbacks.onAnnounce(this.getPracticeGuidance().message);
      }
      if (this.practiceStep === 1 && shooting) {
        this.practiceStep = 2;
        this.callbacks.onAnnounce(this.getPracticeGuidance().message);
      }
    }

    // Timers
    if (this.turboRemaining > 0) this.turboRemaining = Math.max(0, this.turboRemaining - dt);
    if (this.boosterActiveRemaining > 0) this.boosterActiveRemaining = Math.max(0, this.boosterActiveRemaining - dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.powerUpCooldown > 0) this.powerUpCooldown = Math.max(0, this.powerUpCooldown - dt);
    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    if (this.shieldActiveRemaining > 0) {
      this.shieldActiveRemaining = Math.max(0, this.shieldActiveRemaining - dt);
      if (this.shieldActiveRemaining === 0 && this.hasShield) {
        this.hasShield = false;
      }
    }

    if (this.weaponOverrideRemaining > 0) {
      this.weaponOverrideRemaining = Math.max(0, this.weaponOverrideRemaining - dt);
      if (this.weaponOverrideRemaining === 0 && this.weaponOverride) {
        this.weaponOverride = null;
        this.callbacks.onAnnounce('Mode senjata khusus item selesai. Kembali ke senjata utama.');
      }
    }

    // Recharge Jet charges
    if (this.jetCharges < this.planeStats.maxJetCharges) {
      if (this.jetRechargeTimer <= 0) {
        this.jetRechargeTimer = this.planeStats.rechargeIntervalSec;
      } else {
        this.jetRechargeTimer -= dt;
        if (this.jetRechargeTimer <= 0) {
          this.jetCharges += 1;
          this.jetRechargeTimer =
            this.jetCharges < this.planeStats.maxJetCharges ? this.planeStats.rechargeIntervalSec : 0;
          this.emitParticles(this.planeX, this.planeY, 0.8, 0xf97316, 8);
        }
      }
    } else {
      this.jetRechargeTimer = 0;
    }

    // Recharge Pelindung / Shield charges
    if (this.armorRemaining < this.planeStats.maxArmorCharges) {
      if (this.armorRechargeTimer <= 0) {
        this.armorRechargeTimer = this.planeStats.rechargeIntervalSec;
      } else {
        this.armorRechargeTimer -= dt;
        if (this.armorRechargeTimer <= 0) {
          this.armorRemaining += 1;
          this.armorRechargeTimer =
            this.armorRemaining < this.planeStats.maxArmorCharges ? this.planeStats.rechargeIntervalSec : 0;
          this.emitParticles(this.planeX, this.planeY, 0, 0x14b8a6, 10);
        }
      }
    } else {
      this.armorRechargeTimer = 0;
    }

    // Burst Fire Queue & Weapon Trigger
    if (this.burstShotsPending > 0) {
      this.burstStepTimer -= dt;
      if (this.burstStepTimer <= 0) {
        this.fireBurstRound();
        this.burstShotsPending -= 1;
        this.burstStepTimer = 0.055;
      }
    } else if (shooting && this.fireCooldown <= 0) {
      this.firePlayerWeapon();
    }

    // Forward speed & 2D flight kinematics (smooth stabilization on release)
    const turboActive = this.turboRemaining > 0;
    const boosterActive = this.boosterActiveRemaining > 0;
    const baseTargetSpeed =
      (this.gameMode === 'practice' ? 20 : Math.min(48, 24 + (difficulty - 1) * 2.1)) *
      this.planeStats.speedMultiplier;
    const surgeFactor = turboActive || boosterActive ? 1.48 : 1.0;
    this.forwardSpeed = THREE.MathUtils.damp(this.forwardSpeed, baseTargetSpeed * surgeFactor, 4.5, dt);

    const maxLatSpeed = 18.0 * this.planeStats.lateralAgility;
    const maxVertSpeed = 11.5 * this.planeStats.lateralAgility;
    const responsiveness = 7.5 + this.planeStats.lateralAgility * 5.0;

    // Gentle release damping: faster response when holding input, smooth graceful settle when released
    const dampX = Math.abs(steer) > 0.05 ? responsiveness : 5.2;
    const dampY = Math.abs(vertical) > 0.05 ? responsiveness : 5.2;

    this.planeVelX = THREE.MathUtils.damp(this.planeVelX, steer * maxLatSpeed, dampX, dt);
    this.planeVelY = THREE.MathUtils.damp(this.planeVelY, vertical * maxVertSpeed, dampY, dt);

    this.planeX = THREE.MathUtils.clamp(
      this.planeX + this.planeVelX * dt,
      -(CORRIDOR_HALF_WIDTH - 1.5),
      CORRIDOR_HALF_WIDTH - 1.5,
    );
    this.planeY = THREE.MathUtils.clamp(this.planeY + this.planeVelY * dt, PLANE_MIN_Y, PLANE_MAX_Y);

    // Smooth banking & pitch (returns smoothly to 0 when keys/buttons released)
    const targetRoll = THREE.MathUtils.clamp(-this.planeVelX * 0.036, -0.68, 0.68);
    const targetPitch = THREE.MathUtils.clamp(this.planeVelY * 0.038, -0.42, 0.42);
    this.planeRoll = THREE.MathUtils.damp(this.planeRoll, targetRoll, 8.5, dt);
    this.planePitch = THREE.MathUtils.damp(this.planePitch, targetPitch, 8.5, dt);

    const bobY = this.reducedMotion ? 0 : Math.sin(elapsed * 3.4) * 0.06;
    this.plane.root.position.set(this.planeX, this.planeY + bobY, 0);
    this.plane.bodyGroup.rotation.z = this.planeRoll;
    this.plane.bodyGroup.rotation.x = this.planePitch;
    this.plane.bodyGroup.rotation.y = -this.planeVelX * 0.012;

    this.contactShadow.position.x = this.planeX;
    const altScale = THREE.MathUtils.clamp(1.15 - (this.planeY - PLANE_BASE_Y) * 0.1, 0.45, 1.25);
    this.contactShadow.scale.setScalar(altScale);

    // Post-hit invulnerability blink
    this.plane.bodyGroup.visible = this.invulnTimer > 0 ? Math.floor(this.invulnTimer * 18) % 2 === 0 : true;

    // Shield, Armor & Dual/Single Thruster Visuals
    this.plane.shieldMesh.visible = this.hasShield;
    if (this.hasShield) {
      this.plane.shieldMesh.rotation.y += dt * 1.4;
      this.plane.shieldMesh.rotation.x += dt * 0.7;
    }
    this.plane.armorMesh.visible = this.armorRemaining > 0 && !this.hasShield;
    if (this.plane.armorMesh.visible) {
      this.plane.armorMesh.rotation.z += dt * 0.9;
    }

    const boostFlame = turboActive || boosterActive;
    const flameZ = boostFlame ? 1.65 + Math.sin(elapsed * 28) * 0.25 : 0.45 + (this.forwardSpeed / 65) * 0.4;
    const flameXY = boostFlame ? 1.28 : 0.75;
    this.plane.turboFlame.scale.set(flameXY, flameXY, flameZ);
    if (this.plane.turboFlameRight) {
      this.plane.turboFlameRight.scale.set(flameXY, flameXY, flameZ);
    }

    // Distance & Ground Scroll
    const dz = this.forwardSpeed * dt;
    this.distance += dz;
    this.groundTex.offset.y -= dt * (this.forwardSpeed * 0.048);

    const normIntensity = THREE.MathUtils.clamp((this.forwardSpeed - 22) / 36, 0, 1);
    soundEngine.setFlightDynamics(normIntensity, boostFlame, steer);

    // Spawning Obstacles
    const spawnSpacing =
      this.gameMode === 'practice' ? 42 : Math.max(25, 41 - (difficulty - 1) * 1.15);
    this.spawnDistanceAccum += dz;
    if (this.spawnDistanceAccum >= spawnSpacing) {
      this.spawnDistanceAccum = 0;
      this.spawnObstacle();
      if (this.gameMode === 'standard' && difficulty >= 4 && Math.random() < 0.24) {
        this.spawnObstacle('pillar', SPAWN_Z - 4);
      }
    }

    // Spawning Enemies + Boss Waves
    const hasBossActive = this.enemies.some((e) => e.active && e.kind === 'boss');
    if (this.gameMode === 'standard' && !hasBossActive && this.distance >= this.nextBossDistance) {
      this.nextBossDistance += 720;
      this.spawnEnemy('boss', -115, 0, 2.1);
      this.callbacks.onAnnounce('Peringatan! Kapal Boss Besar terdeteksi di depan!');
    }

    this.enemySpawnAccum += dz;
    const enemyInterval = this.gameMode === 'practice' ? 58 : Math.max(28, 46 - difficulty * 1.6);
    if (!hasBossActive && this.enemySpawnAccum >= enemyInterval) {
      this.enemySpawnAccum = 0;
      this.spawnEnemy();
    }

    // Spawning PowerUps (with anti-cluster distance & time cooldown)
    this.powerUpSpawnAccum += dz;
    if (this.powerUpSpawnAccum >= (this.gameMode === 'practice' ? 32 : 40) && this.powerUpCooldown <= 0) {
      this.powerUpSpawnAccum = 0;
      this.spawnPowerUp();
    }

    // Auto-Lock 3D Reticle Indicator
    const activeWeaponMode = this.getEffectiveWeaponMode();
    if (activeWeaponMode === 'autolock') {
      const lockTarget = this.findBestHomingTarget(this.planeX, this.planeY, -2);
      if (lockTarget) {
        this.lockReticle.group.visible = true;
        this.lockReticle.group.position.set(lockTarget.x, lockTarget.y, lockTarget.z + 1.1);
        this.lockReticle.group.rotation.z += dt * 3.4;
      } else {
        this.lockReticle.group.visible = false;
      }
    } else {
      this.lockReticle.group.visible = false;
    }

    // Update Player Bullets (with Homing Auto-Lock guidance) & Hit Detection
    for (const b of this.playerBullets) {
      if (!b.active) continue;

      if (b.homing) {
        const target = this.findBestHomingTarget(b.x, b.y, b.z);
        if (target) {
          const dx = target.x - b.x;
          const dy = target.y - b.y;
          const dz = target.z - b.z;
          const dist = Math.hypot(dx, dy, dz) || 1;
          const desiredVx = (dx / dist) * b.speed;
          const desiredVy = (dy / dist) * b.speed;
          const desiredVz = (dz / dist) * b.speed;
          const turn = Math.min(1, dt * 12.5);
          b.vx += (desiredVx - b.vx) * turn;
          b.vy += (desiredVy - b.vy) * turn;
          b.vz += (desiredVz - b.vz) * turn;
          const curMag = Math.hypot(b.vx, b.vy, b.vz) || 1;
          b.vx = (b.vx / curMag) * b.speed;
          b.vy = (b.vy / curMag) * b.speed;
          b.vz = (b.vz / curMag) * b.speed;
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.mesh.position.set(b.x, b.y, b.z);
      if (b.homing) {
        b.mesh.lookAt(b.x - b.vx, b.y - b.vy, b.z - b.vz);
      }

      let consumed = false;

      // Hit Enemies
      for (const en of this.enemies) {
        if (!en.active) continue;
        if (
          Math.abs(b.z - en.z) < 3.4 &&
          Math.abs(b.x - en.x) < en.halfWidth + b.radius &&
          Math.abs(b.y - en.y) < en.halfHeight + b.radius
        ) {
          en.hp -= b.damage;
          en.hitFlash = 0.08;
          this.emitParticles(b.x, b.y, b.z, 0xfbbf24, 6, 0.85);
          b.pierce -= 1;
          if (b.pierce <= 0) consumed = true;

          if (en.hp <= 0) {
            this.destroyEnemy(en);
          } else {
            soundEngine.playEnemyHit();
          }
          if (consumed) break;
        }
      }

      // Hit Destructible Obstacles
      if (!consumed) {
        for (const ob of this.obstacles) {
          if (!ob.active || !ob.destructible) continue;
          const obCenterY = GROUND_Y + ob.halfHeight * 0.52;
          if (
            Math.abs(b.z - ob.z) < 2.8 &&
            Math.abs(b.x - ob.x) < ob.halfWidth + b.radius &&
            Math.abs(b.y - obCenterY) < ob.halfHeight * 0.55 + b.radius
          ) {
            ob.hp -= b.damage;
            ob.hitFlash = 0.08;
            this.emitParticles(b.x, b.y, b.z, 0xf97316, 6, 0.85);
            b.pierce -= 1;
            if (b.pierce <= 0) consumed = true;

            if (ob.hp <= 0) {
              ob.active = false;
              ob.visual.root.visible = false;
              this.bonusScore += 3;
              this.enemyKillPoints += 5;
              soundEngine.playExplosion(false);
              this.emitParticles(ob.x, b.y, ob.z, 0xf97316, 16, 1.2);
            } else {
              soundEngine.playEnemyHit();
            }
            if (consumed) break;
          }
        }
      }

      if (consumed || b.z < SPAWN_Z - 20 || b.z > 15) {
        b.active = false;
        b.mesh.visible = false;
      }
    }

    // Update Enemies (Movement AI + Firing + Player Collision)
    for (const en of this.enemies) {
      if (!en.active) continue;

      if (en.kind === 'boss') {
        // Boss hovers around z = -42 and weaves left/right + up/down
        if (en.z < -42) en.z += (dz + en.speedZ * dt) * 0.55;
        en.x = Math.sin(elapsed * 0.9 + en.phase) * 9.2;
        en.y = 2.0 + Math.cos(elapsed * 1.3 + en.phase) * 1.4;
      } else if (en.kind === 'interceptor') {
        en.z += dz * 0.55 + en.speedZ * dt;
        en.x = THREE.MathUtils.damp(en.x, this.planeX, 2.4, dt);
        en.y = THREE.MathUtils.damp(en.y, this.planeY, 2.2, dt);
      } else if (en.kind === 'warship') {
        en.z += dz * 0.5 + en.speedZ * dt;
        en.x = en.baseX + Math.sin(elapsed * 0.8 + en.phase) * 2.8;
      } else if (en.kind === 'fighter') {
        en.z += dz * 0.65 + en.speedZ * dt;
        en.x = en.baseX + Math.sin(elapsed * 1.6 + en.phase) * 3.5;
        en.y = en.baseY + Math.cos(elapsed * 1.4 + en.phase) * 0.9;
      } else {
        // Drone
        en.z += dz * 0.72 + en.speedZ * dt;
        en.x = en.baseX + Math.sin(elapsed * 2.2 + en.phase) * 2.2;
        en.y = en.baseY + Math.sin(elapsed * 3.0 + en.phase) * 1.1;
      }

      en.visual.root.position.set(en.x, en.y, en.z);
      for (const sp of en.visual.spinnerParts) {
        sp.rotation.z += dt * 3.2;
      }
      if (en.hitFlash > 0) {
        en.hitFlash -= dt;
        en.visual.root.scale.setScalar(1.06);
      } else {
        en.visual.root.scale.setScalar(1.0);
      }

      // Enemy Firing AI
      en.shootCooldown -= dt;
      if (en.shootCooldown <= 0 && en.z > -105 && en.z < -16) {
        if (en.kind === 'boss') {
          en.shootCooldown = 1.45;
          this.spawnEnemyBolt(en.x, en.y, en.z, true, -2.5);
          this.spawnEnemyBolt(en.x, en.y, en.z, true, 0);
          this.spawnEnemyBolt(en.x, en.y, en.z, true, 2.5);
        } else if (en.kind === 'warship') {
          en.shootCooldown = 2.0;
          this.spawnEnemyBolt(en.x, en.y, en.z, true, -1.1);
          this.spawnEnemyBolt(en.x, en.y, en.z, true, 1.1);
        } else if (en.kind === 'fighter' || en.kind === 'interceptor') {
          en.shootCooldown = 2.2;
          this.spawnEnemyBolt(en.x, en.y, en.z, true, 0);
        } else {
          en.shootCooldown = 3.2;
        }
      }

      // Collision with Player Plane (invariant hitbox)
      if (
        this.invulnTimer <= 0 &&
        Math.abs(en.z) < PLAYER_HITBOX_Z + 0.9 &&
        Math.abs(this.planeX - en.x) < en.halfWidth + PLAYER_HITBOX_X &&
        Math.abs(this.planeY - en.y) < en.halfHeight + PLAYER_HITBOX_Y
      ) {
        const dmg = en.kind === 'boss' ? OBSTACLE_DAMAGE.gate : OBSTACLE_DAMAGE.turbine;
        const label = en.kind === 'boss' ? 'Boss Musuh' : 'Pesawat Musuh';
        if (en.kind !== 'boss') {
          en.active = false;
          en.visual.root.visible = false;
        }
        this.applyPlayerDamage(dmg, label);
      }

      if (en.z > DESPAWN_Z) {
        en.active = false;
        en.visual.root.visible = false;
      }
    }

    // Update Enemy Projectiles
    for (const eb of this.enemyBullets) {
      if (!eb.active) continue;
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      eb.z += eb.vz * dt;
      eb.mesh.position.set(eb.x, eb.y, eb.z);

      if (
        this.invulnTimer <= 0 &&
        Math.abs(eb.z) < PLAYER_HITBOX_Z &&
        Math.abs(this.planeX - eb.x) < PLAYER_HITBOX_X + eb.radius &&
        Math.abs(this.planeY - eb.y) < PLAYER_HITBOX_Y + eb.radius
      ) {
        eb.active = false;
        eb.mesh.visible = false;
        this.applyPlayerDamage(OBSTACLE_DAMAGE.small, 'Tembakan Musuh');
      } else if (eb.z > DESPAWN_Z) {
        eb.active = false;
        eb.mesh.visible = false;
      }
    }

    // Update Obstacles & Collision Check (invariant X/Y/Z hitbox!)
    for (const ob of this.obstacles) {
      if (!ob.active) continue;
      ob.z += dz;

      if (ob.kind === 'mover') {
        ob.x = ob.baseX + Math.sin(elapsed * ob.oscSpeed + ob.oscPhase) * ob.oscAmp;
      } else if (ob.kind === 'turbine') {
        ob.visual.spinnerGroup.rotation.z += ob.spinSpeed * dt;
      }

      if (ob.hitFlash > 0) {
        ob.hitFlash -= dt;
        ob.visual.root.scale.setScalar(1.04);
      } else {
        ob.visual.root.scale.setScalar(1.0);
      }

      ob.visual.root.position.set(ob.x, GROUND_Y, ob.z);

      // Gate pass bonus check (+2 per gate)
      if (ob.kind === 'gate' && !ob.gateScored && ob.z > 0.3) {
        const dx = Math.abs(this.planeX - ob.x);
        if (dx < ob.gateGapHalf - 0.35 && this.planeY < GROUND_Y + 5.8) {
          ob.gateScored = true;
          this.combo += 1;
          if (this.combo > this.maxCombo) this.maxCombo = this.combo;
          this.bonusScore += 2;
          soundEngine.playGatePass(this.combo);
          this.emitParticles(this.planeX, this.planeY + 0.3, -0.5, 0x38bdf8, 10);
          if (this.gameMode === 'practice' && this.practiceStep === 2) {
            this.practiceStep = 3;
            this.callbacks.onAnnounce(this.getPracticeGuidance().message);
          }
        }
      }

      // 3D Collision Check near Z = 0
      if (Math.abs(ob.z) < PLAYER_HITBOX_Z) {
        const pillarTopY = GROUND_Y + ob.halfHeight;
        let hit = false;
        if (ob.kind === 'gate') {
          const leftColX = ob.x - ob.gateGapHalf - 0.85;
          const rightColX = ob.x + ob.gateGapHalf + 0.85;
          const hitPillar =
            this.planeY - PLAYER_HITBOX_Y < pillarTopY &&
            (Math.abs(this.planeX - leftColX) < 1.35 || Math.abs(this.planeX - rightColX) < 1.35);
          const hitArch =
            Math.abs(this.planeX - ob.x) < ob.gateGapHalf + 1.5 &&
            Math.abs(this.planeY - (GROUND_Y + 5.4)) < 0.75;
          hit = hitPillar || hitArch;
        } else {
          if (
            this.planeY - PLAYER_HITBOX_Y < pillarTopY &&
            Math.abs(this.planeX - ob.x) < ob.halfWidth + PLAYER_HITBOX_X
          ) {
            hit = true;
          }
        }

        if (hit && this.invulnTimer <= 0) {
          this.handleObstacleImpact(ob);
        }
      }

      if (ob.z > DESPAWN_Z) {
        ob.active = false;
        ob.visual.root.visible = false;
      }
    }

    // Update PowerUps & Collection
    for (const pu of this.powerUps) {
      if (!pu.active) continue;
      pu.z += dz;
      const curY = pu.y + Math.sin(elapsed * 4 + pu.z) * 0.2;
      pu.group.position.set(pu.x, curY, pu.z);
      pu.group.rotation.y += dt * 2.4;

      if (
        Math.abs(pu.z) < 1.85 &&
        Math.abs(this.planeX - pu.x) < 2.25 &&
        Math.abs(this.planeY - curY) < 1.95
      ) {
        this.collectPowerUp(pu);
      }

      if (pu.z > DESPAWN_Z) {
        pu.active = false;
        pu.group.visible = false;
      }
    }

    // Scroll Map Scenery
    this.scrollScenery(this.forwardSpeed, dt);

    // Smooth Chase Camera Follow (horizontal & vertical)
    const targetFov = boostFlame ? 77 : 65 + Math.min(5, (difficulty - 1) * 0.9);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5.5, dt);
    this.camera.updateProjectionMatrix();

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.planeX * 0.56, 7, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.planeY * 0.65 + 2.55, 6.5, dt);
    this.camera.position.z = 7.8;

    this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.2);
    this.applyCameraShake();
    this.camera.lookAt(this.planeX * 0.72, this.planeY * 0.65 + 0.15, -14);

    // Throttled HUD updates (~20Hz)
    this.hudThrottle += dt;
    if (this.hudThrottle >= 0.05) {
      this.hudThrottle = 0;
      this.emitHudSnapshot(steer, vertical, source);
    }
  }

  private destroyEnemy(en: EnemyUnit): void {
    const isBoss = en.kind === 'boss';
    en.active = false;
    en.visual.root.visible = false;
    this.enemiesDestroyed += 1;
    this.combo += 1;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.bonusScore += en.scoreValue;

    const killPoints =
      en.kind === 'boss'
        ? 120
        : en.kind === 'warship'
          ? 35
          : en.kind === 'interceptor'
            ? 22
            : en.kind === 'fighter'
              ? 18
              : 10;
    this.enemyKillPoints += killPoints;

    soundEngine.playExplosion(isBoss);
    this.shakeIntensity = Math.max(this.shakeIntensity, isBoss ? 0.65 : 0.25);
    this.emitParticles(en.x, en.y, en.z, isBoss ? 0xf97316 : 0xef4444, isBoss ? 36 : 18, isBoss ? 1.8 : 1.15);

    if (isBoss) {
      this.callbacks.onAnnounce(`Boss dihancurkan! +${en.scoreValue} Skor & +${killPoints} Poin!`);
    }
  }

  private scrollScenery(speed: number, dt: number): void {
    const dz = speed * dt;
    for (let i = 0; i < this.cloudData.length; i++) {
      const c = this.cloudData[i];
      c.z += dz * 0.65;
      if (c.z > DESPAWN_Z + 12) {
        c.z = -175 - Math.random() * 20;
      }
    }
    this.syncInstancedClouds();
    this.envManager.update(speed, dt);
  }

  private applyCameraShake(): void {
    if (this.shakeIntensity > 0.005 && !this.reducedMotion) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity * 0.8;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.6;
    }
  }

  private collectPowerUp(pu: PowerUpUnit): void {
    pu.active = false;
    pu.group.visible = false;
    this.powerUpsCollected += 1;
    soundEngine.playPowerUp(pu.kind);

    if (pu.kind === 'turbo') {
      this.turboRemaining = 5.5;
      this.emitParticles(this.planeX, this.planeY, 0, 0xf97316, 16);
      this.callbacks.onAnnounce('Item Boost aktif! Kecepatan meningkat sementara.');
    } else if (pu.kind === 'shield') {
      this.hasShield = true;
      this.shieldActiveRemaining = 7.0;
      this.emitParticles(this.planeX, this.planeY, 0, 0x14b8a6, 16);
      this.callbacks.onAnnounce('Item Perisai aktif! Melindungi dari benturan.');
    } else if (pu.kind === 'heart') {
      if (this.lives < this.planeStats.maxLives) {
        this.lives += 1;
        this.durability = this.planeStats.maxDurabilityPerLife;
        this.callbacks.onAnnounce(`Item Hati! Nyawa bertambah menjadi ${this.lives}.`);
      } else {
        this.durability = this.planeStats.maxDurabilityPerLife;
        this.bonusScore += 2;
        this.callbacks.onAnnounce('Item Hati! Ketahanan pulih penuh & bonus +2 skor.');
      }
      this.emitParticles(this.planeX, this.planeY, 0, 0xef4444, 16);
    } else if (pu.kind === 'weapon') {
      const currentMode = this.getEffectiveWeaponMode();
      const candidates = IN_FLIGHT_WEAPON_POOL.filter((w) => w !== currentMode);
      const nextWeapon = candidates[Math.floor(Math.random() * candidates.length)] ?? 'rapid';
      this.weaponOverride = nextWeapon;
      this.weaponOverrideRemaining = 16.0;
      this.fireCooldown = 0;
      this.burstShotsPending = 0;
      this.emitParticles(this.planeX, this.planeY, 0, 0xe879f9, 18);
      this.callbacks.onAnnounce(`Item Senjata! ${WEAPON_CATALOG[nextWeapon].name} aktif 16 detik.`);
    } else {
      this.combo += 1;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.bonusScore += 5;
      this.emitParticles(this.planeX, this.planeY, 0, 0xfacc15, 14);
      this.callbacks.onAnnounce('Item Skor! +5 Skor.');
    }

    if (this.gameMode === 'practice' && this.practiceStep === 2) {
      this.practiceStep = 3;
      this.callbacks.onAnnounce(this.getPracticeGuidance().message);
    }
  }

  private handleObstacleImpact(ob: ObstacleUnit): void {
    const dmg =
      ob.kind === 'gate'
        ? OBSTACLE_DAMAGE.gate
        : ob.kind === 'turbine'
          ? OBSTACLE_DAMAGE.turbine
          : OBSTACLE_DAMAGE.small;
    const objLabel = ob.kind === 'gate' ? 'Gawang' : ob.kind === 'turbine' ? 'Turbin' : 'Rintangan';
    ob.active = false;
    ob.visual.root.visible = false;
    this.applyPlayerDamage(dmg, objLabel);
  }

  private applyPlayerDamage(dmg: number, objLabel: string): void {
    const invulnDuration = 1.45;

    // 1. Active Energy Shield absorbs hit
    if (this.hasShield) {
      this.hasShield = false;
      this.shieldActiveRemaining = 0;
      this.invulnTimer = invulnDuration;
      this.hitstopTimer = 0.055;
      this.shakeIntensity = 0.45;
      soundEngine.playShieldDeflect();
      this.emitParticles(this.planeX, this.planeY, 0, 0x2dd4bf, 24);
      this.callbacks.onAnnounce(`Serangan ${objLabel} ditahan oleh Perisai Energi!`);
      this.emitCurrentHud();
      return;
    }

    // 2. Passive Pelindung charge absorbs hit
    if (this.armorRemaining > 0) {
      this.armorRemaining -= 1;
      if (this.armorRechargeTimer <= 0) {
        this.armorRechargeTimer = this.planeStats.rechargeIntervalSec;
      }
      this.invulnTimer = invulnDuration;
      this.hitstopTimer = 0.055;
      this.shakeIntensity = 0.42;
      this.plane.armorMesh.visible = this.armorRemaining > 0;
      soundEngine.playShieldDeflect();
      this.emitParticles(this.planeX, this.planeY, 0, 0xf59e0b, 22);
      this.callbacks.onAnnounce(`Pelindung menahan benturan! Sisa pelindung: ${this.armorRemaining}.`);
      this.emitCurrentHud();
      return;
    }

    // 3. Practice Mode safety bounce
    if (this.gameMode === 'practice') {
      this.invulnTimer = invulnDuration;
      this.hitstopTimer = 0.04;
      this.shakeIntensity = 0.3;
      this.combo = 0;
      soundEngine.playShieldDeflect();
      this.emitParticles(this.planeX, this.planeY, 0, 0xfbbf24, 14);
      this.callbacks.onAnnounce('Terkena benturan di Mode Latihan.');
      return;
    }

    // 4. Deduct durability
    this.durability -= dmg;
    this.combo = 0;

    if (this.durability > 0) {
      this.invulnTimer = 1.25;
      this.hitstopTimer = 0.045;
      this.shakeIntensity = 0.4;
      soundEngine.playShieldDeflect();
      this.emitParticles(this.planeX, this.planeY, 0, 0xfbbf24, 16);
      this.callbacks.onAnnounce(
        `Terkena ${objLabel} (-${dmg} Kekuatan). Sisa ketahanan ${this.durability}/${this.planeStats.maxDurabilityPerLife}.`,
      );
      this.emitCurrentHud();
      return;
    }

    // 5. Lose 1 Life
    if (this.lives > 1) {
      this.lives -= 1;
      this.durability = this.planeStats.maxDurabilityPerLife;
      this.invulnTimer = 1.85;
      this.hitstopTimer = 0.06;
      this.shakeIntensity = 0.65;
      soundEngine.playDamage();
      this.emitParticles(this.planeX, this.planeY, 0, 0xf87171, 20);
      this.callbacks.onAnnounce(`Nyawa berkurang! Sisa nyawa ${this.lives} dari ${this.planeStats.maxLives}.`);
      this.emitCurrentHud();
      return;
    }

    // 6. Game Over
    this.durability = 0;
    this.lives = 0;
    this.runningState = 'gameover';
    this.input.clearAll();
    this.hitstopTimer = 0.07;
    this.shakeIntensity = 0.75;
    this.plane.root.visible = false;
    soundEngine.stopWind();
    soundEngine.playCrash();
    this.emitParticles(this.planeX, this.planeY, 0, 0xf87171, 30, 1.4);

    const finalScore = this.computeTotalScore();
    const earnedPoints = this.computeEarnedPoints();
    const { steer, vertical, source } = this.input.sample();
    this.emitHudSnapshot(steer, vertical, source);

    const summary: GameOverSummary = {
      score: finalScore,
      distance: Math.round(this.distance),
      maxCombo: this.maxCombo,
      powerUpsCollected: this.powerUpsCollected,
      enemiesDestroyed: this.enemiesDestroyed,
      pointsEarned: earnedPoints,
      planeId: this.planeStats.planeId,
      modelTier: this.planeStats.modelTier,
      weaponType: this.planeStats.weaponType,
      themeId: this.currentThemeId,
      controlUsed: source,
      mode: this.gameMode,
      isNewBest: finalScore > this.bestScore,
    };
    this.callbacks.onAnnounce(
      `Permainan selesai. Skor akhir ${finalScore}, jarak ${summary.distance} meter.`,
    );
    this.callbacks.onGameOver(summary);
  }

  private computeTotalScore(): number {
    return this.bonusScore;
  }

  private computeEarnedPoints(): number {
    return this.gameMode === 'standard' ? this.bonusScore + this.enemyKillPoints : 0;
  }

  private emitCurrentHud(): void {
    const { steer, vertical, source } = this.input.sample();
    this.emitHudSnapshot(steer, vertical, source);
  }

  private emitHudSnapshot(steer: number, vertical: number, source: 'keyboard' | 'touch'): void {
    const guidance = this.getPracticeGuidance();
    const activeBoss = this.enemies.find((e) => e.active && e.kind === 'boss');
    const overrideActive = this.weaponOverride && this.weaponOverrideRemaining > 0;
    const weaponDisplay = overrideActive
      ? {
          name: WEAPON_CATALOG[this.weaponOverride!].name,
          shortName: WEAPON_CATALOG[this.weaponOverride!].shortName,
          colorCss: WEAPON_CATALOG[this.weaponOverride!].colorCss,
        }
      : getDisplayWeaponLabel(this.planeStats.planeId, this.planeStats.weaponType);

    this.callbacks.onHudUpdate({
      score: this.computeTotalScore(),
      distance: Math.round(this.distance),
      speedKmh: Math.round(this.forwardSpeed * 9.2),
      difficultyLevel: this.getDifficultyLevel(),
      combo: this.combo,
      lives: this.lives,
      maxLives: this.planeStats.maxLives,
      durability: Math.max(0, this.durability),
      maxDurability: this.planeStats.maxDurabilityPerLife,
      armorRemaining: this.armorRemaining,
      maxArmor: this.planeStats.maxArmorCharges,
      armorRechargeRemaining: this.armorRechargeTimer,
      jetCharges: this.jetCharges,
      maxJetCharges: this.planeStats.maxJetCharges,
      jetRechargeRemaining: this.jetRechargeTimer,
      rechargeIntervalSec: this.planeStats.rechargeIntervalSec,
      pointsEarned: this.computeEarnedPoints(),
      hasShield: this.hasShield,
      shieldActiveRemaining: this.shieldActiveRemaining,
      turboRemaining: this.turboRemaining,
      turboDuration: 5.5,
      boosterActiveRemaining: this.boosterActiveRemaining,
      planeId: this.planeStats.planeId,
      modelTier: this.planeStats.modelTier,
      weaponType: overrideActive ? this.weaponOverride! : this.planeStats.weaponType,
      effectiveWeaponName: weaponDisplay.shortName,
      effectiveWeaponColorCss: weaponDisplay.colorCss,
      weaponOverrideRemaining: this.weaponOverrideRemaining,
      steerInput: steer,
      verticalInput: vertical,
      activeControl: source,
      enemiesDestroyed: this.enemiesDestroyed,
      bossActive: Boolean(activeBoss),
      bossName: 'Dreadnought Sky Fortress',
      bossHp: activeBoss ? Math.max(0, activeBoss.hp) : 0,
      bossMaxHp: activeBoss ? activeBoss.maxHp : 1,
      practiceStep: guidance.step,
      practiceMessage: guidance.message,
      themeId: this.currentThemeId,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);

    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('orientationchange', this.onResizeBound);
    document.removeEventListener('fullscreenchange', this.onResizeBound);
    window.visualViewport?.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    this.renderer.domElement.removeEventListener('touchstart', this.onTouchStartBound);
    this.renderer.domElement.removeEventListener('touchmove', this.onTouchMoveBound);
    this.renderer.domElement.removeEventListener('touchend', this.onTouchEndBound);
    this.renderer.domElement.removeEventListener('touchcancel', this.onTouchEndBound);

    this.input.detach();
    this.plane.dispose();
    this.envManager.dispose();
    this.combatMats.dispose();
    this.enemies.forEach((e) => e.visual.dispose());
    this.obstacleGeos.forEach((g) => g.dispose());
    this.bulletDisposables.forEach((d) => d.dispose());
    this.powerUpDisposables.forEach((d) => d.dispose());
    this.particleGeo.dispose();
    this.groundTex.dispose();
    this.groundMesh.geometry.dispose();
    this.groundMat.dispose();
    this.cloudMesh.geometry.dispose();
    this.cloudMat.dispose();
    this.obstacleBodyMat.dispose();
    this.obstacleAccentMat.dispose();
    this.gateFrameMat.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
