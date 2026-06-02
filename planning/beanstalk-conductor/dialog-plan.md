# Beanstalk Conductor Dialog and Feedback Plan

## Purpose

Beanstalk Conductor needs player feedback that explains what happened without over-explaining the physics or pretending
the system knows more than it does.

The game loop is built around timing decisions. The player should learn from:

- solver success
- expensive transfers
- clean catches
- ugly catches
- solver blackout/failure windows
- accumulated wobble and degraded operations
- profit and loss

The feedback should come from a mix of UI event text, money popups, and `Admiral Voss` dialog.

The game front screen should offer `Back story`, `Tutorial`, and `Play`. `Play` jumps directly into the live loop.
Backstory and tutorial completion each unlock an achievement and should show a check mark on that front screen using the
same browser cookie achievement system.

## Tone

The dialog should be funny, bureaucratic, and slightly panicked without becoming random.

`Admiral Voss` is the customer representative for `Starward Logistics Command`. He cares about deliveries, fleet
construction, costs, wobble, and political consequences. He should not sound like the physics engine.

Good dialog:

- reacts to operational outcomes
- is specific enough to guide the player
- avoids overconfident technical diagnoses when the solver or system is degraded
- keeps the space-bureaucracy setting visible

Bad dialog:

- claims the exact cause of a failed solve when the game only knows the root search failed
- dumps internal solver terms into the main reaction text
- turns every event into the same joke

## Feedback layers

Use three layers of feedback:

1. HUD status
   - current money
   - selected transfer
   - transfer cost estimate or blackout state
   - current action state

2. Event popup
   - compact result text
   - examples: `-42 vBucks`, `+12 tons delivered`, `release window unavailable`

3. Admiral dialog
   - emotional/contextual reaction
   - changes based on recent result and total money

## Event categories

### Backstory complete

Trigger: player reaches the end of the backstory sequence.

Useful text:

- `Back story complete.`
- `Strategic context acknowledged.`

Admiral examples:

- `You have been briefed. That is normally where things begin to go wrong.`
- `Excellent. You now know exactly enough to be held responsible.`

### Tutorial complete

Trigger: player reaches the end of the tutorial/exhibition sequence.

Useful text:

- `Tutorial complete.`
- `Operational basics approved.`

Admiral examples:

- `The theory is elegant. Try not to improve it into bankruptcy.`
- `You have completed training. Fleet Central will now pretend this was sufficient.`

### Launch accepted

Trigger: player launches a transfer that solves.

Useful text:

- `Transfer authorized.`
- `Release computed.`
- `Public Beanstalk Works has committed the shot.`

Admiral tone:

- calm if cost is low
- wary if correction is high
- a near-zero correction should have a "perfection" reaction

Example vibes:

- near-zero correction: `That is the kind of timing I was promised in the brochure.`
- moderate correction: `Transfer authorized. The bill is acceptable.`
- high correction: `That was not timing. That was a purchase order with velocity.`

### Upmass source load

Trigger: `Civic Prime` loads a fresh upmass from the surface launcher onto the first stage.

Useful text:

- `Upmass loaded.`
- `Mass driver launch complete.`
- `Cargo is on the beanstalk.`

Admiral examples:

- `The mass driver has sent off my precious cargo. Take good care of it.`
- `That cargo is officially Starward property now, which means I will be asking about it constantly.`

### Solver blackout

Trigger: player attempts a transfer and the scalar solver cannot find a valid practical root.

The UI should say clearly that no release is available right now. The admiral should be cagey about cause.

Useful text:

- `No valid release window.`
- `Release window blacked out.`
- `No usable transfer solution at this timing.`

Admiral examples:

- `Hold. That window is not giving us a usable shot.`
- `I am not saying the system is doomed. I am saying do not press that button again yet.`
- `The Office will want a sentence about this. Preferably not a long one.`
- `I have been informed this is the engineers' fault. I accept that explanation.`

Avoid:

- `The tangent line is below the target.`
- `Newton failed.`
- `The system is impossible.`

### Clean catch

Trigger: catch with low radial miss, low relative velocity, and low cost.

Useful text:

