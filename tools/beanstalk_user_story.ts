import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import {
  createTransferLaunch,
  estimateTransferTiming,
  getAvailableTransfers,
  resolveCaughtTransfer,
  resolveTransfer,
  simulateToAngularCatch,
  type TransferOpportunity,
} from '../src/games/beanstalk-conductor/gameLogic';
import { createInitialBeanstalkSystem, getFleetCentralState } from '../src/games/beanstalk-conductor/physics/initialState';
import {
  type BarbellState,
  type BeanstalkSystemState,
  getEndpointState,
  length,
  stepSystem,
} from '../src/games/beanstalk-conductor/physics/model';
import {
  computeOrbitApsides,
  getTransferSourceState,
  solveTransferCorrection,
} from '../src/games/beanstalk-conductor/physics/transferSolver';

type StoryAction = {
  at?: number;
  wait?: number;
  select: string;
};

type StoryInput = {
  name: string;
  actions: StoryAction[];
};

const DEFAULT_STORIES: StoryInput[] = [
  {
    name: 'fleet-central-two-downmass',
    actions: [
      { at: 0, select: 'fleet-central-downmass-source' },
      { wait: 10, select: 'stage-3 downmass across tether' },
      { wait: 10, select: 'fleet-central-downmass-source' },
    ],
  },
  {
    name: 'civic-prime-first-upmass',
    actions: [
      { at: 0, select: 'civic-prime-space-gun' },
      { wait: 60, select: 'civic-prime-space-gun' },
    ],
  },
];

async function main(): Promise<void> {
  const stories = process.argv[2]
    ? await readStories(process.argv[2])
    : DEFAULT_STORIES;
  await mkdir('outputs', { recursive: true });
  for (const story of stories) {
    const markdown = runStory(story);
    const outputPath = resolve('outputs', `${slugify(story.name)}.md`);
    await writeFile(outputPath, markdown);
    console.log(`wrote ${outputPath}`);
  }
}

async function readStories(path: string): Promise<StoryInput[]> {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw) as StoryInput | StoryInput[];
  return Array.isArray(parsed) ? parsed : [parsed];
}

