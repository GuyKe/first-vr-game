import * as THREE from "three";

const PANEL_DISTANCE = 2.4;
const PANEL_WIDTH = 2.2;
const PANEL_HEIGHT = 1.1;
const PIXELS_PER_UNIT = 300;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function createCanvasTexture(pixelWidth, pixelHeight, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  draw(canvas.getContext("2d"), pixelWidth, pixelHeight);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createPanelMesh(width, height, draw) {
  const texture = createCanvasTexture(
    Math.round(width * PIXELS_PER_UNIT),
    Math.round(height * PIXELS_PER_UNIT),
    draw,
  );
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.userData.width = width;
  mesh.userData.height = height;
  return mesh;
}

function drawBackground(ctx, w, h) {
  roundRect(ctx, 0, 0, w, h, 40);
  ctx.fillStyle = "rgba(10, 8, 6, 0.82)";
  ctx.fill();
  roundRect(ctx, 2, 2, w - 4, h - 4, 40);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,154,61,0.5)";
  ctx.stroke();
}

function drawTitle(ctx, w, h) {
  ctx.fillStyle = "#ffcf8e";
  ctx.font = `bold ${Math.round(h * 0.6)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(255,140,40,0.8)";
  ctx.shadowBlur = 24;
  ctx.fillText("Fifi’s Forest", w / 2, h / 2);
}

function drawButtonLabel(ctx, w, h, label, hovered) {
  roundRect(ctx, 0, 0, w, h, h * 0.25);
  ctx.fillStyle = hovered ? "rgba(255,185,96,0.95)" : "rgba(255,122,41,0.85)";
  ctx.fill();
  ctx.fillStyle = "#1a0f06";
  ctx.font = `bold ${Math.round(h * 0.42)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, w / 2, h * 0.54);
}

/**
 * In-world 3D main menu, shown in front of the player while a VR session is
 * active. The DOM overlay used on the flat screen isn't visible inside the
 * headset, so this reproduces the same PLAY / TUTORIAL flow as clickable
 * panels the player points at with a controller and selects with the
 * trigger.
 */
export class WorldMenu {
  constructor(renderer, dolly, camera, scene, { onPlay, onTutorial }) {
    this._callbacks = { onPlay, onTutorial };

    this.group = new THREE.Group();
    this.group.visible = false;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    this.group.position
      .copy(dolly.position)
      .addScaledVector(forward, PANEL_DISTANCE);
    this.group.position.y = 1.6;
    this.group.rotation.y = Math.atan2(-forward.x, -forward.z);
    scene.add(this.group);

    this._buildPanel();

    this.raycaster = new THREE.Raycaster();
    this._tempMatrix = new THREE.Matrix4();
    this._hovered = null;

    this._controllers = [
      renderer.xr.getController(0),
      renderer.xr.getController(1),
    ];
    for (const controller of this._controllers) {
      controller.add(this._buildPointerLine());
      controller.addEventListener("selectstart", () =>
        this._onSelect(controller),
      );
    }
  }

  _buildPointerLine() {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xffb347 }),
    );
    line.name = "menuPointerLine";
    line.scale.z = PANEL_DISTANCE + 1;
    line.visible = false;
    return line;
  }

  _buildPanel() {
    const bg = createPanelMesh(PANEL_WIDTH, PANEL_HEIGHT, drawBackground);
    this.group.add(bg);

    const title = createPanelMesh(
      PANEL_WIDTH * 0.9,
      PANEL_HEIGHT * 0.38,
      drawTitle,
    );
    title.position.set(0, PANEL_HEIGHT * 0.26, 0.01);
    this.group.add(title);

    this.playButton = this._makeButton("PLAY", "play");
    this.playButton.position.set(-PANEL_WIDTH * 0.16, -0.24, 0.01);
    this.group.add(this.playButton);

    this.tutorialButton = this._makeButton("TUTORIAL", "tutorial");
    this.tutorialButton.position.set(PANEL_WIDTH * 0.16, -0.24, 0.01);
    this.group.add(this.tutorialButton);
  }

  _makeButton(label, action) {
    const mesh = createPanelMesh(PANEL_WIDTH * 0.42, 0.26, (ctx, w, h) =>
      drawButtonLabel(ctx, w, h, label, false),
    );
    mesh.userData.action = action;
    mesh.userData.label = label;
    return mesh;
  }

  show() {
    this.group.visible = true;
    for (const controller of this._controllers) {
      controller.getObjectByName("menuPointerLine").visible = true;
    }
  }

  hide() {
    this.group.visible = false;
    for (const controller of this._controllers) {
      controller.getObjectByName("menuPointerLine").visible = false;
    }
  }

  _raycastButtons(controller) {
    this._tempMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this._tempMatrix);
    const hits = this.raycaster.intersectObjects(
      [this.playButton, this.tutorialButton],
      false,
    );
    return hits.length > 0 ? hits[0].object : null;
  }

  _onSelect(controller) {
    if (!this.group.visible) return;
    const target = this._raycastButtons(controller);
    if (!target) return;
    const { action } = target.userData;
    if (action === "play") this._callbacks.onPlay();
    else if (action === "tutorial") this._callbacks.onTutorial();
  }

  update() {
    if (!this.group.visible) return;

    let hovered = null;
    for (const controller of this._controllers) {
      const hit = this._raycastButtons(controller);
      if (hit) {
        hovered = hit;
        break;
      }
    }

    if (hovered !== this._hovered) {
      if (this._hovered) this._setButtonHover(this._hovered, false);
      if (hovered) this._setButtonHover(hovered, true);
      this._hovered = hovered;
    }
  }

  _setButtonHover(button, hovered) {
    const { width, height, label } = button.userData;
    button.material.map.dispose();
    button.material.map = createCanvasTexture(
      Math.round(width * PIXELS_PER_UNIT),
      Math.round(height * PIXELS_PER_UNIT),
      (ctx, w, h) => drawButtonLabel(ctx, w, h, label, hovered),
    );
    button.material.needsUpdate = true;
  }
}
