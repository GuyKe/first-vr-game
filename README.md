# Fifi's Forest

An atmospheric WebXR experience for Meta Quest, built with [Three.js](https://threejs.org/).

The player spawns at sunrise at the edge of a sand clearing in the middle of
a forest that's noticeably larger than you are. Trees ring the clearing on
every side; a bonfire sits cold at its center. Sticks and rocks are
scattered around — pick sticks up and feed them to the fire to light it and
push back the dark; each stick buys about a minute of burn time. Collect 3
stones and a stone axe appears by the fire — equip it to start chopping
trees for wood. The sky cycles through a full day and night as you play.

This is a starting scene, not a full game yet. Good next steps: something to
build or craft with the wood, more uses for rocks, a way to see how much
fuel is left without standing at the fire, ambient sound.

## Running it

```bash
npm install
npm run dev
```

This opens a local dev server with a main menu: **PLAY** drops you at the
bonfire, **TUTORIAL** takes you to a bare practice platform where you walk to
a glowing dot to learn the controls, then return to the menu automatically.

On desktop, click into the window and use **WASD** to walk and **mouse
drag** to look around. Walk up to a stick, rock, the bonfire, the stone axe,
or a tree (once equipped) and press **E** to interact — a prompt appears
whenever something is in reach.

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
you're looking. Point at a stick or rock and a line appears — hold the
trigger and it flies into your hand. Walk up to the bonfire and pull the
trigger to feed it a stick. Once you have 3 stones, do the same with the
stone axe by the fire — it stays in your hand, and pulling the trigger near
a tree chops it for wood.

## Project structure

```
src/
  main.js                Scene/state setup, render loop, VR/desktop wiring
  constants.js            Shared tuning constants (world scale)
  scene/
    environment.js         Forest floor and sand clearing geometry
    dayNightCycle.js        Sky/fog/sun-moon lighting cycle
    forest.js                Instanced procedural tree scattering
    bonfire.js               Fire logs, flame/embers, fuel timer, unlit by default
    tutorial.js               Walk-to-the-dot practice platform
  gameplay/
    interactions.js          Shared "nearby + press to interact" system
    pickups.js                 Scattered stick/rock pickups
    axe.js                      Stone axe model (crafted at 3 stones)
  ui/
    domMenu.js               Flat-screen HTML main menu overlay
    worldMenu.js              In-world 3D main menu, shown inside VR sessions
  xr/
    desktopControls.js      Mouse-look + WASD fallback for non-VR testing
    vrLocomotion.js           Joystick-driven smooth VR locomotion + controller models
    grabSystem.js              Point-and-hold telekinetic grab for pickups (VR only)
```

## Building for production

```bash
npm run build
```

Outputs a static site in `dist/` that can be hosted anywhere over HTTPS
(GitHub Pages, Netlify, Vercel, etc.) and opened directly in the Quest
Browser — no native app build/packaging required.