function runStory(story: StoryInput): string {
  let state = createInitialBeanstalkSystem();
  const lines: string[] = [
    `# ${story.name}`,
    '',
    `Input actions: ${story.actions.length}`,
    '',
    describeSystem(state),
  ];

  for (let index = 0; index < story.actions.length; index += 1) {
    const action = story.actions[index];
    if (typeof action.at === 'number') {
      state = advanceTo(state, action.at);
    }
    if (typeof action.wait === 'number') {
      state = advanceBy(state, action.wait);
    }
    lines.push('', `## Action ${index + 1}: ${action.select}`, '', `Time: ${state.timeSeconds.toFixed(2)} s`);
    const transfer = findTransfer(state, action.select);
    if (!transfer) {
      lines.push('', 'No matching selectable transfer.', '', listTransfers(state));
      continue;
    }
    lines.push('', describeTransfer(state, transfer));
    lines.push('', describeTimingEstimate(state, transfer));
    if (transfer.mode === 'cross-tether') {
      const resolved = resolveTransfer(state, transfer);
      state = resolved.state;
      lines.push('', `Result: ${resolved.message}`, '', describeSystem(state));
      continue;
    }
    const solved = solveTransferCorrection(state, transfer, { collectTrace: true });
    lines.push('', describeSolve(state, transfer, solved));
    if (!solved.converged) {
      lines.push('', 'Result: launch rejected by solver.');
      continue;
    }
    try {
      const launch = createTransferLaunch(state, transfer);
      const caught = simulateToAngularCatch(launch);
      const resolved = resolveCaughtTransfer(caught.state, transfer, caught.correctionMagnitude);
      state = resolved.state;
      lines.push(
        '',
        `Result: ${resolved.message}`,
        `Catch relative speed: ${resolved.relativeCatchSpeed.toFixed(3)}`,
        '',
        describeSystem(state),
      );
    } catch (error) {
      lines.push('', `Result: launch failed during catch simulation: ${String(error)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function findTransfer(state: BeanstalkSystemState, selector: string): TransferOpportunity | undefined {
  const lower = selector.toLowerCase();
  return getAvailableTransfers(state).find(transfer => (
    transfer.sourceBarbellId.toLowerCase().includes(lower)
    || transfer.targetBarbellId.toLowerCase().includes(lower)
    || transfer.label.toLowerCase().includes(lower)
  ));
}

function describeTimingEstimate(state: BeanstalkSystemState, transfer: TransferOpportunity): string {
  const estimate = estimateTransferTiming(state, transfer);
  if (!estimate) {
    return 'Timing estimate: unsupported for this Stage 1 indicator.';
  }
  if (!estimate.supported) {
    return `Timing estimate: unavailable (${estimate.reason}).`;
  }
  return [
    'Timing estimate:',
    `sourceRadius=${formatNumber(estimate.sourceRadius)}`,
    `targetRadius=${formatNumber(estimate.targetRadius)}`,
    `transferTime=${formatNumber(estimate.transferTimeSeconds)}s`,
    `idealDelta=${formatNumber(estimate.idealPhaseDeltaRad)}rad`,
    `phaseError=${formatNumber(estimate.phaseErrorRad)}rad`,
    `nextIdeal=${formatNumber(estimate.nextIdealReleaseSeconds)}s`,
    `quality=${formatNumber(estimate.quality)}`,
    `windowHalfWidth=${formatNumber(estimate.windowHalfWidthRad)}rad`,
  ].join(' ');
}

function describeTransfer(state: BeanstalkSystemState, transfer: TransferOpportunity): string {
  const source = getTransferSourceState(state, transfer);
  const sourceOrbit = computeOrbitApsides(source.position, source.velocity, state.gravitationalParameter);
  const target = state.barbells.find(barbell => barbell.id === transfer.targetBarbellId);
  return [
    `Transfer: ${transfer.label}`,
    `Mode: ${transfer.mode}`,
    `Source: ${source.kind} ${transfer.sourceBarbellId}.${transfer.sourceEndpoint}`,
    `Target: ${transfer.targetBarbellId}.${transfer.targetEndpoint}`,
    `Source radius: ${length(source.position).toFixed(3)}`,
    `Source speed: ${length(source.velocity).toFixed(3)}`,
    `Source orbit: perigee=${formatNumber(sourceOrbit.perigeeRadius)} apogee=${formatNumber(sourceOrbit.apogeeRadius)} h=${formatNumber(sourceOrbit.specificAngularMomentum)}`,
    target ? describeBarbellOrbit('Target barbell', target, state) : 'Target barbell: non-barbell destination',
  ].join('\n');
}

function describeSolve(
  state: BeanstalkSystemState,
  transfer: TransferOpportunity,
  solved: ReturnType<typeof solveTransferCorrection>,
): string {
  const source = getTransferSourceState(state, transfer);
  const launchVelocity = {
    x: source.velocity.x + solved.deltaVelocity.x,
    y: source.velocity.y + solved.deltaVelocity.y,
  };
  const payloadOrbit = computeOrbitApsides(source.position, launchVelocity, state.gravitationalParameter);
  const trace = solved.trace ?? [];
  const traceLines = trace.slice(0, 80).map(event => [
    `- ${event.phase} #${event.iteration}`,
    `scalar=${formatNumber(event.scalarCorrection)}`,
    `miss=${formatNumber(event.radialMiss)}`,
    `t=${event.catchElapsedSeconds === null ? 'none' : event.catchElapsedSeconds.toFixed(2)}`,
    `h=${formatNullable(event.payloadAngularMomentum)}`,
    `targetH=${formatNullable(event.targetCircularAngularMomentum)}`,
    `deltaH=${formatNullable(event.deltaAngularMomentum)}`,
    `cross=${event.converged}`,
  ].join(' '));
  return [
    `Solver converged: ${solved.converged}`,
    `Failure reason: ${solved.failureReason ?? 'none'}`,
    `Scalar bounds: ${solved.scalarBounds ? `${formatNumber(solved.scalarBounds.low)} .. ${formatNumber(solved.scalarBounds.high)}` : 'none'}`,
    `Scalar correction: ${formatNumber(solved.scalarCorrection)}`,
    `Delta-v magnitude: ${formatNumber(solved.correctionMagnitude)}`,
    `Miss: ${formatNumber(solved.missDistance)}`,
    `Nominal miss: ${formatNumber(solved.nominalMissDistance)}`,
    `Iterations: ${solved.iterations}`,
    `Minimum catch time: ${formatNumber(solved.minCatchSeconds)} s`,
    `Payload orbit from solved initial condition: perigee=${formatNumber(payloadOrbit.perigeeRadius)} apogee=${formatNumber(payloadOrbit.apogeeRadius)} h=${formatNumber(payloadOrbit.specificAngularMomentum)} e=${formatNumber(payloadOrbit.eccentricity)}`,
    '',
    'Trace:',
    traceLines.length > 0 ? traceLines.join('\n') : 'No trace collected.',
    trace.length > traceLines.length ? `... ${trace.length - traceLines.length} more trace rows omitted` : '',
  ].filter(Boolean).join('\n');
}

function describeSystem(state: BeanstalkSystemState): string {
  const fleet = getFleetCentralState({
    timeSeconds: state.timeSeconds,
    gravitationalParameter: state.gravitationalParameter,
  });
  const fleetOrbit = computeOrbitApsides(fleet.position, fleet.velocity, state.gravitationalParameter);
  return [
    `System time: ${state.timeSeconds.toFixed(2)} s`,
    `Fleet Central: radius=${length(fleet.position).toFixed(3)} speed=${length(fleet.velocity).toFixed(3)} perigee=${formatNumber(fleetOrbit.perigeeRadius)} apogee=${formatNumber(fleetOrbit.apogeeRadius)}`,
    ...state.barbells.map(barbell => describeBarbellOrbit(barbell.id, barbell, state)),
    '',
    listTransfers(state),
  ].join('\n');
}

function describeBarbellOrbit(label: string, barbell: BarbellState, state: BeanstalkSystemState): string {
  const orbit = computeOrbitApsides(barbell.center, barbell.velocity, state.gravitationalParameter);
  const inner = getEndpointState(barbell, 'inner');
  const outer = getEndpointState(barbell, 'outer');
  const longLeg = Math.max(length({
    x: inner.position.x - barbell.center.x,
    y: inner.position.y - barbell.center.y,
  }), length({
    x: outer.position.x - barbell.center.x,
    y: outer.position.y - barbell.center.y,
  }));
  return [
    `${label}: centerRadius=${length(barbell.center).toFixed(3)}`,
    `centerSpeed=${length(barbell.velocity).toFixed(3)}`,
    `CM perigee=${formatNumber(orbit.perigeeRadius)}`,
    `CM apogee=${formatNumber(orbit.apogeeRadius)}`,
    `longLeg=${formatNumber(longLeg)}`,
    `envelope=${formatNumber(Math.max(0, orbit.perigeeRadius - longLeg))}..${formatNumber(Number.isFinite(orbit.apogeeRadius) ? orbit.apogeeRadius + longLeg : Number.POSITIVE_INFINITY)}`,
    `fills inner(up=${inner.fill.upmassTons},down=${inner.fill.downmassTons}) outer(up=${outer.fill.upmassTons},down=${outer.fill.downmassTons})`,
  ].join(' ');
}

function listTransfers(state: BeanstalkSystemState): string {
  const transfers = getAvailableTransfers(state);
  return [
    'Selectable transfers:',
    ...transfers.map((transfer, index) => `${index + 1}. ${transfer.label} [${transfer.sourceBarbellId} -> ${transfer.targetBarbellId}]`),
  ].join('\n');
}

function advanceTo(state: BeanstalkSystemState, targetTime: number): BeanstalkSystemState {
  return advanceBy(state, Math.max(0, targetTime - state.timeSeconds));
}

function advanceBy(state: BeanstalkSystemState, seconds: number): BeanstalkSystemState {
  let next = state;
  let remaining = seconds;
  while (remaining > 0) {
    const step = Math.min(0.25, remaining);
    next = stepSystem(next, step);
    remaining -= step;
  }
  return next;
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : 'inf';
}

function formatNullable(value: number | null): string {
  return value === null ? 'none' : formatNumber(value);
}

function slugify(value: string): string {
  return basename(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'story';
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
