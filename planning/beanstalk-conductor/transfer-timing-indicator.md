# Transfer Timing Indicator Plan

## Purpose

The player needs a readable sense of when a selected release is likely to be good before pressing launch. The exact
simulation remains authoritative, but the UI can show a simplified textbook-transfer timing signal so the player is not
waiting blindly.

This note describes a first-pass timing-quality bar. It should be treated as advisory, not as the real solver.

## Physical Intuition

For the idealized circular-orbit case, a transfer from radius `r1` to radius `r2` is an ellipse tangent to both circular
orbits:

- upward transfer: release at perigee, catch at apogee
- downward transfer: release at apogee, catch at perigee

The payload takes half of the transfer ellipse period to reach the other radius:

```text
a = (r1 + r2) / 2
t_transfer = pi * sqrt(a^3 / mu)
```

During that time, the target continues around its circular orbit:

```text
n_target = sqrt(mu / r2^3)
target_travel = n_target * t_transfer
```

The transfer arrives approximately `pi` radians ahead of the release radial line, because apogee/perigee is on the
opposite side of the transfer ellipse. Therefore the ideal target phase at release is:

```text
target_phase_now = source_phase_now + pi - target_travel
```

Equivalently:

```text
phase_error = wrap(target_phase_now - source_phase_now - (pi - target_travel))
```

`phase_error == 0` is the clean circular CM-to-CM release time.

This handles the common confusion:

- For an upward transfer, the payload starts in the lower, faster orbit and then rises. The outer target moves more
  slowly during the transfer, so at release the target should usually be somewhat before the opposite-side intercept
  point, not exactly 180 degrees away.
- For a downward transfer, the payload starts in the higher, slower orbit and drops. The inner target moves more quickly
  during the transfer, so the inner target may need to be much earlier in phase so it can move forward to the intercept
  point.
- "Before" and "after" are easiest to define by the signed phase formula above rather than by visual intuition. The bar
  should be driven by signed angular error, not prose rules.

## Degrees Of Freedom

The prototype currently has only one intended player-controlled degree of freedom:

- release time

The solver/game may compute or constrain these values:

- tangential release speed correction
- source radius, using the selected mass/endpoint radius
- target radius, using the selected target endpoint, target station, or simplified CM radius
- transfer direction, upward or downward
- whether the result must remain prograde

The player should not control:

- launch angle
- arbitrary radial velocity
- target selection beyond selecting a valid mass/action
- catch steering

For the simplified timing bar, we should ignore relative velocity at catch and treat the transfer as a tangent ellipse
between two circular radii. The exact solver still decides whether the current release is actually valid.

## Indicator Model

For a selected transfer:

1. Determine source radius `r1`.
   - Barbell transfer: selected source endpoint radius.
   - Civic Prime source: planet launcher radius.
   - Fleet Central source: station radius.
2. Determine target radius `r2`.
   - Barbell target: selected target endpoint radius.
   - Fleet Central target: station radius.
   - Planet disposal: omit from this first indicator unless separately designed.
3. Compute the half-transfer time with the circular transfer formula.
4. Compute target travel during that time.
5. Compute ideal release phase:

```text
idealPhaseDelta = pi - targetTravel
phaseError = wrap(targetPhase - sourcePhase - idealPhaseDelta)
```

6. Convert `phaseError` into a UI score.

Suggested first-pass scoring:

```text
windowHalfWidth = configurable radians, initially 0.35
quality = max(0, 1 - abs(phaseError) / windowHalfWidth)
```

When `quality == 0`, show an X or blackout marker. When `quality > 0`, show a vertical or horizontal bar that rises
toward the center of the simplified release window.

This score is not a guarantee. It is an expectation-setting gauge.

The first implementation should use the selected mass/source radius and selected target mass/destination radius for the
optimal timing point. This is more physically meaningful than using only barbell CM radii because the payload is actually
released from and caught at endpoints. The exact window shape around that point is less settled.

