# Beanstalk Conductor Scalar Transfer Refactor

## Status

The normal adjacent-stage scalar transfer solver is implemented in the prototype.

Implemented:

- scalar tangent release correction
- radial miss figure of merit at angular crossing
- bracket search plus bisection
- explicit solver blackout/failure result
- game-side blackout handling with an `Admiral Voss` message
- runtime transfer simulation remains authoritative after launch
- release detachment conserves linear and angular momentum
- correction recoil changes source barbell center-of-mass velocity and angular velocity
- capture at an offset grab position conserves linear and angular momentum before adding mass to endpoint fill
- final upmass transfer to fixed circular-orbit `Fleet Central`
- final downmass release/load from `Fleet Central`
- final downmass disposal solve using perigee vs planet surface
- hard game-over detection for tether collisions with `Civic Prime` or `Fleet Central`

Not yet implemented:

- full source/queue model beyond the current direct 12-ton source-load prototype
- complete dialog matrix for success, cost, blackout, profit, and disposal events

The next direction is playability polish and feedback around the now-targetable `Fleet Central` loop: source/feed
clarity, vBucks consequences, Admiral Voss dialog, and better first/last transfer messaging.

## Current decision state

The transfer solver has been refactored away from the earlier 2D correction-vector model into the scalar release
correction model described here.

The intended game model is:

- the payload releases from a source endpoint
- the neutral release velocity is the source endpoint velocity
- any correction is a scalar amount of extra velocity along the local orbital tangent
- the solver drives a scalar figure of merit to zero
- the game simulation after release is authoritative; it should not precompute a separate final state and snap to it

This better matches the physical meaning of a tether release: the endpoint provides a velocity direction, and the game
adds or subtracts along that direction rather than inventing arbitrary sideways velocity.

## Solver model

The normal transfer solve should use:

- input variable: scalar release correction
- trial initial velocity: `sourceEndpoint.velocity + tangentDirection * scalarCorrection`
- propagation: payload under central `1/r^2` gravity
- target propagation: target only, not the whole beanstalk system
- stop condition: payload passes the target's angular position around the planet
- figure of merit: signed radial miss at angular crossing

For normal barbell-to-barbell transfers:

```text
FOM = radius(payload at angular crossing) - radius(target endpoint at angular crossing)
```

The desired root is:

```text
FOM(correction) = 0
```

The solver can use bracketed bisection or a bracketed secant/Newton hybrid. Robustness matters more than speed because
the transfer count is low and the game is slow paced. The solver should be comfortable with a tolerance around `0.001`
simulation units, separate from gameplay capture tolerance.

## Solver blackout cases

Some timing choices may have no practical scalar root, or the root may require an unbounded or absurd correction. A
simple geometric warning case is when the local tangent from the release endpoint intersects the target radial line below
the target altitude for an up-transfer. In that case the low-energy root may not exist from the current timing, and a
root solver can fail by exhausting its search bounds or iteration count.

The game should treat this as a normal operational failure mode, not necessarily a code error. In ideal conditions the
player can wait for another orbital phase and try again. In degraded conditions the system may repeatedly fail to offer
a useful release window, which is a plausible "going to hell" state for the beanstalk.

Implementation requirements:

- detect solver failure explicitly
- distinguish "no bracket/root found" from ordinary high-cost success
- do not invent an arbitrary transfer if the scalar solve fails
- notify the player visually that the timing is blacked out or no valid release is currently available
- let `Admiral Voss` react without claiming certainty about the physical cause
- keep the language cagey: the likely meaning is a bad release window, but the broader system may simply be too degraded

## Simulation scope

The solver's trial simulation should not simulate the whole game state.

For a normal transfer it only needs:

- the released payload
- the target barbell rigid body
- central `1/r^2` gravity

Other barbells do not gravitationally influence the payload or target in the current model. The source barbell only
matters at the release instant because it provides source endpoint position and velocity.

The live game simulation still advances the full system after the payload is released.

## State and recoil audit

The minimal independent state for a barbell is:

