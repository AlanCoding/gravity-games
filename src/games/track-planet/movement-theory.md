# Track Planet Movement Theory

This note defines the current thinking for running, traction, and later powerups in Track Planet.

The goal is not to set a hard top speed first. The goal is to define a force model that produces:

- ordinary high-school runner performance at the baseline tier
- more performance when a powerup increases the runner's biomechanical output
- a normal-force readout that matters to the player
- a simple slip model that can be tuned without rewriting the movement system

## Known baseline values

- Planet circumference: `400 m`
- Planet radius: `400 / (2π) = 63.662 m`
- Player mass target: `~68 kg`
- Player resting normal force: `150 lbf`
- Local surface gravity: `1.2 m/s²`

## Variables

Let:

- `N` be the current normal force on the ground, in newtons
- `N0` be the resting normal force, in newtons
- `v` be the current tangent speed, in meters per second
- `a_drive(v)` be the tangential acceleration the runner can generate at speed `v`
- `a_req` be the acceleration requested by input
- `mu_s` be the static friction coefficient
- `mu_k` be the kinetic friction coefficient
- `v_ref` be the reference speed where acceleration starts to fall off
- `a_ref` be the baseline acceleration at rest and full support

The UI can keep showing normal force in `lbf`, but the math should use `N` in `N`.

## Proposed model

Use a speed-only drive envelope:

```text
a_drive(v) = a_ref * max(0, 1 - (v / v_ref)^q)
```

Where:

- `a_ref` is the baseline acceleration at rest
- `q` controls how quickly acceleration fades as speed rises

This keeps the structure simple:

- higher speed means less remaining acceleration
- the runner can still accelerate if the current speed is below the drive envelope
- once the runner asks for more acceleration than the static limit allows, the feet slip and the dynamic coefficient takes over

That is not a literal rigid-body friction law. It is a runner model that uses a friction-like envelope so the game has a clear tuning knob without turning every step into a separate force-balance solve.

## Baseline tuning target

For ordinary high-school runner feel, the current target should be roughly:

- `a_ref ≈ 3.0 m/s²`
- `v_ref ≈ 7.4 m/s`
- `q ≈ 2.0`
- `mu_s ≈ 1.00`
- `mu_k ≈ 0.80`

That gives a runner who can accelerate strongly from rest, but is not a world-record sprinter.

The earlier `10.6 m/s` walk speed was too high for the baseline tier. That number belongs in a later powerup tier, not in the default runner.

## Suggested powerup tiers

These are placeholders for later design work.

### Tier 0: Baseline runner

- `a_ref`: about `3.0 m/s²`
- `v_ref`: about `7.4 m/s`
- Intended feel: ordinary high-school sprinting

### Tier 1: Strong runner

- `a_ref`: about `4.0 m/s²`
- `v_ref`: about `8.2 m/s`
- Intended feel: clearly better than baseline, but still plausible

### Tier 2: Elite runner

- `a_ref`: about `5.2 m/s²`
- `v_ref`: about `9.0 m/s`
- Intended feel: advanced gameplay, but not the final ceiling

### Tier 3: Orbit / escape powerup tier

- `a_ref`: about `6.5 m/s²` or higher
- `v_ref`: about `10 m/s` and beyond
- Intended feel: late-game behavior where the player can challenge orbit and escape conditions

## Sliding rule

If the requested tangent acceleration is larger than the static friction limit, the runner should slide instead of snapping to the input.

The static limit is:

```text
a_static_max = mu_s * N / m
```

If the runner is sliding, then the available acceleration is reduced to the kinetic limit:

```text
a_kinetic_max = mu_k * N / m
```

So the actual motion rule becomes:

1. compute `a_drive(v)`
2. clamp it against `a_static_max`
3. if the requested change exceeds that clamp, enter sliding
4. while sliding, use the dynamic coefficient instead

This means:

- if there is no WASD input, the runner just keeps moving with the surface unless existing momentum or terrain geometry causes sliding
- turning left or right can cause sliding even if straight-line speed is still within the limit, because the lateral change has to fit inside the same friction envelope
- once the runner becomes fast enough that the model can no longer sustain the requested acceleration, the remaining acceleration becomes a sliding state rather than a hard stop

The model should report:

- `normal` when grounded
- `sliding` when the requested motion exceeds the current envelope
- `slidingIntensity` as a 0-to-1 severity value for sparks and other visual cues

## Why this shape works

This gives us one basic idea to tune:

1. the runner can only generate so much tangential acceleration
2. that limit depends on normal force and current speed
3. once the limit is exceeded, the game shows sliding instead of pretending the feet can keep up

That makes the movement readable, testable, and easy to power up later without changing the math structure.
