import * as THREE from 'three';

export interface PlaneRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  shieldMesh: THREE.Mesh;
  turboFlame: THREE.Mesh;
  thrusterRing: THREE.Mesh;
  wingStrobeLeft: THREE.Mesh;
  wingStrobeRight: THREE.Mesh;
  dispose: () => void;
}

export function createProceduralPlane(isSoftwareGl: boolean): PlaneRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Materials with >= 0.25 roughness contrast across adjacent parts
  const fuselageMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.28,
    metalness: 0.35,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.58,
    metalness: 0.12,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.42,
    metalness: 0.25,
  });
  const metalTrimMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.22,
    metalness: 0.85,
  });
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    roughness: 0.08,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    transmission: isSoftwareGl ? 0 : 0.65,
    transparent: true,
    opacity: isSoftwareGl ? 0.55 : 0.92,
    ior: 1.48,
    thickness: 0.6,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
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
  const lathePoints: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -1.75), // Nose tip
    new THREE.Vector2(0.16, -1.35),
    new THREE.Vector2(0.32, -0.65),
    new THREE.Vector2(0.36, 0.15),
    new THREE.Vector2(0.3, 0.95),
    new THREE.Vector2(0.19, 1.55), // Tail exhaust
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
  const noseGeo = new THREE.ConeGeometry(0.17, 0.45, 16);
  noseGeo.rotateX(-Math.PI / 2);
  geometries.push(noseGeo);
  const nose = new THREE.Mesh(noseGeo, accentMat);
  nose.position.set(0, 0, -1.62);
  nose.castShadow = true;
  bodyGroup.add(nose);

  // 3. Swept Main Wings (ExtrudeGeometry with bevel)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, -0.35);
  wingShape.lineTo(2.15, 0.35);
  wingShape.lineTo(2.15, 0.65);
  wingShape.lineTo(0.2, 0.55);
  wingShape.lineTo(0, 0.55);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.08,
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

  // 4. Aerodynamic Cockpit Canopy
  const canopyGeo = new THREE.CapsuleGeometry(0.21, 0.62, 6, 14);
  canopyGeo.rotateX(Math.PI / 2);
  canopyGeo.scale(1.0, 0.78, 1.15);
  geometries.push(canopyGeo);
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(0, 0.24, -0.38);
  bodyGroup.add(canopy);

  // 5. Vertical Tail Stabilizer
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
  const tailFin = new THREE.Mesh(finGeo, accentMat);
  tailFin.position.set(0.03, 0.16, 0.72);
  tailFin.castShadow = true;
  bodyGroup.add(tailFin);

  // 6. Horizontal Tailplanes
  const hTailShape = new THREE.Shape();
  hTailShape.moveTo(0, -0.15);
  hTailShape.lineTo(0.88, 0.15);
  hTailShape.lineTo(0.88, 0.34);
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
  const podGeo = new THREE.CapsuleGeometry(0.065, 0.44, 4, 10);
  podGeo.rotateX(Math.PI / 2);
  geometries.push(podGeo);

  const leftPod = new THREE.Mesh(podGeo, metalTrimMat);
  leftPod.position.set(-2.32, 0.0, 0.45);
  bodyGroup.add(leftPod);

  const rightPod = new THREE.Mesh(podGeo, metalTrimMat);
  rightPod.position.set(2.32, 0.0, 0.45);
  bodyGroup.add(rightPod);

  const strobeGeo = new THREE.SphereGeometry(0.06, 10, 10);
  geometries.push(strobeGeo);
  const wingStrobeLeft = new THREE.Mesh(strobeGeo, strobeMat);
  wingStrobeLeft.position.set(-2.32, 0.04, 0.22);
  bodyGroup.add(wingStrobeLeft);

  const wingStrobeRight = new THREE.Mesh(strobeGeo, glowMat);
  wingStrobeRight.position.set(2.32, 0.04, 0.22);
  bodyGroup.add(wingStrobeRight);

  // 8. Rear Engine Nozzle & Glowing Thruster Ring
  const nozzleGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.28, 16);
  nozzleGeo.rotateX(Math.PI / 2);
  geometries.push(nozzleGeo);
  const nozzle = new THREE.Mesh(nozzleGeo, metalTrimMat);
  nozzle.position.set(0, 0, 1.56);
  bodyGroup.add(nozzle);

  const ringGeo = new THREE.TorusGeometry(0.16, 0.035, 10, 24);
  geometries.push(ringGeo);
  const thrusterRing = new THREE.Mesh(ringGeo, glowMat);
  thrusterRing.position.set(0, 0, 1.7);
  bodyGroup.add(thrusterRing);

  // 9. Turbo Afterburner Flame Cone
  const flameGeo = new THREE.ConeGeometry(0.18, 1.4, 14);
  flameGeo.rotateX(Math.PI / 2);
  flameGeo.translate(0, 0, 0.7);
  geometries.push(flameGeo);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  materials.push(flameMat);
  const turboFlame = new THREE.Mesh(flameGeo, flameMat);
  turboFlame.position.set(0, 0, 1.66);
  turboFlame.scale.set(0.75, 0.75, 0.45);
  bodyGroup.add(turboFlame);

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
