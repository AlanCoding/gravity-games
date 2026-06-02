import { describe, expect, it } from 'vitest';
import { createInitialBeanstalkSystem, DYNAMIC_MASS_TONS, getFleetCentralState } from './physics/initialState';
import {
  type BeanstalkSystemState,
  getSystemAngularMomentumAbout,
} from './physics/model';
import {
  createTransferLaunch,
  detectInfrastructureCollision,
  didPassCatchAngle,
  getAvailableTransfers,
  resolveCaughtTransfer,
  resolveTransfer,
  simulateToAngularCatch,
} from './gameLogic';

function seedUpmassAtFirstOuter(): BeanstalkSystemState {
  const state = createInitialBeanstalkSystem();
  state.barbells[0].outer.upmassTons = DYNAMIC_MASS_TONS;
  return state;
}

function expectAngularMomentumConserved(state: BeanstalkSystemState, expected: number): void {
  expect(getSystemAngularMomentumAbout(state)).toBeCloseTo(expected, 6);
}

function resolveNamedTransfer(
  state: BeanstalkSystemState,
  predicate: (label: string) => boolean,
): BeanstalkSystemState {
  const transfers = getAvailableTransfers(state);
  const transfer = transfers.find(candidate => predicate(candidate.label));
  expect(transfer, transfers.map(candidate => candidate.label).join(', ')).toBeDefined();
  return resolveTransfer(state, transfer!).state;
}

function resolveUpmassTransfer(state: BeanstalkSystemState): BeanstalkSystemState {
  const transfers = getAvailableTransfers(state);
  const transfer = transfers.find(candidate => candidate.mode === 'transfer' && candidate.kind === 'upmass');
  expect(transfer, transfers.map(candidate => candidate.label).join(', ')).toBeDefined();
  return resolveTransfer(state, transfer!).state;
}

function loadAndMoveUpmassToFirstOuter(): BeanstalkSystemState {
  let state = createInitialBeanstalkSystem();
  state = resolveTransfer(state, getAvailableTransfers(state)[0]).state;
  const cross = getAvailableTransfers(state).find(candidate => candidate.mode === 'cross-tether' && candidate.kind === 'upmass');
  expect(cross).toBeDefined();
  return resolveTransfer(state, cross!).state;
}

