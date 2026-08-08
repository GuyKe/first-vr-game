import * as THREE from "three";

export const CLEARING_RADIUS = 9;

/**
 * Builds the forest floor and sand clearing geometry. Sky, fog and lighting
 * are owned by the day-night cycle (see dayNightCycle.js) since they change
 * continuously.
 */
export function buildEnvironment(scene) {
  const forestFloor = new THREE.Mesh(
    new THREE.CircleGeometry(120, 64),
    new THREE.MeshStandardMaterial({
      color: 0x1c2a1c,
      roughness: 1,
      metalness: 0,
    }),
  );
  forestFloor.rotation.x = -Math.PI / 2;
  forestFloor.receiveShadow = true;
  scene.add(forestFloor);

  const sand = new THREE.Mesh(
    new THREE.CircleGeometry(CLEARING_RADIUS, 48),
    new THREE.MeshStandardMaterial({
      color: 0xc2a878,
      roughness: 0.95,
      metalness: 0,
    }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = 0.01;
  sand.receiveShadow = true;
  scene.add(sand);

  // Subtle darker ring at the sand/tree-line boundary for definition.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(CLEARING_RADIUS - 0.3, CLEARING_RADIUS, 48),
    new THREE.MeshStandardMaterial({
      color: 0x8a7050,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.015;
  scene.add(ring);
}