- center of mass position
- center of mass velocity
- angular position
- angular velocity
- fixed tether length
- endpoint dry masses
- endpoint fill masses for upmass and downmass

Endpoint positions and endpoint velocities are derived from those variables. They are not independent state.

Release correction now gives the payload extra tangent velocity and applies the balancing recoil to the source barbell by
conserving total linear and angular momentum across the detach event.

The correct direction is not to directly add velocity to one endpoint as though the tether could stretch. A rigid barbell
should receive release recoil as:

- a center-of-mass velocity change from net impulse
- an angular velocity change from torque impulse about the center of mass

That preserves the fixed tether length because endpoint velocities remain derived from the rigid-body state. This matters
especially when the correction tangent is not parallel to the current endpoint velocity or not perpendicular to the tether.

Capture is modeled as an arm grab: the payload may be at a different position than the target endpoint when the angular
catch happens. The payload's actual position and velocity are included in the conservation calculation, then the payload
mass is represented as endpoint fill after the instant capture.

Current mass categories:

- infrastructure mass: dry endpoint mass, currently 80 tons per endpoint as a placeholder
- dynamic payload mass: upmass/downmass units, currently 12 tons for early play testing

The gameplay should not treat the old prototype seed mass as a third category. Initial barbells now start empty; the
player first loads a fresh 12-ton upmass from `Civic Prime` or a fresh 12-ton downmass from `Fleet Central`.

## Catch criteria

The catch should happen when the payload crosses the destination angular position around the planet.

This is more stable than a circular capture radius because angular crossing is expected within an orbit, while a distance
gate can trigger too early or at the wrong point in the trajectory. The catch result then uses the payload and target
states at that crossing.

Position miss and relative velocity are not hard failure by default. They become cost, admiral reaction, and eventual
wobble.

## Destination types

The solver should share one transfer interface across destination types:

```ts
type TransferDestination =
  | { kind: 'barbell-end'; barbell: BarbellState; endpoint: EndpointKey }
  | { kind: 'fixed-orbit-station'; orbitRadius: number; phaseRad: number; angularVelocity: number }
  | { kind: 'planet-surface-disposal'; planetRadius: number };
```

This exact TypeScript shape can change during implementation, but the concept should hold: each destination provides a
figure of merit and any target state needed at the catch/resolution point.

## Normal adjacent-stage transfers

Normal upmass/downmass movement between barbell stages should use the scalar angular-crossing solve.

The target is a moving barbell endpoint. The target barbell is simulated because its two endpoints experience different
central gravity and therefore can rotate/wobble.

The figure of merit is radial miss at the angular crossing.

## Physical source-origin transfers

The current prototype source-load behavior is not physically acceptable. `Civic Prime` and `Fleet Central` source loads
must not use decorative feed paths or instant endpoint fills. They should be treated as ordinary one-active-payload
transfers whose launch velocity is computed by the same scalar tangent-transfer machinery used for barbell transfers.

The player-facing rule should remain simple:

- the source is selectable only when its intended destination endpoint has an open slot for that mass kind
- pressing Enter/Space commits the launch at the current time
- if no usable prograde scalar root exists, the source remains selectable and Admiral Voss reports the failed launch
  window
- while the source-origin payload is in flight, no other player action is accepted
- the visible dot is always the simulated payload position, never an interpolation path
- catch/resolution uses the same angular-crossing and endpoint-attachment logic as normal transfers
- these two source-origin launches are special infrastructure cases: no correction charge, no source recoil, and no
  catch penalty should be applied

### Civic Prime upmass launch

`Civic Prime` is a fixed surface source, not a barbell. The launcher source state should provide:

- position: the surface launcher position returned by `createSurfaceLauncherState`
- velocity: zero; the planet is static and surface rotation is not modeled
- tangent direction: the prograde tangent at the launcher radius, perpendicular to the local radial vector
- destination: the current lower-radial endpoint of the first barbell
- figure of merit: radial miss at the destination angular crossing, matching normal barbell-to-barbell transfers

The solved launch velocity should be:

```text
payloadInitialVelocity = source.velocity + sourceTangentDirection * scalarCorrection
```