## Window Derivation Goal

A fixed angular window is acceptable only as an early placeholder. A fixed time window, such as `10 seconds`, is the
wrong abstraction because orbital angular rates vary dramatically across the ladder.

The desired long-term indicator window should come from the same physical limits as the solver's bisection search:

- source radius
- target radius
- transfer orbit perigee/apogee limits
- prograde-only constraints
- the apsis envelope used to reject absurd figure-skater transfer orbits

The bar should be present when the simplified transfer equations say the timing is inside the physical search envelope.
Near the middle of the window, the CM/endpoint circular transfer is close to ideal. Near the edges, the player may still
be allowed to try, but exact simulation failure should be expected and reported normally.

This likely requires more physics work than plugging in one formula. The implementation should not pretend a fixed
`10s` window is equivalent to the solver bounds.

## Ideal Release Time Equation

The optimal timing point can be computed directly under the circular, endpoint-radius approximation.

At time `t`, approximate:

```text
theta_source(t) = theta_source_now + n_source * dt
theta_target(t) = theta_target_now + n_target * dt
dt = t - now
n_source = sqrt(mu / r_source^3)
n_target = sqrt(mu / r_target^3)
```

The half-transfer time is:

```text
a_transfer = (r_source + r_target) / 2
t_transfer = pi * sqrt(a_transfer^3 / mu)
```

The target must be ahead of the source at release by:

```text
ideal_delta = pi - n_target * t_transfer
```

So the ideal release condition is:

```text
theta_target(t) - theta_source(t) = ideal_delta   (mod 2*pi)
```

Substitute the linear circular-orbit phase approximations:

```text
(theta_target_now - theta_source_now) + (n_target - n_source) * dt = ideal_delta + 2*pi*k
```

Solve for candidate future release times:

```text
dt_k = (ideal_delta - (theta_target_now - theta_source_now) + 2*pi*k) / (n_target - n_source)
```

Pick the smallest `dt_k >= 0`.

This is the concrete first implementation formula for the ideal marker. It works for upward and downward transfers as
long as `r_source != r_target`. If the radii are effectively equal, the transfer degenerates and the indicator should
return unavailable.

Useful implementation notes:

- Use wrapped phases for display error, but use the `k` equation above to find the next future ideal time.
- `n_target - n_source` is negative for upward transfers and positive for downward transfers.
- Because the denominator can be negative, selecting the smallest future `dt_k` should scan a small integer range for
  `k`, for example `-3..3`, or compute the correct `k` with floor/ceil and then verify.
- The immediate timing quality at the current time can still be computed with:

```text
phase_error_now = wrap((theta_target_now - theta_source_now) - ideal_delta)
```

The bar peak occurs when `phase_error_now == 0`, which is equivalent to `dt_k == 0` for one integer `k`.

## UI Behavior

- Only show the active timing bar when the selected action is a physical release.
- Hide or gray it out for cross-tether mass shifts.
- Show an X when the selected transfer is outside the simplified window.
- Show a rising/falling bar as `phaseError` approaches/leaves zero.
- Keep the existing solver error path. If the player launches inside the green-ish timing window and the exact solver
  still fails, Admiral Voss should report the exact failure.

The useful player story is:

```text
The bar tells me when the simple textbook transfer says "now-ish".
The launch button still asks the real solver whether the current messy beanstalk can actually do it.
```

## Staged Implementation Plan

### Stage 1: Barbell-To-Barbell Fudged Timing Bar

Goal: get a grounded, tested indicator into the game without solving the full feasible-window derivation.

Scope:

- barbell-to-barbell physical transfers only
- no Civic Prime source launch indicator yet
- no Fleet Central source/target indicator yet
- no planet disposal special indicator yet
- selected source endpoint radius and selected target endpoint radius drive the ideal timing point
- fixed angular half-window drives the side bounds

