import * as THREE from "three";

export const CLEARING_RADIUS = 9;

/**
 * Builds the night forest floor, the sand clearing, fog and ambient
 * moonlight.
 */
export function buildEnvironment(scene) {
  scene.background = new THREE.Color(0x030409);
  scene.fog = new THREE.FogExp2(0x050a12, 0.035);

  const ambient = new THREE.HemisphereLight(0x2a3a5c, 0x0a0a08, 0.55);
  scene.add(ambient);

  const moon = new THREE.DirectionalLight(0x6f8fc9, 0.25);
  moon.position.set(-20, 30, -15);
  scene.add(moon);

  const forestFloor = new THREE.Mesh(
    new THREE.CircleGeometry(120, 64),
    new THREE.MeshStandardMaterial({
      color: 0x101a10,
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
