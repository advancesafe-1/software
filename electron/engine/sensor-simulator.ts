import type { RawSensorReading } from './engine-types';
import { SIMULATION_INTERVAL_MS } from './engine-constants';

interface SensorRow {
  id: string;
  name: string;
  sensor_type: string;
  unit: string | null;
}

interface SimProfile {
  base: number;
  unit: string;
  walk: number;
  driftMin: number;
  driftMax: number;
  eventValue: number;
  eventTicks: number;
  eventInterval: number;
  inverted?: boolean;
}

const PROFILES: Record<string, SimProfile> = {
  temperature: { base: 32, unit: '°C', walk: 0.5, driftMin: 33, driftMax: 38, eventValue: 46, eventTicks: 2, eventInterval: 18 },
  co_gas: { base: 15, unit: 'ppm', walk: 1, driftMin: 20, driftMax: 30, eventValue: 55, eventTicks: 3, eventInterval: 20 },
  h2s_gas: { base: 0.5, unit: 'ppm', walk: 0.1, driftMin: 2, driftMax: 4, eventValue: 12, eventTicks: 2, eventInterval: 22 },
  oxygen_level: { base: 20.9, unit: '%', walk: 0.05, driftMin: 19.8, driftMax: 20.5, eventValue: 17, eventTicks: 2, eventInterval: 25, inverted: true },
  noise_level: { base: 75, unit: 'dB', walk: 2, driftMin: 80, driftMax: 88, eventValue: 102, eventTicks: 1, eventInterval: 20 },
  default: { base: 30, unit: '°C', walk: 0.3, driftMin: 28, driftMax: 34, eventValue: 45, eventTicks: 2, eventInterval: 24 },
};

function getProfile(sensorType: string): SimProfile {
  const key = sensorType.toLowerCase().replace(/\s+/g, '_').replace(/[—–-]/g, '_');
  if (key.includes('oxygen') || key.includes('o2')) return PROFILES.oxygen_level;
  if (key.includes('temperature') || key.includes('temp')) return PROFILES.temperature;
  if (key.includes('co ') || key === 'co_gas') return PROFILES.co_gas;
  if (key.includes('h2s')) return PROFILES.h2s_gas;
  if (key.includes('noise')) return PROFILES.noise_level;
  return PROFILES.default;
}

interface SimState {
  value: number;
  tickCount: number;
  eventCountdown: number;
  inEvent: number;
  driftPhase: number;
}

const simState = new Map<string, SimState>();

function nextValue(sensorId: string, profile: SimProfile): number {
  let state = simState.get(sensorId);
  if (!state) {
    state = {
      value: profile.base,
      tickCount: 0,
      eventCountdown: Math.floor(profile.eventInterval * 0.3 + Math.random() * profile.eventInterval * 0.7),
      inEvent: 0,
      driftPhase: 0,
    };
    simState.set(sensorId, state);
  }

  state.tickCount++;
  if (state.inEvent > 0) {
    state.inEvent--;
    state.value = profile.eventValue;
    return state.value;
  }

  const walk = (Math.random() - 0.5) * 2 * profile.walk;
  state.value += walk;

  if (state.tickCount % 12 === 0 && state.tickCount > 0) {
    state.driftPhase = (state.driftPhase + 1) % 4;
    if (state.driftPhase === 0) {
      const target = profile.driftMin + Math.random() * (profile.driftMax - profile.driftMin);
      state.value = state.value * 0.7 + target * 0.3;
    }
  }

  state.eventCountdown--;
  if (state.eventCountdown <= 0 && state.inEvent === 0) {
    state.inEvent = profile.eventTicks;
    state.eventCountdown = Math.floor(profile.eventInterval * 0.8 + Math.random() * profile.eventInterval * 0.4);
  }

  if (profile.inverted) {
    state.value = Math.max(15, Math.min(24, state.value));
  } else {
    state.value = Math.max(0, Math.min(100, state.value));
  }

  return Math.round(state.value * 100) / 100;
}

let simulationInterval: ReturnType<typeof setInterval> | null = null;

export function startSimulation(
  sensors: SensorRow[],
  onReading: (raw: RawSensorReading) => void
): void {
  stopSimulation();
  simulationInterval = setInterval(() => {
    for (const sensor of sensors) {
      const profile = getProfile(sensor.sensor_type);
      const value = nextValue(sensor.id, profile);
      onReading({
        sensorId: sensor.id,
        value,
        unit: profile.unit,
        timestamp: new Date().toISOString(),
      });
    }
  }, SIMULATION_INTERVAL_MS);
}

export function stopSimulation(): void {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  simState.clear();
}

export function triggerManualEvent(sensorId: string, value: number, onReading: (raw: RawSensorReading) => void): void {
  onReading({
    sensorId,
    value,
    unit: '',
    timestamp: new Date().toISOString(),
  });
}
