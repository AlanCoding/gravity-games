# Beanstalk Conductor

## Core idea

Beanstalk Conductor is the current working title for a future gravity game about a series of tidally locked barbell
spacecraft in a shared orbital plane that move mass up and down a gravity well. Earlier notes used "Jacob's Ladder",
but that phrase is overloaded and may not be the right game title. "Beanstalk" better matches Hop David's terminology
for moon elevators and "Conductor" points at the timing/railroad role the player actually has.

The starting body is `Civic Prime`, a generic fictional rocky planet. The first launch is a surface space gun. The
planet should read as blue and green, but it does not need to represent a specific real planet. The space-gun launch is
visually clear and useful for the game even though it would be unrealistic for an Earth launch.

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

The player should not choose a launch angle or target manually. The game computes a transfer that aims at the next
stage tether endpoint. This should not be simplified to "release when the target is 180 degrees away"; the ideal release
geometry is a computed orbital-timing problem. The tutorial can still describe the intuition as waiting for the target
to be on the far side of the planet, but the backend should use prediction and solving rather than a hard-coded angular
rule. The player chooses when to commit that computed transfer.

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
- the comedy comes from the physics producing the costs and wobble honestly

This should be framed as a space-tycoon problem. `Admiral Voss` watches from the corner of the UI and reacts
emotionally to performance, costs, wobble, and failed deliveries.

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
- use a static overall view rather than zooming between stages
- keep this larger and less mobile-oriented than Track Planet
- avoid extra surrounding page chrome; put more content inside the game rectangle itself

## Current implementation status

Done in the early prototype:

- static Beanstalk Conductor page and site wiring
- about page with the Hop David / operational-mess motivation
- early playable game canvas
- three barbell stages around `Civic Prime`
- selectable upmass/downmass source loading
- adjacent-stage transfer actions
- scalar transfer solver for ordinary barbell-to-barbell transfers
- solver blackout handling for release windows with no practical root
- custom central `1/r^2` gravity model
- rigid-body barbell endpoint derivation from center of mass, angle, angular velocity, and fill state
- release recoil that conserves linear and angular momentum
- capture at an offset grab position that conserves linear and angular momentum
- total system angular momentum helper and regression tests
- demo achievement wiring for launching a mass
- fixed circular-orbit `Fleet Central` marker in the playable view
- final upmass transfer targeting `Fleet Central`
- immediate downmass release/loading from `Fleet Central`
- perigee-based final downmass disposal solver
- game-over detection when a tether intersects `Civic Prime` or `Fleet Central`
- achievements for catastrophic tether collisions
- front screen plan for `Back story`, `Tutorial`, and `Play`
- backstory script and image prompts
- Admiral Voss reaction image prompts
- basic front screen implementation with `Back story`, `Tutorial`, and `Play`
- text-first backstory viewer with generated-image placeholders and completion achievement wiring
- tutorial TODO placeholder with completion achievement wiring
- source/mass-centered selection highlighting instead of whole-barbell highlighting
- click-to-launch support for visible sources and occupied endpoints
- prototype-only visual source feed animations from `Civic Prime` and `Fleet Central`
- faster simulation pacing for normal operation and active payload transfers
- larger playfield framing so `Fleet Central` and unstable orbits have more visible room
- source feeds now keep source selections stable and prevent occupied same-kind target slots
- arrow-key menu navigation and single-panel backstory advancement with Enter/Space
- play HUD moved into the canvas area with vBucks/selection on the left and Admiral Voss on the right
- generated art integration for the planet, station, Admiral Voss portraits, and backstory panels
- backstory panel images with console-style typewriter text

Not done yet:

- full vBucks accounting beyond prototype release cost, correction cost, and delivery revenue
- full dialog matrix for profit, blackout, bankruptcy, crashes, and degraded operations
- polished front screen styling and final generated menu/backstory art integration
- generated backstory art and final backstory viewer styling
- real tutorial/exhibition mode
- physical source-origin transfers from `Civic Prime` and `Fleet Central`; current source feeds are diagnostic
  placeholders and must become tangent-velocity orbital transfers
