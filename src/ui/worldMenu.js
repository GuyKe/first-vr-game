import * as THREE from "three";

const PANEL_DISTANCE = 2.4;
const PANEL_WIDTH = 2.2;
const PANEL_HEIGHT = 1.5;
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

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawParagraphs(ctx, w, h, paragraphs) {
  ctx.fillStyle = "#f2e8d5";
  const fontSize = Math.round(h * 0.1);
  ctx.font = `${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const marginX = w * 0.08;
  const maxWidth = w - marginX * 2;
  let y = h * 0.06;
  for (const paragraph of paragraphs) {
    for (const line of wrapLines(ctx, paragraph, maxWidth)) {
      ctx.fillText(line, marginX, y);
      y += fontSize * 1.4;
    }
    y += fontSize * 0.7;
  }
}

/**
 * In-world 3D main menu, shown in front of the player while a VR session is
 * active. The DOM overlay used on the flat screen isn't visible inside the
 * headset, so this reproduces the same PLAY / TUTORIAL flow as clickable
 * panels the player points at with a controller and selects with the
 * trigger.
 */
export class WorldMenu {
  constructor(renderer, dolly, scene, { onPlay, onTutorial, onBack }) {
    this._callbacks = { onPlay, onTutorial, onBack };

    this.group = new THREE.Group();
    this.group.visible = false;

    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      dolly.rotation.y,
    );
    this.group.position
      .copy(dolly.position)
      .addScaledVector(forward, PANEL_DISTANCE);
    this.group.position.y = 1.6;
    this.group.rotation.y = dolly.rotation.y + Math.PI;
    scene.add(this.group);

    this._buildMainPanel();
    this._buildTutorialPanel();
    this.showMain();

    this.raycaster = new THREE.Raycaster();
    this._tempMatrix = new THREE.Matrix4();
    this._hovered = null;

    this._controllers = [
      renderer.xr.getController(0),
      renderer.xr.getController(1),
    ];
    for (const controller of this._controllers) {
      controller.addEventListener("selectstart", () =>
        this._onSelect(controller),
      );
    }
  }

  _buildMainPanel() {
    this.mainPanel = new THREE.Group();

    const bg = createPanelMesh(PANEL_WIDTH, PANEL_HEIGHT, drawBackground);
    this.mainPanel.add(bg);

    const title = createPanelMesh(
      PANEL_WIDTH * 0.9,
      PANEL_HEIGHT * 0.28,
      drawTitle,
    );
    title.position.set(0, PANEL_HEIGHT * 0.28, 0.01);
    this.mainPanel.add(title);

    this.playButton = this._makeButton("PLAY", "play");
    this.playButton.position.set(0, 0, 0.01);
    this.mainPanel.add(this.playButton);

    this.tutorialButton = this._makeButton("TUTORIAL", "tutorial");
    this.tutorialButton.position.set(0, -0.42, 0.01);
    this.mainPanel.add(this.tutorialButton);

    this.group.add(this.mainPanel);
  }

  _buildTutorialPanel() {
    this.tutorialPanel = new THREE.Group();
    this.tutorialPanel.visible = false;

    const bg = createPanelMesh(PANEL_WIDTH, PANEL_HEIGHT, drawBackground);
    this.tutorialPanel.add(bg);

    const body = createPanelMesh(
      PANEL_WIDTH * 0.92,
      PANEL_HEIGHT * 0.62,
      (ctx, w, h) =>
        drawParagraphs(ctx, w, h, [
          "Hold either controller's trigger and point at the ground to aim a teleport marker.",
          "Release the trigger to move there.",
          "Turn your head to look around — the world stays put.",
        ]),
    );
    body.position.set(0, 0.22, 0.01);
    this.tutorialPanel.add(body);

    this.backButton = this._makeButton("BACK", "back");
    this.backButton.position.set(0, -0.55, 0.01);
    this.tutorialPanel.add(this.backButton);

    this.group.add(this.tutorialPanel);
  }

  _makeButton(label, action) {
    const mesh = createPanelMesh(PANEL_WIDTH * 0.55, 0.26, (ctx, w, h) =>
      drawButtonLabel(ctx, w, h, label, false),
    );
    mesh.userData.action = action;
    mesh.userData.label = label;
    return mesh;
  }

  showMain() {
    this.group.visible = true;
    this.mainPanel.visible = true;
    this.tutorialPanel.visible = false;
  }

  showTutorial() {
    this.mainPanel.visible = false;
    this.tutorialPanel.visible = true;
  }

  hide() {
    this.group.visible = false;
  }

  _interactiveButtons() {
    if (this.mainPanel.visible) return [this.playButton, this.tutorialButton];
    if (this.tutorialPanel.visible) return [this.backButton];
    return [];
  }

  _raycastButtons(controller) {
    this._tempMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this._tempMatrix);
    const hits = this.raycaster.intersectObjects(
      this._interactiveButtons(),
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
    else if (action === "back") this._callbacks.onBack();
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
