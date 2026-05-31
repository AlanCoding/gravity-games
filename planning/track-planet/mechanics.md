# Track Planet Mechanics

Track Planet is a spherical-track running game on a 400 m circumference planet. The core idea is simple:

- the player runs around a small planet
- the normal force changes with speed
- sliding appears when the runner asks for more lateral or tangential acceleration than the ground can support
- later powerups can push the player into orbit and escape conditions

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

## Powerup tiers

Later powerups can raise:

- baseline drive acceleration
- reference speed
- effective traction envelope

Suggested tiers:

- baseline runner
- strong runner
- elite runner
- orbit/escape tier

## Temporary notes

Pole vault has a separate temporary plan while the mechanic is still being shaped. See [pole-vault-temp.md](pole-vault-temp.md).
