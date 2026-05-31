# Track Planet

Track Planet is a custom radial-gravity running prototype on a 400 m circumference spherical world.

Game-specific code and notes belong in this folder. Shared browser input, physics primitives, and planet placement helpers belong under `src/engine/` when they are useful for more than this game.

Current design notes:

- Track Planet mechanics live in [planning/track-planet/mechanics.md](../../../planning/track-planet/mechanics.md).
- The temporary pole vault change lives in [planning/track-planet/pole-vault-temp.md](../../../planning/track-planet/pole-vault-temp.md).
- The planet radius is derived from circumference: `radius = 400 / (2 * Math.PI)`.
- Player height is 2 m.
- Gravity is custom radial `1/r^2` gravity toward the planet center.
- Powerups are one-shot pickups placed on the surface with billboard labels.
- The bottom HUD reports collected powerups and surface-distance time trials.
- Track lanes, bleachers, field markers, and test markers should be placed through `src/engine/planetPlacement.ts`.
- The game route is `/gravity-games/#track-planet`.
- Track Planet uses custom game-managed motion and collision helpers in `physics/`.
- Hold `F` to charge a shot put throw, release `F` to throw.
- Hold `P` to pole vault.
- Hold `R` to use the rocket pack while airborne once collected.

Module layout:

- `TrackPlanetGame.ts` owns gameplay state, input interpretation, camera updates, and physics stepping.
- `scene.ts` composes the Three.js scene.
- `trackAssets.ts` builds track lanes and start/finish markings.
- `worldProps.ts` builds Track Planet-specific scenery and landmarks.
- `playerModel.ts` builds the player mesh and shadow indicator.
- `constants.ts` keeps Track Planet scale and tuning constants together.
- `physics/` contains Track Planet-specific motion, gravity, collisions, and radial physics helpers.
- `entities/` contains gameplay entities such as shot puts and the pole placeholder.
- `powerups.ts` builds the collectible powerups and their billboard labels.
- `timeTrials.ts` tracks the 100 m and 400 m surface-distance times.