Implementation:

1. Add a pure physics helper, probably in `physics/transferTiming.ts`.
   - Inputs: `mu`, source position, target position, optional `windowHalfWidthRad`.
   - Derived inputs: `r_source`, `r_target`, `theta_source_now`, `theta_target_now`.
   - Output: `phaseErrorRad`, `idealPhaseDeltaRad`, `transferTimeSeconds`, `nextIdealReleaseSeconds`,
     `quality`, `windowHalfWidthRad`.
2. Use the ideal release time equation from this document.
   - Compute `dt_k`.
   - Pick the smallest future `dt_k >= 0`.
   - Use `phase_error_now` for current bar fill.
3. Use a fixed angular half-width as the first side-bound fudge.
   - Initial candidate: `windowHalfWidthRad = 0.35`.
   - Quality:

```text
quality = max(0, 1 - abs(phase_error_now) / windowHalfWidthRad)
```

4. Add unit tests for circular cases.
   - Upward transfer: target phase matching `pi - n2 * t_transfer` gives quality 1.
   - Downward transfer: same formula works with `r1 > r2`.
   - Outside the angular fudge window gives quality 0.
   - Phase wrapping near `-pi/pi` is stable.
   - `nextIdealReleaseSeconds` is the smallest future solution.
5. Add a selector adapter in game logic or UI code.
   - Convert the selected `TransferOpportunity` into source/target endpoint positions.
   - Return `null` unless `transfer.mode === 'transfer'` and `destinationKind` is absent.
6. Render the indicator in the play HUD.
   - Show an X when unsupported or outside the fixed angular window.
   - Show a filled bar when inside the window.
   - Keep it visually modest because this is advisory, not the exact solver.
7. Compare indicator vs exact solver in story reports.
   - Extend `tools/beanstalk_user_story.ts` to print timing estimate fields for each action.
   - This gives a debugging trail when the timing bar says "good" but the exact solver says "no".

### Stage 2: Source-Origin And Fleet Central Indicator Coverage

Extend the same helper family to:

- Civic Prime upmass source launches
- Fleet Central downmass source launches
- final upmass delivery to Fleet Central

This may need destination-specific handling because the source/target can be fixed infrastructure rather than barbell
endpoints.

### Stage 3: Replace Fudged Bounds With Physics Bounds

Replace the fixed `windowHalfWidthRad` with a bounds-derived window.

Direction:

- use the same transfer-apsis concepts that feed scalar bisection bounds
- map allowed transfer apsis radii/speeds into lead-angle bounds
- make the visible timing band mean "worth trying the exact simulation"
- keep exact solver failure possible near the edges

This stage is intentionally deferred so Stage 1 can be implemented, tested, and inspected first.

## Current Decisions

- Use selected source/destination mass radius for the optimal timing point, not only barbell CM radius.
- Develop barbell-to-barbell timing first.
- Do not use a fixed `10s` timing window.
- Stage 1 will use a fixed angular window as a temporary prototype.
- The real later goal is a window derived from the same physical bounds as the bisection search.
- If the bar is visible near the edge of its range, the game may still fail after launch; that is acceptable and should
  be explained by the exact solver failure message.
- Planet disposal can show as always perfect/100% for now because it is not a normal intercept timing problem.

## Open Questions

1. What is the correct derivation from apsis bounds to a phase/timing window?
   - We need to map allowed transfer apsis radii/speeds into lead-angle bounds.
   - This should line up conceptually with the scalar bisection bounds, but it may not be identical because the exact
     solver simulates moving endpoints.
2. Should the first prototype include a temporary fixed angular window while the bounds-derived derivation is developed?
3. Should the quality bar peak exactly at the circular endpoint-to-endpoint Hohmann phase, or should it peak at the
   center of the bisection-derived feasible phase interval if those differ?
4. How should the UI phrase edge cases where the bar is present but exact launch fails?
