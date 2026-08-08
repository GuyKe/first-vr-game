import * as THREE from "three";

const MAX_GRAB_DISTANCE = 10;
const GRAB_DURATION = 0.35; // seconds for an item to fly into the hand
const GRAB_LINE_COLOR = 0x9fe8ff;

/**
 * VR-only "force grab" for loose pickups: point a controller at a stick or
 * rock and a line appears; hold the trigger and it flies into your hand
 * over GRAB_DURATION, completing the same pickup as a proximity tap would.
 * Releasing the trigger early snaps it back to where it started.
 */
export class GrabSystem {
  constructor(renderer, dolly, interactions) {
    this.renderer = renderer;
    this.dolly = dolly;
    this.interactions = interactions;
    this.enabled = true;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = MAX_GRAB_DISTANCE;
    this._tempMatrix = new THREE.Matrix4();

    this._controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
    this._lines = this._controllers.map((controller) => this._buildLine(controller));
    this._hovered = [null, null];
    this._pulls = [null, null];

    this._controllers.forEach((controller, i) => {
      controller.addEventListener("selectstart", () => this._startGrab(i));
      controller.addEventListener("selectend", () => this._cancelGrab(i));
    });
  }

  _buildLine(controller) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: GRAB_LINE_COLOR }),
    );
    line.visible = false;
    controller.add(line);
    return line;
  }

  _grabbableItems() {
    return this.interactions.items.filter((item) => item.grabbable);
  }

  _raycastFrom(controller) {
    this._tempMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this._tempMatrix);

    const items = this._grabbableItems();
    const hits = this.raycaster.intersectObjects(
      items.map((item) => item.mesh),
      false,
    );
    if (hits.length === 0) return null;
    const item = items.find((candidate) => candidate.mesh === hits[0].object);
    return item ? { item, distance: hits[0].distance } : null;
  }

  _startGrab(i) {
    if (!this.enabled) return;
    const hovered = this._hovered[i];
    if (!hovered) return;
    // Guard against it having been picked up by the other controller (or
    // otherwise unregistered) between the last raycast and this event.
    if (!this.interactions.items.includes(hovered)) return;

    const controller = this._controllers[i];
    const mesh = hovered.mesh;
    // Reparent onto the dolly, preserving world position, so the pull
    // animation can work in the dolly's simple (unscaled) local space
    // instead of whatever scaled group the mesh started in.
    this.dolly.attach(mesh);

    this._pulls[i] = {
      item: hovered,
      mesh,
      controller,
      startLocalPosition: mesh.position.clone(),
      elapsed: 0,
    };
    this._lines[i].visible = false;
  }

  _cancelGrab(i) {
    const pull = this._pulls[i];
    if (!pull) return;
    pull.mesh.position.copy(pull.startLocalPosition);
    this._pulls[i] = null;
  }

  update(delta) {
    if (!this.enabled) {
      for (const line of this._lines) line.visible = false;
      return;
    }

    for (let i = 0; i < this._controllers.length; i++) {
      if (this._pulls[i]) continue; // mid-pull controllers don't re-hover

      const hit = this._raycastFrom(this._controllers[i]);
      this._hovered[i] = hit?.item ?? null;
      const line = this._lines[i];
      line.visible = !!hit;
      if (hit) line.scale.z = hit.distance;
    }

    for (let i = 0; i < this._pulls.length; i++) {
      const pull = this._pulls[i];
      if (!pull) continue;

      pull.elapsed += delta;
      const t = Math.min(pull.elapsed / GRAB_DURATION, 1);
      const handLocalPosition = this.dolly.worldToLocal(
        pull.controller.getWorldPosition(new THREE.Vector3()),
      );
      pull.mesh.position.lerpVectors(pull.startLocalPosition, handLocalPosition, t);

      if (t >= 1) {
        pull.item.onInteract();
        this._pulls[i] = null;
      }
    }
  }
}
