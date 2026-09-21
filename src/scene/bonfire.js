import * as THREE from "three";

/** Procedural soft-radial-gradient sprite, used for both flame and embers. */
function makeGlowTexture(innerColor, outerColor) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(1, outerColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const EMBER_COUNT = 60;
export const SECONDS_PER_STICK = 60;
export const MAX_FIRE_LEVEL = 5;
const MAX_FUEL_SECONDS = MAX_FIRE_LEVEL * SECONDS_PER_STICK;
const LIGHT_DISTANCE_MIN = 6;
const LIGHT_DISTANCE_MAX = 16;
const LIGHT_INTENSITY_MIN = 6;
const LIGHT_INTENSITY_MAX = 12;

export class Bonfire {
  constructor() {
    this.group = new THREE.Group();
    this.fireGroup = new THREE.Group();
    this.group.add(this.fireGroup);

    this._buildLogs();
    this._buildFlame();
    this._buildEmbers();
    this._buildLight();
    this._clock = 0;

    this.isLit = false;
    this.remainingSeconds = 0;
    this.fireGroup.visible = false;
    this._lightDistance = LIGHT_DISTANCE_MIN;
  }

  /** Discrete 0-5 fuel level, driving the on-screen fire bar. */
  get level() {
    if (!this.isLit) return 0;
    return Math.min(MAX_FIRE_LEVEL, Math.ceil(this.remainingSeconds / SECONDS_PER_STICK));
  }

  /** Current light reach in local (pre-WORLD_SCALE) units — 0 when unlit,
   *  growing smoothly with fuel up to the level-5 cap. This is "the circle
   *  of the fire" other systems (the wendigo) treat as a safe boundary. */
  get lightRadius() {
    return this.isLit ? this._lightDistance : 0;
  }

  /** Feeds the fire, igniting it if it was out. Each stick adds burn time. */
  addFuel(stickCount = 1) {
    this.remainingSeconds += SECONDS_PER_STICK * stickCount;
    this.isLit = true;
    this.fireGroup.visible = true;
  }

  _buildLogs() {
    const logGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.3, 6);
    const logMat = new THREE.MeshStandardMaterial({
      color: 0x241408,
      roughness: 1,
    });
    const positions = [
      { rot: 0.3, y: 0.12 },
      { rot: -0.5, y: 0.14 },
      { rot: 1.4, y: 0.1 },
      { rot: 2.3, y: 0.13 },
    ];
    for (const { rot, y } of positions) {
      const log = new THREE.Mesh(logGeo, logMat);
      log.position.y = y;
      log.rotation.z = Math.PI / 2 + Math.sin(rot) * 0.15;
      log.rotation.y = rot;
      log.castShadow = true;
      this.group.add(log);
    }
  }

  _buildFlame() {
    const flameTexture = makeGlowTexture(
      "rgba(255,214,140,0.95)",
      "rgba(255,90,20,0)",
    );
    const flameMat = new THREE.SpriteMaterial({
      map: flameTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    this.flameSprites = [];
    for (let i = 0; i < 3; i++) {
      const sprite = new THREE.Sprite(flameMat);
      sprite.position.set(
        (Math.random() - 0.5) * 0.2,
        0.5 + i * 0.15,
        (Math.random() - 0.5) * 0.2,
      );
      const scale = 1.1 - i * 0.25;
      sprite.scale.set(scale, scale * 1.4, 1);
      this.fireGroup.add(sprite);
      this.flameSprites.push(sprite);
    }
  }

  _buildEmbers() {
    const emberTexture = makeGlowTexture(
      "rgba(255,200,120,1)",
      "rgba(255,120,40,0)",
    );
    const positions = new Float32Array(EMBER_COUNT * 3);
    this._emberSeeds = [];
    for (let i = 0; i < EMBER_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = Math.random() * 1.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
      this._emberSeeds.push({
        speed: 0.4 + Math.random() * 0.6,
        drift: (Math.random() - 0.5) * 0.3,
        offset: Math.random() * 10,
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.06,
      map: emberTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.embers = new THREE.Points(geo, mat);
    this.fireGroup.add(this.embers);
  }

  _buildLight() {
    this.light = new THREE.PointLight(0xff7a29, LIGHT_INTENSITY_MIN, LIGHT_DISTANCE_MIN, 2);
    this.light.position.y = 1.1;
    this.light.castShadow = true;
    this.fireGroup.add(this.light);
  }

  update(delta, elapsed) {
    if (!this.isLit) return;

    this.remainingSeconds -= delta;
    if (this.remainingSeconds <= 0) {
      this.remainingSeconds = 0;
      this.isLit = false;
      this.fireGroup.visible = false;
      return;
    }

    this._clock += delta;

    // How full the fire is (0-1, capped at the level-5 fuel amount) drives
    // a smooth expansion of the light's reach/brightness and flame size,
    // independent of the discrete 0-5 level shown on the HUD bar.
    const fuelFraction = Math.min(this.remainingSeconds, MAX_FUEL_SECONDS) / MAX_FUEL_SECONDS;
    this._lightDistance =
      LIGHT_DISTANCE_MIN + fuelFraction * (LIGHT_DISTANCE_MAX - LIGHT_DISTANCE_MIN);
    const targetIntensity =
      LIGHT_INTENSITY_MIN + fuelFraction * (LIGHT_INTENSITY_MAX - LIGHT_INTENSITY_MIN);
    const flameSizeMultiplier = 0.8 + fuelFraction * 0.6;

    this.light.distance = this._lightDistance;

    // Flicker the light and flame scale with layered sine noise.
    const flicker =
      0.85 +
      0.1 * Math.sin(elapsed * 13.7) +
      0.08 * Math.sin(elapsed * 27.1 + 1.3) +
      0.05 * Math.sin(elapsed * 5.3);
    this.light.intensity = targetIntensity * flicker;

    for (let i = 0; i < this.flameSprites.length; i++) {
      const s = this.flameSprites[i];
      const wobble = Math.sin(elapsed * (6 + i * 2) + i) * 0.08;
      s.position.x = wobble;
      s.position.z = Math.cos(elapsed * (5 + i) + i) * 0.06;
      const baseScale = (1.1 - i * 0.25) * flameSizeMultiplier;
      const scaleFlicker = baseScale * (0.9 + 0.15 * Math.sin(elapsed * 9 + i * 2));
      s.scale.set(scaleFlicker, scaleFlicker * 1.4, 1);
    }

    const posAttr = this.embers.geometry.attributes.position;
    for (let i = 0; i < EMBER_COUNT; i++) {
      const seed = this._emberSeeds[i];
      const t = (elapsed * seed.speed + seed.offset) % 3;
      posAttr.setY(i, t * 1.2);
      posAttr.setX(
        i,
        Math.sin(elapsed + seed.offset) * 0.15 + seed.drift * t,
      );
    }
    posAttr.needsUpdate = true;
  }
}
