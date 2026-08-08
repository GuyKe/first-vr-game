import * as THREE from "three";

// Kept outside the 120-radius forest floor disc (see environment.js) so the
// two grounds never intersect.
const BASEPLATE_CENTER = new THREE.Vector3(0, 0, -140);
const BASEPLATE_RADIUS = 6;
const SPAWN_OFFSET = new THREE.Vector3(0, 0, 4);
const DOT_OFFSET = new THREE.Vector3(0, 0, -4);
const REACH_DISTANCE = 0.7;

function makeGridTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#4b5560";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  const step = size / 8;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * A bare-bones "walk to the dot" exercise: teaches locomotion (joystick in
 * VR, WASD on desktop) on a plain baseplate, away from the forest. Reaching
 * the glowing dot fires the completion callback passed to show().
 */
export class WalkTutorial {
  constructor(scene, dolly) {
    this.dolly = dolly;
    this.active = false;
    this._clock = 0;
    this._onComplete = null;

    this.group = new THREE.Group();
    this.group.visible = false;
    this.group.position.copy(BASEPLATE_CENTER);
    scene.add(this.group);

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(BASEPLATE_RADIUS, BASEPLATE_RADIUS, 0.2, 48),
      new THREE.MeshStandardMaterial({ map: makeGridTexture(), roughness: 0.9 }),
    );
    plate.position.y = -0.1;
    plate.receiveShadow = true;
    this.group.add(plate);

    this.dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.05, 32),
      new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        emissive: 0x1f9d55,
        emissiveIntensity: 1.2,
      }),
    );
    this.dot.position.copy(DOT_OFFSET);
    this.dot.position.y = 0.03;
    this.group.add(this.dot);

    const dotLight = new THREE.PointLight(0x4ade80, 2, 4);
    dotLight.position.copy(DOT_OFFSET);
    dotLight.position.y = 0.6;
    this.group.add(dotLight);
  }

  show(onComplete) {
    this._onComplete = onComplete;
    this.active = true;
    this.group.visible = true;
    this.dolly.position.copy(BASEPLATE_CENTER).add(SPAWN_OFFSET);
    this.dolly.position.y = 1.6;
    this.dolly.rotation.y = 0; // faces -Z, i.e. toward the dot
  }

  hide() {
    this.active = false;
    this.group.visible = false;
  }

  update(delta) {
    if (!this.active) return;
    this._clock += delta;
    const pulse = 1 + 0.15 * Math.sin(this._clock * 4);
    this.dot.scale.set(pulse, 1, pulse);

    const dotWorld = new THREE.Vector3();
    this.dot.getWorldPosition(dotWorld);
    const dx = this.dolly.position.x - dotWorld.x;
    const dz = this.dolly.position.z - dotWorld.z;
    if (Math.sqrt(dx * dx + dz * dz) < REACH_DISTANCE) {
      this.active = false;
      this.group.visible = false;
      const callback = this._onComplete;
      this._onComplete = null;
      callback?.();
    }
  }
}
