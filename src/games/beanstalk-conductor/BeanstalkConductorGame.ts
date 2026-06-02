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
  getAvailableTransfers,
  getTransferAvailabilityIssue,
  getAngularCatchError,
  resolveTransfer,
  resolveCaughtTransfer,
  TransferSolveFailure,
  type TransferOpportunity,
} from './gameLogic';
import type { BeanstalkAchievementId } from './achievements';

type BeanstalkGameOptions = {
  container: HTMLElement;
  statsDisplay: HTMLElement | null;
  selectionDisplay: HTMLElement | null;
  admiralDisplay: HTMLElement | null;
  admiralPortraitDisplay: HTMLImageElement | null;
  achievementNotifier?: (message: string) => void;
  achievementUnlocker?: (id: BeanstalkAchievementId) => void;
};

type ActiveTransfer = {
  target: TransferTarget;
  payload: PayloadState;
  correctionMagnitude: number;
  previousAngularError: number;
  elapsedSeconds: number;
};

type ActiveSourceLoad = {
  target: TransferOpportunity;
  elapsedSeconds: number;
  durationSeconds: number;
};

const NORMAL_TIME_SCALE = 2;
const TRANSFER_TIME_SCALE = 4;
const MAX_SIM_STEP_SECONDS = 0.05;
const SOURCE_LOAD_SECONDS = 1.1;
const VIEW_WORLD_DIAMETER = 860;
const CIVIC_PRIME_SOURCE_ID = 'civic-prime-space-gun';

