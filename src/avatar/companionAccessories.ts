import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';

const ACCESSORY_GROUP_NAME = '__bear_companion_accessory__';
const BLINK_PERIOD_SECONDS = 3.4;
const BLINK_START_SECONDS = 1.68;
const BLINK_DURATION_SECONDS = 0.15;
const EYELID_OPEN_ROT_X = -1.55;
const EYELID_CLOSED_ROT_X = 0.92;
const EYELID_LEFT_YAW_RAD = 0.30;
const EYELID_RIGHT_YAW_RAD = -0.28;
const BROW_ARC_RAD = Math.PI * 0.68;
const BROW_BASE_ROT_Z = (Math.PI - BROW_ARC_RAD) * 0.5;
const BROW_REST_SLOPE_RAD = 0.14;
const BROW_LEFT_YAW_RAD = 0.42;
const BROW_RIGHT_YAW_RAD = -0.38;

const EXPRESSIVE_BLINK_CLIPS = new Set(['wave', 'encourage', 'shrug', 'think', 'listen']);

export interface BrowPose {
  liftY: number;
  leftTiltRad: number;
  rightTiltRad: number;
}

const NEUTRAL_BROW_POSE: BrowPose = { liftY: 0, leftTiltRad: 0, rightTiltRad: 0 };

const BROW_POSE_BY_CLIP: Record<string, BrowPose> = {
  celebrate: { liftY: 1.6, leftTiltRad: 0.09, rightTiltRad: -0.09 },
  jump: { liftY: 1.6, leftTiltRad: 0.09, rightTiltRad: -0.09 },
  finale: { liftY: 1.6, leftTiltRad: 0.09, rightTiltRad: -0.09 },
  peekaboo: { liftY: 1.5, leftTiltRad: 0.08, rightTiltRad: -0.08 },
  clap: { liftY: 1.2, leftTiltRad: 0.06, rightTiltRad: -0.06 },
  wave: { liftY: 1.2, leftTiltRad: 0.06, rightTiltRad: -0.06 },
  wiggle: { liftY: 1.2, leftTiltRad: 0.06, rightTiltRad: -0.06 },
  bow: { liftY: 1.2, leftTiltRad: 0.06, rightTiltRad: -0.06 },
  march: { liftY: 1.2, leftTiltRad: 0.06, rightTiltRad: -0.06 },
  stretch: { liftY: 1.1, leftTiltRad: 0.05, rightTiltRad: -0.05 },
  encourage: { liftY: 0.9, leftTiltRad: -0.11, rightTiltRad: 0.11 },
  shrug: { liftY: 0.9, leftTiltRad: -0.11, rightTiltRad: 0.11 },
  think: { liftY: 1.1, leftTiltRad: -0.04, rightTiltRad: 0.11 },
  search: { liftY: 1.1, leftTiltRad: -0.04, rightTiltRad: 0.11 },
  listen: { liftY: 1.1, leftTiltRad: -0.04, rightTiltRad: 0.11 },
};

interface SharedAccessoryResources {
  searchHandleGeo: CylinderGeometry;
  searchFerruleGeo: CylinderGeometry;
  searchRimGeo: TorusGeometry;
  searchLensGeo: CylinderGeometry;
  searchHandleMat: MeshStandardMaterial;
  searchBrassMat: MeshStandardMaterial;
  searchLensMat: MeshStandardMaterial;

  bulbGlobeGeo: SphereGeometry;
  bulbNeckGeo: CylinderGeometry;
  bulbScrewGeo: CylinderGeometry;
  bulbTipGeo: SphereGeometry;
  bulbRayGeo: CylinderGeometry;
  bulbGlassMat: MeshStandardMaterial;
  bulbBaseMat: MeshStandardMaterial;
  bulbTipMat: MeshStandardMaterial;

  maskGeo: BufferGeometry;
  maskMat: MeshStandardMaterial;

  hatBrimGeo: CylinderGeometry;
  hatBandGeo: CylinderGeometry;
  hatCrownGeo: CylinderGeometry;
  hatBodyMat: MeshStandardMaterial;
  hatBandMat: MeshStandardMaterial;

