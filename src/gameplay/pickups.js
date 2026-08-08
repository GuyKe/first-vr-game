import * as THREE from "three";

const STICK_COUNT = 6;
const ROCK_COUNT = 6;
const SCATTER_MIN_RADIUS = 2.5;
const SCATTER_MAX_RADIUS = 7.5;
const PICKUP_RADIUS = 1.3;

// Simple seeded PRNG so pickup placement is stable across runs.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeStickMesh() {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.04, 0.9, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a2f1a, roughness: 1 }),
  );
  mesh.rotation.z = Math.PI / 2.2;
  mesh.castShadow = true;
  return mesh;
}

function makeRockMesh(rand) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.16 + rand() * 0.08, 0),
    new THREE.MeshStandardMaterial({
      color: 0x6b6b6b,
      roughness: 0.95,
      flatShading: true,
    }),
  );
  mesh.castShadow = true;
  return mesh;
}

/**
 * Scatters pickable sticks and rocks around the clearing and registers each
 * with the InteractionManager. Picking one up removes its mesh and adds it
 * to the shared inventory counts.
 */
export function buildPickups(worldGroup, interactions, inventory) {
  const rand = mulberry32(4242);
  const group = new THREE.Group();
  worldGroup.add(group);

  function scatterOne(kind, makeMesh) {
    const angle = rand() * Math.PI * 2;
    const radius =
      SCATTER_MIN_RADIUS + rand() * (SCATTER_MAX_RADIUS - SCATTER_MIN_RADIUS);
    const mesh = makeMesh();
    mesh.position.set(
      Math.cos(angle) * radius,
      kind === "stick" ? 0.05 : 0.12,
      Math.sin(angle) * radius,
    );
    group.add(mesh);
    group.updateMatrixWorld(true);

    const worldPosition = mesh.getWorldPosition(new THREE.Vector3());
    const inventoryKey = kind === "stick" ? "sticks" : "rocks";

    const item = interactions.register({
      position: worldPosition,
      radius: PICKUP_RADIUS,
      getLabel: () => `Press E to pick up ${kind}`,
      onInteract: () => {
        inventory[inventoryKey] += 1;
        group.remove(mesh);
        interactions.unregister(item);
      },
    });
  }

  for (let i = 0; i < STICK_COUNT; i++) scatterOne("stick", makeStickMesh);
  for (let i = 0; i < ROCK_COUNT; i++) scatterOne("rock", () => makeRockMesh(rand));
}
