import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { buildEnvironment } from "./scene/environment.js";
import { buildForest } from "./scene/forest.js";
import { Bonfire } from "./scene/bonfire.js";
import { DesktopControls } from "./xr/desktopControls.js";
import { TeleportControls } from "./xr/teleport.js";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  200,
);

// The dolly is the "player" — moving/rotating it is how both desktop
// controls and VR teleportation relocate the player, while the camera
// itself stays under XR's control for head tracking.
const dolly = new THREE.Group();
dolly.add(camera);
dolly.position.set(0, 1.6, 3.5);
dolly.rotation.y = Math.PI;
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

const { floorMeshes } = buildEnvironment(scene);
buildForest(scene);

const bonfire = new Bonfire();
scene.add(bonfire.group);

const desktopControls = new DesktopControls(dolly, camera, renderer.domElement);
const teleportControls = new TeleportControls(renderer, scene, dolly, floorMeshes);

renderer.xr.addEventListener("sessionstart", () => {
  desktopControls.enabled = false;
});
renderer.xr.addEventListener("sessionend", () => {
  desktopControls.enabled = true;
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  desktopControls.update(delta);
  teleportControls.update();
  bonfire.update(delta, elapsed);

  renderer.render(scene, camera);
});