  flagPoleGeo: CylinderGeometry;
  flagFinialGeo: SphereGeometry;
  flagPennantGeo: BufferGeometry;
  flagWoodMat: MeshStandardMaterial;
  flagGoldMat: MeshStandardMaterial;
  flagClothMat: MeshStandardMaterial;

  maracaHandleGeo: CylinderGeometry;
  maracaGourdGeo: SphereGeometry;
  maracaBand1Geo: CylinderGeometry;
  maracaBand2Geo: CylinderGeometry;
  maracaWoodMat: MeshStandardMaterial;
  maracaGourdMat: MeshStandardMaterial;
  maracaStripeMat: MeshStandardMaterial;
  maracaTealMat: MeshStandardMaterial;

  eyelidGeo: SphereGeometry;
  eyelidMat: MeshStandardMaterial;
  browGeo: TorusGeometry;
  browMat: MeshStandardMaterial;
}

interface AccessoryNodes {
  searchGlass: Group;
  thinkBulb: Group;
  flexMask: Group;
  bowHat: Group;
  marchFlag: Group;
  wiggleLeftMaraca: Group;
  wiggleRightMaraca: Group;
  facialGroup: Group;
  leftEyelid: Mesh;
  rightEyelid: Mesh;
  leftBrow: Mesh;
  rightBrow: Mesh;
}

let sharedResources: SharedAccessoryResources | null = null;
const sceneAccessoryCache = new WeakMap<Object3D, AccessoryNodes>();

function orientGroupYAlong(group: Group, origin: [number, number, number], yAxis: [number, number, number]) {
  group.position.set(origin[0], origin[1], origin[2]);
  const dir = new Vector3(yAxis[0], yAxis[1], yAxis[2]).normalize();
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
  group.quaternion.copy(q);
}

function maskPoint(sideSign: number, theta: number, v: number): [number, number, number] {
  const cx = sideSign * (16.2 + 0.8 * v);
  const cy = 36.8 + 0.8 * v;
  const rx = 5.2 + v * 13.8;
  const ry = 4.6 + v * 4.4;
  const rawX = cx + rx * Math.cos(theta);
  const rawY = cy + ry * Math.sin(theta);
  const x = sideSign < 0 ? Math.min(0.0, rawX) : Math.max(0.0, rawX);
  const outerDist = Math.max(0.0, Math.abs(x) - 18.0) / 15.0;
  const wingLift = 2.8 * v * (outerDist ** 1.4) * (Math.sin(theta) > -0.2 ? 1.0 : 0.3);
  const bridgeArch = 3.2 * v * Math.exp(-(x * x) / 55.0) * (Math.sin(theta) < 0 ? 1.0 : 0.0);
  const minYFloor = 31.4 + 4.4 * Math.exp(-(x * x) / 150.0);
  const y = Math.max(minYFloor, rawY + wingLift + bridgeArch);
  const snoutDrop = Math.max(0.0, 38.0 - y);
  const snoutBulge = 21.5 * (1.0 - Math.exp(-((snoutDrop / 3.1) ** 2))) * Math.exp(-((x / 16.2) ** 2));
  const z = 43.5 + snoutBulge - 0.0096 * x * x - 0.012 * ((y - 38.0) ** 2);
  return [x, y, z];
}

