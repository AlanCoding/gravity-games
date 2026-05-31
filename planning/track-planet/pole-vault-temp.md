# Track Planet Pole Vault Temporary Plan

This is a temporary note for the current pole-vault refactor.

## Desired behavior

- pressing the pole-vault control should not trigger an immediate launch
- the runner should follow an arc while the pole vault is converting horizontal motion into vertical motion
- the conversion should take about 1 to 2 seconds
- the pole visual should remain visible during that conversion
- the pole should be a simple visual prop, not a real physics object

## Temporary implementation idea

- spawn a lazy cylinder pole beside the runner
- keep it attached while the vault is charging
- gradually shift the player’s velocity from tangent to vertical
- only finish the vault once the conversion completes
- remove the pole prop after the vault resolves

## Non-goals

- do not add a separate pole physics simulation yet
- do not add bending pole behavior yet
- do not make the pole itself control the launch by collision

## Exit condition

This note should be removed or replaced once the pole vault mechanic is implemented as a proper gameplay system.