- `Clean catch.`
- `Low-cost transfer.`
- `Payload secured.`

Admiral examples:

- `That looked almost like the brochure.`
- `Fleet Central will accept that with minimal grumbling.`
- `Clean enough. Do not make me learn the exact tolerance.`

### Expensive catch

Trigger: catch succeeds, but relative velocity or miss-derived cost is high.

Useful text:

- `Hard catch.`
- `Costly catch.`
- `Transfer succeeded at high cost.`

Admiral examples:

- `Successful, in the sense that accounting is still breathing.`
- `The payload arrived. So did several maintenance invoices.`
- `The catch worked. The invoice has chosen violence.`

### Profitable delivery

Trigger: upmass reaches `Fleet Central` and revenue exceeds costs.

Useful text:

- `Fleet mass delivered.`
- `Revenue booked.`

Admiral examples:

- `Starward Logistics Command acknowledges useful mass. Continue.`
- `That one builds ships instead of hearings. Good.`

Money-dependent vibe:

- high money: composed approval, professional confidence
- low money: relieved hostility, such as `Finally. You donkey.`

Final delivery note:

- once upmass reaches targetable `Fleet Central`, do not add extra catch penalties for unintended position or
  velocity
- the whole point of the final delivery event is to book revenue
- intermediate hard catches can still cost money before the payload reaches the final station

### Downmass release

Trigger: player generates/releases downmass from `Fleet Central`.

Useful text:

- `Downmass released.`
- `Trash handling authorized.`
- `Downmass cost booked.`

Admiral examples:

- `Yes, unfortunately the trash also has orbital mechanics.`
- `The invoice begins before the object has the decency to leave.`
- `I guess we can spare some unused parts.`

Cost behavior:

- charge the downmass cost immediately on release
- add correction/timing cost if the release window needs extra velocity
- do not wait for disposal before booking the base downmass cost

### Downmass disposal

Trigger: trash downmass reaches the planet.

Useful text:

- `Downmass disposed.`
- `Orbital losses recovered.`

Admiral examples:

- `Trash is down. The public infrastructure miracle continues.`
- `Nobody put that in the recruitment poster.`
- `Crash landing. They will not mind.`

### Failed disposal

Trigger: final downmass neutral or corrected release does not put perigee below the planet.

Useful text:

- `Downmass still orbital.`
- `Disposal failed.`

Admiral examples:

- `That is not disposal. That is litter with orbital parameters.`
- `Please do not create a second trash belt around Civic Prime.`

### Catastrophic tether collision

Trigger: a tether intersects `Civic Prime` or `Fleet Central`.

Useful text:

- `Tether impact.`
- `Infrastructure collision.`
- `Run ended.`

Admiral examples:

- `I am being told the beanstalk is now a surface feature.`
- `Fleet Central did not request direct tether contact.`
- `Tell the engineers I want a smaller crater in the next proposal.`

This is a hard game-over case rather than an ordinary money penalty. It should also fire a corresponding achievement.
Use an alarmed Admiral Voss face once portrait variants exist, and show an additional centered game-over popup in the
canvas.

## Money state matrix

Admiral reactions should depend on both current event and total vBucks.

High money:

- composed
- professionally annoyed
- frames losses as manageable

Middle money:

- tense
- bureaucratic
- worried about reports and maintenance

Low money:

- theatrical
- near ruin
- angry about space congress and borrowed money

## Implementation shape

Create a dialog module later, probably:

```text
src/games/beanstalk-conductor/dialog.ts
```

It should expose a pure function:

```ts
getAdmiralReaction({
  event,
  moneyVBucks,
  correctionMagnitude,
  catchSpeed,
  costVBucks,
}): string
```

The game UI should call that after actions resolve. Solver blackout should also route through this function.

`Admiral Voss` is allowed, and expected, to blame the engineers when release windows fail. The important constraint is
not that he be fair; it is that the UI should not claim the simulation knows a precise cause when it only knows the
solver failed to find a usable scalar release.

Image prompts for Admiral Voss should live in a future prompts folder once the first stable dialog beats exist. Do not
generate images until the dialog matrix is narrower.
