# Jacob's Ladder

## Core idea

Jacob's Ladder is a future gravity game about a series of tethers in an orbital plane that move mass up and down.

The mechanical premise is deliberately physical:

- the scene has tether structures in a shared orbital plane
- the game pre-computes trajectories to make exact hits to one side of a barbell tether
- mass climbs the barbell after impact
- the motion should be physically accurate rather than arcade-faked

## Intended humor

The game is supposed to be funny because of the torsional absurdity it creates in the coupled masses:

- up-mass and down-mass are both real mechanical participants
- the system should visibly fight itself through torsion, load transfer, and timing mismatch
- the absurdity comes from the fact that the exact physics are doing the comedy work

## Design direction

- keep the motion predictable enough that shots can be planned
- keep the mass transfer and tether response physically credible
- let the player work from exact launch geometry rather than random chaos
- favor clear orbital-plane mechanics over fake gravity systems

## Early questions to solve

- what is the minimal tether/barbell geometry that still reads clearly
- how much pre-computation the player gets before a launch
- whether the player controls launch timing, launch angle, or both
- how the game shows tension, torsion, and transfer state

## Relation to other games

Jacob's Ladder is a separate game idea from Track Planet and should keep its own notes, assets, and planning space under `planning/jacobs-ladder/`.
