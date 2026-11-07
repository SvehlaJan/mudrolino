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

interface AccessoryNodes {
  searchGlass: Group;
  thinkBulb: Group;
  flexMask: Group;
  bowHat: Group;
  marchFlag: Group;
  wiggleLeftMaraca: Group;
  wiggleRightMaraca: Group;
}

const sceneAccessoryCache = new WeakMap<Object3D, AccessoryNodes>();

function orientGroupYAlong(group: Group, origin: [number, number, number], yAxis: [number, number, number]) {
  group.position.set(origin[0], origin[1], origin[2]);
  const dir = new Vector3(yAxis[0], yAxis[1], yAxis[2]).normalize();
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
  group.quaternion.copy(q);
}

function maskPoint(sideSign: number, theta: number, v: number): [number, number, number] {
  const cx = sideSign * (13.5 + 2.0 * v);
  const cy = 41.8 + 0.6 * v;
  const rx = 6.2 + v * 12.8;
  const ry = 4.6 + v * 4.4;
  const rawX = cx + rx * Math.cos(theta);
  const rawY = cy + ry * Math.sin(theta);
  const x = sideSign < 0 ? Math.min(0.0, rawX) : Math.max(0.0, rawX);
  const outerDist = Math.max(0.0, Math.abs(x) - 18.0) / 15.0;
  const wingLift = 2.8 * v * (outerDist ** 1.4) * (Math.sin(theta) > -0.2 ? 1.0 : 0.3);
  const bridgeArch = 3.2 * v * Math.exp(-(x * x) / 55.0) * (Math.sin(theta) < 0 ? 1.0 : 0.0);
  const y = Math.max(Math.abs(x) < 12.0 ? 36.8 : 33.5, rawY + wingLift + bridgeArch);
  const snoutBulge = 13.5 * Math.exp(-((Math.max(0.0, 42.5 - y) / 4.2) ** 2)) * Math.exp(-((x / 15.5) ** 2));
  const z = 43.8 + snoutBulge - 0.0080 * x * x - 0.012 * ((y - 42.0) ** 2);
  return [x, y, z];
}

function createMagnifyingGlass(): Group {
  const root = new Group();
  root.name = ACCESSORY_GROUP_NAME;
  const holder = new Group();
  orientGroupYAlong(holder, [0, 12.0, 2.0], [0.3764, 0.5170, 0.7688]);
  root.add(holder);

  const handleMat = new MeshStandardMaterial({ color: '#5c3a21', roughness: 0.55, metalness: 0.1 });
  const brassMat = new MeshStandardMaterial({ color: '#f59e0b', roughness: 0.3, metalness: 0.65 });
  const lensMat = new MeshStandardMaterial({
    color: '#7dd3fc',
    roughness: 0.15,
    metalness: 0.05,
    transparent: true,
    opacity: 0.45,
  });

  const handle = new Mesh(new CylinderGeometry(1.8, 2.1, 22, 16), handleMat);
  handle.position.set(0, 8.0, 0);
  holder.add(handle);

  const ferrule = new Mesh(new CylinderGeometry(2.4, 2.4, 3.6, 16), brassMat);
  ferrule.position.set(0, 20.0, 0);
  holder.add(ferrule);

  const headGroup = new Group();
  headGroup.position.set(0, 35.5, 0);
  headGroup.rotation.set(0.3678, -2.5779, -1.1420);
  holder.add(headGroup);

  const rim = new Mesh(new TorusGeometry(14.2, 2.1, 16, 36), brassMat);
  headGroup.add(rim);

  const lens = new Mesh(new CylinderGeometry(13.0, 13.0, 1.4, 32), lensMat);
  lens.rotation.x = Math.PI / 2;
  headGroup.add(lens);

  return root;
}