function buildSuperheroMaskGeometry(): BufferGeometry {
  const rings = 12;
  const segs = 56;
  const positions: number[] = [];
  const indices: number[] = [];

  for (const sideSign of [-1, 1]) {
    const baseIdx = positions.length / 3;
    for (let r = 0; r <= rings; r++) {
      const v = r / rings;
      for (let s = 0; s < segs; s++) {
        const theta = (2 * Math.PI * s) / segs;
        const [x, y, z] = maskPoint(sideSign, theta, v);
        positions.push(x, y, z);
      }
    }
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segs; s++) {
        const sn = (s + 1) % segs;
        const a = baseIdx + r * segs + s;
        const b = baseIdx + r * segs + sn;
        const c = baseIdx + (r + 1) * segs + sn;
        const d = baseIdx + (r + 1) * segs + s;
        indices.push(a, b, c, a, c, d);
      }
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildPennantGeometry(): BufferGeometry {
  const flagGeo = new BufferGeometry();
  const verts = new Float32Array([
    0, 42.5, 0.5,
    0, 26.5, 0.5,
    21, 34.5, 0.5,
    0, 42.5, -0.5,
    21, 34.5, -0.5,
    0, 26.5, -0.5,
  ]);
  flagGeo.setAttribute('position', new BufferAttribute(verts, 3));
  flagGeo.setIndex([0, 1, 2, 3, 4, 5]);
  flagGeo.computeVertexNormals();
  return flagGeo;
}

function getSharedAccessoryResources(): SharedAccessoryResources {
  if (sharedResources) return sharedResources;

  sharedResources = {
    searchHandleGeo: new CylinderGeometry(1.8, 2.1, 22, 16),
    searchFerruleGeo: new CylinderGeometry(2.4, 2.4, 3.6, 16),
    searchRimGeo: new TorusGeometry(14.2, 2.1, 16, 36),
    searchLensGeo: new CylinderGeometry(13.0, 13.0, 1.4, 32),
    searchHandleMat: new MeshStandardMaterial({ color: '#5c3a21', roughness: 0.55, metalness: 0.1 }),
    searchBrassMat: new MeshStandardMaterial({ color: '#f59e0b', roughness: 0.3, metalness: 0.65 }),
    searchLensMat: new MeshStandardMaterial({
      color: '#7dd3fc',
      roughness: 0.15,
      metalness: 0.05,
      transparent: true,
      opacity: 0.45,
    }),

    bulbGlobeGeo: new SphereGeometry(7.8, 24, 18),
    bulbNeckGeo: new CylinderGeometry(6.2, 3.8, 4.6, 20),
    bulbScrewGeo: new CylinderGeometry(3.8, 3.4, 3.8, 20),
    bulbTipGeo: new SphereGeometry(2.2, 16, 12),
    bulbRayGeo: new CylinderGeometry(0.85, 0.85, 3.6, 10),
    bulbGlassMat: new MeshStandardMaterial({
      color: '#fde047',
      emissive: '#facc15',
      emissiveIntensity: 0.65,
      roughness: 0.2,
    }),
    bulbBaseMat: new MeshStandardMaterial({ color: '#94a3b8', roughness: 0.35, metalness: 0.7 }),
    bulbTipMat: new MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 }),

    maskGeo: buildSuperheroMaskGeometry(),
    maskMat: new MeshStandardMaterial({
      color: '#e11d48',
      roughness: 0.38,
      metalness: 0.08,
      side: DoubleSide,
    }),

    hatBrimGeo: new CylinderGeometry(19.5, 19.5, 2.0, 32),
    hatBandGeo: new CylinderGeometry(13.5, 13.5, 3.8, 32),
    hatCrownGeo: new CylinderGeometry(14.5, 13.0, 19.5, 32),
    hatBodyMat: new MeshStandardMaterial({ color: '#1e293b', roughness: 0.45, metalness: 0.1 }),
    hatBandMat: new MeshStandardMaterial({ color: '#e11d48', roughness: 0.35, metalness: 0.1 }),

    flagPoleGeo: new CylinderGeometry(1.5, 1.5, 46, 14),
    flagFinialGeo: new SphereGeometry(2.8, 16, 12),
    flagPennantGeo: buildPennantGeometry(),
    flagWoodMat: new MeshStandardMaterial({ color: '#92400e', roughness: 0.55 }),
    flagGoldMat: new MeshStandardMaterial({ color: '#facc15', roughness: 0.3, metalness: 0.5 }),
    flagClothMat: new MeshStandardMaterial({
      color: '#ef4444',
      roughness: 0.4,
      side: DoubleSide,
    }),

    maracaHandleGeo: new CylinderGeometry(1.6, 2.0, 22, 14),
    maracaGourdGeo: new SphereGeometry(8.5, 22, 16),
    maracaBand1Geo: new CylinderGeometry(8.7, 8.7, 2.0, 22),
    maracaBand2Geo: new CylinderGeometry(7.6, 7.6, 1.6, 22),
    maracaWoodMat: new MeshStandardMaterial({ color: '#b45309', roughness: 0.5 }),
    maracaGourdMat: new MeshStandardMaterial({ color: '#f97316', roughness: 0.35 }),
    maracaStripeMat: new MeshStandardMaterial({ color: '#facc15', roughness: 0.35 }),
    maracaTealMat: new MeshStandardMaterial({ color: '#14b8a6', roughness: 0.35 }),

    eyelidGeo: new SphereGeometry(6.4, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
    eyelidMat: new MeshStandardMaterial({ color: '#c9823b', roughness: 0.72 }),
    browGeo: new TorusGeometry(4.6, 1.05, 8, 16, BROW_ARC_RAD),
    browMat: new MeshStandardMaterial({ color: '#4a2811', roughness: 0.75 }),
  };

  return sharedResources;
}

