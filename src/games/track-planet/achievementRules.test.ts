import { describe, expect, it } from 'vitest';
import {
  shouldAwardPlayerEscape,
  shouldAwardPlayerOrbit,
  shouldAwardShotPutEscape,
  shouldAwardShotPutOrbit,
} from './achievementRules';

describe('achievement rules', () => {
  it('requires the player to be airborne for orbit and escape awards', () => {
    expect(
      shouldAwardPlayerOrbit({
        grounded: true,
        orbitPerigeeAltitude: 10,
        altitude: 1,
        speed: 12,
        escapeSpeed: 15,
      } as Parameters<typeof shouldAwardPlayerOrbit>[0]),
    ).toBe(false);

    expect(
      shouldAwardPlayerEscape({
        grounded: true,
        orbitPerigeeAltitude: 10,
        altitude: 1,
        speed: 16,
        escapeSpeed: 15,
      } as Parameters<typeof shouldAwardPlayerEscape>[0]),
    ).toBe(false);

    expect(
      shouldAwardPlayerOrbit({
        grounded: false,
        orbitPerigeeAltitude: 10,
        altitude: 1,
        speed: 12,
        escapeSpeed: 15,
      } as Parameters<typeof shouldAwardPlayerOrbit>[0]),
    ).toBe(true);
  });

  it('requires the shot put to avoid surface contact for orbit and escape awards', () => {
    expect(
      shouldAwardShotPutOrbit({
        boundOrbit: true,
        perigeeAltitude: 0.3,
        clearance: 0.42,
        hasTouchedSurface: true,
      }),
    ).toBe(false);

    expect(
      shouldAwardShotPutOrbit({
        boundOrbit: true,
        perigeeAltitude: 0.3,
        clearance: 0.42,
        hasTouchedSurface: false,
      }),
    ).toBe(false);

    expect(
      shouldAwardShotPutOrbit({
        boundOrbit: true,
        perigeeAltitude: 0.6,
        clearance: 0.42,
        hasTouchedSurface: false,
      }),
    ).toBe(true);

    expect(
      shouldAwardShotPutEscape({
        boundOrbit: false,
        hasTouchedSurface: true,
      }),
    ).toBe(false);

    expect(
      shouldAwardShotPutEscape({
        boundOrbit: false,
        hasTouchedSurface: false,
      }),
    ).toBe(true);
  });
});
