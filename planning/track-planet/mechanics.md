# Track Planet Mechanics

Track Planet is a spherical-track running game on a 400 m circumference planet. The current first-pass mechanics are implemented. The next phase is powerups, then achievements.

Working subtitle for the page:

- `pole vault and throw shot put balls into orbit`

Core idea:

- the player runs around a small planet
- the normal force changes with speed
- sliding appears when the runner asks for more lateral or tangential acceleration than the ground can support
- the player can pole-vault and throw shot puts into orbit
- later powerups will push the player into orbit and escape conditions

## Baseline geometry

- Planet circumference: `400 m`
- Planet radius: `400 / (2π) = 63.662 m`
- Player height: `2 m`
- Player resting normal force: `150 lbf`
- Local surface gravity: `1.2 m/s²`

## Current running model

The runner uses a simple speed envelope:

```text
a_drive(v) = a_ref * max(0, 1 - (v / v_ref)^q)
```

Baseline values:

- `a_ref ≈ 3.0 m/s²`
- `v_ref ≈ 7.4 m/s`
- `q ≈ 2.0`
- `mu_s ≈ 1.0`
- `mu_k ≈ 0.8`

The important behavior is:

- at low speed, the runner accelerates normally
- at higher speed, acceleration naturally falls off
- if the requested turn or drive exceeds static traction, the runner slides
- if no movement input is held, the runner is a passive block and slows under kinetic friction

This is the baseline movement model. It is the current “finished mechanics” layer before powerups.

## Orbit and launch behavior

The player and shot put use the same radial gravity model. Orbit should be awarded only when the osculating orbit is actually clear of the surface.

For shot puts, the orbit rule uses the predicted perigee distance from the planet center and compares it against the planet radius plus the shot put radius. That keeps the award tied to actual geometry instead of a guessed future path.

## Throwing

The shot put release should inherit the player’s tangent velocity. Full charge should be strong, but not trivially orbiting from rest. If the player is already moving fast, the combined release can become orbit-capable.

## Sliding

Sliding is a gameplay state, not a failure state.

- it should have a visible cue
- it should eventually converge back to controlled motion
- turning can trigger it even when straight-line speed is still acceptable
- it should obey the kinetic coefficient once active

## Next phase: powerups

Powerups are the next gameplay layer after the baseline mechanics.

Planned powerup categories:

- ability level tiers
  - baseline runner
  - high-school runner
  - world-record runner
- rocket pack
  - pushes the player forward while in air
  - needed for circularization and later orbit-control routes
- shot put powerups
  - raise release strength above the current 100% cap
  - current 100% becomes the pre-powerup baseline
  - later 150% is the stronger post-powerup ceiling

Powerups should be:

- placed directly on the planet surface
- visually obvious
- labeled with simple billboard text
- signed by `-coach`

The billboard text should explain what the pickup is and what it does, without requiring the player to guess.

## Powerup tiers

Later powerups can raise:

- baseline drive acceleration
- reference speed
- effective traction envelope
- shot put release power

Suggested tiers:

- baseline runner
- high-school runner
- world-record runner
- orbit/escape tier

The ability tiers and the shot put power tiers are related but separate. A strong runner can still have a modest throw, and a throw powerup can exist without changing the runner tier.

## Next phase: achievements

Achievements come after powerups.

Some achievements will require powerups to be reachable at all. The obvious examples are:

- orbit
- escape
- shot put orbit
- shot put escape

The design intent is:

- first finish the mechanics
- then place powerups on the planet
- then tune achievements against those powerups
- then tune the collectible economy around the achievement targets

## Temporary notes

Pole vault has a separate temporary plan while the mechanic is still being shaped. See [pole-vault-temp.md](pole-vault-temp.md).
