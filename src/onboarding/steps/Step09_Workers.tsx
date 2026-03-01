import { useCallback, useState } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import type { OnboardingState } from '../onboarding-types';
import type { OnboardingAction } from '../onboarding-reducer';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { validateIndianPhone } from '../onboarding-validation';
import { sanitizeLength } from '../onboarding-validation';

const CSV_HEADERS = 'employee_id,name,role,department,phone,worker_type,contractor_company,language';

interface Step09Props {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onNext: () => void;
  onBack: () => void;
}

export function Step09_Workers({ state, dispatch, onNext, onBack }: Step09Props) {
  const [tab, setTab] = useState<'manual' | 'csv'>('manual');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<OnboardingState['workers']>([]);
  const workers = state.workers;

  const addWorker = useCallback(() => dispatch({ type: 'ADD_WORKER' }), [dispatch]);

  const downloadTemplate = useCallback(() => {
    const row = 'EMP001,John Doe,Operator,Production,9876543210,permanent,,en';
    const csv = CSV_HEADERS + '\n' + row;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'advancesafe_workers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleCsvFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setCsvError(null);
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result);
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          setCsvError('CSV must have header and at least one row');
          setCsvPreview([]);
          return;
        }
        const headers = lines[0].toLowerCase().replace(/\s/g, '_').split(',');
        const parsed: OnboardingState['workers'] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((s) => s.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, j) => { row[h] = values[j] ?? ''; });
          const phone = (row.phone ?? '').replace(/\D/g, '');
          parsed.push({
            tempId: 'csv_' + i,
            employeeId: sanitizeLength(row.employee_id ?? '', 50),
            name: sanitizeLength(row.name ?? '', 100),
            role: sanitizeLength(row.role ?? '', 100),
            department: sanitizeLength(row.department ?? '', 100),
            phone,
            isContractWorker: (row.worker_type ?? '').toLowerCase() === 'contract',
            contractorCompany: sanitizeLength(row.contractor_company ?? '', 150),
            languagePreference: (row.language === 'hi' || row.language === 'gu' ? row.language : 'en') as 'en' | 'hi' | 'gu',
          });
        }
        setCsvPreview(parsed);
      };
      reader.readAsText(file);
    },
    []
  );

  const importCsv = useCallback(() => {
    if (csvPreview.length > 0) {
      dispatch({ type: 'IMPORT_WORKERS_CSV', payload: csvPreview.map((w) => ({ ...w, tempId: 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9) })) });
      setCsvPreview([]);
    }
  }, [csvPreview, dispatch]);

  const permanentCount = workers.filter((w) => !w.isContractWorker).length;
  const contractCount = workers.filter((w) => w.isContractWorker).length;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-rajdhani text-[32px] font-bold text-[var(--text-primary)]">
        WORKER REGISTRY
      </h1>
      <p className="mt-2 font-sans text-sm text-[var(--text-secondary)]">
        Register your workforce into the AdvanceSafe safety network
      </p>
      <p className="mt-2 font-mono text-xs text-[var(--text-dim)]">
        Workers not added now can be registered after setup via the Workers module.
      </p>
      <div className="mt-6 flex gap-2 border-b border-[var(--border-default)] pb-2">
        <button type="button" onClick={() => setTab('manual')} className={`rounded px-3 py-1.5 font-mono text-sm ${tab === 'manual' ? 'bg-[var(--accent-cyan-dim)] text-[var(--accent-cyan)]' : 'text-[var(--text-secondary)]'}`}>Manual Entry</button>
        <button type="button" onClick={() => setTab('csv')} className={`rounded px-3 py-1.5 font-mono text-sm ${tab === 'csv' ? 'bg-[var(--accent-cyan-dim)] text-[var(--accent-cyan)]' : 'text-[var(--text-secondary)]'}`}>Bulk CSV Import</button>
      </div>
      {tab === 'manual' && (
        <div className="mt-6">
          <WorkerForm onAdd={addWorker} dispatch={dispatch} />
        </div>
      )}
      {tab === 'csv' && (
        <div className="mt-6 space-y-4">
          <button type="button" onClick={downloadTemplate} className="flex items-center gap-2 rounded border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)] px-4 py-2 font-mono text-sm text-[var(--accent-cyan)]">
            <Download size={16} /> Download CSV Template
          </button>
          <div className="rounded border-2 border-dashed border-[var(--border-default)] p-6">
            <input type="file" accept=".csv" onChange={handleCsvFile} className="font-mono text-sm" />
            {csvError && <p className="mt-2 font-mono text-xs text-[var(--status-critical)]">{csvError}</p>}
          </div>
          {csvPreview.length > 0 && (
            <>
              <p className="font-mono text-sm text-[var(--text-mono)]">{csvPreview.length} workers ready to import</p>
              <div className="max-h-48 overflow-auto rounded border border-[var(--border-default)]">
                {csvPreview.slice(0, 10).map((w, i) => (
                  <div key={i} className="flex gap-2 border-b border-[var(--border-default)] px-2 py-1 font-mono text-[10px]">
                    <span>{w.employeeId}</span><span>{w.name}</span><span>{w.phone}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={importCsv} className="mt-2 rounded bg-[var(--accent-cyan)] px-4 py-2 font-mono text-sm text-[var(--bg-primary)]">IMPORT {csvPreview.length} WORKERS</button>
            </>
          )}
        </div>
      )}
      <div className="mt-6">
        <SectionLabel>Worker list</SectionLabel>
        {workers.length === 0 ? (
          <p className="font-mono text-sm text-[var(--text-dim)]">No workers added yet.</p>
        ) : (
          <div className="mt-2 max-h-64 overflow-auto rounded border border-[var(--border-default)]">
            <List height={256} itemCount={workers.length} itemSize={36} width="100%">
              {({ index, style }) => {
                const w = workers[index];
                return (
                  <div style={style} className="flex items-center justify-between border-b border-[var(--border-default)] px-3 py-1 font-mono text-xs">
                    <span>{w.employeeId}</span><span>{w.name}</span><span>{w.role}</span><span>{w.isContractWorker ? 'Contract' : 'Permanent'}</span><span>{w.phone}</span><span>{w.languagePreference}</span>
                    <button type="button" onClick={() => dispatch({ type: 'REMOVE_WORKER', payload: w.tempId })} className="text-[var(--status-danger)]">Delete</button>
                  </div>
                );
              }}
            </List>
          </div>
        )}
        <p className="mt-2 font-mono text-[10px] text-[var(--text-secondary)]">Total: {workers.length} (Permanent: {permanentCount}, Contract: {contractCount})</p>
      </div>
      <div className="mt-8 flex justify-between border-t border-[var(--border-default)] pt-6">
        <button type="button" onClick={onBack} className="rounded px-4 py-2 font-mono text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Back</button>
        <button type="button" onClick={onNext} className="rounded px-4 py-2 font-mono text-sm font-medium text-[var(--bg-primary)]" style={{ backgroundColor: 'var(--accent-cyan)' }}>Next</button>
      </div>
    </div>
  );
}

function WorkerForm({ dispatch }: { onAdd: () => void; dispatch: React.Dispatch<OnboardingAction> }) {
  const [current, setCurrent] = useState<Partial<OnboardingState['workers'][0]>>({ employeeId: '', name: '', role: '', department: '', phone: '', isContractWorker: false, contractorCompany: '', languagePreference: 'en' });
  const addOne = useCallback(() => {
    if (!current.employeeId?.trim() || !current.name?.trim()) return;
    dispatch({
      type: 'ADD_WORKER_WITH_DATA',
      payload: {
        employeeId: current.employeeId ?? '',
        name: current.name ?? '',
        role: current.role ?? '',
        department: current.department ?? '',
        phone: current.phone ?? '',
        isContractWorker: current.isContractWorker ?? false,
        contractorCompany: current.contractorCompany ?? '',
        languagePreference: (current.languagePreference ?? 'en') as 'en' | 'hi' | 'gu',
      },
    });
    setCurrent({ employeeId: '', name: '', role: '', department: '', phone: '', isContractWorker: false, contractorCompany: '', languagePreference: 'en' });
  }, [current, dispatch]);
  return (
    <Card>
      <SectionLabel>Add one worker</SectionLabel>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input type="text" placeholder="Employee ID *" value={current.employeeId} onChange={(e) => setCurrent((c) => ({ ...c, employeeId: sanitizeLength(e.target.value, 50) }))} maxLength={50} className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm" />
        <input type="text" placeholder="Full Name *" value={current.name} onChange={(e) => setCurrent((c) => ({ ...c, name: sanitizeLength(e.target.value, 100) }))} maxLength={100} className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm" />
        <input type="text" placeholder="Role" value={current.role} onChange={(e) => setCurrent((c) => ({ ...c, role: sanitizeLength(e.target.value, 100) }))} maxLength={100} className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm" />
        <input type="text" placeholder="Department" value={current.department} onChange={(e) => setCurrent((c) => ({ ...c, department: sanitizeLength(e.target.value, 100) }))} maxLength={100} className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm" />
        <input type="tel" placeholder="Phone" value={current.phone} onChange={(e) => setCurrent((c) => ({ ...c, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} maxLength={10} className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm" />
        <select value={current.isContractWorker ? 'contract' : 'permanent'} onChange={(e) => setCurrent((c) => ({ ...c, isContractWorker: e.target.value === 'contract' }))} className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm">
          <option value="permanent">Permanent Employee</option>
          <option value="contract">Contract Worker</option>
        </select>
        {current.isContractWorker && <input type="text" placeholder="Contractor Company" value={current.contractorCompany} onChange={(e) => setCurrent((c) => ({ ...c, contractorCompany: sanitizeLength(e.target.value, 150) }))} maxLength={150} className="col-span-2 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm" />}
        <select value={current.languagePreference} onChange={(e) => setCurrent((c) => ({ ...c, languagePreference: e.target.value as 'en' | 'hi' | 'gu' }))} className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm">
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="gu">Gujarati</option>
        </select>
      </div>
      <button type="button" onClick={addOne} disabled={!current.employeeId?.trim() || !current.name?.trim()} className="mt-3 flex items-center gap-2 rounded border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)] px-4 py-2 font-mono text-sm text-[var(--accent-cyan)] disabled:opacity-50">
        <Plus size={16} /> ADD WORKER
      </button>
    </Card>
  );
}