For the surface launcher, `scalarCorrection` is effectively the mass-driver muzzle velocity along the local horizontal
tangent. The correction must be prograde. If the solver only finds a retrograde solution or cannot bracket a useful
prograde scalar root, that launch window is a bust and the game should report the failed window instead of firing.

The surface launcher is infrastructure attached to the planet. For the first physical-source implementation, it should
not apply recoil to `Civic Prime`; the planet is treated as an external massive body. The source-origin correction also
should not cost vBucks. This is an explicit exception to the normal transfer-cost rules.

### Fleet Central downmass launch

`Fleet Central` is a fixed circular-orbit source. The downmass source state should provide:

- position and velocity from `getFleetCentralState`
- tangent direction from the station's circular-orbit velocity direction
- destination: the current higher-radial endpoint of the last barbell
- figure of merit: radial miss at the destination angular crossing

The solved launch velocity should be:

```text
payloadInitialVelocity = fleetCentral.velocity + fleetTangentDirection * scalarCorrection
```

This makes Fleet Central downmass generation a real orbital release instead of an endpoint fill. Fleet Central already
has orbital velocity, so the scalar correction may be positive or negative relative to the station's velocity direction.
The resulting payload velocity must still be prograde around the planet. If the solved launch would make the payload
retrograde, the launch window is invalid.

This source-origin release should not charge a correction cost or catch penalty. The revenue/cost flow for this case is
already tied to downmass generation, so adding a separate release penalty is unnecessary complexity for the first
implementation. The payload must still visibly travel under the central gravity model and catch by the normal
angular-crossing mechanism.

Fleet Central is effectively massive and prescribed-orbit. As with Civic Prime, the first implementation should not
apply recoil to the station. If recoil or station stationkeeping becomes relevant later, it should be modeled as money
or dialog rather than perturbing the fixed station orbit.

### Source abstraction

The solver should grow a source interface parallel to the destination interface. A possible shape is:

```ts
type TransferSource =
  | { kind: 'barbell-end'; barbell: BarbellState; endpoint: EndpointKey }
  | { kind: 'fixed-surface-launcher'; position: Vec2; velocity: Vec2; tangentDirection: Vec2 }
  | { kind: 'fixed-orbit-station'; position: Vec2; velocity: Vec2; tangentDirection: Vec2 };
```

The exact TypeScript shape can change, but the core requirement is that `createTransferLaunch` and
`solveTransferCorrection` no longer assume every source has a source barbell. They should ask the source for initial
position, initial velocity, tangent direction, and whether recoil should be applied.

### Implementation sequence

1. Extend `TransferTarget` or replace it with a transfer command object that can represent source kinds as well as
   destination kinds.
2. Add helper functions for source state:
   - `getTransferSourceState(state, target)`
   - `getSurfaceLauncherTransferSource(state)`
   - `getFleetCentralTransferSource(state)`
3. Refactor the scalar solver setup to use source state instead of directly looking up a source barbell endpoint.
4. Keep barbell endpoint releases behavior-preserving by applying the existing detach/recoil path only for
   `barbell-end` sources.
5. For fixed source launches, create the active payload directly from source state with the solved tangent correction.
6. Reject any launch root whose final payload velocity is retrograde around the planet. For `Civic Prime`, the scalar
   correction itself must also be prograde.
7. Convert `source-load` opportunities from `durationSeconds: 0` decorative feeds to normal active transfers with a
   solver duration comparable to adjacent-stage transfers.
8. Remove `activeSourceLoad`, `drawSourceLoadPayload`, and any Bezier/feed animation once the real source transfers are
   implemented.
9. Keep source occupancy rules strict:
   - Civic Prime only targets the current lower-radial first-stage endpoint
   - Fleet Central only targets the current higher-radial last-stage endpoint
   - a source opportunity is not selectable if that target endpoint already has the same mass kind
