# Track Planet Mechanics

Track Planet is a spherical-track running game on a 400 m circumference planet. According to the current objectives,
the core game is mostly finished. The baseline mechanics, powerups, time trials, rocket pack, shot put, pole vault,
and achievement hooks are implemented. Remaining work should be treated as debugging, tuning, and presentation polish.

Current subtitle for the page:

- `Pole vault, throw shot put balls into orbit, rocket into oblivion.`

Core idea:

- the player runs around a small planet
- the normal force changes with speed
- sliding appears when the runner asks for more lateral or tangential acceleration than the ground can support
- the player can pole-vault and throw shot puts into orbit
- one-shot powerups push the player toward orbit and escape conditions

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

This is the baseline movement model. It is part of the finished core mechanics layer.

## Timing and distance

Time-based goals use surface distance only.

- measure progress by latitude/longitude movement along the sphere
- ignore altitude completely
- use the planet surface path, not straight 3D distance
- `100 m` is one quarter of the `400 m` circumference, so a quarter-lap time is the correct `100 m` time trial scale

If the player is airborne, the time trial still measures the surface path they are covering, not the height they happen to be at.

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

## Powerups

Powerups are implemented as one-time pickups. The reset button clears them for another run.

Current powerup categories:

- ability level tiers
  - baseline runner
  - high-school runner
  - world-record runner
  - the runner tier is advanced by two generic runner pickups collected in any order
- rocket pack
  - pushes the player forward while in air
  - uses limited fuel
  - refuels when the player touches the ground again
  - supports circularization and orbit-control routes
- shot put powerups
  - raise release strength above the current 100% cap
  - current 100% becomes the pre-powerup baseline
  - later 150% is the stronger post-powerup ceiling

Powerups are intended to be:

- placed directly on the planet surface
- visually obvious
- labeled with simple physical billboard-wall text
- signed by `-coach`

The billboard text should explain what the pickup is and what it does, without requiring the player to guess.
The collected-powerup display lives at the bottom of the page rather than in the main gameplay header.

## Powerup tiers

Powerups can raise:

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

Shot put power starts below the final ceiling. The pre-powerup 100% throw is the baseline; the shot put powerup allows
throws up to roughly 150% of that baseline.

## Achievements

Achievements are implemented as simple binary unlocks. Some achievements require powerups to be reachable. The core set includes:

- orbit
- escape
- coming in for landing after orbit
- shot put orbit
- shot put escape
- time-trial goals
  - `100 m`
  - `400 m`
  - cute sub-`9.9` sprint achievement

Time achievements should be based on surface distance around the planet, not altitude. They can be simple binary unlocks even if the on-screen presentation is playful.

The current completion state is:

- mechanics are in place
- powerups are in place
- achievements are in place
- remaining work is tuning, bug fixing, and minor presentation cleanup

## Temporary notes

The first pole-vault iteration is complete. The temporary note remains only as a record of the simplified model. See
[pole-vault-temp.md](pole-vault-temp.md).
