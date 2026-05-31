# Cislunar Reference Habitat - Physical Description v0.1

## Purpose

This document defines the physical game-world reference case independent of the asset pipeline, renderer, or physics engine. The target game is a Three.js browser application showing a cislunar pressure-sphere habitat with multiple parallel rotating habitat tubes inside a breathable-air macro-volume.

The design is intentionally not an asteroid-pressure case. The outer pressure boundary is a large visible sphere. The rotating tubes sit inside it and are connected through non-rotating access-throat structures.

## Coordinate system

Use meters.

```text
X axis = tube axis and rotation axis
Y axis = horizontal lattice coordinate
Z axis = vertical lattice coordinate
Origin = pressure sphere center
All habitat tubes are parallel to X.
```

Each tube centerline lies at:

```text
(x, y_i, z_i), with x varying along the tube and (y_i, z_i) fixed.
```

The tube lattice pitch in the Y-Z plane is:

```text
1000 m
```

The pressure sphere is centered at the origin.

## Tube reference geometry

All tube types reuse the same gross shape.

```text
Inhabited floor radius:             250 m
Friction-buffer reserved radius:    350 m
Straight inhabited run length:      250 m
Access throat radius:                10 m
Taper angle:                         45 degrees
```

Because the 45-degree taper contracts from the large tube radius to the access throat:

```text
250 m floor radius -> 10 m throat radius: 240 m taper length per side
350 m buffer radius -> 10 m throat radius: 340 m taper length per side
```

Therefore:

```text
Floor-shape axial length ≈ 240 + 250 + 240 = 730 m
Full buffered-envelope axial length ≈ 340 + 250 + 340 = 930 m
Buffered half-length ≈ 465 m
```

This fits inside the 1 km axial allocation with approximately 35 m spare per end.

## Access and hazard geometry

Each tube has two semi-stationary access points, one at each end of the rotation axis.

```text
Left access node:  x ≈ -465 m
Right access node: x ≈ +465 m
```

Each access tunnel has radius 10 m.

The safety mesh/cage extends into the tube for:

```text
25% of total tube length
```

For the buffered envelope length of 930 m, 25% is approximately 232.5 m. For modeling simplicity use:

```text
Safety cage length: 230 m
```

The centerline remains mostly open. A sufficiently skilled player can fly through the open center, but strict physics applies; the game should not add fake gravity just to kill the player. Dangerous outcomes should arise from contact with rotating surfaces, bad approach velocities, poor control, and Coriolis effects.

## Rotation and acceleration

No artificial gravity force is applied in the physics model. The rotating floor produces apparent gravity through contact with a physically moving surface.

At 250 m radius:

```text
1g tube:
  target acceleration: 9.80665 m/s^2
  angular speed:       0.1981 rad/s
  rim speed:           49.5 m/s

Mars-g tube:
  target acceleration: 3.71 m/s^2
  angular speed:       0.1218 rad/s
  rim speed:           30.5 m/s

Moon-g tube:
  target acceleration: 1.62 m/s^2
  angular speed:       0.0805 rad/s
  rim speed:           20.1 m/s

Farming tube:
  target rim speed:    1/17 of 1g rim speed
  rim speed:           2.91 m/s
  angular speed:       0.01165 rad/s
  acceleration:        0.0339 m/s^2 ≈ 0.00346 g
```

Farming tubes have no accessible friction-buffer space. For placement and gross geometry, they still reserve the same 350 m envelope so tube bays remain interchangeable.

## Spin sign convention

Define `spinSign = +1` as right-hand rotation around the +X axis.

Equivalent visual convention:

```text
Looking from +X toward the origin, spinSign = +1 appears counterclockwise.
Looking from +X toward the origin, spinSign = -1 appears clockwise.
```

For every tube type, the count of `spinSign = +1` tubes equals the count of `spinSign = -1` tubes.

## Candidate pressure-sphere radii

The table below assumes:

```text
1000 m Y-Z lattice pitch
350 m reserved tube radius
930 m full buffered axial length
10 m access throat
parallel X-axis tubes
```

A lattice site is counted only if the full tube envelope fits inside the pressure sphere.

| Pressure sphere radius | Complete lattice sites | Interpretation |
|---:|---:|---|
| 1500 m | 5 | Too small; only center plus four axial neighbors. |
| 1800 m | 9 | Close to target, but odd rotating count unless the center is not a tube. |
| 2000 m | 9 | Same count as 1800 m with more empty breathing room. |
| 2400 m | 13 | First satisfying non-rectangular cluster; supports 12 rotating tubes plus central hub. |
| 2500 m | 13 | Recommended; same count as 2400 m but with better visual and modeling clearance. |
| 2600 m | 21 | Larger future expansion; probably too many tubes for the first playable version. |
| 3000 m | 21 | Same count as 2600 m, more empty space. |

## Recommended pressure sphere

Use:

```text
Pressure sphere radius: 2500 m
```

This gives a clean 13-site spherical lattice cutoff. Use the center site as a non-rotating microgravity transit nexus, not as a rotating tube. That leaves 12 rotating tubes, keeping all tube-type spin counts balanced.

## Recommended 13-site spherical lattice

The complete lattice sites at radius 2500 m are:

```text
Center:
  (Y, Z) = (0, 0)

First ring:
  (Y, Z) = (+1000, 0)
  (Y, Z) = (-1000, 0)
  (Y, Z) = (0, +1000)
  (Y, Z) = (0, -1000)

Diagonal ring:
  (Y, Z) = (+1000, +1000)
  (Y, Z) = (+1000, -1000)
  (Y, Z) = (-1000, +1000)
  (Y, Z) = (-1000, -1000)

Outer axial ring:
  (Y, Z) = (+2000, 0)
  (Y, Z) = (-2000, 0)
  (Y, Z) = (0, +2000)
  (Y, Z) = (0, -2000)
```

This is not a rectangular rack. It is a circular/spherical cutoff of a square lattice, producing a more satisfying clustered shape.

## Recommended tube assignment

Use the center site for a non-rotating microgravity transit hub.

Use 12 rotating tubes:

```text
6 one-g tubes
2 Mars-g tubes
2 Moon-g tubes
2 farming tubes
```

This preserves the intended “about 50% one-g” feeling while keeping every rotating type spin-balanced.

| ID | Type | Center `(x,y,z)` m | Axis | Spin sign |
|---|---|---:|---|---:|
| HUB_00 | microgravity transit nexus | `(0, 0, 0)` | none | 0 |
| G_01 | one_g | `(0, +1000, 0)` | +X | +1 |
| G_02 | one_g | `(0, -1000, 0)` | +X | -1 |
| G_03 | one_g | `(0, 0, +1000)` | +X | +1 |
| G_04 | one_g | `(0, 0, -1000)` | +X | -1 |
| G_05 | one_g | `(0, +2000, 0)` | +X | -1 |
| G_06 | one_g | `(0, -2000, 0)` | +X | +1 |
| MARS_01 | mars_g | `(0, +1000, +1000)` | +X | +1 |
