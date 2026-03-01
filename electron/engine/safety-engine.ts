import { EventEmitter } from 'events';
import type Database from 'better-sqlite3';
import type { EngineState, OrganizationScore, ZoneScore, SensorReading } from './engine-types';

type Db = InstanceType<typeof Database>;
import { IPC_EVENTS, SCORE_INTERVAL_MS } from './engine-constants';
import { calculateZoneScore, calculateFloorScore, calculateOrgScore } from './score-calculator';
import { processSensorReading } from './sensor-processor';
import { checkAndFireAlert, resolveAlert, acknowledgeAlert } from './alert-processor';
import { startSimulation, stopSimulation } from './sensor-simulator';
import { getMainWindow } from '../services/window-manager';
import { syncEngine } from '../sync/sync-engine';

function sendToRenderer(channel: string, data: unknown): void {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    try {
      win.webContents.send(channel, data);
    } catch {
      // ignore
    }
  }
}

export class SafetyEngine extends EventEmitter {
  private db: Db | null = null;
  private state: EngineState = {
    isRunning: false,
    organizationId: null,
    lastCalculatedAt: null,
    activeIncidents: 0,
    sensorsMonitored: 0,
    zonesMonitored: 0,
    simulationMode: false,
    overallScore: null,
    overallStatus: null,
  };
  private scoreInterval: ReturnType<typeof setInterval> | null = null;
  private sensorCache = new Map<string, SensorReading>();

  async initialize(db: Db): Promise<void> {
    this.db = db;
    try {
      const orgRow = db.prepare('SELECT id FROM organizations WHERE is_active = 1 LIMIT 1').get() as { id: string } | undefined;
      if (!orgRow) {
        this.state.simulationMode = true;
        this.state.isRunning = false;
        this.emit(IPC_EVENTS.ENGINE_STATUS, this.getState());
        sendToRenderer(IPC_EVENTS.ENGINE_STATUS, this.getState());
        return;
      }
      this.state.organizationId = orgRow.id;

      const sensors = db.prepare(
        'SELECT id, name, sensor_type, unit FROM sensors WHERE is_active = 1'
      ).all() as { id: string; name: string; sensor_type: string; unit: string | null }[];
      this.state.sensorsMonitored = sensors.length;

      const zoneCount = db.prepare('SELECT COUNT(*) as c FROM zones').get() as { c: number };
      this.state.zonesMonitored = zoneCount.c;

      this.state.simulationMode = true;
      startSimulation(sensors, (raw) => this.handleSensorReading(raw));

      this.scoreInterval = setInterval(() => {
        this.runScoreCycle().catch(() => {});
      }, SCORE_INTERVAL_MS);

      this.state.isRunning = true;
      this.state.lastCalculatedAt = new Date().toISOString();
      this.emit(IPC_EVENTS.ENGINE_STATUS, this.getState());
    } catch {
      this.state.isRunning = false;
      this.emit(IPC_EVENTS.ENGINE_STATUS, this.getState());
    }
  }

  handleSensorReading(raw: { sensorId: string; value: number; unit: string; timestamp: string }): void {
    if (!this.db) return;
    try {
      const result = processSensorReading(
        this.db,
        raw,
        (reading) => {
          this.sensorCache.set(reading.sensorId, reading);
          sendToRenderer(IPC_EVENTS.SENSOR_READING, reading);
          this.emit(IPC_EVENTS.SENSOR_READING, reading);
        },
        (reading) => {
          const zoneRow = this.db!.prepare('SELECT z.id, z.name, z.floor_id, f.name as floor_name FROM zones z JOIN floors f ON f.id = z.floor_id JOIN sensors s ON s.zone_id = z.id WHERE s.id = ?').get(reading.sensorId) as { id: string; name: string; floor_id: string; floor_name: string } | undefined;
          if (zoneRow && this.state.organizationId) {
            checkAndFireAlert(this.db!, reading, {
              zoneId: zoneRow.id,
              zoneName: zoneRow.name,
              floorId: zoneRow.floor_id,
              floorName: zoneRow.floor_name,
            }, this.state.organizationId, sendToRenderer);
          }
        }
      );
    } catch {
      // ignore
    }
  }

