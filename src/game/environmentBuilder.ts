import * as THREE from 'three';
import type { MapId } from '../types/game';

const _dummy = new THREE.Object3D();

export class MapEnvironmentManager {
  private scene: THREE.Scene;
  private groundMat: THREE.MeshStandardMaterial;
  private groundTex: THREE.CanvasTexture;

  // Map-specific sky & horizon features
  private spaceGroup = new THREE.Group();
  private spaceStation!: THREE.Group;
  private planetGroup!: THREE.Group;
  private starsPoints!: THREE.Points;

  private cityGroup = new THREE.Group();
  private highwayStrip!: THREE.Mesh;
  private bridgeArches: THREE.Group[] = [];
  private buildingInstanced!: THREE.InstancedMesh;
  private buildingData: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number }> = [];

  private forestGroup = new THREE.Group();
  private riverMesh!: THREE.Mesh;
  private waterfallGroup!: THREE.Group;
  private treeTrunksInstanced!: THREE.InstancedMesh;
  private treeCrownsInstanced!: THREE.InstancedMesh;
  private treeData: Array<{ x: number; y: number; z: number; s: number }> = [];

  private desertGroup = new THREE.Group();
  private duneInstanced!: THREE.InstancedMesh;
  private duneData: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number }> = [];

  private snowGroup = new THREE.Group();
  private mountainInstanced!: THREE.InstancedMesh;
  private mountainData: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number }> = [];
  private weatherParticles!: THREE.Points;
  private weatherPositions!: Float32Array;

  private currentMap: MapId = 'space';
  private disposables: Array<{ dispose: () => void }> = [];

  constructor(
    scene: THREE.Scene,
    groundMat: THREE.MeshStandardMaterial,
    groundTex: THREE.CanvasTexture,
    groundY: number,
  ) {
    this.scene = scene;
    this.groundMat = groundMat;
    this.groundTex = groundTex;

    this.buildSpaceLayer(groundY);
    this.buildCityLayer(groundY);
    this.buildForestLayer(groundY);
    this.buildDesertLayer(groundY);
    this.buildSnowAndWeatherParticles(groundY);

    scene.add(this.spaceGroup, this.cityGroup, this.forestGroup, this.desertGroup, this.snowGroup);
    this.setMap('space');
  }

  private buildSpaceLayer(groundY: number): void {
    // 1. Twinkling 3D Starfield
    const starCount = 420;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 260;
      positions[i * 3 + 1] = 2 + Math.random() * 95;
      positions[i * 3 + 2] = -20 - Math.random() * 210;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xe0e7ff,
      size: 0.75,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });
    this.starsPoints = new THREE.Points(starGeo, starMat);
    this.spaceGroup.add(this.starsPoints);

    // 2. Ringed Gas Planet + Moon on the horizon
    this.planetGroup = new THREE.Group();
    const planetGeo = new THREE.SphereGeometry(18, 28, 24);
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      emissive: 0x312e81,
      emissiveIntensity: 0.4,
      roughness: 0.65,
      metalness: 0.1,
    });
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    const ringGeo = new THREE.RingGeometry(23, 33, 40);
    ringGeo.rotateX(Math.PI / 2.4);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xa5b4fc,
      emissive: 0x6366f1,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    const moonGeo = new THREE.SphereGeometry(4.2, 16, 16);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85 });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(-28, 12, 8);
    this.planetGroup.add(planetMesh, ringMesh, moon);
    this.planetGroup.position.set(42, 34, -145);
    this.spaceGroup.add(this.planetGroup);

    // 3. Orbital Space Station (rotating rings & habitat arms)
    this.spaceStation = new THREE.Group();
    const hubGeo = new THREE.CylinderGeometry(2.5, 2.5, 11, 14);
    const sRingGeo = new THREE.TorusGeometry(9, 0.9, 10, 28);
    const solarGeo = new THREE.BoxGeometry(18, 0.25, 3.2);
    const stationMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.75 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
    });
    const stHub = new THREE.Mesh(hubGeo, stationMat);
    const stRing = new THREE.Mesh(sRingGeo, stationMat);
    const stSolar = new THREE.Mesh(solarGeo, glowMat);
    this.spaceStation.add(stHub, stRing, stSolar);
    this.spaceStation.position.set(-38, 22, -125);
    this.spaceGroup.add(this.spaceStation);

    // Nebula glowing backdrop spheres
    const nebGeo = new THREE.SphereGeometry(26, 16, 16);
    const nebMat = new THREE.MeshBasicMaterial({
      color: 0x7e22ce,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    const neb1 = new THREE.Mesh(nebGeo, nebMat);
    neb1.position.set(-55, 28, -160);
    const neb2 = new THREE.Mesh(nebGeo, nebMat);
    neb2.position.set(20, 40, -170);
    this.spaceGroup.add(neb1, neb2);

    this.disposables.push(
      starGeo,
      starMat,
      planetGeo,
      planetMat,
      ringGeo,
      ringMat,
      moonGeo,
      moonMat,
      hubGeo,
      sRingGeo,
      solarGeo,
      stationMat,
      glowMat,
      nebGeo,
      nebMat,
    );
    void groundY;
  }

  private buildCityLayer(groundY: number): void {
    // 1. Center Highway Strip
    const roadGeo = new THREE.PlaneGeometry(24, 240);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.72,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.highwayStrip = new THREE.Mesh(roadGeo, roadMat);
    this.highwayStrip.position.set(0, groundY + 0.02, -85);
    this.cityGroup.add(this.highwayStrip);

    // 2. Instanced Skyscrapers flanking both sides
    const bGeo = new THREE.BoxGeometry(6.5, 26, 6.5);
    bGeo.translate(0, 13, 0);
    const bTex = this.createSkyscraperTexture();
    const bMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: bTex,
      roughness: 0.35,
      metalness: 0.55,
    });
    const count = 30;
    this.buildingInstanced = new THREE.InstancedMesh(bGeo, bMat, count);
    this.buildingInstanced.frustumCulled = false;
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.buildingData.push({
        x: side * (22 + Math.random() * 26),
        y: groundY,
        z: -i * 6.8,
        sx: 0.85 + Math.random() * 0.9,
        sy: 0.55 + Math.random() * 1.4,
        sz: 0.85 + Math.random() * 0.9,
      });
    }
    this.syncInstanced(this.buildingInstanced, this.buildingData);
    this.cityGroup.add(this.buildingInstanced);

    // 3. Highway Overpass Bridges (scrolling)
    const archLegGeo = new THREE.BoxGeometry(1.4, 9.5, 1.4);
    const archSpanGeo = new THREE.BoxGeometry(34, 1.1, 2.0);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45, metalness: 0.5 });
    for (let i = 0; i < 3; i++) {
      const br = new THREE.Group();
      const legL = new THREE.Mesh(archLegGeo, bridgeMat);
      legL.position.set(-16.5, 4.75, 0);
      const legR = new THREE.Mesh(archLegGeo, bridgeMat);
      legR.position.set(16.5, 4.75, 0);
      const span = new THREE.Mesh(archSpanGeo, bridgeMat);
      span.position.set(0, 9.5, 0);
      br.add(legL, legR, span);
      br.position.set(0, groundY, -45 - i * 55);
      this.bridgeArches.push(br);
      this.cityGroup.add(br);
    }

    this.disposables.push(roadGeo, roadMat, bGeo, bTex, bMat, archLegGeo, archSpanGeo, bridgeMat);
  }

  private buildForestLayer(groundY: number): void {
    // 1. Shimmering Winding River down the valley
    const riverGeo = new THREE.PlaneGeometry(9.5, 240);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.28,
      roughness: 0.12,
      metalness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.riverMesh = new THREE.Mesh(riverGeo, riverMat);
    this.riverMesh.position.set(-4.5, groundY + 0.02, -85);
    this.forestGroup.add(this.riverMesh);

    // 2. Cliffside Waterfall Landmark
    this.waterfallGroup = new THREE.Group();
    const cliffGeo = new THREE.ConeGeometry(13, 28, 7);
    const cliffMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.9, flatShading: true });
    const cliff = new THREE.Mesh(cliffGeo, cliffMat);
    cliff.position.set(-28, 11, -110);
    const fallGeo = new THREE.PlaneGeometry(5.5, 22);
    const fallMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const fall = new THREE.Mesh(fallGeo, fallMat);
    fall.position.set(-21, 9.5, -104);
    fall.rotation.y = 0.55;
    this.waterfallGroup.add(cliff, fall);
    this.forestGroup.add(this.waterfallGroup);

    // 3. Instanced Dense Forest Trees (Trunks + Conical Crowns)
    const trunkGeo = new THREE.CylinderGeometry(0.42, 0.65, 3.8, 7);
    trunkGeo.translate(0, 1.9, 0);
    const crownGeo = new THREE.ConeGeometry(2.4, 7.2, 7);
    crownGeo.translate(0, 6.2, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.92 });
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });

    const count = 34;
    this.treeTrunksInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    this.treeCrownsInstanced = new THREE.InstancedMesh(crownGeo, crownMat, count);
    this.treeTrunksInstanced.frustumCulled = false;
    this.treeCrownsInstanced.frustumCulled = false;

    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.treeData.push({
        x: side * (19 + Math.random() * 28),
        y: groundY,
        z: -i * 5.8,
        s: 0.8 + Math.random() * 0.9,
      });
    }
    this.syncTreeInstances();
    this.forestGroup.add(this.treeTrunksInstanced, this.treeCrownsInstanced);

    this.disposables.push(riverGeo, riverMat, cliffGeo, cliffMat, fallGeo, fallMat, trunkGeo, crownGeo, trunkMat, crownMat);
  }

  private buildDesertLayer(groundY: number): void {
    // Undulating Sand Dunes & Sandstone Mesas on flanks
    const duneGeo = new THREE.SphereGeometry(5.5, 14, 10);
    duneGeo.scale(1.8, 0.55, 1.4);
    const duneMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: true,
    });
    const count = 26;
    this.duneInstanced = new THREE.InstancedMesh(duneGeo, duneMat, count);
    this.duneInstanced.frustumCulled = false;
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.duneData.push({
        x: side * (22 + Math.random() * 32),
        y: groundY - 0.5,
        z: -i * 7.6,
        sx: 0.9 + Math.random() * 1.1,
        sy: 0.75 + Math.random() * 1.3,
        sz: 0.9 + Math.random() * 1.2,
      });
    }
    this.syncInstanced(this.duneInstanced, this.duneData);
    this.desertGroup.add(this.duneInstanced);

    this.disposables.push(duneGeo, duneMat);
  }

  private buildSnowAndWeatherParticles(groundY: number): void {
    // 1. Towering Snow-capped Peaks
    const peakGeo = new THREE.ConeGeometry(7.2, 22, 6);
    peakGeo.translate(0, 11, 0);
    const peakMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.65,
      metalness: 0.08,
      flatShading: true,
    });
    const count = 24;
    this.mountainInstanced = new THREE.InstancedMesh(peakGeo, peakMat, count);
    this.mountainInstanced.frustumCulled = false;
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.mountainData.push({
        x: side * (24 + Math.random() * 30),
        y: groundY,
        z: -i * 8.2,
        sx: 0.85 + Math.random() * 1.0,
        sy: 0.8 + Math.random() * 1.25,
        sz: 0.85 + Math.random() * 1.0,
      });
    }
    this.syncInstanced(this.mountainInstanced, this.mountainData);
    this.snowGroup.add(this.mountainInstanced);

    // 2. Active Weather Particle Field (Snowflakes in Snow, Dust in Desert, Spores in Forest, Cosmic Dust in Space)
    const pCount = 150;
    this.weatherPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      this.weatherPositions[i * 3] = (Math.random() - 0.5) * 44;
      this.weatherPositions[i * 3 + 1] = -1 + Math.random() * 14;
      this.weatherPositions[i * 3 + 2] = -Math.random() * 90 + 8;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(this.weatherPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.24,
      transparent: true,
      opacity: 0.75,
    });
    this.weatherParticles = new THREE.Points(pGeo, pMat);
    this.scene.add(this.weatherParticles);

    this.disposables.push(peakGeo, peakMat, pGeo, pMat);
  }

  private createSkyscraperTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, size, size);
      for (let y = 8; y < size - 6; y += 12) {
        for (let x = 8; x < size - 6; x += 10) {
          ctx.fillStyle = Math.random() > 0.35 ? '#38bdf8' : Math.random() > 0.5 ? '#fde047' : '#0f172a';
          ctx.fillRect(x, y, 5, 7);
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private syncInstanced(
    mesh: THREE.InstancedMesh,
    arr: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number }>,
  ): void {
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      _dummy.position.set(it.x, it.y, it.z);
      _dummy.rotation.set(0, i * 0.7, 0);
      _dummy.scale.set(it.sx, it.sy, it.sz);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  private syncTreeInstances(): void {
    for (let i = 0; i < this.treeData.length; i++) {
      const t = this.treeData[i];
      _dummy.position.set(t.x, t.y, t.z);
      _dummy.rotation.set(0, i * 0.85, 0);
      _dummy.scale.setScalar(t.s);
      _dummy.updateMatrix();
      this.treeTrunksInstanced.setMatrixAt(i, _dummy.matrix);
      this.treeCrownsInstanced.setMatrixAt(i, _dummy.matrix);
    }
    this.treeTrunksInstanced.instanceMatrix.needsUpdate = true;
    this.treeCrownsInstanced.instanceMatrix.needsUpdate = true;
  }

  public setMap(mapId: MapId): void {
    this.currentMap = mapId;
    this.spaceGroup.visible = mapId === 'space';
    this.cityGroup.visible = mapId === 'city';
    this.forestGroup.visible = mapId === 'forest';
    this.desertGroup.visible = mapId === 'desert';
    this.snowGroup.visible = mapId === 'snow';

    const wMat = this.weatherParticles.material as THREE.PointsMaterial;
    if (mapId === 'snow') {
      wMat.color.setHex(0xffffff);
      wMat.size = 0.34;
      wMat.opacity = 0.88;
      this.weatherParticles.visible = true;
    } else if (mapId === 'desert') {
      wMat.color.setHex(0xfde68a);
      wMat.size = 0.22;
      wMat.opacity = 0.55;
      this.weatherParticles.visible = true;
    } else if (mapId === 'forest') {
      wMat.color.setHex(0xbbf7d0);
      wMat.size = 0.18;
      wMat.opacity = 0.45;
      this.weatherParticles.visible = true;
    } else if (mapId === 'space') {
      wMat.color.setHex(0xc4b5fd);
      wMat.size = 0.22;
      wMat.opacity = 0.65;
      this.weatherParticles.visible = true;
    } else {
      wMat.color.setHex(0x7dd3fc);
      wMat.size = 0.18;
      wMat.opacity = 0.35;
      this.weatherParticles.visible = true;
    }

    void this.groundMat;
    void this.groundTex;
  }

  public update(speed: number, dt: number): void {
    const dz = speed * dt;

    if (this.currentMap === 'space') {
      this.spaceStation.rotation.z += dt * 0.22;
      this.spaceStation.rotation.y += dt * 0.12;
      this.planetGroup.rotation.y += dt * 0.04;
    } else if (this.currentMap === 'city') {
      for (let i = 0; i < this.buildingData.length; i++) {
        this.buildingData[i].z += dz;
        if (this.buildingData[i].z > 28) {
          this.buildingData[i].z -= this.buildingData.length * 6.8;
        }
      }
      this.syncInstanced(this.buildingInstanced, this.buildingData);

      for (const br of this.bridgeArches) {
        br.position.z += dz;
        if (br.position.z > 22) {
          br.position.z -= 165;
        }
      }
    } else if (this.currentMap === 'forest') {
      for (let i = 0; i < this.treeData.length; i++) {
        this.treeData[i].z += dz;
        if (this.treeData[i].z > 28) {
          this.treeData[i].z -= this.treeData.length * 5.8;
        }
      }
      this.syncTreeInstances();
    } else if (this.currentMap === 'desert') {
      for (let i = 0; i < this.duneData.length; i++) {
        this.duneData[i].z += dz;
        if (this.duneData[i].z > 28) {
          this.duneData[i].z -= this.duneData.length * 7.6;
        }
      }
      this.syncInstanced(this.duneInstanced, this.duneData);
    } else if (this.currentMap === 'snow') {
      for (let i = 0; i < this.mountainData.length; i++) {
        this.mountainData[i].z += dz;
        if (this.mountainData[i].z > 30) {
          this.mountainData[i].z -= this.mountainData.length * 8.2;
        }
      }
      this.syncInstanced(this.mountainInstanced, this.mountainData);
    }

    // Animate weather / snow / space dust particles directly via Float32Array
    const arr = this.weatherPositions;
    const fallY = this.currentMap === 'snow' ? 4.2 : 0.4;
    const windX = this.currentMap === 'snow' || this.currentMap === 'desert' ? -3.2 : 0;
    const stepX = windX * dt;
    const stepY = fallY * dt;
    const stepZ = dz * 1.15;
    for (let i = 0; i < arr.length; i += 3) {
      let x = arr[i] + stepX;
      let y = arr[i + 1] - stepY;
      let z = arr[i + 2] + stepZ;
      if (z > 10) z -= 98;
      if (y < -2) y += 14;
      if (x < -22) x += 44;
      arr[i] = x;
      arr[i + 1] = y;
      arr[i + 2] = z;
    }
    (this.weatherParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