function createAccessoryRoot(accessoryId: string): Group {
  const root = new Group();
  root.name = ACCESSORY_GROUP_NAME;
  root.userData.accessoryId = accessoryId;
  return root;
}

function createMagnifyingGlass(res: SharedAccessoryResources): Group {
  const root = createAccessoryRoot('searchGlass');
  const holder = new Group();
  orientGroupYAlong(holder, [0, 12.0, 2.0], [0.3764, 0.5170, 0.7688]);
  root.add(holder);

  const handle = new Mesh(res.searchHandleGeo, res.searchHandleMat);
  handle.position.set(0, 8.0, 0);
  holder.add(handle);

  const ferrule = new Mesh(res.searchFerruleGeo, res.searchBrassMat);
  ferrule.position.set(0, 20.0, 0);
  holder.add(ferrule);

  const headGroup = new Group();
  headGroup.position.set(0, 35.5, 0);
  headGroup.rotation.set(0.3678, -2.5779, -1.1420);
  holder.add(headGroup);

  const rim = new Mesh(res.searchRimGeo, res.searchBrassMat);
  headGroup.add(rim);

  const lens = new Mesh(res.searchLensGeo, res.searchLensMat);
  lens.rotation.x = Math.PI / 2;
  headGroup.add(lens);

  return root;
}

function createLightbulb(res: SharedAccessoryResources): Group {
  const root = createAccessoryRoot('thinkBulb');
  root.position.set(-22, 68.2, 29.5);
  root.rotation.z = 0.12;

  const globe = new Mesh(res.bulbGlobeGeo, res.bulbGlassMat);
  globe.position.set(0, 4.8, 0);
  root.add(globe);

  const neck = new Mesh(res.bulbNeckGeo, res.bulbGlassMat);
  neck.position.set(0, 0, 0);
  root.add(neck);

  const screw = new Mesh(res.bulbScrewGeo, res.bulbBaseMat);
  screw.position.set(0, -3.3, 0);
  root.add(screw);

  const tip = new Mesh(res.bulbTipGeo, res.bulbTipMat);
  tip.position.set(0, -5.4, 0);
  root.add(tip);

  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI * 0.38 + (i / 4) * Math.PI * 0.76;
    const ray = new Mesh(res.bulbRayGeo, res.bulbGlassMat);
    ray.position.set(Math.sin(angle) * 9.8, 4.8 + Math.cos(angle) * 9.8, 0);
    ray.rotation.z = -angle;
    root.add(ray);
  }

  return root;
}

function createSuperheroMask(res: SharedAccessoryResources): Group {
  const root = createAccessoryRoot('flexMask');
  const maskMesh = new Mesh(res.maskGeo, res.maskMat);
  root.add(maskMesh);
  return root;
}

