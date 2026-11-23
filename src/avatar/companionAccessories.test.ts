import { describe, expect, it } from 'vitest';
import {
  Box3,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';
import {
  computeBlinkAmount,
  computeBrowPose,
  syncCompanionAccessories,
} from './companionAccessories';

const ACCESSORY_GROUP_NAME = '__bear_companion_accessory__';

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

describe('companionAccessories', () => {
  describe('non-bear rig safety', () => {
    it('attaches zero bear accessory groups when Bear_fixed_outfit is absent', () => {
      const humanScene = createRigScene({ includeBearMesh: false });

      syncCompanionAccessories(humanScene, 'idle', 0.5, 1.0);
      syncCompanionAccessories(humanScene, 'celebrate', 0.5, 1.75);
      syncCompanionAccessories(humanScene, 'flex', 0.5, 1.0);

      let accessoryCount = 0;
      humanScene.traverse((obj) => {
        if (obj.name === ACCESSORY_GROUP_NAME) {
          accessoryCount += 1;
        }
      });

      expect(accessoryCount).toBe(0);
      expect(humanScene.getObjectByName('Head')?.children).toHaveLength(0);
      expect(humanScene.getObjectByName('LeftHand')?.children).toHaveLength(0);
      expect(humanScene.getObjectByName('RightHand')?.children).toHaveLength(0);
      expect(humanScene.getObjectByName('leftEyelid')).toBeUndefined();
      expect(humanScene.getObjectByName('leftBrow')).toBeUndefined();
    });
  });

  describe('singleton GPU resource sharing', () => {
    it('shares exact BufferGeometry and MeshStandardMaterial references across distinct bear scenes', () => {
      const sceneA = createRigScene({ includeBearMesh: true });
      const sceneB = createRigScene({ includeBearMesh: true });

      syncCompanionAccessories(sceneA, 'celebrate', 0.5, 0);
      syncCompanionAccessories(sceneB, 'celebrate', 0.5, 0);

      const meshesA = collectMeshes(sceneA);
      const meshesB = collectMeshes(sceneB);

      expect(meshesA.length).toBeGreaterThanOrEqual(20);
      expect(meshesB).toHaveLength(meshesA.length);

      for (let i = 0; i < meshesA.length; i++) {
        expect(meshesA[i].geometry).toBeInstanceOf(BufferGeometry);
        expect(meshesA[i].material).toBeInstanceOf(MeshStandardMaterial);
        expect(meshesA[i].geometry).toBe(meshesB[i].geometry);
        expect(meshesA[i].material).toBe(meshesB[i].material);
      }
    });
  });

  describe('prop frustum-safe bounds & clip visibility', () => {
    it('lowers flexMask over the pupils (mean Y < 40.5), hugs the glabella while bulging forward over the snout, and shows only during flex', () => {
      const scene = createRigScene({ includeBearMesh: true });
      syncCompanionAccessories(scene, 'flex', 0.5, 0.5);

      const head = scene.getObjectByName('Head')!;
      const flexMask = findAccessoryGroup(head, 'flexMask');
      expect(flexMask.visible).toBe(true);

      const maskMeshes = collectMeshes(flexMask);
      expect(maskMeshes).toHaveLength(1);
      const pos = maskMeshes[0].geometry.getAttribute('position');
      let sumY = 0;
      let minY = Infinity;
      let maxY = -Infinity;
      let maxGlabellaZ = -Infinity;
      let minLowerBridgeZ = Infinity;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        sumY += y;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (Math.abs(x) < 4 && y >= 38.5 && z > maxGlabellaZ) maxGlabellaZ = z;
        if (Math.abs(x) < 4 && y <= 36.2 && z < minLowerBridgeZ) minLowerBridgeZ = z;
      }
      const meanY = sumY / pos.count;
      const centerY = (minY + maxY) * 0.5;

      expect(meanY).toBeLessThan(40.5);
      expect(centerY).toBeLessThan(40.5);
      expect(meanY).toBeGreaterThan(34.0);
      // Glabella hugs Z ≈ 43.5 (< 45.5, no 15 cm float) while lower nose bridge bulges forward (> 48.5)
      expect(maxGlabellaZ).toBeLessThan(45.5);
      expect(minLowerBridgeZ).toBeGreaterThan(48.5);

      syncCompanionAccessories(scene, 'celebrate', 0.5, 0.5);
      expect(flexMask.visible).toBe(false);
    });

    it('positions thinkBulb clear of crown fur at [-22, 68.2, 29.5] and toggles visibility within [0.50, 0.92] on think', () => {
      const scene = createRigScene({ includeBearMesh: true });
      syncCompanionAccessories(scene, 'think', 0.72, 1.0);

      const head = scene.getObjectByName('Head')!;
      const thinkBulb = findAccessoryGroup(head, 'thinkBulb');

      expect(thinkBulb.position.toArray()).toEqual([-22, 68.2, 29.5]);
      expect(thinkBulb.visible).toBe(true);
      expect(thinkBulb.scale.x).toBeCloseTo(1, 5);

      syncCompanionAccessories(scene, 'think', 0.55, 0.9);
      expect(thinkBulb.visible).toBe(true);
      expect(thinkBulb.scale.x).toBeGreaterThan(0.01);

      syncCompanionAccessories(scene, 'think', 0.3, 0.5);
      expect(thinkBulb.visible).toBe(false);

      syncCompanionAccessories(scene, 'think', 0.95, 1.5);
      expect(thinkBulb.visible).toBe(false);

      syncCompanionAccessories(scene, 'search', 0.72, 1.0);
      expect(thinkBulb.visible).toBe(false);
    });

    it('shortens marchFlag pole (<= 46) with inward holder tilt (x >= 0) and shows only during march', () => {
      const scene = createRigScene({ includeBearMesh: true });
      syncCompanionAccessories(scene, 'march', 0.5, 1.0);

      const rightHand = scene.getObjectByName('RightHand')!;
      const marchFlag = findAccessoryGroup(rightHand, 'marchFlag');
      expect(marchFlag.visible).toBe(true);

      const holder = marchFlag.children[0] as Group;
      const holderYAxis = new Vector3(0, 1, 0).applyQuaternion(holder.quaternion);
      expect(holderYAxis.x).toBeGreaterThanOrEqual(0);

      const meshes = collectMeshes(marchFlag);
      const poleMesh = meshes.find((m) => m.geometry instanceof CylinderGeometry)!;
      const poleGeo = poleMesh.geometry as CylinderGeometry;
      expect(poleGeo.parameters.height).toBeLessThanOrEqual(46);

      syncCompanionAccessories(scene, 'wiggle', 0.5, 1.0);
      expect(marchFlag.visible).toBe(false);
    });

    it('pulls bowHat crown reach inward (<= 31 along holder Y) and shows only during bow', () => {
      const scene = createRigScene({ includeBearMesh: true });
      syncCompanionAccessories(scene, 'bow', 0.5, 1.0);

      const rightHand = scene.getObjectByName('RightHand')!;
      const bowHat = findAccessoryGroup(rightHand, 'bowHat');
      expect(bowHat.visible).toBe(true);

      const holder = bowHat.children[0] as Group;
      holder.updateMatrixWorld(true);
      const holderInv = holder.matrixWorld.clone().invert();
      const boxInHolder = new Box3();
      const v = new Vector3();

      for (const mesh of collectMeshes(holder)) {
        const pos = mesh.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(holderInv);
          boxInHolder.expandByPoint(v);
        }
      }

      expect(boxInHolder.max.y).toBeLessThanOrEqual(31);

      syncCompanionAccessories(scene, 'celebrate', 0.5, 1.0);
      expect(bowHat.visible).toBe(false);
    });
  });

  describe('3D blinking & brow expressions', () => {
    it('attaches eye-socket-calibrated eyelids and forehead-calibrated brows under Head and keeps frame 0 neutral', () => {
      const scene = createRigScene({ includeBearMesh: true });
      // Verifies 3-argument backward compatibility (default elapsedSeconds = 0)
      syncCompanionAccessories(scene, 'idle', 0);

      const head = scene.getObjectByName('Head')!;
      const leftEyelid = head.getObjectByName('leftEyelid') as Mesh;
      const rightEyelid = head.getObjectByName('rightEyelid') as Mesh;
      const leftBrow = head.getObjectByName('leftBrow') as Mesh;
      const rightBrow = head.getObjectByName('rightBrow') as Mesh;

      expect(leftEyelid).toBeDefined();
      expect(rightEyelid).toBeDefined();
      expect(leftBrow).toBeDefined();
      expect(rightBrow).toBeDefined();

      // Eyelid sphere center sits at temple X=±17.3 behind the eye socket with outward temple Y-yaw
      expect(leftEyelid.position.x).toBeCloseTo(17.3, 2);
      expect(rightEyelid.position.x).toBeCloseTo(-17.3, 2);
      expect(leftEyelid.position.z).toBeGreaterThanOrEqual(32.5);
      expect(leftEyelid.position.z).toBeLessThanOrEqual(34.5);
      expect(leftEyelid.rotation.order).toBe('YXZ');
      expect(leftEyelid.rotation.y).toBeGreaterThanOrEqual(0.24);
      expect(rightEyelid.rotation.y).toBeLessThanOrEqual(-0.24);

      // Brow center sits at tuned clean-forehead coordinates so torus arch crest sits cleanly above eyes
      expect(leftBrow.position.x).toBeCloseTo(17.3, 2);
      expect(rightBrow.position.x).toBeCloseTo(-17.3, 2);
      expect(leftBrow.position.y).toBeGreaterThanOrEqual(40.0);
      expect(leftBrow.position.y).toBeLessThanOrEqual(42.0);
      expect(leftBrow.position.z).toBeGreaterThanOrEqual(35.8);
      expect(leftBrow.position.z).toBeLessThanOrEqual(38.0);

      expect(leftEyelid.visible).toBe(false);
      expect(rightEyelid.visible).toBe(false);
      expect(leftBrow.visible).toBe(false);
      expect(rightBrow.visible).toBe(false);

      // Frame-0 parity: normalizedProgress === 0 keeps brows neutral/hidden even on expressive clips
      syncCompanionAccessories(scene, 'celebrate', 0, 0);
      expect(leftBrow.visible).toBe(false);
      expect(rightBrow.visible).toBe(false);
    });

    it('computes periodic ~3.4s blinks and expressive mid-gesture blinks, sweeping rim down over pupils while hidden on flex/peekaboo', () => {
      expect(computeBlinkAmount('idle_breathe', 0, 0)).toBe(0);
      expect(computeBlinkAmount('celebrate', 0.5, 0)).toBe(0);
      expect(computeBlinkAmount(null, 0.5, 1.75)).toBe(0);

      // Periodic ~3.4s 150ms blink window (1.68..1.83s, 5.08..5.23s)
      expect(computeBlinkAmount('idle_breathe', 0.3, 1.75)).toBeGreaterThanOrEqual(0.9);
      expect(computeBlinkAmount('idle_breathe', 0.3, 5.15)).toBeGreaterThanOrEqual(0.9);
      expect(computeBlinkAmount('idle_breathe', 0.3, 1.0)).toBe(0);

      // Mid-gesture expressive blink on wave / encourage
      expect(computeBlinkAmount('wave', 0.51, 0.9)).toBeGreaterThanOrEqual(0.9);
      expect(computeBlinkAmount('encourage', 0.51, 0.9)).toBeGreaterThanOrEqual(0.9);

      // Suppressed during flex (mask covers eyes) and peekaboo paw-over-eyes [0.22, 0.78]
      expect(computeBlinkAmount('flex', 0.51, 1.75)).toBe(0);
      expect(computeBlinkAmount('peekaboo', 0.5, 1.75)).toBe(0);
      expect(computeBlinkAmount('peekaboo', 0.1, 1.75)).toBeGreaterThanOrEqual(0.9);

      const scene = createRigScene({ includeBearMesh: true });
      const head = scene.getObjectByName('Head')!;

      // Peak blink at 1.755s (blink === 1.0): rim sweeps down to y <= 32.3 covering the whole temple pupil
      syncCompanionAccessories(scene, 'idle_breathe', 0.3, 1.755);
      const leftEyelid = head.getObjectByName('leftEyelid') as Mesh;
      const rightEyelid = head.getObjectByName('rightEyelid') as Mesh;
      expect(leftEyelid.visible).toBe(true);
      expect(rightEyelid.visible).toBe(true);
      expect(leftEyelid.rotation.x).toBeGreaterThanOrEqual(0.85);

      leftEyelid.updateMatrixWorld(true);
      const pos = leftEyelid.geometry.getAttribute('position');
      const v = new Vector3();
      let frontRimMinY = Infinity;
      let frontMaxZ = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(leftEyelid.matrixWorld);
        if (v.z > 35.5 && v.y < frontRimMinY) frontRimMinY = v.y;
        if (v.z > frontMaxZ) frontMaxZ = v.z;
      }
      expect(frontRimMinY).toBeLessThanOrEqual(32.3);
      expect(frontMaxZ).toBeGreaterThanOrEqual(37.2);
      expect(frontMaxZ).toBeLessThanOrEqual(38.8);

      syncCompanionAccessories(scene, 'flex', 0.5, 1.75);
      expect(leftEyelid.visible).toBe(false);
      expect(rightEyelid.visible).toBe(false);

      syncCompanionAccessories(scene, 'peekaboo', 0.5, 1.75);
      expect(leftEyelid.visible).toBe(false);
      expect(rightEyelid.visible).toBe(false);
    });

    it('computes cheerful, sympathetic, curious, and neutral brow poses and syncs brow visibility', () => {
      const neutralNull = computeBrowPose(null);
      const neutralIdle = computeBrowPose('idle');
      expect(neutralNull).toEqual({ liftY: 0, leftTiltRad: 0, rightTiltRad: 0 });
      expect(neutralIdle).toEqual({ liftY: 0, leftTiltRad: 0, rightTiltRad: 0 });

      const cheerful = computeBrowPose('celebrate');
      expect(cheerful.liftY).toBeGreaterThan(0);

      const sympatheticEncourage = computeBrowPose('encourage');
      const sympatheticShrug = computeBrowPose('shrug');
      expect(sympatheticEncourage.leftTiltRad).toBeLessThan(0);
      expect(sympatheticEncourage.rightTiltRad).toBeGreaterThan(0);
      expect(sympatheticShrug.leftTiltRad).toBeLessThan(0);
      expect(sympatheticShrug.rightTiltRad).toBeGreaterThan(0);

      for (const clip of ['think', 'search', 'listen'] as const) {
        const curious = computeBrowPose(clip);
        expect(curious.liftY).toBeGreaterThan(0);
        expect(Math.abs(curious.leftTiltRad)).not.toBeCloseTo(Math.abs(curious.rightTiltRad), 3);
      }

      const scene = createRigScene({ includeBearMesh: true });
      const head = scene.getObjectByName('Head')!;

      for (const expressiveClip of [
        'celebrate',
        'clap',
        'jump',
        'finale',
        'wave',
        'encourage',
        'gentle_try_again',
        'shrug',
        'think',
        'search',
        'listen',
        'point_down',
        'talk_explain',
        'count_one_two_three',
        'sleepy_yawn',
        'walk',
        'peekaboo',
        'wiggle',
        'bow',
        'march',
        'stretch',
      ]) {
        syncCompanionAccessories(scene, expressiveClip, 0.5, 0.5);
        expect(head.getObjectByName('leftBrow')!.visible).toBe(true);
        expect(head.getObjectByName('rightBrow')!.visible).toBe(true);
      }

      // v8 alwaysShowBrows keeps clean single brows visible during living idle and frame 0
      const livingIdle = computeBrowPose('idle_breathe', { alwaysShowBrows: true });
      expect(livingIdle.liftY).toBeGreaterThan(0);
      syncCompanionAccessories(scene, 'idle_breathe', 0, 0, { alwaysShowBrows: true });
      expect(head.getObjectByName('leftBrow')!.visible).toBe(true);
      expect(head.getObjectByName('rightBrow')!.visible).toBe(true);

      // sleepy_yawn triggers drowsy eyelids smoothly around midpoint
      expect(computeBlinkAmount('sleepy_yawn', 0.49, 0)).toBeGreaterThan(0.65);

      syncCompanionAccessories(scene, 'flex', 0.5, 0.5);
      expect(head.getObjectByName('leftBrow')!.visible).toBe(false);
      expect(head.getObjectByName('rightBrow')!.visible).toBe(false);

      syncCompanionAccessories(scene, null, 0.5, 0);
      expect(head.getObjectByName('leftBrow')!.visible).toBe(false);
      expect(head.getObjectByName('rightBrow')!.visible).toBe(false);
    });
  });

});
