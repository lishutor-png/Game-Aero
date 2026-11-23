import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createProceduralPlane, type PlaneRig } from './planeModel';
import { ENVIRONMENT_THEMES, pickRandomTheme } from './themes';
import { computeEffectivePlaneStats, DEFAULT_PROGRESS, OBSTACLE_DAMAGE } from './planes';
import { soundEngine } from './audio';
import { FlightInputController } from './gyro';
import type {
  EffectivePlaneStats,
  GameMode,
  GameOverSummary,
  GameSettings,
  GraphicsQuality,
  HudSnapshot,
  PlaneId,
  PowerUpType,
  ThemeId,
} from '../types/game';

// Pre-allocated math helpers outside the render loop (Zero GC)
const _vec3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _color = new THREE.Color();
const _dummy = new THREE.Object3D();

type ObstacleKind = 'pillar' | 'gate' | 'mover' | 'turbine';

interface ObstacleUnit {
  group: THREE.Group;
  kind: ObstacleKind;
  active: boolean;
  z: number;
  x: number;
  baseX: number;
  halfWidth: number;
  gateGapHalf: number; // > 0 when kind === 'gate'
  gateScored: boolean;
  oscPhase: number;
  oscAmp: number;
  oscSpeed: number;
  spinSpeed: number;
  spinnerGroup: THREE.Group;
  leftPillar: THREE.Group;
  rightPillar: THREE.Group;
  topArch: THREE.Mesh;
  centerMesh: THREE.Group;
}

