# Planning Notes

This folder holds design and implementation notes for the game projects in this repo.

Current notes:

- [Cislunar physical description](cislunar/physical-description-v0.1.md)
- [Cislunar development plan](cislunar/development-plan-v0.1.md)
- [Track Planet mechanics](track-planet/mechanics.md)
- [Track Planet pole vault temporary note](track-planet/pole-vault-temp.md)
- [Beanstalk Conductor concept](beanstalk-conductor/concept.md)
- [Beanstalk Conductor scalar transfer refactor](beanstalk-conductor/scalar-transfer-refactor.md)
- [Beanstalk Conductor dialog and feedback plan](beanstalk-conductor/dialog-plan.md)

The Cislunar docs are a separate future-game concept. Track Planet notes belong under `planning/track-planet/`.

Track Planet is now mostly finished according to the current objectives: the baseline running model, pole vault,
shot put throwing, rocket pack, one-shot powerups, surface-distance time trials, and the core achievement set are
implemented. Remaining Track Planet work should be treated as polish, bug fixing, tuning, and small presentation
cleanup rather than a new mechanics phase.

Beanstalk Conductor is the next gravity-game concept and now has an early playable prototype plus backend simulator work.
The ordinary adjacent-stage solver, recoil bookkeeping, angular-momentum tests, `Fleet Central` loop, source feeds,
basic menu/backstory shell, and catastrophic tether-collision handling are in place. Current work should focus on
making the prototype easier to understand in play: clearer source/feed visualization, first/last transfer edge cases,
Admiral Voss dialog, vBucks feedback, generated art integration, and eventual tutorial/exhibition mode.