export class BeanstalkConductorGame {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly civicPrimeImage = new Image();
  private readonly fleetCentralImage = new Image();
  private readonly statsDisplay: HTMLElement | null;
  private readonly selectionDisplay: HTMLElement | null;
  private readonly admiralDisplay: HTMLElement | null;
  private readonly admiralPortraitDisplay: HTMLImageElement | null;
  private readonly achievementNotifier?: (message: string) => void;
  private readonly achievementUnlocker?: (id: BeanstalkAchievementId) => void;
  private state: BeanstalkSystemState = createInitialBeanstalkSystem();
  private moneyVBucks = 5000;
  private selectedIndex = 0;
  private selectedTransferKey: string | null = null;
  private animationFrame: number | null = null;
  private lastTimestamp = 0;
  private activeTransfer: ActiveTransfer | null = null;
  private activeSourceLoad: ActiveSourceLoad | null = null;
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
    this.admiralDisplay = options.admiralDisplay;
    this.admiralPortraitDisplay = options.admiralPortraitDisplay;
    this.achievementNotifier = options.achievementNotifier;
    this.achievementUnlocker = options.achievementUnlocker;
    options.container.replaceChildren(this.canvas);
    options.container.addEventListener('keydown', this.handleKeyDown);
    this.canvas.addEventListener('click', this.handleCanvasClick);
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
    this.canvas.parentElement?.removeEventListener('keydown', this.handleKeyDown);
    this.canvas.removeEventListener('click', this.handleCanvasClick);
  }

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
    const transfers = getAvailableTransfers(this.state);
    this.reconcileSelectedTransfer(transfers);
    if (this.activeTransfer || this.activeSourceLoad || this.gameOver) {
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
    if (this.activeTransfer || this.activeSourceLoad || this.gameOver) {
      return;
    }
    const transfers = getAvailableTransfers(this.state);
    this.reconcileSelectedTransfer(transfers);
    const clicked = this.transferAtCanvasPoint(event, transfers);
    if (!clicked) {
      return;
    }
    this.selectedIndex = clicked.index;
    this.storeSelectedTransfer(transfers);
    this.launchSelectedTransfer(transfers);
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
    if (target.mode === 'source-load') {
      this.activeSourceLoad = {
        target,
        elapsedSeconds: 0,
        durationSeconds: SOURCE_LOAD_SECONDS,
      };
      this.message = `Admiral Voss: ${target.label}. Feed transfer in progress.`;
      return;
    }
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
        this.message = 'Admiral Voss: No usable release window. I am told the engineers have theories.';
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
      previousAngularError: launch.previousAngularError,
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

    if (this.activeSourceLoad) {
      this.advanceSourceLoad(dt);
      return;
    }

    if (this.activeTransfer) {
      this.advanceActiveTransfer(dt);
      return;
    }

    this.state = this.stepState(dt * NORMAL_TIME_SCALE);
    this.checkInfrastructureCollision();
  }

  private advanceSourceLoad(dt: number): void {
    if (!this.activeSourceLoad) {
      return;
    }
    this.state = this.stepState(dt * NORMAL_TIME_SCALE);
    this.activeSourceLoad.elapsedSeconds += dt;
    if (this.activeSourceLoad.elapsedSeconds >= this.activeSourceLoad.durationSeconds) {
      const completedTarget = this.activeSourceLoad.target;
      const resolved = resolveTransfer(this.state, completedTarget);
      this.state = resolved.state;
      this.moneyVBucks -= resolved.costVBucks;
      this.message = `Admiral Voss: ${resolved.message}`;
      this.activeSourceLoad = null;
      this.selectOpportunityForMass(completedTarget.targetBarbellId, completedTarget.targetEndpoint, completedTarget.kind);
    }
    this.checkInfrastructureCollision();
  }

  private advanceActiveTransfer(dt: number): void {
    if (!this.activeTransfer) {
      return;
    }
    let remaining = dt * TRANSFER_TIME_SCALE;
    while (this.activeTransfer && remaining > 0) {
      const step = Math.min(MAX_SIM_STEP_SECONDS, remaining);
      this.state = {
        ...this.state,
        payloads: [this.activeTransfer.payload],
      };
      this.state = stepSystem(this.state, step);
      const payload = this.state.payloads[0];
      const currentAngularError = getAngularCatchError(this.state, this.activeTransfer.target);
      const caught = this.activeTransfer.elapsedSeconds > 0.15
        && (this.activeTransfer.target.destinationKind === 'planet-disposal'
          ? this.activeTransfer.previousAngularError > 0 && currentAngularError <= 0
          : didPassCatchAngle(this.activeTransfer.previousAngularError, currentAngularError));
      this.activeTransfer = {
        ...this.activeTransfer,
        payload,
        previousAngularError: currentAngularError,
        elapsedSeconds: this.activeTransfer.elapsedSeconds + step,
      };
      if (caught) {
        const resolved = resolveCaughtTransfer(
          this.state,
          this.activeTransfer.target,
          this.activeTransfer.correctionMagnitude,
        );
        this.state = resolved.state;
        this.moneyVBucks -= resolved.costVBucks;
        this.message = `Admiral Voss: ${resolved.message} Catch speed ${resolved.relativeCatchSpeed.toFixed(2)} m/s.`;
        const caughtTarget = this.activeTransfer.target;
        this.activeTransfer = null;
        if (caughtTarget.destinationKind) {
          this.selectedIndex = 0;
          this.selectedTransferKey = null;
        } else {
          this.selectOpportunityForMass(caughtTarget.targetBarbellId, caughtTarget.targetEndpoint, caughtTarget.kind);
        }
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
    this.drawSourceLoadPayload(ctx, center, scale);
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
    this.activeSourceLoad = null;
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
    ctx.rotate(0);
    ctx.translate(radius - 7 * scale, 0);
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
    const selected = transfers[this.selectedIndex];
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
      this.drawSelectionMarker(ctx, selected, barbell.id, 'inner', innerPoint);
      this.drawSelectionMarker(ctx, selected, barbell.id, 'outer', outerPoint);
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
    ctx.beginPath();
    ctx.arc(launcher.x + 18, launcher.y - 12, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#7dd3fc';
    ctx.fill();

    const station = getFleetCentralState({
      timeSeconds: this.state.timeSeconds,
      gravitationalParameter: this.state.gravitationalParameter,
    });
    const fleet = worldToCanvas(station.position, center, scale);
    ctx.beginPath();
    ctx.arc(fleet.x + 22, fleet.y + 16, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
  }

  private drawSourceLoadPayload(ctx: CanvasRenderingContext2D, center: Vec2, scale: number): void {
    if (!this.activeSourceLoad) {
      return;
    }
    const progress = Math.min(1, this.activeSourceLoad.elapsedSeconds / this.activeSourceLoad.durationSeconds);
    const source = this.sourcePositionFor(this.activeSourceLoad.target);
    const target = this.targetEndpointPositionFor(this.activeSourceLoad.target);
    if (!target) {
      return;
    }
    const eased = progress * progress * (3 - 2 * progress);
    const position = horizontalLaunchPath(source, target, eased);
    const point = worldToCanvas(position, center, scale);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = this.activeSourceLoad.target.kind === 'upmass' ? '#7dd3fc' : '#f59e0b';
    ctx.fill();
  }

  private drawSelectionMarker(
    ctx: CanvasRenderingContext2D,
    selected: TransferOpportunity | undefined,
    barbellId: string,
    endpoint: 'inner' | 'outer',
    point: Vec2,
  ): void {
    if (!selected || selected.mode === 'source-load') {
      return;
    }
    if (selected.sourceBarbellId !== barbellId || selected.sourceEndpoint !== endpoint) {
      return;
    }
    ctx.save();
    ctx.strokeStyle = selected.kind === 'upmass' ? '#7dd3fc' : '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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
    const source = worldToCanvas(this.sourcePositionFor(selected), center, scale);
    ctx.save();
    ctx.strokeStyle = selected.kind === 'upmass' ? '#7dd3fc' : '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(source.x, source.y, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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

  private targetEndpointPositionFor(target: TransferOpportunity): Vec2 | null {
    const barbell = this.state.barbells.find(candidate => candidate.id === target.targetBarbellId);
    return barbell ? getEndpointState(barbell, target.targetEndpoint).position : null;
  }

  private transferSourcePosition(target: TransferOpportunity): Vec2 | null {
    if (target.mode === 'source-load') {
      return this.sourcePositionFor(target);
    }
    const barbell = this.state.barbells.find(candidate => candidate.id === target.sourceBarbellId);
    return barbell ? getEndpointState(barbell, target.sourceEndpoint).position : null;
  }

  private surfaceLauncherPosition(): Vec2 {
    return createSurfaceLauncherState().position;
  }

  private transferAtCanvasPoint(
    event: MouseEvent,
    transfers: TransferOpportunity[],
  ): { index: number; distancePx: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const scale = Math.min(this.canvas.clientWidth, this.canvas.clientHeight) / VIEW_WORLD_DIAMETER;
    const center = { x: this.canvas.clientWidth / 2, y: this.canvas.clientHeight / 2 };
    let best: { index: number; distancePx: number } | null = null;
    for (let index = 0; index < transfers.length; index += 1) {
      const sourcePosition = this.transferSourcePosition(transfers[index]);
      if (!sourcePosition) {
        continue;
      }
      const screen = worldToCanvas(sourcePosition, center, scale);
      const distancePx = Math.hypot(point.x - screen.x, point.y - screen.y);
      if (distancePx <= 34 && (!best || distancePx < best.distancePx)) {
        best = { index, distancePx };
      }
    }
    return best;
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
      this.statsDisplay.textContent = `${this.moneyVBucks} vBucks | t=${this.state.timeSeconds.toFixed(1)} s`;
    }
    if (this.selectionDisplay) {
      this.selectionDisplay.textContent = this.activeTransfer
        ? `transfer in progress: ${this.activeTransfer.target.kind}`
        : this.activeSourceLoad
          ? `source feed in progress: ${this.activeSourceLoad.target.kind}`
        : selected
          ? `${selected.label} | ${selected.massTons.toFixed(0)} tons`
          : 'no legal transfer';
    }
    if (this.admiralDisplay) {
      this.admiralDisplay.textContent = this.message;
    }
    if (this.admiralPortraitDisplay) {
      const portraitUrl = this.getAdmiralPortraitUrl();
      if (this.admiralPortraitDisplay.getAttribute('src') !== portraitUrl) {
        this.admiralPortraitDisplay.src = portraitUrl;
      }
    }
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
    if (this.message.includes('accepted') || this.message.includes('Source load complete')) {
      return admiralVossApprovalUrl;
    }
    if (this.message.includes('Correction') || this.message.includes('Catch speed') || this.message.includes('Feed transfer')) {
      return admiralVossConcernUrl;
    }
    return admiralVossUrl;
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

function horizontalLaunchPath(source: Vec2, target: Vec2, progress: number): Vec2 {
  const direction = target.x >= source.x ? 1 : -1;
  const controlDistance = Math.max(35, Math.abs(target.x - source.x) * 0.35);
  const controlA = { x: source.x + direction * controlDistance, y: source.y };
  const controlB = { x: target.x - direction * controlDistance, y: target.y };
  const inverse = 1 - progress;
  const a = inverse * inverse * inverse;
  const b = 3 * inverse * inverse * progress;
  const c = 3 * inverse * progress * progress;
  const d = progress * progress * progress;
  return {
    x: source.x * a + controlA.x * b + controlB.x * c + target.x * d,
    y: source.y * a + controlA.y * b + controlB.y * c + target.y * d,
  };
}

function imageIsReady(image: HTMLImageElement): boolean {
  return image.complete && image.naturalWidth > 0;
}
