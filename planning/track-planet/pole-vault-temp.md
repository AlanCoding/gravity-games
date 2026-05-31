# Track Planet Pole Vault Temporary Note

This is a historical note for the simplified pole-vault mechanic. The first implementation is complete and belongs to
the mostly finished Track Planet core game.

## Implemented behavior

- pressing the pole-vault control should not trigger an immediate launch
- the runner should follow an arc while the pole vault is converting horizontal motion into vertical motion
- the conversion should take about 1 to 2 seconds
- the pole visual should remain visible during that conversion
- the pole should be a simple visual prop, not a real physics object
- once horizontal velocity reaches zero, the pole should disappear even if the control is still held
- the conversion should only be available while the runner is on the surface
- if the runner hits the ground during the conversion, the vault ends

## Implementation model

- spawn a simple cylinder pole beside the runner
- keep it visible while horizontal velocity is being converted
- gradually shift the player’s velocity from tangent to vertical
- only finish the vault once the conversion completes
- remove the pole prop after the vault resolves

## Non-goals

- do not add a separate pole physics simulation yet
- do not add bending pole behavior yet
- do not make the pole itself control the launch by collision

## Status

The first iteration of the basic pole-vault mechanic is complete. Future work should only revisit this file if the
mechanic is being redesigned, for example with a more physical pole or a different input model.