interface PowerUpUnit {
  group: THREE.Group;
  active: boolean;
  kind: PowerUpType;
  z: number;
  x: number;
  scoreGroup: THREE.Group;
  heartGroup: THREE.Group;
  boostGroup: THREE.Group;
  shieldGroup: THREE.Group;
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

const CORRIDOR_HALF_WIDTH = 16.0;
const PLANE_Y = 0.0;
const GROUND_Y = -2.4;
const SPAWN_Z = -135;
const DESPAWN_Z = 18;

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

    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= size; i += 64) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
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

  // Instanced Scenery
  private cloudMesh: THREE.InstancedMesh;
  private cloudData: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number }> = [];
  private spireMesh: THREE.InstancedMesh;
  private spireData: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number }> = [];

  // Shared Obstacle / Powerup Materials so theme switching is instant
  private obstacleBodyMat: THREE.MeshStandardMaterial;
  private obstacleAccentMat: THREE.MeshStandardMaterial;
  private gateFrameMat: THREE.MeshStandardMaterial;
  private cloudMat: THREE.MeshStandardMaterial;
  private spireMat: THREE.MeshStandardMaterial;

  private obstacles: ObstacleUnit[] = [];
  private powerUps: PowerUpUnit[] = [];
  private powerUpDisposables: Array<{ dispose: () => void }> = [];
  private particles: ParticleUnit[] = [];

  // Simulation state
  private runningState: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private gameMode: GameMode = 'standard';
  private currentThemeId: ThemeId = 'morning';
  private highContrast = false;
  private reducedMotion = false;
  private graphicsQuality: GraphicsQuality = 'auto';
  private bestScore = 0;

  private planeStats: EffectivePlaneStats = computeEffectivePlaneStats(DEFAULT_PROGRESS);
  private planeX = 0;
  private planeVelX = 0;
  private planeRoll = 0;
  private forwardSpeed = 24;
  private distance = 0;
  private bonusScore = 0;
  private combo = 0;
  private maxCombo = 0;
  private powerUpsCollected = 0;

  private lives = 2;
  private durability = 45;
  private armorRemaining = 0;
  private armorRechargeTimer = 0;
  private jetCharges = 0;
  private jetRechargeTimer = 0;
  private hasShield = false;
  private turboRemaining = 0;
  private boosterActiveRemaining = 0;
  private invulnTimer = 0;
  private hitstopTimer = 0;
  private shakeIntensity = 0;

  private spawnDistanceAccum = 0;
  private powerUpSpawnAccum = 0;
  private practiceStep = 0;
  private practiceTimer = 0;

  private frameId = 0;
  private disposed = false;
  private hudThrottle = 0;

  // Bound resize, booster key & touch handlers
  private resizeObserver: ResizeObserver | null = null;
  private onResizeBound: () => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onTouchStartBound: (e: TouchEvent) => void;
  private onTouchMoveBound: (e: TouchEvent) => void;
  private onTouchEndBound: () => void;

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
    this.renderer.toneMappingExposure = 1.08;
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
      260,
    );
    this.camera.position.set(0, 2.7, 7.4);
    this.camera.lookAt(0, 0.3, -12);

    // Mandatory studio environment reflection
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 3-Point Warm/Cool Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0ea5e9, 0.85);
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

    this.rimLight = new THREE.DirectionalLight(0xbae6fd, 0.55);
    this.rimLight.position.set(-18, 10, -24);
    this.scene.add(this.rimLight);

    // Ground Plane with scrolling procedural grid
    this.groundTex = createGroundGridTexture();
    this.groundTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.groundMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      map: this.groundTex,
      roughness: 0.82,
      metalness: 0.08,
    });
    const groundGeo = new THREE.PlaneGeometry(240, 320);
    groundGeo.rotateX(-Math.PI / 2);
    this.groundMesh = new THREE.Mesh(groundGeo, this.groundMat);
    this.groundMesh.position.set(0, GROUND_Y, -90);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Contact shadow grounding plane under aircraft
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

    // Procedural Plane
    this.plane = createProceduralPlane(this.isSoftwareGl);
    this.plane.root.position.set(0, PLANE_Y, 0);
    this.scene.add(this.plane.root);

    // Shared materials
    this.obstacleBodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.52,
      metalness: 0.25,
    });
    this.obstacleAccentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.7,
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
    });
    this.spireMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.72,
      metalness: 0.12,
    });

    // Instanced clouds (42 instances)
    const cloudGeo = new THREE.DodecahedronGeometry(1.4, 0);
    this.cloudMesh = new THREE.InstancedMesh(cloudGeo, this.cloudMat, 42);
    this.cloudMesh.frustumCulled = false;
    for (let i = 0; i < 42; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      this.cloudData.push({
        x: side * (12 + Math.random() * 48) + (Math.random() - 0.5) * 16,
        y: 6.5 + Math.random() * 14,
        z: -Math.random() * 180 + 10,
        sx: 1.6 + Math.random() * 2.4,
        sy: 0.7 + Math.random() * 0.7,
        sz: 1.4 + Math.random() * 1.8,
      });
    }
    this.syncInstancedClouds();
    this.cloudMesh.computeBoundingSphere();
    this.scene.add(this.cloudMesh);

    // Instanced side spires / natural horizon barriers (36 instances)
    const spireGeo = new THREE.ConeGeometry(2.6, 14, 6);
    spireGeo.translate(0, 7, 0); // Pivot at bottom-center
    this.spireMesh = new THREE.InstancedMesh(spireGeo, this.spireMat, 36);
    this.spireMesh.frustumCulled = false;
    for (let i = 0; i < 36; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.spireData.push({
        x: side * (23 + Math.random() * 28),
        y: GROUND_Y,
        z: -i * 5.4,
        sx: 0.75 + Math.random() * 0.85,
        sy: 0.55 + Math.random() * 1.15,
        sz: 0.75 + Math.random() * 0.85,
      });
    }
    this.syncInstancedSpires();
    this.spireMesh.computeBoundingSphere();
    this.scene.add(this.spireMesh);

    // Pools
    this.initObstaclePool(22);
    this.initPowerUpPool(10);
    this.initParticlePool(32);

    this.applyTheme('morning');

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Listeners
    this.onResizeBound = () => this.handleResize();
    this.onKeyDownBound = (e: KeyboardEvent) => {
      if (this.runningState !== 'playing') return;
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (this.planeStats.maxJetCharges > 0) {
          e.preventDefault();
          this.activateBooster();
        }
      }
    };
    this.onTouchStartBound = (e: TouchEvent) => {
      if (this.runningState === 'playing' && e.touches.length > 0) {
        this.input.handleTouchStart(e.touches[0].clientX);
      }
    };
    this.onTouchMoveBound = (e: TouchEvent) => {
      if (this.runningState === 'playing' && e.touches.length > 0) {
        this.input.handleTouchMove(e.touches[0].clientX);
      }
    };
    this.onTouchEndBound = () => {
      this.input.handleTouchEnd();
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
    const towerGeo = new THREE.BoxGeometry(1.6, 5.2, 1.6);
    towerGeo.translate(0, 3.0, 0);
    const beaconGeo = new THREE.OctahedronGeometry(0.65, 0);
    beaconGeo.translate(0, 6.0, 0);

    const archBarGeo = new THREE.BoxGeometry(1, 0.65, 1.0);
    const bladeGeo = new THREE.BoxGeometry(0.32, 3.6, 0.16);
    const hubGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.7, 12);
    hubGeo.rotateX(Math.PI / 2);

    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      group.visible = false;

      // Center composite pillar / turbine mount
      const centerMesh = new THREE.Group();
      const ped = new THREE.Mesh(pedestalGeo, this.obstacleBodyMat);
      ped.castShadow = true;
      ped.receiveShadow = true;
      const tow = new THREE.Mesh(towerGeo, this.obstacleBodyMat);
      tow.castShadow = true;
      tow.receiveShadow = true;
      const bea = new THREE.Mesh(beaconGeo, this.obstacleAccentMat);
      centerMesh.add(ped, tow, bea);
      group.add(centerMesh);

      // Gate left/right pillars + top arch
      const leftPillar = new THREE.Group();
      const lpBase = new THREE.Mesh(pedestalGeo, this.obstacleBodyMat);
      const lpTow = new THREE.Mesh(towerGeo, this.gateFrameMat);
      lpTow.castShadow = true;
      leftPillar.add(lpBase, lpTow);
      group.add(leftPillar);

      const rightPillar = new THREE.Group();
      const rpBase = new THREE.Mesh(pedestalGeo, this.obstacleBodyMat);
      const rpTow = new THREE.Mesh(towerGeo, this.gateFrameMat);
      rpTow.castShadow = true;
      rightPillar.add(rpBase, rpTow);
      group.add(rightPillar);

      const topArch = new THREE.Mesh(archBarGeo, this.obstacleAccentMat);
      topArch.position.y = 5.4;
      group.add(topArch);

      // Turbine blades spinner
      const spinnerGroup = new THREE.Group();
      spinnerGroup.position.set(0, 3.4, 0.85);
      const hub = new THREE.Mesh(hubGeo, this.obstacleAccentMat);
      spinnerGroup.add(hub);
      for (let b = 0; b < 3; b++) {
        const bladeHolder = new THREE.Group();
        bladeHolder.rotation.z = (b * Math.PI * 2) / 3;
        const blade = new THREE.Mesh(bladeGeo, this.obstacleAccentMat);
        blade.position.y = 1.65;
        bladeHolder.add(blade);
        spinnerGroup.add(bladeHolder);
      }
      group.add(spinnerGroup);

      group.position.y = GROUND_Y;
      this.scene.add(group);

      this.obstacles.push({
        group,
        kind: 'pillar',
        active: false,
        z: 0,
        x: 0,
        baseX: 0,
        halfWidth: 1.05,
        gateGapHalf: 0,
        gateScored: false,
        oscPhase: 0,
        oscAmp: 0,
        oscSpeed: 0,
        spinSpeed: 0,
        spinnerGroup,
        leftPillar,
        rightPillar,
        topArch,
        centerMesh,
      });
    }
  }

  private initPowerUpPool(count: number): void {
    // 1. Unique Item Skor Geometry (5-pointed Golden Star + Coin Ring)
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

    // 2. Unique Item Hati Geometry (Extruded 3D Ruby Heart + Halo Ring)
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

    // 3. Unique Item Boost Geometry (3D Lightning Bolt + Electric Speed Ring)
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

    // 4. Unique Item Perisai Geometry (3D Heraldic Shield + Hexagonal Frame)
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

      group.add(scoreGroup, heartGroup, boostGroup, shieldGroup);
      this.scene.add(group);

      this.powerUps.push({
        group,
        active: false,
        kind: 'bonus',
        z: 0,
        x: 0,
        scoreGroup,
        heartGroup,
        boostGroup,
        shieldGroup,
      });
    }
  }

  private initParticlePool(count: number): void {
    const geo = new THREE.OctahedronGeometry(0.16, 0);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
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

  private emitParticles(x: number, y: number, z: number, colorHex: number, count = 12): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.life = 0;
        p.maxLife = 0.4 + Math.random() * 0.28;
        p.mesh.visible = true;
        p.mesh.position.set(x, y, z);
        p.mesh.scale.setScalar(1);
        (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
        const angle = Math.random() * Math.PI * 2;
        const spd = 2.5 + Math.random() * 5.5;
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

  private syncInstancedSpires(): void {
    for (let i = 0; i < this.spireData.length; i++) {
      const s = this.spireData[i];
      _dummy.position.set(s.x, s.y, s.z);
      _dummy.rotation.set(0, i * 0.9, 0);
      _dummy.scale.set(s.sx, s.sy, s.sz);
      _dummy.updateMatrix();
      this.spireMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.spireMesh.instanceMatrix.needsUpdate = true;
  }

  public applyTheme(themeId: ThemeId): void {
    this.currentThemeId = themeId;
    const t = ENVIRONMENT_THEMES[themeId];

    this.scene.background = new THREE.Color(t.skyHex);
    this.scene.fog = new THREE.FogExp2(t.fogHex, t.fogDensity);

    this.keyLight.color.setHex(t.sunHex);
    this.keyLight.intensity = t.sunIntensity;
    this.hemiLight.color.setHex(t.hemiSkyHex);
    this.hemiLight.groundColor.setHex(t.hemiGroundHex);
    this.hemiLight.intensity = t.hemiIntensity;

    this.groundMat.color.setHex(this.highContrast ? 0x0f172a : t.groundHex);
    this.cloudMat.color.setHex(t.cloudHex);
    this.spireMat.color.setHex(t.sceneryHex);

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
      this.gateFrameMat.color.setHex(t.uiAccentCss ? parseInt(t.uiAccentCss.slice(1), 16) : 0x38bdf8);
      this.gateFrameMat.emissive.setHex(t.obstacleAccentHex);
      this.gateFrameMat.emissiveIntensity = 0.35;
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

    // Lightweight graphics scaling
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

    if (!settings.randomThemePerSession && this.runningState === 'menu') {
      this.applyTheme(settings.selectedTheme);
    } else {
      this.applyTheme(this.currentThemeId);
    }
  }

  public updateBestScore(best: number): void {
    this.bestScore = best;
  }

  public setPlaneType(planeId: PlaneId): void {
    if (this.planeStats.planeId === planeId) return;
    this.planeStats = { ...this.planeStats, planeId };
    this.scene.remove(this.plane.root);
    this.plane.dispose();
    this.plane = createProceduralPlane(this.isSoftwareGl, planeId);
    this.plane.root.position.set(this.planeX, PLANE_Y, 0);
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
    this.emitParticles(this.planeX, PLANE_Y, 1.4, 0xf97316, 14);
    this.callbacks.onAnnounce(`Jet Booster aktif! Sisa muatan Jet: ${this.jetCharges}.`);
    const { steer, source } = this.input.sample();
    this.emitHudSnapshot(steer, source);
    return true;
  }

  public startSession(mode: GameMode, settings: GameSettings, planeStats: EffectivePlaneStats): void {
    soundEngine.unlock();
    soundEngine.startDynamicMusic('flight');

    if (this.planeStats.planeId !== planeStats.planeId) {
      this.setPlaneType(planeStats.planeId);
    }
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
    this.planeVelX = 0;
    this.planeRoll = 0;
    this.forwardSpeed = (mode === 'practice' ? 20 : 24) * planeStats.speedMultiplier;
    this.distance = 0;
    this.bonusScore = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.powerUpsCollected = 0;
    this.lives = planeStats.maxLives;
    this.durability = planeStats.maxDurabilityPerLife;
    this.armorRemaining = planeStats.maxArmorCharges;
    this.armorRechargeTimer = 0;
    this.jetCharges = planeStats.maxJetCharges;
    this.jetRechargeTimer = 0;
    this.hasShield = false;
    this.turboRemaining = 0;
    this.boosterActiveRemaining = 0;
    this.invulnTimer = 0.7;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;
    this.spawnDistanceAccum = 0;
    this.powerUpSpawnAccum = 0;
    this.practiceStep = 0;
    this.practiceTimer = 0;

    this.plane.shieldMesh.visible = false;
    this.plane.armorMesh.visible = this.armorRemaining > 0;
    this.plane.root.visible = true;

    for (const ob of this.obstacles) {
      ob.active = false;
      ob.group.visible = false;
    }
    for (const pu of this.powerUps) {
      pu.active = false;
      pu.group.visible = false;
    }

    if (mode === 'practice') {
      this.spawnObstacle('gate', -68, 0);
      this.spawnPowerUp('bonus', -92, -3.5);
      this.spawnPowerUp('shield', -116, 3.5);
      this.callbacks.onAnnounce(
        'Mode Latihan dimulai. Geser layar atau gunakan tombol A/D atau Panah untuk mengemudikan pesawat.',
      );
    } else {
      this.spawnObstacle('gate', -72, 0);
      this.callbacks.onAnnounce(
        `Penerbangan dimulai dengan ${planeStats.name} di tema ${ENVIRONMENT_THEMES[this.currentThemeId].name}.`,
      );
    }

    this.emitHudSnapshot(0, 'keyboard');
  }

  public pause(): void {
    if (this.runningState === 'playing') {
      this.runningState = 'paused';
      soundEngine.stopWind();
    }
  }

  public resume(): void {
    if (this.runningState === 'paused') {
      this.runningState = 'playing';
      this.clock.getDelta();
      soundEngine.startDynamicMusic('flight');
    }
  }

  public returnToMenu(): void {
    this.runningState = 'menu';
    this.hasShield = false;
    this.armorRemaining = 0;
    this.armorRechargeTimer = 0;
    this.jetCharges = 0;
    this.jetRechargeTimer = 0;
    this.turboRemaining = 0;
    this.boosterActiveRemaining = 0;
    this.plane.shieldMesh.visible = false;
    this.plane.armorMesh.visible = false;
    this.plane.root.visible = true;
    for (const ob of this.obstacles) {
      ob.active = false;
      ob.group.visible = false;
    }
    for (const pu of this.powerUps) {
      pu.active = false;
      pu.group.visible = false;
    }
    soundEngine.startDynamicMusic('menu');
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

    unit.active = true;
    unit.kind = kind;
    unit.z = forcedZ ?? SPAWN_Z;
    unit.gateScored = false;
    unit.oscPhase = Math.random() * Math.PI * 2;
    unit.oscAmp = kind === 'mover' ? 2.0 + Math.min(2.0, difficulty * 0.28) : 0;
    unit.oscSpeed = kind === 'mover' ? 1.15 + Math.min(1.1, difficulty * 0.12) : 0;
    unit.spinSpeed = kind === 'turbine' ? 1.7 + difficulty * 0.16 : 0;

    unit.centerMesh.visible = kind === 'pillar' || kind === 'mover' || kind === 'turbine';
    unit.spinnerGroup.visible = kind === 'turbine';
    unit.leftPillar.visible = kind === 'gate';
    unit.rightPillar.visible = kind === 'gate';
    unit.topArch.visible = kind === 'gate';

    if (kind === 'gate') {
      const gapHalf = Math.max(3.2, 4.7 - difficulty * 0.12);
      unit.gateGapHalf = gapHalf;
      unit.halfWidth = gapHalf + 1.2;
      unit.baseX =
        forcedX ?? (Math.random() - 0.5) * (CORRIDOR_HALF_WIDTH - gapHalf - 2.0) * 1.5;
      unit.leftPillar.position.x = -gapHalf - 0.85;
      unit.rightPillar.position.x = gapHalf + 0.85;
      unit.topArch.scale.x = (gapHalf + 0.85) * 2 + 1.6;
    } else {
      unit.gateGapHalf = 0;
      unit.halfWidth = kind === 'turbine' ? 1.5 : 1.05;
      const range = CORRIDOR_HALF_WIDTH - 2.2;
      unit.baseX = forcedX ?? (Math.random() - 0.5) * range * 2;
    }

    unit.x = unit.baseX;
    unit.group.position.set(unit.x, GROUND_Y, unit.z);
    unit.group.visible = true;
  }

  private spawnPowerUp(forcedKind?: PowerUpType, forcedZ?: number, forcedX?: number): void {
    const pu = this.powerUps.find((p) => !p.active);
    if (!pu) return;

    let kind: PowerUpType;
    if (forcedKind) {
      kind = forcedKind;
    } else {
      // Rasio kemunculan: Hati 10%, Skor 30%, Perisai 15%, Booster 15% (30% tidak muncul)
      const r = Math.random();
      if (r < 0.1) {
        kind = 'heart';
      } else if (r < 0.4) {
        kind = 'bonus';
      } else if (r < 0.55) {
        kind = 'shield';
      } else if (r < 0.7) {
        kind = 'turbo';
      } else {
        return;
      }
    }

    pu.active = true;
    pu.kind = kind;
    pu.z = forcedZ ?? SPAWN_Z - 12;
    pu.x = forcedX ?? (Math.random() - 0.5) * (CORRIDOR_HALF_WIDTH - 3) * 1.8;

    pu.scoreGroup.visible = kind === 'bonus';
    pu.heartGroup.visible = kind === 'heart';
    pu.boostGroup.visible = kind === 'turbo';
    pu.shieldGroup.visible = kind === 'shield';

    pu.group.position.set(pu.x, PLANE_Y + 0.15, pu.z);
    pu.group.visible = true;
  }

  private getDifficultyLevel(): number {
    if (this.gameMode === 'practice') return 1;
    return 1 + Math.floor(this.distance / 650);
  }

  private getPracticeGuidance(): { step: number; message: string } {
    if (this.practiceStep === 0) {
      return {
        step: 0,
        message: 'Langkah 1/3: Geser layar kiri/kanan (atau tekan A/D / Panah) untuk berbelok.',
      };
    }
    if (this.practiceStep === 1) {
      return {
        step: 1,
        message: 'Langkah 2/3: Terbang melewati Gerbang Biru untuk mendapat +5 Skor!',
      };
    }
    if (this.practiceStep === 2) {
      return {
        step: 2,
        message: 'Langkah 3/3: Ambil Bintang Skor (+10), Hati (+1 Nyawa), Petir Boost, atau Perisai!',
      };
    }
    return {
      step: 3,
      message: 'Hebat! Anda menguasai kontrol dasar. Terus berlatih atau mulai mode Kompetisi!',
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
    // Update particles even during hitstop/gameover
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
      // Calm scenic live-world camera pan & autopilot glide
      const menuSpeed = 16;
      this.groundTex.offset.y -= dt * (menuSpeed * 0.045);
      this.planeX = Math.sin(elapsed * 0.55) * 3.4;
      this.planeRoll = Math.cos(elapsed * 0.55) * -0.22;

      this.plane.root.position.set(this.planeX, PLANE_Y + Math.sin(elapsed * 1.8) * 0.14, 0);
      this.plane.bodyGroup.rotation.z = this.planeRoll;
      this.plane.bodyGroup.rotation.x = Math.sin(elapsed * 1.4) * 0.04;
      this.contactShadow.position.x = this.planeX;

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.planeX * 0.35 + Math.sin(elapsed * 0.25) * 1.2, 3, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 2.55, 3, dt);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 60, 4, dt);
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(this.planeX * 0.4, 0.25, -14);

      this.scrollScenery(menuSpeed, dt);
      return;
    }

    if (this.runningState === 'paused' || this.runningState === 'gameover') {
      return;
    }

    // Hitstop brief freeze on heavy impact
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.5);
      this.applyCameraShake();
      return;
    }

    // Active Gameplay Simulation
    const { steer, source } = this.input.sample();
    const difficulty = this.getDifficultyLevel();

    // Practice progression tracking
    if (this.gameMode === 'practice') {
      this.practiceTimer += dt;
      if (this.practiceStep === 0 && Math.abs(steer) > 0.28 && this.practiceTimer > 1.5) {
        this.practiceStep = 1;
        this.callbacks.onAnnounce(this.getPracticeGuidance().message);
      }
    }

    // Turbo & Active Booster countdown
    const turboActive = this.turboRemaining > 0;
    if (turboActive) {
      this.turboRemaining = Math.max(0, this.turboRemaining - dt);
    }

    const boosterActive = this.boosterActiveRemaining > 0;
    if (boosterActive) {
      this.boosterActiveRemaining = Math.max(0, this.boosterActiveRemaining - dt);
    }

    // 5-second recharge for Jet charges
    if (this.jetCharges < this.planeStats.maxJetCharges) {
      if (this.jetRechargeTimer <= 0) {
        this.jetRechargeTimer = this.planeStats.rechargeIntervalSec;
      } else {
        this.jetRechargeTimer -= dt;
        if (this.jetRechargeTimer <= 0) {
          this.jetCharges += 1;
          this.jetRechargeTimer =
            this.jetCharges < this.planeStats.maxJetCharges
              ? this.planeStats.rechargeIntervalSec
              : 0;
          this.emitParticles(this.planeX, PLANE_Y, 0.8, 0xf97316, 8);
        }
      }
    } else {
      this.jetRechargeTimer = 0;
    }

    // 5-second recharge for Pelindung (Armor) charges
    if (this.armorRemaining < this.planeStats.maxArmorCharges) {
      if (this.armorRechargeTimer <= 0) {
        this.armorRechargeTimer = this.planeStats.rechargeIntervalSec;
      } else {
        this.armorRechargeTimer -= dt;
        if (this.armorRechargeTimer <= 0) {
          this.armorRemaining += 1;
          this.armorRechargeTimer =
            this.armorRemaining < this.planeStats.maxArmorCharges
              ? this.planeStats.rechargeIntervalSec
              : 0;
          this.emitParticles(this.planeX, PLANE_Y, 0, 0x14b8a6, 10);
        }
      }
    } else {
      this.armorRechargeTimer = 0;
    }

    if (this.invulnTimer > 0) {
      this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    }

    // Gentler Speed ramp modulated by plane class & upgrades
    const baseTargetSpeed =
      (this.gameMode === 'practice'
        ? 20
        : Math.min(48, 24 + (difficulty - 1) * 2.1)) * this.planeStats.speedMultiplier;
    const surgeFactor = turboActive || boosterActive ? 1.48 : 1.0;
    const targetSpeed = baseTargetSpeed * surgeFactor;
    this.forwardSpeed = THREE.MathUtils.damp(this.forwardSpeed, targetSpeed, 4.5, dt);

    // Lateral steering (Kecepatan belok + kelincahan respon)
    const maxLateralSpeed = 18.0 * this.planeStats.lateralAgility;
    const steeringResponsiveness = 7.5 + this.planeStats.lateralAgility * 5.2;
    const targetVelX = steer * maxLateralSpeed;
    this.planeVelX = THREE.MathUtils.damp(this.planeVelX, targetVelX, steeringResponsiveness, dt);
    this.planeX += this.planeVelX * dt;

    const boundX = CORRIDOR_HALF_WIDTH - 1.5;
    if (this.planeX < -boundX) {
      this.planeX = -boundX;
      this.planeVelX = 0;
    } else if (this.planeX > boundX) {
      this.planeX = boundX;
      this.planeVelX = 0;
    }

    // Smooth aircraft banking & visual polish
    const targetRoll = THREE.MathUtils.clamp(-this.planeVelX * 0.036, -0.68, 0.68);
    this.planeRoll = THREE.MathUtils.damp(this.planeRoll, targetRoll, 12, dt);

    const bobY = this.reducedMotion ? 0 : Math.sin(elapsed * 3.4) * 0.07;
    this.plane.root.position.set(this.planeX, PLANE_Y + bobY, 0);
    this.plane.bodyGroup.rotation.z = this.planeRoll;
    this.plane.bodyGroup.rotation.y = -this.planeVelX * 0.012;
    this.contactShadow.position.x = this.planeX;

    // Blink during post-hit invulnerability
    if (this.invulnTimer > 0) {
      this.plane.bodyGroup.visible = Math.floor(this.invulnTimer * 18) % 2 === 0;
    } else {
      this.plane.bodyGroup.visible = true;
    }

    // Shield, Armor & Turbo visuals
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
    const flameTarget = boostFlame ? 1.65 + Math.sin(elapsed * 28) * 0.25 : 0.45 + (this.forwardSpeed / 65) * 0.4;
    this.plane.turboFlame.scale.set(
      boostFlame ? 1.28 : 0.75,
      boostFlame ? 1.28 : 0.75,
      flameTarget,
    );

    // Distance & Score accumulation
    const dz = this.forwardSpeed * dt;
    this.distance += dz;
    this.groundTex.offset.y -= dt * (this.forwardSpeed * 0.048);

    // Audio dynamic intensity
    const normIntensity = THREE.MathUtils.clamp((this.forwardSpeed - 22) / 36, 0, 1);
    soundEngine.setFlightDynamics(normIntensity, boostFlame, steer);

    // Spawn Obstacles & PowerUps (gentler spacing)
    const spawnSpacing =
      this.gameMode === 'practice'
        ? 42
        : Math.max(25, 41 - (difficulty - 1) * 1.15);
    this.spawnDistanceAccum += dz;
    if (this.spawnDistanceAccum >= spawnSpacing) {
      this.spawnDistanceAccum = 0;
      this.spawnObstacle();
      // Flanking pillar only at higher difficulty
      if (this.gameMode === 'standard' && difficulty >= 4 && Math.random() < 0.24) {
        this.spawnObstacle('pillar', SPAWN_Z - 4);
      }
    }

    this.powerUpSpawnAccum += dz;
    if (this.powerUpSpawnAccum >= (this.gameMode === 'practice' ? 30 : 36)) {
      this.powerUpSpawnAccum = 0;
      this.spawnPowerUp();
    }

    // Update Obstacles & Collision Check
    for (const ob of this.obstacles) {
      if (!ob.active) continue;
      ob.z += dz;

      if (ob.kind === 'mover') {
        ob.x = ob.baseX + Math.sin(elapsed * ob.oscSpeed + ob.oscPhase) * ob.oscAmp;
      } else if (ob.kind === 'turbine') {
        ob.spinnerGroup.rotation.z += ob.spinSpeed * dt;
      }

      ob.group.position.set(ob.x, GROUND_Y, ob.z);

      // Gate pass bonus check (+5 per gate!)
      if (ob.kind === 'gate' && !ob.gateScored && ob.z > 0.3) {
        const dx = Math.abs(this.planeX - ob.x);
        if (dx < ob.gateGapHalf - 0.35) {
          ob.gateScored = true;
          this.combo += 1;
          if (this.combo > this.maxCombo) this.maxCombo = this.combo;
          this.bonusScore += 5;
          soundEngine.playGatePass(this.combo);
          this.emitParticles(this.planeX, PLANE_Y + 0.3, -0.5, 0x38bdf8, 10);
          if (this.gameMode === 'practice' && this.practiceStep === 1) {
            this.practiceStep = 2;
            this.callbacks.onAnnounce(this.getPracticeGuidance().message);
          }
        }
      }

      // Collision check near Z = 0
      if (Math.abs(ob.z) < 1.15) {
        let hit = false;
        if (ob.kind === 'gate') {
          const leftColX = ob.x - ob.gateGapHalf - 0.85;
          const rightColX = ob.x + ob.gateGapHalf + 0.85;
          if (Math.abs(this.planeX - leftColX) < 1.55 || Math.abs(this.planeX - rightColX) < 1.55) {
            hit = true;
          }
        } else {
          if (Math.abs(this.planeX - ob.x) < ob.halfWidth + 0.95) {
            hit = true;
          }
        }

        if (hit && this.invulnTimer <= 0) {
          this.handleObstacleImpact(ob);
        }
      }

      if (ob.z > DESPAWN_Z) {
        ob.active = false;
        ob.group.visible = false;
      }
    }

    // Update PowerUps & Collection
    for (const pu of this.powerUps) {
      if (!pu.active) continue;
      pu.z += dz;
      pu.group.position.set(pu.x, PLANE_Y + 0.15 + Math.sin(elapsed * 4 + pu.z) * 0.18, pu.z);
      pu.group.rotation.y += dt * 2.4;

      if (Math.abs(pu.z) < 1.75 && Math.abs(this.planeX - pu.x) < 2.25) {
        this.collectPowerUp(pu);
      }

      if (pu.z > DESPAWN_Z) {
        pu.active = false;
        pu.group.visible = false;
      }
    }

    // Scroll instanced scenery
    this.scrollScenery(this.forwardSpeed, dt);

    // Camera Follow + Turbo/Booster FOV
    const targetFov = boostFlame ? 77 : 65 + Math.min(5, (difficulty - 1) * 0.9);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5.5, dt);
    this.camera.updateProjectionMatrix();

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.planeX * 0.54, 7, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 2.7, 6, dt);
    this.camera.position.z = 7.4;

    this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.2);
    this.applyCameraShake();
    this.camera.lookAt(this.planeX * 0.72, 0.25, -14);

    // Throttled HUD updates (~20Hz) so React never slows down the 60fps loop
    this.hudThrottle += dt;
    if (this.hudThrottle >= 0.05) {
      this.hudThrottle = 0;
      this.emitHudSnapshot(steer, source);
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

    for (let i = 0; i < this.spireData.length; i++) {
      const s = this.spireData[i];
      s.z += dz;
      if (s.z > DESPAWN_Z + 12) {
        s.z -= 36 * 5.4;
      }
    }
    this.syncInstancedSpires();
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
      this.emitParticles(this.planeX, PLANE_Y, 0, 0xf97316, 16);
      this.callbacks.onAnnounce('Item Boost aktif! Kecepatan meningkat sementara.');
    } else if (pu.kind === 'shield') {
      this.hasShield = true;
      this.emitParticles(this.planeX, PLANE_Y, 0, 0x14b8a6, 16);
      this.callbacks.onAnnounce('Item Perisai aktif! Melindungi dari 1 benturan.');
    } else if (pu.kind === 'heart') {
      if (this.lives < this.planeStats.maxLives) {
        this.lives += 1;
        this.durability = this.planeStats.maxDurabilityPerLife;
        this.callbacks.onAnnounce(`Item Hati! Nyawa bertambah menjadi ${this.lives}.`);
      } else {
        this.durability = this.planeStats.maxDurabilityPerLife;
        this.bonusScore += 5;
        this.callbacks.onAnnounce('Item Hati! Ketahanan pulih penuh & bonus +5 skor.');
      }
      this.emitParticles(this.planeX, PLANE_Y, 0, 0xef4444, 16);
    } else {
      this.combo += 1;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.bonusScore += 10;
      this.emitParticles(this.planeX, PLANE_Y, 0, 0xfacc15, 14);
      this.callbacks.onAnnounce('Item Skor! +10 Skor.');
    }

    if (this.gameMode === 'practice' && this.practiceStep === 2) {
      this.practiceStep = 3;
      this.callbacks.onAnnounce(this.getPracticeGuidance().message);
    }
  }

  private handleObstacleImpact(ob: ObstacleUnit): void {
    const invulnDuration = 1.45;
    const dmg =
      ob.kind === 'gate'
        ? OBSTACLE_DAMAGE.gate
        : ob.kind === 'turbine'
          ? OBSTACLE_DAMAGE.turbine
          : OBSTACLE_DAMAGE.small;
    const objLabel = ob.kind === 'gate' ? 'Gawang' : ob.kind === 'turbine' ? 'Turbin' : 'Benda Kecil';

    // 1. Energy Shield Power-up absorbs hit first
    if (this.hasShield) {
      this.hasShield = false;
      this.invulnTimer = invulnDuration;
      this.hitstopTimer = 0.055;
      this.shakeIntensity = 0.45;
      ob.active = false;
      ob.group.visible = false;
      soundEngine.playShieldDeflect();
      this.emitParticles(this.planeX, PLANE_Y, 0, 0x2dd4bf, 24);
      this.callbacks.onAnnounce('Benturan ditahan oleh Item Perisai!');
      const { steer, source } = this.input.sample();
      this.emitHudSnapshot(steer, source);
      return;
    }

    // 2. Recharging Plane Pelindung (Armor) absorbs hit without reducing durability or life!
    if (this.armorRemaining > 0) {
      this.armorRemaining -= 1;
      if (this.armorRechargeTimer <= 0) {
        this.armorRechargeTimer = this.planeStats.rechargeIntervalSec;
      }
      this.invulnTimer = invulnDuration;
      this.hitstopTimer = 0.055;
      this.shakeIntensity = 0.42;
      ob.active = false;
      ob.group.visible = false;
      this.plane.armorMesh.visible = this.armorRemaining > 0;
      soundEngine.playShieldDeflect();
      this.emitParticles(this.planeX, PLANE_Y, 0, 0xf59e0b, 22);
      this.callbacks.onAnnounce(
        `Pelindung menahan benturan! Sisa pelindung: ${this.armorRemaining}. Mengisi ulang tiap ${Math.round(this.planeStats.rechargeIntervalSec)} detik.`,
      );
      const { steer, source } = this.input.sample();
      this.emitHudSnapshot(steer, source);
      return;
    }

    // 3. Practice Mode: safe coaching bounce
    if (this.gameMode === 'practice') {
      this.invulnTimer = invulnDuration;
      this.hitstopTimer = 0.04;
      this.shakeIntensity = 0.3;
      this.combo = 0;
      ob.active = false;
      ob.group.visible = false;
      soundEngine.playShieldDeflect();
      this.emitParticles(this.planeX, PLANE_Y, 0, 0xfbbf24, 14);
      this.callbacks.onAnnounce('Menabrak rintangan di Mode Latihan. Coba belok lebih awal untuk menghindar.');
      return;
    }

    // 4. Deduct object damage from current life's durability!
    this.durability -= dmg;
    this.combo = 0;

    if (this.durability > 0) {
      this.invulnTimer = 1.25;
      this.hitstopTimer = 0.045;
      this.shakeIntensity = 0.4;
      ob.active = false;
      ob.group.visible = false;
      soundEngine.playShieldDeflect();
      this.emitParticles(this.planeX, PLANE_Y, 0, 0xfbbf24, 16);
      this.callbacks.onAnnounce(
        `Menabrak ${objLabel} (-${dmg} Kekuatan). Sisa ketahanan ${this.durability}/${this.planeStats.maxDurabilityPerLife}.`,
      );
      const { steer, source } = this.input.sample();
      this.emitHudSnapshot(steer, source);
      return;
    }

    // 5. Current life's durability depleted -> Lose 1 Life (or Game Over on final life)
    if (this.lives > 1) {
      this.lives -= 1;
      this.durability = this.planeStats.maxDurabilityPerLife;
      this.invulnTimer = 1.85;
      this.hitstopTimer = 0.06;
      this.shakeIntensity = 0.65;
      ob.active = false;
      ob.group.visible = false;
      soundEngine.playDamage();
      this.emitParticles(this.planeX, PLANE_Y, 0, 0xf87171, 20);
      this.callbacks.onAnnounce(`Nyawa berkurang! Sisa nyawa ${this.lives} dari ${this.planeStats.maxLives}.`);
      const { steer, source } = this.input.sample();
      this.emitHudSnapshot(steer, source);
      return;
    }

    // 6. Final Life Lost -> Game Over
    this.durability = 0;
    this.lives = 0;
    this.runningState = 'gameover';
    this.hitstopTimer = 0.07;
    this.shakeIntensity = 0.75;
    this.plane.root.visible = false;
    soundEngine.stopWind();
    soundEngine.playCrash();
    this.emitParticles(this.planeX, PLANE_Y, 0, 0xf87171, 28);

    const finalScore = this.computeTotalScore();
    const earnedPoints = this.computeEarnedPoints();
    const { steer, source } = this.input.sample();
    this.emitHudSnapshot(steer, source);

    const summary: GameOverSummary = {
      score: finalScore,
      distance: Math.round(this.distance),
      maxCombo: this.maxCombo,
      powerUpsCollected: this.powerUpsCollected,
      pointsEarned: earnedPoints,
      planeId: this.planeStats.planeId,
      themeId: this.currentThemeId,
      controlUsed: source,
      mode: this.gameMode,
      isNewBest: finalScore > this.bestScore,
    };
    this.callbacks.onAnnounce(
      `Permainan selesai. Skor akhir ${finalScore}, jarak ${summary.distance} meter, mendapat ${earnedPoints} poin.`,
    );
    this.callbacks.onGameOver(summary);
  }

  private computeTotalScore(): number {
    return this.bonusScore;
  }

  private computeEarnedPoints(): number {
    return this.gameMode === 'standard' ? this.bonusScore : 0;
  }

  private emitHudSnapshot(steer: number, source: 'keyboard' | 'touch'): void {
    const guidance = this.getPracticeGuidance();
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
      turboRemaining: this.turboRemaining,
      turboDuration: 5.5,
      boosterActiveRemaining: this.boosterActiveRemaining,
      planeId: this.planeStats.planeId,
      steerInput: steer,
      activeControl: source,
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
    this.powerUpDisposables.forEach((d) => d.dispose());
    this.groundTex.dispose();
    this.groundMesh.geometry.dispose();
    this.groundMat.dispose();
    this.cloudMesh.geometry.dispose();
    this.cloudMat.dispose();
    this.spireMesh.geometry.dispose();
    this.spireMat.dispose();
    this.obstacleBodyMat.dispose();
    this.obstacleAccentMat.dispose();
    this.gateFrameMat.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
