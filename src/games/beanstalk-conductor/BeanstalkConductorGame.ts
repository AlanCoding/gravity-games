import { createInitialBeanstalkSystem, createSurfaceLauncherState, getFleetCentralState } from './physics/initialState';
import admiralVossAlarmedUrl from './assets/generated/admiral-voss-alarmed.png';
import admiralVossApprovalUrl from './assets/generated/admiral-voss-approval.png';
import admiralVossConcernUrl from './assets/generated/admiral-voss-concern.png';
import admiralVossPanicUrl from './assets/generated/admiral-voss-panic.png';
import admiralVossUrl from './assets/generated/admiral-voss.png';
import civicPrimeUrl from './assets/generated/civic-prime.png';
import fleetCentralUrl from './assets/generated/fleet-central.png';
import {
  type BeanstalkSystemState,
  type PayloadState,
  type Vec2,
  getEndpointState,
} from './physics/model';
import { stepSystem } from './physics/model';
import type { TransferTarget } from './physics/transferSolver';
import {
  createTransferLaunch,
  detectInfrastructureCollision,
  didPassCatchAngle,
  estimateTransferTiming,
  getAvailableTransfers,
  getTransferAvailabilityIssue,
  getAngularCatchError,
  resolveTransfer,
  resolveCaughtTransfer,
  signedAngularDelta,
  TransferSolveFailure,
  type TransferOpportunity,
} from './gameLogic';
import type { BeanstalkAchievementId } from './achievements';

type BeanstalkGameOptions = {
  container: HTMLElement;
  statsDisplay: HTMLElement | null;
  selectionDisplay: HTMLElement | null;
  timingDisplay: HTMLElement | null;
  admiralDisplay: HTMLElement | null;
  admiralPortraitDisplay: HTMLImageElement | null;
  transferBannerDisplay: HTMLElement | null;
  resetButton: HTMLButtonElement | null;
  giveUpButton: HTMLButtonElement | null;
  giveUpDialog: HTMLElement | null;
  confirmGiveUpButton: HTMLButtonElement | null;
  cancelGiveUpButton: HTMLButtonElement | null;
  speedButtons: HTMLButtonElement[];
  achievementNotifier?: (message: string) => void;
  achievementUnlocker?: (id: BeanstalkAchievementId) => void;
};

type ActiveTransfer = {
  target: TransferTarget;
  payload: PayloadState;
  correctionMagnitude: number;
  releaseSpeed: number;
  previousAngularError: number;
  catchArmed: boolean;
  angularTravel: number;
  minCatchSeconds: number;
  elapsedSeconds: number;
};

const NORMAL_TIME_SCALE = 2;
const TRANSFER_TIME_SCALE = NORMAL_TIME_SCALE;
const MAX_SIM_STEP_SECONDS = 0.05;
const VIEW_WORLD_DIAMETER = 860;
const CIVIC_PRIME_SOURCE_ID = 'civic-prime-space-gun';
const CATCH_ARM_ANGLE_RAD = 0.015;
const MAX_TRANSFER_ANGULAR_TRAVEL_RAD = Math.PI * 2;

export class BeanstalkConductorGame {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly civicPrimeImage = new Image();
  private readonly fleetCentralImage = new Image();
  private readonly statsDisplay: HTMLElement | null;
  private readonly selectionDisplay: HTMLElement | null;
  private readonly timingDisplay: HTMLElement | null;
  private readonly admiralDisplay: HTMLElement | null;
  private readonly admiralPortraitDisplay: HTMLImageElement | null;
  private readonly transferBannerDisplay: HTMLElement | null;
  private readonly resetButton: HTMLButtonElement | null;
  private readonly giveUpButton: HTMLButtonElement | null;
  private readonly giveUpDialog: HTMLElement | null;
  private readonly confirmGiveUpButton: HTMLButtonElement | null;
  private readonly cancelGiveUpButton: HTMLButtonElement | null;
  private readonly speedButtons: HTMLButtonElement[];
  private readonly achievementNotifier?: (message: string) => void;
  private readonly achievementUnlocker?: (id: BeanstalkAchievementId) => void;
  private state: BeanstalkSystemState = createInitialBeanstalkSystem();
  private moneyVBucks = 5000;
  private selectedIndex = 0;
  private selectedTransferKey: string | null = null;
  private animationFrame: number | null = null;
  private lastTimestamp = 0;
  private activeTransfer: ActiveTransfer | null = null;
  private speedMultiplier = 1;
  private hasAwardedFirstLaunch = false;
  private gameOver = false;
  private message = 'Admiral Voss: Public Beanstalk Works is cleared for first transfer.';

