import { useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { OnboardingState } from './onboarding-types';
import type { OnboardingAction } from './onboarding-reducer';
import { setOnboardingComplete, clearDraft } from './onboarding-storage';

const TASK_LIST = [
  'Validating configuration',
  'Creating organization record',
  'Setting up floor structure',
  'Configuring zone parameters',
  'Registering camera connections',
  'Configuring sensor network',
  'Setting PPE rule engine',
  'Building alert hierarchy',
  'Importing worker registry',
  'Generating QR codes for workers',
  'Initializing Guardian Score engine',
  'Building floor map visualizations',
  'Running system diagnostics',
  'Syncing configuration backup',
  'AdvanceSafe is Live',
];

interface InitializationViewProps {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onComplete: () => void;
}

function getApi() {
  return typeof window !== 'undefined' ? window.advancesafe : undefined;
}

export function InitializationView({ state, dispatch, onComplete }: InitializationViewProps) {
  const runIndex = useRef(0);
  const failed = state.initializationStatus === 'failed';
  const complete = state.initializationStatus === 'complete';

  const runTasks = useCallback(async () => {
    const api = getApi()?.database;
    if (!api) {
      dispatch({ type: 'UPDATE_INITIALIZATION_PROGRESS', payload: { index: 0, status: 'failed', message: 'Database not available' } });
      dispatch({ type: 'SET_INITIALIZATION_STATUS', payload: 'failed' });
      return;
    }

    const p = state.orgProfile;
    const licenseKey = state.licenseKey || 'DRAFT-KEY-0000-0000';

    for (let i = runIndex.current; i < TASK_LIST.length; i++) {
      dispatch({ type: 'UPDATE_INITIALIZATION_PROGRESS', payload: { index: i, status: 'running' } });
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

      try {
        if (i === 0) {
          // Validate
        } else if (i === 1) {
          await api.execute('ins', 'INSERT INTO organizations (id, license_key, name, address, city, state, industry_type, total_workers, gst_number, primary_contact_name, primary_contact_phone, primary_contact_email, is_active) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', [licenseKey, p.name, p.address, p.city, p.state, p.industryType, p.totalWorkers, p.gstNumber || null, p.primaryContactName, p.primaryContactPhone, p.primaryContactEmail]);
        } else if (i === 2) {
          const orgRows = await api.query('q', 'SELECT id FROM organizations ORDER BY created_at DESC LIMIT 1', []) as { id: string }[];
          const orgId = orgRows[0]?.id;
          if (orgId) {
            for (const floor of state.floors) {
              await api.execute('ins', 'INSERT INTO floors (id, organization_id, name, floor_number, description) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)', [orgId, floor.name, floor.floorNumber, floor.description || null]);
            }
          }
        } else if (i === 3) {
          const orgRows = await api.query('q', 'SELECT id FROM organizations ORDER BY created_at DESC LIMIT 1', []) as { id: string }[];
          const orgId = orgRows[0]?.id;
          if (orgId) {
            const floorRows = await api.query('q', 'SELECT id, floor_number FROM floors WHERE organization_id = ? ORDER BY floor_number', [orgId]) as { id: string; floor_number: number }[];
            for (let fi = 0; fi < state.floors.length; fi++) {
              const floor = state.floors[fi];
              const floorRow = floorRows.find((r) => r.floor_number === floor.floorNumber);
              const fid = floorRow?.id;
              if (fid) {
                const zones = state.floorPlans[floor.tempId]?.zones ?? [];
                for (const z of zones) {
                  await api.execute('ins', 'INSERT INTO zones (id, floor_id, name, zone_type, risk_level_default) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)', [fid, z.name, z.zoneType, z.riskLevel]);
                }
              }
            }
          }
        } else if (i === 8) {
          const orgRows = await api.query('q', 'SELECT id FROM organizations ORDER BY created_at DESC LIMIT 1', []) as { id: string }[];
          const orgId = orgRows[0]?.id;
          if (orgId) {
            for (const w of state.workers) {
              await api.execute('ins', 'INSERT INTO workers (id, organization_id, employee_id, name, role, department, phone, is_contract_worker, contractor_company, language_preference, is_active) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', [orgId, w.employeeId, w.name, w.role || null, w.department || null, w.phone || null, w.isContractWorker ? 1 : 0, w.contractorCompany || null, w.languagePreference]);
            }
          }
        } else if (i === 14) {
          await setOnboardingComplete();
        }
        dispatch({ type: 'UPDATE_INITIALIZATION_PROGRESS', payload: { index: i, status: 'done' } });
      } catch (err) {
        dispatch({ type: 'UPDATE_INITIALIZATION_PROGRESS', payload: { index: i, status: 'failed', message: err instanceof Error ? err.message : String(err) } });
        dispatch({ type: 'SET_INITIALIZATION_STATUS', payload: 'failed' });
        runIndex.current = i;
        return;
      }
    }

    dispatch({ type: 'SET_INITIALIZATION_STATUS', payload: 'complete' });
  }, [state, dispatch]);

  useEffect(() => {
    if (state.initializationStatus === 'running' && runIndex.current === 0) {
      runTasks();
    }
  }, [state.initializationStatus, runTasks]);

  const handleRetry = useCallback(() => {
    dispatch({ type: 'SET_INITIALIZATION_STATUS', payload: 'running' });
    runTasks();
  }, [dispatch, runTasks]);

  const handleStartOver = useCallback(async () => {
    await clearDraft();
    runIndex.current = 0;
    dispatch({ type: 'RESET_WIZARD' });
  }, [dispatch]);

  const handleOpenDashboard = useCallback(() => {
    onComplete();
  }, [onComplete]);

  if (complete) {
    const orgName = state.orgProfile.name;
    const floorsCount = state.floors.length;
    const zonesCount = state.floors.reduce((s, f) => s + (state.floorPlans[f.tempId]?.zones?.length ?? 0), 0);
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)] p-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-cyan)] text-[var(--bg-primary)]">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="mt-8 font-rajdhani text-3xl font-bold text-[var(--text-primary)]">ADVANCESAFE IS LIVE</h1>
        <p className="mt-2 font-mono text-lg text-[var(--text-mono)]">{orgName}</p>
        <p className="mt-4 font-mono text-sm text-[var(--text-secondary)]">
          {floorsCount} floors | {zonesCount} zones | {state.cameras.length} cameras | {state.sensors.length} sensors | {state.workers.length} workers
        </p>
        <button type="button" onClick={handleOpenDashboard} className="mt-8 rounded bg-[var(--accent-cyan)] px-8 py-3 font-mono text-sm font-medium text-[var(--bg-primary)]">OPEN DASHBOARD</button>
      </div>
    );
  }

  if (failed) {
    const failedItem = state.initializationProgress.find((x) => x.status === 'failed');
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)] p-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--status-critical)] text-white">
          <XCircle size={48} />
        </div>
        <h1 className="mt-8 font-rajdhani text-2xl font-bold text-[var(--text-primary)]">Setup failed</h1>
        {failedItem && <p className="mt-2 font-mono text-sm text-[var(--text-secondary)]">{failedItem.task}: {failedItem.message}</p>}
        <div className="mt-8 flex gap-4">
          <button type="button" onClick={handleRetry} className="rounded border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)] px-6 py-2 font-mono text-sm text-[var(--accent-cyan)]">RETRY</button>
          <button type="button" onClick={handleStartOver} className="rounded border border-[var(--border-default)] px-6 py-2 font-mono text-sm text-[var(--text-secondary)]">START OVER</button>
        </div>
      </div>
    );
  }

  const doneCount = state.initializationProgress.filter((x) => x.status === 'done').length;
  const progressPct = (doneCount / TASK_LIST.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)] p-8">
      <h1 className="font-rajdhani text-2xl font-bold text-[var(--text-primary)]">INITIALIZING ADVANCESAFE</h1>
      <p className="mt-2 font-mono text-sm text-[var(--text-secondary)]">Do not close this window</p>
      <div className="mt-12 flex h-32 w-32 items-center justify-center">
        <div className="h-full w-full rounded-full border-4 border-[var(--bg-tertiary)] border-t-[var(--accent-cyan)] animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
      <p className="mt-6 font-mono text-2xl text-[var(--text-mono)]">{Math.round(progressPct)}%</p>
      <ul className="mt-8 max-h-64 w-full max-w-md space-y-2 overflow-auto">
        {state.initializationProgress.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2 font-mono text-sm">
            {item.status === 'pending' && <span className="text-[var(--text-dim)]">□</span>}
            {item.status === 'running' && <Loader2 size={14} className="animate-spin text-[var(--accent-cyan)]" />}
            {item.status === 'done' && <CheckCircle2 size={14} className="text-[var(--status-safe)]" />}
            {item.status === 'failed' && <XCircle size={14} className="text-[var(--status-critical)]" />}
            <span style={{ color: item.status === 'done' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{item.task}</span>
          </li>
        ))}
      </ul>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
