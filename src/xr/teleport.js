import * as THREE from "three";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";

const MAX_TELEPORT_DISTANCE = 30;

/**
 * Sets up VR controllers with a simple point-and-teleport locomotion scheme:
 * hold the trigger to aim a ray at the ground, release to teleport there.
 */
export class TeleportControls {
  constructor(renderer, scene, dolly, floorMeshes) {
    this.renderer = renderer;
    this.dolly = dolly;
    this.floorMeshes = floorMeshes;
    this.raycaster = new THREE.Raycaster();
    this._tempMatrix = new THREE.Matrix4();
    this.activeController = null;

    this._buildMarker(scene);
    this._buildControllers(scene);
  }

  _buildMarker(scene) {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.3, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffb347, side: THREE.DoubleSide }),
    );
    marker.visible = false;
    scene.add(marker);
    this.marker = marker;
  }

  _buildLine() {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const material = new THREE.LineBasicMaterial({ color: 0xffb347 });
    const line = new THREE.Line(geometry, material);
    line.scale.z = MAX_TELEPORT_DISTANCE;
    line.name = "teleportLine";
    return line;
  }

  _buildControllers(scene) {
    const modelFactory = new XRControllerModelFactory();
    this.controllers = [];

    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i);
      controller.add(this._buildLine());
      controller.userData.selecting = false;
      controller.addEventListener("selectstart", () => {
        controller.userData.selecting = true;
        controller.getObjectByName("teleportLine").visible = true;
        this.activeController = controller;
      });
      controller.addEventListener("selectend", () => {
        controller.userData.selecting = false;
        controller.getObjectByName("teleportLine").visible = false;
        if (this.marker.visible) {
          this.dolly.position.x = this.marker.position.x;
          this.dolly.position.z = this.marker.position.z;
        }
        this.marker.visible = false;
        this.activeController = null;
      });
      this.dolly.add(controller);

      const grip = this.renderer.xr.getControllerGrip(i);
      grip.add(modelFactory.createControllerModel(grip));
      this.dolly.add(grip);

      this.controllers.push(controller);
    }
  }

  update() {
    if (!this.activeController) return;

    this._tempMatrix.identity().extractRotation(this.activeController.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(
      this.activeController.matrixWorld,
    );
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this._tempMatrix);
    this.raycaster.far = MAX_TELEPORT_DISTANCE;

    const hits = this.raycaster.intersectObjects(this.floorMeshes, false);
    if (hits.length > 0) {
      this.marker.position.copy(hits[0].point);
      this.marker.position.y += 0.01;
      this.marker.visible = true;
    } else {
      this.marker.visible = false;
    }
  }
}
