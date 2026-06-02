export type Vec2 = {
  x: number;
  y: number;
};

export type EndpointKey = 'inner' | 'outer';

export type MassFill = {
  upmassTons: number;
  downmassTons: number;
};

export type BarbellState = {
  id: string;
  center: Vec2;
  velocity: Vec2;
  angleRad: number;
  angularVelocityRadPerSecond: number;
  length: number;
  dryMassTons: number;
  inner: MassFill;
  outer: MassFill;
};

export type PayloadState = {
  id: string;
  kind: 'upmass' | 'downmass';
  massTons: number;
  position: Vec2;
  velocity: Vec2;
};

export type BeanstalkSystemState = {
  timeSeconds: number;
  planetRadius: number;
  gravitationalParameter: number;
  barbells: BarbellState[];
  payloads: PayloadState[];
};

export type EndpointState = {
  barbellId: string;
  endpoint: EndpointKey;
  position: Vec2;
  velocity: Vec2;
  massTons: number;
  fill: MassFill;
};

export function vec(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, scalar: number): Vec2 {
  return { x: v.x * scalar, y: v.y * scalar };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function lengthSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

export function normalize(v: Vec2): Vec2 {
  const magnitude = length(v);
  return magnitude > 0 ? scale(v, 1 / magnitude) : vec(0, 0);
}

export function rotate90(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}

export function fromAngle(angleRad: number): Vec2 {
  return { x: Math.cos(angleRad), y: Math.sin(angleRad) };
}

export function cloneSystem(state: BeanstalkSystemState): BeanstalkSystemState {
  return {
    timeSeconds: state.timeSeconds,
    planetRadius: state.planetRadius,
    gravitationalParameter: state.gravitationalParameter,
    barbells: state.barbells.map(barbell => ({
      ...barbell,
      center: { ...barbell.center },
      velocity: { ...barbell.velocity },
      inner: { ...barbell.inner },
      outer: { ...barbell.outer },
    })),
    payloads: state.payloads.map(payload => ({
      ...payload,
      position: { ...payload.position },
      velocity: { ...payload.velocity },
    })),
  };
}

export function cloneBarbell(barbell: BarbellState): BarbellState {
  return {
    ...barbell,
    center: { ...barbell.center },
    velocity: { ...barbell.velocity },
    inner: { ...barbell.inner },
    outer: { ...barbell.outer },
  };
}

export function getFillMass(fill: MassFill): number {
  return fill.upmassTons + fill.downmassTons;
}

export function getEndpointMass(barbell: BarbellState, endpoint: EndpointKey): number {
  return barbell.dryMassTons + getFillMass(barbell[endpoint]);
}

export function getTotalBarbellMass(barbell: BarbellState): number {
  return getEndpointMass(barbell, 'inner') + getEndpointMass(barbell, 'outer');
}

export function getEndpointOffset(barbell: BarbellState, endpoint: EndpointKey): Vec2 {
  const axis = fromAngle(barbell.angleRad);
  const innerMass = getEndpointMass(barbell, 'inner');
  const outerMass = getEndpointMass(barbell, 'outer');
  const totalMass = innerMass + outerMass;
  const distance = endpoint === 'inner'
    ? -(barbell.length * outerMass) / totalMass
    : (barbell.length * innerMass) / totalMass;
  return scale(axis, distance);
}

export function getEndpointState(barbell: BarbellState, endpoint: EndpointKey): EndpointState {
  const offset = getEndpointOffset(barbell, endpoint);
  const angularVelocityContribution = scale(rotate90(offset), barbell.angularVelocityRadPerSecond);
  return {
    barbellId: barbell.id,
    endpoint,
    position: add(barbell.center, offset),
    velocity: add(barbell.velocity, angularVelocityContribution),
    massTons: getEndpointMass(barbell, endpoint),
    fill: { ...barbell[endpoint] },
  };
}

export function getBarbellMomentOfInertia(barbell: BarbellState): number {
  const innerOffset = getEndpointOffset(barbell, 'inner');
  const outerOffset = getEndpointOffset(barbell, 'outer');
  return (
    getEndpointMass(barbell, 'inner') * lengthSq(innerOffset)
    + getEndpointMass(barbell, 'outer') * lengthSq(outerOffset)
  );
}

export function getBarbellPointVelocity(barbell: BarbellState, point: Vec2): Vec2 {
  const offset = sub(point, barbell.center);
  return add(barbell.velocity, scale(rotate90(offset), barbell.angularVelocityRadPerSecond));
}

export function getBarbellLinearMomentum(barbell: BarbellState): Vec2 {
  return scale(barbell.velocity, getTotalBarbellMass(barbell));
}

export function getPayloadLinearMomentum(payload: PayloadState): Vec2 {
  return scale(payload.velocity, payload.massTons);
}

export function getBarbellAngularMomentumAbout(barbell: BarbellState, origin: Vec2): number {
  const inner = getEndpointState(barbell, 'inner');
  const outer = getEndpointState(barbell, 'outer');
  return (
    cross(sub(inner.position, origin), scale(inner.velocity, inner.massTons))
    + cross(sub(outer.position, origin), scale(outer.velocity, outer.massTons))
  );
}

export function getPayloadAngularMomentumAbout(payload: PayloadState, origin: Vec2): number {
  return cross(sub(payload.position, origin), getPayloadLinearMomentum(payload));
}

export function getSystemAngularMomentumAbout(
  state: BeanstalkSystemState,
  origin: Vec2 = vec(0, 0),
): number {
  return (
    state.barbells.reduce((total, barbell) => total + getBarbellAngularMomentumAbout(barbell, origin), 0)
    + state.payloads.reduce((total, payload) => total + getPayloadAngularMomentumAbout(payload, origin), 0)
  );
}

export function computeGravityAcceleration(position: Vec2, gravitationalParameter: number): Vec2 {
  const radiusSq = Math.max(lengthSq(position), 0.000001);
  const radius = Math.sqrt(radiusSq);
  return scale(position, -gravitationalParameter / (radiusSq * radius));
}

export function computeBarbellDerivative(barbell: BarbellState, gravitationalParameter: number): {
  centerAcceleration: Vec2;
  angularAcceleration: number;
} {
  const inner = getEndpointState(barbell, 'inner');
  const outer = getEndpointState(barbell, 'outer');
  const innerMass = inner.massTons;
  const outerMass = outer.massTons;
  const totalMass = innerMass + outerMass;
  const innerForce = scale(computeGravityAcceleration(inner.position, gravitationalParameter), innerMass);
  const outerForce = scale(computeGravityAcceleration(outer.position, gravitationalParameter), outerMass);
  const netForce = add(innerForce, outerForce);
  const innerOffset = sub(inner.position, barbell.center);
  const outerOffset = sub(outer.position, barbell.center);
  const torque = cross(innerOffset, innerForce) + cross(outerOffset, outerForce);
  const momentOfInertia = getBarbellMomentOfInertia(barbell);

  return {
    centerAcceleration: scale(netForce, 1 / totalMass),
    angularAcceleration: momentOfInertia > 0 ? torque / momentOfInertia : 0,
  };
}

export function stepSystem(state: BeanstalkSystemState, dt: number): BeanstalkSystemState {
  const next = cloneSystem(state);
  next.timeSeconds += dt;

  for (const barbell of next.barbells) {
    const derivative = computeBarbellDerivative(barbell, next.gravitationalParameter);
    barbell.velocity = add(barbell.velocity, scale(derivative.centerAcceleration, dt));
    barbell.angularVelocityRadPerSecond += derivative.angularAcceleration * dt;
    barbell.center = add(barbell.center, scale(barbell.velocity, dt));
    barbell.angleRad += barbell.angularVelocityRadPerSecond * dt;
  }

  for (const payload of next.payloads) {
    const acceleration = computeGravityAcceleration(payload.position, next.gravitationalParameter);
    payload.velocity = add(payload.velocity, scale(acceleration, dt));
    payload.position = add(payload.position, scale(payload.velocity, dt));
  }

  return next;
}

export function moveFillAcrossBarbell(options: {
  barbell: BarbellState;
  kind: 'upmass' | 'downmass';
  from: EndpointKey;
  to: EndpointKey;
  massTons: number;
}): BarbellState {
  const { barbell, kind, from, to, massTons } = options;
  if (from === to || massTons <= 0) {
    return { ...barbell, inner: { ...barbell.inner }, outer: { ...barbell.outer } };
  }

  const available = barbell[from][kind === 'upmass' ? 'upmassTons' : 'downmassTons'];
  const moved = Math.min(available, massTons);
  const next: BarbellState = {
    ...barbell,
    center: { ...barbell.center },
    velocity: { ...barbell.velocity },
    inner: { ...barbell.inner },
    outer: { ...barbell.outer },
  };
  const key = kind === 'upmass' ? 'upmassTons' : 'downmassTons';
  next[from][key] -= moved;
  next[to][key] += moved;
  const angularMomentum = getBarbellAngularMomentumAbout(barbell, barbell.center);
  const momentOfInertia = getBarbellMomentOfInertia(next);
  next.angularVelocityRadPerSecond = momentOfInertia > 0 ? angularMomentum / momentOfInertia : 0;
  return next;
}

export function createPayloadFromEndpoint(options: {
  id: string;
  kind: 'upmass' | 'downmass';
  massTons: number;
  endpoint: EndpointState;
  deltaVelocity?: Vec2;
}): PayloadState {
  return {
    id: options.id,
    kind: options.kind,
    massTons: options.massTons,
    position: { ...options.endpoint.position },
    velocity: add(options.endpoint.velocity, options.deltaVelocity ?? vec(0, 0)),
  };
}

export function detachEndpointMassAsPayload(options: {
  barbell: BarbellState;
  endpoint: EndpointKey;
  kind: 'upmass' | 'downmass';
  massTons: number;
  payloadId: string;
  deltaVelocity?: Vec2;
}): {
  barbell: BarbellState;
  payload: PayloadState;
} {
  const endpoint = getEndpointState(options.barbell, options.endpoint);
  const payload = createPayloadFromEndpoint({
    id: options.payloadId,
    kind: options.kind,
    massTons: options.massTons,
    endpoint,
    deltaVelocity: options.deltaVelocity,
  });
  const oldMass = getTotalBarbellMass(options.barbell);
  const newMass = oldMass - options.massTons;
  if (newMass <= 0) {
    throw new Error('Cannot detach more mass than the barbell contains.');
  }

  const next = cloneBarbell(options.barbell);
  const key = options.kind === 'upmass' ? 'upmassTons' : 'downmassTons';
  next[options.endpoint][key] -= options.massTons;
  if (next[options.endpoint][key] < -0.000001) {
    throw new Error('Cannot detach unavailable endpoint fill mass.');
  }
  next[options.endpoint][key] = Math.max(0, next[options.endpoint][key]);

  const conservedCenter = { ...options.barbell.center };
  next.center = scale(sub(scale(options.barbell.center, oldMass), scale(payload.position, options.massTons)), 1 / newMass);
  next.velocity = scale(sub(getBarbellLinearMomentum(options.barbell), getPayloadLinearMomentum(payload)), 1 / newMass);

  const finalInertia = getBarbellMomentOfInertia(next);
  const oldAngularMomentum = getBarbellAngularMomentumAbout(options.barbell, conservedCenter);
  const payloadAngularMomentum = getPayloadAngularMomentumAbout(payload, conservedCenter);
  const translationalAngularMomentum = cross(sub(next.center, conservedCenter), scale(next.velocity, newMass));
  next.angularVelocityRadPerSecond = finalInertia > 0
    ? (oldAngularMomentum - payloadAngularMomentum - translationalAngularMomentum) / finalInertia
    : 0;

  return { barbell: next, payload };
}

export function attachPayloadToEndpoint(options: {
  barbell: BarbellState;
  endpoint: EndpointKey;
  payload: PayloadState;
}): BarbellState {
  const oldMass = getTotalBarbellMass(options.barbell);
  const newMass = oldMass + options.payload.massTons;
  const finalCenter = scale(
    add(scale(options.barbell.center, oldMass), scale(options.payload.position, options.payload.massTons)),
    1 / newMass,
  );
  const finalVelocity = scale(
    add(getBarbellLinearMomentum(options.barbell), getPayloadLinearMomentum(options.payload)),
    1 / newMass,
  );
  const final = cloneBarbell(options.barbell);
  const key = options.payload.kind === 'upmass' ? 'upmassTons' : 'downmassTons';
  final[options.endpoint][key] += options.payload.massTons;
  final.center = finalCenter;
  final.velocity = finalVelocity;

  const oldAngularMomentum = getBarbellAngularMomentumAbout(options.barbell, finalCenter);
  const payloadAngularMomentum = getPayloadAngularMomentumAbout(options.payload, finalCenter);
  const finalInertia = getBarbellMomentOfInertia(final);
  final.angularVelocityRadPerSecond = finalInertia > 0
    ? (oldAngularMomentum + payloadAngularMomentum) / finalInertia
    : 0;

  return final;
}