  constructor(options: BeanstalkGameOptions) {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Beanstalk Conductor needs a 2D canvas context.');
    }
    this.context = context;
    this.civicPrimeImage.src = civicPrimeUrl;
    this.fleetCentralImage.src = fleetCentralUrl;
    this.statsDisplay = options.statsDisplay;
    this.selectionDisplay = options.selectionDisplay;
    this.timingDisplay = options.timingDisplay;
    this.admiralDisplay = options.admiralDisplay;
    this.admiralPortraitDisplay = options.admiralPortraitDisplay;
    this.transferBannerDisplay = options.transferBannerDisplay;
    this.resetButton = options.resetButton;
    this.giveUpButton = options.giveUpButton;
    this.giveUpDialog = options.giveUpDialog;
    this.confirmGiveUpButton = options.confirmGiveUpButton;
    this.cancelGiveUpButton = options.cancelGiveUpButton;
    this.speedButtons = options.speedButtons;
    this.achievementNotifier = options.achievementNotifier;
    this.achievementUnlocker = options.achievementUnlocker;
    options.container.replaceChildren(this.canvas);
    document.addEventListener('keydown', this.handleKeyDown);
    this.canvas.addEventListener('click', this.handleCanvasClick);
    this.resetButton?.addEventListener('click', this.handleResetClick);
    this.giveUpButton?.addEventListener('click', this.showGiveUpDialog);
    this.confirmGiveUpButton?.addEventListener('click', this.handleConfirmGiveUp);
    this.cancelGiveUpButton?.addEventListener('click', this.hideGiveUpDialog);
    this.speedButtons.forEach(button => {
      button.addEventListener('click', this.handleSpeedButtonClick);
    });
    this.updateSpeedButtons();
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  start(): void {
    this.lastTimestamp = performance.now();
    this.animationFrame = window.requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('keydown', this.handleKeyDown);
    this.canvas.removeEventListener('click', this.handleCanvasClick);
    this.resetButton?.removeEventListener('click', this.handleResetClick);
    this.giveUpButton?.removeEventListener('click', this.showGiveUpDialog);
    this.confirmGiveUpButton?.removeEventListener('click', this.handleConfirmGiveUp);
    this.cancelGiveUpButton?.removeEventListener('click', this.hideGiveUpDialog);
    this.speedButtons.forEach(button => {
      button.removeEventListener('click', this.handleSpeedButtonClick);
    });
  }

  private readonly handleSpeedButtonClick = (event: MouseEvent): void => {
    const button = event.currentTarget as HTMLButtonElement | null;
    const speed = Number(button?.dataset.beanstalkSpeed);
    if (![1, 2, 4, 8, 16, 32].includes(speed)) {
      return;
    }
    this.speedMultiplier = speed;
    this.updateSpeedButtons();
  };

  private readonly handleResetClick = (): void => {
    this.state = createInitialBeanstalkSystem();
    this.moneyVBucks = 5000;
    this.selectedIndex = 0;
    this.selectedTransferKey = null;
    this.activeTransfer = null;
    this.hasAwardedFirstLaunch = false;
    this.gameOver = false;
    this.message = 'Admiral Voss: Public Beanstalk Works is cleared for first transfer.';
    this.hideGiveUpDialog();
    this.updateDisplays();
  };

  private readonly showGiveUpDialog = (): void => {
    if (!this.giveUpDialog) {
      window.location.hash = '#beanstalk-conductor';
      return;
    }
    this.giveUpDialog.hidden = false;
    this.confirmGiveUpButton?.focus();
  };

  private readonly hideGiveUpDialog = (): void => {
    if (this.giveUpDialog) {
      this.giveUpDialog.hidden = true;
    }
  };

  private readonly handleConfirmGiveUp = (): void => {
    window.location.hash = '#beanstalk-conductor';
  };

