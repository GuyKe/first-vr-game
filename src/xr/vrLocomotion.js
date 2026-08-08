import * as THREE from "three";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";

const MOVE_SPEED = 2.6; // meters/second
const DEADZONE = 0.15;

/**
 * Smooth (joystick) VR locomotion: the left controller's thumbstick moves
 * the player relative to where the headset is currently looking (yaw only —
 * looking up/down doesn't tip movement into the floor or sky).
 */
export class VRLocomotion {
  constructor(renderer, dolly, camera) {
    this.renderer = renderer;
    this.dolly = dolly;
    this.camera = camera;
    this.enabled = true;

    const modelFactory = new XRControllerModelFactory();
    for (let i = 0; i < 2; i++) {
      const grip = renderer.xr.getControllerGrip(i);
      grip.add(modelFactory.createControllerModel(grip));
      this.dolly.add(grip);

      // The target-ray space (used for pointing at menu buttons — see
      // WorldMenu) gets its local transform updated by WebXR each frame,
      // but that only becomes a correct world-space position via the normal
      // parent chain, so it must be parented under the dolly like the grip.
      this.dolly.add(renderer.xr.getController(i));
    }
  }

  _findThumbstick(session) {
    let fallback = null;
    for (const source of session.inputSources) {
      const axes = source.gamepad?.axes;
      if (!axes || axes.length < 2) continue;
      // xr-standard gamepad mapping puts the thumbstick at axes[2]/[3];
      // axes[0]/[1] are a touchpad on controllers that have one.
      const axis =
        axes.length >= 4 ? { x: axes[2], y: axes[3] } : { x: axes[0], y: axes[1] };
      if (source.handedness === "left") return axis;
      if (!fallback) fallback = axis;
    }
    return fallback;
  }

  update(delta) {
    if (!this.enabled) return;
    const session = this.renderer.xr.getSession();
    if (!session) return;

    const axis = this._findThumbstick(session);
    if (!axis) return;

    let { x, y } = axis;
    if (Math.abs(x) < DEADZONE) x = 0;
    if (Math.abs(y) < DEADZONE) y = 0;
    if (x === 0 && y === 0) return;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) return;
    forward.normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);

    const move = new THREE.Vector3();
    // Thumbstick y is negative when pushed forward.
    move.addScaledVector(forward, -y);
    move.addScaledVector(right, x);
    if (move.lengthSq() > 1) move.normalize();

    this.dolly.position.addScaledVector(move, MOVE_SPEED * delta);
  }
}
