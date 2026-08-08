// The whole world is scaled up around the player rather than shrinking the
// camera directly — camera height is meaningless in VR, where the headset
// reports the player's true physical height regardless of any value we set.
// Scaling the environment instead makes the player feel shorter/smaller
// consistently on both desktop and in a headset.
export const WORLD_SCALE = 1.6;
