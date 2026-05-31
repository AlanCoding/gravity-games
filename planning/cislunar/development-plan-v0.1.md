# Cislunar Habitat Three.js Development Plan v0.1

## Goal

Build a Three.js browser game showing a cislunar pressure-sphere habitat with multiple parallel rotating tubes. The game should eventually support walking, car-like center-of-mass vehicle motion, microgravity craft flight inside the pressure sphere, and spaceship docking outside the pressure sphere.

The project must remain reversible between custom physics and Rapier-based physics. Do not make the asset pipeline or world data depend on a single physics engine.

## Core principle

Separate the project into four layers:

```text
1. Physical description
2. World definition data
3. Asset generation / visual manifestation
4. Runtime physics and gameplay
```

The physical description is engine-agnostic. The world definition encodes coordinates and parameters. The asset-generation layer creates visible geometry. The runtime layer decides whether custom physics, Rapier, or a hybrid approach is active.

## Recommended repository shape

```text
habitat-game/
  public/
    assets/
      glb/
      textures/
    worlds/
      cislunar_reference_001.json

  tools/
    generate_world.py
    validate_world.py
    blender_export_from_world.py
    preview_world_layout.py

  src/
    world/
      loadWorld.ts
      validateWorld.ts
      types.ts

    render/
      createScene.ts
      loadTemplates.ts
      instantiateHabitat.ts
      lodRules.ts

    physics/
      PhysicsBackend.ts
      CustomPhysicsBackend.ts
      RapierPhysicsBackend.ts
      NullPhysicsBackend.ts

    gameplay/
      playerController.ts
      vehicleController.ts
      dockingController.ts
```

## File responsibilities

### Physical description file

This is a human-readable document. It says what the habitat is physically supposed to be.

It includes:

```text
coordinate system
tube dimensions
pressure sphere radius
tube placement
rotation rates
access-throat geometry
structural-support attachment rules
airlock/docking assumptions
```

It does not assume Blender, Three.js, Rapier, or any specific asset format.

### World definition JSON

This is the machine-readable scene spec.

It should include:

```text
units
coordinate axes
pressure sphere
tube list
tube type
tube center
tube axis
spinSign
angularSpeed
template references
access geometry references
render tags
physics tags
```

This file is the bridge between the physical description and runtime code.

### Template assets

Use reusable templates for:

```text
one-g tube visual shell
Mars tube visual shell
Moon tube visual shell
farming tube visual shell
access throat
safety mesh
lattice beam
pressure sphere
docking port
warning signs
```

The first version can use extremely simple geometry. The hard part is not art quality; the hard part is making the coordinate system and motion rules correct.

## Asset format recommendation

Use `.glb` for runtime Three.js assets.

Use Blender files only as editable source assets, not as runtime assets.

```text
Editable source:
  .blend files
  Blender Python scripts
  procedural geometry scripts

Runtime output:
  .glb files
  .json world files
  texture images
```

## Four manifestation options

### Option A: Three.js procedural-first

The world JSON is loaded directly by Three.js. Tubes, tapers, simple shells, beams, and sphere are generated procedurally in JavaScript/TypeScript.

Pros:
```text
Fastest iteration
No Blender dependency
Coordinates stay transparent
Best for early physics tests
```

Cons:
```text
Cruder art
Harder to make nice mesh details
Complex geometry code can become messy
```

Best use:
```text
Initial layout viewer
Physics experimentation
Coordinate validation
```

### Option B: Blender template assets plus JSON placement

Blender is used to create a small number of reusable `.glb` templates. Three.js loads the world JSON and instances the templates at the specified coordinates.

Pros:
```text
Good balance
Reusable assets
Game code owns placement
Easy to revise layout
```

Cons:
```text
Template origin/orientation discipline matters
Must enforce naming and scale conventions
```

Best use:
```text
Main recommended path for the first real playable scene
```

### Option C: Blender script generates the whole scene from JSON

A Blender Python script reads the world JSON, creates the tubes/supports/sphere, and exports a full-scene `.glb`.

Pros:
```text
Good for static previews
Easy to hand to artists/modelers
Can generate nicer baked overview scenes
```

Cons:
```text
Danger of duplicating runtime logic
Large monolithic GLB may become awkward
Less ideal for dynamic rotating objects
```

Best use:
```text
Offline previews
Screenshots
Static art pass
Checking whether the habitat looks right
```

### Option D: Hybrid generated shell plus runtime gameplay assets

Use Blender or scripts to generate the large static macro-scene, but keep rotating tubes, vehicles, and interactive pieces as separate runtime-loaded assets.

Pros:
```text
Better visual control for the macro habitat
Still allows runtime motion and physics control
```

Cons:
```text
More pipeline complexity
Requires clear ownership of which object is static versus dynamic
```

Best use:
```text
Later version after the viewer proves the layout
```

## Recommended first pipeline

Start with Option A and Option B in parallel, but keep them using the same world JSON.

```text
Phase 1: procedural Three.js layout viewer
Phase 2: replace procedural primitive meshes with GLB templates
Phase 3: add static rotation animation of tubes
Phase 4: add custom player/vehicle motion
Phase 5: test Rapier as a backend, without committing to it
```

Do not introduce Rapier as the owner of the world model. It should be one backend behind an interface.

## Physics strategy

The game needs actual rotating surfaces and strict inertial behavior. This is a poor match for a black-box physics setup if the library assumes ordinary static gravity-world assumptions.
