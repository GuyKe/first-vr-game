/**
 * Tracks a set of world-space interactables and which one (if any) the
 * player is currently standing near, so both desktop (E key) and VR
 * (controller trigger) can share one "press to interact" input.
 */
export class InteractionManager {
  constructor(dolly) {
    this.dolly = dolly;
    this.items = [];
    this.nearby = null;
  }

  register(item) {
    this.items.push(item);
    // Tag the mesh (and any children, e.g. a multi-part axe model) with a
    // back-reference so raycasting code (GrabSystem) can look up the owning
    // item in O(1) regardless of hit depth, instead of matching object
    // identity against a flat list.
    item.mesh?.traverse((child) => {
      child.userData.interactionItem = item;
    });
    return item;
  }

  unregister(item) {
    const index = this.items.indexOf(item);
    if (index >= 0) this.items.splice(index, 1);
    if (this.nearby === item) this.nearby = null;
  }

  update() {
    let nearest = null;
    let nearestDist = Infinity;
    for (const item of this.items) {
      const dx = this.dolly.position.x - item.position.x;
      const dz = this.dolly.position.z - item.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= item.radius && dist < nearestDist) {
        nearest = item;
        nearestDist = dist;
      }
    }
    this.nearby = nearest;
  }

  interact() {
    this.nearby?.onInteract();
  }
}