  private async runScoreCycle(): Promise<void> {
    if (!this.db || !this.state.organizationId) return;
    try {
      const orgId = this.state.organizationId;
      const floors = this.db.prepare(
        'SELECT id as floorId, name as floorName FROM floors WHERE organization_id = ? ORDER BY floor_number'
      ).all(orgId) as { floorId: string; floorName: string }[];

      const zoneScores: ZoneScore[] = [];
      for (const floor of floors) {
        const zones = this.db.prepare(
          'SELECT id, name FROM zones WHERE floor_id = ?'
        ).all(floor.floorId) as { id: string; name: string }[];
        for (const zone of zones) {
          const sensorsInZone = this.db.prepare(
            'SELECT id FROM sensors WHERE zone_id = ? AND is_active = 1'
          ).all(zone.id) as { id: string }[];
          const readings: SensorReading[] = [];
          for (const s of sensorsInZone) {
            const cached = this.sensorCache.get(s.id);
            if (cached) readings.push(cached);
            else {
              const row = this.db.prepare(
                'SELECT sr.sensor_id, s.name as sensor_name, s.sensor_type, sr.value, sr.unit, sr.status, sr.recorded_at FROM sensor_readings sr JOIN sensors s ON s.id = sr.sensor_id WHERE sr.sensor_id = ? ORDER BY sr.recorded_at DESC LIMIT 1'
              ).get(s.id) as { sensor_id: string; sensor_name: string; sensor_type: string; value: number; unit: string; status: string; recorded_at: string } | undefined;
              if (row) {
                const th = { safeMin: 0, safeMax: 100, warningMin: 0, warningMax: 100, dangerMin: 0, dangerMax: 100, criticalMin: 0, criticalMax: 100 };
                readings.push({
                  sensorId: row.sensor_id,
                  sensorName: row.sensor_name,
                  sensorType: row.sensor_type,
                  value: row.value,
                  unit: row.unit || '',
                  status: row.status as SensorReading['status'],
                  threshold: th,
                  scoreContribution: row.status === 'safe' ? 100 : row.status === 'warning' ? 65 : row.status === 'danger' ? 35 : 0,
                  recordedAt: row.recorded_at,
                });
              }
            }
          }
          const zoneScore = calculateZoneScore(zone.id, zone.name, floor.floorId, readings, this.db);
          zoneScores.push(zoneScore);
          const scoreId = 'gs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
          const calculatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
          this.db.prepare(
            `INSERT INTO guardian_scores (id, zone_id, score, sensor_score, ppe_score, incident_score, worker_score, response_time_score, status, calculated_at, synced_to_cloud)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
          ).run(scoreId, zone.id, zoneScore.score, zoneScore.components.sensorScore, zoneScore.components.ppeScore, zoneScore.components.incidentScore, zoneScore.components.workerScore, zoneScore.components.responseTimeScore, zoneScore.status, calculatedAt);
          syncEngine.onScoreUpdate({
            id: scoreId,
            zone_id: zone.id,
            score: zoneScore.score,
            sensor_score: zoneScore.components.sensorScore,
            ppe_score: zoneScore.components.ppeScore,
            incident_score: zoneScore.components.incidentScore,
            worker_score: zoneScore.components.workerScore,
            response_time_score: zoneScore.components.responseTimeScore,
            status: zoneScore.status,
            calculated_at: calculatedAt,
          });
        }
      }

      const floorScores = floors.map((f) => calculateFloorScore(f, zoneScores.filter((z) => z.floorId === f.floorId)));

      const activeIncidents = (this.db.prepare('SELECT COUNT(*) as c FROM incidents WHERE resolved_at IS NULL').get() as { c: number }).c;
      const criticalZones = zoneScores.filter((z) => z.status === 'critical').length;
      this.state.activeIncidents = activeIncidents;

      const orgScore = calculateOrgScore(orgId, floorScores, activeIncidents, criticalZones);
      this.state.lastCalculatedAt = orgScore.calculatedAt;
      this.state.overallScore = orgScore.overallScore;
      this.state.overallStatus = orgScore.status;

      sendToRenderer(IPC_EVENTS.SCORE_UPDATE, orgScore);
      this.emit(IPC_EVENTS.SCORE_UPDATE, orgScore);
    } catch {
      // ignore
    }
  }

  async acknowledgeAlert(incidentId: string, userId: string): Promise<void> {
    if (!this.db) return;
    acknowledgeAlert(this.db, incidentId, userId, sendToRenderer);
  }

  async resolveIncident(incidentId: string, userId: string, notes: string): Promise<void> {
    if (!this.db) return;
    resolveAlert(this.db, incidentId, userId, notes, sendToRenderer);
  }

  getState(): EngineState {
    return { ...this.state };
  }

  async getZoneHistory(zoneId: string, hours: number): Promise<ZoneScore[]> {
    if (!this.db) return [];
    try {
      const rows = this.db.prepare(
        `SELECT zone_id, score, sensor_score, ppe_score, incident_score, worker_score, response_time_score, status, calculated_at
         FROM guardian_scores WHERE zone_id = ? AND datetime(calculated_at) >= datetime('now', ?) ORDER BY calculated_at DESC LIMIT 100`
      ).all(zoneId, `-${hours} hours`) as { zone_id: string; score: number; sensor_score: number; ppe_score: number; incident_score: number; worker_score: number; response_time_score: number; status: string; calculated_at: string }[];
      const zoneRow = this.db.prepare('SELECT name, floor_id FROM zones WHERE id = ?').get(zoneId) as { name: string; floor_id: string } | undefined;
      const floorId = zoneRow?.floor_id ?? '';
      const zoneName = zoneRow?.name ?? '';
      return rows.map((r) => ({
        zoneId: r.zone_id,
        zoneName,
        floorId,
        score: r.score,
        status: r.status as ZoneScore['status'],
        components: { sensorScore: r.sensor_score, ppeScore: r.ppe_score, incidentScore: r.incident_score, workerScore: r.worker_score, responseTimeScore: r.response_time_score },
        sensorReadings: [],
        worstSensor: null,
        calculatedAt: r.calculated_at,
      }));
    } catch {
      return [];
    }
  }

  setSimulationMode(enabled: boolean): void {
    this.state.simulationMode = enabled;
    if (!this.db) return;
    if (enabled) {
      const sensors = this.db.prepare('SELECT id, name, sensor_type, unit FROM sensors WHERE is_active = 1').all() as { id: string; name: string; sensor_type: string; unit: string | null }[];
      startSimulation(sensors, (raw) => this.handleSensorReading(raw));
    } else {
      stopSimulation();
    }
    this.emit(IPC_EVENTS.ENGINE_STATUS, this.getState());
    sendToRenderer(IPC_EVENTS.ENGINE_STATUS, this.getState());
  }

  shutdown(): void {
    if (this.scoreInterval) {
      clearInterval(this.scoreInterval);
      this.scoreInterval = null;
    }
    stopSimulation();
    this.state.isRunning = false;
    this.state.organizationId = null;
    this.db = null;
    this.sensorCache.clear();
  }
}

export const safetyEngine = new SafetyEngine();
