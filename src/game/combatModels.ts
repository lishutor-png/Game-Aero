import * as THREE from 'three';
import type { EnemyKind, MapId, WeaponType } from '../types/game';

export interface EnemyVisualHandles {
  root: THREE.Group;
  modelByKind: Record<EnemyKind, THREE.Group>;
  bossStageGroups: THREE.Group[];
  setBossStage: (stageNumber: number) => void;
  spinnerParts: THREE.Object3D[];
  dispose: () => void;
}

export interface ObstacleVisualHandles {
  root: THREE.Group;
  centerMesh: THREE.Group;
  leftPillar: THREE.Group;
  rightPillar: THREE.Group;
  topArch: THREE.Mesh;
  spinnerGroup: THREE.Group;
  // Map-specific centerpiece meshes toggled cleanly without allocation
  rockVariant: THREE.Group;
  treeVariant: THREE.Group;
  buildingVariant: THREE.Group;
  towerVariant: THREE.Group;
  futuristicVariant: THREE.Group;
}

export interface SharedCombatMaterials {
  enemyHullMat: THREE.MeshStandardMaterial;
  enemyDarkMat: THREE.MeshStandardMaterial;
  enemyGlowMat: THREE.MeshStandardMaterial;
  bossHullMat: THREE.MeshStandardMaterial;
  bossCoreMat: THREE.MeshStandardMaterial;
  rockMat: THREE.MeshStandardMaterial;
  iceMat: THREE.MeshStandardMaterial;
  trunkMat: THREE.MeshStandardMaterial;
  foliageMat: THREE.MeshStandardMaterial;
  buildingMat: THREE.MeshStandardMaterial;
  windowGlowMat: THREE.MeshStandardMaterial;
  futuristicMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createSharedCombatMaterials(): SharedCombatMaterials {
  const enemyHullMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.28,
    metalness: 0.72,
  });
  const enemyDarkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.22,
    metalness: 0.85,
  });
  const enemyGlowMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.9,
    roughness: 0.2,
  });
  const bossHullMat = new THREE.MeshStandardMaterial({
    color: 0x450a0a,
    roughness: 0.24,
    metalness: 0.78,
  });
  const bossCoreMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xf97316,
    emissiveIntensity: 2.2,
    roughness: 0.15,
  });

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.88,
    metalness: 0.08,
    flatShading: true,
  });
  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    roughness: 0.14,
    metalness: 0.1,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
  });
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.92,
    metalness: 0.02,
  });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.78,
    metalness: 0.04,
  });
  const buildingMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.65,
  });
  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.15,
    roughness: 0.2,
  });
  const futuristicMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.22,
    metalness: 0.82,
  });

  const all = [
    enemyHullMat,
    enemyDarkMat,
    enemyGlowMat,
    bossHullMat,
    bossCoreMat,
    rockMat,
    iceMat,
    trunkMat,
    foliageMat,
    buildingMat,
    windowGlowMat,
    futuristicMat,
  ];

  return {
    enemyHullMat,
    enemyDarkMat,
    enemyGlowMat,
    bossHullMat,
    bossCoreMat,
    rockMat,
    iceMat,
    trunkMat,
    foliageMat,
    buildingMat,
    windowGlowMat,
    futuristicMat,
    dispose: () => all.forEach((m) => m.dispose()),
  };
}