describe('Beanstalk Conductor game logic', () => {
  it('finds adjacent upmass and downmass timing opportunities', () => {
    const state = createInitialBeanstalkSystem();
    const transfers = getAvailableTransfers(state);

    expect(transfers.map(transfer => transfer.kind)).toEqual(['upmass', 'downmass']);
    expect(transfers.every(transfer => transfer.mode === 'source-load')).toBe(true);
    expect(transfers.map(transfer => transfer.sourceBarbellId)).toEqual([
      'civic-prime-space-gun',
      'fleet-central-downmass-source',
    ]);
    expect(transfers[0].targetBarbellId).toBe('stage-1');
    expect(transfers[0].targetEndpoint).toBe('inner');
    expect(transfers[1].targetBarbellId).toBe('stage-3');
    expect(transfers[1].targetEndpoint).toBe('outer');
  });

  it('loads a fresh dynamic mass from a source without recoil or cost', () => {
    const state = createInitialBeanstalkSystem();
    const [transfer] = getAvailableTransfers(state);
    const resolved = resolveTransfer(state, transfer);
    const target = resolved.state.barbells.find(barbell => barbell.id === transfer.targetBarbellId);

    expect(transfer.massTons).toBe(DYNAMIC_MASS_TONS);
    expect(target?.inner.upmassTons).toBe(DYNAMIC_MASS_TONS);
    expect(resolved.costVBucks).toBe(0);
    expect(resolved.message).toContain('Source load complete');
  });

  it('charges immediately when loading downmass from Fleet Central', () => {
    const state = createInitialBeanstalkSystem();
    const downmass = getAvailableTransfers(state).find(transfer => transfer.kind === 'downmass');
    expect(downmass).toBeDefined();
    const resolved = resolveTransfer(state, downmass!);
    const target = resolved.state.barbells.find(barbell => barbell.id === downmass!.targetBarbellId);

    expect(target?.outer.downmassTons).toBe(DYNAMIC_MASS_TONS);
    expect(resolved.costVBucks).toBeGreaterThan(0);
    expect(resolved.message).toContain('Downmass released from Fleet Central');
  });

  it('keeps Civic Prime selectable when only one first-stage upmass slot is filled', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].inner.upmassTons = DYNAMIC_MASS_TONS;
    const sourceLoad = getAvailableTransfers(state).find(transfer => transfer.sourceBarbellId === 'civic-prime-space-gun');

    expect(sourceLoad).toBeDefined();
    expect(sourceLoad?.targetEndpoint).toBe('outer');
  });

  it('does not offer a Civic Prime source feed that cuts through the planet', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].center = { x: -88, y: 0 };
    state.barbells[0].angleRad = Math.PI;
    const transfers = getAvailableTransfers(state);

    expect(transfers.some(transfer => transfer.sourceBarbellId === 'civic-prime-space-gun')).toBe(false);
  });

  it('resolves a selected transfer into endpoint fill and vBuck cost', () => {
    const loaded = loadAndMoveUpmassToFirstOuter();
    const transfer = getAvailableTransfers(loaded).find(candidate => candidate.mode === 'transfer' && candidate.kind === 'upmass');
    expect(transfer).toBeDefined();
    const resolved = resolveTransfer(loaded, transfer!);
    const source = resolved.state.barbells.find(barbell => barbell.id === transfer!.sourceBarbellId);
    const target = resolved.state.barbells.find(barbell => barbell.id === transfer!.targetBarbellId);

    expect(source?.outer.upmassTons).toBe(0);
    expect(target?.inner.upmassTons).toBe(transfer!.massTons);
    expect(resolved.costVBucks).toBeGreaterThanOrEqual(0);
    expect(resolved.message).toContain('tons moved');
  });

  it('launches a transfer as an active payload before resolving it at angular catch', () => {
    const loaded = loadAndMoveUpmassToFirstOuter();
    const transfer = getAvailableTransfers(loaded).find(candidate => candidate.mode === 'transfer' && candidate.kind === 'upmass');
    expect(transfer).toBeDefined();
    const launch = createTransferLaunch(loaded, transfer!);
    const sourceAfterLaunch = launch.state.barbells.find(barbell => barbell.id === transfer!.sourceBarbellId);

    expect(launch.state.payloads).toHaveLength(1);
    expect(sourceAfterLaunch?.outer.upmassTons).toBe(0);

    const caught = simulateToAngularCatch(launch);
    const resolved = resolveCaughtTransfer(caught.state, transfer!, caught.correctionMagnitude);
    const target = resolved.state.barbells.find(barbell => barbell.id === transfer!.targetBarbellId);

    expect(resolved.state.payloads).toHaveLength(0);
    expect(target?.inner.upmassTons).toBe(transfer!.massTons);
  });

  it('detects catch by angular crossing instead of radial distance', () => {
    expect(didPassCatchAngle(0.2, -0.1)).toBe(true);
    expect(didPassCatchAngle(-0.2, 0.1)).toBe(true);
    expect(didPassCatchAngle(2.8, -2.8)).toBe(false);
  });

  it('moves a caught upmass across its tether without correction cost', () => {
    const loaded = loadAndMoveUpmassToFirstOuter();
    const transfer = getAvailableTransfers(loaded).find(candidate => candidate.mode === 'transfer' && candidate.kind === 'upmass');
    expect(transfer).toBeDefined();
    const afterCatch = resolveTransfer(loaded, transfer!).state;
    const cross = getAvailableTransfers(afterCatch).find(candidate => candidate.mode === 'cross-tether');
    expect(cross).toBeDefined();

    const resolved = resolveTransfer(afterCatch, cross!);
    const barbell = resolved.state.barbells.find(candidate => candidate.id === cross!.sourceBarbellId);

    expect(resolved.costVBucks).toBe(0);
    expect(barbell?.inner.upmassTons).toBe(0);
    expect(barbell?.outer.upmassTons).toBe(cross!.massTons);
  });

  it('conserves total angular momentum across a full user-directed upmass cycle', () => {
    let state = seedUpmassAtFirstOuter();
    const initialAngularMomentum = getSystemAngularMomentumAbout(state);

    state = resolveUpmassTransfer(state);
    expectAngularMomentumConserved(state, initialAngularMomentum);

    state = resolveNamedTransfer(state, label => label === 'stage-2 upmass across tether');
    expectAngularMomentumConserved(state, initialAngularMomentum);

    state = resolveUpmassTransfer(state);
    expectAngularMomentumConserved(state, initialAngularMomentum);

    state = resolveNamedTransfer(state, label => label.includes('upmass across tether'));
    expectAngularMomentumConserved(state, initialAngularMomentum);
  });

  it('offers Fleet Central as the final upmass destination', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[2].outer.upmassTons = DYNAMIC_MASS_TONS;
    const transfers = getAvailableTransfers(state);
    const fleetTransfer = transfers.find(transfer => transfer.destinationKind === 'fleet-central');

    expect(fleetTransfer).toBeDefined();
    expect(fleetTransfer?.label).toContain('Fleet Central');
  });

  it('offers planet disposal for downmass at the lowest inner endpoint', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].inner.downmassTons = DYNAMIC_MASS_TONS;
    const transfers = getAvailableTransfers(state);
    const disposal = transfers.find(transfer => transfer.destinationKind === 'planet-disposal');

    expect(disposal).toBeDefined();
    expect(disposal?.label).toContain('Civic Prime');
  });

  it('detects a tether collision with Civic Prime', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].center = { x: 0, y: 0 };
    state.barbells[0].angleRad = 0;
    state.barbells[0].length = state.planetRadius * 3;

    expect(detectInfrastructureCollision(state)).toEqual({
      kind: 'planet',
      barbellId: 'stage-1',
    });
  });

  it('detects a tether collision with Fleet Central', () => {
    const state = createInitialBeanstalkSystem();
    const fleetCentral = getFleetCentralState({
      timeSeconds: state.timeSeconds,
      gravitationalParameter: state.gravitationalParameter,
    });
    state.barbells[2].center = fleetCentral.position;
    state.barbells[2].angleRad = Math.PI / 2;
    state.barbells[2].length = 60;

    expect(detectInfrastructureCollision(state)).toEqual({
      kind: 'fleet-central',
      barbellId: 'stage-3',
    });
  });
});
