# Jacob's Ladder

## Core idea

Jacob's Ladder is a future gravity game about a series of tidally locked barbell spacecraft in a shared orbital plane
that move mass up and down a gravity well.

The mechanical premise is deliberately physical:

- the scene has multiple barbell spacecraft in a shared orbital plane
- each barbell has two endpoint masses and a tether between them
- the ideal starting state is tidally locked, not freely rotating
- Hohmann-style transfers move upmass and downmass from one stage to the next
- the player controls only timing decisions that would actually be controllable
- the simulation should use real orbital and rigid-body bookkeeping rather than arcade shortcuts

The central input is timing. The player chooses when to start the next progression, such as:

- a space-gun launch
- a release from a tether endpoint
- a move across a tether

While a transfer is happening, the player does nothing. The screen can be effectively frozen from an input perspective
while the simulation plays the transfer out in real time.

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

Jacob's Ladder is a separate game idea from Track Planet and should keep its own notes, assets, and planning space under `planning/jacobs-ladder/`.
