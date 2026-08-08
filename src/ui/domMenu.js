/**
 * Flat-screen (non-VR) main menu, backed by the HTML overlay in index.html.
 * A separate in-world 3D menu (see worldMenu.js) handles the same flow
 * inside a VR session, since the DOM overlay isn't visible in the headset.
 */
export class DomMenu {
  constructor({ onPlay, onTutorial }) {
    this.overlay = document.getElementById("menu-overlay");
    document.getElementById("btn-play").addEventListener("click", onPlay);
    document
      .getElementById("btn-tutorial")
      .addEventListener("click", onTutorial);
  }

  show() {
    this.overlay.hidden = false;
  }

  hide() {
    this.overlay.hidden = true;
  }
}
