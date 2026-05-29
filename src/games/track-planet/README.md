# Track Planet

Track Planet is a custom radial-gravity running prototype on a 400 m circumference spherical world.

Game-specific code and notes belong in this folder. Shared browser input, physics primitives, and planet placement helpers belong under `src/engine/` when they are useful for more than this game.

Current design notes:

- The planet radius is derived from circumference: `radius = 400 / (2 * Math.PI)`.
- Player height is 2 m.
- Gravity is custom radial `1/r^2` gravity toward the planet center.
- Track lanes, bleachers, field markers, and test markers should be placed through `src/engine/planetPlacement.ts`.
- The game route is `/gravity-games/#track-planet`.
- Rapier world gravity is disabled. Track Planet manually applies radial gravity in `physics/gravity.ts`.
- Hold `F` to charge a shot put throw, release `F` to throw.
- Press `P` to spawn the placeholder pole entity.

Module layout:

- `TrackPlanetGame.ts` owns gameplay state, input interpretation, camera updates, and physics stepping.
- `scene.ts` composes the Three.js scene.
- `trackAssets.ts` builds track lanes and start/finish markings.
- `worldProps.ts` builds Track Planet-specific scenery and landmarks.
- `playerModel.ts` builds the player mesh and shadow indicator.
- `constants.ts` keeps Track Planet scale and tuning constants together.
- `physics/` contains Track Planet-specific Rapier player/projectile physics and radial gravity.
- `entities/` contains gameplay entities such as shot puts and the pole placeholder.
