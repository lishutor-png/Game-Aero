import * as THREE from 'three';
import type { PlaneId } from '../types/game';

export interface PlaneRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  shieldMesh: THREE.Mesh;
  armorMesh: THREE.Mesh;
  turboFlame: THREE.Mesh;
  thrusterRing: THREE.Mesh;
  wingStrobeLeft: THREE.Mesh;
  wingStrobeRight: THREE.Mesh;
  dispose: () => void;
}

export function createProceduralPlane(isSoftwareGl: boolean, planeId: PlaneId = 'balance'): PlaneRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const isTitan = planeId === 'titan';
  const isVortex = planeId === 'vortex';

  const palette = isTitan
    ? {
        fuselage: 0xcbd5e1,
        wing: 0x94a3b8,
        accent: 0x0d9488,
        trim: 0x1e293b,
        canopy: 0x5eead4,
        glow: 0x2dd4bf,
        flame: 0x2dd4bf,
      }
    : isVortex
      ? {
          fuselage: 0x1e293b,
          wing: 0x334155,
          accent: 0xf97316,
          trim: 0x0f172a,
          canopy: 0xfbbf24,
          glow: 0xf97316,
          flame: 0xf97316,
        }
      : {
          fuselage: 0xf8fafc,
          wing: 0xe2e8f0,
          accent: 0x0284c7,
          trim: 0x334155,
          canopy: 0x38bdf8,
          glow: 0x38bdf8,
          flame: 0x38bdf8,
        };

  // Materials with >= 0.25 roughness contrast across adjacent parts
  const fuselageMat = new THREE.MeshStandardMaterial({
    color: palette.fuselage,
    roughness: isVortex ? 0.22 : 0.28,
    metalness: isTitan ? 0.52 : 0.35,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: palette.wing,
    roughness: 0.58,
    metalness: isTitan ? 0.28 : 0.14,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: palette.accent,
    roughness: 0.38,
    metalness: 0.28,
  });
  const metalTrimMat = new THREE.MeshStandardMaterial({
    color: palette.trim,
    roughness: 0.22,
    metalness: 0.85,
  });
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: palette.canopy,
    roughness: 0.08,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    transmission: isSoftwareGl ? 0 : 0.65,
    transparent: true,
    opacity: isSoftwareGl ? 0.58 : 0.92,
    ior: 1.48,
    thickness: 0.6,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: palette.glow,
    emissive: palette.glow,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.1,
  });
  const strobeMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });

  materials.push(
    fuselageMat,
    wingMat,
    accentMat,
    metalTrimMat,
    canopyMat,
    glowMat,
    strobeMat,
  );

  // 1. Primary Silhouette: Sculpted Fuselage via LatheGeometry (aligned along Z)
  const radiusScale = isTitan ? 1.24 : isVortex ? 0.84 : 1.0;
  const lengthScale = isVortex ? 1.18 : isTitan ? 0.96 : 1.0;
  const lathePoints: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -1.75 * lengthScale),
    new THREE.Vector2(0.16 * radiusScale, -1.35 * lengthScale),
    new THREE.Vector2(0.32 * radiusScale, -0.65 * lengthScale),
    new THREE.Vector2(0.36 * radiusScale, 0.15),
    new THREE.Vector2(0.3 * radiusScale, 0.95),
    new THREE.Vector2(0.19 * radiusScale, 1.55),
    new THREE.Vector2(0.0, 1.55),
  ];
  const fuselageGeo = new THREE.LatheGeometry(lathePoints, 20);
  fuselageGeo.rotateX(Math.PI / 2);
  geometries.push(fuselageGeo);

  const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
  fuselage.castShadow = true;
  fuselage.receiveShadow = true;
  bodyGroup.add(fuselage);

  // 2. Nose Cone Accent
  const noseGeo = new THREE.ConeGeometry(0.17 * radiusScale, isVortex ? 0.68 : 0.45, 16);
  noseGeo.rotateX(-Math.PI / 2);
  geometries.push(noseGeo);
  const nose = new THREE.Mesh(noseGeo, accentMat);
  nose.position.set(0, 0, isVortex ? -2.02 : -1.62);
  nose.castShadow = true;
  bodyGroup.add(nose);

  // 3. Main Wings (distinct shape per plane class)
  const wingShape = new THREE.Shape();
  if (isVortex) {
    // Swept delta fighter wings
    wingShape.moveTo(0, -0.65);
    wingShape.lineTo(1.92, 0.58);
    wingShape.lineTo(1.92, 0.88);
    wingShape.lineTo(0.2, 0.72);
    wingShape.lineTo(0, 0.72);
  } else if (isTitan) {
    // Heavy broad armored wings
    wingShape.moveTo(0, -0.45);
    wingShape.lineTo(2.35, 0.05);
    wingShape.lineTo(2.35, 0.58);
    wingShape.lineTo(0.2, 0.65);
    wingShape.lineTo(0, 0.65);
  } else {
    // Balanced swept wings
    wingShape.moveTo(0, -0.35);
    wingShape.lineTo(2.15, 0.35);
    wingShape.lineTo(2.15, 0.65);
    wingShape.lineTo(0.2, 0.55);
    wingShape.lineTo(0, 0.55);
  }
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: isTitan ? 0.12 : 0.08,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  wingGeo.rotateX(Math.PI / 2);
  geometries.push(wingGeo);

  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.position.set(0.18, 0.02, -0.05);
  rightWing.castShadow = true;
  rightWing.receiveShadow = true;
  bodyGroup.add(rightWing);

  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.scale.x = -1;
  leftWing.position.set(-0.18, 0.02, -0.05);
  leftWing.castShadow = true;
  leftWing.receiveShadow = true;
  bodyGroup.add(leftWing);

  // Titan extra armored wing plates & heavy wing pods
  if (isTitan) {
    const armorPlateGeo = new THREE.BoxGeometry(0.95, 0.16, 0.62);
    geometries.push(armorPlateGeo);
    const leftPlate = new THREE.Mesh(armorPlateGeo, accentMat);
    leftPlate.position.set(-1.15, 0.04, 0.16);
    const rightPlate = new THREE.Mesh(armorPlateGeo, accentMat);
    rightPlate.position.set(1.15, 0.04, 0.16);
    bodyGroup.add(leftPlate, rightPlate);
  }

  // 4. Aerodynamic Cockpit Canopy
  const canopyGeo = new THREE.CapsuleGeometry(0.2 * radiusScale, isVortex ? 0.72 : 0.62, 6, 14);
  canopyGeo.rotateX(Math.PI / 2);
  canopyGeo.scale(1.0, 0.78, 1.15);
  geometries.push(canopyGeo);
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(0, 0.24 * radiusScale, -0.38);
  bodyGroup.add(canopy);

  // 5. Tail Stabilizers (Twin canted V-tail for Vortex, single tall stabilizer for Titan/Balance)
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.75, 0);
  finShape.lineTo(0.92, 0.78);
  finShape.lineTo(0.42, 0.78);
  finShape.closePath();

  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  finGeo.rotateY(-Math.PI / 2);
  geometries.push(finGeo);

  if (isVortex) {
    const tailRight = new THREE.Mesh(finGeo, accentMat);
    tailRight.position.set(0.22, 0.14, 0.78);
    tailRight.rotation.z = -0.36;
    tailRight.castShadow = true;

    const tailLeft = new THREE.Mesh(finGeo, accentMat);
    tailLeft.position.set(-0.16, 0.14, 0.78);
    tailLeft.rotation.z = 0.36;
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
  hTailShape.lineTo(isTitan ? 0.96 : 0.88, 0.15);
  hTailShape.lineTo(isTitan ? 0.96 : 0.88, 0.34);
  hTailShape.lineTo(0, 0.32);
  hTailShape.closePath();
  const hTailGeo = new THREE.ExtrudeGeometry(hTailShape, {
    depth: 0.05,
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

  // 7. Wingtip Pods & Navigation Strobes
  const wingTipX = isTitan ? 2.52 : isVortex ? 2.1 : 2.32;
  const wingTipZ = isVortex ? 0.68 : isTitan ? 0.28 : 0.45;
  const podGeo = new THREE.CapsuleGeometry(isTitan ? 0.11 : 0.065, isTitan ? 0.65 : 0.44, 4, 10);
  podGeo.rotateX(Math.PI / 2);
  geometries.push(podGeo);

  const leftPod = new THREE.Mesh(podGeo, metalTrimMat);
  leftPod.position.set(-wingTipX, 0.0, wingTipZ);
  bodyGroup.add(leftPod);

  const rightPod = new THREE.Mesh(podGeo, metalTrimMat);
  rightPod.position.set(wingTipX, 0.0, wingTipZ);
  bodyGroup.add(rightPod);

  const strobeGeo = new THREE.SphereGeometry(0.06, 10, 10);
  geometries.push(strobeGeo);
  const wingStrobeLeft = new THREE.Mesh(strobeGeo, strobeMat);
  wingStrobeLeft.position.set(-wingTipX, 0.04, wingTipZ - 0.22);
  bodyGroup.add(wingStrobeLeft);

  const wingStrobeRight = new THREE.Mesh(strobeGeo, glowMat);
  wingStrobeRight.position.set(wingTipX, 0.04, wingTipZ - 0.22);
  bodyGroup.add(wingStrobeRight);

  // 8. Rear Engine Nozzle & Glowing Thruster Ring
  const nozzleGeo = new THREE.CylinderGeometry(0.2 * radiusScale, 0.25 * radiusScale, 0.28, 16);
  nozzleGeo.rotateX(Math.PI / 2);
  geometries.push(nozzleGeo);
  const nozzle = new THREE.Mesh(nozzleGeo, metalTrimMat);
  nozzle.position.set(0, 0, 1.56);
  bodyGroup.add(nozzle);

  const ringGeo = new THREE.TorusGeometry(0.16 * radiusScale, 0.035, 10, 24);
  geometries.push(ringGeo);
  const thrusterRing = new THREE.Mesh(ringGeo, glowMat);
  thrusterRing.position.set(0, 0, 1.7);
  bodyGroup.add(thrusterRing);

  // 9. Turbo Afterburner Flame Cone
  const flameGeo = new THREE.ConeGeometry(0.18 * radiusScale, 1.4, 14);
  flameGeo.rotateX(Math.PI / 2);
  flameGeo.translate(0, 0, 0.7);
  geometries.push(flameGeo);
  const flameMat = new THREE.MeshBasicMaterial({
    color: palette.flame,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
  });
  materials.push(flameMat);
  const turboFlame = new THREE.Mesh(flameGeo, flameMat);
  turboFlame.position.set(0, 0, 1.66);
  turboFlame.scale.set(0.75, 0.75, 0.45);
  bodyGroup.add(turboFlame);

  // 10. Reinforced Armor Collar (visible when plane has safe-hit Armor remaining)
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

  // 11. Energy Shield Protective Bubble
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
    wireframe: false,
  });
  materials.push(shieldMat);
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.renderOrder = 5;
  shieldMesh.visible = false;
  root.add(shieldMesh);

  return {
    root,
    bodyGroup,
    shieldMesh,
    armorMesh,
    turboFlame,
    thrusterRing,
    wingStrobeLeft,
    wingStrobeRight,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