10. Add regression tests:
   - Civic Prime launch creates an active payload and does not instantly fill the endpoint
   - Civic Prime launch has zero source velocity, prograde tangent correction, no recoil, and no correction cost
   - Fleet Central downmass launch creates an active payload and keeps the resulting payload velocity prograde
   - Fleet Central downmass launch applies no source recoil, no correction cost, and no catch penalty
   - the active source-origin payload follows `stepSystem` positions between launch and catch
   - no source-origin transfer is offered when the target slot is occupied
   - no decorative source-load path remains in the game renderer
11. Validate with `npm run test` and `npm run build`, then play the first upmass and first downmass source-origin
    launches to check that the dot follows a plausible orbital arc.

### Settled source-origin decisions

- `Civic Prime` is static. Do not model planet rotation.
- `Civic Prime` launches only prograde. A retrograde scalar root is invalid.
- `Fleet Central` launches must result in prograde orbital motion. Its correction may be positive or negative relative
  to the station velocity because the station already has a large prograde circular velocity.
- Apply the same prograde-result guard to ordinary barbell transfers as a future cleanup if retrograde transfer roots
  become possible there.
- Do not charge correction cost for the two source-origin launches.
- Do not apply recoil to `Civic Prime` or `Fleet Central` for source-origin launches.
- Do not add a source-origin catch penalty for these cases in the first implementation.
- A source-origin miss is not an intended state. The solver should simulate ahead and root-find the required release
  velocity; if that solve is not available, do not launch.

## Final upmass transfer

`Fleet Central` is a massive fixed-orbit destination above the top tether.

It should be:

- a visible station/yard marker, not a fourth barbell
- on a prescribed circular orbit
- effectively unperturbed by catches
- the source of infinite downmass
- the final destination for upmass

The final upmass transfer should reuse the scalar angular-crossing solver. The target state comes from a circular-orbit
function instead of a simulated barbell endpoint.

The figure of merit is:

```text
FOM = radius(payload at angular crossing) - FleetCentralOrbitRadius
```

Once a final upmass transfer reaches `Fleet Central`, revenue is booked. There should be no extra delivery penalty for
unintended relative velocity or position at the station; if the station is targetable and the payload reaches the
defined target condition, the fleet accepts it.

## Final downmass generation

Downmass is generated from `Fleet Central`, not from a hidden intermediate source.

Downmass release rules:

- the player chooses the timing
- the downmass cost is booked immediately on release
- bad timing can add release-correction cost in vBucks
- the downmass then travels downward through the beanstalk stages or to final disposal, depending on the selected action

There is no positive delivery revenue for downmass. It exists to balance the physical mass flow and recover orbital
losses, but economically it is trash handling.

## Final downmass disposal

Downmass is treated as trash for the economy. It does not earn money.

However, downmass must actually be disposed of onto the planet. If it misses the planet and remains in orbit, that is
not valid disposal. This is not a normal endpoint catch: the payload has to enter a disposal orbit whose perigee
intersects `Civic Prime`.

The final downmass special case should use a perigee figure of merit:

```text
FOM = payloadPerigeeRadius - planetRadius
```

Desired result:

```text
FOM <= 0
```

Because this is one-sided:

- first test neutral release
- if neutral release already has perigee below the planet surface, no correction is needed
- if neutral release has perigee above the surface, solve for the minimum correction that puts perigee at the surface

This should reuse the same scalar-solve infrastructure where practical, but the stopping/evaluation condition is perigee
rather than angular crossing.

## Catastrophic collision detection

The live game loop should detect hard physical failures that are not just accounting problems:

- any tether segment intersects `Civic Prime`
- any tether segment intersects `Fleet Central`

These should end the run because the infrastructure has physically crashed. Each case should also fire an achievement.
The player can already see wobble visually, so ordinary wobble does not need a separate warning system right now.

## Open questions

No blocking design questions are open for the next refactor.

Implementation choices still to tune:

- exact scalar solver strategy: bracketed bisection first, or bracketed secant/Newton hybrid
- correction search bounds
- whether tangent correction may be positive and negative, or if each destination type restricts sign
- how large catch costs should be after radial miss and relative velocity are computed
- how to visualize Fleet Central and final disposal clearly
- when to introduce the final transfer destinations into the playable loop
- later RK4 integration upgrade after the destination/economy rules are stable