function createTopHat(res: SharedAccessoryResources): Group {
  const root = createAccessoryRoot('bowHat');
  // Pulled inward toward the palm/torso so crown stays within NDC_X >= -0.92 at cameraDistance = 5.6
  // while keeping crown reach <= 31 along holder Y (max Y = 22.55).
  const holder = new Group();
  orientGroupYAlong(holder, [0, 19.0, 11.0], [0.62, 0.10, 0.78]);
  root.add(holder);

  const hatOffset = new Group();
  hatOffset.position.set(3.0, 2.0, 20.5);
  holder.add(hatOffset);

  const brim = new Mesh(res.hatBrimGeo, res.hatBodyMat);
  hatOffset.add(brim);

  const band = new Mesh(res.hatBandGeo, res.hatBandMat);
  band.position.set(0, 2.6, 0);
  hatOffset.add(band);

  const crown = new Mesh(res.hatCrownGeo, res.hatBodyMat);
  crown.position.set(0, 10.8, 0);
  hatOffset.add(crown);

  return root;
}

function createPennantFlag(res: SharedAccessoryResources): Group {
  const root = createAccessoryRoot('marchFlag');
  const holder = new Group();
  orientGroupYAlong(holder, [0, 11.5, 2.0], [0.02, 0.52, 0.854]);
  root.add(holder);

  const pole = new Mesh(res.flagPoleGeo, res.flagWoodMat);
  pole.position.set(0, 20.0, 0);
  holder.add(pole);

  const finial = new Mesh(res.flagFinialGeo, res.flagGoldMat);
  finial.position.set(0, 43.6, 0);
  holder.add(finial);

  const flag = new Mesh(res.flagPennantGeo, res.flagClothMat);
  holder.add(flag);

  return root;
}

function createMaraca(res: SharedAccessoryResources, side: 'left' | 'right'): Group {
  const root = createAccessoryRoot(side === 'left' ? 'wiggleLeftMaraca' : 'wiggleRightMaraca');
  const origin: [number, number, number] = [0.0, 12.0, 2.0];
  const dir: [number, number, number] = side === 'left' ? [0.2282, 0.9729, 0.0365] : [0.4959, 0.6230, 0.6049];
  const holder = new Group();
  orientGroupYAlong(holder, origin, dir);
  root.add(holder);

  const handle = new Mesh(res.maracaHandleGeo, res.maracaWoodMat);
  handle.position.set(0, 10.0, 0);
  holder.add(handle);

  const gourd = new Mesh(res.maracaGourdGeo, res.maracaGourdMat);
  gourd.scale.set(1, 1.22, 1);
  gourd.position.set(0, 27.5, 0);
  holder.add(gourd);

  const band1 = new Mesh(res.maracaBand1Geo, res.maracaStripeMat);
  band1.position.set(0, 27.5, 0);
  holder.add(band1);

  const band2 = new Mesh(res.maracaBand2Geo, res.maracaTealMat);
  band2.position.set(0, 31.2, 0);
  holder.add(band2);

  return root;
}

function createEyelid(res: SharedAccessoryResources, side: 'left' | 'right'): Mesh {
  const isLeft = side === 'left';
  const eyelid = new Mesh(res.eyelidGeo, res.eyelidMat);
  eyelid.name = isLeft ? 'leftEyelid' : 'rightEyelid';
  eyelid.position.set(isLeft ? 17.3 : -17.3, isLeft ? 36.5 : 35.6, isLeft ? 32.9 : 33.95);
  eyelid.scale.set(0.95, 0.88, 0.80);
  eyelid.rotation.order = 'YXZ';
  eyelid.rotation.set(EYELID_OPEN_ROT_X, isLeft ? EYELID_LEFT_YAW_RAD : EYELID_RIGHT_YAW_RAD, 0);
  eyelid.visible = false;
  eyelid.frustumCulled = false;
  return eyelid;
}

