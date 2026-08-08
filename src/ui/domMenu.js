/**
 * Flat-screen (non-VR) main menu, backed by the HTML overlay in index.html.
 * A separate in-world 3D menu (see worldMenu.js) handles the same flow
 * inside a VR session, since the DOM overlay isn't visible in the headset.
 */
export class DomMenu {
  constructor({ onPlay, onTutorial, onBack }) {
    this.overlay = document.getElementById("menu-overlay");
    this.mainPanel = document.getElementById("main-menu");
    this.tutorialPanel = document.getElementById("tutorial-menu");

    document.getElementById("btn-play").addEventListener("click", onPlay);
    document
      .getElementById("btn-tutorial")
      .addEventListener("click", onTutorial);
    document.getElementById("btn-back").addEventListener("click", onBack);
  }

  showMain() {
    this.overlay.hidden = false;
    this.mainPanel.hidden = false;
    this.tutorialPanel.hidden = true;
  }

  showTutorial() {
    this.mainPanel.hidden = true;
    this.tutorialPanel.hidden = false;
  }

  hide() {
    this.overlay.hidden = true;
  }
}
