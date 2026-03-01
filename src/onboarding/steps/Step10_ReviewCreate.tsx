import React, { useMemo, useCallback, useState } from 'react';
import type { OnboardingState } from '../onboarding-types';
import type { OnboardingAction } from '../onboarding-reducer';

interface Step10Props {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
}

export function Step10_ReviewCreate({ state, dispatch, onNext, onBack }: Step10Props) {
  const [confirmed, setConfirmed] = useState(false);

  const totalZones = useMemo(() => state.floors.reduce((s, f) => s + (state.floorPlans[f.tempId]?.zones?.length ?? 0), 0), [state.floors, state.floorPlans]);
  const testedCameras = state.cameras.filter((c) => c.testStatus === 'success').length;
  const estimatedMinutes = useMemo(() => {
    let m = 5;
    m += state.floors.length * 2;
    m += state.cameras.length * 1;
    m += state.sensors.length * 0.5;
    return Math.round(m);
  }, [state.floors.length, state.cameras.length, state.sensors.length]);

  const warnings: string[] = useMemo(() => {
    const w: string[] = [];
    if (state.cameras.length === 0) w.push('No cameras configured');
    if (state.sensors.length === 0) w.push('No sensors configured');
    if (state.workers.length === 0) w.push('No workers registered');
    const untested = state.cameras.filter((c) => c.testStatus !== 'success' && c.testStatus !== 'failed');
    if (untested.length > 0) w.push(`${untested.length} camera(s) not tested`);
    return w;
  }, [state.cameras, state.sensors.length, state.workers.length]);

  const handleCreate = useCallback(() => {
    if (!confirmed) return;
    dispatch({ type: 'SET_INITIALIZATION_STATUS', payload: 'running' });
  }, [confirmed, dispatch]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-rajdhani text-[32px] font-bold text-[var(--text-primary)]">REVIEW & CREATE ORGANIZATION</h1>
      <p className="mt-2 font-sans text-sm text-[var(--text-secondary)]">Review your configuration before AdvanceSafe goes live</p>

      {warnings.length > 0 && (
        <div className="mt-6 rounded border border-[var(--status-warning)] bg-[var(--accent-cyan-glow)] px-4 py-3 font-mono text-sm text-[var(--status-warning)]">
          {warnings.map((w, i) => <div key={i}>{w}</div>)}
          <p className="mt-2 text-[var(--text-secondary)]">These are warnings, not blockers — you can proceed.</p>
        </div>
      )}

      <div className="mt-8 space-y-4">
        <ReviewCard title="Organization" onEdit={() => dispatch({ type: 'SET_STEP', payload: 2 })}>
          <div className="font-mono text-sm text-[var(--text-mono)]">{state.orgProfile.name}</div>
          <div className="font-mono text-[10px] text-[var(--text-secondary)]">{state.orgProfile.address}, {state.orgProfile.city}, {state.orgProfile.state}</div>
        </ReviewCard>
        <ReviewCard title="Facility" onEdit={() => dispatch({ type: 'SET_STEP', payload: 4 })}>
          <span className="font-mono text-sm text-[var(--text-mono)]">{state.floors.length} floors</span>, <span className="font-mono text-sm text-[var(--text-mono)]">{totalZones} total zones</span>
        </ReviewCard>
        <ReviewCard title="Alert Hierarchy" onEdit={() => dispatch({ type: 'SET_STEP', payload: 3 })}>
          <span className="font-mono text-sm text-[var(--text-mono)]">{state.alertHierarchy.length} levels</span>, <span className="font-mono text-sm text-[var(--text-mono)]">{state.alertHierarchy.reduce((s, l) => s + l.contacts.length, 0)} contacts</span>
        </ReviewCard>
        <ReviewCard title="Cameras" onEdit={() => dispatch({ type: 'SET_STEP', payload: 6 })}>
          <span className="font-mono text-sm text-[var(--text-mono)]">{state.cameras.length} configured</span> ({testedCameras} tested successfully)
        </ReviewCard>
        <ReviewCard title="Sensors" onEdit={() => dispatch({ type: 'SET_STEP', payload: 7 })}>
          <span className="font-mono text-sm text-[var(--text-mono)]">{state.sensors.length} configured</span>
        </ReviewCard>
        <ReviewCard title="Workers" onEdit={() => dispatch({ type: 'SET_STEP', payload: 9 })}>
          <span className="font-mono text-sm text-[var(--text-mono)]">{state.workers.length} registered</span> ({state.workers.filter((w) => !w.isContractWorker).length} permanent, {state.workers.filter((w) => w.isContractWorker).length} contract)
        </ReviewCard>
      </div>

      <div className="mt-8 rounded border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <span className="font-mono text-sm text-[var(--text-secondary)]">Estimated setup time: </span>
        <span className="font-mono text-sm text-[var(--text-mono)]">~{estimatedMinutes} minutes</span>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <input type="checkbox" id="confirm" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="h-4 w-4 rounded border-[var(--border-default)]" />
        <label htmlFor="confirm" className="font-mono text-sm text-[var(--text-primary)]">I confirm this configuration is correct and ready for deployment</label>
      </div>

      <div className="mt-8 flex justify-between border-t border-[var(--border-default)] pt-6">
        <button type="button" onClick={onBack} className="rounded px-4 py-2 font-mono text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Back</button>
        <button type="button" onClick={handleCreate} disabled={!confirmed} className="w-full max-w-md rounded py-3 font-mono text-sm font-medium text-[var(--bg-primary)] disabled:opacity-50" style={{ backgroundColor: confirmed ? 'var(--accent-cyan)' : 'var(--text-dim)' }}>CREATE ORGANIZATION</button>
      </div>
    </div>
  );
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">{title}</span>
        <button type="button" onClick={onEdit} className="font-mono text-xs text-[var(--accent-cyan)]">EDIT</button>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
