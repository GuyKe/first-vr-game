# Fifi's Forest

An atmospheric WebXR experience for Meta Quest, built with [Three.js](https://threejs.org/).

The player spawns at the edge of a sand clearing in the middle of a dark
forest. Trees ring the clearing on every side; a bonfire burns at its
center, lighting the surrounding sand and the nearest trees.

This is a starting scene, not a full game yet — no objectives beyond the
walking tutorial, just the place. Good next steps: ambient sound, fire-fed
light that reacts to a day/night or fuel system, things hidden in the tree
line, or a reason to leave the fire.

## Running it

```bash
npm install
npm run dev
```

This opens a local dev server with a main menu: **PLAY** drops you at the
bonfire, **TUTORIAL** takes you to a bare practice platform where you walk to
a glowing dot to learn the controls, then return to the menu automatically.

On desktop, click into the window and use **WASD** to walk and **mouse
drag** to look around.

## Testing on a Meta Quest headset

WebXR requires a secure (HTTPS) context, except on `localhost`. `npm run dev`
uses [`vite-plugin-mkcert`](https://github.com/liuweiGL/vite-plugin-mkcert)
to serve over HTTPS automatically:

1. Make sure your Quest and your dev machine are on the same Wi-Fi network.
2. Run `npm run dev` and note the `https://<your-lan-ip>:5173` URL it prints.
3. Open that URL in the **Meta Quest Browser**, accept the self-signed
   certificate warning, and tap **Enter VR**.

In VR, the menu appears as a 3D panel in front of you — point a controller
at PLAY or TUTORIAL and pull the trigger to select. Movement is smooth
joystick locomotion: push the left thumbstick to walk in the direction
you're looking.

## Project structure

```
src/
  main.js               Scene/state setup, render loop, VR/desktop wiring
  scene/
    environment.js       Forest floor, sand clearing, fog, ambient light
    forest.js             Instanced procedural tree scattering
    bonfire.js            Fire logs, flame sprites, embers, flickering light
    tutorial.js            Walk-to-the-dot practice platform
  ui/
    domMenu.js             Flat-screen HTML main menu overlay
    worldMenu.js            In-world 3D main menu, shown inside VR sessions
  xr/
    desktopControls.js    Mouse-look + WASD fallback for non-VR testing
    vrLocomotion.js         Joystick-driven smooth VR locomotion + controller models
```

## Building for production

```bash
npm run build
```

Outputs a static site in `dist/` that can be hosted anywhere over HTTPS
(GitHub Pages, Netlify, Vercel, etc.) and opened directly in the Quest
Browser — no native app build/packaging required.
