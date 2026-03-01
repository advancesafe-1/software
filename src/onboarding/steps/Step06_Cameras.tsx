import { useCallback, useState } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import type { OnboardingState } from '../onboarding-types';
import type { OnboardingAction } from '../onboarding-reducer';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { validateIpAddress } from '../onboarding-validation';
import { CAMERA_BRANDS } from '../onboarding-validation';
import { sanitizeLength } from '../onboarding-validation';

interface Step06Props {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
}

export function Step06_Cameras({ state, dispatch, onNext, onBack }: Step06Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const floors = state.floors;
  const activeFloor = floors[activeFloorIndex];
  const floorZones = activeFloor ? (state.floorPlans[activeFloor.tempId]?.zones ?? []) : [];
  const camerasOnFloor = state.cameras.filter((c) => c.floorTempId === activeFloor?.tempId);

  const addCamera = useCallback(() => {
    if (activeFloor && floorZones.length > 0) {
      dispatch({ type: 'ADD_CAMERA', payload: { floorTempId: activeFloor.tempId, zoneTempId: floorZones[0].tempId } });
      setEditingId(null);
    }
  }, [activeFloor, floorZones, dispatch]);

  const testConnection = useCallback(
    async (tempId: string) => {
      dispatch({ type: 'SET_CAMERA_TEST_STATUS', payload: { tempId, status: 'testing' } });
      setTestingId(tempId);
      await new Promise((r) => setTimeout(r, 1500));
      const cam = state.cameras.find((c) => c.tempId === tempId);
      const ok = cam && validateIpAddress(cam.ipAddress);
      dispatch({ type: 'SET_CAMERA_TEST_STATUS', payload: { tempId, status: ok ? 'success' : 'failed' } });
      setTestingId(null);
    },
    [dispatch, state.cameras]
  );

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-rajdhani text-[32px] font-bold text-[var(--text-primary)]">
        CAMERA CONNECTIONS
      </h1>
      <p className="mt-2 font-sans text-sm text-[var(--text-secondary)]">
        Connect your existing IP cameras — no new hardware required
      </p>
      <div className="mt-4 rounded border border-[var(--border-accent)] bg-[var(--accent-cyan-glow)] px-4 py-2 font-mono text-xs text-[var(--text-secondary)]">
        You can add cameras after setup is complete.
      </div>
      <div className="mt-6 flex gap-2 border-b border-[var(--border-default)] pb-2">
        {floors.map((f, i) => (
          <button
            key={f.tempId}
            type="button"
            onClick={() => setActiveFloorIndex(i)}
            className={`rounded px-3 py-1.5 font-mono text-sm ${
              i === activeFloorIndex ? 'bg-[var(--accent-cyan-dim)] text-[var(--accent-cyan)]' : 'text-[var(--text-secondary)]'
            }`}
          >
            {f.name || `Floor ${f.floorNumber}`}
          </button>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={addCamera}
          disabled={!activeFloor || floorZones.length === 0}
          className="flex items-center gap-2 rounded border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)] px-4 py-2 font-mono text-sm text-[var(--accent-cyan)] disabled:opacity-50"
        >
          <Plus size={16} /> ADD CAMERA
        </button>
      </div>
      <div className="mt-6 space-y-4">
        {camerasOnFloor.map((cam) => (
          <Card key={cam.tempId}>
            {editingId === cam.tempId ? (
              <CameraForm
                camera={cam}
                zones={floorZones}
                dispatch={dispatch}
                onClose={() => setEditingId(null)}
                onTest={() => testConnection(cam.tempId)}
                testing={testingId === cam.tempId}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm text-[var(--text-primary)]">{cam.name || 'Unnamed'}</span>
                  <span className="ml-2 font-mono text-[10px] text-[var(--text-secondary)]">{cam.ipAddress}</span>
                  <span className="ml-2 font-mono text-[10px]">
                    {cam.testStatus === 'success' && <span style={{ color: 'var(--status-safe)' }}>Connected</span>}
                    {cam.testStatus === 'failed' && <span style={{ color: 'var(--status-critical)' }}>Failed</span>}
                    {cam.testStatus === 'testing' && <span style={{ color: 'var(--status-warning)' }}>Testing…</span>}
                    {cam.testStatus === 'untested' && <span style={{ color: 'var(--text-dim)' }}>Untested</span>}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setEditingId(cam.tempId)} className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)]"><Pencil size={14} /></button>
                  <button type="button" onClick={() => dispatch({ type: 'REMOVE_CAMERA', payload: cam.tempId })} className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--status-danger)]"><Trash2 size={14} /></button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      <div className="mt-8 flex justify-between border-t border-[var(--border-default)] pt-6">
        <button type="button" onClick={onBack} className="rounded px-4 py-2 font-mono text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Back</button>
        <button type="button" onClick={onNext} className="rounded px-4 py-2 font-mono text-sm font-medium text-[var(--bg-primary)]" style={{ backgroundColor: 'var(--accent-cyan)' }}>Next</button>
      </div>
    </div>
  );
}

function CameraForm({
  camera,
  zones,
  dispatch,
  onClose,
  onTest,
  testing,
}: {
  camera: OnboardingState['cameras'][0];
  zones: { tempId: string; name: string }[];
  dispatch: React.Dispatch<import('../onboarding-reducer').OnboardingAction>;
  onClose: () => void;
  onTest: () => void;
  testing: boolean;
}) {
  const update = (u: Partial<OnboardingState['cameras'][0]>) =>
    dispatch({ type: 'UPDATE_CAMERA', payload: { tempId: camera.tempId, updates: u } });
  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onTest} disabled={testing} className="rounded px-2 py-1 font-mono text-xs text-[var(--accent-cyan)]">
          {testing ? 'Testing…' : 'TEST CONNECTION'}
        </button>
        <button type="button" onClick={onClose} className="rounded p-1 text-[var(--text-secondary)]"><Check size={14} /></button>
      </div>
      <div>
        <label className="block font-mono text-[10px] text-[var(--text-secondary)]">Camera Name *</label>
        <input type="text" value={camera.name} onChange={(e) => update({ name: sanitizeLength(e.target.value, 100) })} maxLength={100} placeholder="Main Gate Camera" className="mt-1 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm" />
      </div>
      <div>
        <label className="block font-mono text-[10px] text-[var(--text-secondary)]">Assign to Zone *</label>
        <select value={camera.zoneTempId} onChange={(e) => update({ zoneTempId: e.target.value })} className="mt-1 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm">
          {zones.map((z) => <option key={z.tempId} value={z.tempId}>{z.name || z.tempId}</option>)}
        </select>
      </div>
      <div>
        <label className="block font-mono text-[10px] text-[var(--text-secondary)]">IP Address *</label>
        <input type="text" value={camera.ipAddress} onChange={(e) => { update({ ipAddress: sanitizeLength(e.target.value, 15) }); update({ rtspUrl: e.target.value ? `rtsp://${e.target.value}:554/stream` : '' }); }} maxLength={15} className="mt-1 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm" />
      </div>
      <div>
        <label className="block font-mono text-[10px] text-[var(--text-secondary)]">RTSP URL</label>
        <input type="text" value={camera.rtspUrl} onChange={(e) => update({ rtspUrl: sanitizeLength(e.target.value, 300) })} maxLength={300} placeholder="rtsp://ip:554/stream" className="mt-1 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-mono text-[10px] text-[var(--text-secondary)]">Username</label>
          <input type="text" value={camera.username} onChange={(e) => update({ username: sanitizeLength(e.target.value, 100) })} maxLength={100} className="mt-1 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm" />
        </div>
        <div>
          <label className="block font-mono text-[10px] text-[var(--text-secondary)]">Password</label>
          <input type="password" value={camera.password} onChange={(e) => update({ password: sanitizeLength(e.target.value, 100) })} maxLength={100} className="mt-1 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm" />
        </div>
      </div>
    </div>
  );
}
