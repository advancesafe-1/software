import { useCallback, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { OnboardingState } from '../onboarding-types';
import type { OnboardingAction } from '../onboarding-reducer';
import { Card } from '@/components/ui/Card';
import { SENSOR_TYPES, SENSOR_PROTOCOLS, SENSOR_DEFAULTS } from '../onboarding-validation';
import { sanitizeLength } from '../onboarding-validation';

interface Step07Props {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
}

export function Step07_Sensors({ state, dispatch, onNext, onBack }: Step07Props) {
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const floors = state.floors;
  const activeFloor = floors[activeFloorIndex];
  const floorZones = activeFloor ? (state.floorPlans[activeFloor.tempId]?.zones ?? []) : [];
  const sensorsOnFloor = state.sensors.filter((s) => s.floorTempId === activeFloor?.tempId);

  const addSensor = useCallback(() => {
    if (activeFloor && floorZones.length > 0) {
      dispatch({ type: 'ADD_SENSOR', payload: { floorTempId: activeFloor.tempId, zoneTempId: floorZones[0].tempId } });
    }
  }, [activeFloor, floorZones, dispatch]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-rajdhani text-[32px] font-bold text-[var(--text-primary)]">SENSOR CONFIGURATION</h1>
      <p className="mt-2 font-sans text-sm text-[var(--text-secondary)]">Connect your safety sensors and set alert thresholds</p>
      <div className="mt-6 flex gap-2 border-b border-[var(--border-default)] pb-2">
        {floors.map((f, i) => (
          <button key={f.tempId} type="button" onClick={() => setActiveFloorIndex(i)} className={i === activeFloorIndex ? 'rounded px-3 py-1.5 font-mono text-sm bg-[var(--accent-cyan-dim)] text-[var(--accent-cyan)]' : 'rounded px-3 py-1.5 font-mono text-sm text-[var(--text-secondary)]'}>{f.name || 'Floor ' + f.floorNumber}</button>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={addSensor} disabled={!activeFloor || floorZones.length === 0} className="flex items-center gap-2 rounded border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)] px-4 py-2 font-mono text-sm text-[var(--accent-cyan)] disabled:opacity-50">
          <Plus size={16} /> ADD SENSOR
        </button>
      </div>
      <div className="mt-6 space-y-4">
        {sensorsOnFloor.map((sensor) => (
          <SensorCard key={sensor.tempId} sensor={sensor} zones={floorZones} dispatch={dispatch} />
        ))}
      </div>
      <p className="mt-4 font-mono text-[10px] text-[var(--text-dim)]">Default thresholds per OSHA 1910 / IS standards</p>
      <div className="mt-8 flex justify-between border-t border-[var(--border-default)] pt-6">
        <button type="button" onClick={onBack} className="rounded px-4 py-2 font-mono text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Back</button>
        <button type="button" onClick={onNext} className="rounded px-4 py-2 font-mono text-sm font-medium text-[var(--bg-primary)]" style={{ backgroundColor: 'var(--accent-cyan)' }}>Next</button>
      </div>
    </div>
  );
}

function SensorCard(props: { sensor: OnboardingState['sensors'][0]; zones: { tempId: string; name: string }[]; dispatch: React.Dispatch<OnboardingAction> }) {
  const { sensor, zones, dispatch } = props;
  const [expanded, setExpanded] = useState(false);

  const setType = useCallback((sensorType: string) => {
    const d = SENSOR_DEFAULTS[sensorType] ?? SENSOR_DEFAULTS.Other;
    dispatch({ type: 'UPDATE_SENSOR', payload: { tempId: sensor.tempId, updates: { sensorType, unit: d.unit, safeMin: d.safeMin, safeMax: d.safeMax, warningMin: d.warningMin, warningMax: d.warningMax, dangerMin: d.dangerMin, dangerMax: d.dangerMax, criticalMin: d.criticalMin, criticalMax: d.criticalMax } } });
  }, [dispatch, sensor.tempId]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-sm text-[var(--text-primary)]">{sensor.name || 'Unnamed'}</span>
          <span className="ml-2 font-mono text-[10px] text-[var(--text-secondary)]">{sensor.sensorType || '-'}</span>
          <span className="ml-2 font-mono text-[10px] text-[var(--text-mono)]">{sensor.protocol || '-'}</span>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setExpanded(!expanded)} className="rounded px-2 py-1 font-mono text-xs text-[var(--accent-cyan)]">{expanded ? 'Collapse' : 'Edit'}</button>
          <button type="button" onClick={() => dispatch({ type: 'REMOVE_SENSOR', payload: sensor.tempId })} className="rounded p-1 text-[var(--status-danger)]"><Trash2 size={14} /></button>
        </div>
      </div>
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-[var(--border-default)] pt-4">
          <div>
            <label className="block font-mono text-[10px] text-[var(--text-secondary)]">Sensor Name *</label>
            <input type="text" value={sensor.name} onChange={(e) => dispatch({ type: 'UPDATE_SENSOR', payload: { tempId: sensor.tempId, updates: { name: sanitizeLength(e.target.value, 100) } } })} maxLength={100} className="mt-1 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm" />
          </div>
          <div>
            <label className="block font-mono text-[10px] text-[var(--text-secondary)]">Assign to Zone *</label>
            <select value={sensor.zoneTempId} onChange={(e) => dispatch({ type: 'UPDATE_SENSOR', payload: { tempId: sensor.tempId, updates: { zoneTempId: e.target.value } } })} className="mt-1 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm">
              {zones.map((z) => <option key={z.tempId} value={z.tempId}>{z.name || z.tempId}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-mono text-[10px] text-[var(--text-secondary)]">Sensor Type *</label>
              <select value={sensor.sensorType} onChange={(e) => setType(e.target.value)} className="mt-1 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm">
                {SENSOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] text-[var(--text-secondary)]">Protocol *</label>
              <select value={sensor.protocol} onChange={(e) => dispatch({ type: 'UPDATE_SENSOR', payload: { tempId: sensor.tempId, updates: { protocol: e.target.value } } })} className="mt-1 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm">
                {SENSOR_PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 font-mono text-[10px]">
            <span className="text-[var(--status-safe)]">Safe</span>
            <span className="text-[var(--status-warning)]">Warning</span>
            <span className="text-[var(--status-danger)]">Danger</span>
            <span className="text-[var(--status-critical)]">Critical</span>
          </div>
        </div>
      )}
    </Card>
  );
}