- RK4 or other higher-order integration

The next objective is playability polish around the live prototype: improve source/feed clarity, encode Admiral Voss
dialog and money feedback for user actions, add generated art where prompts already exist, and defer the real tutorial
until the core operation loop is less confusing.

## Naming and customer

Settled names:

- game title: `Beanstalk Conductor`
- planet: `Civic Prime`
- fleet customer: `Starward Logistics Command`
- top station: `Fleet Central`
- government body: `Office of Extraterrestrial Conveyance`
- absurd official title: `Deputy Undersecretary for Orbital Uplift`
- infrastructure operator: `Public Beanstalk Works`
- original elevator project: `Strategic Space Elevator Initiative`
- compromised beanstalk project: `Emergency Vertical Access Compromise`
- admiral/customer character: `Admiral Voss`

The beanstalk is public infrastructure operated by `Public Beanstalk Works`, but the major customer is effectively
`Starward Logistics Command`.

## Backstory

The `Deputy Undersecretary for Orbital Uplift` demanded that `Civic Prime` build a proper space elevator under the
`Strategic Space Elevator Initiative`. Engineers explained that this was not physically practical on the schedule the
government had already announced.

The watered-down version is the `Emergency Vertical Access Compromise`: a public beanstalk system that is not exactly
the promised space elevator, but is close enough for the press release if nobody asks too many questions.

Unfortunately, the `Office of Extraterrestrial Conveyance` has already borrowed heavily, space congress is angry about
not getting the real elevator, and `Starward Logistics Command` still needs a fleet built. `Admiral Voss` is waiting at
`Fleet Central`, and the compromise beanstalk had better work perfectly.

## Player controls

The player does not directly steer spacecraft. The player chooses timing for the selected upmass or downmass.

Allowed control:

- select an available upmass or downmass
- trigger the next progression at a chosen time
- use mostly arrow keys and Enter

Not allowed, at least initially:

- arbitrary steering
- changing launch angle by hand
- directly stabilizing a barbell
- manually solving the barbell control problem

Barbells may theoretically be influenced by moving endpoint masses in and out, but that control space is explicitly out
of scope for the first game design.

Control presentation:

- Up/Down cycles through selectable masses by orbital radius
- Left/Right can switch between upmass/downmass choices or nearby candidates
- Enter advances the currently highlighted mass at that exact time
- controls should be explained below the game screen

Upmass and downmass should be simple colored circles. They should use distinct colors.

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

Pre-positioning logic:

- choose orbit radii based on visual and gameplay needs
- compute barbell lengths so releases produce the intended Hohmann-style transfers
- pre-position barbells and endpoints so the first set of tosses basically cannot go wrong
- use the same setup with or without the tutorial
- let later mass transfers disturb orbital parameters and rotation over time

## Economy

The objective is to make money by delivering mass out of the gravity well.

Money rules:

- money is earned when upmass is delivered to `Fleet Central`
- a failed delivery costs a penalty
- downmass costs money immediately when it is released/generated from `Fleet Central`
- bad ordinary downmass transfer timing can add release-correction cost because the transfer window is not free
- initial source-origin launches from `Civic Prime` and `Fleet Central` are explicit infrastructure exceptions: no
  correction charge, no source recoil, and no source-origin catch penalty
- ordinary intermediate upmass catches may have operational cost, but final `Fleet Central` delivery should not add
  unintended-position or unintended-velocity penalties once it is targetable
- downmass and upmass must physically match, but downmass should cost less than upmass earns
- a working starting ratio is that downmass costs about one quarter as much as equivalent upmass earns

This creates the tycoon loop:

- move mass upward
- collect delivery revenue
- absorb downmass costs and transfer penalties
- keep the ladder functioning long enough to remain profitable

Most transfer problems should map to money rather than hard failure. A bad transfer can still attach, cost money, and
make the simulation wobble badly. The player loses money and watches the system degrade.

Hard game-over cases still exist:

- a tether intersects `Civic Prime`
- a tether intersects `Fleet Central`

Each catastrophic collision should also have an achievement because it is funny and diagnostic.

Transfer correction cost should use a simple first scale:

- `1 vBuck = 1 ton * 1 m/s`
- a 12-ton payload needing 3 m/s of correction costs 36 vBucks

Money and stats should be displayed constantly in the top-left of the game rectangle.

The top-right should show the admiral/customer portrait and a text reaction to recent action.

## Catch and prediction model

Each transfer has a specific precomputed target:

- upmass/downmass starts from the current stage
- the game predicts the next-stage endpoint state into the future
- the transfer is generated to intercept the lower endpoint of the adjacent stage
- the visual simulation then plays out the same model
- the transfer resolves once the payload enters a capture radius around that endpoint

The catch should allow tolerance, but a plain circular capture radius may catch too early when the payload passes near
the wrong part of the endpoint path. Prefer an altitude/radial-range capture gate around the destination endpoint's
orbital radius, plus a tangential/along-track tolerance, so the catch happens at the intended point in time. If the
destination geometry is too close to the current tether or inside an unsafe "back out" zone, do not allow launch. Any
relative velocity at the moment of catch is converted into a money cost.

The first prototype should show the happy path only. It does not need timing-window UI, failure bands, or full
probability-style preview. The player sees the computed transfer that the game intends to execute, then chooses the
timing.

## Transfer occupancy

There can be multiple upmasses and downmasses in the system, but for visual and gameplay simplicity:

- each barbell endpoint can hold at most one upmass and at most one downmass
- the same endpoint may hold one upmass and one downmass at the same time
- an endpoint may not hold two upmasses or two downmasses
- this implicitly prevents same-direction masses from passing through each other
- while a transfer is active, no new player action is accepted

The player should always be choosing between currently available upmass/downmass timing opportunities rather than
managing many simultaneous moving pieces.

## Integration fidelity

The first implementation uses the current lightweight integrator so the model can be built and tested quickly. Future
physics work should upgrade the backend to RK4, preferably behind the same pure model APIs, once the destination and
economy rules are stable.

There is an infinite upmass source at the stationary surface launch site. This can inject unlimited new upmasses into
the system, whether or not that is a good idea. This source should not directly fill a barbell endpoint. It should launch
a real active payload from the surface launcher with tangential velocity computed by the transfer solver, then the
payload should travel under the same central gravity model as all other transfers. `Civic Prime` is static; surface
rotation is not modeled. The source launch must be prograde, and a solver result that requires retrograde launch is an
invalid launch window. For early play testing, fresh dynamic masses should be 12-ton units so system degradation is
easier to see.

There is a station above the top tether, `Fleet Central`, which provides infinite downmass.
The balancing problem is the point: upmass and downmass physically need to match over time, but they create funny wobble
and financial tradeoffs. Fleet Central downmass generation should likewise be a real active payload release from the
station's circular-orbit state, with a tangential correction solved against the top-stage target endpoint. The correction
may be positive or negative relative to Fleet Central's own velocity, but the resulting payload orbit must remain
prograde.

## First playable shape

The first playable version must include multiple barbell stages. A single-stage prototype is not enough to express the
ladder concept.

Minimum playable slice:

- render `Civic Prime`, three barbell stages, endpoint fills, and one active payload transfer in a static canvas view
- show money, current selected mass, transfer cost, simulation time, and a short `Admiral Voss` reaction
- allow Up/Down to cycle available timing opportunities
- allow Enter to launch the selected adjacent-stage transfer at the current time
- freeze new player actions while a transfer is in flight
- solve the release correction with the backend transfer solver
- animate the same simulated transfer that was solved
- make source-origin launches from `Civic Prime` and `Fleet Central` use the same active-payload simulation as
  barbell-origin transfers; do not use decorative source-feed interpolation, and do not charge correction or catch
  penalties for these source-origin launches
- resolve the transfer by moving fill from the source endpoint to the target endpoint
- apply correction cost in `Delta-vBucks`
- keep the first capture/resolution model simple, then replace it with radial capture gates once the visual loop is playable

Current prototype status:

- the player can cycle transfer opportunities and launch masses
- the rendering is still a diagnostic view, not final art
- the planet should eventually be replaced or upgraded with a real asset or more deliberate planet art
- the surface space cannon should be visible because it explains the infinite upmass source
- the UI needs continued debugging around timing, transfer readability, and catch/resolution reporting
- source-origin launches are still not physically faithful: they use a prototype source-load flow and must be replaced
  with solved tangential orbital transfers
- achievements wiring should start with a demo achievement for launching any mass

The early flow should be:

- calibration/tutorial shows the clean theoretical toss from one stage to the next
- the first real simulated transfer works well
- subsequent transfers naturally accumulate wobble and transfer penalties
- the admiral's reaction makes the degradation legible and funny

## Game Page Front Screen

The Beanstalk Conductor game page should open to a simple three-choice menu:

- `Back story`
- `Tutorial`
- `Play`

`Play` jumps directly into the current live game. The user should not be forced to watch the backstory or tutorial first.

`Back story` is primarily images and text. The first version can be a sequence of illustrated panels with short copy.
Fancy RPG-style scrolling text is optional. At the end, it may show a short non-interactive demo of masses moving up and
down the ladder, but that is undecided and should not block the first backstory implementation.

`Tutorial` is expected to be more challenging than the backstory. It should eventually teach the timing loop and may use
an idealized/exhibition simulation where perturbations are suppressed or simplified.

Completion tracking:

- completing the backstory unlocks a Beanstalk achievement
- completing the tutorial unlocks a Beanstalk achievement
- the same browser cookie achievement system should drive check marks next to `Back story` and `Tutorial` on the game
  front screen
- `Play` should remain available regardless of completion state

## Backstory Sequence

First-pass backstory beats:

1. The `Deputy Undersecretary for Orbital Uplift` announces the `Strategic Space Elevator Initiative`.
2. Engineers explain that a real space elevator is not practical on the promised schedule.
3. The `Office of Extraterrestrial Conveyance` rebrands the watered-down plan as the `Emergency Vertical Access
   Compromise`.
4. `Public Beanstalk Works` presents the clean cartoon-technical beanstalk: `Civic Prime`, a surface launcher, multiple
   barbell stages, and `Fleet Central`.
5. `Starward Logistics Command` needs fleet mass delivered upward, and `Fleet Central` provides downmass for balancing.
6. `Admiral Voss` warns that space congress is angry, the money is borrowed, and the compromise had better work.
7. Optional closing demo: upmass and downmass move through the clean theoretical ladder before real play begins.

Backstory tone:

- explanatory and cartoon-technical, like an illustrated blog diagram
- bureaucratic and a little absurd
- clean and competent infrastructure
- the system should look good in the backstory; the player creates the operational mess later

## Dialog and image prompts

This game should use more text than Track Planet. The admiral/customer character is part of the game loop.

Dialog/image direction:

- the admiral appears in the top-right
- dialog reacts to each catch, loss, penalty event, or strong performance
- reactions are based on both current action and total money
- if total money is high, a loss can still get a composed, encouraging reaction
- if total money is low, poor performance should generate exaggerated panic or near-ruin reactions
- art should be cartoony rather than realistic

For each dialog beat, create an accompanying image prompt in a prompts folder. These prompts should be written before
image generation. Later, when the game is closer to finished, the prompts can be used with available image-generation
credits.

Before the steady-state operation is presented as polished, aim for about 3-4 dialog/image beats:

- first clean successful catch
- visible wobble or high-cost result after a mediocre catch
- near-ruin reaction after poor performance while low on money
- catastrophic collision reaction

## Early questions to solve

- how many stages the first playable version needs
- what orbital radii those stages use
- whether every stage is visually identical or whether stage size changes with radius
- what exact timing UI the player uses
- how much trajectory preview the player gets before committing
- how catch penalties map from relative velocity to money loss
- how failed delivery penalties are computed
- how the admiral's emotional state maps to profit, cost, and chaos
- what the first 3-4 admiral dialog beats should say
- where to put the prompt files once implementation begins

## Relation to other games

Beanstalk Conductor is a separate game idea from Track Planet and should keep its own notes, assets, and planning space
under `planning/beanstalk-conductor/`.
