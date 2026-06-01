# Beanstalk Conductor

## Core idea

Beanstalk Conductor is the current working title for a future gravity game about a series of tidally locked barbell
spacecraft in a shared orbital plane that move mass up and down a gravity well. Earlier notes used "Jacob's Ladder",
but that phrase is overloaded and may not be the right game title. "Beanstalk" better matches Hop David's terminology
for moon elevators and "Conductor" points at the timing/railroad role the player actually has.

The starting body should be a generic fictional planet rather than Earth, because the first launch is a surface space
gun. The space-gun launch is visually clear and useful for the game even though it would be unrealistic for an Earth
launch.

The mechanical premise is deliberately physical:

- the scene has multiple barbell spacecraft in a shared orbital plane
- each barbell has two endpoint masses and a tether between them
- the ideal starting state is tidally locked, not freely rotating
- Hohmann-style transfers move upmass and downmass from one stage to the next
- transfers move only between adjacent stages
- the player controls only timing decisions that would actually be controllable
- the simulation should use real orbital and rigid-body bookkeeping rather than arcade shortcuts

The central input is timing. The player chooses when to start the next progression, such as:

- a space-gun launch
- a release from a tether endpoint
- a move across a tether

While a transfer is happening, the player does nothing. The screen can be effectively frozen from an input perspective
while the simulation plays the transfer out in real time.

The player should not choose a launch angle or target manually. The game computes a transfer that aims at the lower
endpoint of the next stage tether at the opposite side of the orbit, equivalent to the 180-degree Hohmann-transfer
picture in the ideal case. The player chooses when to commit that computed transfer.

Reference checkpoints:

- Primary reference: Hop David, "Mini Solar Systems": https://hopsblog-hop.blogspot.com/2013/01/mini-solar-systems.html
- Secondary reference: Hop David, "Tran Cislunar Railroad": https://hopsblog-hop.blogspot.com/2016/08/tran-cislunar-railroad.html

The primary reference discusses transfer ellipses between Saturn moon beanstalks and Galilean moon beanstalks, with
tidally locked moons and planet-moon L1/L2 regions as the conceptual anchor. The cislunar railroad reference describes a
three-tether Earth/cislunar concept. This game is not locked to three stages. The stage count should be chosen for game
feel, readability, and pacing. Three stages may be enough, but the game can use more if that makes the ladder more
satisfying.

## Intended humor

The game is supposed to be funny because the ideal differential concept works cleanly at first, then the exact
simulation causes the machinery to wobble under the consequences of its own mass transfers:

- up-mass and down-mass are both real mechanical participants
- early transfers make money and appear elegant
- later transfers disturb the barbell masses, moments of inertia, angular velocities, and velocity vectors
- the system should visibly fight itself through wobble, load transfer, and timing mismatch
- the comedy comes from the physics doing the damage honestly

This should be framed as a space-tycoon problem. A space admiral customer watches from the corner of the UI and reacts
emotionally to performance, damage, and failed deliveries.

The underlying real-world control problem is intentionally not solved here. The game should expose the absurdity instead
of hiding it.

## Design direction

- keep the motion predictable enough that shots can be planned
- keep the mass transfer and tether response physically credible
- let the player work from exact launch geometry rather than random chaos
- favor clear orbital-plane mechanics over fake gravity systems
- keep the pace slow and readable
- only one active transfer should happen at a time
- require multiple stages from the first playable prototype

## Player controls

The player does not directly steer spacecraft. The player chooses timing for the selected upmass or downmass.

Allowed control:

- select an available upmass or downmass
- trigger the next progression at a chosen time

Not allowed, at least initially:

- arbitrary steering
- changing launch angle by hand
- directly stabilizing a barbell
- manually solving the barbell control problem

Barbells may theoretically be influenced by moving endpoint masses in and out, but that control space is explicitly out
of scope for the first game design.

## Barbell physics

Each barbell is modeled as:

- two endpoint masses
- a tether between them
- orbital position and velocity
- angular velocity
- moment of inertia derived from the endpoint masses and tether geometry

The simulation should update:

- mass distribution when upmass or downmass is added or removed
- moment of inertia after mass changes
- angular velocity after mass changes and transfer events
- orbital velocity vectors

The simulation should not attempt full tether material physics. Real tethers have additional constraints that are ignored
for this game. The important parts are the masses, velocity vectors, angular velocity, and moment of inertia.

The initial tutorial/calibration version may ignore perturbations and hold the ideal barbell orientations/orbits fixed
to show the clean theoretical transfer. The real simulation should then allow those transfers to disturb the system.

Tether length is not arbitrary. In the clean design, each tether length should be chosen so the endpoint release velocity
puts payloads into the intended transfer window. There will still be some relative velocity at catch even in the ideal
case, and that relative velocity should get worse as accumulated perturbations build up during play.

## Economy

The objective is to make money by delivering mass out of the gravity well.

Money rules:

- each successful upmass delivery from the surface to a destination radius earns money
- a failed delivery costs a penalty
- relative velocity at catch time costs money as equipment damage
- downmass costs money
- downmass and upmass must physically match, but downmass should cost less than upmass earns
- a working starting ratio is that downmass costs about one quarter as much as equivalent upmass earns

This creates the tycoon loop:

- move mass upward
- collect delivery revenue
- absorb downmass cost and equipment damage
- keep the ladder functioning long enough to remain profitable

Everything should ultimately map to money rather than hard failure. A bad transfer can still attach, cause damage, and
make the simulation wobble badly. The player loses money and watches the system degrade rather than getting a clean
"game over" immediately.

## Catch and prediction model

Each transfer has a specific precomputed target:

- upmass/downmass starts from the current stage
- the game predicts the next-stage endpoint state into the future
- the transfer is generated to intercept the lower endpoint of the adjacent stage
- the visual simulation then plays out the same model
- the transfer resolves once the payload enters a capture radius around that endpoint

The catch should allow tolerance. If the payload enters the capture radius, it attaches. Any relative velocity at the
moment of catch is reported as equipment damage and converted into a money cost.

The first prototype should show the happy path only. It does not need timing-window UI, failure bands, or full
probability-style preview. The player sees the computed transfer that the game intends to execute, then chooses the
timing.

## Transfer occupancy

There can be multiple upmasses and downmasses in the system, but for visual and gameplay simplicity:

- no more than one object can occupy a given stage for each mass direction
- an upmass and a downmass may occupy the same position at the same time
- an upmass cannot occupy the same position as another upmass
- masses of the same direction cannot pass through each other
- while a transfer is active, no new player action is accepted

The player should always be choosing between currently available upmass/downmass timing opportunities rather than
managing many simultaneous moving pieces.

## First playable shape

The first playable version must include multiple barbell stages. A single-stage prototype is not enough to express the
ladder concept.

The early flow should be:

- calibration/tutorial shows the clean theoretical toss from one stage to the next
- the first real simulated transfer works well
- subsequent transfers naturally accumulate wobble and damage
- the admiral's reaction makes the degradation legible and funny

## Early questions to solve

- how many stages the first playable version needs
- what orbital radii those stages use
- whether every stage is visually identical or whether stage size changes with radius
- what exact timing UI the player uses
- how much trajectory preview the player gets before committing
- how catch damage maps from relative velocity to money loss
- how failed delivery penalties are computed
- how the admiral's emotional state maps to profit, damage, and chaos

## Relation to other games

Beanstalk Conductor is a separate game idea from Track Planet and should keep its own notes, assets, and planning space
under `planning/jacobs-ladder/` unless the folder is renamed later.
