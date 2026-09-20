import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { WORLD_SCALE } from "./constants.js";
import { buildEnvironment } from "./scene/environment.js";
import { buildForest } from "./scene/forest.js";
import { Bonfire } from "./scene/bonfire.js";
import { WalkTutorial } from "./scene/tutorial.js";
import { DayNightCycle } from "./scene/dayNightCycle.js";
import { DesktopControls } from "./xr/desktopControls.js";
import { VRLocomotion } from "./xr/vrLocomotion.js";
import { GrabSystem } from "./xr/grabSystem.js";
import { DomMenu } from "./ui/domMenu.js";
import { WorldMenu } from "./ui/worldMenu.js";
import { InteractionManager } from "./gameplay/interactions.js";
import { buildPickups } from "./gameplay/pickups.js";
import { buildAxeMesh } from "./gameplay/axe.js";

const FOREST_SPAWN_POSITION = new THREE.Vector3(0, 1.6, 3.5);
const FOREST_SPAWN_YAW = Math.PI;
const BONFIRE_INTERACT_RADIUS = 2.4;
const AXE_STONE_REQUIREMENT = 3;
const AXE_LOCAL_SPAWN_POSITION = new THREE.Vector3(1.4, 0.02, 0.6);
const AXE_PICKUP_RADIUS = 1.3;
const CHOP_RADIUS = 2.0;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  200,
);

// The dolly is the "player" — moving/rotating it is how both desktop
// controls and VR locomotion relocate the player, while the camera itself
// stays under XR's control for head tracking. It lives directly in `scene`,
// unscaled, so spawn coordinates stay simple; the environment is scaled up
// around it instead (see worldGroup below) to make the player feel smaller.
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
renderer.toneMappingExposure = 1.3;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const dayNight = new DayNightCycle(scene);

const worldGroup = new THREE.Group();
worldGroup.scale.setScalar(WORLD_SCALE);
scene.add(worldGroup);

buildEnvironment(worldGroup);
const treePositions = buildForest(worldGroup);

const bonfire = new Bonfire();
worldGroup.add(bonfire.group);

// The tutorial platform is a separate isolated space, deliberately left
// outside worldGroup so its spawn/dot coordinates stay simple (unscaled,
// matching the dolly's own coordinate space).
const walkTutorial = new WalkTutorial(scene, dolly);

const inventory = { sticks: 0, rocks: 0, wood: 0 };
const interactions = new InteractionManager(dolly);
buildPickups(worldGroup, interactions, inventory);

worldGroup.updateMatrixWorld(true);
const bonfireWorldPosition = bonfire.group.getWorldPosition(new THREE.Vector3());
interactions.register({
  position: bonfireWorldPosition,
  radius: BONFIRE_INTERACT_RADIUS,
  getLabel: () => {
    if (inventory.sticks > 0) {
      return `Press E to add a stick to the fire (have ${inventory.sticks})`;
    }
    return bonfire.isLit
      ? `Fire burning — ${Math.ceil(bonfire.remainingSeconds)}s left`
      : "Find a stick to light the fire";
  },
  onInteract: () => {
    if (inventory.sticks <= 0) return;
    inventory.sticks -= 1;
    bonfire.addFuel(1);
  },
});

let hasAxe = false;
let axeSpawned = false;

function enableTreeChopping() {
  for (const { x, z } of treePositions) {
    interactions.register({
      position: new THREE.Vector3(x * WORLD_SCALE, 0, z * WORLD_SCALE),
      radius: CHOP_RADIUS,
      getLabel: () => "Press E to chop (+1 wood)",
      onInteract: () => {
        inventory.wood += 1;
      },
    });
  }
}

/** Crafted from 3 stones, appears by the fire. Grab it (VR) or walk up and
 *  press E (desktop) to equip it, which unlocks chopping trees for wood. */