export function createEnemyPoolUnit(
  mats: SharedCombatMaterials,
  includeBoss = false,
): EnemyVisualHandles {
  const root = new THREE.Group();
  root.visible = false;
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const spinnerParts: THREE.Object3D[] = [];

  // 1. DRONE KECIL (Scout Quad/Orb Drone - 5 composite parts)
  const drone = new THREE.Group();
  const droneCoreGeo = new THREE.OctahedronGeometry(0.62, 1);
  const droneRingGeo = new THREE.TorusGeometry(0.92, 0.075, 8, 20);
  droneRingGeo.rotateX(Math.PI / 2);
  const droneEyeGeo = new THREE.SphereGeometry(0.24, 10, 10);
  const dronePodGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.25, 8);
  geometries.push(droneCoreGeo, droneRingGeo, droneEyeGeo, dronePodGeo);

  const dCore = new THREE.Mesh(droneCoreGeo, mats.enemyHullMat);
  const dRing = new THREE.Mesh(droneRingGeo, mats.enemyDarkMat);
  const dEye = new THREE.Mesh(droneEyeGeo, mats.enemyGlowMat);
  dEye.position.z = 0.52;
  const dPodL = new THREE.Mesh(dronePodGeo, mats.enemyGlowMat);
  dPodL.position.set(-0.92, 0, 0);
  const dPodR = new THREE.Mesh(dronePodGeo, mats.enemyGlowMat);
  dPodR.position.set(0.92, 0, 0);
  drone.add(dCore, dRing, dEye, dPodL, dPodR);
  spinnerParts.push(dRing);

  // 2. PESAWAT TEMPUR MUSUH (Enemy Fighter - 6 composite parts)
  const fighter = new THREE.Group();
  const fHullGeo = new THREE.ConeGeometry(0.42, 2.5, 12);
  fHullGeo.rotateX(Math.PI / 2);
  const fWingShape = new THREE.Shape();
  fWingShape.moveTo(0, -0.35);
  fWingShape.lineTo(1.75, 0.45);
  fWingShape.lineTo(1.75, 0.72);
  fWingShape.lineTo(0, 0.5);
  fWingShape.closePath();
  const fWingGeo = new THREE.ExtrudeGeometry(fWingShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
  fWingGeo.rotateX(Math.PI / 2);
  const fCanopyGeo = new THREE.CapsuleGeometry(0.18, 0.45, 4, 10);
  fCanopyGeo.rotateX(Math.PI / 2);
  const fEngineGeo = new THREE.TorusGeometry(0.2, 0.05, 8, 14);
  geometries.push(fHullGeo, fWingGeo, fCanopyGeo, fEngineGeo);

  const fHull = new THREE.Mesh(fHullGeo, mats.enemyHullMat);
  const fWingR = new THREE.Mesh(fWingGeo, mats.enemyDarkMat);
  const fWingL = new THREE.Mesh(fWingGeo, mats.enemyDarkMat);
  fWingL.scale.x = -1;
  const fCanopy = new THREE.Mesh(fCanopyGeo, mats.enemyGlowMat);
  fCanopy.position.set(0, 0.2, 0.15);
  const fEngine = new THREE.Mesh(fEngineGeo, mats.enemyGlowMat);
  fEngine.position.set(0, 0, -1.2);
  fighter.add(fHull, fWingR, fWingL, fCanopy, fEngine);

  // 3. PESAWAT INTERCEPTOR (Sleek Forward-Swept Stealth Dart - 5 parts)
  const interceptor = new THREE.Group();
  const iBodyGeo = new THREE.ConeGeometry(0.34, 3.0, 6);
  iBodyGeo.rotateX(Math.PI / 2);
  iBodyGeo.scale(1.3, 0.65, 1.0);
  const iWingShape = new THREE.Shape();
  iWingShape.moveTo(0, 0.4);
  iWingShape.lineTo(1.65, -0.45);
  iWingShape.lineTo(1.4, -0.75);
  iWingShape.lineTo(0, -0.2);
  iWingShape.closePath();
  const iWingGeo = new THREE.ExtrudeGeometry(iWingShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
  iWingGeo.rotateX(Math.PI / 2);
  const iCoreGeo = new THREE.BoxGeometry(0.24, 0.16, 1.4);
  geometries.push(iBodyGeo, iWingGeo, iCoreGeo);

  const iBody = new THREE.Mesh(iBodyGeo, mats.enemyDarkMat);
  const iWingR = new THREE.Mesh(iWingGeo, mats.enemyHullMat);
  const iWingL = new THREE.Mesh(iWingGeo, mats.enemyHullMat);
  iWingL.scale.x = -1;
  const iGlow = new THREE.Mesh(iCoreGeo, mats.enemyGlowMat);
  iGlow.position.y = 0.12;
  interceptor.add(iBody, iWingR, iWingL, iGlow);

  // 4. KAPAL TEMPUR LUAR ANGKASA (Heavy Gunship Cruiser - 7 parts)
  const warship = new THREE.Group();
  const wHullGeo = new THREE.BoxGeometry(1.75, 0.72, 3.8);
  const wBridgeGeo = new THREE.BoxGeometry(0.95, 0.48, 1.4);
  const wWingGeo = new THREE.BoxGeometry(3.8, 0.16, 1.25);
  const wTurretGeo = new THREE.CylinderGeometry(0.28, 0.35, 0.4, 10);
  const wThrusterGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.5, 12);
  wThrusterGeo.rotateX(Math.PI / 2);
  geometries.push(wHullGeo, wBridgeGeo, wWingGeo, wTurretGeo, wThrusterGeo);

  const wHull = new THREE.Mesh(wHullGeo, mats.enemyHullMat);
  const wBridge = new THREE.Mesh(wBridgeGeo, mats.enemyDarkMat);
  wBridge.position.set(0, 0.52, -0.3);
  const wWing = new THREE.Mesh(wWingGeo, mats.enemyDarkMat);
  wWing.position.set(0, -0.05, 0.25);
  const wTurret = new THREE.Mesh(wTurretGeo, mats.enemyGlowMat);
  wTurret.position.set(0, 0.85, -0.2);
  const wEngineL = new THREE.Mesh(wThrusterGeo, mats.enemyGlowMat);
  wEngineL.position.set(-1.3, 0, -1.5);
  const wEngineR = new THREE.Mesh(wThrusterGeo, mats.enemyGlowMat);
  wEngineR.position.set(1.3, 0, -1.5);
  warship.add(wHull, wBridge, wWing, wTurret, wEngineL, wEngineR);

  // 5. EVOLVING STAGE BOSSES (Lv.1 Hutan -> Lv.5 Angkasa, built only for dedicated Boss slot)
  const boss = new THREE.Group();
  const bossStageGroups: THREE.Group[] = [];

  const setBossStage = (stageNumber: number) => {
    const idx = Math.min(Math.max(0, stageNumber - 1), Math.max(0, bossStageGroups.length - 1));
    for (let i = 0; i < bossStageGroups.length; i++) {
      bossStageGroups[i].visible = i === idx;
    }
  };

  if (includeBoss) {
    const barrelGeo = new THREE.CylinderGeometry(0.14, 0.17, 1.8, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const smallWingShape = new THREE.Shape();
    smallWingShape.moveTo(0, -0.5);
    smallWingShape.lineTo(2.9, 0.7);
    smallWingShape.lineTo(2.9, 1.15);
    smallWingShape.lineTo(0, 0.85);
    smallWingShape.closePath();
    const wingStage1Geo = new THREE.ExtrudeGeometry(smallWingShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 1,
    });
    wingStage1Geo.rotateX(Math.PI / 2);

    const wideWingShape = new THREE.Shape();
    wideWingShape.moveTo(0, -0.75);
    wideWingShape.lineTo(4.1, 0.55);
    wideWingShape.lineTo(4.3, 1.35);
    wideWingShape.lineTo(1.2, 1.15);
    wideWingShape.lineTo(0, 0.9);
    wideWingShape.closePath();
    const wingStageWideGeo = new THREE.ExtrudeGeometry(wideWingShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 1,
    });
    wingStageWideGeo.rotateX(Math.PI / 2);

    const noseConeGeo = new THREE.ConeGeometry(0.82, 4.4, 10);
    noseConeGeo.rotateX(Math.PI / 2);
    const canopyGeo = new THREE.CapsuleGeometry(0.36, 1.0, 6, 10);
    canopyGeo.rotateX(Math.PI / 2);
    const jetPodGeo = new THREE.CylinderGeometry(0.38, 0.48, 2.2, 10);
    jetPodGeo.rotateX(Math.PI / 2);
    const finGeo = new THREE.BoxGeometry(0.14, 1.25, 1.35);
    const bCoreGeo = new THREE.IcosahedronGeometry(0.75, 1);
    const bRingGeo = new THREE.TorusGeometry(1.35, 0.1, 8, 24);
    const bOuterRingGeo = new THREE.TorusGeometry(2.15, 0.11, 8, 28);
    geometries.push(
      barrelGeo,
      wingStage1Geo,
      wingStageWideGeo,
      noseConeGeo,
      canopyGeo,
      jetPodGeo,
      finGeo,
      bCoreGeo,
      bRingGeo,
      bOuterRingGeo,
    );

    // Stage 1 Boss (Forest - Sylvan Scout Ace: 1 cannon, emerald/bronze hull)
    const b1Mat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.34, metalness: 0.65 });
    const b1Glow = new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x22c55e, emissiveIntensity: 1.7 });
    const b1 = new THREE.Group();
    const b1Body = new THREE.Mesh(noseConeGeo, b1Mat);
    const b1WingR = new THREE.Mesh(wingStage1Geo, mats.enemyDarkMat);
    const b1WingL = new THREE.Mesh(wingStage1Geo, mats.enemyDarkMat);
    b1WingL.scale.x = -1;
    const b1Canopy = new THREE.Mesh(canopyGeo, b1Glow);
    b1Canopy.position.set(0, 0.38, 0.25);
    const b1Fin = new THREE.Mesh(finGeo, b1Mat);
    b1Fin.position.set(0, 0.72, -1.4);
    const b1Cannon = new THREE.Mesh(barrelGeo, b1Glow);
    b1Cannon.position.set(0, -0.22, 1.6);
    b1.add(b1Body, b1WingR, b1WingL, b1Canopy, b1Fin, b1Cannon);

    // Stage 2 Boss (Desert - Dune Twin-Fang: 2 cannons, twin intakes, amber/crimson hull)
    const b2Mat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.3, metalness: 0.7 });
    const b2Glow = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1.9 });
    const b2 = new THREE.Group();
    const b2Body = new THREE.Mesh(noseConeGeo, b2Mat);
    b2Body.scale.set(1.22, 0.95, 1.15);
    const b2WingR = new THREE.Mesh(wingStageWideGeo, mats.enemyDarkMat);
    const b2WingL = new THREE.Mesh(wingStageWideGeo, mats.enemyDarkMat);
    b2WingL.scale.x = -1;
    const b2CanardR = new THREE.Mesh(wingStage1Geo, b2Mat);
    b2CanardR.scale.setScalar(0.45);
    b2CanardR.position.set(0.3, 0.05, 1.3);
    const b2CanardL = b2CanardR.clone();
    b2CanardL.scale.x = -0.45;
    b2CanardL.position.x = -0.3;
    const b2Canopy = new THREE.Mesh(canopyGeo, b2Glow);
    b2Canopy.position.set(0, 0.42, 0.3);
    const b2PodL = new THREE.Mesh(jetPodGeo, b2Mat);
    b2PodL.position.set(-1.35, -0.05, -0.5);
    const b2PodR = new THREE.Mesh(jetPodGeo, b2Mat);
    b2PodR.position.set(1.35, -0.05, -0.5);
    const b2GunL = new THREE.Mesh(barrelGeo, b2Glow);
    b2GunL.position.set(-1.85, -0.15, 1.45);
    const b2GunR = new THREE.Mesh(barrelGeo, b2Glow);
    b2GunR.position.set(1.85, -0.15, 1.45);
    b2.add(b2Body, b2WingR, b2WingL, b2CanardR, b2CanardL, b2Canopy, b2PodL, b2PodR, b2GunL, b2GunR);

    // Stage 3 Boss (City - Metro Tri-Valkyrie: 3 cannons, twin jets, stealth cobalt-cyan)
    const b3Mat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.24, metalness: 0.8 });
    const b3Glow = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 2.0 });
    const b3 = new THREE.Group();
    const b3Body = new THREE.Mesh(noseConeGeo, b3Mat);
    b3Body.scale.set(1.35, 1.0, 1.28);
    const b3WingR = new THREE.Mesh(wingStageWideGeo, b3Mat);
    b3WingR.scale.set(1.12, 1, 1.1);
    const b3WingL = new THREE.Mesh(wingStageWideGeo, b3Mat);
    b3WingL.scale.set(-1.12, 1, 1.1);
    const b3FinL = new THREE.Mesh(finGeo, mats.enemyDarkMat);
    b3FinL.position.set(-1.15, 0.78, -1.5);
    b3FinL.rotation.z = 0.28;
    const b3FinR = new THREE.Mesh(finGeo, mats.enemyDarkMat);
    b3FinR.position.set(1.15, 0.78, -1.5);
    b3FinR.rotation.z = -0.28;
    const b3Core = new THREE.Mesh(bCoreGeo, b3Glow);
    b3Core.position.set(0, 0.35, 0.85);
    const b3Ring = new THREE.Mesh(bRingGeo, b3Glow);
    b3Ring.position.set(0, 0.2, 1.6);
    spinnerParts.push(b3Ring);
    const b3GunC = new THREE.Mesh(barrelGeo, b3Glow);
    b3GunC.position.set(0, -0.25, 2.1);
    const b3GunL = new THREE.Mesh(barrelGeo, b3Glow);
    b3GunL.position.set(-2.3, -0.15, 1.3);
    const b3GunR = new THREE.Mesh(barrelGeo, b3Glow);
    b3GunR.position.set(2.3, -0.15, 1.3);
    b3.add(b3Body, b3WingR, b3WingL, b3FinL, b3FinR, b3Core, b3Ring, b3GunC, b3GunL, b3GunR);

    // Stage 4 Boss (Snow - Frost Quad-Dominator: 4 cannons, armored cryo-violet heavy wing)
    const b4Mat = new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.22, metalness: 0.84 });
    const b4Glow = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 2.1 });
    const b4 = new THREE.Group();
    const b4Hull = new THREE.Mesh(noseConeGeo, b4Mat);
    b4Hull.scale.set(1.55, 1.15, 1.38);
    const b4WingR = new THREE.Mesh(wingStageWideGeo, mats.enemyDarkMat);
    b4WingR.scale.set(1.26, 1.1, 1.22);
    const b4WingL = new THREE.Mesh(wingStageWideGeo, mats.enemyDarkMat);
    b4WingL.scale.set(-1.26, 1.1, 1.22);
    const b4PodL = new THREE.Mesh(jetPodGeo, b4Mat);
    b4PodL.position.set(-2.6, 0.05, -0.3);
    const b4PodR = new THREE.Mesh(jetPodGeo, b4Mat);
    b4PodR.position.set(2.6, 0.05, -0.3);
    const b4Core = new THREE.Mesh(bCoreGeo, b4Glow);
    b4Core.position.set(0, 0.45, 1.2);
    b4Core.scale.setScalar(1.2);
    const b4Ring = new THREE.Mesh(bRingGeo, b4Glow);
    b4Ring.position.set(0, 0.25, 2.0);
    spinnerParts.push(b4Ring);
    for (const gx of [-3.3, -1.35, 1.35, 3.3]) {
      const g = new THREE.Mesh(barrelGeo, b4Glow);
      g.position.set(gx, -0.2, 1.6);
      b4.add(g);
    }
    b4.add(b4Hull, b4WingR, b4WingL, b4PodL, b4PodR, b4Core, b4Ring);

    // Stage 5 Boss (Space - Void Sovereign Prime: 5 cannons, obsidian/gold dread-fighter + dual spinning rings)
    const b5GoldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.22, metalness: 0.9 });
    const b5 = new THREE.Group();
    const b5Hull = new THREE.Mesh(noseConeGeo, mats.bossHullMat);
    b5Hull.scale.set(1.8, 1.25, 1.55);
    const b5WingR = new THREE.Mesh(wingStageWideGeo, mats.enemyDarkMat);
    b5WingR.scale.set(1.42, 1.2, 1.32);
    const b5WingL = new THREE.Mesh(wingStageWideGeo, mats.enemyDarkMat);
    b5WingL.scale.set(-1.42, 1.2, 1.32);
    const b5TrimR = new THREE.Mesh(wingStage1Geo, b5GoldMat);
    b5TrimR.scale.set(1.25, 0.85, 0.75);
    b5TrimR.position.set(0.3, 0.22, -0.4);
    const b5TrimL = new THREE.Mesh(wingStage1Geo, b5GoldMat);
    b5TrimL.scale.set(-1.25, 0.85, 0.75);
    b5TrimL.position.set(-0.3, 0.22, -0.4);
    const b5Core = new THREE.Mesh(bCoreGeo, mats.bossCoreMat);
    b5Core.position.set(0, 0.35, 2.1);
    b5Core.scale.setScalar(1.35);
    const b5InnerRing = new THREE.Mesh(bRingGeo, mats.bossCoreMat);
    b5InnerRing.position.set(0, 0.25, 2.4);
    const b5OuterRing = new THREE.Mesh(bOuterRingGeo, mats.enemyGlowMat);
    b5OuterRing.position.set(0, 0.25, 2.2);
    spinnerParts.push(b5InnerRing, b5OuterRing);
    for (const px of [-3.6, -1.8, 1.8, 3.6]) {
      const pod = new THREE.Mesh(jetPodGeo, mats.bossHullMat);
      pod.position.set(px, -0.05, -0.4);
      b5.add(pod);
    }
    for (const gx of [-4.0, -2.1, 0, 2.1, 4.0]) {
      const gun = new THREE.Mesh(barrelGeo, mats.bossCoreMat);
      gun.scale.set(1.15, 1.15, 1.25);
      gun.position.set(gx, -0.22, gx === 0 ? 2.6 : 1.7);
      b5.add(gun);
    }
    b5.add(b5Hull, b5WingR, b5WingL, b5TrimR, b5TrimL, b5Core, b5InnerRing, b5OuterRing);

    materials.push(b1Mat, b1Glow, b2Mat, b2Glow, b3Mat, b3Glow, b4Mat, b4Glow, b5GoldMat);
    bossStageGroups.push(b1, b2, b3, b4, b5);
    boss.add(b1, b2, b3, b4, b5);
    setBossStage(1);
  }

  root.add(drone, fighter, interceptor, warship, boss);

  return {
    root,
    modelByKind: { drone, fighter, interceptor, warship, boss },
    bossStageGroups,
    setBossStage,
    spinnerParts,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

export function createProjectileMeshPool(
  scene: THREE.Scene,
  count: number,
  isEnemy: boolean,
): {
  groups: THREE.Group[];
  setWeaponVisual: (group: THREE.Group, weapon: WeaponType) => void;
  dispose: () => void;
} {
  const boltGeo = new THREE.CapsuleGeometry(0.18, 1.9, 4, 8);
  boltGeo.rotateX(Math.PI / 2);
  const boltHaloGeo = new THREE.CapsuleGeometry(0.34, 2.25, 4, 8);
  boltHaloGeo.rotateX(Math.PI / 2);

  const laserGeo = new THREE.CylinderGeometry(0.16, 0.16, 4.4, 8);
  laserGeo.rotateX(Math.PI / 2);
  const laserHaloGeo = new THREE.CylinderGeometry(0.34, 0.34, 4.8, 8);
  laserHaloGeo.rotateX(Math.PI / 2);

  const missileGeo = new THREE.ConeGeometry(0.24, 1.85, 8);
  missileGeo.rotateX(-Math.PI / 2);
  const missileHaloGeo = new THREE.SphereGeometry(0.42, 8, 8);

  const enemyBoltGeo = new THREE.SphereGeometry(0.32, 10, 10);
  const enemyHaloGeo = new THREE.SphereGeometry(0.52, 10, 10);

  const baseCoreMat = new THREE.MeshBasicMaterial({
    color: isEnemy ? 0xff1e42 : 0x00d4ff,
    toneMapped: false,
    fog: false,
  });

  const baseHaloMat = new THREE.MeshBasicMaterial({
    color: isEnemy ? 0xff7b00 : 0x0284c7,
    transparent: true,
    opacity: isEnemy ? 0.5 : 0.44,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });

  const groups: THREE.Group[] = [];
  const clonedMats: THREE.Material[] = [baseCoreMat, baseHaloMat];

  for (let i = 0; i < count; i++) {
    const coreMat = baseCoreMat.clone();
    const haloMat = baseHaloMat.clone();
    clonedMats.push(coreMat, haloMat);

    const core = new THREE.Mesh(isEnemy ? enemyBoltGeo : boltGeo, coreMat);
    const halo = new THREE.Mesh(isEnemy ? enemyHaloGeo : boltHaloGeo, haloMat);

    const group = new THREE.Group();
    group.add(halo, core);
    group.userData = { core, halo, coreMat, haloMat };
    group.visible = false;
    scene.add(group);
    groups.push(group);
  }

  const setWeaponVisual = (group: THREE.Group, weapon: WeaponType) => {
    const { core, halo, coreMat, haloMat } = group.userData as {
      core: THREE.Mesh;
      halo: THREE.Mesh;
      coreMat: THREE.MeshBasicMaterial;
      haloMat: THREE.MeshBasicMaterial;
    };

    if (weapon === 'laser') {
      core.geometry = laserGeo;
      halo.geometry = laserHaloGeo;
      group.scale.set(1.15, 1.15, 1.25);
      coreMat.color.setHex(0xe879f9);
      haloMat.color.setHex(0xa21caf);
    } else if (weapon === 'hyper') {
      core.geometry = laserGeo;
      halo.geometry = laserHaloGeo;
      group.scale.set(1.25, 1.25, 1.05);
      coreMat.color.setHex(0x7dd3fc);
      haloMat.color.setHex(0x0284c7);
    } else if (weapon === 'autolock') {
      core.geometry = missileGeo;
      halo.geometry = missileHaloGeo;
      group.scale.set(1.1, 1.1, 1.15);
      coreMat.color.setHex(0x22ff88);
      haloMat.color.setHex(0x15803d);
    } else if (weapon === 'burst') {
      core.geometry = boltGeo;
      halo.geometry = boltHaloGeo;
      group.scale.set(1.05, 1.05, 1.25);
      coreMat.color.setHex(0x00e5ff);
      haloMat.color.setHex(0x0369a1);
    } else if (weapon === 'rapid') {
      core.geometry = boltGeo;
      halo.geometry = boltHaloGeo;
      group.scale.set(0.95, 0.95, 1.15);
      coreMat.color.setHex(0xfde047);
      haloMat.color.setHex(0xd97706);
    } else if (weapon === 'spread') {
      core.geometry = boltGeo;
      halo.geometry = boltHaloGeo;
      group.scale.set(1.22, 1.22, 1.05);
      coreMat.color.setHex(0xff5500);
      haloMat.color.setHex(0xb91c1c);
    } else if (weapon === 'triple') {
      core.geometry = boltGeo;
      halo.geometry = boltHaloGeo;
      group.scale.set(1.08, 1.08, 1.12);
      coreMat.color.setHex(0xfbbf24);
      haloMat.color.setHex(0xb45309);
    } else if (weapon === 'double') {
      core.geometry = boltGeo;
      halo.geometry = boltHaloGeo;
      group.scale.set(1.05, 1.05, 1.12);
      coreMat.color.setHex(0x2dd4bf);
      haloMat.color.setHex(0x0f766e);
    } else {
      core.geometry = boltGeo;
      halo.geometry = boltHaloGeo;
      group.scale.set(1.05, 1.05, 1.08);
      coreMat.color.setHex(0x38bdf8);
      haloMat.color.setHex(0x0369a1);
    }
  };

  return {
    groups,
    setWeaponVisual,
    dispose: () => {
      boltGeo.dispose();
      boltHaloGeo.dispose();
      laserGeo.dispose();
      laserHaloGeo.dispose();
      missileGeo.dispose();
      missileHaloGeo.dispose();
      enemyBoltGeo.dispose();
      enemyHaloGeo.dispose();
      clonedMats.forEach((m) => m.dispose());
    },
  };
}

export function createLockReticle(): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const ringGeo = new THREE.RingGeometry(1.35, 1.58, 4);
  const innerGeo = new THREE.RingGeometry(0.75, 0.92, 4);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x22ff88,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    depthTest: false,
    toneMapped: false,
    fog: false,
  });

  const outer = new THREE.Mesh(ringGeo, mat);
  const inner = new THREE.Mesh(innerGeo, mat);
  inner.rotation.z = Math.PI / 4;
  group.add(outer, inner);
  group.renderOrder = 10;
  group.visible = false;

  return {
    group,
    dispose: () => {
      ringGeo.dispose();
      innerGeo.dispose();
      mat.dispose();
    },
  };
}

