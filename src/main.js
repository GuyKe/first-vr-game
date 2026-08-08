import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { buildEnvironment } from "./scene/environment.js";
import { buildForest } from "./scene/forest.js";
import { Bonfire } from "./scene/bonfire.js";
import { WalkTutorial } from "./scene/tutorial.js";
import { DesktopControls } from "./xr/desktopControls.js";
import { VRLocomotion } from "./xr/vrLocomotion.js";
import { DomMenu } from "./ui/domMenu.js";
import { WorldMenu } from "./ui/worldMenu.js";

const FOREST_SPAWN_POSITION = new THREE.Vector3(0, 1.6, 3.5);
const FOREST_SPAWN_YAW = Math.PI;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  200,
);

// The dolly is the "player" — moving/rotating it is how both desktop
// controls and VR locomotion relocate the player, while the camera itself
// stays under XR's control for head tracking.
const dolly = new THREE.Group();
dolly.add(camera);
dolly.position.copy(FOREST_SPAWN_POSITION);
dolly.rotation.y = FOREST_SPAWN_YAW;
scene.add(dolly);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

buildEnvironment(scene);
buildForest(scene);

const bonfire = new Bonfire();
scene.add(bonfire.group);

const walkTutorial = new WalkTutorial(scene, dolly);

const desktopControls = new DesktopControls(dolly, camera, renderer.domElement);
const vrLocomotion = new VRLocomotion(renderer, dolly, camera);

desktopControls.enabled = false;
vrLocomotion.enabled = false;

const infoEl = document.getElementById("info");

function goToForestSpawn() {
  dolly.position.copy(FOREST_SPAWN_POSITION);
  dolly.rotation.y = FOREST_SPAWN_YAW;
  desktopControls.resetOrientation(FOREST_SPAWN_YAW, 0);
}

function enterMenu() {
  walkTutorial.hide();
  goToForestSpawn();
  desktopControls.enabled = false;
  vrLocomotion.enabled = false;
  infoEl.textContent = "Fifi's Forest";
  // Pointer lock routes all clicks to the locked element (the canvas)
  // regardless of what's visually on top, so the menu buttons underneath
  // would never receive clicks if we left it engaged.
  if (document.pointerLockElement) document.exitPointerLock();
  if (renderer.xr.isPresenting) {
    domMenu.hide();
    worldMenu.show();
  } else {
    worldMenu.hide();
    domMenu.show();
  }
}

function enterPlay() {
  domMenu.hide();
  worldMenu.hide();
  vrLocomotion.enabled = true;
  infoEl.textContent = "Fifi's Forest";
  if (!renderer.xr.isPresenting) {
    desktopControls.enabled = true;
    renderer.domElement.requestPointerLock();
  }
}

function enterTutorial() {
  domMenu.hide();
  worldMenu.hide();
  vrLocomotion.enabled = true;
  infoEl.textContent = "Walk to the glowing dot";
  desktopControls.resetOrientation(0, 0);
  walkTutorial.show(enterMenu);
  if (!renderer.xr.isPresenting) {
    desktopControls.enabled = true;
    renderer.domElement.requestPointerLock();
  }
}

const domMenu = new DomMenu({
  onPlay: enterPlay,
  onTutorial: enterTutorial,
});

// WorldMenu reads the camera's world-space facing direction to place itself
// in front of the player; force a matrix update since no frame has rendered
// yet to compute it automatically.
scene.updateMatrixWorld(true);

const worldMenu = new WorldMenu(renderer, dolly, camera, scene, {
  onPlay: enterPlay,
  onTutorial: enterTutorial,
});

renderer.xr.addEventListener("sessionstart", () => {
  desktopControls.enabled = false;
});
renderer.xr.addEventListener("sessionend", () => {
  if (!worldMenu.group.visible) {
    // Player was mid-play or mid-tutorial when they exited VR — resume on
    // the flat screen exactly where they left off.
    desktopControls.enabled = true;
  } else {
    enterMenu();
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

enterMenu();

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  desktopControls.update(delta);
  vrLocomotion.update(delta);
  worldMenu.update();
  walkTutorial.update(delta);
  bonfire.update(delta, elapsed);

  renderer.render(scene, camera);
});
