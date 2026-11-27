import * as THREE from 'three';
import type { PlaneId, PlaneModelTier } from '../types/game';

export interface PlaneRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  shieldMesh: THREE.Mesh;
  armorMesh: THREE.Mesh;
  turboFlame: THREE.Mesh;
  turboFlameRight: THREE.Mesh | null;
  thrusterRing: THREE.Mesh;
  wingStrobeLeft: THREE.Mesh;
  wingStrobeRight: THREE.Mesh;
  muzzleOffsets: THREE.Vector3[];
  dispose: () => void;
}

function createHullPanelTexture(
  baseHex: string,
  panelLineHex: string,
  accentHex: string,
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, size, size);

    // Subtle brushed alloy streaks
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let y = 0; y < size; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Aerospace panel seams
    ctx.strokeStyle = panelLineHex;
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 224, 224);
    ctx.beginPath();
    ctx.moveTo(16, 128);
    ctx.lineTo(240, 128);
    ctx.moveTo(128, 16);
    ctx.lineTo(128, 240);
    ctx.stroke();

    // Accent racing stripe
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 118, size, 12);

    // Rivet dots along seams
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 28; i < 235; i += 24) {
      ctx.fillRect(i, 22, 3, 3);
      ctx.fillRect(i, 232, 3, 3);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createProceduralPlane(
  isSoftwareGl: boolean,
  planeId: PlaneId = 'balance',
  modelTier: PlaneModelTier = 1,
): PlaneRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const isTitan = planeId === 'titan';
  const isVortex = planeId === 'vortex';

  const palette = isTitan
    ? {
        fuselageHex: modelTier >= 4 ? '#e2e8f0' : '#cbd5e1',
        fuselage: modelTier >= 4 ? 0xe2e8f0 : 0xcbd5e1,
        wing: modelTier >= 3 ? 0x64748b : 0x94a3b8,
        accent: modelTier >= 4 ? 0x14b8a6 : 0x0d9488,
        trim: 0x0f172a,
        canopy: 0x5eead4,
        glow: modelTier >= 4 ? 0x5eead4 : 0x2dd4bf,
        flame: 0x2dd4bf,
        legendGold: 0xfacc15,
      }
    : isVortex
      ? {
          fuselageHex: modelTier >= 4 ? '#0f172a' : '#1e293b',
          fuselage: modelTier >= 4 ? 0x0f172a : 0x1e293b,
          wing: modelTier >= 3 ? 0x1e293b : 0x334155,
          accent: modelTier >= 4 ? 0xfb923c : 0xf97316,
          trim: 0x090d16,
          canopy: 0xfbbf24,
          glow: modelTier >= 4 ? 0xfdba74 : 0xf97316,
          flame: 0xf97316,
          legendGold: 0xfacc15,
        }
      : {
          fuselageHex: modelTier >= 4 ? '#ffffff' : '#f8fafc',
          fuselage: modelTier >= 4 ? 0xffffff : 0xf8fafc,
          wing: modelTier >= 3 ? 0xcbd5e1 : 0xe2e8f0,
          accent: modelTier >= 4 ? 0x38bdf8 : 0x0284c7,
          trim: 0x1e293b,
          canopy: 0x38bdf8,
          glow: modelTier >= 4 ? 0x7dd3fc : 0x38bdf8,
          flame: 0x38bdf8,
          legendGold: 0xfacc15,
        };

  const hullTex = createHullPanelTexture(
    palette.fuselageHex,
    'rgba(15, 23, 42, 0.28)',
    `#${palette.accent.toString(16).padStart(6, '0')}`,
  );
  textures.push(hullTex);

  // PBR Materials with clear roughness & metalness contrast (>= 0.25)
  const fuselageMat = new THREE.MeshPhysicalMaterial({
    color: palette.fuselage,
    map: hullTex,
    roughness: modelTier >= 4 ? 0.16 : 0.24,
    metalness: isTitan ? 0.68 : 0.54,
    clearcoat: modelTier >= 3 ? 0.9 : 0.45,
    clearcoatRoughness: 0.12,
  });

  const wingMat = new THREE.MeshStandardMaterial({
    color: palette.wing,
    roughness: 0.54,
    metalness: isTitan ? 0.34 : 0.22,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: palette.accent,
    roughness: 0.32,
    metalness: 0.38,
  });

  const metalTrimMat = new THREE.MeshStandardMaterial({
    color: palette.trim,
    roughness: 0.18,
    metalness: 0.88,
  });

  const cockpitInteriorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.72,
    metalness: 0.2,
  });

  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: palette.canopy,
    roughness: 0.06,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    transmission: isSoftwareGl ? 0 : 0.72,
    transparent: true,
    opacity: isSoftwareGl ? 0.55 : 0.9,
    ior: 1.5,
    thickness: 0.65,
    depthWrite: false,
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: palette.glow,
    emissive: palette.glow,
    emissiveIntensity: modelTier >= 4 ? 2.4 : modelTier >= 3 ? 2.0 : 1.7,
    roughness: 0.15,
    metalness: 0.1,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: palette.legendGold,
    emissive: palette.legendGold,
    emissiveIntensity: 0.45,
    roughness: 0.18,
    metalness: 0.92,
  });

  const strobeMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.6,
    roughness: 0.22,
  });

  materials.push(
    fuselageMat,
    wingMat,
    accentMat,
    metalTrimMat,
    cockpitInteriorMat,
    canopyMat,
    glowMat,
    goldTrimMat,
    strobeMat,
  );

  // 1. Sculpted Aerodynamic Fuselage (LatheGeometry along Z)
  const radiusScale = (isTitan ? 1.2 : isVortex ? 0.86 : 1.0) * (1 + (modelTier - 1) * 0.03);
  const lengthScale = (isVortex ? 1.18 : isTitan ? 0.98 : 1.04) * (1 + (modelTier - 1) * 0.03);
  const lathePoints: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -1.85 * lengthScale),
    new THREE.Vector2(0.14 * radiusScale, -1.45 * lengthScale),
    new THREE.Vector2(0.28 * radiusScale, -0.85 * lengthScale),
    new THREE.Vector2(0.36 * radiusScale, -0.15),
    new THREE.Vector2(0.37 * radiusScale, 0.42),
    new THREE.Vector2(0.3 * radiusScale, 1.08),
    new THREE.Vector2(0.2 * radiusScale, 1.58),
    new THREE.Vector2(0.0, 1.58),
  ];
  const fuselageGeo = new THREE.LatheGeometry(lathePoints, 24);
  fuselageGeo.rotateX(Math.PI / 2);
  fuselageGeo.scale(1.12, 0.84, 1.0); // Wide aerodynamic lifting-body profile
  geometries.push(fuselageGeo);

  const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
  fuselage.castShadow = true;
  fuselage.receiveShadow = true;
  bodyGroup.add(fuselage);

  // Side fuselage dorsal spine & air intakes (adds silhouette depth)
  const intakeGeo = new THREE.BoxGeometry(0.18, 0.22, 1.05);
  geometries.push(intakeGeo);
  const leftIntake = new THREE.Mesh(intakeGeo, metalTrimMat);
  leftIntake.position.set(-0.34 * radiusScale, -0.02, -0.22);
  leftIntake.rotation.y = 0.08;
  const rightIntake = new THREE.Mesh(intakeGeo, metalTrimMat);
  rightIntake.position.set(0.34 * radiusScale, -0.02, -0.22);
  rightIntake.rotation.y = -0.08;
  bodyGroup.add(leftIntake, rightIntake);

  // 2. Precision Nose Cone + Pitot Sensor
  const noseGeo = new THREE.ConeGeometry(0.15 * radiusScale, isVortex ? 0.72 : 0.48, 18);
  noseGeo.rotateX(-Math.PI / 2);
  geometries.push(noseGeo);
  const nose = new THREE.Mesh(noseGeo, modelTier >= 4 ? goldTrimMat : accentMat);
  nose.position.set(0, 0, -1.86 * lengthScale - 0.14);
  nose.castShadow = true;
  bodyGroup.add(nose);

  // 3. Main Wings (visibly larger & more futuristic at Tier 2, 3, 4)
  const wingSpanScale = modelTier === 1 ? 0.94 : modelTier === 2 ? 1.08 : modelTier === 3 ? 1.15 : 1.24;
  const wingShape = new THREE.Shape();
  if (isVortex) {
    wingShape.moveTo(0, -0.68);
    wingShape.lineTo(1.88 * wingSpanScale, 0.56);
    wingShape.lineTo(1.88 * wingSpanScale, 0.9);
    wingShape.lineTo(0.24, 0.74);
    wingShape.lineTo(0, 0.74);
  } else if (isTitan) {
    wingShape.moveTo(0, -0.48);
    wingShape.lineTo(2.22 * wingSpanScale, 0.02);
    wingShape.lineTo(2.22 * wingSpanScale, 0.62);
    wingShape.lineTo(0.22, 0.68);
    wingShape.lineTo(0, 0.68);
  } else {
    wingShape.moveTo(0, -0.38);
    wingShape.lineTo(2.05 * wingSpanScale, 0.34);
    wingShape.lineTo(2.05 * wingSpanScale, 0.68);
    wingShape.lineTo(0.22, 0.58);
    wingShape.lineTo(0, 0.58);
  }
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: isTitan ? 0.11 : 0.075,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  wingGeo.rotateX(Math.PI / 2);
  geometries.push(wingGeo);

  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.position.set(0.2, 0.02, -0.05);
  rightWing.castShadow = true;
  rightWing.receiveShadow = true;
  bodyGroup.add(rightWing);

  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.scale.x = -1;
  leftWing.position.set(-0.2, 0.02, -0.05);
  leftWing.castShadow = true;
  leftWing.receiveShadow = true;
  bodyGroup.add(leftWing);

  // Leading-edge trim strips on wings
  const trimStripGeo = new THREE.BoxGeometry(1.15 * wingSpanScale, 0.045, 0.12);
  geometries.push(trimStripGeo);
  const leftTrim = new THREE.Mesh(trimStripGeo, modelTier >= 4 ? goldTrimMat : accentMat);
  leftTrim.position.set(-0.98 * wingSpanScale, 0.04, 0.15);
  leftTrim.rotation.y = isVortex ? 0.5 : 0.26;
  const rightTrim = new THREE.Mesh(trimStripGeo, modelTier >= 4 ? goldTrimMat : accentMat);
  rightTrim.position.set(0.98 * wingSpanScale, 0.04, 0.15);
  rightTrim.rotation.y = isVortex ? -0.5 : -0.26;
  bodyGroup.add(leftTrim, rightTrim);

  // Tier 2+: Forward Canard Fins & Dorsal Armor Spine
  if (modelTier >= 2) {
    const canardShape = new THREE.Shape();
    canardShape.moveTo(0, -0.18);
    canardShape.lineTo(0.68, 0.14);
    canardShape.lineTo(0.68, 0.3);
    canardShape.lineTo(0, 0.24);
    canardShape.closePath();
    const canardGeo = new THREE.ExtrudeGeometry(canardShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    canardGeo.rotateX(Math.PI / 2);
    geometries.push(canardGeo);

    const canardR = new THREE.Mesh(canardGeo, accentMat);
    canardR.position.set(0.24 * radiusScale, 0.04, -0.92);
    const canardL = new THREE.Mesh(canardGeo, accentMat);
    canardL.scale.x = -1;
    canardL.position.set(-0.24 * radiusScale, 0.04, -0.92);
    bodyGroup.add(canardR, canardL);
  }

  // Titan extra armored hull plates
  if (isTitan) {
    const armorPlateGeo = new THREE.BoxGeometry(0.9, 0.14, 0.58);
    geometries.push(armorPlateGeo);
    const leftPlate = new THREE.Mesh(armorPlateGeo, accentMat);
    leftPlate.position.set(-1.1, 0.05, 0.16);
    const rightPlate = new THREE.Mesh(armorPlateGeo, accentMat);
    rightPlate.position.set(1.1, 0.05, 0.16);
    bodyGroup.add(leftPlate, rightPlate);
  }

  // 4. Transparent Cockpit Canopy + Interior Pilot Seat & Console
  const seatGeo = new THREE.BoxGeometry(0.22, 0.22, 0.38);
  geometries.push(seatGeo);
  const pilotSeat = new THREE.Mesh(seatGeo, cockpitInteriorMat);
  pilotSeat.position.set(0, 0.17 * radiusScale, -0.35);
  bodyGroup.add(pilotSeat);

  const hudGlassGeo = new THREE.PlaneGeometry(0.2, 0.12);
  geometries.push(hudGlassGeo);
  const cockpitHud = new THREE.Mesh(hudGlassGeo, glowMat);
  cockpitHud.position.set(0, 0.25 * radiusScale, -0.62);
  cockpitHud.rotation.x = -0.35;
  bodyGroup.add(cockpitHud);

  const canopyGeo = new THREE.CapsuleGeometry(0.21 * radiusScale, isVortex ? 0.74 : 0.64, 8, 16);
  canopyGeo.rotateX(Math.PI / 2);
  canopyGeo.scale(1.0, 0.76, 1.18);
  geometries.push(canopyGeo);
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(0, 0.23 * radiusScale, -0.38);
  canopy.renderOrder = 3;
  bodyGroup.add(canopy);

  // 5. Tail Stabilizers (Twin canted V-tail for Vortex or Elite+, single tall fin otherwise)
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.75, 0);
  finShape.lineTo(0.94, 0.82);
  finShape.lineTo(0.42, 0.82);
  finShape.closePath();

  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  finGeo.rotateY(-Math.PI / 2);
  geometries.push(finGeo);

  if (isVortex || modelTier >= 3) {
    const tailRight = new THREE.Mesh(finGeo, accentMat);
    tailRight.position.set(0.24, 0.14, 0.78);
    tailRight.rotation.z = -0.34;
    tailRight.castShadow = true;

    const tailLeft = new THREE.Mesh(finGeo, accentMat);
    tailLeft.position.set(-0.18, 0.14, 0.78);
    tailLeft.rotation.z = 0.34;
    tailLeft.castShadow = true;
    bodyGroup.add(tailRight, tailLeft);
  } else {
    const tailFin = new THREE.Mesh(finGeo, accentMat);
    tailFin.position.set(0.03, 0.16, 0.72);
    tailFin.castShadow = true;
    bodyGroup.add(tailFin);
  }

  // 6. Horizontal Tailplanes
  const hTailShape = new THREE.Shape();
  hTailShape.moveTo(0, -0.15);
  hTailShape.lineTo(isTitan ? 0.98 : 0.9, 0.16);
  hTailShape.lineTo(isTitan ? 0.98 : 0.9, 0.36);
  hTailShape.lineTo(0, 0.34);
  hTailShape.closePath();
  const hTailGeo = new THREE.ExtrudeGeometry(hTailShape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  hTailGeo.rotateX(Math.PI / 2);
  geometries.push(hTailGeo);

  const hTailRight = new THREE.Mesh(hTailGeo, wingMat);
  hTailRight.position.set(0.1, 0.04, 1.05);
  hTailRight.castShadow = true;
  bodyGroup.add(hTailRight);

  const hTailLeft = new THREE.Mesh(hTailGeo, wingMat);
  hTailLeft.scale.x = -1;
  hTailLeft.position.set(-0.1, 0.04, 1.05);
  hTailLeft.castShadow = true;
  bodyGroup.add(hTailLeft);

  // 7. Wingtip Pods / Weapon Cannons & Navigation Strobes
  const baseWingTipX = isTitan ? 2.38 : isVortex ? 2.02 : 2.22;
  const wingTipX = baseWingTipX * wingSpanScale;
  const wingTipZ = isVortex ? 0.68 : isTitan ? 0.28 : 0.45;
  const podGeo = new THREE.CapsuleGeometry(isTitan ? 0.1 : 0.068, isTitan ? 0.68 : 0.48, 5, 10);
  podGeo.rotateX(Math.PI / 2);
  geometries.push(podGeo);

  const leftPod = new THREE.Mesh(podGeo, metalTrimMat);
  leftPod.position.set(-wingTipX, 0.0, wingTipZ);
  bodyGroup.add(leftPod);

  const rightPod = new THREE.Mesh(podGeo, metalTrimMat);
  rightPod.position.set(wingTipX, 0.0, wingTipZ);
  bodyGroup.add(rightPod);

  // Tier 3+: Underwing dual weapon barrels & glowing energy conduits
  if (modelTier >= 3) {
    const barrelGeo = new THREE.CylinderGeometry(0.055, 0.075, 0.95, 10);
    barrelGeo.rotateX(Math.PI / 2);
    geometries.push(barrelGeo);

    const gunLeft = new THREE.Mesh(barrelGeo, metalTrimMat);
    gunLeft.position.set(-0.92, -0.1, -0.35);
    const gunRight = new THREE.Mesh(barrelGeo, metalTrimMat);
    gunRight.position.set(0.92, -0.1, -0.35);

    const railGeo = new THREE.BoxGeometry(0.05, 0.05, 0.82);
    geometries.push(railGeo);
    const railL = new THREE.Mesh(railGeo, glowMat);
    railL.position.set(-0.92, -0.04, -0.32);
    const railR = new THREE.Mesh(railGeo, glowMat);
    railR.position.set(0.92, -0.04, -0.32);

    bodyGroup.add(gunLeft, gunRight, railL, railR);
  }

  // Tier 4: Legendary Swept Wingtip Blades + Dorsal Energy Halo Core
  if (modelTier >= 4) {
    const bladeGeo = new THREE.BoxGeometry(0.08, 0.42, 0.68);
    geometries.push(bladeGeo);
    const wingletL = new THREE.Mesh(bladeGeo, goldTrimMat);
    wingletL.position.set(-wingTipX - 0.06, 0.16, wingTipZ + 0.08);
    wingletL.rotation.z = 0.28;
    const wingletR = new THREE.Mesh(bladeGeo, goldTrimMat);
    wingletR.position.set(wingTipX + 0.06, 0.16, wingTipZ + 0.08);
    wingletR.rotation.z = -0.28;

    const haloGeo = new THREE.TorusGeometry(0.24, 0.032, 8, 20);
    haloGeo.rotateX(Math.PI / 2);
    geometries.push(haloGeo);
    const dorsalCore = new THREE.Mesh(haloGeo, glowMat);
    dorsalCore.position.set(0, 0.28, 0.48);

    bodyGroup.add(wingletL, wingletR, dorsalCore);
  }

  const strobeGeo = new THREE.SphereGeometry(0.065, 10, 10);
  geometries.push(strobeGeo);
  const wingStrobeLeft = new THREE.Mesh(strobeGeo, strobeMat);
  wingStrobeLeft.position.set(-wingTipX, 0.05, wingTipZ - 0.24);
  bodyGroup.add(wingStrobeLeft);

  const wingStrobeRight = new THREE.Mesh(strobeGeo, glowMat);
  wingStrobeRight.position.set(wingTipX, 0.05, wingTipZ - 0.24);
  bodyGroup.add(wingStrobeRight);

  // 8. Rear Engine Nozzles & Glowing Thruster Rings (Single on Tier 1-2, Twin Engine on Tier 3-4)
  const nozzleGeo = new THREE.CylinderGeometry(0.2 * radiusScale, 0.25 * radiusScale, 0.3, 18);
  nozzleGeo.rotateX(Math.PI / 2);
  geometries.push(nozzleGeo);

  const ringGeo = new THREE.TorusGeometry(0.16 * radiusScale, 0.035, 10, 24);
  geometries.push(ringGeo);

  const flameGeo = new THREE.ConeGeometry(0.18 * radiusScale, 1.45, 14);
  flameGeo.rotateX(Math.PI / 2);
  flameGeo.translate(0, 0, 0.72);
  geometries.push(flameGeo);

  const flameMat = new THREE.MeshBasicMaterial({
    color: palette.flame,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  materials.push(flameMat);

  let thrusterRing: THREE.Mesh;
  let turboFlame: THREE.Mesh;
  let turboFlameRight: THREE.Mesh | null = null;

  if (modelTier >= 3) {
    const nozzleL = new THREE.Mesh(nozzleGeo, metalTrimMat);
    nozzleL.scale.set(0.78, 0.78, 1.05);
    nozzleL.position.set(-0.32 * radiusScale, 0, 1.54);

    const nozzleR = new THREE.Mesh(nozzleGeo, metalTrimMat);
    nozzleR.scale.set(0.78, 0.78, 1.05);
    nozzleR.position.set(0.32 * radiusScale, 0, 1.54);

    const ringL = new THREE.Mesh(ringGeo, glowMat);
    ringL.scale.setScalar(0.78);
    ringL.position.set(-0.32 * radiusScale, 0, 1.7);

    const ringR = new THREE.Mesh(ringGeo, glowMat);
    ringR.scale.setScalar(0.78);
    ringR.position.set(0.32 * radiusScale, 0, 1.7);

    thrusterRing = ringL;

    turboFlame = new THREE.Mesh(flameGeo, flameMat);
    turboFlame.position.set(-0.32 * radiusScale, 0, 1.68);
    turboFlame.scale.set(0.7, 0.7, 0.48);

    turboFlameRight = new THREE.Mesh(flameGeo, flameMat);
    turboFlameRight.position.set(0.32 * radiusScale, 0, 1.68);
    turboFlameRight.scale.set(0.7, 0.7, 0.48);

    bodyGroup.add(nozzleL, nozzleR, ringL, ringR, turboFlame, turboFlameRight);
  } else {
    const nozzle = new THREE.Mesh(nozzleGeo, metalTrimMat);
    nozzle.position.set(0, 0, 1.56);
    bodyGroup.add(nozzle);

    thrusterRing = new THREE.Mesh(ringGeo, glowMat);
    thrusterRing.position.set(0, 0, 1.7);
    bodyGroup.add(thrusterRing);

    turboFlame = new THREE.Mesh(flameGeo, flameMat);
    turboFlame.position.set(0, 0, 1.66);
    turboFlame.scale.set(0.75, 0.75, 0.45);
    bodyGroup.add(turboFlame);
  }

  // 9. Reinforced Armor Collar (visible when plane has safe-hit Armor remaining)
  const armorGeo = new THREE.TorusGeometry(2.15, 0.055, 8, 28);
  armorGeo.rotateX(Math.PI / 2);
  geometries.push(armorGeo);
  const armorMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    transparent: true,
    opacity: 0.48,
    roughness: 0.2,
  });
  materials.push(armorMat);
  const armorMesh = new THREE.Mesh(armorGeo, armorMat);
  armorMesh.visible = false;
  root.add(armorMesh);

  // 10. Energy Shield Protective Bubble
  const shieldGeo = new THREE.IcosahedronGeometry(2.65, 2);
  geometries.push(shieldGeo);
  const shieldMat = new THREE.MeshPhysicalMaterial({
    color: 0x2dd4bf,
    emissive: 0x0d9488,
    emissiveIntensity: 0.55,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  materials.push(shieldMat);
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.renderOrder = 5;
  shieldMesh.visible = false;
  root.add(shieldMesh);

  const muzzleOffsets = [
    new THREE.Vector3(0, -0.06, -2.0),
    new THREE.Vector3(-0.92, -0.1, -1.05),
    new THREE.Vector3(0.92, -0.1, -1.05),
  ];

  return {
    root,
    bodyGroup,
    shieldMesh,
    armorMesh,
    turboFlame,
    turboFlameRight,
    thrusterRing,
    wingStrobeLeft,
    wingStrobeRight,
    muzzleOffsets,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