export function createAimSight(): {
  farGroup: THREE.Group;
  midPip: THREE.Mesh;
  setTargetInSight: (inSight: boolean) => void;
  dispose: () => void;
} {
  const farGroup = new THREE.Group();
  const ringGeo = new THREE.RingGeometry(1.05, 1.24, 24);
  const dotGeo = new THREE.CircleGeometry(0.24, 14);
  const tickGeo = new THREE.PlaneGeometry(0.55, 0.14);
  const midPipGeo = new THREE.RingGeometry(0.32, 0.44, 16);

  const mainMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    depthTest: false,
    toneMapped: false,
    fog: false,
  });

  const midMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
    depthTest: false,
    toneMapped: false,
    fog: false,
  });

  const ring = new THREE.Mesh(ringGeo, mainMat);
  const dot = new THREE.Mesh(dotGeo, mainMat);

  const tickLeft = new THREE.Mesh(tickGeo, mainMat);
  tickLeft.position.set(-1.55, 0, 0);
  const tickRight = new THREE.Mesh(tickGeo, mainMat);
  tickRight.position.set(1.55, 0, 0);
  const tickTop = new THREE.Mesh(tickGeo, mainMat);
  tickTop.rotation.z = Math.PI / 2;
  tickTop.position.set(0, 1.55, 0);
  const tickBottom = new THREE.Mesh(tickGeo, mainMat);
  tickBottom.rotation.z = Math.PI / 2;
  tickBottom.position.set(0, -1.55, 0);

  farGroup.add(ring, dot, tickLeft, tickRight, tickTop, tickBottom);
  farGroup.renderOrder = 11;
  farGroup.visible = false;

  const midPip = new THREE.Mesh(midPipGeo, midMat);
  midPip.renderOrder = 11;
  midPip.visible = false;

  let wasInSight = false;
  const setTargetInSight = (inSight: boolean) => {
    if (inSight === wasInSight) return;
    wasInSight = inSight;
    if (inSight) {
      mainMat.color.setHex(0xfacc15);
      midMat.color.setHex(0xfde047);
      farGroup.scale.setScalar(1.18);
    } else {
      mainMat.color.setHex(0x38bdf8);
      midMat.color.setHex(0xe0f2fe);
      farGroup.scale.setScalar(1.0);
    }
  };

  return {
    farGroup,
    midPip,
    setTargetInSight,
    dispose: () => {
      ringGeo.dispose();
      dotGeo.dispose();
      tickGeo.dispose();
      midPipGeo.dispose();
      mainMat.dispose();
      midMat.dispose();
    },
  };
}