function spawnAxe() {
  const mesh = buildAxeMesh();
  mesh.position.copy(AXE_LOCAL_SPAWN_POSITION);
  worldGroup.add(mesh);
  worldGroup.updateMatrixWorld(true);
  const worldPosition = mesh.getWorldPosition(new THREE.Vector3());

  function equipAxe() {
    if (hasAxe) return;
    hasAxe = true;
    interactions.unregister(axeItem);
    enableTreeChopping();
  }

  const axeItem = interactions.register({
    position: worldPosition,
    radius: AXE_PICKUP_RADIUS,
    grabbable: true,
    holdable: true,
    mesh,
    getLabel: () => "Press E to pick up the stone axe",
    // Desktop has no visible hand model, so the axe just vanishes like any
    // other pickup once equipped.
    onInteract: () => {
      mesh.parent?.remove(mesh);
      equipAxe();
    },
    // VR: GrabSystem has already parked the mesh in the grabbing hand's
    // grip by the time this fires, so it stays visible and rides along.
    onEquip: equipAxe,
  });
}

const desktopControls = new DesktopControls(dolly, camera, renderer.domElement);
const vrLocomotion = new VRLocomotion(renderer, dolly, camera);
const grabSystem = new GrabSystem(renderer, dolly, interactions);

desktopControls.enabled = false;
vrLocomotion.enabled = false;
grabSystem.enabled = false;

const infoEl = document.getElementById("info");
const promptEl = document.getElementById("prompt");
const hudEl = document.getElementById("hud");

let mode = "menu"; // "menu" | "play" | "tutorial"

function goToForestSpawn() {
  dolly.position.copy(FOREST_SPAWN_POSITION);
  dolly.rotation.y = FOREST_SPAWN_YAW;
  desktopControls.resetOrientation(FOREST_SPAWN_YAW, 0);
}

function enterMenu() {
  mode = "menu";
  walkTutorial.hide();
  goToForestSpawn();
  desktopControls.enabled = false;
  vrLocomotion.enabled = false;
  grabSystem.enabled = false;
  infoEl.textContent = "Fifi's Forest";
  promptEl.classList.remove("visible");
  hudEl.classList.remove("visible");
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
  mode = "play";
  domMenu.hide();
  worldMenu.hide();
  vrLocomotion.enabled = true;
  grabSystem.enabled = true;
  infoEl.textContent = "Fifi's Forest";
  hudEl.classList.add("visible");
  if (!renderer.xr.isPresenting) {
    desktopControls.enabled = true;
    renderer.domElement.requestPointerLock();
  }
}

function enterTutorial() {
  mode = "tutorial";
  domMenu.hide();
  worldMenu.hide();
  vrLocomotion.enabled = true;
  grabSystem.enabled = false;
  infoEl.textContent = "Walk to the glowing dot";
  hudEl.classList.remove("visible");
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
  if (mode === "menu") {
    domMenu.hide();
    worldMenu.show();
  }
});
renderer.xr.addEventListener("sessionend", () => {
  if (mode === "menu") {
    // Refresh onto the flat-screen menu presentation.
    enterMenu();
  } else {
    // Player was mid-play or mid-tutorial when they exited VR — resume on
    // the flat screen exactly where they left off.
    desktopControls.enabled = true;
  }
});

document.addEventListener("keydown", (e) => {
  if (e.code === "KeyE" && mode !== "menu") interactions.interact();
});

function onControllerSelect() {
  if (mode === "menu") return;
  // Grabbable pickups (sticks/rocks) are handled by GrabSystem's point +
  // hold-to-pull mechanic instead of an instant proximity tap.
  if (interactions.nearby?.grabbable) return;
  interactions.interact();
}
renderer.xr.getController(0).addEventListener("selectstart", onControllerSelect);
renderer.xr.getController(1).addEventListener("selectstart", onControllerSelect);

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
  grabSystem.update(delta);
  worldMenu.update();
  walkTutorial.update(delta);
  dayNight.update(delta);
  bonfire.update(delta, elapsed);

  if (mode !== "menu") {
    interactions.update();
    if (interactions.nearby) {
      promptEl.textContent = interactions.nearby.getLabel();
      promptEl.classList.add("visible");
    } else {
      promptEl.classList.remove("visible");
    }
  }

  if (mode === "play") {
    if (!axeSpawned && inventory.rocks >= AXE_STONE_REQUIREMENT) {
      axeSpawned = true;
      spawnAxe();
    }
    hudEl.textContent = `Sticks: ${inventory.sticks}   Stone: ${inventory.rocks}   Wood: ${inventory.wood}`;
  }

  renderer.render(scene, camera);
});
