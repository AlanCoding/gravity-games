import * as THREE from 'three';

export const PLANET_CIRCUMFERENCE_METERS = 400;
export const PLANET_RADIUS_METERS = PLANET_CIRCUMFERENCE_METERS / (Math.PI * 2);
export const PLAYER_HEIGHT_METERS = 2;
export const PLAYER_CENTER_HEIGHT_METERS = PLAYER_HEIGHT_METERS / 2;
export const WALK_SPEED = 6.2;
export const TURN_RATE = 2.8;
export const SURFACE_GRAVITY = 1.2;
export const COYOTE_TIME_SECONDS = 0.12;
export const JUMP_BUFFER_SECONDS = 0.12;
export const SHADOW_SURFACE_OFFSET_METERS = 0.16;
export const SHADOW_MAX_ALTITUDE_METERS = 8;
export const PHYSICS_DEBUG_ENABLED = false;
export const TRACK_LANE_SPACING_METERS = 1.6;
export const TRACK_START_LANE_OFFSET_METERS = -0.8;
export const TRACK_START_LONGITUDE_DEGREES = 0;
export const TRACK_START_HEADING_DEGREES = 90;
export const TRACK_START_FORWARD = new THREE.Vector3(0, 0, 1);