export function buildThemedObstacleVisuals(
  mats: SharedCombatMaterials,
  obstacleBodyMat: THREE.MeshStandardMaterial,
  obstacleAccentMat: THREE.MeshStandardMaterial,
  gateFrameMat: THREE.MeshStandardMaterial,
  sharedGeos: {
    pedestalGeo: THREE.BufferGeometry;
    towerGeo: THREE.BufferGeometry;
    beaconGeo: THREE.BufferGeometry;
    archBarGeo: THREE.BufferGeometry;
    bladeGeo: THREE.BufferGeometry;
    hubGeo: THREE.BufferGeometry;
    rockGeo: THREE.BufferGeometry;
    treeTrunkGeo: THREE.BufferGeometry;
    treeCrownGeo: THREE.BufferGeometry;
    buildingGeo: THREE.BufferGeometry;
    buildingWinGeo: THREE.BufferGeometry;
    futuristicCoreGeo: THREE.BufferGeometry;
    futuristicRingGeo: THREE.BufferGeometry;
  },
): ObstacleVisualHandles {
  const group = new THREE.Group();
  group.visible = false;

  const centerMesh = new THREE.Group();

  // 1. Asteroid / Rock Formation (for Space, Desert, Snow)
  const rockVariant = new THREE.Group();
  const rockMain = new THREE.Mesh(sharedGeos.rockGeo, mats.rockMat);
  rockMain.position.y = 3.2;
  rockMain.scale.set(1.3, 1.45, 1.25);
  const rockSub = new THREE.Mesh(sharedGeos.rockGeo, mats.rockMat);
  rockSub.position.set(0.65, 1.5, 0.3);
  rockSub.scale.set(0.8, 0.9, 0.8);
  rockVariant.add(rockMain, rockSub);

  // 2. Multi-tier Forest Tree (for Forest)
  const treeVariant = new THREE.Group();
  const trunk = new THREE.Mesh(sharedGeos.treeTrunkGeo, mats.trunkMat);
  trunk.position.y = 1.6;
  const crown1 = new THREE.Mesh(sharedGeos.treeCrownGeo, mats.foliageMat);
  crown1.position.y = 3.6;
  const crown2 = new THREE.Mesh(sharedGeos.treeCrownGeo, mats.foliageMat);
  crown2.position.y = 5.1;
  crown2.scale.setScalar(0.76);
  treeVariant.add(trunk, crown1, crown2);

  // 3. City Skyscraper / Building (for City)
  const buildingVariant = new THREE.Group();
  const bMain = new THREE.Mesh(sharedGeos.buildingGeo, mats.buildingMat);
  bMain.position.y = 3.8;
  const bWins = new THREE.Mesh(sharedGeos.buildingWinGeo, mats.windowGlowMat);
  bWins.position.set(0, 3.8, 1.08);
  const bSpire = new THREE.Mesh(sharedGeos.beaconGeo, obstacleAccentMat);
  bSpire.position.y = 7.9;
  buildingVariant.add(bMain, bWins, bSpire);

  // 4. Tower / Menara (Classic Pillar + Beacon)
  const towerVariant = new THREE.Group();
  const ped = new THREE.Mesh(sharedGeos.pedestalGeo, obstacleBodyMat);
  const tow = new THREE.Mesh(sharedGeos.towerGeo, obstacleBodyMat);
  const bea = new THREE.Mesh(sharedGeos.beaconGeo, obstacleAccentMat);
  towerVariant.add(ped, tow, bea);

  // 5. Futuristic Pylon Structure
  const futuristicVariant = new THREE.Group();
  const fBase = new THREE.Mesh(sharedGeos.pedestalGeo, mats.futuristicMat);
  const fCore = new THREE.Mesh(sharedGeos.futuristicCoreGeo, mats.futuristicMat);
  fCore.position.y = 3.4;
  const fRing = new THREE.Mesh(sharedGeos.futuristicRingGeo, obstacleAccentMat);
  fRing.position.y = 3.8;
  futuristicVariant.add(fBase, fCore, fRing);

  centerMesh.add(rockVariant, treeVariant, buildingVariant, towerVariant, futuristicVariant);
  group.add(centerMesh);

  // Gate left/right pillars + top arch
  const leftPillar = new THREE.Group();
  const lpBase = new THREE.Mesh(sharedGeos.pedestalGeo, obstacleBodyMat);
  const lpTow = new THREE.Mesh(sharedGeos.towerGeo, gateFrameMat);
  leftPillar.add(lpBase, lpTow);
  group.add(leftPillar);

  const rightPillar = new THREE.Group();
  const rpBase = new THREE.Mesh(sharedGeos.pedestalGeo, obstacleBodyMat);
  const rpTow = new THREE.Mesh(sharedGeos.towerGeo, gateFrameMat);
  rightPillar.add(rpBase, rpTow);
  group.add(rightPillar);

  const topArch = new THREE.Mesh(sharedGeos.archBarGeo, obstacleAccentMat);
  topArch.position.y = 5.4;
  group.add(topArch);

  // Turbine blades spinner
  const spinnerGroup = new THREE.Group();
  spinnerGroup.position.set(0, 3.4, 0.85);
  const hub = new THREE.Mesh(sharedGeos.hubGeo, obstacleAccentMat);
  spinnerGroup.add(hub);
  for (let b = 0; b < 3; b++) {
    const bladeHolder = new THREE.Group();
    bladeHolder.rotation.z = (b * Math.PI * 2) / 3;
    const blade = new THREE.Mesh(sharedGeos.bladeGeo, obstacleAccentMat);
    blade.position.y = 1.65;
    bladeHolder.add(blade);
    spinnerGroup.add(bladeHolder);
  }
  group.add(spinnerGroup);

  return {
    root: group,
    centerMesh,
    leftPillar,
    rightPillar,
    topArch,
    spinnerGroup,
    rockVariant,
    treeVariant,
    buildingVariant,
    towerVariant,
    futuristicVariant,
  };
}