function createLightbulb(): Group {
  const root = new Group();
  root.name = ACCESSORY_GROUP_NAME;
  root.position.set(-22, 80.5, 16);
  root.rotation.z = 0.12;

  const glassMat = new MeshStandardMaterial({
    color: '#fde047',
    emissive: '#facc15',
    emissiveIntensity: 0.65,
    roughness: 0.2,
  });
  const baseMat = new MeshStandardMaterial({ color: '#94a3b8', roughness: 0.35, metalness: 0.7 });
  const tipMat = new MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 });

  const globe = new Mesh(new SphereGeometry(8.6, 24, 18), glassMat);
  globe.position.set(0, 5.4, 0);
  root.add(globe);

  const neck = new Mesh(new CylinderGeometry(6.8, 4.2, 5.2, 20), glassMat);
  neck.position.set(0, 0, 0);
  root.add(neck);

  const screw = new Mesh(new CylinderGeometry(4.2, 3.8, 4.4, 20), baseMat);
  screw.position.set(0, -3.8, 0);
  root.add(screw);

  const tip = new Mesh(new SphereGeometry(2.5, 16, 12), tipMat);
  tip.position.set(0, -6.2, 0);
  root.add(tip);

  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI * 0.38 + (i / 4) * Math.PI * 0.76;
    const ray = new Mesh(new CylinderGeometry(0.9, 0.9, 4.0, 10), glassMat);
    ray.position.set(Math.sin(angle) * 13.0, 5.4 + Math.cos(angle) * 13.0, 0);
    ray.rotation.z = -angle;
    root.add(ray);
  }

  return root;
}

function createSuperheroMask(): Group {
  const root = new Group();
  root.name = ACCESSORY_GROUP_NAME;

  const maskMat = new MeshStandardMaterial({
    color: '#e11d48',
    roughness: 0.38,
    metalness: 0.08,
    side: DoubleSide,
  });

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

  const maskMesh = new Mesh(geo, maskMat);
  root.add(maskMesh);

  return root;
}

function createTopHat(): Group {
  const root = new Group();
  root.name = ACCESSORY_GROUP_NAME;
  // Pinched by the outer brim edge at the fingertips of RightHand (Y=29.0 > 27.66)
  const holder = new Group();
  orientGroupYAlong(holder, [0, 29.0, 10.0], [0.45, 0.35, 0.82]);
  root.add(holder);

  const hatOffset = new Group();
  hatOffset.position.set(0, 2.0, 20.5);
  holder.add(hatOffset);

  const hatMat = new MeshStandardMaterial({ color: '#1e293b', roughness: 0.45, metalness: 0.1 });
  const bandMat = new MeshStandardMaterial({ color: '#e11d48', roughness: 0.35, metalness: 0.1 });

  const brim = new Mesh(new CylinderGeometry(19.5, 19.5, 2.0, 32), hatMat);
  hatOffset.add(brim);

  const band = new Mesh(new CylinderGeometry(13.5, 13.5, 3.8, 32), bandMat);
  band.position.set(0, 2.6, 0);
  hatOffset.add(band);

  const crown = new Mesh(new CylinderGeometry(14.5, 13.0, 19.5, 32), hatMat);
  crown.position.set(0, 10.8, 0);
  hatOffset.add(crown);

  return root;
}

function createPennantFlag(): Group {
  const root = new Group();
  root.name = ACCESSORY_GROUP_NAME;
  const holder = new Group();
  orientGroupYAlong(holder, [0, 12.0, 2.0], [-0.1142, 0.7111, 0.6938]);
  root.add(holder);

  const woodMat = new MeshStandardMaterial({ color: '#92400e', roughness: 0.55 });
  const goldMat = new MeshStandardMaterial({ color: '#facc15', roughness: 0.3, metalness: 0.5 });
  const flagMat = new MeshStandardMaterial({
    color: '#ef4444',
    roughness: 0.4,
    side: DoubleSide,
  });

  const pole = new Mesh(new CylinderGeometry(1.5, 1.5, 52, 14), woodMat);
  pole.position.set(0, 22.0, 0);
  holder.add(pole);

  const finial = new Mesh(new SphereGeometry(2.8, 16, 12), goldMat);
  finial.position.set(0, 49.0, 0);
  holder.add(finial);

  const flagGeo = new BufferGeometry();
  const verts = new Float32Array([
    0, 46.5, 0.5,
    0, 26.5, 0.5,
    30, 36.5, 0.5,
    0, 46.5, -0.5,
    30, 36.5, -0.5,
    0, 26.5, -0.5,
  ]);
  flagGeo.setAttribute('position', new BufferAttribute(verts, 3));
  flagGeo.setIndex([0, 1, 2, 3, 4, 5]);
  flagGeo.computeVertexNormals();
  const flag = new Mesh(flagGeo, flagMat);
  holder.add(flag);

  return root;
}

