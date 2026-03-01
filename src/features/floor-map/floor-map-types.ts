export type MapZoneStatus = 'safe' | 'warning' | 'danger' | 'critical';

export interface MapSensor {
  id: string;
  name: string;
  sensorType: string;
  positionX: number;
  positionY: number;
  value: number;
  unit: string;
  status: MapZoneStatus;
}

export interface MapCamera {
  id: string;
  name: string;
  positionX: number;
  positionY: number;
  angleDegrees: number;
  isActive: boolean;
  lastSeenAt: string;
}

export interface MapZone {
  id: string;
  name: string;
  zoneType: string;
  riskLevel: string;
  status: MapZoneStatus;
  score: number;
  coordinates: number[][];
  sensors: MapSensor[];
  cameras: MapCamera[];
  activeAlerts: number;
}

export interface MapFloor {
  id: string;
  name: string;
  floorNumber: number;
  floorPlanImagePath: string | null;
  widthMeters: number;
  lengthMeters: number;
  zones: MapZone[];
}

export interface MapViewport {
  x: number;
  y: number;
  scale: number;
}

export interface SelectedZone {
  zone: MapZone;
  screenX: number;
  screenY: number;
}

export interface HoveredSensor {
  sensor: MapSensor;
  screenX: number;
  screenY: number;
}