  private readonly resize = (): void => {
    const parent = this.canvas.parentElement;
    if (!parent) {
      return;
    }
    const width = Math.max(640, parent.clientWidth);
    const height = Math.max(420, parent.clientHeight);
    const scale = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(width * scale);
    this.canvas.height = Math.round(height * scale);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.setTransform(scale, 0, 0, scale, 0, 0);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (this.giveUpDialog && !this.giveUpDialog.hidden) {
        this.hideGiveUpDialog();
      } else {
        this.showGiveUpDialog();
      }
      return;
    }
    if (this.giveUpDialog && !this.giveUpDialog.hidden) {
      return;
    }
    if (event.key.toLowerCase() === 'w') {
      event.preventDefault();
      this.adjustSpeed(1);
      return;
    }
    if (event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.adjustSpeed(-1);
      return;
    }
    const transfers = getAvailableTransfers(this.state);
    this.reconcileSelectedTransfer(transfers);
    if (this.activeTransfer || this.gameOver) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.selectedIndex = transfers.length > 0 ? (this.selectedIndex + 1) % transfers.length : 0;
      this.storeSelectedTransfer(transfers);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      this.selectedIndex = transfers.length > 0
        ? (this.selectedIndex - 1 + transfers.length) % transfers.length
        : 0;
      this.storeSelectedTransfer(transfers);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.launchSelectedTransfer(transfers);
    }
  };

  private readonly handleCanvasClick = (event: MouseEvent): void => {
    event.preventDefault();
    this.canvas.parentElement?.focus();
  };

  private launchSelectedTransfer(transfers: TransferOpportunity[]): void {
    this.reconcileSelectedTransfer(transfers);
    const target = transfers[this.selectedIndex];
    if (!target) {
      this.message = 'Admiral Voss: There is no legal transfer queued.';
      return;
    }
    const issue = getTransferAvailabilityIssue(this.state, target);
    if (issue) {
      this.message = issue.message;
      return;
    }
    this.awardFirstLaunch();
    if (target.mode === 'cross-tether') {
      const resolved = resolveTransfer(this.state, target);
      this.state = resolved.state;
      this.moneyVBucks -= resolved.costVBucks;
      this.message = `Admiral Voss: ${resolved.message}`;
      this.selectOpportunityForMass(target.targetBarbellId, target.targetEndpoint, target.kind);
      return;
    }
    let launch;
    try {
      launch = createTransferLaunch(this.state, target);
    } catch (error) {
      if (error instanceof TransferSolveFailure) {
        this.message = `Admiral Voss: No usable release window. ${formatSolveFailure(error)} ${formatTimingEstimateForFailure(this.state, target)}`;
        return;
      }
      throw error;
    }
    const payload = launch.state.payloads[0];
    this.state = launch.state;
    this.activeTransfer = {
      target,
      payload,
      correctionMagnitude: launch.correctionMagnitude,
      releaseSpeed: launch.releaseSpeed,
      previousAngularError: launch.previousAngularError,
      catchArmed: launch.catchArmed,
      angularTravel: launch.angularTravel,
      minCatchSeconds: launch.minCatchSeconds,
      elapsedSeconds: 0,
    };
    this.message = `Admiral Voss: ${target.label}. Correction ${launch.correctionMagnitude.toFixed(2)} m/s.`;
  }

  private readonly tick = (timestamp: number): void => {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = timestamp;
    this.update(dt);
    this.render();
    this.animationFrame = window.requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    if (this.gameOver) {
      return;
    }

    if (this.activeTransfer) {
      this.advanceActiveTransfer(dt);
      return;
    }

    this.state = this.stepState(dt * NORMAL_TIME_SCALE * this.speedMultiplier);
    this.checkInfrastructureCollision();
  }

  private advanceActiveTransfer(dt: number): void {
    if (!this.activeTransfer) {
      return;
    }
    let remaining = dt * TRANSFER_TIME_SCALE * this.speedMultiplier;
    while (this.activeTransfer && remaining > 0) {
      const step = Math.min(MAX_SIM_STEP_SECONDS, remaining);
      this.state = {
        ...this.state,
        payloads: [this.activeTransfer.payload],
      };
      this.state = stepSystem(this.state, step);
      const payload = this.state.payloads[0];
      const currentAngularError = getAngularCatchError(this.state, this.activeTransfer.target);
      const angularTravel: number = this.activeTransfer.target.destinationKind === 'planet-disposal'
        ? this.activeTransfer.angularTravel
        : this.activeTransfer.angularTravel
          + Math.abs(signedAngularDelta(this.activeTransfer.previousAngularError, currentAngularError));
      const passedCatchAngle = didPassCatchAngle(this.activeTransfer.previousAngularError, currentAngularError);
      const caught = this.activeTransfer.target.destinationKind === 'planet-disposal'
        ? this.activeTransfer.previousAngularError > 0 && currentAngularError <= 0
        : this.activeTransfer.elapsedSeconds >= this.activeTransfer.minCatchSeconds
          && this.activeTransfer.catchArmed
          && passedCatchAngle;
      const catchArmed: boolean = this.activeTransfer.catchArmed
        || this.activeTransfer.target.destinationKind === 'planet-disposal'
        || (
          this.activeTransfer.elapsedSeconds > 0.15
          && Math.abs(currentAngularError) >= CATCH_ARM_ANGLE_RAD
        );
      this.activeTransfer = {
        ...this.activeTransfer,
        payload,
        previousAngularError: currentAngularError,
        catchArmed,
        angularTravel,
        elapsedSeconds: this.activeTransfer.elapsedSeconds + step,
      };
      if (caught) {
        const resolved = resolveCaughtTransfer(
          this.state,
          this.activeTransfer.target,
          this.activeTransfer.correctionMagnitude,
          this.activeTransfer.releaseSpeed,
        );
        this.state = resolved.state;
        this.moneyVBucks -= resolved.costVBucks;
        this.message = `Admiral Voss: ${resolved.message} Release speed ${resolved.releaseSpeed.toFixed(2)} m/s. Catch speed ${resolved.relativeCatchSpeed.toFixed(2)} m/s. Altitude error ${resolved.altitudeError.toFixed(2)}.`;
        const caughtTarget = this.activeTransfer.target;
        this.activeTransfer = null;
        if (caughtTarget.destinationKind) {
          this.selectedIndex = 0;
          this.selectedTransferKey = null;
        } else {
          this.selectOpportunityForMass(caughtTarget.targetBarbellId, caughtTarget.targetEndpoint, caughtTarget.kind);
        }
      }
      if (
        this.activeTransfer
        && this.activeTransfer.target.destinationKind !== 'planet-disposal'
        && this.activeTransfer.angularTravel >= MAX_TRANSFER_ANGULAR_TRAVEL_RAD
      ) {
        this.state = {
          ...this.state,
          payloads: [],
        };
        this.message = 'Admiral Voss: Transfer missed the first angular crossing. Payload tracking aborted before another orbit.';
        this.activeTransfer = null;
      }
      this.checkInfrastructureCollision();
      remaining -= step;
    }
  }

  private stepState(dt: number): BeanstalkSystemState {
    let remaining = dt;
    let current = this.state;
    while (remaining > 0) {
      const step = Math.min(MAX_SIM_STEP_SECONDS, remaining);
      current = stepSystem(current, step);
      remaining -= step;
    }
    return current;
  }

  private render(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const ctx = this.context;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#050709';
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(width, height) / VIEW_WORLD_DIAMETER;
    const center = { x: width / 2, y: height / 2 };
    this.drawPlanet(ctx, center, scale);
    this.drawFleetCentral(ctx, center, scale);
    this.drawSourceMasses(ctx, center, scale);
    this.drawBarbells(ctx, center, scale);
    this.drawPayloads(ctx, center, scale);
    if (this.gameOver) {
      this.drawGameOver(ctx, width, height);
    }
    this.updateDisplays();
  }

  private checkInfrastructureCollision(): void {
    const collision = detectInfrastructureCollision(this.state);
    if (!collision) {
      return;
    }
    this.gameOver = true;
    this.activeTransfer = null;
    if (collision.kind === 'planet') {
      this.message = `Admiral Voss: ${collision.barbellId} has intersected Civic Prime. Run ended.`;
      this.achievementUnlocker?.('tether-hit-civic-prime');
      this.achievementNotifier?.('Beanstalk Conductor: make the beanstalk a surface feature');
      return;
    }
    this.message = `Admiral Voss: ${collision.barbellId} has intersected Fleet Central. Run ended.`;
    this.achievementUnlocker?.('tether-hit-fleet-central');
    this.achievementNotifier?.('Beanstalk Conductor: introduce Fleet Central to the tether directly');
  }

  private drawPlanet(ctx: CanvasRenderingContext2D, center: Vec2, scale: number): void {
    const radius = this.state.planetRadius * scale;
    ctx.save();
    ctx.translate(center.x, center.y);
    if (this.civicPrimeImage.complete && this.civicPrimeImage.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.civicPrimeImage, -radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#356faa';
      ctx.fill();
    }
    this.drawSurfaceCannon(ctx, scale);
    ctx.restore();
  }

  private drawSurfaceCannon(ctx: CanvasRenderingContext2D, scale: number): void {
    const radius = this.state.planetRadius * scale;
    ctx.save();
    ctx.rotate(-75 * (Math.PI / 180));
    ctx.translate(radius - 5 * scale, 0);
    ctx.fillStyle = '#eac460';
    ctx.fillRect(-5 * scale, -4 * scale, 13 * scale, 8 * scale);
    ctx.fillStyle = '#d7e1de';
    ctx.fillRect(3 * scale, -2 * scale, 18 * scale, 4 * scale);
    ctx.restore();
  }

  private drawFleetCentral(ctx: CanvasRenderingContext2D, center: Vec2, scale: number): void {
    const station = getFleetCentralState({
      timeSeconds: this.state.timeSeconds,
      gravitationalParameter: this.state.gravitationalParameter,
    });
    const point = worldToCanvas(station.position, center, scale);
    const angle = Math.atan2(station.position.y, station.position.x);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(-angle);
    if (imageIsReady(this.fleetCentralImage)) {
      const size = 38 * scale;
      ctx.drawImage(this.fleetCentralImage, -size * 0.5, -size * 0.5, size, size);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(-13, -8, 26, 16);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(-13, 0);
      ctx.moveTo(13, 0);
      ctx.lineTo(22, 0);
      ctx.stroke();
    }
    ctx.fillStyle = '#dbeafe';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Fleet Central', 0, -14);
    ctx.restore();
  }

  private drawBarbells(ctx: CanvasRenderingContext2D, center: Vec2, scale: number): void {
    const transfers = getAvailableTransfers(this.state);
    this.reconcileSelectedTransfer(transfers);
    const selected = this.activeTransfer ? undefined : transfers[this.selectedIndex];
    for (const barbell of this.state.barbells) {
      const inner = getEndpointState(barbell, 'inner');
      const outer = getEndpointState(barbell, 'outer');
      const innerPoint = worldToCanvas(inner.position, center, scale);
      const outerPoint = worldToCanvas(outer.position, center, scale);
      ctx.strokeStyle = '#d7e1de';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(innerPoint.x, innerPoint.y);
      ctx.lineTo(outerPoint.x, outerPoint.y);
      ctx.stroke();
      this.drawEndpoint(ctx, innerPoint, inner.fill.upmassTons, inner.fill.downmassTons);
      this.drawEndpoint(ctx, outerPoint, outer.fill.upmassTons, outer.fill.downmassTons);
      this.drawSelectionMarker(ctx, selected, barbell.id, 'inner', innerPoint, inner.fill.upmassTons, inner.fill.downmassTons);
      this.drawSelectionMarker(ctx, selected, barbell.id, 'outer', outerPoint, outer.fill.upmassTons, outer.fill.downmassTons);
    }
    this.drawSourceSelection(ctx, selected, center, scale);
  }

  private drawEndpoint(
    ctx: CanvasRenderingContext2D,
    point: Vec2,
    upmassTons: number,
    downmassTons: number,
  ): void {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#eef4f8';
    ctx.fill();
    if (upmassTons > 0) {
      ctx.beginPath();
      ctx.arc(point.x - 7, point.y - 7, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#7dd3fc';
      ctx.fill();
    }
    if (downmassTons > 0) {
      ctx.beginPath();
      ctx.arc(point.x + 7, point.y + 7, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    }
  }

  private drawPayloads(ctx: CanvasRenderingContext2D, center: Vec2, scale: number): void {
    for (const payload of this.state.payloads) {
      const point = worldToCanvas(payload.position, center, scale);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = payload.kind === 'upmass' ? '#7dd3fc' : '#f59e0b';
      ctx.fill();
    }
  }

  private drawSourceMasses(ctx: CanvasRenderingContext2D, center: Vec2, scale: number): void {
    const launcher = worldToCanvas(this.surfaceLauncherPosition(), center, scale);
    if (!this.isActiveSourceLaunch(CIVIC_PRIME_SOURCE_ID, 'upmass')) {
      ctx.beginPath();
      ctx.arc(launcher.x + 5, launcher.y - 3, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#7dd3fc';
      ctx.fill();
    }

    const station = getFleetCentralState({
      timeSeconds: this.state.timeSeconds,
      gravitationalParameter: this.state.gravitationalParameter,
    });
    const fleet = worldToCanvas(station.position, center, scale);
    if (!this.isActiveSourceLaunch('fleet-central-downmass-source', 'downmass')) {
      ctx.beginPath();
      ctx.arc(fleet.x + 22, fleet.y + 16, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    }
  }

  private isActiveSourceLaunch(sourceBarbellId: string, kind: 'upmass' | 'downmass'): boolean {
    return this.activeTransfer?.target.sourceBarbellId === sourceBarbellId
      && this.activeTransfer.target.kind === kind;
  }

  private drawSelectionMarker(
    ctx: CanvasRenderingContext2D,
    selected: TransferOpportunity | undefined,
    barbellId: string,
    endpoint: 'inner' | 'outer',
    point: Vec2,
    upmassTons: number,
    downmassTons: number,
  ): void {
    if (!selected || selected.mode === 'source-load') {
      return;
    }
    if (selected.sourceBarbellId !== barbellId || selected.sourceEndpoint !== endpoint) {
      return;
    }
    const markerPoint = this.massMarkerPoint(point, selected.kind, upmassTons, downmassTons);
    ctx.save();
    ctx.strokeStyle = '#050709';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(markerPoint.x, markerPoint.y, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = selected.kind === 'upmass' ? '#7dd3fc' : '#f59e0b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(markerPoint.x, markerPoint.y, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private massMarkerPoint(
    point: Vec2,
    kind: 'upmass' | 'downmass',
    upmassTons: number,
    downmassTons: number,
  ): Vec2 {
    if (kind === 'upmass' && upmassTons > 0) {
      return { x: point.x - 7, y: point.y - 7 };
    }
    if (kind === 'downmass' && downmassTons > 0) {
      return { x: point.x + 7, y: point.y + 7 };
    }
    return point;
  }

  private drawSourceSelection(
    ctx: CanvasRenderingContext2D,
    selected: TransferOpportunity | undefined,
    center: Vec2,
    scale: number,
  ): void {
    if (!selected || selected.mode !== 'source-load') {
      return;
    }
    const source = worldToCanvas(this.sourceMassPositionFor(selected), center, scale);
    ctx.save();
    ctx.strokeStyle = '#050709';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(source.x, source.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = selected.kind === 'upmass' ? '#7dd3fc' : '#f59e0b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(source.x, source.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private sourceMassPositionFor(target: TransferOpportunity): Vec2 {
    const source = this.sourcePositionFor(target);
    if (target.sourceBarbellId === CIVIC_PRIME_SOURCE_ID) {
      return { x: source.x + 2, y: source.y + 1.2 };
    }
    return { x: source.x + 22, y: source.y + 16 };
  }

  private sourcePositionFor(target: TransferOpportunity): Vec2 {
    if (target.sourceBarbellId === CIVIC_PRIME_SOURCE_ID) {
      return this.surfaceLauncherPosition();
    }
    return getFleetCentralState({
      timeSeconds: this.state.timeSeconds,
      gravitationalParameter: this.state.gravitationalParameter,
    }).position;
  }

  private surfaceLauncherPosition(): Vec2 {
    return createSurfaceLauncherState().position;
  }

  private selectOpportunityForMass(
    barbellId: string,
    endpoint: 'inner' | 'outer',
    kind: 'upmass' | 'downmass',
  ): void {
    const transfers = getAvailableTransfers(this.state);
    const index = transfers.findIndex(transfer => (
      transfer.kind === kind
      && transfer.sourceBarbellId === barbellId
      && transfer.sourceEndpoint === endpoint
    ));
    this.selectedIndex = index >= 0 ? index : 0;
    this.storeSelectedTransfer(transfers);
  }

  private drawGameOver(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 9, 0.72)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Run ended', width / 2, height / 2 - 8);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('Reset the page to try another operating schedule.', width / 2, height / 2 + 24);
    ctx.restore();
  }

  private updateDisplays(): void {
    const transfers = getAvailableTransfers(this.state);
    this.reconcileSelectedTransfer(transfers);
    const selected = transfers[this.selectedIndex];
    if (this.statsDisplay) {
      this.statsDisplay.textContent = [
        `Money: ${this.moneyVBucks} vBucks`,
        `Time: t=${this.state.timeSeconds.toFixed(1)} s`,
      ].join('\n');
    }
    if (this.selectionDisplay) {
      this.selectionDisplay.textContent = this.activeTransfer
        ? `Selection: paused`
        : selected
          ? `Selection: ${selected.label} | ${selected.massTons.toFixed(0)} tons`
          : 'Selection: no legal transfer';
    }
    if (this.timingDisplay) {
      this.updateTimingDisplay(selected);
    }
    if (this.transferBannerDisplay) {
      this.transferBannerDisplay.hidden = !this.activeTransfer;
    }
    if (this.admiralDisplay) {
      this.admiralDisplay.textContent = this.message.replace(/^Admiral Voss:\s*/, '');
    }
    if (this.admiralPortraitDisplay) {
      const portraitUrl = this.getAdmiralPortraitUrl();
      if (this.admiralPortraitDisplay.getAttribute('src') !== portraitUrl) {
        this.admiralPortraitDisplay.src = portraitUrl;
      }
    }
  }

  private updateTimingDisplay(selected: TransferOpportunity | undefined): void {
    if (!this.timingDisplay) {
      return;
    }
    if (this.activeTransfer || !selected) {
      this.timingDisplay.textContent = 'Timing: --';
      this.timingDisplay.style.setProperty('--beanstalk-timing-quality', '0');
      this.timingDisplay.classList.add('beanstalk-timing-unavailable');
      return;
    }
    const estimate = estimateTransferTiming(this.state, selected);
    if (!estimate?.supported) {
      this.timingDisplay.textContent = 'Timing: --';
      this.timingDisplay.style.setProperty('--beanstalk-timing-quality', '0');
      this.timingDisplay.classList.add('beanstalk-timing-unavailable');
      return;
    }
    this.timingDisplay.classList.remove('beanstalk-timing-unavailable');
    this.timingDisplay.style.setProperty('--beanstalk-timing-quality', estimate.quality.toFixed(3));
    this.timingDisplay.textContent = estimate.quality > 0
      ? `Timing: ${(estimate.quality * 100).toFixed(0)}% | ideal in ${estimate.nextIdealReleaseSeconds.toFixed(1)} s`
      : `Timing: X | ideal in ${estimate.nextIdealReleaseSeconds.toFixed(1)} s`;
  }

  private getAdmiralPortraitUrl(): string {
    if (this.gameOver || this.message.includes('intersected')) {
      return admiralVossPanicUrl;
    }
    if (this.moneyVBucks < 1000) {
      return admiralVossPanicUrl;
    }
    if (this.moneyVBucks < 2200 || this.message.includes('No usable') || this.message.includes('cannot launch')) {
      return admiralVossAlarmedUrl;
    }
    if (this.message.includes('accepted') || this.message.includes('Source transfer complete')) {
      return admiralVossApprovalUrl;
    }
    if (this.message.includes('Correction') || this.message.includes('Catch speed')) {
      return admiralVossConcernUrl;
    }
    return admiralVossUrl;
  }

  private updateSpeedButtons(): void {
    this.speedButtons.forEach(button => {
      const selected = Number(button.dataset.beanstalkSpeed) === this.speedMultiplier;
      button.classList.toggle('beanstalk-speed-button-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  private adjustSpeed(direction: -1 | 1): void {
    const speeds = [1, 2, 4, 8, 16, 32];
    const currentIndex = speeds.indexOf(this.speedMultiplier);
    const nextIndex = Math.max(0, Math.min(speeds.length - 1, currentIndex + direction));
    this.speedMultiplier = speeds[nextIndex] ?? 1;
    this.updateSpeedButtons();
  }

  private awardFirstLaunch(): void {
    if (this.hasAwardedFirstLaunch) {
      return;
    }
    this.hasAwardedFirstLaunch = true;
    this.achievementUnlocker?.('first-mass-launch');
    this.achievementNotifier?.('Beanstalk Conductor: launch a mass');
  }

  private reconcileSelectedTransfer(transfers: TransferOpportunity[]): void {
    if (transfers.length <= 0) {
      this.selectedIndex = 0;
      this.selectedTransferKey = null;
      return;
    }
    if (this.selectedTransferKey) {
      const existingIndex = transfers.findIndex(transfer => this.transferKey(transfer) === this.selectedTransferKey);
      if (existingIndex >= 0) {
        this.selectedIndex = existingIndex;
        return;
      }
    }
    if (this.selectedIndex < 0 || this.selectedIndex >= transfers.length) {
      this.selectedIndex = 0;
    }
    this.storeSelectedTransfer(transfers);
  }

  private storeSelectedTransfer(transfers: TransferOpportunity[]): void {
    this.selectedTransferKey = transfers[this.selectedIndex]
      ? this.transferKey(transfers[this.selectedIndex])
      : null;
  }

  private transferKey(transfer: TransferOpportunity): string {
    return [
      transfer.mode,
      transfer.kind,
      transfer.sourceBarbellId,
      transfer.sourceEndpoint,
      transfer.targetBarbellId,
      transfer.targetEndpoint,
      transfer.destinationKind ?? 'barbell-end',
    ].join(':');
  }
}

function worldToCanvas(position: Vec2, center: Vec2, scale: number): Vec2 {
  return {
    x: center.x + position.x * scale,
    y: center.y - position.y * scale,
  };
}

function imageIsReady(image: HTMLImageElement): boolean {
  return image.complete && image.naturalWidth > 0;
}

function formatSolveFailure(error: TransferSolveFailure): string {
  const result = error.solveResult;
  if (!result) {
    return `Solver reason: ${error.reason}.`;
  }
  const parts = [
    `Solver reason: ${error.reason}.`,
    `Best release speed adjustment ${formatMaybeFinite(result.scalarCorrection)} m/s.`,
  ];
  if (result.scalarBounds) {
    parts.push(`Allowed adjustment ${result.scalarBounds.low.toFixed(2)}..${result.scalarBounds.high.toFixed(2)} m/s.`);
  }
  if (result.boundEvaluations) {
    parts.push(
      `Altitude error at low bound ${formatMaybeFinite(result.boundEvaluations.low.altitudeError)}.`,
      `Altitude error at high bound ${formatMaybeFinite(result.boundEvaluations.high.altitudeError)}.`,
    );
    if (!result.boundEvaluations.bracketsRoot) {
      parts.push('No bisection: no continuous catching interval brackets zero altitude error.');
    }
  } else if (Number.isFinite(result.missDistance)) {
    parts.push(`Best altitude error ${result.missDistance.toFixed(2)}.`);
  }
  if (result.iterations > 0) {
    parts.push(`Bisection iterations ${result.iterations}.`);
  }
  return parts.join(' ');
}

function formatTimingEstimateForFailure(state: BeanstalkSystemState, target: TransferOpportunity): string {
  const estimate = estimateTransferTiming(state, target);
  if (!estimate) {
    return 'Timing estimate: unsupported.';
  }
  if (!estimate.supported) {
    return `Timing estimate: ${estimate.reason}.`;
  }
  return [
    `Simple timing bar ${(estimate.quality * 100).toFixed(0)}%.`,
    `Timing angle error ${estimate.phaseErrorRad.toFixed(3)} rad.`,
    `Next simple ideal ${estimate.nextIdealReleaseSeconds.toFixed(1)} s.`,
  ].join(' ');
}

function formatMaybeFinite(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : 'no angular crossing';
}
