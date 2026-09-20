import * as THREE from "three";
import { CLEARING_RADIUS } from "./environment.js";

const FOREST_OUTER_RADIUS = 55;
const TREE_COUNT = 260;

// Simple seeded PRNG so the forest layout is stable across runs.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Scatters low-poly pine-like trees in the ring between the sand clearing
 * and the forest's outer radius, using instanced meshes for trunks and
 * foliage so a few hundred trees stay cheap on Quest's mobile GPU.
 *
 * Returns each tree's local (pre-world-scale) base position, so callers can
 * register chop interactables without needing individually addressable
 * tree objects (which InstancedMesh doesn't provide).
 */
export function buildForest(scene) {
  const rand = mulberry32(1337);

  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 2.2, 6);
  trunkGeo.translate(0, 1.1, 0);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x2b1d13,
    roughness: 1,
  });

  const foliageGeo = new THREE.ConeGeometry(1.4, 3.6, 7);
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x0e2418,
    roughness: 0.9,
  });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, TREE_COUNT);
  const foliage = new THREE.InstancedMesh(foliageGeo, foliageMat, TREE_COUNT);
  trunks.castShadow = true;
  foliage.castShadow = true;

  const dummy = new THREE.Object3D();
  const treePositions = [];

  for (let i = 0; i < TREE_COUNT; i++) {
    const angle = rand() * Math.PI * 2;
    const radius =
      CLEARING_RADIUS + 1.5 + rand() * (FOREST_OUTER_RADIUS - CLEARING_RADIUS);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const scale = 0.75 + rand() * 0.9;
    const rotY = rand() * Math.PI * 2;

    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, 2.6 * scale, z);
    dummy.updateMatrix();
    foliage.setMatrixAt(i, dummy.matrix);

    treePositions.push({ x, z });
  }

  trunks.instanceMatrix.needsUpdate = true;
  foliage.instanceMatrix.needsUpdate = true;

  scene.add(trunks, foliage);

  return treePositions;
}
