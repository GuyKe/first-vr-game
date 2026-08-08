import * as THREE from "three";

const CYCLE_SECONDS = 480; // one full day/night cycle = 8 real minutes
const SUN_RADIUS = 60;

// Four evenly-spaced keyframes (sunrise, noon, sunset, midnight). The cycle
// starts at t=0 (sunrise) and interpolates linearly between neighboring
// keyframes as t advances.
const KEYFRAMES = [
  {
    sky: 0xff9e6d,
    fog: 0xcf6b4a,
    sun: 0xffb37a,
    sunIntensity: 1.0,
    hemiSky: 0x8a97b0,
    hemiGround: 0x2a2015,
    hemiIntensity: 0.6,
  },
  {
    sky: 0xbfe3ff,
    fog: 0xaed4f0,
    sun: 0xfff6e0,
    sunIntensity: 1.4,
    hemiSky: 0xcfe8ff,
    hemiGround: 0x4a4030,
    hemiIntensity: 0.9,
  },
  {
    sky: 0xff7a4d,
    fog: 0xb5563c,
    sun: 0xff8a4d,
    sunIntensity: 0.9,
    hemiSky: 0x8a6a72,
    hemiGround: 0x2a2015,
    hemiIntensity: 0.5,
  },
  {
    sky: 0x030409,
    fog: 0x050a12,
    sun: 0x6f8fc9,
    sunIntensity: 0.15,
    hemiSky: 0x2a3a5c,
    hemiGround: 0x0a0a08,
    hemiIntensity: 0.4,
  },
];

function sampleKeyframes(t) {
  const scaled = t * KEYFRAMES.length;
  const segment = Math.floor(scaled) % KEYFRAMES.length;
  const frac = scaled - Math.floor(scaled);
  return {
    a: KEYFRAMES[segment],
    b: KEYFRAMES[(segment + 1) % KEYFRAMES.length],
    frac,
  };
}

function makeGlowTexture() {
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
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.7)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Drives sky/fog color, ambient light and a directional sun/moon light
 * through a repeating day-night cycle. The game starts at sunrise (t=0).
 */
export class DayNightCycle {
  constructor(scene) {
    this.scene = scene;
    this.t = 0;

    scene.fog = new THREE.FogExp2(0x000000, 0.035);

    this.hemi = new THREE.HemisphereLight(0x000000, 0x000000, 0);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffffff, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 160;
    this.sun.shadow.camera.left = -40;
    this.sun.shadow.camera.right = 40;
    this.sun.shadow.camera.top = 40;
    this.sun.shadow.camera.bottom = -40;
    scene.add(this.sun);
    scene.add(this.sun.target);

    const glowMaterial = new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      transparent: true,
      depthWrite: false,
    });
    this.sunSprite = new THREE.Sprite(glowMaterial);
    this.sunSprite.scale.set(14, 14, 1);
    scene.add(this.sunSprite);

    this._applyState();
  }

  update(delta) {
    this.t = (this.t + delta / CYCLE_SECONDS) % 1;
    this._applyState();
  }

  _applyState() {
    const { a, b, frac } = sampleKeyframes(this.t);
    const lerpColor = (hexA, hexB) =>
      new THREE.Color(hexA).lerp(new THREE.Color(hexB), frac);

    const skyColor = lerpColor(a.sky, b.sky);
    const sunColor = lerpColor(a.sun, b.sun);
    const sunIntensity = THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, frac);

    this.scene.background = skyColor;
    this.scene.fog.color.copy(lerpColor(a.fog, b.fog));

    this.hemi.color.copy(lerpColor(a.hemiSky, b.hemiSky));
    this.hemi.groundColor.copy(lerpColor(a.hemiGround, b.hemiGround));
    this.hemi.intensity = THREE.MathUtils.lerp(a.hemiIntensity, b.hemiIntensity, frac);

    this.sun.color.copy(sunColor);
    this.sun.intensity = sunIntensity;

    const angle = this.t * Math.PI * 2;
    this.sun.position.set(
      Math.cos(angle) * SUN_RADIUS,
      Math.sin(angle) * SUN_RADIUS,
      -20,
    );
    this.sun.target.position.set(0, 0, 0);
    this.sun.target.updateMatrixWorld();

    this.sunSprite.position.copy(this.sun.position);
    this.sunSprite.material.color.copy(sunColor);
    this.sunSprite.visible = this.sun.position.y > -SUN_RADIUS * 0.08;
  }
}