function createBrow(res: SharedAccessoryResources, side: 'left' | 'right'): Mesh {
  const isLeft = side === 'left';
  const sign = isLeft ? 1 : -1;
  const brow = new Mesh(res.browGeo, res.browMat);
  brow.name = isLeft ? 'leftBrow' : 'rightBrow';
  brow.position.set(sign * 17.3, isLeft ? 39.2 : 38.2, isLeft ? 36.4 : 37.7);
  brow.scale.set(1, 1, 0.58);
  brow.rotation.set(
    0,
    isLeft ? BROW_LEFT_YAW_RAD : BROW_RIGHT_YAW_RAD,
    BROW_BASE_ROT_Z - sign * BROW_REST_SLOPE_RAD,
  );
  brow.visible = false;
  brow.frustumCulled = false;
  return brow;
}

export function computeBlinkAmount(
  activeClipName: string | null | undefined,
  normalizedProgress: number,
  elapsedSeconds: number,
): number {
  if (!activeClipName || activeClipName === 'flex') return 0;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0.05) return 0;
  if (activeClipName === 'peekaboo' && normalizedProgress >= 0.22 && normalizedProgress <= 0.78) {
    return 0;
  }

  let periodicBlink = 0;
  const cycleTime = ((elapsedSeconds % BLINK_PERIOD_SECONDS) + BLINK_PERIOD_SECONDS) % BLINK_PERIOD_SECONDS;
  if (cycleTime >= BLINK_START_SECONDS && cycleTime <= BLINK_START_SECONDS + BLINK_DURATION_SECONDS) {
    const u = (cycleTime - BLINK_START_SECONDS) / BLINK_DURATION_SECONDS;
    periodicBlink = Math.sin(Math.PI * u);
  }

  let midClipBlink = 0;
  if (
    EXPRESSIVE_BLINK_CLIPS.has(activeClipName) &&
    normalizedProgress >= 0.46 &&
    normalizedProgress <= 0.56
  ) {
    const u = (normalizedProgress - 0.46) / 0.10;
    midClipBlink = Math.sin(Math.PI * u);
  }

  return Math.max(0, Math.min(1, Math.max(periodicBlink, midClipBlink)));
}

export function computeBrowPose(activeClipName: string | null | undefined): BrowPose {
  if (!activeClipName || activeClipName === 'flex') {
    return NEUTRAL_BROW_POSE;
  }
  return BROW_POSE_BY_CLIP[activeClipName] ?? NEUTRAL_BROW_POSE;
}

function ensureAccessories(scene: Object3D): AccessoryNodes | null {
  const cached = sceneAccessoryCache.get(scene);
  if (cached) return cached;

  const bearMesh = scene.getObjectByName('Bear_fixed_outfit');
  const head = scene.getObjectByName('Head');
  const rightHand = scene.getObjectByName('RightHand');
  const leftHand = scene.getObjectByName('LeftHand');
  if (!bearMesh || !head || !rightHand || !leftHand) return null;

  const res = getSharedAccessoryResources();
  const facialGroup = createAccessoryRoot('facialRig');
  const leftEyelid = createEyelid(res, 'left');
  const rightEyelid = createEyelid(res, 'right');
  const leftBrow = createBrow(res, 'left');
  const rightBrow = createBrow(res, 'right');
  facialGroup.add(leftEyelid, rightEyelid, leftBrow, rightBrow);

  const propGroups: Group[] = [
    createMagnifyingGlass(res),
    createLightbulb(res),
    createSuperheroMask(res),
    createTopHat(res),
    createPennantFlag(res),
    createMaraca(res, 'left'),
    createMaraca(res, 'right'),
  ];

  for (const group of propGroups) {
    group.visible = false;
    group.traverse((obj: Object3D) => {
      if ('isMesh' in obj) obj.frustumCulled = false;
    });
  }

  const [
    searchGlass,
    thinkBulb,
    flexMask,
    bowHat,
    marchFlag,
    wiggleLeftMaraca,
    wiggleRightMaraca,
  ] = propGroups;

  rightHand.add(searchGlass);
  head.add(thinkBulb);
  head.add(flexMask);
  head.add(facialGroup);
  rightHand.add(bowHat);
  rightHand.add(marchFlag);
  leftHand.add(wiggleLeftMaraca);
  rightHand.add(wiggleRightMaraca);

  const nodes: AccessoryNodes = {
    searchGlass,
    thinkBulb,
    flexMask,
    bowHat,
    marchFlag,
    wiggleLeftMaraca,
    wiggleRightMaraca,
    facialGroup,
    leftEyelid,
    rightEyelid,
    leftBrow,
    rightBrow,
  };

  sceneAccessoryCache.set(scene, nodes);
  return nodes;
}

