import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WORLD_PINS } from '../data/initialGameState';
import type { WorldPin } from '../types/game';
import { sound } from '../utils/sound';

interface CityViewport3DProps {
  onPinSelect: (pin: WorldPin) => void;
  onChestClick: () => void;
  paused: boolean;
}

const _projVec = new THREE.Vector3();
const _forwardVec = new THREE.Vector3();
const _rightVec = new THREE.Vector3();
const _dummy = new THREE.Object3D();

function createFacadeTexture(baseHex: string, windowHex: string, rows: number, cols: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle brick/stone banding
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = 0; y < 256; y += 16) {
    ctx.fillRect(0, y, 256, 2);
  }

  const padX = 20;
  const padY = 22;
  const cellW = (256 - padX * 2) / cols;
  const cellH = (256 - padY * 2) / rows;
  const winW = cellW * 0.56;
  const winH = cellH * 0.62;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = padX + c * cellW + (cellW - winW) / 2;
      const wy = padY + r * cellH + (cellH - winH) / 2;
      const lit = ((r * 7 + c * 13) % 5) !== 0;
      ctx.fillStyle = '#120d0a';
      ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4);
      ctx.fillStyle = lit ? windowHex : '#1b2434';
      ctx.fillRect(wx, wy, winW, winH);
      if (lit) {
        ctx.fillStyle = 'rgba(255,245,200,0.35)';
        ctx.fillRect(wx + 2, wy + 2, winW - 4, winH * 0.45);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createCobbleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1c2028';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 16) {
    const offset = (y / 16) % 2 === 0 ? 0 : 12;
    for (let x = -16; x < 256; x += 24) {
      const shade = 26 + ((x * 3 + y * 5) % 16);
      ctx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 9})`;
      ctx.fillRect(x + offset + 1, y + 1, 22, 14);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  return tex;
}

function buildCompositeTownhouse(
  w: number,
  h: number,
  d: number,
  wallMat: THREE.Material,
  roofMat: THREE.Material,
  trimMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.4, d + 0.25), trimMat);
  base.position.y = 0.2;
  base.receiveShadow = true;
  g.add(base);

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = 0.4 + h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Pitched roof prism via ExtrudeGeometry or tapered box
  const roofH = Math.min(w, d) * 0.45;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, roofH, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 0.4 + h + roofH / 2 - 0.05;
  roof.castShadow = true;
  g.add(roof);

  // Chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.42), trimMat);
  chimney.position.set(w * 0.22, 0.4 + h + roofH * 0.55, d * 0.15);
  g.add(chimney);

  return g;
}

function buildCityHall(wallMat: THREE.Material, glowMat: THREE.Material, roofMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  // Plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.5, 8.2), roofMat);
  plinth.position.y = 0.25;
  plinth.receiveShadow = true;
  g.add(plinth);

  // Main courtyard wings
  const mainHall = new THREE.Mesh(new THREE.BoxGeometry(9.6, 3.4, 7.0), wallMat);
  mainHall.position.y = 2.2;
  mainHall.castShadow = true;
  mainHall.receiveShadow = true;
  g.add(mainHall);

  // Illuminated arcade bays
  const innerGlow = new THREE.Mesh(new THREE.BoxGeometry(9.75, 2.2, 7.15), glowMat);
  innerGlow.position.y = 1.9;
  g.add(innerGlow);

  // Columns along front & sides
  const colGeo = new THREE.CylinderGeometry(0.16, 0.18, 2.8, 8);
  for (let x = -4.2; x <= 4.2; x += 1.4) {
    const colF = new THREE.Mesh(colGeo, wallMat);
    colF.position.set(x, 1.9, 3.65);
    g.add(colF);
    const colB = new THREE.Mesh(colGeo, wallMat);
    colB.position.set(x, 1.9, -3.65);
    g.add(colB);
  }

  // Stepped Clock Tower
  const towerBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 3.2), wallMat);
  towerBase.position.set(-1.5, 5.2, 0);
  towerBase.castShadow = true;
  g.add(towerBase);

  const towerLantern = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.8, 2.3), glowMat);
  towerLantern.position.set(-1.5, 7.6, 0);
  g.add(towerLantern);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.75, 2.4, 4), roofMat);
  spire.rotation.y = Math.PI / 4;
  spire.position.set(-1.5, 9.6, 0);
  g.add(spire);

  return g;
}

function buildTugboat(hullColor: number, cabinColor: number): THREE.Group {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.55, metalness: 0.2 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: cabinColor, roughness: 0.65, metalness: 0.1 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.4, emissive: 0xf59e0b, emissiveIntensity: 0.35 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.75, 4.2), hullMat);
  hull.position.y = 0.2;
  g.add(hull);

  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.18, 1.4, 4), hullMat);
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 0.25, 2.5);
  g.add(bow);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.9, 1.8), cabinMat);
  cabin.position.set(0, 0.95, -0.2);
  g.add(cabin);

  const wheelhouse = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.7, 0.95), trimMat);
  wheelhouse.position.set(0, 1.65, 0.1);
  g.add(wheelhouse);

  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.0, 10), new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 }));
  stack.position.set(0, 1.75, -0.75);
  g.add(stack);

  return g;
}

function buildStreetLamp(poleMat: THREE.Material, bulbMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 2.6, 6), poleMat);
  pole.position.y = 1.3;
  g.add(pole);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), bulbMat);
  head.position.y = 2.68;
  g.add(head);
  return g;
}

function PinGlyph({ icon }: { icon: WorldPin['icon'] }) {
  switch (icon) {
    case 'pub':
      return <span className="text-sm font-bold text-amber-200">🥃</span>;
    case 'domination':
      return <span className="text-sm font-bold text-slate-100">♛</span>;
    case 'news':
      return <span className="text-sm font-bold text-sky-200">🔍</span>;
    case 'bank':
      return <span className="text-sm font-bold text-amber-300">💰</span>;
    case 'luckyCash':
      return <span className="text-sm font-bold text-yellow-300">$</span>;
    case 'luckyGift':
      return <span className="text-sm font-bold text-fuchsia-200">🎁</span>;
    case 'palermo':
      return <span className="text-sm font-bold text-zinc-950">✋</span>;
    case 'gambino':
      return <span className="text-sm font-bold text-violet-200">🎲</span>;
    case 'corleone':
      return <span className="text-sm font-bold text-rose-200">♠</span>;
    case 'genovese':
      return <span className="text-sm font-bold text-emerald-200">🍾</span>;
    case 'salvatore':
      return <span className="text-sm font-bold text-amber-200">🎩</span>;
    case 'padrino':
      return <span className="text-sm font-bold text-blue-200">🔫</span>;
  }
}

export const CityViewport3D: React.FC<CityViewport3DProps> = ({
  onPinSelect,
  onChestClick,
  paused,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pinRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const chestRef = useRef<HTMLButtonElement | null>(null);
  const pausedRef = useRef(paused);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060d19);
    scene.fog = new THREE.FogExp2(0x060d19, 0.012);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 220);
    camera.position.set(22, 26, 28);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const onLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onRestored = () => setContextLost(false);
    renderer.domElement.addEventListener('webglcontextlost', onLost);
    renderer.domElement.addEventListener('webglcontextrestored', onRestored);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const controls = new MapControls(camera, renderer.domElement);
    controls.target.set(-2, 0, 2);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.screenSpacePanning = false;
    controls.minDistance = 16;
    controls.maxDistance = 64;
    controls.minPolarAngle = Math.PI * 0.16;
    controls.maxPolarAngle = Math.PI * 0.42;

    // Lighting: Cool moonlight + warm harbor key + streetlamp point lights
    const hemi = new THREE.HemisphereLight(0x28466e, 0x0b0e17, 0.85);
    scene.add(hemi);

    const moonKey = new THREE.DirectionalLight(0x7ca6d8, 0.9);
    moonKey.position.set(-26, 38, -22);
    moonKey.castShadow = !isSoftwareGl;
    moonKey.shadow.mapSize.set(1024, 1024);
    moonKey.shadow.camera.left = -35;
    moonKey.shadow.camera.right = 35;
    moonKey.shadow.camera.top = 35;
    moonKey.shadow.camera.bottom = -35;
    moonKey.shadow.bias = -0.0005;
    scene.add(moonKey);

    const warmCityFill = new THREE.DirectionalLight(0xffaa44, 0.85);
    warmCityFill.position.set(22, 18, 16);
    scene.add(warmCityFill);

    // Textures & Materials
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const cobbleTex = createCobbleTexture();
    cobbleTex.anisotropy = maxAniso;

    const brickTexA = createFacadeTexture('#4a251d', '#f59e0b', 4, 4);
    brickTexA.anisotropy = maxAniso;
    const brickTexB = createFacadeTexture('#2b3342', '#fbbf24', 4, 3);
    brickTexB.anisotropy = maxAniso;
    const stoneTex = createFacadeTexture('#6e6252', '#fde68a', 3, 5);
    stoneTex.anisotropy = maxAniso;

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x051120,
      roughness: 0.18,
      metalness: 0.72,
    });
    const groundMat = new THREE.MeshStandardMaterial({
      map: cobbleTex,
      roughness: 0.88,
      metalness: 0.05,
    });
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0x3b3328,
      roughness: 0.85,
    });
    const quayMat = new THREE.MeshStandardMaterial({
      color: 0x2a2f3b,
      roughness: 0.85,
    });
    const wallMatA = new THREE.MeshStandardMaterial({ map: brickTexA, roughness: 0.78 });
    const wallMatB = new THREE.MeshStandardMaterial({ map: brickTexB, roughness: 0.78 });
    const cityHallMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.65 });
    const cityHallGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffd17a,
      emissive: 0xff9f2e,
      emissiveIntensity: 0.75,
      roughness: 0.4,
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x161a24, roughness: 0.75 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x2c241d, roughness: 0.85 });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5, metalness: 0.6 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xff9e2c,
      emissiveIntensity: 2.2,
    });

    // Water plane (extends far to horizon)
    const water = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.8;
    scene.add(water);

    // Main city island / peninsula
    const island = new THREE.Mesh(new THREE.BoxGeometry(58, 1.0, 56), groundMat);
    island.position.set(2, -0.5, 4);
    island.receiveShadow = true;
    scene.add(island);

    // North-west harbor canal cut-out look: raised quay border
    const quayWall = new THREE.Mesh(new THREE.BoxGeometry(60, 1.35, 1.4), quayMat);
    quayWall.position.set(2, -0.35, -24.2);
    scene.add(quayWall);

    const westQuay = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.35, 58), quayMat);
    westQuay.position.set(-27.2, -0.35, 4);
    scene.add(westQuay);

    // Arched bridge in upper-left harbor
    const bridgeGroup = new THREE.Group();
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(16, 0.7, 3.6), quayMat);
    bridgeDeck.position.set(-34, 1.1, -6);
    bridgeGroup.add(bridgeDeck);
    for (const bx of [-39, -34, -29]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 3.8), quayMat);
      pier.position.set(bx, -0.1, -6);
      bridgeGroup.add(pier);
    }
    scene.add(bridgeGroup);

    // Grand City Hall / Palazzo (center-north)
    const cityHall = buildCityHall(cityHallMat, cityHallGlowMat, roofMat);
    cityHall.position.set(-2, 0, -4.5);
    scene.add(cityHall);

    // Central Cobblestone Plaza (south-west of City Hall, matching IMG_0461)
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(16, 0.08, 11), plazaMat);
    plaza.position.set(-9, 0.02, 11);
    plaza.receiveShadow = true;
    scene.add(plaza);

    // Gazebo in Plaza
    const gazebo = new THREE.Group();
    const gBase = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.4, 8), quayMat);
    gBase.position.y = 0.2;
    gazebo.add(gBase);
    const gRoof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 }));
    gRoof.position.y = 1.9;
    gazebo.add(gRoof);
    const gPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), trimMat);
    gPost.position.y = 0.9;
    gazebo.add(gPost);
    gazebo.position.set(-9, 0.05, 11);
    scene.add(gazebo);

    // City Townhouses Rows
    const buildingLayouts: Array<[number, number, number, number, number, boolean, number]> = [
      // East row (Bank / Lucky Rewards)
      [8.5, -12, 3.8, 3.6, 3.6, true, 0],
      [13.0, -11.5, 3.6, 4.2, 3.6, false, 0],
      [14.5, -7.5, 4.0, 3.8, 3.8, true, 0],
      [9.5, -3.5, 4.4, 4.4, 4.0, false, 0],
      [14.5, -1.5, 3.8, 3.6, 3.6, true, 0],
      // South-east row (Palermo / Padrino / Salvatore)
      [3.2, 4.8, 4.2, 3.5, 3.6, true, 0],
      [8.5, 4.8, 4.0, 3.8, 3.6, false, 0],
      [11.0, 10.5, 4.4, 4.0, 4.2, true, Math.PI / 2],
      [-1.5, 12.0, 4.2, 4.2, 3.8, false, 0],
      // South-west & Gambino / Corleone / Genovese district
      [-14.0, 9.5, 4.0, 4.4, 3.8, true, 0],
      [-20.5, 15.5, 4.2, 4.8, 4.0, false, 0],
      [-15.0, 17.5, 3.8, 3.6, 3.6, true, 0],
      [-7.0, 19.0, 4.4, 4.0, 3.8, false, 0],
      [-1.5, 19.5, 4.0, 3.8, 3.6, true, 0],
      // Dockside warehouses
      [-13.0, -3.5, 4.6, 3.2, 3.8, false, 0],
      [-18.5, 1.5, 4.4, 3.6, 4.0, true, Math.PI / 2],
    ];

    buildingLayouts.forEach(([x, z, w, h, d, useA, rotY]) => {
      const b = buildCompositeTownhouse(w, h, d, useA ? wallMatA : wallMatB, roofMat, trimMat);
      b.position.set(x, 0, z);
      b.rotation.y = rotY;
      scene.add(b);
    });

    // Warm Streetlamps & PointLights (selective count <= 6 point lights for fast performance)
    const lampCoords: Array<[number, number, boolean]> = [
      [-2, 1.5, true],
      [8.5, -6.5, true],
      [-11, 7.5, true],
      [-6, 15, true],
      [6, 10, true],
      [-17, 13, false],
      [12, 1.5, false],
      [-15, 2, false],
      [2, -10, false],
    ];

    lampCoords.forEach(([lx, lz, withLight]) => {
      const lamp = buildStreetLamp(poleMat, bulbMat);
      lamp.position.set(lx, 0, lz);
      scene.add(lamp);
      if (withLight) {
        const pt = new THREE.PointLight(0xff9b26, 16, 18, 1.7);
        pt.position.set(lx, 2.9, lz);
        scene.add(pt);
      }
    });

    // Instanced trees around the plaza
    const treeCount = 24;
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.1, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3f2718, roughness: 0.9 });
    const foliageGeo = new THREE.DodecahedronGeometry(0.7, 0);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x714b1c, roughness: 0.85 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const crowns = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);

    for (let i = 0; i < treeCount; i++) {
      const col = i % 8;
      const row = Math.floor(i / 8);
      const tx = -15.5 + col * 1.9;
      const tz = 8.0 + row * 3.0;
      const s = 0.85 + ((i * 7) % 3) * 0.12;
      _dummy.position.set(tx, 0.55, tz);
      _dummy.scale.set(s, s, s);
      _dummy.updateMatrix();
      trunks.setMatrixAt(i, _dummy.matrix);

      _dummy.position.set(tx, 1.45, tz);
      _dummy.updateMatrix();
      crowns.setMatrixAt(i, _dummy.matrix);
    }
    trunks.computeBoundingSphere();
    crowns.computeBoundingSphere();
    scene.add(trunks, crowns);

    // Two Harbor Tugboats cruising along the canal
    const tug1 = buildTugboat(0x9a3412, 0xe7e5e4);
    tug1.position.set(-32, -0.65, 8);
    scene.add(tug1);

    const tug2 = buildTugboat(0x334155, 0xd6d3d1);
    tug2.position.set(-18, -0.65, -29);
    tug2.rotation.y = Math.PI / 2;
    scene.add(tug2);

    // Instanced steam puffs above tugboat smokestacks
    const steamCount = 20;
    const steamGeo = new THREE.DodecahedronGeometry(0.32, 0);
    const steamMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.42,
      roughness: 1,
      depthWrite: false,
    });
    const steamMesh = new THREE.InstancedMesh(steamGeo, steamMat, steamCount);
    steamMesh.frustumCulled = false;
    scene.add(steamMesh);

    // Dockside Treasure Chest 3D marker anchor
    const chestAnchor = new THREE.Vector3(-23, 1.0, 20);
    const chestMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xb45309, emissive: 0x78350f, emissiveIntensity: 0.4, roughness: 0.5 })
    );
    chestMesh.position.set(chestAnchor.x, 0.4, chestAnchor.z);
    scene.add(chestMesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Keyboard WASD/Arrows pan support for Windows PC
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      if (pausedRef.current) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      keys[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const updateScreenPins = (w: number, h: number) => {
      for (let i = 0; i < WORLD_PINS.length; i++) {
        const pin = WORLD_PINS[i];
        const el = pinRefs.current[pin.id];
        if (!el) continue;
        _projVec.set(pin.worldPos[0], pin.worldPos[1], pin.worldPos[2]).project(camera);
        if (_projVec.z > 1) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        } else {
          const sx = ((_projVec.x + 1) * 0.5) * w;
          const sy = ((-_projVec.y + 1) * 0.5) * h;
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
          el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
        }
      }

      if (chestRef.current) {
        _projVec.copy(chestAnchor).project(camera);
        if (_projVec.z > 1) {
          chestRef.current.style.opacity = '0';
        } else {
          const sx = ((_projVec.x + 1) * 0.5) * w;
          const sy = ((-_projVec.y + 1) * 0.5) * h;
          chestRef.current.style.opacity = '1';
          chestRef.current.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
        }
      }
    };

    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.elapsedTime;

      if (!pausedRef.current) {
        const panSpeed = 16 * dt;
        camera.getWorldDirection(_forwardVec);
        _forwardVec.y = 0;
        _forwardVec.normalize();
        _rightVec.crossVectors(_forwardVec, camera.up).normalize();

        if (keys['KeyW'] || keys['ArrowUp']) {
          camera.position.addScaledVector(_forwardVec, panSpeed);
          controls.target.addScaledVector(_forwardVec, panSpeed);
        }
        if (keys['KeyS'] || keys['ArrowDown']) {
          camera.position.addScaledVector(_forwardVec, -panSpeed);
          controls.target.addScaledVector(_forwardVec, -panSpeed);
        }
        if (keys['KeyA'] || keys['ArrowLeft']) {
          camera.position.addScaledVector(_rightVec, -panSpeed);
          controls.target.addScaledVector(_rightVec, -panSpeed);
        }
        if (keys['KeyD'] || keys['ArrowRight']) {
          camera.position.addScaledVector(_rightVec, panSpeed);
          controls.target.addScaledVector(_rightVec, panSpeed);
        }
      }

      // Clamp target within the harbor town
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -26, 22);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -22, 24);
      controls.update();

      // Animate tugboats gliding slowly
      tug1.position.z = 8 + Math.sin(elapsed * 0.14) * 12;
      tug1.rotation.y = Math.cos(elapsed * 0.14) >= 0 ? 0 : Math.PI;
      tug2.position.x = -10 + Math.cos(elapsed * 0.11) * 14;
      tug2.rotation.y = -Math.sin(elapsed * 0.11) >= 0 ? Math.PI / 2 : -Math.PI / 2;

      // Animate steam puffs rising from both stacks
      for (let i = 0; i < steamCount; i++) {
        const boat = i < 10 ? tug1 : tug2;
        const phase = ((elapsed * 0.7 + (i % 10) * 0.1) % 1);
        _dummy.position.set(
          boat.position.x - phase * 1.4,
          1.3 + phase * 3.0,
          boat.position.z - phase * 0.8
        );
        const s = 0.5 + phase * 1.3;
        _dummy.scale.set(s, s, s);
        _dummy.updateMatrix();
        steamMesh.setMatrixAt(i, _dummy.matrix);
      }
      steamMesh.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);
      updateScreenPins(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
      controls.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
      cobbleTex.dispose();
      brickTexA.dispose();
      brickTexB.dispose();
      stoneTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#060d19]">
      <div ref={mountRef} className="w-full h-full" />

      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#060d19]/90 text-amber-200 text-sm">
          Restoring 3D harbor viewport…
        </div>
      )}

      {/* Projected 3D Map Pins */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {WORLD_PINS.map((pin) => (
          <button
            key={pin.id}
            ref={(el) => {
              pinRefs.current[pin.id] = el;
            }}
            type="button"
            onClick={() => {
              sound.playClick();
              onPinSelect(pin);
            }}
            className="absolute top-0 left-0 flex flex-col items-center group focus:outline-none cursor-pointer"
            style={{ willChange: 'transform, opacity' }}
          >
            <span className="mb-1 px-1.5 py-0.5 text-xs sm:text-sm font-semibold italic tracking-wide text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)] whitespace-nowrap">
              {pin.label}
            </span>
            <span className="w-11 h-11 rounded-full bg-[#4c4668]/80 border border-white/25 flex items-center justify-center shadow-lg transition-transform duration-150 group-hover:scale-110 group-active:scale-95">
              <PinGlyph icon={pin.icon} />
            </span>
          </button>
        ))}

        {/* Dockside Lucky Chest Pin */}
        <button
          ref={chestRef}
          type="button"
          onClick={() => {
            sound.playClick();
            onChestClick();
          }}
          title="Harbor Treasure Chest"
          className="pointer-events-auto absolute top-0 left-0 w-11 h-11 rounded-full bg-amber-900/60 border border-amber-400/50 flex items-center justify-center text-lg shadow-lg hover:scale-110 transition-transform cursor-pointer"
          style={{ willChange: 'transform, opacity' }}
        >
          🧰
        </button>
      </div>
    </div>
  );
};
