import * as THREE from "three";
import { WORLD_SCALE } from "../constants.js";

const WANDER_MIN_DISTANCE = 12;
const WANDER_MAX_DISTANCE = 25;
const FIRE_BUFFER = 2; // stays this much further out than the fire's reach
const MOVE_SPEED = 1.8; // slower than the player, deliberately non-threatening
const RETARGET_MIN_SECONDS = 4;
const RETARGET_MAX_SECONDS = 8;

function buildWendigoMesh() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x120e0a, roughness: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.32, 2.2, 7), bodyMat);
  body.position.y = 1.1;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), bodyMat);
  head.position.y = 2.35;
  head.castShadow = true;
  group.add(head);

  const antlerMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 1 });
  for (const side of [-1, 1]) {
    const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.55, 5), antlerMat);
    antler.position.set(side * 0.14, 2.65, -0.02);
    antler.rotation.z = side * 0.6;
    antler.rotation.x = -0.3;
    group.add(antler);
  }

  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xfff4c2,
    emissive: 0xfff4c2,
    emissiveIntensity: 3,
  });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
    eye.position.set(side * 0.09, 2.38, 0.19);
    group.add(eye);
  }

  const eyeGlow = new THREE.PointLight(0xfff4c2, 0.8, 3, 2);
  eyeGlow.position.set(0, 2.38, 0.2);
  group.add(eyeGlow);

  return group;
}

/**
 * A nocturnal creature that wanders the dark tree line near the player,
 * kept out of the bonfire's lit radius by both its wander-target picking
 * and a hard per-frame clamp (so it can never be pushed/drift inside it).
 * Hidden and idle during the day.
 */
export class Wendigo {
  constructor(scene, dolly) {
    this.dolly = dolly;
    this.group = buildWendigoMesh();
    this.group.scale.setScalar(WORLD_SCALE);
    this.group.visible = false;
    scene.add(this.group);

    this._active = false;
    this._target = new THREE.Vector3();
    this._retargetTimer = 0;
  }

  setActive(active) {
    if (this._active === active) return;
    this._active = active;
    this.group.visible = active;
  }

  update(delta, fireRadiusWorld) {
    if (!this._active) return;

    this._retargetTimer -= delta;
    if (this._retargetTimer <= 0) {
      this._pickNewTarget(fireRadiusWorld);
      this._retargetTimer =
        RETARGET_MIN_SECONDS + Math.random() * (RETARGET_MAX_SECONDS - RETARGET_MIN_SECONDS);
    }

    const pos = this.group.position;
    const dx = this._target.x - pos.x;
    const dz = this._target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.3) {
      pos.x += (dx / dist) * MOVE_SPEED * delta;
      pos.z += (dz / dist) * MOVE_SPEED * delta;
      this.group.rotation.y = Math.atan2(-dx, -dz);
    }

    // Hard safety clamp: whatever else happens, never end up inside the
    // fire's current light circle.
    const distFromFire = Math.hypot(pos.x, pos.z);
    const minDist = fireRadiusWorld + FIRE_BUFFER;
    if (distFromFire < minDist && distFromFire > 0.001) {
      const scale = minDist / distFromFire;
      pos.x *= scale;
      pos.z *= scale;
    }
  }

  _pickNewTarget(fireRadiusWorld) {
    const minDist = fireRadiusWorld + FIRE_BUFFER;
    const dollyPos = this.dolly.position;

    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = WANDER_MIN_DISTANCE + Math.random() * (WANDER_MAX_DISTANCE - WANDER_MIN_DISTANCE);
      const x = dollyPos.x + Math.cos(angle) * dist;
      const z = dollyPos.z + Math.sin(angle) * dist;
      if (Math.hypot(x, z) >= minDist) {
        this._target.set(x, 0, z);
        return;
      }
    }

    // Fallback if every attempt landed inside the fire's reach (e.g. the
    // player is standing right next to a roaring fire): pick a point just
    // outside it in a random direction instead.
    const angle = Math.random() * Math.PI * 2;
    this._target.set(Math.cos(angle) * (minDist + 3), 0, Math.sin(angle) * (minDist + 3));
  }
}
