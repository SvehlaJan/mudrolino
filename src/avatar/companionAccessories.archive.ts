import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { AnimationMixer, Box3, BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Raycaster, SkinnedMesh, Texture, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { syncCompanionAccessories } from './companionAccessories';

const ACCESSORY_GROUP_NAME = '__bear_companion_accessory__';
const LOCAL_BEAR_GLB = path.resolve(process.cwd(), 'assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v9/web-v1/model.glb');
beforeAll(() => {
  if (!fs.existsSync(LOCAL_BEAR_GLB)) throw new Error(`Local avatar archive model unavailable: ${LOCAL_BEAR_GLB}. Restore this MacBook's archive and run npm run archive:link before archive tests.`);
});

function createRigScene({ includeBearMesh }: { includeBearMesh: boolean }): Group {
  const root = new Group();
  root.name = includeBearMesh ? 'BearRigScene' : 'HumanRigScene';

  if (includeBearMesh) {
    const bearMesh = new Object3D();
    bearMesh.name = 'Bear_fixed_outfit';
    root.add(bearMesh);
  } else {
    const humanMesh = new Object3D();
    humanMesh.name = 'Body_female';
    root.add(humanMesh);
  }

  for (const boneName of ['Head', 'LeftHand', 'RightHand']) {
    const bone = new Group();
    bone.name = boneName;
    root.add(bone);
  }

  return root;
}

function collectMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((obj) => {
    if (obj instanceof Mesh) {
      meshes.push(obj);
    }
  });
  return meshes;
}

function findAccessoryGroup(parent: Object3D, accessoryId: string): Group {
  const found = parent.children.find(
    (child): child is Group =>
      child instanceof Group &&
      child.name === ACCESSORY_GROUP_NAME &&
      child.userData?.accessoryId === accessoryId,
  );
  if (!found) {
    throw new Error(`Expected accessory group "${accessoryId}" under ${parent.name}`);
  }
  return found;
}