export function applyObstacleStyleForMap(
  unit: ObstacleVisualHandles,
  mapId: MapId,
  variantIndex: number,
  mats: SharedCombatMaterials,
): void {
  unit.rockVariant.visible = false;
  unit.treeVariant.visible = false;
  unit.buildingVariant.visible = false;
  unit.towerVariant.visible = false;
  unit.futuristicVariant.visible = false;

  if (mapId === 'space') {
    mats.rockMat.color.setHex(0x64748b);
    if (variantIndex % 3 === 0) unit.futuristicVariant.visible = true;
    else unit.rockVariant.visible = true;
  } else if (mapId === 'city') {
    if (variantIndex % 3 === 0) unit.futuristicVariant.visible = true;
    else if (variantIndex % 3 === 1) unit.towerVariant.visible = true;
    else unit.buildingVariant.visible = true;
  } else if (mapId === 'forest') {
    mats.rockMat.color.setHex(0x78716c);
    if (variantIndex % 3 === 0) unit.rockVariant.visible = true;
    else unit.treeVariant.visible = true;
  } else if (mapId === 'desert') {
    mats.rockMat.color.setHex(0xb45309);
    if (variantIndex % 4 === 0) unit.towerVariant.visible = true;
    else unit.rockVariant.visible = true;
  } else {
    // snow
    mats.rockMat.color.setHex(0xbae6fd);
    if (variantIndex % 3 === 0) unit.towerVariant.visible = true;
    else unit.rockVariant.visible = true;
  }
}
