import * as THREE from "three";

const MOVE_SPEED = 3.2; // meters/second
const LOOK_SENSITIVITY = 0.0022;

/**
 * Minimal pointer-lock WASD + mouse-look fallback for testing outside a
 * headset. Only active while the WebXR session is not presenting.
 */
export class DesktopControls {
  constructor(dolly, camera, domElement) {
    this.dolly = dolly;
    this.camera = camera;
    this.domElement = domElement;
    this.enabled = true;

    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();

    domElement.addEventListener("click", () => {
      if (this.enabled) domElement.requestPointerLock();
    });
    document.addEventListener("mousemove", (e) => this._onMouseMove(e));
    document.addEventListener("keydown", (e) => this.keys.add(e.code));
    document.addEventListener("keyup", (e) => this.keys.delete(e.code));
  }

  _onMouseMove(e) {
    if (!this.enabled || document.pointerLockElement !== this.domElement) return;
    this.yaw -= e.movementX * LOOK_SENSITIVITY;
    this.pitch -= e.movementY * LOOK_SENSITIVITY;
    this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
  }

  update(delta) {
    if (!this.enabled) return;

    this.dolly.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw),
    );
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    const move = new THREE.Vector3();
    if (this.keys.has("KeyW")) move.add(forward);
    if (this.keys.has("KeyS")) move.sub(forward);
    if (this.keys.has("KeyD")) move.add(right);
    if (this.keys.has("KeyA")) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(MOVE_SPEED * delta);
      this.dolly.position.add(move);
    }
  }
}