export function syncCompanionAccessories(
  scene: Object3D,
  activeClipName: string | undefined | null,
  normalizedProgress = 0.5,
  elapsedSeconds = 0,
) {
  const nodes = ensureAccessories(scene);
  if (!nodes) return;

  nodes.searchGlass.visible = activeClipName === 'search';
  nodes.flexMask.visible = activeClipName === 'flex';
  nodes.bowHat.visible = activeClipName === 'bow';
  nodes.marchFlag.visible = activeClipName === 'march';
  nodes.wiggleLeftMaraca.visible = activeClipName === 'wiggle';
  nodes.wiggleRightMaraca.visible = activeClipName === 'wiggle';

  if (activeClipName === 'think') {
    let scale = 0;
    if (normalizedProgress >= 0.50 && normalizedProgress <= 0.92) {
      if (normalizedProgress < 0.62) {
        const u = (normalizedProgress - 0.50) / 0.12;
        scale = Math.sin(0.5 * Math.PI * u);
      } else if (normalizedProgress > 0.84) {
        const u = (0.92 - normalizedProgress) / 0.08;
        scale = Math.sin(0.5 * Math.PI * u);
      } else {
        scale = 1;
      }
    }
    nodes.thinkBulb.visible = scale > 0.01;
    const s = Math.max(0.01, scale);
    nodes.thinkBulb.scale.set(s, s, s);
  } else {
    nodes.thinkBulb.visible = false;
  }

  const hideEyelids =
    !activeClipName ||
    activeClipName === 'flex' ||
    (activeClipName === 'peekaboo' && normalizedProgress >= 0.22 && normalizedProgress <= 0.78);
  const blink = hideEyelids ? 0 : computeBlinkAmount(activeClipName, normalizedProgress, elapsedSeconds);
  const eyelidsVisible = !hideEyelids && blink > 0.02;
  const eyelidRotX = EYELID_OPEN_ROT_X + (EYELID_CLOSED_ROT_X - EYELID_OPEN_ROT_X) * blink;

  nodes.leftEyelid.visible = eyelidsVisible;
  nodes.rightEyelid.visible = eyelidsVisible;
  nodes.leftEyelid.rotation.set(eyelidRotX, EYELID_LEFT_YAW_RAD, 0);
  nodes.rightEyelid.rotation.set(eyelidRotX, EYELID_RIGHT_YAW_RAD, 0);

  const browPose = computeBrowPose(activeClipName);
  const browsVisible =
    Boolean(activeClipName) &&
    activeClipName !== 'flex' &&
    normalizedProgress > 0 &&
    (browPose.liftY !== 0 || browPose.leftTiltRad !== 0 || browPose.rightTiltRad !== 0);

  nodes.leftBrow.visible = browsVisible;
  nodes.rightBrow.visible = browsVisible;
  if (browsVisible) {
    nodes.leftBrow.position.set(17.3, 39.2 + browPose.liftY, 36.4);
    nodes.rightBrow.position.set(-17.3, 38.2 + browPose.liftY, 37.7);
    nodes.leftBrow.rotation.set(0, BROW_LEFT_YAW_RAD, BROW_BASE_ROT_Z - BROW_REST_SLOPE_RAD + browPose.leftTiltRad);
    nodes.rightBrow.rotation.set(0, BROW_RIGHT_YAW_RAD, BROW_BASE_ROT_Z + BROW_REST_SLOPE_RAD + browPose.rightTiltRad);
  }
}
