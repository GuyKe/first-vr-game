import * as THREE from "three";

/**
 * A simple low-poly stone axe: a wooden handle with a flattened wedge-like
 * stone head, matching the rest of the game's plain procedural-geometry
 * style (no external assets).
 */
export function buildAxeMesh() {
  const group = new THREE.Group();

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a2f1a, roughness: 1 }),
  );
  handle.position.y = 0.3;
  handle.castShadow = true;
  group.add(handle);

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.24, 4),
    new THREE.MeshStandardMaterial({
      color: 0x8a8a8a,
      roughness: 0.85,
      flatShading: true,
    }),
  );
  head.rotation.z = Math.PI / 2;
  head.scale.set(1, 1, 0.35);
  head.position.set(0.03, 0.58, 0);
  head.castShadow = true;
  group.add(head);

  return group;
}