describe('Bear_fixed_outfit Head-local raycast clearance & camera NDC', () => {
    it('maintains 0 surface penetrations, tucked open eyelids, >= 98% closed pupil coverage, <= 2.5 cm brow float, and thinkBulb NDC_Y <= 0.90', async () => {
      const buf = fs.readFileSync(LOCAL_BEAR_GLB);
      const loader = new GLTFLoader();
      loader.register((parser) => ({
        name: 'NO_TEX_TEST',
        beforeRoot() {
          parser.loadImageSource = () => Promise.resolve(new Texture());
          return null;
        },
        loadTexture: () => Promise.resolve(new Texture()),
      }));
      const gltf = await loader.parseAsync(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        '',
      );
      const scene = gltf.scene;
      scene.updateMatrixWorld(true);
      const bearMesh = scene.getObjectByName('Bear_fixed_outfit') as SkinnedMesh;
      const headIdx = bearMesh.skeleton.bones.findIndex((b) => b.name === 'Head');

      const srcGeo = bearMesh.geometry;
      const headGeo = new BufferGeometry();
      const srcPos = srcGeo.attributes.position;
      const outPos = new Float32Array(srcPos.count * 3);
      const p = new Vector3();
      const toHead = bearMesh.skeleton.boneInverses[headIdx].clone().multiply(bearMesh.bindMatrix);
      for (let i = 0; i < srcPos.count; i++) {
        p.fromBufferAttribute(srcPos, i).applyMatrix4(toHead);
        outPos[i * 3] = p.x;
        outPos[i * 3 + 1] = p.y;
        outPos[i * 3 + 2] = p.z;
      }
      headGeo.setAttribute('position', new BufferAttribute(outPos, 3));
      if (srcGeo.index) {
        const srcIdx = srcGeo.index.array;
        const filteredIdx: number[] = [];
        for (let i = 0; i < srcIdx.length; i += 3) {
          const i0 = srcIdx[i] * 3;
          const i1 = srcIdx[i + 1] * 3;
          const i2 = srcIdx[i + 2] * 3;
          const maxTriY = Math.max(outPos[i0 + 1], outPos[i1 + 1], outPos[i2 + 1]);
          const maxTriZ = Math.max(outPos[i0 + 2], outPos[i1 + 2], outPos[i2 + 2]);
          if (maxTriY >= 24 && maxTriZ >= 10) {
            filteredIdx.push(srcIdx[i], srcIdx[i + 1], srcIdx[i + 2]);
          }
        }
        headGeo.setIndex(filteredIdx);
      }
      const headSurface = new Mesh(headGeo, new MeshBasicMaterial({ side: DoubleSide }));
      headSurface.updateMatrixWorld(true);

      const raycaster = new Raycaster();
      const rayZ = (x: number, y: number): number => {
        raycaster.set(new Vector3(x, y, 100), new Vector3(0, 0, -1));
        const hits = raycaster.intersectObject(headSurface, false);
        return hits.length ? hits[0].point.z : -Infinity;
      };
      const rayY = (x: number, z: number): number => {
        raycaster.set(new Vector3(x, 120, z), new Vector3(0, -1, 0));
        const hits = raycaster.intersectObject(headSurface, false);
        return hits.length ? hits[0].point.y : -Infinity;
      };

      const mockBear = createRigScene({ includeBearMesh: true });
      const mockHead = mockBear.getObjectByName('Head')!;

      // 1. flexMask: 0 vertices behind Bear_fixed_outfit
      syncCompanionAccessories(mockBear, 'flex', 0.5, 0.5);
      mockBear.updateMatrixWorld(true);
      const flexMask = findAccessoryGroup(mockHead, 'flexMask');
      const maskPos = collectMeshes(flexMask)[0].geometry.getAttribute('position');
      let maskPenetrations = 0;
      for (let i = 0; i < maskPos.count; i++) {
        if (maskPos.getZ(i) < rayZ(maskPos.getX(i), maskPos.getY(i))) {
          maskPenetrations += 1;
        }
      }
      expect(maskPenetrations).toBe(0);

      // 2. leftEyelid & rightEyelid: 0 protruding vertices at blink=0 (tucked inside skull)
      //    and >= 98% coverage of [14..21] x [32.5..40.8] eye socket at blink=1 with max distance <= 2.8 cm
      syncCompanionAccessories(mockBear, 'idle_breathe', 0.3, 0);
      mockBear.updateMatrixWorld(true);
      let openLidProtrusions = 0;
      for (const lidName of ['leftEyelid', 'rightEyelid']) {
        const lid = mockHead.getObjectByName(lidName) as Mesh;
        const lPos = lid.geometry.getAttribute('position');
        for (let i = 0; i < lPos.count; i++) {
          p.fromBufferAttribute(lPos, i).applyMatrix4(lid.matrixWorld);
          if (p.z > rayZ(p.x, p.y)) {
            openLidProtrusions += 1;
          }
        }
      }
      expect(openLidProtrusions).toBe(0);

      syncCompanionAccessories(mockBear, 'idle_breathe', 0.3, 1.755);
      mockBear.updateMatrixWorld(true);
      for (const [lidName, sgn] of [
        ['leftEyelid', 1],
        ['rightEyelid', -1],
      ] as const) {
        const lid = mockHead.getObjectByName(lidName) as Mesh;
        const lidProbe = new Mesh(lid.geometry, new MeshBasicMaterial({ side: DoubleSide }));
        lidProbe.matrixWorld.copy(lid.matrixWorld);
        lidProbe.matrixAutoUpdate = false;

        let minClosedFrontY = Infinity;
        const lPos = lid.geometry.getAttribute('position');
        for (let i = 0; i < lPos.count; i++) {
          p.fromBufferAttribute(lPos, i).applyMatrix4(lid.matrixWorld);
          if (p.z > rayZ(p.x, p.y) && p.y < minClosedFrontY) {
            minClosedFrontY = p.y;
          }
        }
        expect(minClosedFrontY).toBeLessThanOrEqual(32.3);

        let socketSamples = 0;
        let coveredSamples = 0;
        let maxEyeProud = -Infinity;
        for (let ax = 14.0; ax <= 21.001; ax += 0.5) {
          for (let y = 32.5; y <= 40.801; y += 0.5) {
            if (((ax - 17.3) / 3.55) ** 2 + ((y - 36.65) / 4.15) ** 2 > 1.0) continue;
            const x = sgn * ax;
            const hz = rayZ(x, y);
            if (hz < 34.5 || hz > 38.5) continue;
            socketSamples += 1;
            raycaster.set(new Vector3(x, y, 100), new Vector3(0, 0, -1));
            const lidHits = raycaster.intersectObject(lidProbe, false);
            const proud = lidHits.length ? lidHits[0].point.z - hz : -Infinity;
            if (proud > 0.05) {
              coveredSamples += 1;
              if (proud > maxEyeProud) maxEyeProud = proud;
            }
          }
        }
        expect(coveredSamples / socketSamples).toBeGreaterThanOrEqual(0.98);
        expect(maxEyeProud).toBeLessThanOrEqual(2.8);
      }

      // 3. leftBrow & rightBrow: 0 penetrations AND <= 2.5 cm max float across expressive clips
      let browPenetrations = 0;
      let maxBrowFloat = -Infinity;
      for (const clipName of ['celebrate', 'encourage', 'think']) {
        syncCompanionAccessories(mockBear, clipName, 0.5, 0.5);
        mockBear.updateMatrixWorld(true);
        for (const browName of ['leftBrow', 'rightBrow']) {
          const brow = mockHead.getObjectByName(browName) as Mesh;
          const bPos = brow.geometry.getAttribute('position');
          for (let i = 0; i < bPos.count; i++) {
            p.fromBufferAttribute(bPos, i).applyMatrix4(brow.matrixWorld);
            const clr = p.z - rayZ(p.x, p.y);
            if (clr <= 0) {
              browPenetrations += 1;
            }
            if (clr > maxBrowFloat) {
              maxBrowFloat = clr;
            }
          }
        }
      }
      expect(browPenetrations).toBe(0);
      expect(maxBrowFloat).toBeLessThanOrEqual(2.5);

      // 3. thinkBulb: 0 base/tip vertices buried in crown fur AND max NDC_Y <= 0.90 across think [0.50, 0.92]
      syncCompanionAccessories(mockBear, 'think', 0.72, 1.0);
      mockBear.updateMatrixWorld(true);
      const mockBulb = findAccessoryGroup(mockHead, 'thinkBulb');
      let bulbBasePenetrations = 0;
      for (const m of collectMeshes(mockBulb)) {
        const gp = m.geometry.getAttribute('position');
        for (let i = 0; i < gp.count; i++) {
          p.fromBufferAttribute(gp, i).applyMatrix4(m.matrixWorld);
          if (p.y < rayY(p.x, p.z)) {
            bulbBasePenetrations += 1;
          }
        }
      }
      expect(bulbBasePenetrations).toBe(0);

      const bounds = new Box3().setFromObject(scene);
      const size = new Vector3();
      const center = new Vector3();
      bounds.getSize(size);
      bounds.getCenter(center);
      const scale = 2.7 / size.y;
      const root = new Group();
      root.scale.setScalar(scale);
      root.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      root.add(scene);

      const cam = new PerspectiveCamera(34, 0.875, 0.1, 100);
      cam.position.set(0, 1.35, 5.6);
      cam.lookAt(0, 1.25, 0);
      cam.updateMatrixWorld(true);
      cam.updateProjectionMatrix();

      const thinkClip = gltf.animations.find((a) => a.name === 'think')!;
      const mixer = new AnimationMixer(scene);
      mixer.clipAction(thinkClip).play();
      const realHead = scene.getObjectByName('Head')!;
      let maxBulbNdcY = -Infinity;

      for (let s = 30; s <= 55; s++) {
        const norm = s / 60;
        const t = norm * thinkClip.duration;
        mixer.setTime(t);
        syncCompanionAccessories(scene, 'think', norm, t);
        root.updateMatrixWorld(true);
        const realBulb = findAccessoryGroup(realHead, 'thinkBulb');
        if (!realBulb.visible) continue;
        for (const m of collectMeshes(realBulb)) {
          const gp = m.geometry.getAttribute('position');
          for (let i = 0; i < gp.count; i++) {
            p.fromBufferAttribute(gp, i).applyMatrix4(m.matrixWorld).project(cam);
            if (p.y > maxBulbNdcY) maxBulbNdcY = p.y;
          }
        }
      }

      expect(maxBulbNdcY).toBeLessThanOrEqual(0.90);
    }, 15_000);
  });
