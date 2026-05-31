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
- `a_max(N, v)` be the maximum tangential acceleration the runner can generate
- `a_req` be the acceleration requested by input
- `v_ref` be the reference speed where acceleration starts to fall off
- `a_ref` be the baseline acceleration at rest and full support

The UI can keep showing normal force in `lbf`, but the math should use `N` in `N`.

## Proposed model

Use a simple two-variable envelope:

```text
a_max(N, v) = a_ref * (N0 / max(N, N_floor))^p * max(0, 1 - (v / v_ref)^q)
```

Where:

- `a_ref` is the baseline acceleration at rest and full normal force
- `N_floor` prevents the formula from exploding when the runner is nearly weightless
- `p` controls how strongly normal force changes the available acceleration
- `q` controls how quickly acceleration fades as speed rises

This keeps the structure simple:

- more normal force means more available drive
- less normal force means less weight to carry and more room to accelerate in the model
- higher speed means less remaining acceleration

That is not a literal rigid-body friction law. It is a runner model that borrows the same shape as a coefficient-of-friction calculation so the game has a clear tuning knob.

## Baseline tuning target

For ordinary high-school runner feel, the current target should be roughly:

- `a_ref ≈ 3.0 m/s²`
- `v_ref ≈ 7.4 m/s`
- `p ≈ 0.45`
- `q ≈ 2.0`
- `N_floor ≈ 35 lbf`

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

If the requested tangent change is larger than the available acceleration envelope, the runner should slide instead of snapping to the input.

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