function createMaraca(side: 'left' | 'right'): Group {
  const root = new Group();
  root.name = ACCESSORY_GROUP_NAME;
  const origin: [number, number, number] = [0.0, 12.0, 2.0];
  const dir: [number, number, number] = side === 'left' ? [0.2282, 0.9729, 0.0365] : [0.4959, 0.6230, 0.6049];
  const holder = new Group();
  orientGroupYAlong(holder, origin, dir);
  root.add(holder);

  const woodMat = new MeshStandardMaterial({ color: '#b45309', roughness: 0.5 });
  const gourdMat = new MeshStandardMaterial({ color: '#f97316', roughness: 0.35 });
  const stripeMat = new MeshStandardMaterial({ color: '#facc15', roughness: 0.35 });
  const tealMat = new MeshStandardMaterial({ color: '#14b8a6', roughness: 0.35 });

  const handle = new Mesh(new CylinderGeometry(1.6, 2.0, 22, 14), woodMat);
  handle.position.set(0, 10.0, 0);
  holder.add(handle);

  const gourd = new Mesh(new SphereGeometry(8.5, 22, 16), gourdMat);
  gourd.scale.set(1, 1.22, 1);
  gourd.position.set(0, 27.5, 0);
  holder.add(gourd);

  const band1 = new Mesh(new CylinderGeometry(8.7, 8.7, 2.0, 22), stripeMat);
  band1.position.set(0, 27.5, 0);
  holder.add(band1);

  const band2 = new Mesh(new CylinderGeometry(7.6, 7.6, 1.6, 22), tealMat);
  band2.position.set(0, 31.2, 0);
  holder.add(band2);

  return root;
}

function ensureAccessories(scene: Object3D): AccessoryNodes | null {
  const cached = sceneAccessoryCache.get(scene);
  if (cached) return cached;

  const head = scene.getObjectByName('Head');
  const rightHand = scene.getObjectByName('RightHand');
  const leftHand = scene.getObjectByName('LeftHand');
  if (!head || !rightHand || !leftHand) return null;

  const nodes: AccessoryNodes = {
    searchGlass: createMagnifyingGlass(),
    thinkBulb: createLightbulb(),
    flexMask: createSuperheroMask(),
    bowHat: createTopHat(),
    marchFlag: createPennantFlag(),
    wiggleLeftMaraca: createMaraca('left'),
    wiggleRightMaraca: createMaraca('right'),
  };

  for (const group of Object.values(nodes)) {
    group.visible = false;
    group.traverse((obj: Object3D) => {
      if ('isMesh' in obj) obj.frustumCulled = false;
    });
  }

  rightHand.add(nodes.searchGlass);
  head.add(nodes.thinkBulb);
  head.add(nodes.flexMask);
  rightHand.add(nodes.bowHat);
  rightHand.add(nodes.marchFlag);
  leftHand.add(nodes.wiggleLeftMaraca);
  rightHand.add(nodes.wiggleRightMaraca);

  sceneAccessoryCache.set(scene, nodes);
  return nodes;
}

export function syncCompanionAccessories(
  scene: Object3D,
  activeClipName: string | undefined | null,
  normalizedProgress = 0.5,
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
}
